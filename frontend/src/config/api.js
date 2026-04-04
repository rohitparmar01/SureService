/**
 * API Configuration
 * Centralized configuration for all API requests
 * Uses environment variables with fallback for development
 */

// Get API base URL from environment variable
// In production, set VITE_API_URL in your hosting platform's environment variables
// Accepts URL with or without /api suffix, normalizes to always include it
const stripQuotes = (value = '') => value.trim().replace(/^['\"]|['\"]$/g, '');

const normalizeApiBase = (value) => {
  const trimmed = stripQuotes(value || '');
  if (!trimmed) return '';
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

const getRuntimeOriginApi = () => {
  if (typeof window === 'undefined') return '';
  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  if (isLocalhost) return '';
  return `${window.location.origin}/api`;
};

const configuredApiUrl = stripQuotes(import.meta.env.VITE_API_URL || '');
const API_BASE_URL = !configuredApiUrl
  ? (getRuntimeOriginApi() || 'http://localhost:5000/api')
  : normalizeApiBase(configuredApiUrl);

// Export configured API URL
export const getApiUrl = (endpoint = '') => {
  // Remove leading slash from endpoint if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  // API_BASE_URL already includes /api, so just append endpoint
  return cleanEndpoint ? `${API_BASE_URL}/${cleanEndpoint}` : API_BASE_URL;
};

// Export base URL for legacy code
export { API_BASE_URL };
export default API_BASE_URL;
