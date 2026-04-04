/**
 * ============================================================================
 * PROGRESSIVE SEARCH FALLBACK SERVICE
 * ============================================================================
 * 
 * ZERO "NO RESULTS" GUARANTEE
 * 
 * Implements intelligent search degradation that never shows empty results.
 * Gracefully expands scope while maintaining relevance.
 * 
 * HIERARCHICAL EXPANSION STRATEGY:
 * 
 * Level 1: Exact Service Match (e.g., "AC repair", "CCTV installation")
 * Level 2: Parent Service Match (e.g., "photography")  
 * Level 3: Subcategory Match (e.g., "photographers")
 * Level 4: Category Match (e.g., "Photography & Videography")
 * Level 5: Keyword/Synonym Match (e.g., "photoshoot", "cameraman")
 * Level 6: Location-only vendors (same service category)
 * Level 7: Global approved vendors (last resort)
 * 
 * SMART FILTER RELAXATION:
 * - Budget flexibility increases progressively
 * - Location radius expands automatically
 * - Rating threshold lowers if needed
 * - Verified-only filter relaxes last
 * 
 * DATABASE-DRIVEN ONLY:
 * - All logic based on Taxonomy collection
 * - No hardcoded services or synonyms
 * - Dynamic keyword expansion
 * 
 * @module services/progressiveFallbackService
 */

const mongoose = require('mongoose');
const Vendor = require('../models/VendorNew');
const Taxonomy = require('../models/Taxonomy');
const { normalizeSearchQuery } = require('./searchNormalizationService');

// ============================================================================
// CONFIGURATION
// ============================================================================

const FALLBACK_CONFIG = {
  // Minimum acceptable results before triggering fallback
  MIN_RESULTS_THRESHOLD: 3,
  
  // Confidence thresholds for different expansion levels
  CONFIDENCE_LEVELS: {
    HIGH: 0.8,      // Exact match
    MEDIUM: 0.6,    // Parent/subcategory match
    LOW: 0.4,       // Category match
    MINIMAL: 0.2    // Keyword match
  },
  
  // Budget flexibility per level (percentage)
  BUDGET_FLEXIBILITY: {
    level1: 0,      // No flexibility
    level2: 10,     // ±10%
    level3: 20,     // ±20%
    level4: 30,     // ±30%
    level5: 50,     // ±50%
    level6: 100     // ±100%
  },
  
  // Location radius expansion (km)
  RADIUS_EXPANSION: {
    level1: 5,
    level2: 10,
    level3: 20,
    level4: 50,
    level5: 100,
    level6: 500     // Nationwide
  },
  
  // Rating flexibility
  RATING_FLEXIBILITY: {
    level1: 0,      // Keep requested rating
    level2: 0,
    level3: 0.5,    // Lower by 0.5 stars
    level4: 1.0,    // Lower by 1 star
    level5: 2.0,    // Lower by 2 stars
    level6: 5.0     // Accept any rating
  },
  
  // Maximum results per expansion level
  MAX_RESULTS_PER_LEVEL: 50
};

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function safeRegex(value, flags = 'i') {
  return new RegExp(escapeRegex(value), flags);
}

// ============================================================================
// PROGRESSIVE SEARCH CLASS
// ============================================================================

class ProgressiveSearchFallback {
  constructor(originalSearchParams, originalResults = []) {
    this.original = {
      params: originalSearchParams,
      results: originalResults,
      count: originalResults.length
    };
    
    this.expansionLevel = 0;
    this.taxonomyCache = null;
    this.fallbackMetadata = {
      triggered: false,
      reason: null,
      expansionLevel: 0,
      appliedRelaxations: [],
      confidence: 1.0,
      suggestedSearches: [],
      relatedServices: [],
      timestamp: new Date()
    };
  }

