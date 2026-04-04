const City = require('../models/City');
const Area = require('../models/Area');

/**
 * Location Controller
 * Handles city and area location queries for vendor registration and search
 */

/**
 * @route   GET /api/locations/cities/search
 * @desc    Search cities by name
 * @access  Public
 * @query   q - search term, limit - max results (default 20)
 */
exports.searchCities = async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search term must be at least 2 characters'
      });
    }
    
    const cities = await City.searchByName(q, parseInt(limit));
    
    res.json({
      success: true,
      count: cities.length,
      data: cities.map(city => ({
        id: city._id,
        osm_id: city.osm_id,
        name: city.name,
        state: city.state,
        placeType: city.placeType,
        lat: city.lat,
        lon: city.lon,
        areaCount: city.areaCount
      }))
    });
    
  } catch (error) {
    console.error('Error searching cities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search cities',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/locations/cities/nearby
 * @desc    Find cities near coordinates
 * @access  Public
 * @query   lat, lon, radius (in meters, default 50000)
 */
exports.getNearbyCities = async (req, res) => {
  try {
    const { lat, lon, radius = 50000 } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }
    
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    const maxDistance = parseInt(radius);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates'
      });
    }
    
    const cities = await City.findNearby(longitude, latitude, maxDistance);
    
    res.json({
      success: true,
      count: cities.length,
      data: cities.map(city => ({
        id: city._id,
        name: city.name,
        state: city.state,
        lat: city.lat,
        lon: city.lon,
        distance: city.distance, // If calculated
        areaCount: city.areaCount
      }))
    });
    
  } catch (error) {
    console.error('Error finding nearby cities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find nearby cities',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/locations/cities/:cityId
 * @desc    Get city details by ID
 * @access  Public
 */
exports.getCityById = async (req, res) => {
  try {
    const { cityId } = req.params;
    
    const city = await City.findById(cityId);
    
    if (!city) {
      return res.status(404).json({
        success: false,
        message: 'City not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        id: city._id,
        osm_id: city.osm_id,
        name: city.name,
        state: city.state,
        placeType: city.placeType,
        lat: city.lat,
        lon: city.lon,
        population: city.population,
        areaCount: city.areaCount,
        coordinates: city.location.coordinates
      }
    });
    
  } catch (error) {
    console.error('Error getting city:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get city details',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/locations/cities/:cityId/areas
 * @desc    Get all areas for a specific city
 * @access  Public
 * @query   limit - max results, offset - pagination
 */
exports.getAreasByCity = async (req, res) => {
  try {
    const { cityId } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    
    // Verify city exists
    const city = await City.findById(cityId);
    if (!city) {
      return res.status(404).json({
        success: false,
        message: 'City not found'
      });
    }
    
    // Get areas
    const areas = await Area.find({ city_id: cityId })
      .sort({ name: 1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));
    
    const total = await Area.countDocuments({ city_id: cityId });
    
    res.json({
      success: true,
      count: areas.length,
      total,
      city: {
        id: city._id,
        name: city.name
      },
      data: areas.map(area => ({
        id: area._id,
        osm_id: area.osm_id,
        name: area.name,
        placeType: area.placeType,
        lat: area.lat,
        lon: area.lon
      }))
    });
    
  } catch (error) {
    console.error('Error getting areas:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get areas',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/locations/areas/search
 * @desc    Search areas by name within a city
 * @access  Public
 * @query   cityId, q - search term, limit
 */
exports.searchAreas = async (req, res) => {
  try {
    const { cityId, q, limit = 20 } = req.query;
    
    if (!cityId) {
      return res.status(400).json({
        success: false,
        message: 'City ID is required'
      });
    }
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search term must be at least 2 characters'
      });
    }
    
    const areas = await Area.searchByCityAndName(cityId, q, parseInt(limit));
    
    res.json({
      success: true,
      count: areas.length,
      data: areas.map(area => ({
        id: area._id,
        osm_id: area.osm_id,
        name: area.name,
        cityName: area.cityName,
        placeType: area.placeType,
        lat: area.lat,
        lon: area.lon
      }))
    });
    
  } catch (error) {
    console.error('Error searching areas:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search areas',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/locations/areas/nearby
 * @desc    Find areas near coordinates
 * @access  Public
 * @query   lat, lon, radius (in meters, default 25000)
 */
exports.getNearbyAreas = async (req, res) => {
  try {
    const { lat, lon, radius = 25000 } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }
    
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    const maxDistance = parseInt(radius);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates'
      });
    }
    
    const areas = await Area.findNearby(longitude, latitude, maxDistance);
    
    res.json({
      success: true,
      count: areas.length,
      data: areas.map(area => ({
        id: area._id,
        name: area.name,
        cityName: area.cityName,
        lat: area.lat,
        lon: area.lon,
        placeType: area.placeType
      }))
    });
    
  } catch (error) {
    console.error('Error finding nearby areas:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find nearby areas',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/locations/stats
 * @desc    Get location database statistics
 * @access  Public
 */
exports.getLocationStats = async (req, res) => {
  try {
    const totalCities = await City.countDocuments({});
    const totalAreas = await Area.countDocuments({});
    const citiesWithAreas = await City.countDocuments({ areasFetched: true });
    const topCities = await City.find({ areasFetched: true })
      .sort({ areaCount: -1 })
      .limit(10)
      .select('name state areaCount');
    
    res.json({
      success: true,
      data: {
        totalCities,
        totalAreas,
        citiesWithAreas,
        citiesWithoutAreas: totalCities - citiesWithAreas,
        averageAreasPerCity: totalCities > 0 ? Math.round(totalAreas / totalCities) : 0,
        topCitiesByAreas: topCities.map(city => ({
          name: city.name,
          state: city.state,
          areaCount: city.areaCount
        }))
      }
    });
    
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/locations/cities/osm/:osmId/areas
 * @desc    Get all areas for a city by OSM ID
 * @access  Public
 */
exports.getAreasByOsmId = async (req, res) => {
  try {
    const { osmId } = req.params;
    
    const areas = await Area.getByCityOsmId(osmId);
    
    res.json({
      success: true,
      count: areas.length,
      data: areas
    });
    
  } catch (error) {
    console.error('Error getting areas by OSM ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get areas',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/locations/cities/name/:cityName/areas
 * @desc    Get all areas for a city by NAME (for frontend dropdown)
 * @access  Public
 * @example /api/locations/cities/name/Delhi/areas
 */
exports.getAreasByCityName = async (req, res) => {
  try {
    const { cityName } = req.params;
    const { limit = 200 } = req.query; // Default 200 areas
    
    // Find city by name (case-insensitive)
    const city = await City.findOne({ 
      name: new RegExp(`^${cityName}$`, 'i')
    });
    
    if (!city) {
      return res.status(404).json({
        success: false,
        message: `City "${cityName}" not found`
      });
    }
    
    // Get areas for this city
    const areas = await Area.find({ city_id: city._id })
      .sort({ name: 1 })
      .limit(parseInt(limit))
      .select('_id name normalizedName placeType lat lon location vendorCount');
    
    const total = await Area.countDocuments({ city_id: city._id });
    
    res.json({
      success: true,
      count: areas.length,
      total,
      city: {
        id: city._id,
        name: city.name,
        state: city.state,
        lat: city.lat,
        lon: city.lon
      },
      data: areas.map(area => ({
        id: area._id,
        name: area.name,
        placeType: area.placeType,
        lat: area.lat,
        lon: area.lon,
        coordinates: area.location.coordinates,
        vendorCount: area.vendorCount || 0
      }))
    });
    
  } catch (error) {
    console.error('Error getting areas by city name:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get areas',
      error: error.message
    });
  }
};

module.exports = exports;
