const ServiceKeywords = require('../models/ServiceKeywords');

/**
 * Get all service keyword patterns
 * GET /api/admin/keywords
 */
exports.getAllKeywords = async (req, res, next) => {
  try {
    const keywords = await ServiceKeywords.find().sort({ priority: -1, servicePattern: 1 });
    
    res.json({
      success: true,
      data: {
        total: keywords.length,
        keywords
      }
    });
  } catch (error) {
    console.error('Error fetching keywords:', error);
    next(error);
  }
};

/**
 * Get keywords for a specific service
 * GET /api/admin/keywords/:servicePattern
 */
exports.getKeywordsByService = async (req, res, next) => {
  try {
    const { servicePattern } = req.params;
    
    const keywordDoc = await ServiceKeywords.findOne({ 
      servicePattern: servicePattern.toLowerCase() 
    });
    
    if (!keywordDoc) {
      return res.json({
        success: true,
        data: { keywords: [], servicePattern },
        message: `No keywords configured for: ${servicePattern}. Add via admin panel.`
      });
    }
    
    res.json({
      success: true,
      data: keywordDoc
    });
  } catch (error) {
    console.error('Error fetching keywords:', error);
    next(error);
  }
};

/**
 * Add or update keyword pattern
 * POST /api/admin/keywords
 * Body: { servicePattern, keywords, description, priority }
 */
exports.addOrUpdateKeywords = async (req, res, next) => {
  try {
    const { servicePattern, keywords, description, priority } = req.body;
    
    if (!servicePattern || !keywords || !Array.isArray(keywords)) {
      return res.status(400).json({
        success: false,
        message: 'servicePattern and keywords (array) are required'
      });
    }
    
    const result = await ServiceKeywords.addOrUpdatePattern(
      servicePattern,
      keywords,
      description || '',
      priority || 0
    );
    
    res.json({
      success: true,
      message: 'Keywords updated successfully',
      data: result
    });
  } catch (error) {
    console.error('Error updating keywords:', error);
    next(error);
  }
};

/**
 * Delete keyword pattern
 * DELETE /api/admin/keywords/:id
 */
exports.deleteKeywords = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const deleted = await ServiceKeywords.findByIdAndDelete(id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Keyword pattern not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Keywords deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting keywords:', error);
    next(error);
  }
};

/**
 * Get keyword suggestions for a service type
 * POST /api/admin/keywords/suggest
 * Body: { serviceType }
 */
exports.getKeywordSuggestions = async (req, res, next) => {
  try {
    const { serviceType } = req.body;
    
    if (!serviceType) {
      return res.status(400).json({
        success: false,
        message: 'serviceType is required'
      });
    }
    
    const keywords = await ServiceKeywords.getKeywordsForService(serviceType) || [];
    
    res.json({
      success: true,
      data: {
        serviceType,
        keywords,
        count: keywords.length
      }
    });
  } catch (error) {
    console.error('Error getting keyword suggestions:', error);
    next(error);
  }
};

/**
 * Regenerate keywords for all vendors
 * POST /api/admin/keywords/regenerate
 */
exports.regenerateAllVendorKeywords = async (req, res, next) => {
  try {
    const Vendor = require('../models/VendorNew');

    const vendors = await Vendor.find({ isActive: true });

    let updated = 0;
    let failed = 0;

    for (const vendor of vendors) {
      try {
        // Trigger the pre-save hook by saving
        await vendor.save();
        updated++;
      } catch (error) {
        console.error(`Failed to update ${vendor.name}:`, error.message);
        failed++;
      }
    }

    res.json({
      success: true,
      message: 'Vendor keywords regenerated',
      data: {
        total: vendors.length,
        updated,
        failed
      }
    });
  } catch (error) {
    console.error('Error regenerating keywords:', error);
    next(error);
  }
};

