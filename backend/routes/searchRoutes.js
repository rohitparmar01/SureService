const express = require('express');
const router = express.Router();
const {
  getAllVendors,
  getSearchSuggestions
} = require('../controllers/searchController');

// @route   POST /api/search
// @route   GET /api/search/all
// @desc    Get ALL active vendors without any filtering
// @access  Public
router.post('/', getAllVendors);
router.get('/all', getAllVendors);

// @route   GET /api/search/suggestions?q=query
// @desc    Get search suggestions based on query
// @access  Public
router.get('/suggestions', getSearchSuggestions);

module.exports = router;