  /**
   * Main entry point - determine if fallback needed and execute
   */
  async execute() {
    
    // If we have enough results, no fallback needed
    if (this.original.count >= FALLBACK_CONFIG.MIN_RESULTS_THRESHOLD) {
      return {
        results: this.original.results,
        total: this.original.count,
        fallback: this.fallbackMetadata
      };
    }

    // Trigger progressive fallback
    this.fallbackMetadata.triggered = true;
    this.fallbackMetadata.reason = `Only ${this.original.count} results found`;
    
    // Load taxonomy for intelligent expansion
    await this.loadTaxonomyContext();
    
    // Execute progressive expansion - collects ALL levels
    const expandedResults = await this.progressiveExpansion();
    
    // Calculate result breakdown by category
    const resultBreakdown = {
      exact: expandedResults.filter(r => r.matchCategory === 'exact').length,
      similar: expandedResults.filter(r => r.matchCategory === 'similar').length,
      other: expandedResults.filter(r => r.matchCategory === 'other').length,
      suggested: expandedResults.filter(r => r.matchCategory === 'suggested').length
    };
    
    this.fallbackMetadata.resultBreakdown = resultBreakdown;
    
    // Generate suggestions and alternatives
    await this.generateSuggestions();
    
    
    return {
      results: expandedResults,
      total: expandedResults.length,
      fallback: this.fallbackMetadata
    };
  }

  /**
   * Load taxonomy context for the search query
   */
  async loadTaxonomyContext() {
    const { query, serviceType } = this.original.params;
    
    if (!query && !serviceType) {
      return;
    }

    // If serviceType provided, lookup its taxonomy
    if (serviceType) {
      const service = await Taxonomy.findOne({
        type: 'service',
        taxonomyId: serviceType.toLowerCase(),
        isActive: true
      }).lean();
      
      if (service) {
        const subcategory = await Taxonomy.findOne({
          type: 'subcategory',
          taxonomyId: service.parentId,
          isActive: true
        }).lean();
        
        const category = subcategory ? await Taxonomy.findOne({
          type: 'category',
          taxonomyId: subcategory.parentId,
          isActive: true
        }).lean() : null;
        
        this.taxonomyCache = {
          service,
          subcategory,
          category,
          relatedServices: await this.findRelatedServices(service, subcategory)
        };
      }
    } 
    // If text query provided, normalize it
    else if (query) {
      const normalized = await normalizeSearchQuery(query);
      
      if (normalized.bestMatch) {
        // Build taxonomy hierarchy from best match
        const { matchType, bestMatch } = normalized;
        
        if (matchType === 'service') {
          const service = await Taxonomy.findOne({
            type: 'service',
            taxonomyId: bestMatch.taxonomyId,
            isActive: true
          }).lean();
          
          if (service) {
            const subcategory = await Taxonomy.findOne({
              type: 'subcategory',
              taxonomyId: service.parentId,
              isActive: true
            }).lean();
            
            const category = subcategory ? await Taxonomy.findOne({
              type: 'category',
              taxonomyId: subcategory.parentId,
              isActive: true
            }).lean() : null;
            
            this.taxonomyCache = {
              service,
              subcategory,
              category,
              relatedServices: await this.findRelatedServices(service, subcategory)
            };
          }
        } else if (matchType === 'subcategory') {
          const subcategory = await Taxonomy.findOne({
            type: 'subcategory',
            taxonomyId: bestMatch.taxonomyId,
            isActive: true
          }).lean();
          
          if (subcategory) {
            const category = await Taxonomy.findOne({
              type: 'category',
              taxonomyId: subcategory.parentId,
              isActive: true
            }).lean();
            
            const services = await Taxonomy.find({
              type: 'service',
              parentId: subcategory.taxonomyId,
              isActive: true
            }).lean();
            
            this.taxonomyCache = {
              service: null,
              subcategory,
              category,
              relatedServices: services
            };
          }
        } else if (matchType === 'category') {
          const category = await Taxonomy.findOne({
            type: 'category',
            taxonomyId: bestMatch.taxonomyId,
            isActive: true
          }).lean();
          
          if (category) {
            const subcategories = await Taxonomy.find({
              type: 'subcategory',
              parentId: category.taxonomyId,
              isActive: true
            }).lean();
            
            const services = await Taxonomy.find({
              type: 'service',
              parentId: { $in: subcategories.map(s => s.taxonomyId) },
              isActive: true
            }).lean();
            
            this.taxonomyCache = {
              service: null,
              subcategory: null,
              category,
              relatedServices: services
            };
          }
        }
      }
    }
    
  }

  /**
   * Find related services (siblings in same subcategory)
   */
  async findRelatedServices(service, subcategory) {
    if (!subcategory) return [];
    
    const relatedServices = await Taxonomy.find({
      type: 'service',
      parentId: subcategory.taxonomyId,
      taxonomyId: { $ne: service.taxonomyId }, // Exclude current service
      isActive: true
    }).select('taxonomyId name keywords icon').lean();
    
    return relatedServices;
  }

