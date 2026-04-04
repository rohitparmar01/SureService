/**
 * AUTOCOMPLETE SERVICE
 * 
 * Handles API communication for live search autocomplete
 * Features:
 * - Request cancellation (AbortController)
 * - In-memory caching (5 min TTL)
 * - Error handling
 * - Response normalization
 */

import axios from 'axios';
import { getApiUrl } from '../config/api';

const API_BASE_URL = getApiUrl();

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map();

/**
 * Get cached result if valid
 */
const getCached = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
};

/**
 * Set cache entry
 */
const setCache = (key, data) => {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });

  // Limit cache size to 100 entries
  if (cache.size > 100) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
};

/**
 * Fetch autocomplete suggestions from backend
 * 
 * @param {string} query - Search query
 * @param {number} limit - Max suggestions (default: 12)
 * @param {AbortSignal} signal - Abort signal for cancellation
 * @returns {Promise<Array>} Autocomplete suggestions
 */
export const fetchAutocomplete = async (query, limit = 12, signal = null) => {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const trimmedQuery = query.trim();
  const cacheKey = `autocomplete:${trimmedQuery.toLowerCase()}:${limit}`;

  // Check cache first
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/search/suggestions`, {
      params: {
        q: trimmedQuery,
        limit
      },
      signal,
      timeout: 5000 // 5 second timeout
    });

    const suggestions = response.data?.data || [];

    // Normalize response format
    const normalized = suggestions.map(item => ({
      type: item.type || 'service',
      id: item.id || item.taxonomyId,
      taxonomyId: item.taxonomyId || item.id,
      label: item.label || item.name,
      icon: item.icon || '🔧',
      score: item.score || 0,
      matchedKeyword: item.matchedKeyword || null,
      parentId: item.parentId || null
    }));

    // Cache successful response
    setCache(cacheKey, normalized);

    return normalized;
  } catch (error) {
    // Don't throw on abort - just return empty
    if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
      return [];
    }

    console.error('Autocomplete fetch error:', error);
    throw new Error('Failed to fetch suggestions');
  }
};

/**
 * Clear autocomplete cache
 * Useful when taxonomy data changes
 */
export const clearAutocompleteCache = () => {
  cache.clear();
};

/**
 * Get cache statistics (for debugging)
 */
export const getCacheStats = () => {
  return {
    size: cache.size,
    entries: Array.from(cache.keys())
  };
};

export default {
  fetchAutocomplete,
  clearAutocompleteCache,
  getCacheStats
};
