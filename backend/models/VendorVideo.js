const mongoose = require('mongoose');

/**
 * Vendor Videos Collection
 * Instagram Reels-style video content
 * Separate from VendorMedia for better organization and specific video features
 */
const vendorVideoSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VendorNew',
    required: true,
    index: true
  },
  videoUrl: {
    type: String,
    required: true
  },
  publicId: {
    type: String, // Cloudinary public_id
    required: true
  },
  thumbnail: {
    url: String,
    publicId: String
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 1000
  },
  duration: {
    type: Number, // seconds
    required: true
  },
  orderIndex: {
    type: Number,
    default: 0
  },
  visibility: {
    type: String,
    enum: ['public', 'hidden'],
    default: 'public'
  },
  tags: [{
    type: String,
    trim: true
  }],
  views: {
    type: Number,
    default: 0
  },
  metadata: {
    format: String,
    width: Number,
    height: Number,
    size: Number, // bytes
    bitrate: String
  }
}, {
  timestamps: true
});

// Indexes
vendorVideoSchema.index({ vendorId: 1, visibility: 1, orderIndex: 1 });
vendorVideoSchema.index({ vendorId: 1, createdAt: -1 });

module.exports = mongoose.model('VendorVideo', vendorVideoSchema);
