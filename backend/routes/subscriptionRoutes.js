/**
 * Subscription Routes
 * One-time payment model (no autopay/recurring)
 */

const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { vendorProtect } = require('../middleware/authMiddleware');

// ========================================
// PUBLIC ROUTES (Vendor Registration)
// ========================================

// Step 1: Create Razorpay order for registration
router.post('/create', subscriptionController.createSubscription);

// Step 2: Verify payment and create vendor account
router.post('/complete-registration', subscriptionController.completeRegistration);

// Mark an order as cancelled (user dismissed checkout modal)
router.post('/cancel-order', subscriptionController.cancelOrder);

// Mark an order as failed (payment failed in checkout)
router.post('/mark-failed', subscriptionController.markOrderFailed);

// ========================================
// PROTECTED ROUTES (Requires Authentication)
// ========================================

// Get subscription status
router.get('/status', vendorProtect, subscriptionController.getSubscriptionStatus);

// Get payment history
router.get('/payment-history', vendorProtect, subscriptionController.getPaymentHistory);

// Purchase/Upgrade/Renew a plan (creates Razorpay order)
router.post('/purchase', vendorProtect, subscriptionController.purchasePlan);

// Verify payment and activate plan
router.post('/verify-payment', vendorProtect, subscriptionController.verifyPayment);

// Mark an authenticated vendor's order as cancelled
router.post('/cancel-order-auth', vendorProtect, subscriptionController.cancelOrder);

// Mark an authenticated vendor's order as failed
router.post('/mark-failed-auth', vendorProtect, subscriptionController.markOrderFailed);

// Download receipt for a specific payment
router.get('/receipt/:paymentId', vendorProtect, subscriptionController.downloadReceipt);

module.exports = router;
