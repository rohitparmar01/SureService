/**
 * Razorpay Webhook Handler
 * One-time payment model — handles order/payment events only
 * 
 * SECURITY: Signature verification is MANDATORY
 */

const Vendor = require('../models/VendorNew');
const Notification = require('../models/Notification');
const Transaction = require('../models/Transaction');
const razorpayService = require('../services/razorpayService');

/**
 * Main Webhook Handler
 * POST /api/webhook/razorpay
 * 
 * IMPORTANT: This endpoint must use raw body parser
 * Configure in server.js BEFORE express.json()
 */
exports.handleRazorpayWebhook = async (req, res) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'];
    
    if (!webhookSignature) {
      console.error('❌ Webhook: Missing signature');
      return res.status(400).json({ error: 'Missing signature' });
    }

    const webhookBody = req.rawBody || JSON.stringify(req.body);

    const isValid = razorpayService.verifyWebhookSignature(
      webhookBody,
      webhookSignature
    );

    if (!isValid) {
      console.error('❌ Webhook: Invalid signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Parse event from raw body (req.body may be a Buffer from express.raw())
    const event = JSON.parse(webhookBody);
    const eventType = event.event;
    const payload = event.payload;


    switch (eventType) {
      case 'payment.captured':
        await handlePaymentCaptured(payload);
        break;

      case 'payment.failed':
        await handlePaymentFailed(payload);
        break;

      default:
    }

    res.status(200).json({ status: 'ok' });

  } catch (error) {
    console.error('❌ Webhook handler error:', error);
    res.status(200).json({ status: 'error', message: error.message });
  }
};

/**
 * Handle payment.captured
 * Payment successfully captured for an order
 */
async function handlePaymentCaptured(payload) {
  try {
    const payment = payload.payment.entity;
    const orderId = payment.order_id;

    // Update transaction with full dynamic Razorpay payment data
    await Transaction.findOneAndUpdate(
      { orderId },
      { $set: {
        paymentId: payment.id,
        status: 'paid',
        paidAt: new Date(payment.created_at * 1000),
        razorpayPaymentData: payment,
        method: payment.method,
        bank: payment.bank,
        wallet: payment.wallet,
        vpa: payment.vpa
      }, $push: {
        webhookEvents: { event: 'payment.captured', receivedAt: new Date(), payload: payment }
      }}
    );

    const vendor = await Vendor.findOne({ 
      'subscription.lastOrderId': orderId 
    });

    if (!vendor) {
      return;
    }

    // Confirm the vendor's subscription is active (redundant safety check)
    if (vendor.subscription.status !== 'active') {
    }

    try {
      await Notification.create({
        vendor: vendor._id,
        type: 'subscription',
        title: 'Payment Confirmed',
        message: `Your payment of ₹${payment.amount / 100} for the ${vendor.subscription.planName} plan has been confirmed.`,
        link: '/vendor-dashboard?tab=subscription',
        priority: 'normal'
      });
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
    }

  } catch (error) {
    console.error('❌ handlePaymentCaptured error:', error);
  }
}

/**
 * Handle payment.failed
 * Payment attempt failed
 */
async function handlePaymentFailed(payload) {
  try {
    const payment = payload.payment.entity;
    const orderId = payment.order_id;

    if (!orderId) return;

    // Update transaction with full dynamic failure data from Razorpay
    await Transaction.findOneAndUpdate(
      { orderId },
      { $set: {
        paymentId: payment.id,
        status: 'failed',
        failedAt: new Date(),
        razorpayPaymentData: payment,
        method: payment.method,
        bank: payment.bank,
        wallet: payment.wallet,
        vpa: payment.vpa,
        errorCode: payment.error_code,
        errorDescription: payment.error_description,
        errorSource: payment.error_source,
        errorReason: payment.error_reason
      }, $push: {
        webhookEvents: { event: 'payment.failed', receivedAt: new Date(), payload: payment }
      }}
    );

    const vendor = await Vendor.findOne({ 
      'subscription.lastOrderId': orderId 
    });

    if (!vendor) return;

    try {
      await Notification.create({
        vendor: vendor._id,
        type: 'subscription',
        title: 'Payment Failed',
        message: `Your payment for the ${vendor.subscription.planName} plan failed. Please try again from your dashboard.`,
        link: '/vendor-dashboard?tab=subscription',
        priority: 'high'
      });
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
    }

  } catch (error) {
    console.error('❌ handlePaymentFailed error:', error);
  }
}

module.exports = exports;
