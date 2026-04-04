const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const ServiceKeywords = require('./ServiceKeywords');

const DESCRIPTION_STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'is',
  'it', 'of', 'on', 'or', 'our', 'the', 'to', 'with', 'we', 'you', 'your',
  'their', 'they', 'them', 'this', 'that', 'these', 'those', 'best', 'top',
  'professional', 'service', 'services', 'vendor'
]);

function extractKeywordsFromText(text = '') {
  const normalized = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return [];

  const words = normalized
    .split(' ')
    .filter(word => {
      if (!word || word.length < 3 || word.length > 24) return false;
      if (DESCRIPTION_STOP_WORDS.has(word)) return false;
      if (/^\d+$/.test(word)) return false;
      return true;
    });

  const keywords = new Set(words);

  // Add phrase-level context like "AC repair" or "CCTV installation" for better matching.
  for (let i = 0; i < words.length - 1; i++) {
    const phrase = `${words[i]} ${words[i + 1]}`;
    if (phrase.length <= 40) {
      keywords.add(phrase);
    }
  }

  return Array.from(keywords).slice(0, 40);
}

const portfolioImageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  caption: String,
  eventType: String, // Legacy field: represents serviceType in current context
  isPrimary: { type: Boolean, default: false }
}, { _id: false });

const pricingSchema = new mongoose.Schema({
  min: { type: Number, required: true },
  max: { type: Number, required: true },
  average: Number,
  currency: { type: String, default: 'INR' },
  unit: String, // e.g., 'per event', 'per plate', 'per hour'
  customPackages: [{
    name: String,
    price: Number,
    description: String,
    features: [String]
  }]
}, { _id: false });

const contactSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian phone number']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  whatsapp: String,
  website: String,
  socialMedia: {
    instagram: String,
    facebook: String,
    youtube: String
  }
}, { _id: false });

const locationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point',
    required: true
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true,
    validate: {
      validator: function(coords) {
        return coords.length === 2 && 
               coords[0] >= -180 && coords[0] <= 180 && // longitude
               coords[1] >= -90 && coords[1] <= 90;     // latitude
      },
      message: 'Invalid coordinates format [longitude, latitude]'
    }
  }
}, { _id: false });

const reviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: String,
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: String,
  eventType: String, // Legacy field: represents serviceType in current context
  images: [String],
  verifiedBooking: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const vendorSchema = new mongoose.Schema({
  // Basic Information
  vendorId: {
    type: String,
    unique: true,
    default: () => `VENDOR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  
  name: {
    type: String,
    required: [true, 'Vendor name is required'],
    trim: true,
    index: 'text'
  },
  
  // Service Type (links to Service model)
  serviceType: {
    type: String,
    required: [true, 'Service type is required'],
    lowercase: true,
    index: true,
    ref: 'Service'
  },
  
  // Location (Geospatial)
  location: {
    type: locationSchema,
    required: [true, 'Location is required'],
    index: '2dsphere'
  },
  
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true,
    index: true
  },
  
  area: {
    type: String,
    trim: true,
    index: true
  },
  
  address: {
    type: String,
    required: false,
    default: '',
    trim: true
  },
  
  pincode: {
    type: String,
    match: [/^\d{6}$/, 'Please enter a valid 6-digit pincode']
  },
  
  // Pricing
  pricing: {
    type: pricingSchema,
    required: [true, 'Pricing information is required']
  },
  
  // Dynamic Filters (CRITICAL - Service-Specific)
  // This object can have ANY keys based on service type
  // Example for photography: { photography_type: ['candid'], coverage_duration: 'full-day' }
  // Example for tent: { tent_type: 'frame', capacity: 500 }
  filters: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    index: true
  },
  
  // Ratings & Reviews
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0,
    index: true
  },
  
  reviewCount: {
    type: Number,
    default: 0,
    index: true
  },
  
  reviews: [reviewSchema],
  
  // Verification & Trust
  verified: {
    type: Boolean,
    default: false,
    index: true
  },
  
  verificationDocuments: [{
    type: String,
    url: String,
    uploadedAt: Date
  }],
  
  responseTime: {
    type: String,
    enum: ['within 1 hour', 'within 2 hours', 'within 4 hours', 'within 24 hours', 'slow'],
    default: 'within 24 hours'
  },
  
  // Portfolio
  portfolio: [portfolioImageSchema],
  
  featuredImage: {
    type: String,
    default: ''
  },
  
  // Profile Images (Cloudinary URLs)
  profileImage: {
    type: String,
    default: ''
  },
  
  coverImage: {
    type: String,
    default: ''
  },
  
  // Contact Information
  contact: {
    type: contactSchema,
    required: [true, 'Contact information is required']
  },
  
  // Authentication
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't return password by default
  },
  
  // Business Details
  businessName: String,
  
  contactPerson: {
    type: String,
    trim: true,
    index: true  // For searching by contact person name
  },
  
  yearsInBusiness: {
    type: Number,
    min: 0,
    default: 0
  },

  teamSize: {
    type: Number,
    min: 0,
    default: 0
  },
  
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  
  // Service Areas
  serviceAreas: [{
    city: String,
    radius: Number // in km
  }],
  
  // Availability
  availability: {
    status: {
      type: String,
      enum: ['available', 'busy', 'unavailable'],
      default: 'available'
    },
    bookedDates: [Date],
    blockedDates: [Date]
  },
  
  // Performance Metrics
  totalBookings: {
    type: Number,
    default: 0
  },
  
  completedBookings: {
    type: Number,
    default: 0
  },
  
  responseRate: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  // Search Optimization
  searchKeywords: [String],
  
  // Location Keywords (for fuzzy location matching)
  locationKeywords: {
    type: [String],
    default: [],
    index: true
  },
  
  popularityScore: {
    type: Number,
    default: 0,
    index: true
  },
  
  // Admin
  isActive: {
    type: Boolean,
    default: false,  // New vendors must be activated by admin
    index: true
  },
  
  isFeatured: {
    type: Boolean,
    default: false,
    index: true
  },
  
  rejectionReason: String,
  
  approvedAt: Date,
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Subscription System - One-time payment model (NO autopay/recurring)
  subscription: {
    // Plan Information
    planKey: {
      type: String,
      enum: ['free', 'starter', 'growth', 'premium'],
      default: 'free',
      index: true
    },
    planName: {
      type: String,
      default: 'Free'
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly'
    },
    
    // Subscription Status: free = on free plan, active = paid & valid, expired = paid plan expired
    status: {
      type: String,
      enum: ['free', 'active', 'expired'],
      default: 'free',
      index: true
    },
    
    // Plan Duration
    startDate: {
      type: Date,
      default: null
    },
    expiryDate: {
      type: Date,
      default: null
    },
    
    // One-time introductory bonus: 30 extra days on FIRST paid plan purchase only
    firstPaidBonusUsed: {
      type: Boolean,
      default: false
    },
    
    // Last Payment Details (for receipt)
    lastPaymentId: {
      type: String,
      default: null
    },
    lastOrderId: {
      type: String,
      default: null
    },
    lastPaymentAmount: {
      type: Number,
      default: 0
    },
    lastPaymentDate: {
      type: Date,
      default: null
    },

    // Upcoming Plan Queue (for advance renewals/upgrades)
    // Activates automatically when current plan expires
    upcomingPlan: {
      planKey: {
        type: String,
        enum: ['starter', 'growth', 'premium'],
        default: null
      },
      planName: String,
      paymentId: String,
      orderId: String,
      amount: Number,
      billingCycle: {
        type: String,
        enum: ['monthly', 'yearly'],
        default: 'monthly'
      },
      purchaseDate: Date,
      bonusDays: { type: Number, default: 0 },
      durationDays: { type: Number, default: 30 },
      scheduledStartDate: Date, // When this plan should activate
      notes: String
    }
  },
  
  // Password Reset (Security)
  resetPasswordToken: String,
  resetPasswordExpiry: Date
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ====================================
// INDEXES FOR PERFORMANCE
// ====================================

// Geospatial index already defined on schema field (index: '2dsphere')

// Compound indexes for common queries
vendorSchema.index({ serviceType: 1, city: 1, rating: -1 });
vendorSchema.index({ serviceType: 1, isActive: 1, verified: 1 });
vendorSchema.index({ city: 1, area: 1 });
vendorSchema.index({ 'pricing.average': 1 });
vendorSchema.index({ popularityScore: -1 });
vendorSchema.index({ isFeatured: 1, rating: -1 });

// Text index for comprehensive search (business name, contact person, keywords)
vendorSchema.index({ 
  name: 'text',
  businessName: 'text',
  contactPerson: 'text',
  description: 'text', 
  searchKeywords: 'text' 
}, {
  weights: {
    name: 10,              // Highest priority
    businessName: 10,       // Highest priority
    contactPerson: 8,       // High priority
    searchKeywords: 5,      // Medium priority
    description: 2          // Lower priority
  },
  name: 'vendor_search_text_index'
});

// ====================================
// VIRTUALS
// ====================================

// Calculate average rating from reviews
vendorSchema.virtual('calculatedRating').get(function() {
  if (!this.reviews || !Array.isArray(this.reviews) || this.reviews.length === 0) return 0;
  const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
  return (sum / this.reviews.length).toFixed(1);
});

// ====================================
// METHODS
// ====================================

// Format vendor for search results
vendorSchema.methods.toSearchResult = function(distance = null) {
  return {
    vendorId: this.vendorId,
    name: this.name,
    serviceType: this.serviceType,
    rating: this.rating,
    reviewCount: this.reviewCount,
    distance: distance,
    distanceUnit: distance ? 'km' : null,
    pricing: {
      min: this.pricing.min,
      max: this.pricing.max,
      average: this.pricing.average,
      currency: this.pricing.currency,
      unit: this.pricing.unit
    },
    matchedFilters: this.filters,
    location: {
      city: this.city,
      area: this.area,
      address: this.address
    },
    contact: {
      phone: this.contact.phone,
      email: this.contact.email,
      whatsapp: this.contact.whatsapp
    },
    verified: this.verified,
    responseTime: this.responseTime,
    portfolio: this.portfolio.slice(0, 3).map(p => p.url),
    featuredImage: this.featuredImage
  };
};

// Update rating after new review
vendorSchema.methods.updateRating = function() {
  if (this.reviews.length === 0) {
    this.rating = 0;
    this.reviewCount = 0;
  } else {
    const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
    this.rating = parseFloat((sum / this.reviews.length).toFixed(1));
    this.reviewCount = this.reviews.length;
  }
};

// Match password for login
vendorSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token
vendorSchema.methods.generateAuthToken = function() {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { 
      id: this._id,
      vendorId: this.vendorId,
      role: 'vendor',
      email: this.contact.email
    },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// Hash password before saving
vendorSchema.pre('save', async function(next) {
  // 1. Hash password if modified
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  
  // 2. Auto-populate searchKeywords dynamically from database
  if (
    this.isModified('serviceType') ||
    this.isModified('name') ||
    this.isModified('businessName') ||
    this.isModified('description') ||
    this.isModified('city') ||
    this.isModified('area') ||
    !this.searchKeywords ||
    this.searchKeywords.length === 0
  ) {
    const keywords = new Set();
    
    // Fetch service-specific keywords from database
    if (this.serviceType) {
      const serviceType = this.serviceType.toLowerCase();
      keywords.add(serviceType);
      
      try {
        // Fetch keywords dynamically from ServiceKeywords collection
        const serviceKeywords = await ServiceKeywords.getKeywordsForService(serviceType);
        serviceKeywords.forEach(keyword => keywords.add(keyword.toLowerCase()));
      } catch (error) {
        console.error('⚠️  Failed to fetch service keywords from database:', error.message);
        // Continue without service keywords if fetch fails
      }
    }
    
    // Add name variations
    if (this.name) {
      const nameParts = this.name.toLowerCase().split(/\s+/);
      nameParts.forEach(part => {
        if (part.length > 2) keywords.add(part);
      });
    }
    
    // Add business name variations
    if (this.businessName) {
      const businessParts = this.businessName.toLowerCase().split(/\s+/);
      businessParts.forEach(part => {
        if (part.length > 2) keywords.add(part);
      });
    }

    // Add keywords extracted from business description.
    if (this.description) {
      const descriptionKeywords = extractKeywordsFromText(this.description);
      descriptionKeywords.forEach(keyword => keywords.add(keyword));
    }
    
    // Add city and area for location-based searches
    if (this.city) keywords.add(this.city.toLowerCase());
    if (this.area) keywords.add(this.area.toLowerCase());
    
    this.searchKeywords = Array.from(keywords);
  }
  
  // 3. Auto-populate locationKeywords from location fields
  if (this.isModified('city') || this.isModified('area') || this.isModified('pincode') || this.isModified('address')) {
    const locationKeywords = new Set();
    
    if (this.city) {
      locationKeywords.add(this.city.toLowerCase().trim());
    }
    
    if (this.area) {
      locationKeywords.add(this.area.toLowerCase().trim());
      // Add area parts (e.g., "Sector 62" => ["sector", "62"])
      const areaParts = this.area.toLowerCase().split(/\s+/);
      areaParts.forEach(part => {
        if (part.length > 1) locationKeywords.add(part);
      });
    }
    
    if (this.pincode) {
      locationKeywords.add(this.pincode.trim());
    }
    
    // Extract landmark/area from address
    if (this.address) {
      const addressParts = this.address.toLowerCase()
        .split(/[,\n]+/)
        .map(part => part.trim())
        .filter(part => part.length > 2 && part.length < 30);
      addressParts.forEach(part => locationKeywords.add(part));
    }
    
    this.locationKeywords = Array.from(locationKeywords);
  }
  
  next();
});

// ====================================
// STATIC METHODS
// ====================================

/**
 * JUSTDIAL-GRADE COMPREHENSIVE SEARCH
 * Supports: text search, location, budget, category, keywords, verified status
 * Ensures verified vendors are always discoverable when matching criteria
 */
vendorSchema.statics.comprehensiveSearch = async function(searchParams) {
  const {
    query: searchQuery,           // Text search (business name, contact person, keywords)
    serviceType,                   // Service category filter
    location,                      // { city, area, latitude, longitude, radius }
    budget,                        // { min, max }
    filters = {},                  // Service-specific filters
    verified,                      // Filter by verified status
    rating,                        // Minimum rating filter
    sort = 'relevance',
    page = 1,
    limit = 20
  } = searchParams;
  
  
  // Base query: Only active vendors appear in public search
  // Verified is just a badge/trust indicator, not a search filter
  let query = { 
    isActive: true
  };
  let useTextScore = false;
  
  // Optional: Admin can explicitly filter by verified status
  if (verified !== undefined) {
    query.verified = verified;
  }
  
  
  // COMPREHENSIVE TEXT SEARCH - Use regex for flexible partial matching
  // This approach works better for real-time search as users type
  if (searchQuery && searchQuery.trim()) {
    const searchTerm = searchQuery.trim();
    
    // Create flexible regex that handles spaces, hyphens, and partial matches
    // "Corporate Event Photography" matches "corporate-event-photography"
    // "photography" matches "photographer", "photography", "photo"
    const flexibleTerm = searchTerm
      .replace(/\s+/g, '[-\\s]*')  // Spaces can be spaces or hyphens
      .replace(/[^a-zA-Z0-9\-\s*]/g, ''); // Remove special chars except hyphen
    const searchRegex = new RegExp(flexibleTerm, 'i'); // Case-insensitive
    
    // Also create a simple partial match for single words
    const simpleTerm = searchTerm.split(/\s+/)[0]; // First word
    const simpleRegex = new RegExp(simpleTerm, 'i');
    
    // Build OR condition to search across multiple fields
    // Using regex allows partial matching: "photo" matches "photography", "photographer"
    const searchConditions = [
      { name: searchRegex },
      { businessName: searchRegex },
      { contactPerson: searchRegex },
      { description: searchRegex },
      { searchKeywords: simpleRegex }, // Use simple regex for keywords array
      { serviceType: searchRegex },
      { city: simpleRegex },
      { area: simpleRegex }
    ];
    
    query.$or = searchConditions;
    
  }
  
  // SERVICE TYPE FILTER (Case-insensitive partial match)
  // Only apply if explicitly provided AND no search query
  // When user types text, let the regex search in $or handle serviceType matching
  if (serviceType && !searchQuery) {
    // Normalize and create flexible regex pattern
    const normalizedService = serviceType.toLowerCase().trim();
    
    // Create regex that matches partial words
    // "photo" matches "photography", "photographer", "photo"
    // "video" matches "videography", "videographer", "video"
    query.serviceType = new RegExp(normalizedService, 'i');
    
  }
  // NOTE: If both searchQuery and serviceType exist, serviceType is already
  // included in the $or conditions above, so no need to add it as AND condition
  
  // LOCATION
  if (location) {
    // City filter (exact or contains)
    if (location.city) {
      query.city = new RegExp(location.city, 'i');
    }
    
    if (location.area) {
      query.area = new RegExp(location.area, 'i');
    }
    
    // Geospatial search
    if (location.latitude && location.longitude && location.radius) {
      const radiusInMeters = (location.radius || 10) * 1000;
      delete query.city;
      delete query.area;
      
      query.location = {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(location.longitude), parseFloat(location.latitude)]
          },
          $maxDistance: radiusInMeters
        }
      };
    }
  }
  
  // BUDGET FILTER
  if (budget && (budget.min || budget.max)) {
    const budgetQuery = [];
    
    if (budget.min && budget.max) {
      budgetQuery.push({
        $or: [
          // Vendor min price within user budget
          { 'pricing.min': { $gte: budget.min, $lte: budget.max } },
          { 'pricing.max': { $gte: budget.min, $lte: budget.max } },
          // Vendor range encompasses user budget
          {
            $and: [
              { 'pricing.min': { $lte: budget.min } },
              { 'pricing.max': { $gte: budget.max } }
            ]
          }
        ]
      });
    } else if (budget.min) {
      // Only minimum budget specified
      budgetQuery.push({ 'pricing.max': { $gte: budget.min } });
    } else if (budget.max) {
      // Only maximum budget specified
      budgetQuery.push({ 'pricing.min': { $lte: budget.max } });
    }
    
    if (budgetQuery.length > 0) {
      query.$and = query.$and || [];
      query.$and.push(...budgetQuery);
    }
  }
  
  // RATING FILTER
  if (rating) {
    query.rating = { $gte: parseFloat(rating) };
  }
  
  // SERVICE-SPECIFIC FILTERS
  Object.keys(filters).forEach(filterKey => {
    if (['verified', 'rating'].includes(filterKey)) return;
    
    const filterValue = filters[filterKey];
    
    if (filterValue !== undefined && filterValue !== null && filterValue !== '') {
      if (Array.isArray(filterValue) && filterValue.length > 0) {
        query[`filters.${filterKey}`] = { $in: filterValue };
      } else if (typeof filterValue === 'boolean') {
        // Boolean filter (e.g., has_backup_equipment)
        query[`filters.${filterKey}`] = filterValue;
      } else {
        // Single value filter
        query[`filters.${filterKey}`] = filterValue;
      }
    }
  });
  
  // SORTING STRATEGY
  let sortOption = {};
  // Note: We use regex search instead of $text, so no text score available
  // Sort by relevance factors: featured status, rating, popularity
  switch (sort) {
    case 'rating':
      sortOption = { rating: -1, reviewCount: -1 };
      break;
    case 'price-low':
      sortOption = { 'pricing.average': 1, rating: -1 };
      break;
    case 'price-high':
      sortOption = { 'pricing.average': -1, rating: -1 };
      break;
    case 'reviews':
      sortOption = { reviewCount: -1, rating: -1 };
      break;
    case 'distance':
      // Distance sorting is automatic with $near geospatial query
      sortOption = { rating: -1 };
      break;
    case 'popularity':
      sortOption = { popularityScore: -1, rating: -1 };
      break;
    default: // 'relevance'
      sortOption = { isFeatured: -1, rating: -1, popularityScore: -1 };
  }
  
  // PAGINATION
  const skip = (page - 1) * limit;
  
  
  const queryBuilder = this.find(query);
  
  const vendors = await queryBuilder
    .sort(sortOption)
    .skip(skip)
    .limit(limit)
    .select('-reviews -verificationDocuments -password')
    .lean();
  
  const total = await this.countDocuments(query);
  
  
  return {
    results: vendors,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page < Math.ceil(total / limit),
    hasPrevPage: page > 1
  };
};

// ====================================
// PASSWORD RESET METHODS
// ====================================

// Method to generate password reset token
vendorSchema.methods.generatePasswordResetToken = function() {
  const crypto = require('crypto');
  
  // Generate random token
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  // Hash token and store in database
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  // Set expiry to 15 minutes
  this.resetPasswordExpiry = Date.now() + 15 * 60 * 1000;
  
  // Return unhashed token (to send via email)
  return resetToken;
};

// Static method to verify reset token
vendorSchema.statics.verifyResetToken = async function(token) {
  const crypto = require('crypto');
  
  // Hash the incoming token to compare with stored hash
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  // Find vendor with valid token and not expired
  const vendor = await this.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpiry: { $gt: Date.now() }
  });
  
  return vendor;
};

const Vendor = mongoose.model('Vendor', vendorSchema);

module.exports = Vendor;
