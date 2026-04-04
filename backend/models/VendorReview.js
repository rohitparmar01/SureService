const mongoose = require('mongoose');

/**
 * Vendor Reviews Collection
 * Customer reviews and ratings (Future-safe implementation)
 * Only verified customers can leave reviews
 */
const vendorReviewSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true,
    maxlength: 1000
  },
  verifiedInquiryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VendorInquiry'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  rejectionReason: {
    type: String
  },
  vendorResponse: {
    comment: String,
    respondedAt: Date
  },
  helpfulCount: {
    type: Number,
    default: 0
  },
  metadata: {
    serviceQuality: Number,
    communication: Number,
    punctuality: Number,
    valueForMoney: Number
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate reviews (removed verifiedInquiryId for simpler duplicate prevention)
vendorReviewSchema.index({ vendorId: 1, userId: 1 }, { unique: true });
vendorReviewSchema.index({ vendorId: 1, status: 1, createdAt: -1 });
vendorReviewSchema.index({ userId: 1, createdAt: -1 });

// Virtual for average rating breakdown
vendorReviewSchema.virtual('averageRating').get(function() {
  if (!this.metadata) return this.rating;
  
  const { serviceQuality, communication, punctuality, valueForMoney } = this.metadata;
  const ratings = [serviceQuality, communication, punctuality, valueForMoney].filter(r => r);
  
  if (ratings.length === 0) return this.rating;
  return ratings.reduce((a, b) => a + b, 0) / ratings.length;
});

vendorReviewSchema.set('toJSON', { virtuals: true });
vendorReviewSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('VendorReview', vendorReviewSchema);
