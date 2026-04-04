const mongoose = require('mongoose');

/**
 * Admin Blog Model
 * Professional blog system for the event marketplace
 * Fully managed by admin through admin panel
 */
const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Blog title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  
  excerpt: {
    type: String,
    required: [true, 'Excerpt is required'],
    trim: true,
    maxlength: [300, 'Excerpt cannot exceed 300 characters']
  },
  
  content: {
    type: String,
    required: [true, 'Blog content is required']
  },
  
  featuredImage: {
    url: {
      type: String,
      required: [true, 'Featured image is required']
    },
    publicId: String
  },
  
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft',
    index: true
  },
  
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  category: {
    type: String,
    trim: true,
    default: 'General'
  },
  
  metaTitle: {
    type: String,
    trim: true,
    maxlength: [70, 'Meta title cannot exceed 70 characters']
  },
  
  metaDescription: {
    type: String,
    trim: true,
    maxlength: [160, 'Meta description cannot exceed 160 characters']
  },
  
  readTime: {
    type: Number,
    default: 5
  },
  
  views: {
    type: Number,
    default: 0
  },
  
  publishedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance (slug already indexed inline)
blogSchema.index({ status: 1, publishedAt: -1 });
blogSchema.index({ tags: 1 });
blogSchema.index({ category: 1 });

// Pre-save: Generate slug if not provided
blogSchema.pre('save', function(next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  
  // Set metaTitle if not provided
  if (!this.metaTitle) {
    this.metaTitle = this.title.substring(0, 70);
  }
  
  // Set metaDescription if not provided
  if (!this.metaDescription) {
    this.metaDescription = this.excerpt.substring(0, 160);
  }
  
  // Calculate read time based on content
  if (this.content) {
    const wordsPerMinute = 200;
    const plainText = String(this.content)
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const wordCount = plainText ? plainText.split(' ').length : 0;
    this.readTime = Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  }
  
  // Set publishedAt when status changes to published
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  next();
});

// Static method: Get published blogs
blogSchema.statics.getPublished = function(page = 1, limit = 10) {
  return this.find({ status: 'published' })
    .populate('author', 'name email')
    .sort({ publishedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

// Static method: Get by slug
blogSchema.statics.findBySlug = function(slug) {
  return this.findOne({ slug, status: 'published' })
    .populate('author', 'name email');
};

// Static method: Get related blogs
blogSchema.statics.getRelated = function(blogId, tags, limit = 3) {
  return this.find({
    _id: { $ne: blogId },
    status: 'published',
    tags: { $in: tags }
  })
    .select('title slug excerpt featuredImage publishedAt readTime')
    .sort({ publishedAt: -1 })
    .limit(limit);
};

// Method: Increment views
blogSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

module.exports = mongoose.model('Blog', blogSchema);