  /**
   * Progressive expansion - collect results from all levels and merge by priority
   * Returns: Exact matches → Similar → Other → Suggested (in that order)
   */
  async progressiveExpansion() {
    const levels = [
      { level: 1, method: 'searchExactService', name: 'Exact Service Match', category: 'exact' },
      { level: 2, method: 'searchParentServices', name: 'Parent Service Match', category: 'similar' },
      { level: 3, method: 'searchSubcategoryServices', name: 'Subcategory Match', category: 'similar' },
      { level: 4, method: 'searchCategoryServices', name: 'Category Match', category: 'other' },
      { level: 5, method: 'searchByKeywords', name: 'Keyword Match', category: 'other' },
      { level: 6, method: 'searchLocationOnly', name: 'Location-based Match', category: 'suggested' },
      { level: 7, method: 'searchGlobalFallback', name: 'Global Approved Vendors', category: 'suggested' }
    ];

    // Collect results from all levels
    const collectedResults = {
      exact: [],      // Level 1
      similar: [],    // Level 2-3
      other: [],      // Level 4-5
      suggested: []   // Level 6-7
    };
    
    const seenVendorIds = new Set();
    let totalCollected = 0;
    let highestSuccessfulLevel = 0;

    // Execute each level and collect results
    for (const { level, method, name, category } of levels) {
      
      this.expansionLevel = level;
      
      try {
        const results = await this[method]();
        
        if (results && results.length > 0) {
          // Filter out duplicates and add to appropriate category
          const uniqueResults = results.filter(vendor => {
            const vendorId = vendor._id.toString();
            if (seenVendorIds.has(vendorId)) {
              return false;
            }
            seenVendorIds.add(vendorId);
            return true;
          });

          if (uniqueResults.length > 0) {
            // Tag results with match category for frontend
            const taggedResults = uniqueResults.map(v => ({
              ...v,
              matchCategory: category,
              matchLevel: level,
              matchPriority: level // Lower is better
            }));

            collectedResults[category].push(...taggedResults);
            totalCollected += uniqueResults.length;
            highestSuccessfulLevel = level;

            
            this.fallbackMetadata.appliedRelaxations.push({
              level,
              name,
              category,
              resultsFound: uniqueResults.length
            });
          } else {
          }
        } else {
        }
      } catch (error) {
        console.error(`   ❌ Level ${level} ERROR:`, error.message);
        // Continue to next level even if this one fails
      }

      // CRITICAL: If Level 7 and still 0 results, don't stop - ensure Level 7 ran
      if (level === 7 && totalCollected === 0) {
      }

      // Stop expanding if we have enough results (but always complete Level 7 if we reached it)
      if (totalCollected >= FALLBACK_CONFIG.MIN_RESULTS_THRESHOLD * 5 && level < 7) {
        break;
      }
    }

    // CRITICAL: If we still have 0 results by Level 6, FORCE Level 7 execution
    if (totalCollected === 0 && highestSuccessfulLevel < 7) {
      const level7Results = await this.searchGlobalFallback();
      
      if (level7Results && level7Results.length > 0) {
        const taggedResults = level7Results.map(v => ({
          ...v,
          matchCategory: 'suggested',
          matchLevel: 7,
          matchPriority: 7
        }));
        
        collectedResults.suggested.push(...taggedResults);
        totalCollected += level7Results.length;
        highestSuccessfulLevel = 7;
        
        
        this.fallbackMetadata.appliedRelaxations.push({
          level: 7,
          name: 'Global Approved Vendors (FORCED)',
          category: 'suggested',
          resultsFound: level7Results.length
        });
      }
    }

    // Update metadata
    this.fallbackMetadata.expansionLevel = highestSuccessfulLevel;

    // Combine results in priority order: exact → similar → other → suggested
    const combinedResults = [
      ...collectedResults.exact,
      ...collectedResults.similar,
      ...collectedResults.other,
      ...collectedResults.suggested
    ];


    // If still no results after all levels, this means database is empty or all vendors inactive
    // Return original results as last resort (should be empty array)
    if (combinedResults.length === 0) {
      return this.original.results;
    }

    return combinedResults;
  }

