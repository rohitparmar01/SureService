const express = require('express');
const router = express.Router();
const vendorBlogController = require('../controllers/vendorBlogController');

/**
 * PUBLIC VENDOR BLOG ROUTES
 * No authentication required
 */

/**
 * @route   GET /api/vendor-blogs/:slug
 * @desc    Get single vendor blog by slug (approved + published)
 * @access  Public
 */
router.get('/:slug', vendorBlogController.getVendorBlogBySlug);

module.exports = router;
