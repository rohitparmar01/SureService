const mongoose = require('mongoose');

/**
 * ContactInquiry Model
 * Separate collection for general contact/support inquiries
 * Stored in MongoDB collection: 'contactinquiries'
 * NOTE: eventType is a legacy field name representing serviceType/subject in B2B context
 */
const contactInquirySchema = new mongoose.Schema({
  inquiryId: {
    type: String,
    unique: true,
    default: () => `CINQ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  
  // Customer Information
  userName: {
    type: String,
    required: [true, 'User name is required'],
    trim: true
  },
  
  userEmail: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  
  userContact: {
    type: String,
    required: [true, 'Contact number is required'],
    match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit phone number']
  },
  
  // Inquiry Details
  eventType: {
    type: String,
    required: [true, 'Subject/Event type is required'], // Legacy field: serviceType/subject
    trim: true
  },
  
  // Message/Requirements (REQUIRED for contact inquiries)
  message: {
    type: String,
    required: [true, 'Message is required for contact inquiries'],
    trim: true,
    maxlength: 2000,
    minlength: 10
  },
  
  // Budget (optional for general inquiries)
  budget: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'contacted', 'responded', 'closed', 'cancelled'],
    default: 'pending',
    index: true
  },
  
  // Source
  source: {
    type: String,
    enum: ['website', 'mobile_app', 'direct'],
    default: 'website'
  },
  
  // Inquiry Category (for contact form)
  category: {
    type: String,
    enum: [
      'general',
      'customer-support',
      'vendor-application',
      'partnership',
      'technical',
      'feedback',
      'other'
    ],
    default: 'general'
  },
  
  // Response tracking
  respondedAt: {
    type: Date
  },
  
  adminResponse: {
    type: String,
    trim: true
  },
  
  // Admin notes (internal)
  adminNotes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
  collection: 'contactinquiries' // Explicit collection name
});

// Indexes for efficient queries
contactInquirySchema.index({ userContact: 1, createdAt: -1 });
contactInquirySchema.index({ status: 1, createdAt: -1 });
contactInquirySchema.index({ category: 1, status: 1 });
contactInquirySchema.index({ createdAt: -1 });

// Virtual for age of inquiry
contactInquirySchema.virtual('ageInHours').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60));
});

// Method to mark as responded
contactInquirySchema.methods.markAsResponded = function(response, notes = '') {
  this.status = 'responded';
  this.respondedAt = Date.now();
  this.adminResponse = response;
  if (notes) this.adminNotes = notes;
  return this.save();
};

const ContactInquiry = mongoose.model('ContactInquiry', contactInquirySchema);

module.exports = ContactInquiry;
