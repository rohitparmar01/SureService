const mongoose = require('mongoose');

/**
 * ServiceKeywords Model
 * Stores dynamic keyword mappings for service types
 * This allows adding/updating keywords without code changes
 */

const serviceKeywordSchema = new mongoose.Schema({
  // Service type pattern (e.g., "photography", "video", "venue")
  servicePattern: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  
  // Array of related keywords for this service type
  keywords: {
    type: [String],
    required: true,
    default: []
  },
  
  // Description of this service pattern
  description: {
    type: String,
    default: ''
  },
  
  // Whether this pattern is active
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Priority for matching (higher = checked first)
  priority: {
    type: Number,
    default: 0
  }
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Static method to get keywords for a service type
serviceKeywordSchema.statics.getKeywordsForService = async function(serviceType) {
  if (!serviceType) return [];
  
  const normalizedService = serviceType.toLowerCase().trim();
  
  // Find all matching patterns
  const patterns = await this.find({ isActive: true }).sort({ priority: -1 });
  
  const matchedKeywords = new Set();
  
  // Check each pattern
  for (const pattern of patterns) {
    if (normalizedService.includes(pattern.servicePattern)) {
      pattern.keywords.forEach(keyword => matchedKeywords.add(keyword));
    }
  }
  
  return Array.from(matchedKeywords);
};

// Static method to add or update keyword pattern
serviceKeywordSchema.statics.addOrUpdatePattern = async function(servicePattern, keywords, description = '', priority = 0) {
  return await this.findOneAndUpdate(
    { servicePattern: servicePattern.toLowerCase().trim() },
    { 
      $set: { 
        keywords, 
        description, 
        priority,
        isActive: true 
      } 
    },
    { upsert: true, new: true }
  );
};

const ServiceKeywords = mongoose.model('ServiceKeywords', serviceKeywordSchema);

module.exports = ServiceKeywords;
