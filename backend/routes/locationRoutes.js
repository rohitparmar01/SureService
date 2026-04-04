const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');

/**
 * Location Routes
 * API endpoints for cities and areas data
 */

// ============================================================================
// CITY ROUTES
// ============================================================================

/**
 * @route   GET /api/locations/cities/search
 * @desc    Search cities by name
 * @query   q - search term, limit - max results (default 20)
 * @example /api/locations/cities/search?q=Mumbai&limit=10
 */
router.get('/cities/search', locationController.searchCities);

/**
 * @route   GET /api/locations/cities/nearby
 * @desc    Find cities near coordinates
 * @query   lat, lon, radius (in meters, default 50000)
 * @example /api/locations/cities/nearby?lat=19.0760&lon=72.8777&radius=50000
 */
router.get('/cities/nearby', locationController.getNearbyCities);

/**
 * @route   GET /api/locations/cities/:cityId
 * @desc    Get city details by ID
 * @example /api/locations/cities/507f1f77bcf86cd799439011
 */
router.get('/cities/:cityId', locationController.getCityById);

/**
 * @route   GET /api/locations/cities/:cityId/areas
 * @desc    Get all areas for a specific city
 * @query   limit, offset - pagination
 * @example /api/locations/cities/507f1f77bcf86cd799439011/areas?limit=50&offset=0
 */
router.get('/cities/:cityId/areas', locationController.getAreasByCity);

/**
 * @route   GET /api/locations/cities/osm/:osmId/areas
 * @desc    Get all areas for a city by OSM ID
 * @example /api/locations/cities/osm/1953331/areas
 */
router.get('/cities/osm/:osmId/areas', locationController.getAreasByOsmId);

/**
 * @route   GET /api/locations/cities/name/:cityName/areas
 * @desc    Get all areas for a city by NAME (for frontend dropdown)
 * @query   limit - max results (default 200)
 * @example /api/locations/cities/name/Delhi/areas
 */
router.get('/cities/name/:cityName/areas', locationController.getAreasByCityName);

// ============================================================================
// AREA ROUTES
// ============================================================================

/**
 * @route   GET /api/locations/areas/search
 * @desc    Search areas by name within a city
 * @query   cityId, q - search term, limit
 * @example /api/locations/areas/search?cityId=507f1f77bcf86cd799439011&q=Bandra&limit=10
 */
router.get('/areas/search', locationController.searchAreas);

/**
 * @route   GET /api/locations/areas/nearby
 * @desc    Find areas near coordinates
 * @query   lat, lon, radius (in meters, default 25000)
 * @example /api/locations/areas/nearby?lat=19.0596&lon=72.8295&radius=10000
 */
router.get('/areas/nearby', locationController.getNearbyAreas);

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * @route   GET /api/locations/stats
 * @desc    Get location database statistics
 * @example /api/locations/stats
 */
router.get('/stats', locationController.getLocationStats);

module.exports = router;