  /**
   * LEVEL 1: Search exact service with relaxed filters
   */
  async searchExactService() {
    const { serviceType, query: searchQuery } = this.original.params;
    
    if (!serviceType && !searchQuery && !this.taxonomyCache?.service) {
      return [];
    }

    const query = this.buildRelaxedQuery(1, {});

    // Match service type
    if (serviceType) {
      query.serviceType = safeRegex(serviceType);
    } else if (this.taxonomyCache?.service) {
      query.serviceType = safeRegex(this.taxonomyCache.service.taxonomyId);
    } else if (searchQuery) {
      // Try matching service name in search keywords
      query.searchKeywords = safeRegex(searchQuery);
    }

    return await this.executeVendorQuery(query, 1);
  }

  /**
   * LEVEL 2: Search parent/related services in same subcategory
   */
  async searchParentServices() {
    const { serviceType } = this.original.params;
    
    const query = this.buildRelaxedQuery(2, {});

    // Try taxonomy-based matching
    if (this.taxonomyCache?.subcategory) {
      const subcategoryServices = await Taxonomy.find({
        type: 'service',
        parentId: this.taxonomyCache.subcategory.taxonomyId,
        isActive: true
      }).select('taxonomyId').lean();

      if (subcategoryServices.length > 0) {
        const serviceIds = subcategoryServices.map(s => s.taxonomyId);
        query.serviceType = { $in: serviceIds };
        return await this.executeVendorQuery(query, 2);
      }
    }
    
    if (serviceType) {
      // Fallback: match service type loosely
      const baseType = serviceType.split('-')[0];
      query.serviceType = safeRegex(baseType);
      return await this.executeVendorQuery(query, 2);
    }

    return [];
  }

  /**
   * LEVEL 3: Search all services in same subcategory
   */
  async searchSubcategoryServices() {
    const { city } = this.original.params;
    
    const query = this.buildRelaxedQuery(3, {
      isActive: true
    });

    // Try taxonomy-based matching
    if (this.taxonomyCache?.subcategory) {
      const subcategoryServices = await Taxonomy.find({
        type: 'service',
        parentId: this.taxonomyCache.subcategory.taxonomyId,
        isActive: true
      }).select('taxonomyId name').lean();

      if (subcategoryServices.length > 0) {
        const serviceIds = subcategoryServices.map(s => s.taxonomyId);
        const keywords = subcategoryServices.map(s => s.name.toLowerCase());
        
        query.$or = [
          { serviceType: { $in: serviceIds } },
          { searchKeywords: { $in: keywords } }
        ];
      }
    }

    // Add city preference
    if (city) {
      query.city = safeRegex(city);
    }

    return await this.executeVendorQuery(query, 3);
  }

  /**
   * LEVEL 4: Search all services in same category
   */
  async searchCategoryServices() {
    const { city } = this.original.params;
    
    const query = this.buildRelaxedQuery(4, {
      isActive: true
    });

    // Try to match by category
    if (this.taxonomyCache?.category) {
      const subcategories = await Taxonomy.find({
        type: 'subcategory',
        parentId: this.taxonomyCache.category.taxonomyId,
        isActive: true
      }).select('taxonomyId').lean();

      if (subcategories.length > 0) {
        const services = await Taxonomy.find({
          type: 'service',
          parentId: { $in: subcategories.map(s => s.taxonomyId) },
          isActive: true
        }).select('taxonomyId name').lean();

        if (services.length > 0) {
          query.serviceType = { $in: services.map(s => s.taxonomyId) };
        }
      }
    }

    // Still prefer same city
    if (city) {
      query.city = safeRegex(city);
    }

    return await this.executeVendorQuery(query, 4);
  }

  /**
   * LEVEL 5: Search by keywords
   */
  async searchByKeywords() {
    const { query: searchQuery, city } = this.original.params;
    
    if (!searchQuery && !this.taxonomyCache) {
      // If no query or taxonomy, just return location-based vendors
      return [];
    }

    const queryObj = this.buildRelaxedQuery(5, {
      isActive: true
    });

    // Build keyword-based search
    const keywords = [];
    const searchTerms = [];
    
    if (searchQuery) {
      searchTerms.push(searchQuery.toLowerCase());
      const words = searchQuery.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      searchTerms.push(...words);
    }

    // Add taxonomy keywords
    if (this.taxonomyCache?.service?.keywords) {
      keywords.push(...this.taxonomyCache.service.keywords);
    }
    if (this.taxonomyCache?.subcategory?.keywords) {
      keywords.push(...this.taxonomyCache.subcategory.keywords);
    }

    // Remove duplicates
    const uniqueKeywords = [...new Set([...keywords, ...searchTerms])];

    if (uniqueKeywords.length > 0) {
      const escapedKeywordPattern = uniqueKeywords.map(escapeRegex).join('|');
      queryObj.$or = [
        { searchKeywords: { $in: uniqueKeywords } },
        { name: new RegExp(escapedKeywordPattern, 'i') },
        { businessName: new RegExp(escapedKeywordPattern, 'i') },
        { description: new RegExp(escapedKeywordPattern, 'i') }
      ];
    }

    // Prefer same city
    if (city) {
      queryObj.city = safeRegex(city);
    }

    return await this.executeVendorQuery(queryObj, 5);
  }

