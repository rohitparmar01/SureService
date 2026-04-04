const Service = require('../models/Service');


exports.getAllServices = async (req, res, next) => {
  try {
    const services = await Service.getAllActive();
    
    res.json({
      success: true,
      count: services.length,
      data: services.map(s => ({
        serviceId: s.serviceId,
        serviceName: s.serviceName,
        icon: s.icon,
        keywords: s.keywords,
        totalVendors: s.totalVendors,
        popularityScore: s.popularityScore
      }))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/services/categories
 * Fetch services grouped by category - Single Source of Truth for frontend dropdowns
 */
exports.getServicesByCategory = async (req, res, next) => {
  try {
    const services = await Service.find({ isActive: true })
      .select('serviceId serviceName icon')
      .sort({ serviceName: 1 });

    // Category mapping - matches frontend VENDOR_SERVICES structure
    const CATEGORY_MAP = {
      'banquet-hall': 'Venues',
      'lawn-garden': 'Venues',
      'hotel-resort': 'Venues',
      'farmhouse': 'Venues',
      'party-conference-space': 'Venues',
      
      'event-planner': 'Event Planning',
      'wedding-planner': 'Event Planning',
      'corporate-event-planner': 'Event Planning',
      'birthday-private-planner': 'Event Planning',
      
      'event-decorator': 'Decor & Styling',
      'wedding-decorator': 'Decor & Styling',
      'floral-decor': 'Decor & Styling',
      'stage-mandap-decor': 'Decor & Styling',
      
      'photographer': 'Photography & Videography',
      'videographer': 'Photography & Videography',
      'it-hardware-consultant': 'IT Hardware Consultant',
      'commercial-event-photography': 'Photography & Videography',
      
      'plumbing-expert': 'Plumbing & Sanitation',
      'live-food-counter': 'Food & Catering',
      'bartender-beverage': 'Food & Catering',
      'dessert-sweet': 'Food & Catering',
      
      'dj': 'Music & Entertainment',
      'live-band-singer': 'Music & Entertainment',
      'anchor-emcee': 'Music & Entertainment',
      'performer-artist': 'Music & Entertainment',
      
      'sound-system': 'Sound, Light & Technical',
      'lighting-setup': 'Sound, Light & Technical',
      'led-screen-setup': 'Sound, Light & Technical',
      'stage-truss': 'Sound, Light & Technical',
      
      'tent-house': 'Rentals & Infrastructure',
      'furniture-rental': 'Rentals & Infrastructure',
      'ac-cooler-heater': 'Rentals & Infrastructure',
      'generator-power': 'Rentals & Infrastructure',
      
      'bridal-makeup': 'Beauty & Personal Services',
      'hair-stylist': 'Beauty & Personal Services',
      'mehndi-artist': 'Beauty & Personal Services',
      'groom-styling': 'Beauty & Personal Services',
      
      'pandit-priest': 'Religious & Ritual Services',
      'maulvi': 'Religious & Ritual Services',
      'granthi': 'Religious & Ritual Services',
      'puja-ritual': 'Religious & Ritual Services',
      
      'invitation-cards': 'Invitations, Gifts & Printing',
      'digital-invites': 'Invitations, Gifts & Printing',
      'return-gifts': 'Invitations, Gifts & Printing',
      'custom-printing': 'Invitations, Gifts & Printing',
      
      'transport': 'Logistics & Support Services',
      'valet-parking': 'Logistics & Support Services',
      'security-bouncers': 'Logistics & Support Services',
      'housekeeping-cleaning': 'Logistics & Support Services',
      
      'other-event-services': 'Others'
    };

    // Transform to frontend format (matches VENDOR_SERVICES structure)
    const servicesWithCategory = services.map(service => ({
      value: service.serviceId,
      label: service.serviceName,
      icon: service.icon,
      category: CATEGORY_MAP[service.serviceId] || 'Others'
    }));

    res.json({
      success: true,
      total: servicesWithCategory.length,
      services: servicesWithCategory
    });
  } catch (error) {
    next(error);
  }
};

exports.getServiceFilters = async (req, res, next) => {
  try {
    const { serviceId } = req.params;
    
    const service = await Service.findOne({ 
      serviceId: serviceId.toLowerCase(),
      isActive: true 
    });
    
    if (!service) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SERVICE_NOT_FOUND',
          message: 'The requested service does not exist',
          details: { serviceId }
        }
      });
    }
    
    res.json({
      success: true,
      data: service.getFilterConfig()
    });
  } catch (error) {
    next(error);
  }
};

exports.detectServiceIntent = async (req, res, next) => {
  try {
    const { query } = req.body;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUERY',
          message: 'Query must be at least 2 characters',
          details: {}
        }
      });
    }
    
    const service = await Service.detectFromQuery(query);
    
    if (!service) {
      return res.json({
        success: true,
        data: {
          serviceId: null,
          serviceName: null,
          confidence: 0,
          alternatives: []
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        serviceId: service.serviceId,
        serviceName: service.serviceName,
        icon: service.icon,
        confidence: 0.85, // Could be improved with ML
        alternatives: []
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getAutocompleteSuggestions = async (req, res, next) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUERY',
          message: 'Query must be at least 2 characters',
          details: {}
        }
      });
    }
    
    const queryLower = q.toLowerCase();
    const services = await Service.find({ isActive: true });
    
    const suggestions = services
      .map(service => {
        let score = 0;
        
        // Check keywords
        service.keywords.forEach(keyword => {
          if (keyword.toLowerCase().startsWith(queryLower)) {
            score += 100;
          } else if (keyword.toLowerCase().includes(queryLower)) {
            score += 50;
          }
        });
        
        // Check service name
        if (service.serviceName.toLowerCase().includes(queryLower)) {
          score += 75;
        }
        
        return {
          serviceId: service.serviceId,
          serviceName: service.serviceName,
          icon: service.icon,
          matchScore: score
        };
      })
      .filter(s => s.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);
    
    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    next(error);
  }
};

exports.getCommonFilters = async (req, res, next) => {
  try {
    const commonFilters = {
      location: {
        id: 'location',
        label: 'Location',
        type: 'location',
        required: true,
        fields: {
          city: {
            type: 'text',
            placeholder: 'City',
            required: true
          },
          area: {
            type: 'text',
            placeholder: 'Area (optional)'
          },
          radius: {
            type: 'select',
            options: [
              { value: '2', label: 'Within 2 km' },
              { value: '5', label: 'Within 5 km' },
              { value: '10', label: 'Within 10 km' },
              { value: '20', label: 'Within 20 km' },
              { value: '50', label: 'Within 50 km' },
              { value: 'city', label: 'Entire City' }
            ],
            default: '10'
          }
        }
      },
      rating: {
        id: 'rating',
        label: 'Minimum Rating',
        type: 'rating',
        options: [
          { value: '4.5', label: '4.5+ Stars' },
          { value: '4.0', label: '4.0+ Stars' },
          { value: '3.5', label: '3.5+ Stars' },
          { value: '3.0', label: '3.0+ Stars' }
        ]
      },
      verified: {
        id: 'verified',
        label: 'Verified Vendors Only',
        type: 'boolean',
        default: false
      }
    };
    
    res.json({
      success: true,
      data: commonFilters
    });
  } catch (error) {
    next(error);
  }
};
