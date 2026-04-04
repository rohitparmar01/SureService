/**
 * CLIENT-SIDE FILTER APPLICATION
 * 
 * Applies filters to already-fetched vendor results in-memory.
 * NO new API calls - filters work only on current result set.
 * 
 * This is the frontend counterpart to backend/services/filterService.js
 */

/**
 * Apply multiple filters to vendor results
 * @param {Array} vendors - Array of vendor objects to filter
 * @param {Object} activeFilters - Active filter selections from UI
 * @returns {Array} Filtered vendor array
 */
export const applyFiltersToVendors = (vendors, activeFilters) => {
  if (!vendors || vendors.length === 0) return [];
  if (!activeFilters || Object.keys(activeFilters).length === 0) return vendors;

  return vendors.filter(vendor => {
    // Service filter (array of taxonomyIds)
    if (activeFilters.services && activeFilters.services.length > 0) {
      if (!vendor.servicesOffered || vendor.servicesOffered.length === 0) return false;
      
      const vendorServiceIds = vendor.servicesOffered.map(s => s.taxonomyId || s);
      const hasMatchingService = activeFilters.services.some(filterId => 
        vendorServiceIds.includes(filterId)
      );
      
      if (!hasMatchingService) return false;
    }

    // Budget filter
    if (activeFilters.budget) {
      const { min, max } = activeFilters.budget;
      const vendorPrice = vendor.pricingInfo?.basePrice || 0;
      
      if (min !== undefined && vendorPrice < min) return false;
      if (max !== undefined && vendorPrice > max) return false;
    }

    // City filter (array)
    if (activeFilters.cities && activeFilters.cities.length > 0) {
      const vendorCity = vendor.location?.city || vendor.address?.city;
      if (!vendorCity || !activeFilters.cities.includes(vendorCity)) return false;
    }

    // Area filter (array)
    if (activeFilters.areas && activeFilters.areas.length > 0) {
      const vendorArea = vendor.location?.area || vendor.address?.area;
      if (!vendorArea || !activeFilters.areas.includes(vendorArea)) return false;
    }

    // Rating filter (minimum rating)
    if (activeFilters.rating !== undefined && activeFilters.rating > 0) {
      const vendorRating = vendor.rating || 0;
      if (vendorRating < activeFilters.rating) return false;
    }

    // Verified filter (boolean)
    if (activeFilters.verified !== undefined) {
      if (vendor.isVerified !== activeFilters.verified) return false;
    }

    // Experience filter (minimum years)
    if (activeFilters.experience !== undefined && activeFilters.experience > 0) {
      const vendorExp = vendor.yearsOfExperience || 0;
      if (vendorExp < activeFilters.experience) return false;
    }

    // All filters passed
    return true;
  });
};

/**
 * Count how many vendors match each filter option
 * Used to show counts next to each filter (e.g., "Mumbai (12)")
 * 
 * @param {Array} vendors - Current vendor results
 * @param {Object} availableFilters - Filter metadata from API
 * @param {Object} activeFilters - Currently active filters
 * @returns {Object} Filter options with counts
 */
export const calculateFilterCounts = (vendors, availableFilters, activeFilters = {}) => {
  if (!vendors || !availableFilters) return availableFilters;

  const countsById = {};

  // For each filter group
  Object.keys(availableFilters).forEach(filterGroup => {
    const filterOptions = availableFilters[filterGroup];
    
    if (Array.isArray(filterOptions)) {
      // Service/City/Area filters (array of objects with id/value)
      filterOptions.forEach(option => {
        // Create temporary filter with just this option
        const testFilter = {
          ...activeFilters,
          [filterGroup]: [option.value || option.id]
        };
        
        // Count how many vendors match
        const matchCount = applyFiltersToVendors(vendors, testFilter).length;
        
        const optionKey = `${filterGroup}_${option.value || option.id}`;
        countsById[optionKey] = matchCount;
      });
    } else if (filterGroup === 'budget' && filterOptions.ranges) {
      // Budget ranges
      filterOptions.ranges.forEach((range, index) => {
        const testFilter = {
          ...activeFilters,
          budget: { min: range.min, max: range.max }
        };
        
        const matchCount = applyFiltersToVendors(vendors, testFilter).length;
        countsById[`budget_${index}`] = matchCount;
      });
    } else if (filterGroup === 'rating' && Array.isArray(filterOptions)) {
      // Rating options
      filterOptions.forEach(ratingOption => {
        const testFilter = {
          ...activeFilters,
          rating: ratingOption.value
        };
        
        const matchCount = applyFiltersToVendors(vendors, testFilter).length;
        countsById[`rating_${ratingOption.value}`] = matchCount;
      });
    }
  });

  return countsById;
};

/**
 * Get active filter count for badge display
 * @param {Object} activeFilters - Current active filters
 * @returns {Number} Total number of active filters
 */
