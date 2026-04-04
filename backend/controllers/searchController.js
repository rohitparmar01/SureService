const Vendor = require('../models/VendorNew');
const Service = require('../models/Service');
const { 
  normalizeSearchQuery, 
  buildVendorQuery, 
  getSearchSuggestions 
} = require('../services/searchNormalizationService');
const { 
  generateFiltersFromResults 
} = require('../services/filterService');
const { 
  searchVendors: unifiedSearch 
} = require('../services/unifiedSearchService');

exports.searchVendors = async (req, res, next) => {
  try {
    // Return ALL vendors without complex sorting - frontend handles all algorithm
    const { limit = 500, page = 1 } = req.body;

    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 500, 1000); // Max 1000
    const skip = (pageNum - 1) * limitNum;

    const vendors = await Vendor.find({ isActive: true })
      .skip(skip)
      .limit(limitNum)
      .select('name businessName email phone city area serviceType description pricing rating verified subscription completedBookings totalBookings searchKeywords profileImage coverImage')
      .lean();

    // Requested fallback priority:
    // premium > growth > starter > free(verified) > free
    const getPlanPriority = (vendor) => {
      const planKey = String(vendor?.subscription?.planKey || 'free').toLowerCase();
      const isVerified = Boolean(vendor?.verified);

      if (planKey === 'premium') return 4;
      if (planKey === 'growth') return 3;
      if (planKey === 'starter') return 2;

      // Treat all remaining/legacy/unknown plans as free-tier buckets.
      return isVerified ? 1 : 0;
    };

    // Sort ONLY by plan tier - frontend will handle all search matching logic
    const sortedVendors = vendors.sort((a, b) => {
      const aTier = getPlanPriority(a);
      const bTier = getPlanPriority(b);

      // Only sort by plan tier - nothing else
      return bTier - aTier;
    });

    const total = await Vendor.countDocuments({ isActive: true });

    res.json({
      success: true,
      results: sortedVendors,
      data: sortedVendors,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    console.error('❌ Search error:', error);
    next(error);
  }
};

// Get intelligent search suggestions based on taxonomy
exports.getSearchSuggestions = async (req, res, next) => {
  try {
    const { q, limit = 12 } = req.query;
    
    // Return empty array for very short queries
    if (!q || q.trim().length < 1) {
      return res.json({
        success: true,
        data: []
      });
    }

    const suggestions = await getSearchSuggestions(q.trim(), parseInt(limit));
    
    res.json({
      success: true,
      query: q,
      count: suggestions.length,
      data: suggestions
    });
  } catch (error) {
    console.error('Search suggestions error:', error);
    next(error);
  }
};


exports.getVendorById = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    
    const vendor = await Vendor.findOne({ 
      vendorId,
      isActive: true 
    }).select('-verificationDocuments');
    
    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'VENDOR_NOT_FOUND',
          message: 'Vendor not found',
          details: { vendorId }
        }
      });
    }
    
    res.json({
      success: true,
      data: vendor
    });
  } catch (error) {
    next(error);
  }
};

exports.getFeaturedVendors = async (req, res, next) => {
  try {
    const { serviceType, city, limit = 10 } = req.query;
    
    let query = { isActive: true, isFeatured: true };
    
    if (serviceType) {
      query.serviceType = serviceType.toLowerCase();
    }
    
    if (city) {
      query.city = new RegExp(city, 'i');
    }
    
    const vendors = await Vendor.find(query)
      .sort({ rating: -1, reviewCount: -1 })
      .limit(parseInt(limit))
      .select('-reviews -verificationDocuments');
    
    res.json({
      success: true,
      count: vendors.length,
      data: vendors.map(v => v.toSearchResult())
    });
  } catch (error) {
    next(error);
  }
};

exports.getVendorsByService = async (req, res, next) => {
  try {
    const { serviceType } = req.params;
    const { city, page = 1, limit = 20 } = req.query;
    
    let query = { 
      serviceType: serviceType.toLowerCase(),
      isActive: true 
    };
    
    if (city) {
      query.city = new RegExp(city, 'i');
    }
    
    const skip = (page - 1) * limit;
    
    const vendors = await Vendor.find(query)
      .sort({ rating: -1, reviewCount: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-reviews -verificationDocuments');
    
    const total = await Vendor.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
        results: vendors.map(v => v.toSearchResult())
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get ALL active vendors without any filtering
 * Used by frontend for client-side search and filtering
 */
exports.getAllVendors = async (req, res, next) => {
  try {
    // Handle both GET query params and POST body
    const params = req.method === 'GET' ? req.query : req.body;
    const { limit = 500, page = 1, city } = params;

    // Simple query - only filter by active status
    const query = { isActive: true };

    if (city) {
      query.city = new RegExp(city, 'i');
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 500, 1000); // Max 1000
    const skip = (pageNum - 1) * limitNum;

    // Fetch vendors - sort only by plan tier
    const vendors = await Vendor.find(query)
      .skip(skip)
      .limit(limitNum)
      .select('name businessName email phone city area serviceType description pricing rating verified subscription completedBookings totalBookings searchKeywords profileImage coverImage')
      .lean();

    // Plan tier mapping for sorting
    const planTierMap = {
      'premium': 4,
      'growth': 3,
      'starter': 2,
      'free': 1
    };

    // Sort ONLY by plan tier - frontend handles all search matching
    const sortedVendors = vendors.sort((a, b) => {
      const aPlanKey = String(a.subscription?.planKey || 'free').toLowerCase();
      const bPlanKey = String(b.subscription?.planKey || 'free').toLowerCase();

      const aTier = planTierMap[aPlanKey] || 0;
      const bTier = planTierMap[bPlanKey] || 0;

      // Only sort by plan tier
      return bTier - aTier;
    });

    const total = await Vendor.countDocuments(query);

    res.json({
      success: true,
      results: sortedVendors,
      data: sortedVendors,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    console.error('❌ Error fetching all vendors:', error);
    next(error);
  }
};

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return parseFloat(distance.toFixed(2));
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}
