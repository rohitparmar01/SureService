const mongoose = require('mongoose');

/**
 * Vendor Blogs Collection
 * LinkedIn-style posts for vendors
 * Supports rich content, tags, and publishing workflow
 */
const vendorBlogSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  slug: {
    type: String,
    trim: true,
    lowercase: true,
    unique: true,
    sparse: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 10000
  },
  excerpt: {
    type: String,
    maxlength: 300
  },
  coverImage: {
    url: String,
    publicId: String
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
    index: true
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  rejectionReason: {
    type: String
  },
  publishedAt: {
    type: Date
  },
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  metadata: {
    readTime: Number, // minutes
    wordCount: Number
  }
}, {
  timestamps: true
});

// Auto-generate slug from title
vendorBlogSchema.pre('save', function(next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + Date.now();
  }
  
  // Auto-generate excerpt from content if not provided
  if (this.isModified('content') && !this.excerpt) {
    this.excerpt = this.content.substring(0, 297) + '...';
  }
  
  // Calculate metadata
  if (this.isModified('content')) {
    const words = this.content.split(/\s+/).length;
    this.metadata = {
      wordCount: words,
      readTime: Math.ceil(words / 200) // avg reading speed
    };
  }
  
  // Set publishedAt when status changes to published
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  next();
});

// Indexes (slug already indexed inline with unique+sparse)
vendorBlogSchema.index({ vendorId: 1, status: 1, publishedAt: -1 });
vendorBlogSchema.index({ tags: 1, status: 1 });
vendorBlogSchema.index({ approvalStatus: 1, createdAt: -1 });

module.exports = mongoose.model('VendorBlog', vendorBlogSchema);
