/**
 * SERVICE DETECTION & CONTEXT MANAGEMENT
 * 
 * This service detects which service the user is searching for
 * based on their query and manages the active service context
 * 
 * Now uses master taxonomy system - NO hardcoded data
 */

import { searchTaxonomy, getAllServices as getTaxonomyServices } from './taxonomyService';

/**
 * Detect service from search query using taxonomy
 * 
 * @param {string} query - User's search query
 * @returns {Promise<string|null>} - Service ID or null if no match
 */
export const detectServiceFromQuery = async (query) => {
  if (!query || typeof query !== 'string') return null;
  
  try {
    const results = await searchTaxonomy(query);
    
    // Return first service match
    const serviceMatch = results.find(item => item.type === 'service');
    return serviceMatch ? serviceMatch.taxonomyId : null;
  } catch (error) {
    console.error('Error detecting service:', error);
    return null;
  }
};

/**
 * Get service configuration by ID from taxonomy
 * 
 * @param {string} serviceId
 * @returns {Promise<object|null>}
 */
export const getServiceConfig = async (serviceId) => {
  try {
    const services = await getTaxonomyServices();
    return services.find(s => s.taxonomyId === serviceId) || null;
  } catch (error) {
    console.error('Error getting service config:', error);
    return null;
  }
};

/**
 * Get all available services from taxonomy
 * 
 * @returns {Promise<array>}
 */
export const getAllServices = async () => {
  try {
    const services = await getTaxonomyServices();
    return services.map(service => ({
      serviceId: service.taxonomyId,
      serviceName: service.name,
      icon: service.icon || '🔧',
      keywords: service.keywords || []
    }));
  } catch (error) {
    console.error('Error getting all services:', error);
    return [];
  }
};

/**
 * Get suggested services based on partial query using taxonomy search
 * 
 * @param {string} partialQuery
 * @returns {Promise<array>} - Suggested services
 */
export const getSuggestedServices = async (partialQuery) => {
  if (!partialQuery || (typeof partialQuery === 'string' && partialQuery.length < 1)) return [];

  try {
    const results = await searchTaxonomy(partialQuery);
    
    // Format results for suggestions
    return results.slice(0, 8).map(item => ({
      serviceId: item.taxonomyId,
      serviceName: item.name,
      icon: item.icon || '🔧',
      type: item.type // 'category', 'subcategory', or 'service'
    }));
  } catch (error) {
    console.error('Error getting suggested services:', error);
    return [];
  }
};

/**
 * Build search payload for backend
 * 
 * @param {object} params
 * @returns {object} - Backend-ready search payload
 */
export const buildSearchPayload = ({
  serviceId,
  query,
  location,
  budget,
  filters = {},
  sort = 'relevance',
  page = 1,
  limit = 20
}) => {
  return {
    serviceId,
    query,
    location: {
      city: location?.city || null,
      area: location?.area || null,
      latitude: location?.latitude || null,
      longitude: location?.longitude || null,
      radius: location?.radius || 10
    },
    budget: budget ? {
      min: budget.min || 0,
      max: budget.max || null
    } : null,
    filters: Object.entries(filters).reduce((acc, [key, value]) => {
      // Only include non-empty filter values
      if (value && (Array.isArray(value) ? value.length > 0 : true)) {
        acc[key] = value;
      }
      return acc;
    }, {}),
    sort,
    page,
    limit
  };
};

/**
 * Validate filter values
 * 
 * @param {object} filterValues
 * @param {object} filterSchema
 * @returns {object} - { valid: boolean, errors: [] }
 */
export const validateFilters = (filterValues, filterSchema) => {
  const errors = [];
  
  if (!filterSchema || !Array.isArray(filterSchema)) {
    return { valid: true, errors: [] };
  }
  
  filterSchema.forEach(filter => {
    const value = filterValues[filter.id];
    
    // Check required filters
    if (filter.required && (!value || (Array.isArray(value) && value.length === 0))) {
      errors.push({
        filterId: filter.id,
        message: `${filter.label} is required`
      });
    }
    
    // Validate range filters
    if (filter.type === 'range' && value) {
      if (value < filter.min || value > filter.max) {
        errors.push({
          filterId: filter.id,
          message: `${filter.label} must be between ${filter.min} and ${filter.max}`
        });
      }
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Merge common filters with service-specific filters
 * This is now simplified since taxonomy doesn't have complex filter configs
 * 
 * @param {string} serviceId
 * @param {object} commonFilters
 * @returns {object} - Merged filter configuration
 */
export const getMergedFilters = async (serviceId, commonFilters) => {
  const serviceConfig = await getServiceConfig(serviceId);
  
  if (!serviceConfig) {
    return {
      common: commonFilters,
      specific: [],
      budgetRange: null
    };
  }
  
  return {
    common: commonFilters,
    specific: [],
    budgetRange: null,
    defaultSort: 'relevance',
    priorityFilters: []
  };
};

export default {
  detectServiceFromQuery,
  getServiceConfig,
  getAllServices,
  getMergedFilters,
  buildSearchPayload,
  validateFilters,
  getSuggestedServices
};
