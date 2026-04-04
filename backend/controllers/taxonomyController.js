/**
 * TAXONOMY CONTROLLER
 * 
 * Read-only APIs for master taxonomy
 * All data comes from database - no hardcoded fallbacks
 */

const Taxonomy = require('../models/Taxonomy');

/**
 * GET /api/taxonomy/categories
 * Get all active categories
 */
exports.getCategories = async (req, res) => {
  try {
    const categories = await Taxonomy.getCategories();
    
    res.json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
};

/**
 * GET /api/taxonomy/subcategories?categoryId=xxx
 * Get subcategories for a category
 */
exports.getSubcategories = async (req, res) => {
  try {
    const { categoryId } = req.query;
    
    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: 'categoryId query parameter is required'
      });
    }
    
    const subcategories = await Taxonomy.getSubcategories(categoryId);
    
    res.json({
      success: true,
      count: subcategories.length,
      data: subcategories
    });
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subcategories',
      error: error.message
    });
  }
};

/**
 * GET /api/taxonomy/services?subcategoryId=xxx
 * Get services for a subcategory
 */
exports.getServices = async (req, res) => {
  try {
    const { subcategoryId } = req.query;
    
    if (!subcategoryId) {
      return res.status(400).json({
        success: false,
        message: 'subcategoryId query parameter is required'
      });
    }
    
    const services = await Taxonomy.getServices(subcategoryId);
    
    res.json({
      success: true,
      count: services.length,
      data: services
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services',
      error: error.message
    });
  }
};

/**
 * GET /api/taxonomy/services/all
 * Get all active services (flat list)
 */
exports.getAllServices = async (req, res) => {
  try {
    const services = await Taxonomy.getAllServices();
    
    res.json({
      success: true,
      count: services.length,
      data: services
    });
  } catch (error) {
    console.error('Error fetching all services:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services',
      error: error.message
    });
  }
};

/**
 * GET /api/taxonomy/search?q=keyword
 * Search taxonomy by keyword
 */
exports.searchTaxonomy = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.json({
        success: true,
        count: 0,
        data: []
      });
    }
    
    const results = await Taxonomy.searchByKeyword(q);
    
    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    console.error('Error searching taxonomy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search taxonomy',
      error: error.message
    });
  }
};

/**
 * GET /api/taxonomy/hierarchy
 * Get full taxonomy hierarchy (categories -> subcategories -> services)
 */
exports.getHierarchy = async (req, res) => {
  try {
    const hierarchy = await Taxonomy.getHierarchy();
    
    res.json({
      success: true,
      data: hierarchy
    });
  } catch (error) {
    console.error('Error fetching taxonomy hierarchy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch taxonomy hierarchy',
      error: error.message
    });
  }
};

/**
 * GET /api/taxonomy/:taxonomyId
 * Get single taxonomy item by ID
 */
exports.getTaxonomyById = async (req, res) => {
  try {
    const { taxonomyId } = req.params;
    
    const item = await Taxonomy.findOne({ 
      taxonomyId, 
      isActive: true 
    });
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Taxonomy item not found'
      });
    }
    
    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Error fetching taxonomy item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch taxonomy item',
      error: error.message
    });
  }
};

module.exports = exports;