  /**
   * LEVEL 6: Location-only search (ignore service type)
   */
  async searchLocationOnly() {
    const { city, area } = this.original.params;
    
    const locationQuery = this.buildRelaxedQuery(6, {
      isActive: true
    });
    
    // Apply location filters if available
    if (city) {
      locationQuery.city = safeRegex(city);
    }
    if (area) {
      locationQuery.area = safeRegex(area);
    }

    // If no location specified, get vendors sorted by rating
    return await this.executeVendorQuery(locationQuery, 6);
  }

  /**
   * LEVEL 7: Global fallback - any approved vendors (GUARANTEED RESULTS)
   */
  async searchGlobalFallback() {
    
    const query = {
      isActive: true
    };

    try {
      // Prefer verified and highly rated
      const vendors = await Vendor.find(query)
        .sort({ verified: -1, rating: -1, reviewCount: -1, isFeatured: -1 })
        .limit(FALLBACK_CONFIG.MAX_RESULTS_PER_LEVEL)
        .select('-password -verificationDocuments')
        .lean();


      return vendors.map(v => ({
        ...v,
        matchTier: 'global_fallback',
        tierPriority: 7,
        fallbackReason: 'No location or service match found - showing top vendors'
      }));
    } catch (error) {
      console.error('   ❌ Global fallback error:', error);
      return [];
    }
  }

  /**
   * Build query with progressive filter relaxation
   */
  buildRelaxedQuery(level, baseQuery = {}) {
    const query = { ...baseQuery };
    const { budget, verified, rating, filters } = this.original.params;

    // Ensure base required fields are set
    if (!query.isActive) {
      query.isActive = true;
    }

    // Budget relaxation (only apply in early levels)
    if (budget && (budget.min || budget.max) && level <= 4) {
      const flexibility = FALLBACK_CONFIG.BUDGET_FLEXIBILITY[`level${level}`] / 100;
      const relaxedBudget = {
        min: budget.min ? Math.floor(budget.min * (1 - flexibility)) : 0,
        max: budget.max ? Math.ceil(budget.max * (1 + flexibility)) : 999999999
      };

      if (relaxedBudget.min > 0 || relaxedBudget.max < 999999999) {
        query.$or = query.$or || [];
        query.$or.push(
          { 'pricing.min': { $gte: relaxedBudget.min, $lte: relaxedBudget.max } },
          { 'pricing.max': { $gte: relaxedBudget.min, $lte: relaxedBudget.max } },
          { 'pricing.average': { $gte: relaxedBudget.min, $lte: relaxedBudget.max } },
          { 'pricing.min': null }, // Allow vendors with no pricing
          { 'pricing.max': null }
        );
      }
    }

    // Verified status (only strict in level 1-2)
    if (verified !== undefined && level <= 2) {
      query.verified = verified;
    }

    // Rating relaxation
    if (rating !== undefined && level <= 4) {
      const ratingFlexibility = FALLBACK_CONFIG.RATING_FLEXIBILITY[`level${level}`] || 0;
      const minRating = Math.max(0, rating - ratingFlexibility);
      
      if (minRating > 0) {
        query.rating = { $gte: minRating };
      }
    }

    // Custom filters (only strict in level 1-2)
    if (filters && Object.keys(filters).length > 0 && level <= 2) {
      Object.keys(filters).forEach(key => {
        const value = filters[key];
        if (value !== undefined && value !== null) {
          if (Array.isArray(value) && value.length > 0) {
            query[`filters.${key}`] = { $in: value };
          } else {
            query[`filters.${key}`] = value;
          }
        }
      });
    }

    return query;
  }

