const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  // Razorpay identifiers
  orderId: { type: String, required: true, index: true },
  paymentId: { type: String, default: null, index: true },

  // Vendor reference (null until vendor is created for registration flow)
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', default: null, index: true },
  vendorEmail: { type: String, required: true, index: true },
  businessName: { type: String, default: null },

  // Plan details (captured at time of transaction — not a live reference)
  planKey: { type: String, required: true },
  planName: { type: String, required: true },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly'],
    default: 'monthly'
  },
  amount: { type: Number, required: true }, // in rupees
  currency: { type: String, default: 'INR' },

  // Transaction lifecycle
  status: {
    type: String,
    enum: ['created', 'attempted', 'paid', 'failed', 'cancelled', 'refunded'],
    default: 'created',
    index: true
  },

  // What triggered this transaction
  type: {
    type: String,
    enum: ['first-purchase', 'renewal', 'upgrade'],
    required: true
  },

  // Dynamic Razorpay data — stored exactly as received, never hard-coded
  razorpayOrderData: { type: mongoose.Schema.Types.Mixed, default: null },
  razorpayPaymentData: { type: mongoose.Schema.Types.Mixed, default: null },

  // Signature verification result
  signatureValid: { type: Boolean, default: null },

  // Failure / cancellation details
  errorCode: { type: String, default: null },
  errorDescription: { type: String, default: null },
  errorSource: { type: String, default: null },
  errorReason: { type: String, default: null },

  // Bonus & duration info
  bonusDays: { type: Number, default: 0 },
  durationDays: { type: Number, default: 30 },

  // Method / instrument (populated from Razorpay callback data)
  method: { type: String, default: null }, // card, upi, netbanking, wallet, etc.
  bank: { type: String, default: null },
  wallet: { type: String, default: null },
  vpa: { type: String, default: null },

  // IP / device context (from request)
  ip: { type: String, default: null },
  userAgent: { type: String, default: null },

  // Webhook tracking
  webhookEvents: [{
    event: String,
    receivedAt: { type: Date, default: Date.now },
    payload: mongoose.Schema.Types.Mixed
  }],

  // Timestamps for each lifecycle stage
  createdAt: { type: Date, default: Date.now },
  attemptedAt: { type: Date, default: null },
  paidAt: { type: Date, default: null },
  failedAt: { type: Date, default: null },
  cancelledAt: { type: Date, default: null },
  refundedAt: { type: Date, default: null }

}, {
  timestamps: true // adds updatedAt automatically
});

// Compound indexes for admin queries
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ vendorEmail: 1, createdAt: -1 });
transactionSchema.index({ planKey: 1, status: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
