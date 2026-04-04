/**
 * SEARCH NORMALIZATION SERVICE
 * 
 * Normalizes user search input to valid taxonomy services
 * Uses taxonomy keyword arrays for intelligent matching
 * 
 * Priority: Service keywords → Subcategory → Category → Vendor names
 * NO hardcoded synonyms • Everything from database taxonomy
 */

const Taxonomy = require('../models/Taxonomy');
const VendorNew = require('../models/VendorNew');

/**
 * Normalize search query to taxonomy IDs
 * 
 * @param {string} query - Raw user input
 * @returns {Promise<Object>} Normalized search context
 */
const normalizeSearchQuery = async (query) => {
  if (!query || typeof query !== 'string') {
    return {
      originalQuery: query,
      normalizedQuery: null,
      taxonomyMatches: {
        services: [],
        subcategories: [],
        categories: []
      },
      confidence: 0,
      matchType: 'none'
    };
  }

  const normalized = query.toLowerCase().trim();
  const words = normalized.split(/\s+/);
  
  // Results container
  const matches = {
    services: [],
    subcategories: [],
    categories: []
  };

  // Priority 1: Search service keywords (highest priority)
  const serviceMatches = await Taxonomy.find({
    type: 'service',
    isActive: true,
    $or: [
      { keywords: { $in: words } },
      { keywords: { $regex: normalized, $options: 'i' } },
      { name: { $regex: normalized, $options: 'i' } }
    ]
  }).select('taxonomyId name keywords parentId icon');

  // Score service matches
  serviceMatches.forEach(service => {
    let score = 0;
    const serviceName = service.name.toLowerCase();
    const keywords = (service.keywords || []).map(k => k.toLowerCase());
    
    // Exact match on name
    if (serviceName === normalized) score += 100;
    
    // Exact keyword match
    if (keywords.includes(normalized)) score += 80;
    
    // Name contains query
    if (serviceName.includes(normalized)) score += 60;
    
    // Query contains name
    if (normalized.includes(serviceName)) score += 50;
    
    // Keyword contains query or vice versa
    keywords.forEach(keyword => {
      if (keyword.includes(normalized)) score += 30;
      if (normalized.includes(keyword)) score += 25;
      
      // Word-level matching
      words.forEach(word => {
        if (keyword.includes(word) || word.includes(keyword)) score += 10;
      });
    });

    if (score > 0) {
      matches.services.push({
        taxonomyId: service.taxonomyId,
        name: service.name,
        parentId: service.parentId,
        icon: service.icon,
        score
      });
    }
  });

  // Priority 2: Search subcategory keywords
  const subcategoryMatches = await Taxonomy.find({
    type: 'subcategory',
    isActive: true,
    $or: [
      { keywords: { $in: words } },
      { keywords: { $regex: normalized, $options: 'i' } },
      { name: { $regex: normalized, $options: 'i' } }
    ]
  }).select('taxonomyId name keywords parentId icon');

  subcategoryMatches.forEach(subcat => {
    let score = 0;
    const name = subcat.name.toLowerCase();
    const keywords = (subcat.keywords || []).map(k => k.toLowerCase());
    
    if (name === normalized) score += 90;
    if (keywords.includes(normalized)) score += 70;
    if (name.includes(normalized)) score += 50;
    if (normalized.includes(name)) score += 40;
    
    keywords.forEach(keyword => {
      if (keyword.includes(normalized)) score += 25;
      if (normalized.includes(keyword)) score += 20;
      words.forEach(word => {
        if (keyword.includes(word) || word.includes(keyword)) score += 8;
      });
    });

    if (score > 0) {
      matches.subcategories.push({
        taxonomyId: subcat.taxonomyId,
        name: subcat.name,
        parentId: subcat.parentId,
        icon: subcat.icon,
        score
      });
    }
  });

  // Priority 3: Search category keywords
  const categoryMatches = await Taxonomy.find({
    type: 'category',
    isActive: true,
    $or: [
      { keywords: { $in: words } },
      { keywords: { $regex: normalized, $options: 'i' } },
      { name: { $regex: normalized, $options: 'i' } }
    ]
  }).select('taxonomyId name keywords icon');

  categoryMatches.forEach(cat => {
    let score = 0;
    const name = cat.name.toLowerCase();
    const keywords = (cat.keywords || []).map(k => k.toLowerCase());
    
    if (name === normalized) score += 80;
    if (keywords.includes(normalized)) score += 60;
    if (name.includes(normalized)) score += 40;
    if (normalized.includes(name)) score += 35;
    
    keywords.forEach(keyword => {
      if (keyword.includes(normalized)) score += 20;
      if (normalized.includes(keyword)) score += 15;
      words.forEach(word => {
        if (keyword.includes(word) || word.includes(keyword)) score += 5;
      });
    });

    if (score > 0) {
      matches.categories.push({
        taxonomyId: cat.taxonomyId,
        name: cat.name,
        icon: cat.icon,
        score
      });
    }
  });

  // Sort all matches by score
  matches.services.sort((a, b) => b.score - a.score);
  matches.subcategories.sort((a, b) => b.score - a.score);
  matches.categories.sort((a, b) => b.score - a.score);

  // Determine best match and confidence
  let bestMatch = null;
  let confidence = 0;
  let matchType = 'none';

  if (matches.services.length > 0) {
    bestMatch = matches.services[0];
    confidence = Math.min(bestMatch.score / 100, 1.0);
    matchType = 'service';
  } else if (matches.subcategories.length > 0) {
    bestMatch = matches.subcategories[0];
    confidence = Math.min(bestMatch.score / 90, 0.9);
    matchType = 'subcategory';
  } else if (matches.categories.length > 0) {
    bestMatch = matches.categories[0];
    confidence = Math.min(bestMatch.score / 80, 0.8);
    matchType = 'category';
  }

  return {
    originalQuery: query,
    normalizedQuery: bestMatch ? bestMatch.name : normalized,
    taxonomyMatches: matches,
    bestMatch,
    confidence,
    matchType
  };
};

