/**
 * RESULT-BASED FILTER SERVICE
 * 
 * Generates context-aware filters from current search results
 * Filters operate ONLY on already-fetched result set
 * NO new API calls • NO fresh vendor fetches • Instant filtering
 * 
 * Like Flipkart's left panel - filters are derived from current results
 */

const Taxonomy = require('../models/Taxonomy');

/**
 * Generate available filters from search results
 * Shows only filters that are relevant to current result set
 * 
 * @param {Array} vendors - Current search results
 * @param {Object} searchContext - Search context (query, serviceType, etc.)
 * @returns {Object} Filter options with counts
 */
const generateFiltersFromResults = async (vendors, searchContext = {}) => {
  if (!vendors || vendors.length === 0) {
    return {
      budget: { ranges: [], min: 0, max: 0 },
      location: { cities: [], areas: [] },
      services: [],
      subcategories: [],
      categories: [],
      rating: { available: false },
      verified: { available: false }
    };
  }

  // Extract unique values from result set
  const uniqueServices = new Set();
  const uniqueCities = new Set();
  const uniqueAreas = new Set();
  const pricePoints = [];
  const ratings = [];
  let hasVerifiedVendors = false;

  vendors.forEach(vendor => {
    // Service types
    if (vendor.serviceType) {
      uniqueServices.add(vendor.serviceType);
    }

    // Locations
    if (vendor.city) {
      uniqueCities.add(vendor.city);
    }
    if (vendor.area) {
      uniqueAreas.add(vendor.area);
    }

    // Budget
    if (vendor.minPrice) pricePoints.push(vendor.minPrice);
    if (vendor.maxPrice) pricePoints.push(vendor.maxPrice);

    // Rating
    if (vendor.rating) ratings.push(vendor.rating);

    // Verified
    if (vendor.verified) hasVerifiedVendors = true;
  });

  // Get taxonomy info for services
  const serviceIds = Array.from(uniqueServices);
  const taxonomyServices = await Taxonomy.find({
    taxonomyId: { $in: serviceIds },
    type: 'service',
    isActive: true
  }).select('taxonomyId name parentId icon');

  // Group services by subcategory
  const subcategoryMap = new Map();
  const categoryMap = new Map();

  for (const service of taxonomyServices) {
    if (service.parentId) {
      if (!subcategoryMap.has(service.parentId)) {
        subcategoryMap.set(service.parentId, []);
      }
      subcategoryMap.get(service.parentId).push({
        taxonomyId: service.taxonomyId,
        name: service.name,
        icon: service.icon || '🔧',
        count: vendors.filter(v => v.serviceType === service.taxonomyId).length
      });
    }
  }

  // Get subcategories and their parent categories
  const subcategoryIds = Array.from(subcategoryMap.keys());
  const subcategories = await Taxonomy.find({
    taxonomyId: { $in: subcategoryIds },
    type: 'subcategory',
    isActive: true
  }).select('taxonomyId name parentId icon');

  const subcategoryFilters = [];
  for (const subcat of subcategories) {
    const services = subcategoryMap.get(subcat.taxonomyId) || [];
    if (services.length > 0) {
      subcategoryFilters.push({
        taxonomyId: subcat.taxonomyId,
        name: subcat.name,
        icon: subcat.icon || '📋',
        count: services.reduce((sum, s) => sum + s.count, 0),
        services
      });

      // Track parent category
      if (subcat.parentId && !categoryMap.has(subcat.parentId)) {
        categoryMap.set(subcat.parentId, []);
      }
      if (subcat.parentId) {
        categoryMap.get(subcat.parentId).push(subcat.taxonomyId);
      }
    }
  }

  // Get categories
  const categoryIds = Array.from(categoryMap.keys());
  const categories = await Taxonomy.find({
    taxonomyId: { $in: categoryIds },
    type: 'category',
    isActive: true
  }).select('taxonomyId name icon');

  const categoryFilters = categories.map(cat => {
    const subcatIds = categoryMap.get(cat.taxonomyId) || [];
    const count = subcategoryFilters
      .filter(sc => subcatIds.includes(sc.taxonomyId))
      .reduce((sum, sc) => sum + sc.count, 0);

    return {
      taxonomyId: cat.taxonomyId,
      name: cat.name,
      icon: cat.icon || '🏷️',
      count,
      subcategories: subcategoryFilters.filter(sc => subcatIds.includes(sc.taxonomyId))
    };
  }).filter(cat => cat.count > 0);

  // Generate budget ranges based on actual prices
  const budgetRanges = generateBudgetRanges(pricePoints);

  // Generate rating filters
  const ratingFilters = generateRatingFilters(ratings);

  return {
    // Budget filters
    budget: {
      ranges: budgetRanges,
      min: Math.min(...pricePoints),
      max: Math.max(...pricePoints)
    },

    // Location filters
    location: {
      cities: Array.from(uniqueCities).map(city => ({
        name: city,
        count: vendors.filter(v => v.city === city).length
      })),
      areas: Array.from(uniqueAreas).map(area => ({
        name: area,
        count: vendors.filter(v => v.area === area).length
      })).slice(0, 20) // Limit areas to prevent overwhelming UI
    },

    // Service filters (flat list)
    services: taxonomyServices.map(s => ({
      taxonomyId: s.taxonomyId,
      name: s.name,
      icon: s.icon || '🔧',
      count: vendors.filter(v => v.serviceType === s.taxonomyId).length
    })).filter(s => s.count > 0),

    // Subcategory filters (grouped)
    subcategories: subcategoryFilters,

    // Category filters (top level)
    categories: categoryFilters,

    // Rating filter
    rating: {
      available: ratings.length > 0,
      filters: ratingFilters
    },

    // Verified filter
    verified: {
      available: hasVerifiedVendors,
      count: vendors.filter(v => v.verified).length
    }
  };
};

