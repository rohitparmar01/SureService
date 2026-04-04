/**
 * Razorpay Configuration
 * Production-ready setup with secure credential handling
 */

const Razorpay = require('razorpay');

// Validate credentials on startup
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in environment variables');
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Note: We no longer store Razorpay plan IDs in environment.
// The app uses one-time orders (PLAN_METADATA) and Razorpay API keys
// to create orders. If you need recurring plans later, create them
// via Razorpay dashboard/API and store their IDs securely elsewhere.

// Plan metadata for reference - one-time payment model (no autopay)
const PLAN_METADATA = {
  starter: {
    name: 'Starter',
    price: 499,
    durationDays: 30,
    bonusDays: 30, // Extra 30 days on first purchase only
    portfolioLimit: 15,
    features: [
      '🎁 +30 bonus days on first paid purchase (one-time)',
      'Verified vendor badge',
      'Portfolio: Up to 15 images/videos combined',
      'Improved placement in search results',
      'Category + location SEO optimization',
      'Profile reviewed & managed by SureService team'
    ]
  },
  growth: {
    name: 'Growth',
    price: 999,
    durationDays: 30,
    bonusDays: 30,
    portfolioLimit: 30,
    features: [
      '🎁 +30 bonus days on first paid purchase (one-time)',
      'Portfolio: Up to 30 images/videos combined',
      'Everything in Starter',
      'Higher ranking in category searches',
      'Featured placement in recommended vendors',
      'Portfolio enhancement',
      'Basic social media promotion'
    ]
  },
  premium: {
    name: 'Premium',
    price: 1499,
    durationDays: 30,
    bonusDays: 30,
    portfolioLimit: -1,
    features: [
      '🎁 +30 bonus days on first paid purchase (one-time)',
      'Unlimited portfolio (images & videos)',
      'Top-tier visibility in search results',
      'Premium verified badge',
      'Social media shoutouts & promotions',
      'Dedicated profile optimization',
      'Priority placement during high-demand searches'
    ]
  }
};

// Validate plan key (based on local metadata)
const isValidPlanKey = (planKey) => {
  return planKey && PLAN_METADATA.hasOwnProperty(planKey);
};

// Get plan metadata
const getPlanMetadata = (planKey) => {
  return PLAN_METADATA[planKey] || null;
};

module.exports = {
  razorpay,
  PLAN_METADATA,
  isValidPlanKey,
  getPlanMetadata
};
