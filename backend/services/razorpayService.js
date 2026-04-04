/**
 * Razorpay Service
 * One-time payment model (NO autopay/recurring subscriptions)
 * Creates Razorpay orders for standard checkout
 */

const { razorpay, getPlanMetadata } = require('../config/razorpay');
const crypto = require('crypto');

/**
 * Create a Razorpay Order for one-time payment
 * @param {Object} options - Order options
 * @param {string} options.planKey - Plan key (starter/growth/premium)
 * @param {string} options.vendorEmail - Vendor email for notes
 * @param {string} options.businessName - Business name for notes
 * @param {string} options.type - Payment type (first-purchase/renewal/upgrade)
 * @param {string} [options.billingCycle] - Billing cycle (monthly/yearly)
 * @param {number} [options.planPrice] - Override plan price in rupees
 * @param {string} [options.planName] - Override plan name
 * @returns {Promise<Object>} Order object
 */
const createOrder = async ({
  planKey,
  vendorEmail,
  businessName,
  type = 'first-purchase',
  billingCycle = 'monthly',
  planPrice,
  planName
}) => {
  try {
    const planMetadata = getPlanMetadata(planKey);
    if (!planMetadata) throw new Error(`Invalid plan key: ${planKey}`);

    const resolvedPlanPrice = Number.isFinite(planPrice) ? Number(planPrice) : planMetadata.price;
    const resolvedPlanName = planName || planMetadata.name;
    const amount = resolvedPlanPrice * 100; // Amount in paise
    
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: {
        plan_key: planKey,
        plan_name: resolvedPlanName,
        billing_cycle: billingCycle,
        vendor_email: vendorEmail,
        business_name: businessName,
        type: type
      }
    });
    
    
    return {
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      planKey,
      billingCycle,
      planName: resolvedPlanName,
      planPrice: resolvedPlanPrice
    };
    
  } catch (error) {
    console.error('❌ Razorpay order creation failed:', error);
    throw {
      success: false,
      error: 'ORDER_CREATION_FAILED',
      message: error.error?.description || error.message || 'Failed to create order'
    };
  }
};

/**
 * Verify payment signature (standard checkout)
 * CRITICAL: Prevents payment fraud
 */
const verifyPaymentSignature = ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
  try {
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    const expected = Buffer.from(expectedSignature, 'hex');
    const received = Buffer.from(razorpay_signature, 'hex');
    const isValid = expected.length === received.length && crypto.timingSafeEqual(expected, received);
    
    if (!isValid) {
      console.error(`❌ Invalid payment signature for order: ${razorpay_order_id}`);
    }
    
    return isValid;
    
  } catch (error) {
    console.error('❌ Payment signature verification error:', error);
    return false;
  }
};

/**
 * Verify webhook signature
 * CRITICAL: Ensures webhook is from Razorpay
 */
const verifyWebhookSignature = (webhookBody, webhookSignature) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('❌ RAZORPAY_WEBHOOK_SECRET not configured');
      return false;
    }
    
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(webhookBody)
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    const expected = Buffer.from(expectedSignature, 'hex');
    const received = Buffer.from(webhookSignature, 'hex');
    return expected.length === received.length && crypto.timingSafeEqual(expected, received);
    
  } catch (error) {
    console.error('❌ Webhook signature verification error:', error);
    return false;
  }
};

/**
 * Fetch a Razorpay order by ID to verify its details server-side
 * CRITICAL: Prevents plan-mismatch fraud
 */
const fetchOrder = async (orderId) => {
  try {
    return await razorpay.orders.fetch(orderId);
  } catch (error) {
    console.error('❌ Razorpay order fetch failed:', error);
    throw new Error('Failed to fetch order from Razorpay');
  }
};

/**
 * Fetch a Razorpay payment by ID to get method/bank/vpa details
 */
const fetchPayment = async (paymentId) => {
  try {
    return await razorpay.payments.fetch(paymentId);
  } catch (error) {
    console.error('❌ Razorpay payment fetch failed:', error);
    return null;
  }
};

module.exports = {
  createOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  fetchOrder,
  fetchPayment
};