  /**
   * Execute vendor query with location expansion
   */
  async executeVendorQuery(query, level) {
    const { latitude, longitude, city, area } = this.original.params;
    const expandedRadius = FALLBACK_CONFIG.RADIUS_EXPANSION[`level${level}`];

    // If coordinates available, use geospatial query
    if (latitude && longitude && level <= 5) {
      const coords = [parseFloat(longitude), parseFloat(latitude)];
      const radiusInMeters = expandedRadius * 1000;

      query.location = {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: coords
          },
          $maxDistance: radiusInMeters
        }
      };

      const vendors = await Vendor.find(query)
        .limit(FALLBACK_CONFIG.MAX_RESULTS_PER_LEVEL)
        .select('-password -verificationDocuments')
        .lean();

      return vendors.map(v => ({
        ...v,
        matchTier: `fallback_level_${level}`,
        tierPriority: level,
        fallbackRadius: expandedRadius
      }));
    }

    // Otherwise, standard query with sorting
    const vendors = await Vendor.find(query)
      .sort({ verified: -1, rating: -1, reviewCount: -1, isFeatured: -1 })
      .limit(FALLBACK_CONFIG.MAX_RESULTS_PER_LEVEL)
      .select('-password -verificationDocuments')
      .lean();

    return vendors.map(v => ({
      ...v,
      matchTier: `fallback_level_${level}`,
      tierPriority: level
    }));
  }

  /**
   * Generate suggestions and alternatives
   */
  async generateSuggestions() {
    const { query, serviceType } = this.original.params;
    
    // Related services from taxonomy
    if (this.taxonomyCache?.relatedServices) {
      this.fallbackMetadata.relatedServices = this.taxonomyCache.relatedServices.map(s => ({
        id: s.taxonomyId,
        name: s.name,
        icon: s.icon || '🔧',
        keywords: s.keywords || []
      }));
    }

    // Suggested searches based on taxonomy hierarchy
    const suggestions = [];
    
    if (this.taxonomyCache?.subcategory) {
      suggestions.push({
        text: `All ${this.taxonomyCache.subcategory.name}`,
        type: 'subcategory',
        confidence: 0.9
      });
    }
    
    if (this.taxonomyCache?.category) {
      suggestions.push({
        text: `All ${this.taxonomyCache.category.name}`,
        type: 'category',
        confidence: 0.7
      });
    }

    // Add related service suggestions
    if (this.taxonomyCache?.relatedServices && this.taxonomyCache.relatedServices.length > 0) {
      this.taxonomyCache.relatedServices.slice(0, 5).forEach(service => {
        suggestions.push({
          text: service.name,
          type: 'service',
          taxonomyId: service.taxonomyId,
          confidence: 0.8
        });
      });
    }

    // If location provided, suggest nearby cities
    if (this.original.params.city) {
      suggestions.push({
        text: `All vendors nearby ${this.original.params.city}`,
        type: 'location',
        confidence: 0.6
      });
    }

    this.fallbackMetadata.suggestedSearches = suggestions;
    
    // Calculate overall confidence
    this.fallbackMetadata.confidence = this.calculateConfidence();
  }

  /**
   * Calculate confidence score based on expansion level
   */
  calculateConfidence() {
    const level = this.expansionLevel;
    
    if (level === 0) return 1.0;
    if (level === 1) return 0.9;
    if (level === 2) return 0.8;
    if (level === 3) return 0.7;
    if (level === 4) return 0.6;
    if (level === 5) return 0.5;
    if (level === 6) return 0.3;
    return 0.1;
  }
}

// ============================================================================
// EXPORTED API
// ============================================================================

/**
 * Apply progressive fallback to search results
 * 
 * @param {Object} searchParams - Original search parameters
 * @param {Array} currentResults - Current search results
 * @returns {Promise<Object>} Enhanced results with fallback data
 */
async function applyProgressiveFallback(searchParams, currentResults = []) {
  try {
    const fallback = new ProgressiveSearchFallback(searchParams, currentResults);
    return await fallback.execute();
  } catch (error) {
    console.error('❌ Progressive Fallback Error:', error);
    
    // On error, return original results with error metadata
    return {
      results: currentResults,
      total: currentResults.length,
      fallback: {
        triggered: false,
        error: error.message,
        reason: 'Fallback service error'
      }
    };
  }
}

/**
 * Check if results need fallback
 */
function needsFallback(results = []) {
  return results.length < FALLBACK_CONFIG.MIN_RESULTS_THRESHOLD;
}

module.exports = {
  applyProgressiveFallback,
  needsFallback,
  ProgressiveSearchFallback,
  FALLBACK_CONFIG
};
