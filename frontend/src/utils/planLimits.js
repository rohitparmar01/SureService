/**
 * Subscription Plan Limits Configuration
 * Central place to manage all plan-based limits and features
 */

export const PLAN_LIMITS = {
  free: {
    id: 'free',
    name: 'Free',
    maxImages: 5,
    maxVideos: 0,
    featuredPlacement: false,
    verifiedBadge: false,
    prioritySupport: false,
    socialMediaPromotion: false
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    maxImages: 15,
    maxVideos: 3,
    featuredPlacement: false,
    verifiedBadge: true,
    prioritySupport: true,
    socialMediaPromotion: false
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    maxImages: 30,
    maxVideos: 5,
    featuredPlacement: true,
    verifiedBadge: true,
    prioritySupport: true,
    socialMediaPromotion: true
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    maxImages: Infinity, // Unlimited
    maxVideos: Infinity, // Unlimited
    featuredPlacement: true,
    verifiedBadge: true,
    prioritySupport: true,
    socialMediaPromotion: true
  }
};

/**
 * Get image limit for a plan
 * @param {string} planKey - Plan identifier (free, starter, growth, premium)
 * @returns {number} Maximum number of images allowed
 */
export const getImageLimit = (planKey = 'free') => {
  const plan = PLAN_LIMITS[planKey] || PLAN_LIMITS.free;
  return plan.maxImages;
};

/**
 * Get video limit for a plan
 * @param {string} planKey - Plan identifier (free, starter, growth, premium)
 * @returns {number} Maximum number of videos allowed
 */
export const getVideoLimit = (planKey = 'free') => {
  const plan = PLAN_LIMITS[planKey] || PLAN_LIMITS.free;
  return plan.maxVideos;
};

/**
 * Check if vendor has reached image limit
 * @param {number} currentCount - Current number of images
 * @param {string} planKey - Plan identifier
 * @returns {boolean} True if limit reached
 */
export const hasReachedImageLimit = (currentCount, planKey = 'free') => {
  const limit = getImageLimit(planKey);
  return currentCount >= limit;
};

/**
 * Get remaining image slots
 * @param {number} currentCount - Current number of images
 * @param {string} planKey - Plan identifier
 * @returns {number} Number of remaining slots
 */
export const getRemainingImageSlots = (currentCount, planKey = 'free') => {
  const limit = getImageLimit(planKey);
  if (limit === Infinity) return Infinity;
  return Math.max(0, limit - currentCount);
};

/**
 * Get plan features
 * @param {string} planKey - Plan identifier
 * @returns {object} Plan configuration object
 */
export const getPlanFeatures = (planKey = 'free') => {
  return PLAN_LIMITS[planKey] || PLAN_LIMITS.free;
};

/**
 * Format image limit for display
 * @param {string} planKey - Plan identifier
 * @returns {string} Formatted limit text
 */
export const formatImageLimit = (planKey = 'free') => {
  const limit = getImageLimit(planKey);
  return limit === Infinity ? 'Unlimited' : `Up to ${limit}`;
};

export default PLAN_LIMITS;
