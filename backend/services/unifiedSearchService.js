/**
 * ============================================================================
 * UNIFIED VENDOR SEARCH ALGORITHM
 * ============================================================================
 * 
 * A single, scalable search system that replaces all fragmented logic.
 * 
 * PRIORITY ORDER (STRICT):
 * 1. Exact Area Match (highest priority)
 * 2. Nearby Vendors (proximity-based from searched area)
 * 3. Same City Vendors (sorted by distance)
 * 4. Adjacent City Vendors (within proximity threshold)
 * 
 * FEATURES:
 * - Geospatial accuracy with MongoDB 2dsphere indexes
 * - Dynamic filtering without breaking result order
 * - Budget range with intelligent alternatives
 * - Zero-result prevention with progressive relaxation
 * - Scalable for high concurrency
 * - Production-grade validation and error handling
 * 
 * @module services/unifiedSearchService
 */

const mongoose = require('mongoose');
const Vendor = require('../models/VendorNew');
const Area = require('../models/Area');
const City = require('../models/City');
const semantic = require('./semanticService');
const { applyProgressiveFallback, needsFallback } = require('./progressiveFallbackService');

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

const SEARCH_CONFIG = {
  // Default radius settings (in kilometers)
  DEFAULT_RADIUS: 5,
  MAX_RADIUS: 50,
  ADJACENT_CITY_RADIUS: 100,
  
  // Budget flexibility (percentage)
  BUDGET_FLEXIBILITY_PERCENT: 20,
  
  // Progressive radius expansion steps
  RADIUS_EXPANSION_STEPS: [5, 10, 15, 25, 50],
  
  // Minimum results before expansion
  MIN_RESULTS_THRESHOLD: 5,
  
  // Result limits per priority tier
  MAX_RESULTS_PER_TIER: {
    exactArea: 50,
    nearby: 50,
    sameCity: 30,
    adjacentCity: 20
  },
  
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100
};

// ============================================================================
// CORE SEARCH CLASS
// ============================================================================

class UnifiedVendorSearch {
  constructor(searchParams) {
    this.params = this.validateAndNormalizeParams(searchParams);
    this.results = {
      exactArea: [],
      nearby: [],
      sameCity: [],
      adjacentCity: []
    };
    this.metadata = {
      searchCoordinates: null,
      searchArea: null,
      searchCity: null,
      appliedFilters: {},
      radiusUsed: SEARCH_CONFIG.DEFAULT_RADIUS,
      totalFound: 0,
      timestamp: new Date()
    };
  }

  getPlanRank(vendor) {
    const planRank = {
      premium: 4,
      growth: 3,
      starter: 2,
      free: 1
    };
    return planRank[vendor?.subscription?.planKey] || 0;
  }

