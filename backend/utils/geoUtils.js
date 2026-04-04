/**
 * Geospatial Utility Functions
 */

/**
 * Calculate distance between two points using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @param {string} unit - Unit of measurement ('km' or 'miles')
 * @returns {number} Distance between points
 */
const calculateDistance = (lat1, lon1, lat2, lon2, unit = 'km') => {
  const R = unit === 'km' ? 6371 : 3959; // Earth's radius in km or miles
  
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

/**
 * Convert degrees to radians
 * @param {number} degrees - Angle in degrees
 * @returns {number} Angle in radians
 */
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Convert kilometers to meters
 * @param {number} km - Distance in kilometers
 * @returns {number} Distance in meters
 */
const kmToMeters = (km) => {
  return km * 1000;
};

/**
 * Convert meters to kilometers
 * @param {number} meters - Distance in meters
 * @returns {number} Distance in kilometers
 */
const metersToKm = (meters) => {
  return meters / 1000;
};

/**
 * Create GeoJSON Point object
 * @param {number} longitude - Longitude coordinate
 * @param {number} latitude - Latitude coordinate
 * @returns {Object} GeoJSON Point object
 */
const createGeoJSONPoint = (longitude, latitude) => {
  return {
    type: 'Point',
    coordinates: [parseFloat(longitude), parseFloat(latitude)]
  };
};

/**
 * Validate GeoJSON Point
 * @param {Object} point - GeoJSON Point object
 * @returns {boolean} True if valid GeoJSON Point
 */
const isValidGeoJSONPoint = (point) => {
  if (!point || typeof point !== 'object') return false;
  if (point.type !== 'Point') return false;
  if (!Array.isArray(point.coordinates) || point.coordinates.length !== 2) return false;
  
  const [lon, lat] = point.coordinates;
  return lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90;
};

/**
 * Get coordinates from GeoJSON Point
 * @param {Object} point - GeoJSON Point object
 * @returns {Object} Object with latitude and longitude
 */
const getCoordinates = (point) => {
  if (!isValidGeoJSONPoint(point)) {
    throw new Error('Invalid GeoJSON Point');
  }
  
  return {
    longitude: point.coordinates[0],
    latitude: point.coordinates[1]
  };
};

/**
 * Calculate bounding box for a given point and radius
 * @param {number} latitude - Center latitude
 * @param {number} longitude - Center longitude
 * @param {number} radiusKm - Radius in kilometers
 * @returns {Object} Bounding box with min/max lat/lon
 */
const getBoundingBox = (latitude, longitude, radiusKm) => {
  const latDelta = radiusKm / 111; // 1 degree latitude ≈ 111 km
  const lonDelta = radiusKm / (111 * Math.cos(toRadians(latitude)));
  
  return {
    minLat: latitude - latDelta,
    maxLat: latitude + latDelta,
    minLon: longitude - lonDelta,
    maxLon: longitude + lonDelta
  };
};

/**
 * Check if a point is within radius of another point
 * @param {Object} point1 - First GeoJSON Point
 * @param {Object} point2 - Second GeoJSON Point
 * @param {number} radiusKm - Radius in kilometers
 * @returns {boolean} True if point2 is within radius of point1
 */
const isWithinRadius = (point1, point2, radiusKm) => {
  const coords1 = getCoordinates(point1);
  const coords2 = getCoordinates(point2);
  
  const distance = calculateDistance(
    coords1.latitude,
    coords1.longitude,
    coords2.latitude,
    coords2.longitude
  );
  
  return distance <= radiusKm;
};

/**
 * Format distance for display
 * @param {number} distance - Distance in kilometers
 * @returns {string} Formatted distance string
 */
const formatDistance = (distance) => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  }
  return `${distance.toFixed(1)}km`;
};

module.exports = {
  calculateDistance,
  toRadians,
  kmToMeters,
  metersToKm,
  createGeoJSONPoint,
  isValidGeoJSONPoint,
  getCoordinates,
  getBoundingBox,
  isWithinRadius,
  formatDistance
};