export const getActiveFilterCount = (activeFilters) => {
  if (!activeFilters) return 0;
  
  let count = 0;
  
  Object.keys(activeFilters).forEach(key => {
    const value = activeFilters[key];
    
    if (Array.isArray(value)) {
      count += value.length;
    } else if (typeof value === 'object' && value !== null) {
      // Budget object
      if (value.min !== undefined || value.max !== undefined) count += 1;
    } else if (value !== undefined && value !== null && value !== '') {
      count += 1;
    }
  });
  
  return count;
};

/**
 * Clear all active filters
 * @returns {Object} Empty filter object
 */
export const clearAllFilters = () => {
  return {
    services: [],
    cities: [],
    areas: [],
    budget: undefined,
    rating: undefined,
    verified: undefined,
    experience: undefined
  };
};

/**
 * Toggle a filter option (add if not present, remove if present)
 * Used for checkbox-style filters
 * 
 * @param {Object} currentFilters - Current active filters
 * @param {String} filterType - Type of filter (services, cities, areas)
 * @param {Any} value - Value to toggle
 * @returns {Object} Updated filters
 */
export const toggleFilter = (currentFilters, filterType, value) => {
  const newFilters = { ...currentFilters };
  
  if (!Array.isArray(newFilters[filterType])) {
    newFilters[filterType] = [];
  }
  
  const index = newFilters[filterType].indexOf(value);
  
  if (index > -1) {
    // Remove if present
    newFilters[filterType] = newFilters[filterType].filter(v => v !== value);
  } else {
    // Add if not present
    newFilters[filterType] = [...newFilters[filterType], value];
  }
  
  return newFilters;
};

/**
 * Set a single-value filter (rating, verified, experience)
 * @param {Object} currentFilters - Current active filters
 * @param {String} filterType - Type of filter
 * @param {Any} value - New value (or undefined to clear)
 * @returns {Object} Updated filters
 */
export const setSingleFilter = (currentFilters, filterType, value) => {
  return {
    ...currentFilters,
    [filterType]: value
  };
};

/**
 * Set budget range filter
 * @param {Object} currentFilters - Current active filters
 * @param {Number} min - Minimum budget
 * @param {Number} max - Maximum budget
 * @returns {Object} Updated filters
 */
export const setBudgetFilter = (currentFilters, min, max) => {
  return {
    ...currentFilters,
    budget: { min, max }
  };
};

/**
 * Sort filtered results
 * @param {Array} vendors - Filtered vendor array
 * @param {String} sortBy - Sort option (relevance, price-asc, price-desc, rating, experience)
 * @returns {Array} Sorted vendor array
 */
export const sortVendors = (vendors, sortBy) => {
  if (!vendors || vendors.length === 0) return vendors;
  
  const sorted = [...vendors];
  
  switch (sortBy) {
    case 'price-asc':
      return sorted.sort((a, b) => {
        const priceA = a.pricingInfo?.basePrice || Infinity;
        const priceB = b.pricingInfo?.basePrice || Infinity;
        return priceA - priceB;
      });
      
    case 'price-desc':
      return sorted.sort((a, b) => {
        const priceA = a.pricingInfo?.basePrice || 0;
        const priceB = b.pricingInfo?.basePrice || 0;
        return priceB - priceA;
      });
      
    case 'rating':
      return sorted.sort((a, b) => {
        const ratingA = a.rating || 0;
        const ratingB = b.rating || 0;
        return ratingB - ratingA;
      });
      
    case 'experience':
      return sorted.sort((a, b) => {
        const expA = a.yearsOfExperience || 0;
        const expB = b.yearsOfExperience || 0;
        return expB - expA;
      });
      
    case 'distance':
      return sorted.sort((a, b) => {
        const distA = a.distance || Infinity;
        const distB = b.distance || Infinity;
        return distA - distB;
      });
      
    case 'relevance':
    default:
      // Already sorted by relevance from API
      return sorted;
  }
};

/**
 * Helper: Check if vendor matches a specific filter (for individual filter validation)
 * @param {Object} vendor - Vendor to check
 * @param {String} filterType - Type of filter
 * @param {Any} filterValue - Value to match
 * @returns {Boolean} True if vendor matches
 */
export const vendorMatchesFilter = (vendor, filterType, filterValue) => {
  switch (filterType) {
    case 'service':
      const vendorServices = (vendor.servicesOffered || []).map(s => s.taxonomyId || s);
      return vendorServices.includes(filterValue);
      
    case 'city':
      const vendorCity = vendor.location?.city || vendor.address?.city;
      return vendorCity === filterValue;
      
    case 'area':
      const vendorArea = vendor.location?.area || vendor.address?.area;
      return vendorArea === filterValue;
      
    case 'rating':
      return (vendor.rating || 0) >= filterValue;
      
    case 'verified':
      return vendor.isVerified === filterValue;
      
    case 'experience':
      return (vendor.yearsOfExperience || 0) >= filterValue;
      
    default:
      return true;
  }
};
