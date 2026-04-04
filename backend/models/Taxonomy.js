/**
 * MASTER TAXONOMY MODEL
 * 
 * Single source of truth for:
 * - Categories (HVAC, CCTV, IT Hardware, Electrical, Plumbing, etc.)
 * - Subcategories (Venues, Catering, etc.)
 * - Services (Photographer, DJ, etc.)
 * - Keywords/Synonyms for search
 * 
 * NO seed data • NO hardcoded values • Admin managed only
 */

const mongoose = require('mongoose');

const taxonomySchema = new mongoose.Schema({
  // Hierarchical type: 'category', 'subcategory', 'service'
  type: {
    type: String,
    enum: ['category', 'subcategory', 'service'],
    required: true,
    index: true
  },

  // Unique identifier (slug-like)
  taxonomyId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    lowercase: true,
    trim: true
  },

  // Display name
  name: {
    type: String,
    required: true,
    trim: true
  },

  // Optional description
  description: {
    type: String,
    default: ''
  },

  // Parent reference (for hierarchy)
  // subcategory -> points to category
  // service -> points to subcategory
  parentId: {
    type: String,
    default: null,
    index: true
  },

  // Search keywords and synonyms
  keywords: {
    type: [String],
    default: [],
    index: true
  },

  // Icon/emoji for UI
  icon: {
    type: String,
    default: '🔧'
  },

  // Display order
  sortOrder: {
    type: Number,
    default: 0,
    index: true
  },

  // Active status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
taxonomySchema.index({ type: 1, isActive: 1, sortOrder: 1 });
taxonomySchema.index({ parentId: 1, type: 1, isActive: 1 });
taxonomySchema.index({ keywords: 1, isActive: 1 });

// Static method: Get all categories
taxonomySchema.statics.getCategories = async function() {
  return this.find({ 
    type: 'category', 
    isActive: true 
  }).sort({ sortOrder: 1, name: 1 });
};

// Static method: Get subcategories by category
taxonomySchema.statics.getSubcategories = async function(categoryId) {
  return this.find({ 
    type: 'subcategory', 
    parentId: categoryId,
    isActive: true 
  }).sort({ sortOrder: 1, name: 1 });
};

// Static method: Get services by subcategory
taxonomySchema.statics.getServices = async function(subcategoryId) {
  return this.find({ 
    type: 'service', 
    parentId: subcategoryId,
    isActive: true 
  }).sort({ sortOrder: 1, name: 1 });
};

// Static method: Get all active services (flat list)
taxonomySchema.statics.getAllServices = async function() {
  return this.find({ 
    type: 'service', 
    isActive: true 
  }).sort({ sortOrder: 1, name: 1 });
};

// Static method: Search by keyword
taxonomySchema.statics.searchByKeyword = async function(keyword) {
  const normalized = keyword.toLowerCase().trim();
  
  return this.find({
    isActive: true,
    $or: [
      { keywords: { $regex: normalized, $options: 'i' } },
      { name: { $regex: normalized, $options: 'i' } }
    ]
  }).sort({ type: 1, sortOrder: 1 }).limit(20);
};

// Static method: Get full hierarchy
taxonomySchema.statics.getHierarchy = async function() {
  const categories = await this.find({ type: 'category', isActive: true })
    .sort({ sortOrder: 1, name: 1 });
  
  const result = [];
  
  for (const category of categories) {
    const subcategories = await this.find({ 
      type: 'subcategory', 
      parentId: category.taxonomyId,
      isActive: true 
    }).sort({ sortOrder: 1, name: 1 });
    
    const subcatsWithServices = [];
    
    for (const subcat of subcategories) {
      const services = await this.find({ 
        type: 'service', 
        parentId: subcat.taxonomyId,
        isActive: true 
      }).sort({ sortOrder: 1, name: 1 });
      
      subcatsWithServices.push({
        ...subcat.toObject(),
        services
      });
    }
    
    result.push({
      ...category.toObject(),
      subcategories: subcatsWithServices
    });
  }
  
  return result;
};

// Instance method: Get children
taxonomySchema.methods.getChildren = async function() {
  return this.constructor.find({
    parentId: this.taxonomyId,
    isActive: true
  }).sort({ sortOrder: 1, name: 1 });
};

// Instance method: Get parent
taxonomySchema.methods.getParent = async function() {
  if (!this.parentId) return null;
  return this.constructor.findOne({ taxonomyId: this.parentId });
};

const Taxonomy = mongoose.model('Taxonomy', taxonomySchema);

module.exports = Taxonomy;
