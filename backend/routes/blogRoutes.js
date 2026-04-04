const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');

/**
 * PUBLIC BLOG ROUTES
 * No authentication required
 */

/**
 * @route   GET /api/blogs
 * @desc    Get published blogs (paginated, filtered)
 * @access  Public
 * @query   page, limit, category, tag
 */
router.get('/', blogController.getPublishedBlogs);

/**
 * @route   GET /api/blogs/categories
 * @desc    Get all blog categories
 * @access  Public
 */
router.get('/categories', blogController.getBlogCategories);

/**
 * @route   GET /api/blogs/tags
 * @desc    Get all blog tags
 * @access  Public
 */
router.get('/tags', blogController.getBlogTags);

/**
 * @route   GET /api/blogs/:slug
 * @desc    Get single blog by slug
 * @access  Public
 */
router.get('/:slug', blogController.getBlogBySlug);

module.exports = router;
