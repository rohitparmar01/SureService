import axios from 'axios';
import { getAllServices } from './taxonomyService';
import { getApiUrl } from '../config/api';

const API_BASE_URL = getApiUrl();

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const CACHE_TTL = 5 * 60 * 1000;
const responseCache = new Map();
const inFlight = new Map();

const getCached = (key) => {
  const item = responseCache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_TTL) {
    responseCache.delete(key);
    return null;
  }
  return item.data;
};

const setCached = (key, data) => {
  responseCache.set(key, { data, timestamp: Date.now() });
  if (responseCache.size > 150) {
    const firstKey = responseCache.keys().next().value;
    responseCache.delete(firstKey);
  }
};

const fetchWithCache = async (cacheKey, requestFactory) => {
  const cached = getCached(cacheKey);
  if (cached !== null) return cached;

  if (inFlight.has(cacheKey)) {
    return inFlight.get(cacheKey);
  }

  const request = requestFactory()
    .then((data) => {
      setCached(cacheKey, data);
      return data;
    })
    .finally(() => {
      inFlight.delete(cacheKey);
    });

  inFlight.set(cacheKey, request);
  return request;
};

export const fetchServiceTypes = async () => {
  try {
    return await fetchWithCache('service-types', async () => {
      const services = await getAllServices();
      return services.map(service => ({
        value: service.taxonomyId,
        label: service.name,
        icon: service.icon || '🔧',
        keywords: service.keywords || []
      }));
    });
  } catch (error) {
    console.error('Error fetching service types:', error);
    return [];
  }
};

export const fetchCities = async () => {
  try {
    return await fetchWithCache('cities', async () => {
      const response = await apiClient.get('/dynamic/cities');
      return response.data?.data || [];
    });
  } catch (error) {
    console.error('❌ Error fetching cities:', error.message, error.response?.data);
    return [];
  }
};

export const fetchAreas = async (city) => {
  try {
    if (!city) return [];
    const cacheKey = `areas:${city.toLowerCase()}`;
    return await fetchWithCache(cacheKey, async () => {
      const response = await apiClient.get('/dynamic/areas', { params: { city } });
      return response.data?.data || [];
    });
  } catch (error) {
    console.error('Error fetching areas:', error);
    return [];
  }
};

export const fetchPriceRanges = async (serviceType = null, city = null) => {
  try {
    const params = {};
    if (serviceType) params.serviceType = serviceType;
    if (city) params.city = city;

    const cacheKey = `price-ranges:${serviceType || ''}:${city || ''}`;
    return await fetchWithCache(cacheKey, async () => {
      const response = await apiClient.get('/dynamic/price-ranges', { params });
      return response.data?.data || { min: 0, max: 10000000, presets: [] };
    });
  } catch (error) {
    console.error('Error fetching price ranges:', error);
    return {
      min: 0,
      max: 10000000,
      presets: [
        { label: 'Under ₹1 Lakh', min: 0, max: 100000 },
        { label: '₹1L - ₹3L', min: 100000, max: 300000 },
        { label: '₹3L - ₹5L', min: 300000, max: 500000 },
        { label: '₹5L - ₹10L', min: 500000, max: 1000000 },
        { label: 'Above ₹10L', min: 1000000, max: 10000000 }
      ]
    };
  }
};

export const fetchSearchSuggestions = async (query, limit = 10) => {
  try {
    if (!query || query.length < 2) return [];

    const normalizedQuery = query.trim().toLowerCase();
    const cacheKey = `search-suggestions:${normalizedQuery}:${limit}`;
    return await fetchWithCache(cacheKey, async () => {
      const response = await apiClient.get('/search/suggestions', {
        params: { q: query, limit }
      });

      return response.data || [];
    });
  } catch (error) {
    console.error('Error fetching search suggestions:', error);
    return [];
  }
};

export const fetchFilterStats = async (city = null, serviceType = null) => {
  try {
    const params = {};
    if (city) params.city = city;
    if (serviceType) params.serviceType = serviceType;

    const cacheKey = `filter-stats:${city || ''}:${serviceType || ''}`;
    return await fetchWithCache(cacheKey, async () => {
      const response = await apiClient.get('/dynamic/filter-stats', { params });
      return response.data?.data || { verifiedCount: 0, ratingBreakdown: {}, totalCount: 0 };
    });
  } catch (error) {
    console.error('Error fetching filter stats:', error);
    return { verified: 0, total: 0, ratingBreakdown: {} };
  }
};

export default {
  fetchServiceTypes,
  fetchCities,
  fetchAreas,
  fetchPriceRanges,
  fetchSearchSuggestions,
  fetchFilterStats
};