/**
 * Build vendor query from normalized search
 * 
 * @param {Object} normalizedSearch - Result from normalizeSearchQuery
 * @param {Object} additionalFilters - City, budget, etc.
 * @returns {Object} MongoDB query for vendors
 */
const buildVendorQuery = (normalizedSearch, additionalFilters = {}) => {
  const query = {
    approvalStatus: 'approved', // Only approved vendors
    isActive: true
  };

  // Add taxonomy-based matching
  if (normalizedSearch.bestMatch) {
    const { matchType, bestMatch, taxonomyMatches } = normalizedSearch;
    
    if (matchType === 'service') {
      // Direct service match - most specific
      query.serviceType = { $in: taxonomyMatches.services.map(s => s.taxonomyId) };
    } else if (matchType === 'subcategory') {
      // Get all services under this subcategory
      const serviceIds = taxonomyMatches.services
        .filter(s => s.parentId === bestMatch.taxonomyId)
        .map(s => s.taxonomyId);
      
      if (serviceIds.length > 0) {
        query.serviceType = { $in: serviceIds };
      }
    } else if (matchType === 'category') {
      // Get all services under subcategories of this category
      const subcatIds = taxonomyMatches.subcategories
        .filter(sc => sc.parentId === bestMatch.taxonomyId)
        .map(sc => sc.taxonomyId);
      
      const serviceIds = taxonomyMatches.services
        .filter(s => subcatIds.includes(s.parentId))
        .map(s => s.taxonomyId);
      
      if (serviceIds.length > 0) {
        query.serviceType = { $in: serviceIds };
      }
    }
  }

  // Fallback: Also search vendor business names if no strong taxonomy match
  if (normalizedSearch.confidence < 0.5) {
    query.$or = [
      { serviceType: query.serviceType },
      { businessName: { $regex: normalizedSearch.originalQuery, $options: 'i' } },
      { name: { $regex: normalizedSearch.originalQuery, $options: 'i' } }
    ];
    delete query.serviceType;
  }

  // Add additional filters
  if (additionalFilters.city) {
    query.city = additionalFilters.city;
  }

  if (additionalFilters.area) {
    query.area = additionalFilters.area;
  }

  if (additionalFilters.budgetMin !== undefined || additionalFilters.budgetMax !== undefined) {
    query.$and = query.$and || [];
    
    if (additionalFilters.budgetMin !== undefined) {
      query.$and.push({ minPrice: { $gte: additionalFilters.budgetMin } });
    }
    
    if (additionalFilters.budgetMax !== undefined) {
      query.$and.push({ maxPrice: { $lte: additionalFilters.budgetMax } });
    }
  }

  return query;
};

/**
 * Get vendor suggestions based on normalized query
 * Used for autocomplete/suggestions
 * 
 * @param {string} query - Partial user input
 * @param {number} limit - Maximum suggestions to return (default: 12)
 * @returns {Promise<Array>} Suggestion objects with matched keywords
 */
const getSearchSuggestions = async (query, limit = 12) => {
  if (!query || query.length < 1) return [];

  const normalized = await normalizeSearchQuery(query);
  const suggestions = [];
  const seen = new Set(); // Prevent duplicates

  // Helper to add suggestion if not duplicate
  const addSuggestion = (item, type) => {
    const key = `${type}-${item.taxonomyId}`;
    if (!seen.has(key)) {
      seen.add(key);
      
      // Find which keyword matched (for highlighting)
      let matchedKeyword = null;
      if (item.keywords && Array.isArray(item.keywords)) {
        matchedKeyword = item.keywords.find(kw => 
          kw.toLowerCase().includes(query.toLowerCase()) ||
          query.toLowerCase().includes(kw.toLowerCase())
        );
      }

      suggestions.push({
        type,
        id: item.taxonomyId,
        taxonomyId: item.taxonomyId,
        label: item.name,
        icon: item.icon || '🔧',
        score: item.score || 0,
        matchedKeyword: matchedKeyword || null,
        parentId: item.parentId || null
      });
    }
  };

  // Priority 1: Services (most specific)
  normalized.taxonomyMatches.services
    .slice(0, Math.ceil(limit * 0.6)) // 60% services
    .forEach(service => addSuggestion(service, 'service'));

  // Priority 2: Subcategories
  normalized.taxonomyMatches.subcategories
    .slice(0, Math.ceil(limit * 0.3)) // 30% subcategories
    .forEach(subcat => addSuggestion(subcat, 'subcategory'));

  // Priority 3: Categories
  normalized.taxonomyMatches.categories
    .slice(0, Math.ceil(limit * 0.1)) // 10% categories
    .forEach(cat => addSuggestion(cat, 'category'));

  // Sort by relevance score and limit results
  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

module.exports = {
  normalizeSearchQuery,
  buildVendorQuery,
  getSearchSuggestions
};
