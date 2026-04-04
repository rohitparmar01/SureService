const mongoose = require('mongoose');

const filterOptionSchema = new mongoose.Schema({
  value: { type: String, required: true },
  label: { type: String, required: true },
  icon: String,
  priceMultiplier: Number,
  tag: String
}, { _id: false });

const filterSchema = new mongoose.Schema({
  id: { type: String, required: true },
  label: { type: String, required: true },
  type: { 
    type: String, 
    required: true,
    enum: ['multiselect', 'select', 'range', 'boolean', 'date', 'location', 'budget', 'rating']
  },
  required: { type: Boolean, default: false },
  options: [filterOptionSchema],
  min: Number,
  max: Number,
  unit: String,
  defaultValue: mongoose.Schema.Types.Mixed
}, { _id: false });

const budgetPresetSchema = new mongoose.Schema({
  label: { type: String, required: true },
  min: { type: Number, required: true },
  max: { type: Number, required: true },
  tag: String
}, { _id: false });

const budgetRangeSchema = new mongoose.Schema({
  min: { type: Number, required: true },
  max: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  unit: String,
  presets: [budgetPresetSchema]
}, { _id: false });

const serviceSchema = new mongoose.Schema({
  serviceId: {
    type: String,
    required: [true, 'Service ID is required'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  serviceName: {
    type: String,
    required: [true, 'Service name is required'],
    trim: true
  },
  keywords: {
    type: [String],
    required: [true, 'Keywords are required for service detection'],
    index: true
  },
  icon: {
    type: String,
    default: '📦'
  },
  
  // Dynamic filters array - matches frontend structure exactly
  filters: {
    type: [filterSchema],
    default: []
  },
  
  // Budget configuration
  budgetRange: {
    type: budgetRangeSchema,
    required: [true, 'Budget range is required']
  },
  
  // Default sorting preference
  defaultSort: {
    type: String,
    enum: ['relevance', 'rating', 'price-low', 'price-high', 'distance', 'reviews', 'popularity', 'experience', 'capacity'],
    default: 'relevance'
  },
  
  // Priority filters to show first
  priorityFilters: {
    type: [String],
    default: []
  },
  
  // Service status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Meta information
  totalVendors: {
    type: Number,
    default: 0
  },
  
  popularityScore: {
    type: Number,
    default: 0,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance (keywords already indexed inline)
serviceSchema.index({ serviceId: 1, isActive: 1 });
serviceSchema.index({ popularityScore: -1 });

// Virtual for vendor count
serviceSchema.virtual('vendors', {
  ref: 'Vendor',
  localField: 'serviceId',
  foreignField: 'serviceType',
  count: true
});

// Method to get full filter config (merges common filters at runtime)
serviceSchema.methods.getFilterConfig = function() {
  return {
    serviceId: this.serviceId,
    serviceName: this.serviceName,
    keywords: this.keywords,
    icon: this.icon,
    filters: this.filters,
    budgetRange: this.budgetRange,
    defaultSort: this.defaultSort,
    priorityFilters: this.priorityFilters
  };
};

// Static method to detect service from query
serviceSchema.statics.detectFromQuery = async function(query) {
  if (!query || typeof query !== 'string') {
    return null;
  }
  
  const queryLower = query.toLowerCase().trim();
  const words = queryLower.split(/\s+/);
  
  // Find services matching keywords
  const services = await this.find({ isActive: true });
  
  let bestMatch = null;
  let highestScore = 0;
  
  services.forEach(service => {
    let score = 0;
    
    // Check exact match
    if (service.keywords.some(kw => queryLower === kw.toLowerCase())) {
      score += 100;
    }
    
    // Check partial matches
    service.keywords.forEach(keyword => {
      const kwLower = keyword.toLowerCase();
      if (queryLower.includes(kwLower)) {
        score += 50;
      }
      
      // Check word matches
      words.forEach(word => {
        if (kwLower.includes(word) || word.includes(kwLower)) {
          score += 10;
        }
      });
    });
    
    if (score > highestScore) {
      highestScore = score;
      bestMatch = service;
    }
  });
  
  return bestMatch;
};

// Static method to get all active services
serviceSchema.statics.getAllActive = function() {
  return this.find({ isActive: true })
    .select('serviceId serviceName icon keywords totalVendors popularityScore')
    .sort({ popularityScore: -1 });
};

// Method to validate filter values against schema
serviceSchema.methods.validateFilters = function(filterValues) {
  const errors = [];
  
  this.filters.forEach(filter => {
    const value = filterValues[filter.id];
    
    // Check required filters
    if (filter.required && !value) {
      errors.push({
        filterId: filter.id,
        message: `${filter.label} is required`
      });
    }
    
    // Validate by type
    if (value !== undefined && value !== null) {
      switch (filter.type) {
        case 'multiselect':
          if (!Array.isArray(value)) {
            errors.push({
              filterId: filter.id,
              message: `${filter.label} must be an array`
            });
          } else {
            const validValues = filter.options.map(opt => opt.value);
            const invalidValues = value.filter(v => !validValues.includes(v));
            if (invalidValues.length > 0) {
              errors.push({
                filterId: filter.id,
                message: `Invalid values: ${invalidValues.join(', ')}`
              });
            }
          }
          break;
          
        case 'select':
          const validValues = filter.options.map(opt => opt.value);
          if (!validValues.includes(value)) {
            errors.push({
              filterId: filter.id,
              message: `Invalid value for ${filter.label}`
            });
          }
          break;
          
        case 'range':
          if (typeof value !== 'number' || value < filter.min || value > filter.max) {
            errors.push({
              filterId: filter.id,
              message: `${filter.label} must be between ${filter.min} and ${filter.max}`
            });
          }
          break;
          
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push({
              filterId: filter.id,
              message: `${filter.label} must be true or false`
            });
          }
          break;
      }
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

const Service = mongoose.model('Service', serviceSchema);

module.exports = Service;
