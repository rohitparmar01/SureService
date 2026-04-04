import axios from 'axios';
import { getApiUrl } from '../config/api';

const API_BASE_URL = getApiUrl();
const CACHE_TTL = 10 * 60 * 1000;
const responseCache = new Map();
const inFlight = new Map();

const buildCacheKey = (url, params = {}) => `${url}::${JSON.stringify(params)}`;

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

  if (responseCache.size > 200) {
    const firstKey = responseCache.keys().next().value;
    responseCache.delete(firstKey);
  }
};

const cachedGet = async (url, params = {}) => {
  const key = buildCacheKey(url, params);
  const cached = getCached(key);
  if (cached !== null) {
    return cached;
  }

  if (inFlight.has(key)) {
    return inFlight.get(key);
  }

  const request = axios
    .get(url, { params })
    .then((response) => {
      const data = response.data.data || [];
      setCached(key, data);
      return data;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, request);
  return request;
};

export const getCategories = async () => {
  try {
    return await cachedGet(`${API_BASE_URL}/taxonomy/categories`);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

export const getSubcategories = async (categoryId) => {
  try {
    if (!categoryId) return [];

    return await cachedGet(`${API_BASE_URL}/taxonomy/subcategories`, { categoryId });
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    return [];
  }
};

export const getServices = async (subcategoryId) => {
  try {
    if (!subcategoryId) return [];

    return await cachedGet(`${API_BASE_URL}/taxonomy/services`, { subcategoryId });
  } catch (error) {
    console.error('Error fetching services:', error);
    return [];
  }
};

export const getAllServices = async () => {
  try {
    return await cachedGet(`${API_BASE_URL}/taxonomy/services/all`);
  } catch (error) {
    console.error('Error fetching all services:', error);
    return [];
  }
};

export const searchTaxonomy = async (keyword) => {
  try {
    if (!keyword || keyword.trim().length === 0) return [];

    return await cachedGet(`${API_BASE_URL}/taxonomy/search`, { q: keyword });
  } catch (error) {
    console.error('Error searching taxonomy:', error);
    return [];
  }
};

export const getTaxonomyHierarchy = async () => {
  try {
    return await cachedGet(`${API_BASE_URL}/taxonomy/hierarchy`);
  } catch (error) {
    console.error('Error fetching taxonomy hierarchy:', error);
    return [];
  }
};

export const getTaxonomyById = async (taxonomyId) => {
  try {
    if (!taxonomyId) return null;

    const data = await cachedGet(`${API_BASE_URL}/taxonomy/${taxonomyId}`);
    return data || null;
  } catch (error) {
    console.error('Error fetching taxonomy item:', error);
    return null;
  }
};

export const formatForDropdown = (item) => {
  return {
    value: item.taxonomyId,
    label: item.name,
    icon: item.icon || '🔧'
  };
};

export const formatArrayForDropdown = (items) => {
  return items.map(formatForDropdown);
};

export default {
  getCategories,
  getSubcategories,
  getServices,
  getAllServices,
  searchTaxonomy,
  getTaxonomyHierarchy,
  getTaxonomyById,
  formatForDropdown,
  formatArrayForDropdown
};