  /**
   * Validate and normalize search parameters
   */
  validateAndNormalizeParams(params) {
    const {
      query = '',
      serviceType,
      city,
      area,
      areaId,
      latitude,
      longitude,
      radius = SEARCH_CONFIG.DEFAULT_RADIUS,
      budget = {},
      filters = {},
      verified,
      rating,
      sort = 'relevance',
      page = 1,
      limit = SEARCH_CONFIG.DEFAULT_PAGE_SIZE
    } = params;

    // Validate coordinates if provided
    if (latitude !== undefined || longitude !== undefined) {
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);
      
      if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        throw new Error('Invalid coordinates provided');
      }
    }

    // Validate radius
    const validRadius = Math.min(
      Math.max(parseFloat(radius) || SEARCH_CONFIG.DEFAULT_RADIUS, 1),
      SEARCH_CONFIG.MAX_RADIUS
    );

    // Validate budget
    const validBudget = {};
    if (budget.min !== undefined) {
      validBudget.min = Math.max(0, parseFloat(budget.min) || 0);
    }
    if (budget.max !== undefined) {
      validBudget.max = Math.max(0, parseFloat(budget.max) || 0);
    }
    
    // Ensure min <= max
    if (validBudget.min && validBudget.max && validBudget.min > validBudget.max) {
      [validBudget.min, validBudget.max] = [validBudget.max, validBudget.min];
    }

    // Validate pagination
    const validPage = Math.max(1, parseInt(page) || 1);
    const validLimit = Math.min(
      Math.max(1, parseInt(limit) || SEARCH_CONFIG.DEFAULT_PAGE_SIZE),
      SEARCH_CONFIG.MAX_PAGE_SIZE
    );

    return {
      query: query.trim(),
      serviceType: serviceType?.toLowerCase(),
      city: city?.trim(),
      area: area?.trim(),
      areaId,
      latitude: latitude !== undefined ? parseFloat(latitude) : undefined,
      longitude: longitude !== undefined ? parseFloat(longitude) : undefined,
      radius: validRadius,
      budget: validBudget,
      filters,
      verified,
      rating: rating !== undefined ? Math.max(0, Math.min(5, parseFloat(rating))) : undefined,
      sort,
      page: validPage,
      limit: validLimit
    };
  }

  /**
   * Resolve location to coordinates
   */
  async resolveLocationCoordinates() {
    const { city, area, areaId, latitude, longitude } = this.params;

    // Case 1: Coordinates provided directly
    if (latitude !== undefined && longitude !== undefined) {
      this.metadata.searchCoordinates = [longitude, latitude];
      return { coordinates: [longitude, latitude], source: 'direct' };
    }

    // Case 2: Area ID provided
    if (areaId) {
      const areaDoc = await Area.findById(areaId).lean();
      if (areaDoc && areaDoc.location && areaDoc.location.coordinates) {
        this.metadata.searchCoordinates = areaDoc.location.coordinates;
        this.metadata.searchArea = areaDoc.name;
        this.metadata.searchCity = areaDoc.cityName;
        return { 
          coordinates: areaDoc.location.coordinates,
          area: areaDoc,
          source: 'areaId'
        };
      }
    }

    // Case 3: City + Area name
    if (city && area) {
      // Find city first
      const cityDoc = await City.findOne({ 
        name: new RegExp(`^${city}$`, 'i')
      }).lean();

      if (cityDoc) {
        // Find area within city
        const areaDoc = await Area.findOne({
          city_id: cityDoc._id,
          $or: [
            { name: new RegExp(`^${area}$`, 'i') },
            { normalizedName: area.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim() }
          ]
        }).lean();

        if (areaDoc && areaDoc.location && areaDoc.location.coordinates) {
          this.metadata.searchCoordinates = areaDoc.location.coordinates;
          this.metadata.searchArea = areaDoc.name;
          this.metadata.searchCity = cityDoc.name;
          return { 
            coordinates: areaDoc.location.coordinates,
            area: areaDoc,
            city: cityDoc,
            source: 'cityArea'
          };
        }

        // Area not found but city exists - use city center
        if (cityDoc.location && cityDoc.location.coordinates) {
          this.metadata.searchCoordinates = cityDoc.location.coordinates;
          this.metadata.searchCity = cityDoc.name;
          return {
            coordinates: cityDoc.location.coordinates,
            city: cityDoc,
            source: 'cityCenter',
            fallback: true
          };
        }
      }
    }

    // Case 4: City only
    if (city) {
      const cityDoc = await City.findOne({ 
        name: new RegExp(`^${city}$`, 'i')
      }).lean();

      if (cityDoc && cityDoc.location && cityDoc.location.coordinates) {
        this.metadata.searchCoordinates = cityDoc.location.coordinates;
        this.metadata.searchCity = cityDoc.name;
        return {
          coordinates: cityDoc.location.coordinates,
          city: cityDoc,
          source: 'cityOnly'
        };
      }
    }

    // No location resolution possible
    return { coordinates: null, source: 'none' };
  }

  /**
   * Build base MongoDB query with common filters
   */
  buildBaseQuery() {
    const query = { isActive: true };
    const { query: searchQuery, serviceType, verified, rating, filters } = this.params;

    // Text search across multiple fields
    if (searchQuery) {
      const searchTerm = searchQuery.replace(/\s+/g, '[-\\s]*').replace(/[^a-zA-Z0-9\-\\s*]/g, '');
      const searchRegex = new RegExp(searchTerm, 'i');
      const simpleRegex = new RegExp(searchQuery.split(/\s+/)[0], 'i');

      query.$or = [
        { name: searchRegex },
        { businessName: searchRegex },
        { contactPerson: searchRegex },
        { description: searchRegex },
        { searchKeywords: simpleRegex },
        { serviceType: searchRegex }
      ];
    }

    // Service type filter
    if (serviceType && !searchQuery) {
      query.serviceType = new RegExp(serviceType, 'i');
    }

    // Verified status filter
    if (verified !== undefined) {
      query.verified = verified;
    }

    // Rating filter
    if (rating !== undefined) {
      query.rating = { $gte: rating };
    }

    // Service-specific filters
    Object.keys(filters).forEach(filterKey => {
      if (['verified', 'rating'].includes(filterKey)) return;
      
      const filterValue = filters[filterKey];
      
      if (filterValue !== undefined && filterValue !== null && filterValue !== '') {
        if (Array.isArray(filterValue) && filterValue.length > 0) {
          query[`filters.${filterKey}`] = { $in: filterValue };
        } else {
          query[`filters.${filterKey}`] = filterValue;
        }
      }
    });

    return query;
  }

  /**
   * Build budget query with flexibility
   */
  buildBudgetQuery(strict = true) {
    const { budget } = this.params;
    
    if (!budget.min && !budget.max) {
      return {};
    }

    let { min, max } = budget;

    // Add flexibility for non-strict mode
    if (!strict && (min || max)) {
      const flexibility = SEARCH_CONFIG.BUDGET_FLEXIBILITY_PERCENT / 100;
      if (min) min = min * (1 - flexibility);
      if (max) max = max * (1 + flexibility);
    }

    const budgetConditions = [];

    if (min && max) {
      budgetConditions.push({
        $or: [
          { 'pricing.min': { $gte: min, $lte: max } },
          { 'pricing.max': { $gte: min, $lte: max } },
          { 'pricing.average': { $gte: min, $lte: max } },
          {
            $and: [
              { 'pricing.min': { $lte: min } },
              { 'pricing.max': { $gte: max } }
            ]
          }
        ]
      });
    } else if (min) {
      budgetConditions.push({ 'pricing.max': { $gte: min } });
    } else if (max) {
      budgetConditions.push({ 'pricing.min': { $lte: max } });
    }

    return budgetConditions.length > 0 ? { $and: budgetConditions } : {};
  }

  /**
   * TIER 1: Find vendors in exact area
   */
  async findExactAreaVendors(locationData) {
    if (!locationData.area) return [];

    const baseQuery = this.buildBaseQuery();
    const budgetQuery = this.buildBudgetQuery(true);

    const query = {
      ...baseQuery,
      ...budgetQuery,
      city: new RegExp(`^${this.metadata.searchCity}$`, 'i'),
      area: new RegExp(`^${this.metadata.searchArea}$`, 'i')
    };

    const vendors = await Vendor.find(query)
      .sort({ isFeatured: -1, rating: -1, reviewCount: -1 })
      .limit(SEARCH_CONFIG.MAX_RESULTS_PER_TIER.exactArea)
      .select('-password -verificationDocuments')
      .lean();

    return vendors.map(v => ({ ...v, matchTier: 'exact_area', tierPriority: 1 }));
  }

  /**
   * TIER 2: Find nearby vendors using geospatial query
   */
  async findNearbyVendors(coordinates, excludeIds = []) {
    if (!coordinates) return [];

    const baseQuery = this.buildBaseQuery();
    const budgetQuery = this.buildBudgetQuery(true);
    const radiusInMeters = this.params.radius * 1000;

    const query = {
      ...baseQuery,
      ...budgetQuery,
      _id: { $nin: excludeIds },
      location: {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: coordinates
          },
          $maxDistance: radiusInMeters
        }
      }
    };

    const vendors = await Vendor.find(query)
      .limit(SEARCH_CONFIG.MAX_RESULTS_PER_TIER.nearby)
      .select('-password -verificationDocuments')
      .lean();

    // Calculate distances and apply relevance + plan-priority ordering.
    return vendors.map(v => {
      const distance = this.calculateDistance(
        coordinates[1], coordinates[0],
        v.location.coordinates[1], v.location.coordinates[0]
      );
      const sameCity = this.metadata.searchCity
        ? new RegExp(`^${this.metadata.searchCity}$`, 'i').test(v.city || '')
        : false;

      return {
        ...v,
        distance,
        matchTier: 'nearby',
        tierPriority: 2,
        _sameCityBoost: sameCity ? 1 : 0,
        _planRank: this.getPlanRank(v)
      };
    })
      .sort((a, b) => {
        // 1) If city intent exists, keep same-city vendors ahead of cross-city vendors.
        if (this.metadata.searchCity && b._sameCityBoost !== a._sameCityBoost) {
          return b._sameCityBoost - a._sameCityBoost;
        }

        // 2) Featured first
        if ((b.isFeatured ? 1 : 0) !== (a.isFeatured ? 1 : 0)) {
          return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
        }

        // 3) Paid plan priority
        if (b._planRank !== a._planRank) {
          return b._planRank - a._planRank;
        }

        // 4) Then proximity
        if (a.distance !== null && b.distance !== null && a.distance !== b.distance) {
          return a.distance - b.distance;
        }

        // 5) Quality tie-breakers
        if ((b.rating || 0) !== (a.rating || 0)) {
          return (b.rating || 0) - (a.rating || 0);
        }
        return (b.reviewCount || 0) - (a.reviewCount || 0);
      })
      .map(({ _sameCityBoost, _planRank, ...vendor }) => vendor);
  }

  /**
   * TIER 3: Find vendors in same city
   */
  async findSameCityVendors(excludeIds = []) {
    if (!this.metadata.searchCity) return [];

    const baseQuery = this.buildBaseQuery();
    const budgetQuery = this.buildBudgetQuery(false); // Flexible budget

    const query = {
      ...baseQuery,
      ...budgetQuery,
      _id: { $nin: excludeIds },
      city: new RegExp(`^${this.metadata.searchCity}$`, 'i')
    };

    const vendors = await Vendor.find(query)
      .sort({ isFeatured: -1, rating: -1, reviewCount: -1 })
      .limit(SEARCH_CONFIG.MAX_RESULTS_PER_TIER.sameCity)
      .select('-password -verificationDocuments')
      .lean();

    // Calculate distances if coordinates available
    return vendors.map(v => {
      let distance = null;
      if (this.metadata.searchCoordinates && v.location && v.location.coordinates) {
        distance = this.calculateDistance(
          this.metadata.searchCoordinates[1], this.metadata.searchCoordinates[0],
          v.location.coordinates[1], v.location.coordinates[0]
        );
      }
      return {
        ...v,
        distance,
        matchTier: 'same_city',
        tierPriority: 3
      };
    }).sort((a, b) => {
      // 1) Featured first
      if ((b.isFeatured ? 1 : 0) !== (a.isFeatured ? 1 : 0)) {
        return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
      }

      // 2) Distance if available
      if (a.distance !== null && b.distance !== null && a.distance !== b.distance) {
        return a.distance - b.distance;
      }

      // 3) Quality tie-breakers
      if ((b.rating || 0) !== (a.rating || 0)) {
        return (b.rating || 0) - (a.rating || 0);
      }
      return (b.reviewCount || 0) - (a.reviewCount || 0);
    });
  }

  /**
   * TIER 3 (Fallback specialization): Same-city vendors from other areas
   * Used when city is valid but requested area is not found.
   * Keeps plan-priority ordering first, then quality/distance.
   */
  async findSameCityFallbackVendors(excludeIds = []) {
    if (!this.metadata.searchCity) return [];

    const baseQuery = this.buildBaseQuery();
    const budgetQuery = this.buildBudgetQuery(false); // Flexible budget

    const query = {
      ...baseQuery,
      ...budgetQuery,
      _id: { $nin: excludeIds },
      city: new RegExp(`^${this.metadata.searchCity}$`, 'i')
    };

    // Fetch broader same-city candidates and rank in-memory to preserve plan priority.
    const vendors = await Vendor.find(query)
      .limit(SEARCH_CONFIG.MAX_RESULTS_PER_TIER.sameCity)
      .select('-password -verificationDocuments')
      .lean();

    return vendors
      .map(v => {
        let distance = null;
        if (this.metadata.searchCoordinates && v.location && v.location.coordinates) {
          distance = this.calculateDistance(
            this.metadata.searchCoordinates[1], this.metadata.searchCoordinates[0],
            v.location.coordinates[1], v.location.coordinates[0]
          );
        }

        return {
          ...v,
          distance,
          matchTier: 'same_city_fallback',
          tierPriority: 3
        };
      })
      .sort((a, b) => {
        // 1) Featured vendors first
        if ((b.isFeatured ? 1 : 0) !== (a.isFeatured ? 1 : 0)) {
          return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
        }

        // 2) Closer vendor first when available
        if (a.distance !== null && b.distance !== null && a.distance !== b.distance) {
          return a.distance - b.distance;
        }

        // 3) Rating and engagement
        if ((b.rating || 0) !== (a.rating || 0)) {
          return (b.rating || 0) - (a.rating || 0);
        }
        if ((b.reviewCount || 0) !== (a.reviewCount || 0)) {
          return (b.reviewCount || 0) - (a.reviewCount || 0);
        }

        return 0;
      });
  }

  /**
   * TIER 4: Find vendors in adjacent cities
   */
  async findAdjacentCityVendors(coordinates, excludeIds = []) {
    if (!coordinates) return [];

    const baseQuery = this.buildBaseQuery();
    const budgetQuery = this.buildBudgetQuery(false); // Very flexible budget
    const radiusInMeters = SEARCH_CONFIG.ADJACENT_CITY_RADIUS * 1000;

    const query = {
      ...baseQuery,
      ...budgetQuery,
      _id: { $nin: excludeIds },
      city: { $ne: this.metadata.searchCity }, // Exclude same city
      location: {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: coordinates
          },
          $maxDistance: radiusInMeters
        }
      }
    };

    const vendors = await Vendor.find(query)
      .limit(SEARCH_CONFIG.MAX_RESULTS_PER_TIER.adjacentCity)
      .select('-password -verificationDocuments')
      .lean();

    return vendors.map(v => {
      const distance = this.calculateDistance(
        coordinates[1], coordinates[0],
        v.location.coordinates[1], v.location.coordinates[0]
      );
      return { ...v, distance, matchTier: 'adjacent_city', tierPriority: 4 };
    });
  }

  /**
   * FUZZY / ATLAS SEARCH: Use Atlas Search $search with fuzzy options when available
   * Returns vendors matched by fuzzy text scoring (searchScore will be normalized)
   */
  async findFuzzyVendors(excludeIds = []) {
    if (!this.params.query || this.params.query.trim().length === 0) return [];

    try {
      const shouldClauses = [
        { text: { query: this.params.query, path: 'name', fuzzy: { maxEdits: 2, prefixLength: 1 } } },
        { text: { query: this.params.query, path: 'businessName', fuzzy: { maxEdits: 2, prefixLength: 1 } } },
        { text: { query: this.params.query, path: ['serviceType', 'searchKeywords'], fuzzy: { maxEdits: 2, prefixLength: 1 } } },
        { text: { query: this.params.query, path: ['city', 'area'], fuzzy: { maxEdits: 1, prefixLength: 1 } } }
      ];

      const searchStage = {
        $search: {
          compound: {
            should: shouldClauses,
            minimumShouldMatch: 1
          }
        }
      };

      const matchStage = { $match: { isActive: true } };
      if (excludeIds && excludeIds.length > 0) matchStage.$match._id = { $nin: excludeIds };
      if (this.params.serviceType) matchStage.$match.serviceType = new RegExp(this.params.serviceType, 'i');
      if (this.params.verified !== undefined) matchStage.$match.verified = this.params.verified;
      if (this.params.rating !== undefined) matchStage.$match.rating = { $gte: this.params.rating };

      const projectStage = { $project: {
        score: { $meta: 'searchScore' },
        name: 1,
        businessName: 1,
        serviceType: 1,
        city: 1,
        area: 1,
        location: 1,
        rating: 1,
        verified: 1,
        popularityScore: 1,
        pricing: 1
      }};

      const limitStage = { $limit: SEARCH_CONFIG.MAX_RESULTS_PER_TIER.nearby };

      const pipeline = [searchStage, matchStage, projectStage, limitStage];

      const docs = await Vendor.collection.aggregate(pipeline).toArray();

      // Normalize searchScore to 0..1 approximately
      const maxScore = docs.reduce((m, d) => Math.max(m, d.score || 0), 0) || 1;

      return docs.map(d => ({
        ...d,
        _id: d._id,
        name: d.name || d.businessName,
        matchTier: 'fuzzy',
        tierPriority: 2,
        similarityScore: Math.min(1, (d.score || 0) / maxScore)
      }));
    } catch (err) {
      // $search not available or failed - silently continue with empty

      // Fallback: If a text index exists, use MongoDB $text search for reasonable relevance
      try {
        if (!this.params.query || this.params.query.trim().length === 0) return [];
        const textDocs = await Vendor.find(
          { $text: { $search: this.params.query }, isActive: true, _id: { $nin: excludeIds } },
          { score: { $meta: 'textScore' }, name: 1, businessName: 1, serviceType: 1, city: 1, area: 1, location: 1, rating: 1, verified:1, popularityScore:1, pricing:1 }
        )
        .sort({ score: { $meta: 'textScore' } })
        .limit(SEARCH_CONFIG.MAX_RESULTS_PER_TIER.nearby)
        .lean();

        const maxScore = textDocs.reduce((m, d) => Math.max(m, d.score || 0), 0) || 1;
        return textDocs.map(d => ({
          ...d,
          _id: d._id,
          name: d.name || d.businessName,
          matchTier: 'text',
          tierPriority: 2,
          similarityScore: Math.min(1, (d.score || 0) / maxScore)
        }));
      } catch (texterr) {
        return [];
      }
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
  }

  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Execute complete search with all tiers
   */
  async execute() {

    // Step 1: Resolve location to coordinates
    const locationData = await this.resolveLocationCoordinates();
    const hasCityAreaIntent = Boolean(this.params.city && this.params.area);
    const isCityAreaFallback =
      hasCityAreaIntent &&
      locationData?.source === 'cityCenter' &&
      Boolean(this.metadata.searchCity);

    // Step 2: Execute tiered search
    const allVendorIds = [];

    // Tier 1: Exact Area Match
    if (locationData.area) {
      this.results.exactArea = await this.findExactAreaVendors(locationData);
      allVendorIds.push(...this.results.exactArea.map(v => v._id));
    }

    // Tier 2: Nearby Vendors (geospatial)
    const deferNearbyForCityArea = hasCityAreaIntent;
    if (locationData.coordinates && !deferNearbyForCityArea) {
      this.results.nearby = await this.findNearbyVendors(locationData.coordinates, allVendorIds);
      allVendorIds.push(...this.results.nearby.map(v => v._id));
    }

    // FUZZY: Use Atlas Search fuzzy matching to augment results when query present
    if (this.params.query && allVendorIds.length < SEARCH_CONFIG.MIN_RESULTS_THRESHOLD) {
      const fuzzyResults = await this.findFuzzyVendors(allVendorIds);
      if (fuzzyResults && fuzzyResults.length > 0) {
        // Add fuzzy results (avoid duplicates)
        const newFuzzy = fuzzyResults.filter(v => !allVendorIds.includes(v._id));
        this.results.nearby.push(...newFuzzy);
        allVendorIds.push(...newFuzzy.map(v => v._id));
      }
    }

    // SEMANTIC: Use vector store as additional fallback/augmentation
    if (this.params.query && allVendorIds.length < SEARCH_CONFIG.MIN_RESULTS_THRESHOLD) {
      try {
        const semanticMatches = await semantic.querySimilarVendors(this.params.query, 20);
        if (semanticMatches && semanticMatches.length > 0) {
          // Fetch vendor docs for top semantic IDs
          const ids = semanticMatches.map(m => m.id);
          const vendors = await Vendor.find({ _id: { $in: ids }, isActive: true }).lean();
          // Attach semantic score and add to nearby if not duplicate
          const newSemantic = vendors
            .filter(v => !allVendorIds.includes(v._id))
            .map(v => {
              const m = semanticMatches.find(x => x.id === v._id.toString());
              return { ...v, semanticScore: m ? m.score : 0, matchTier: 'semantic', tierPriority: 3 };
            });
          this.results.nearby.push(...newSemantic);
          allVendorIds.push(...newSemantic.map(v => v._id));
        }
      } catch (err) {
      }
    }

    // Tier 3: Same City Vendors
    if (this.metadata.searchCity) {
      if (isCityAreaFallback) {
        // City exists but area did not match: prioritize other areas of same city first.
        this.results.sameCity = await this.findSameCityFallbackVendors(allVendorIds);
      } else {
        this.results.sameCity = await this.findSameCityVendors(allVendorIds);
      }
      allVendorIds.push(...this.results.sameCity.map(v => v._id));
    }

    // For city+area searches, run nearby only after same-city to keep same-city vendors first.
    if (locationData.coordinates && deferNearbyForCityArea) {
      this.results.nearby = await this.findNearbyVendors(locationData.coordinates, allVendorIds);
      allVendorIds.push(...this.results.nearby.map(v => v._id));
    }

    // Tier 4: Adjacent City Vendors (only if needed)
    const currentTotal = allVendorIds.length;
    if (currentTotal < SEARCH_CONFIG.MIN_RESULTS_THRESHOLD && locationData.coordinates) {
      this.results.adjacentCity = await this.findAdjacentCityVendors(locationData.coordinates, allVendorIds);
    }

    // Fallback: If no location-based results, search all vendors matching other criteria
    if (allVendorIds.length === 0) {
      const baseQuery = this.buildBaseQuery();
      const budgetQuery = this.buildBudgetQuery(false);
      
      const fallbackVendors = await Vendor.find({
        ...baseQuery,
        ...budgetQuery
      })
      .sort({ isFeatured: -1, rating: -1, reviewCount: -1 })
      .limit(SEARCH_CONFIG.DEFAULT_PAGE_SIZE * 2)
      .select('-password -verificationDocuments')
      .lean();
      
      this.results.nearby = fallbackVendors.map(v => ({ 
        ...v, 
        matchTier: 'nearby', 
        tierPriority: 2 
      }));
      
    }

    // Step 3: Combine results in priority order
    const hasCityIntent = Boolean(this.params.city || this.metadata.searchCity);
    const combinedResults = (isCityAreaFallback || hasCityIntent)
      ? [
          ...this.results.exactArea,
          ...this.results.sameCity,
          ...this.results.nearby,
          ...this.results.adjacentCity
        ]
      : [
          ...this.results.exactArea,
          ...this.results.nearby,
          ...this.results.sameCity,
          ...this.results.adjacentCity
        ];

    this.metadata.totalFound = combinedResults.length;
    this.metadata.tierBreakdown = {
      exactArea: this.results.exactArea.length,
      nearby: this.results.nearby.length,
      sameCity: this.results.sameCity.length,
      adjacentCity: this.results.adjacentCity.length
    };


    // Step 3.5: Apply Progressive Fallback if results insufficient
    let finalResults = combinedResults;
    let fallbackMetadata = {
      triggered: false,
      reason: null,
      expansionLevel: 0,
      appliedRelaxations: [],
      confidence: 1.0,
      suggestedSearches: [],
      relatedServices: []
    };

    if (needsFallback(combinedResults)) {
      
      const fallbackResult = await applyProgressiveFallback(this.params, combinedResults);
      
      finalResults = fallbackResult.results;
      fallbackMetadata = fallbackResult.fallback;
      
      // Update metadata
      this.metadata.totalFound = fallbackResult.total;
      this.metadata.fallbackApplied = fallbackMetadata.triggered;
      this.metadata.fallbackLevel = fallbackMetadata.expansionLevel;
      
    }

    // Step 4: Apply pagination
    const { page, limit } = this.params;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedResults = finalResults.slice(startIndex, endIndex);

    return {
      success: true,
      results: paginatedResults,
      total: this.metadata.totalFound,
      page,
      limit,
      totalPages: Math.ceil(this.metadata.totalFound / limit),
      hasNextPage: endIndex < this.metadata.totalFound,
      hasPrevPage: page > 1,
      metadata: {
        searchLocation: {
          coordinates: this.metadata.searchCoordinates,
          area: this.metadata.searchArea,
          city: this.metadata.searchCity,
          radiusKm: this.params.radius
        },
        tierBreakdown: this.metadata.tierBreakdown,
        fallback: fallbackMetadata,
        appliedFilters: {
          query: this.params.query || null,
          serviceType: this.params.serviceType || null,
          budget: this.params.budget,
          verified: this.params.verified,
          rating: this.params.rating,
          customFilters: this.params.filters
        },
        timestamp: this.metadata.timestamp
      }
    };
  }
}

// ============================================================================
// EXPORTED API
// ============================================================================

/**
 * Main search function - unified entry point
 */
async function searchVendors(searchParams) {
  try {
    const search = new UnifiedVendorSearch(searchParams);
    return await search.execute();
  } catch (error) {
    console.error('❌ Unified Search Error:', error);
    throw error;
  }
}

module.exports = {
  searchVendors,
  UnifiedVendorSearch,
  SEARCH_CONFIG
};