/**
 * Generate smart budget ranges based on actual price distribution
 */
const generateBudgetRanges = (pricePoints) => {
  if (pricePoints.length === 0) return [];

  const sorted = pricePoints.sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  // Generate 5 ranges
  const rangeSize = (max - min) / 5;
  const ranges = [];

  for (let i = 0; i < 5; i++) {
    const rangeMin = min + (rangeSize * i);
    const rangeMax = i === 4 ? max : min + (rangeSize * (i + 1));
    
    const count = pricePoints.filter(p => p >= rangeMin && p <= rangeMax).length;
    
    if (count > 0) {
      ranges.push({
        label: formatBudgetRange(rangeMin, rangeMax),
        min: Math.floor(rangeMin),
        max: Math.ceil(rangeMax),
        count
      });
    }
  }

  return ranges;
};

/**
 * Generate rating filters
 */
const generateRatingFilters = (ratings) => {
  if (ratings.length === 0) return [];

  const filters = [
    { rating: 4.5, label: '4.5★ & above' },
    { rating: 4.0, label: '4★ & above' },
    { rating: 3.5, label: '3.5★ & above' },
    { rating: 3.0, label: '3★ & above' }
  ];

  return filters.map(f => ({
    ...f,
    count: ratings.filter(r => r >= f.rating).length
  })).filter(f => f.count > 0);
};

/**
 * Format budget range for display
 */
const formatBudgetRange = (min, max) => {
  const formatPrice = (price) => {
    if (price >= 100000) {
      return `₹${(price / 100000).toFixed(1)}L`;
    }
    if (price >= 1000) {
      return `₹${(price / 1000).toFixed(0)}K`;
    }
    return `₹${price}`;
  };

  return `${formatPrice(min)} - ${formatPrice(max)}`;
};

/**
 * Apply filters to vendor result set (client-side filtering)
 * This is for in-memory filtering without new API calls
 * 
 * @param {Array} vendors - Current vendor results
 * @param {Object} filters - Filters to apply
 * @returns {Array} Filtered vendors
 */
const applyFiltersToResults = (vendors, filters = {}) => {
  let filtered = [...vendors];

  // Budget filter
  if (filters.budgetMin !== undefined || filters.budgetMax !== undefined) {
    filtered = filtered.filter(vendor => {
      const vendorMin = vendor.minPrice || 0;
      const vendorMax = vendor.maxPrice || Infinity;

      if (filters.budgetMin !== undefined && vendorMax < filters.budgetMin) {
        return false;
      }
      if (filters.budgetMax !== undefined && vendorMin > filters.budgetMax) {
        return false;
      }
      return true;
    });
  }

  // City filter
  if (filters.city) {
    filtered = filtered.filter(vendor => vendor.city === filters.city);
  }

  // Area filter
  if (filters.area) {
    filtered = filtered.filter(vendor => vendor.area === filters.area);
  }
  // Service type filter
  if (filters.serviceType) {
    const serviceTypes = Array.isArray(filters.serviceType) 
      ? filters.serviceType 
      : [filters.serviceType];
    filtered = filtered.filter(vendor => serviceTypes.includes(vendor.serviceType));
  }

  // Rating filter
  if (filters.minRating !== undefined) {
    filtered = filtered.filter(vendor => 
      (vendor.rating || 0) >= filters.minRating
    );
  }

  // Verified filter
  if (filters.verified === true) {
    filtered = filtered.filter(vendor => vendor.verified === true);
  }

  return filtered;
};

/**
 * Get quick filter suggestions based on search context
 * Shows most relevant filters first
 * 
 * @param {Object} availableFilters - Filters generated from results
 * @param {Object} searchContext - Current search context
 * @returns {Array} Prioritized filter suggestions
 */
const getQuickFilters = (availableFilters, searchContext = {}) => {
  const suggestions = [];

  // If single service, show subcategory siblings
  if (availableFilters.services.length > 1) {
    suggestions.push({
      type: 'service',
      label: 'Service Type',
      options: availableFilters.services.slice(0, 5)
    });
  }

  // Always show budget if available
  if (availableFilters.budget.ranges.length > 0) {
    suggestions.push({
      type: 'budget',
      label: 'Budget Range',
      options: availableFilters.budget.ranges.slice(0, 4)
    });
  }

  // Show rating if available
  if (availableFilters.rating.available) {
    suggestions.push({
      type: 'rating',
      label: 'Customer Rating',
      options: availableFilters.rating.filters.slice(0, 3)
    });
  }

  // Show location if user searched all cities
  if (!searchContext.city && availableFilters.location.cities.length > 1) {
    suggestions.push({
      type: 'location',
      label: 'Location',
      options: availableFilters.location.cities.slice(0, 5)
    });
  }

  return suggestions;
};

module.exports = {
  generateFiltersFromResults,
  applyFiltersToResults,
  getQuickFilters
};
