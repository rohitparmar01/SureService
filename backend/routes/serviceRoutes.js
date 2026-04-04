const express = require('express');
const router = express.Router();
const {
  getAllServices,
  getServicesByCategory,
  getServiceFilters,
  detectServiceIntent,
  getAutocompleteSuggestions,
  getCommonFilters
} = require('../controllers/serviceController');

// @route   GET /api/services
// @desc    Get all active services
// @access  Public
router.get('/', getAllServices);

// @route   GET /api/services/categories
// @desc    Get services grouped by category for frontend dropdowns
// @access  Public
// NOTE: This must come BEFORE /:serviceId route
router.get('/categories', getServicesByCategory);

// @route   GET /api/services/suggestions
// @desc    Get autocomplete suggestions
// @access  Public
// NOTE: This must come BEFORE /:serviceId route
router.get('/suggestions', getAutocompleteSuggestions);

// @route   GET /api/services/:serviceId/filters
// @desc    Get filter configuration for a service
// @access  Public
router.get('/:serviceId/filters', getServiceFilters);

// @route   POST /api/detect-service-intent
// @desc    Detect service from search query
// @access  Public
router.post('/detect-service-intent', detectServiceIntent);

// @route   GET /api/common-filters
// @desc    Get common filters (location, budget, rating)
// @access  Public
router.get('/common-filters', getCommonFilters);

module.exports = router;
