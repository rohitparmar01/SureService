/**
 * TAXONOMY ROUTES
 * 
 * Read-only routes for master taxonomy system
 * All endpoints are public (no auth required for reading)
 */

const express = require('express');
const router = express.Router();
const taxonomyController = require('../controllers/taxonomyController');

// Get all categories
router.get('/categories', taxonomyController.getCategories);

// Get subcategories for a category
router.get('/subcategories', taxonomyController.getSubcategories);

// Get services for a subcategory
router.get('/services', taxonomyController.getServices);

// Get all services (flat list)
router.get('/services/all', taxonomyController.getAllServices);

// Search taxonomy by keyword
router.get('/search', taxonomyController.searchTaxonomy);

// Get full hierarchy
router.get('/hierarchy', taxonomyController.getHierarchy);

// Get single taxonomy item by ID
router.get('/:taxonomyId', taxonomyController.getTaxonomyById);

module.exports = router;
