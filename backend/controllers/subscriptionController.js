/**
 * Subscription Controller
 * One-time payment model with 30-day introductory bonus on first paid purchase
 * NO autopay, NO auto-renewal — vendor must manually renew
 */

const Vendor = require('../models/VendorNew');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const razorpayService = require('../services/razorpayService');
const { isValidPlanKey, getPlanMetadata } = require('../config/razorpay');
const { applyVendorMediaEntitlements } = require('../services/subscriptionEntitlementService');

const YEARLY_DISCOUNT = 0.17;
const BILLING_CYCLES = new Set(['monthly', 'yearly']);
const PAID_PLAN_KEYS = new Set(['starter', 'growth', 'premium']);

const normalizeBillingCycle = (value) => (BILLING_CYCLES.has(value) ? value : 'monthly');
const isPaidPlanKey = (planKey) => PAID_PLAN_KEYS.has(String(planKey || '').toLowerCase());

const calculatePlanTerms = (planMetadata, billingCycle, { isFirstPaidPurchase = false } = {}) => {
  const cycle = normalizeBillingCycle(billingCycle);
  const cycleMultiplier = cycle === 'yearly' ? 12 : 1;
  const discountedFactor = cycle === 'yearly' ? (1 - YEARLY_DISCOUNT) : 1;

  const planPrice = Math.round(planMetadata.price * cycleMultiplier * discountedFactor);
  const baseDays = cycle === 'yearly' ? 365 : 30;
  const firstPurchaseBonusDays = Number(planMetadata?.bonusDays || 30);
  const bonusDays = isFirstPaidPurchase ? firstPurchaseBonusDays : 0;
  const totalDays = baseDays + bonusDays;

  return {
    billingCycle: cycle,
    cycleLabel: cycle === 'yearly' ? 'year' : '30 days',
    planPrice,
    baseDays,
    bonusDays,
    totalDays
  };
};

/**
 * Create Order for Registration
 * Step 1: Create Razorpay order before vendor registration
 * 
 * POST /api/subscription/create
 * Body: { planKey, vendorData }
 */
exports.createSubscription = async (req, res) => {
  try {
    const { planKey, vendorData, billingCycle } = req.body;

    if (!planKey || !vendorData) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_DATA',
        message: 'Plan key and vendor data are required'
      });
    }

    if (!isValidPlanKey(planKey)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_PLAN',
        message: 'Invalid plan selected'
      });
    }

    if (planKey === 'free') {
      return res.status(400).json({
        success: false,
        error: 'FREE_PLAN',
        message: 'Free plan does not require payment'
      });
    }

    if (!vendorData.contact || !vendorData.contact.email) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_VENDOR_DATA',
        message: 'Contact email is required'
      });
    }

    const existingVendor = await Vendor.findOne({ 
      'contact.email': vendorData.contact.email.toLowerCase() 
    });

    if (existingVendor) {
      return res.status(400).json({
        success: false,
        error: 'EMAIL_EXISTS',
        message: 'A vendor with this email already exists'
      });
    }

    const existingUser = await User.findOne({
      email: vendorData.contact.email.toLowerCase()
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'ROLE_CONFLICT_EMAIL',
        message: 'This email is already registered as a user account. Please use a different email for vendor registration.'
      });
    }

    const planMetadata = getPlanMetadata(planKey);
    const terms = calculatePlanTerms(planMetadata, billingCycle, { isFirstPaidPurchase: true });
    const order = await razorpayService.createOrder({
      planKey,
      vendorEmail: vendorData.contact.email,
      businessName: vendorData.businessName,
      type: 'first-purchase',
      billingCycle: terms.billingCycle,
      planName: `${planMetadata.name} (${terms.billingCycle === 'yearly' ? 'Yearly' : 'Monthly'})`,
      planPrice: terms.planPrice
    });

    // Log transaction as 'created'
    await Transaction.create({
      orderId: order.orderId,
      vendorEmail: vendorData.contact.email.toLowerCase(),
      businessName: vendorData.businessName,
      planKey,
      planName: planMetadata.name,
      billingCycle: terms.billingCycle,
      amount: terms.planPrice,
      currency: order.currency,
      status: 'created',
      type: 'first-purchase',
      bonusDays: terms.bonusDays,
      durationDays: terms.baseDays,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency,
      planKey: order.planKey,
      planName: order.planName,
      billingCycle: terms.billingCycle,
      planPrice: order.planPrice,
      hasBonus: terms.bonusDays > 0,
      bonusDays: terms.bonusDays,
      baseDays: terms.baseDays,
      totalDays: terms.totalDays,
      message: terms.bonusDays > 0
        ? `Pay ₹${order.planPrice} for ${planMetadata.name} (${terms.billingCycle}) — ${terms.baseDays} days + ${terms.bonusDays} days FREE bonus = ${terms.totalDays} days total`
        : `Pay ₹${order.planPrice} for ${planMetadata.name} (${terms.billingCycle}) — ${terms.baseDays} days total`
    });

  } catch (error) {
    console.error('❌ Create order error:', error);
    res.status(500).json({
      success: false,
      error: error.error || 'ORDER_FAILED',
      message: error.message || 'Failed to create order'
    });
  }
};

/**
 * Complete Registration
 * Step 2: Verify payment and create vendor account
 * 
 * POST /api/subscription/complete-registration
 * Body: { razorpay_payment_id, razorpay_order_id, razorpay_signature, vendorData }
 */
exports.completeRegistration = async (req, res) => {
  try {
    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature, 
      vendorData 
    } = req.body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !vendorData) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PAYMENT_DATA',
        message: 'Payment verification data is incomplete'
      });
    }

    // CRITICAL: Verify payment signature
    const isValid = razorpayService.verifyPaymentSignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    });

    if (!isValid) {
      // Log failed signature verification
      await Transaction.findOneAndUpdate(
        { orderId: razorpay_order_id },
        { $set: { status: 'failed', paymentId: razorpay_payment_id, signatureValid: false, failedAt: new Date(), errorCode: 'INVALID_SIGNATURE', errorDescription: 'Payment signature verification failed' } }
      );
      return res.status(400).json({
        success: false,
        error: 'INVALID_SIGNATURE',
        message: 'Payment verification failed. Please contact support.'
      });
    }

    if (!vendorData || !vendorData.contact || !vendorData.contact.email) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_VENDOR_DATA',
        message: 'Vendor data is incomplete. Contact email is required.'
      });
    }

    const parsedYearsInBusiness = Number(vendorData.yearsInBusiness);
    if (!Number.isInteger(parsedYearsInBusiness) || parsedYearsInBusiness < 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_EXPERIENCE',
        message: 'Years in business is required and must be a non-negative integer.'
      });
    }

    const parsedTotalBookings = Number(vendorData.totalBookings);
    if (!Number.isInteger(parsedTotalBookings) || parsedTotalBookings < 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_TOTAL_BOOKINGS',
        message: 'Number of events done is required and must be a non-negative integer.'
      });
    }

    const parsedCompletedBookings = vendorData.completedBookings !== undefined && vendorData.completedBookings !== null && vendorData.completedBookings !== ''
      ? Number(vendorData.completedBookings)
      : parsedTotalBookings;

    if (!Number.isInteger(parsedCompletedBookings) || parsedCompletedBookings < 0 || parsedCompletedBookings > parsedTotalBookings) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_COMPLETED_BOOKINGS',
        message: 'Completed bookings must be between 0 and total bookings.'
      });
    }

    const parsedTeamSize = vendorData.teamSize !== undefined && vendorData.teamSize !== null && vendorData.teamSize !== ''
      ? Number(vendorData.teamSize)
      : undefined;

    if (parsedTeamSize !== undefined && (!Number.isInteger(parsedTeamSize) || parsedTeamSize < 0)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_TEAM_SIZE',
        message: 'Team size must be a non-negative integer.'
      });
    }

    // IDEMPOTENCY: Check if a vendor with this order already exists
    const vendorWithOrder = await Vendor.findOne({ 'subscription.lastOrderId': razorpay_order_id });
    if (vendorWithOrder) {
      return res.status(200).json({
        success: true,
        message: 'Registration already completed for this payment',
        vendor: {
          id: vendorWithOrder._id,
          businessName: vendorWithOrder.businessName,
          email: vendorWithOrder.contact.email
        }
      });
    }

    const existingVendor = await Vendor.findOne({ 
      'contact.email': vendorData.contact.email.toLowerCase() 
    });

    if (existingVendor) {
      return res.status(400).json({
        success: false,
        error: 'VENDOR_EXISTS',
        message: 'Vendor already registered with this email'
      });
    }

    const existingUser = await User.findOne({
      email: vendorData.contact.email.toLowerCase()
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'ROLE_CONFLICT_EMAIL',
        message: 'This email is already registered as a user account. Please use a different email for vendor registration.'
      });
    }

    // CRITICAL: Verify plan matches the Razorpay order to prevent plan-mismatch fraud
    const razorpayOrder = await razorpayService.fetchOrder(razorpay_order_id);
    const razorpayPaymentDetails = await razorpayService.fetchPayment(razorpay_payment_id);
    const planMetadata = getPlanMetadata(vendorData.subscription.planKey);

    const billingCycle = normalizeBillingCycle(vendorData?.subscription?.billingCycle);
    const terms = calculatePlanTerms(planMetadata, billingCycle, { isFirstPaidPurchase: true });

    if (!planMetadata || razorpayOrder.amount !== terms.planPrice * 100) {
      console.error(`❌ Registration order-plan mismatch: order amount ${razorpayOrder.amount} vs expected ${terms.planPrice * 100}`);
      return res.status(400).json({
        success: false,
        error: 'ORDER_PLAN_MISMATCH',
        message: 'Order amount does not match the selected plan. Please contact support.'
      });
    }

    const planPrice = terms.planPrice;
    const now = new Date();

    const durationDays = terms.baseDays;
    const bonusDays = terms.bonusDays;
    const totalDays = terms.totalDays;
    const expiryDate = new Date(now.getTime() + (totalDays * 24 * 60 * 60 * 1000));

    const subscriptionData = {
      planKey: vendorData.subscription.planKey,
      planName: vendorData.subscription.planName,
      billingCycle,
      status: 'active',
      startDate: now,
      expiryDate: expiryDate,
      firstPaidBonusUsed: true,
      lastPaymentId: razorpay_payment_id,
      lastOrderId: razorpay_order_id,
      lastPaymentAmount: planPrice,
      lastPaymentDate: now
    };

    const vendor = await Vendor.create({
      name: vendorData.name,
      businessName: vendorData.businessName,
      serviceType: (vendorData.serviceType || '').toLowerCase(),
      location: vendorData.location || {
        type: 'Point',
        coordinates: [75.8577, 22.7196]
      },
      city: vendorData.city,
      area: vendorData.area,
      address: vendorData.address,
      pincode: vendorData.pincode,
      pricing: vendorData.pricing,
      filters: vendorData.filters || {},
      contact: {
        phone: vendorData.contact.phone,
        email: vendorData.contact.email.toLowerCase(),
        whatsapp: vendorData.contact.whatsapp || vendorData.contact.phone
      },
      password: vendorData.password,
      yearsInBusiness: parsedYearsInBusiness,
      totalBookings: parsedTotalBookings,
      completedBookings: parsedCompletedBookings,
      teamSize: parsedTeamSize,
      description: vendorData.description,
      portfolio: vendorData.portfolio || [],
      photos: vendorData.photos || [],
      verified: true,
      isActive: true,
      subscription: subscriptionData
    });

    const token = vendor.generateAuthToken();

    // Update transaction to paid with full dynamic Razorpay data
    await Transaction.findOneAndUpdate(
      { orderId: razorpay_order_id },
      { $set: {
        status: 'paid',
        paymentId: razorpay_payment_id,
        vendor: vendor._id,
        signatureValid: true,
        paidAt: now,
        razorpayOrderData: razorpayOrder,
        razorpayPaymentData: razorpayPaymentDetails || null,
        method: razorpayPaymentDetails?.method || null,
        bank: razorpayPaymentDetails?.bank || null,
        wallet: razorpayPaymentDetails?.wallet || null,
        vpa: razorpayPaymentDetails?.vpa || null
      }}
    );

    res.status(201).json({
      success: true,
      message: bonusDays > 0
        ? `Registration successful! Your ${subscriptionData.planName} (${billingCycle}) plan is active for ${totalDays} days (includes ${bonusDays}-day bonus).`
        : `Registration successful! Your ${subscriptionData.planName} (${billingCycle}) plan is active for ${totalDays} days.`,
      token,
      vendor: {
        id: vendor._id,
        vendorId: vendor.vendorId,
        businessName: vendor.businessName,
        email: vendor.contact.email,
        subscription: {
          planKey: vendor.subscription.planKey,
          planName: vendor.subscription.planName,
          billingCycle: vendor.subscription.billingCycle,
          status: vendor.subscription.status,
          startDate: vendor.subscription.startDate,
          expiryDate: vendor.subscription.expiryDate,
          bonusDays: bonusDays
        }
      }
    });

  } catch (error) {
    console.error('❌ Complete registration error:', error);
    res.status(500).json({
      success: false,
      error: 'REGISTRATION_FAILED',
      message: error.message || 'Failed to complete registration'
    });
  }
};

/**
 * Purchase/Upgrade/Renew Plan
 * Creates a Razorpay order for payment
 * 
 * Logic:
 * - Free → Paid: If firstPaidBonusUsed=false → 30+30=60 days, else 30 days
 * - Same plan renewal: Queued as upcoming plan (activates when current expires)
 * - Any paid plan switch (upgrade or downgrade): Queued as upcoming plan (activates when current expires)
 * - If current plan is expired/free → Instant activation
 * 
 * POST /api/subscription/purchase
 * Body: { planKey }
 */
exports.purchasePlan = async (req, res) => {
  try {
    const { planKey, billingCycle } = req.body;
    const vendorId = req.vendor._id;

    if (!planKey) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PLAN',
        message: 'Plan key is required'
      });
    }

    if (!isValidPlanKey(planKey)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_PLAN',
        message: 'Invalid plan selected'
      });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: 'VENDOR_NOT_FOUND',
        message: 'Vendor not found'
      });
    }

    const selectedCycle = normalizeBillingCycle(billingCycle);
    const currentPlanKey = vendor.subscription.planKey;
    const currentBillingCycle = normalizeBillingCycle(vendor.subscription.billingCycle);
    const currentStatus = vendor.subscription.status;
    const currentExpiry = vendor.subscription.expiryDate;
    const now = new Date();
    const planMetadata = getPlanMetadata(planKey);
    
    // Check if there's already an upcoming plan queued
    if (vendor.subscription.upcomingPlan?.planKey) {
      return res.status(400).json({
        success: false,
        error: 'UPCOMING_PLAN_EXISTS',
        message: `You already have a ${vendor.subscription.upcomingPlan.planName} plan queued. It will activate on ${new Date(vendor.subscription.upcomingPlan.scheduledStartDate).toLocaleDateString('en-IN')}. Please wait for it to activate first.`
      });
    }
    
    // Determine purchase type
    let purchaseType;
    const isSamePlanAndCycle = currentPlanKey === planKey && currentBillingCycle === selectedCycle;

    if (currentPlanKey === 'free' || currentStatus === 'free') {
      purchaseType = 'first-purchase';
    } else if (isSamePlanAndCycle) {
      purchaseType = 'renewal';
    } else {
      purchaseType = 'upgrade';
    }

    // Check if this will be queued or instant
    const isActivePlan = currentStatus === 'active' && currentExpiry && currentExpiry > now;
    const willBeQueued = isActivePlan && purchaseType !== 'first-purchase';

    // Bonus is strictly one-time and only for the first paid purchase (free -> paid).
    // It must never apply on renewals or plan switches.
    const isEligibleForBonus = purchaseType === 'first-purchase' && !vendor.subscription.firstPaidBonusUsed;
    const terms = calculatePlanTerms(planMetadata, selectedCycle, { isFirstPaidPurchase: isEligibleForBonus });
    const baseDays = terms.baseDays;
    const bonusDays = terms.bonusDays;
    const totalDays = terms.totalDays;

    // Calculate scheduled start date for queued plans
    const scheduledStartDate = willBeQueued ? currentExpiry : now;


    const order = await razorpayService.createOrder({
      planKey,
      vendorEmail: vendor.contact.email,
      businessName: vendor.businessName,
      type: purchaseType,
      billingCycle: terms.billingCycle,
      planName: `${planMetadata.name} (${terms.billingCycle === 'yearly' ? 'Yearly' : 'Monthly'})`,
      planPrice: terms.planPrice
    });

    // Log transaction as 'created'
    await Transaction.create({
      orderId: order.orderId,
      vendor: vendor._id,
      vendorEmail: vendor.contact.email,
      businessName: vendor.businessName,
      planKey,
      planName: planMetadata.name,
      billingCycle: terms.billingCycle,
      amount: terms.planPrice,
      currency: order.currency,
      status: 'created',
      type: purchaseType,
      bonusDays,
      durationDays: baseDays,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    let message;
    if (willBeQueued) {
      message = isEligibleForBonus
        ? `${planMetadata.name} (${terms.billingCycle}) — ₹${terms.planPrice} for ${baseDays}+${bonusDays} bonus = ${totalDays} days. Will activate on ${scheduledStartDate.toLocaleDateString('en-IN')} when your current plan expires.`
        : `${planMetadata.name} (${terms.billingCycle}) — ₹${terms.planPrice} for ${baseDays} days. Will activate on ${scheduledStartDate.toLocaleDateString('en-IN')} when your current plan expires.`;
    } else {
      message = isEligibleForBonus
        ? `${planMetadata.name} (${terms.billingCycle}) — Pay ₹${terms.planPrice} for ${baseDays} days + ${bonusDays} days FREE bonus = ${totalDays} days total`
        : `${planMetadata.name} (${terms.billingCycle}) — Pay ₹${terms.planPrice} for ${baseDays} days`;
    }

    res.status(200).json({
      success: true,
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency,
      planKey: order.planKey,
      planName: order.planName,
      billingCycle: terms.billingCycle,
      planPrice: order.planPrice,
      purchaseType,
      willBeQueued,
      scheduledStartDate: willBeQueued ? scheduledStartDate : null,
      hasBonus: isEligibleForBonus,
      bonusDays,
      baseDays,
      totalDays,
      message
    });

  } catch (error) {
    console.error('❌ Purchase plan error:', error);
    res.status(500).json({
      success: false,
      error: error.error || 'PURCHASE_FAILED',
      message: error.message || 'Failed to create order'
    });
  }
};

/**
 * Verify Payment and Activate Plan
 * POST /api/subscription/verify-payment
 * Body: { razorpay_payment_id, razorpay_order_id, razorpay_signature, planKey }
 */
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      planKey,
      billingCycle
    } = req.body;
    const vendorId = req.vendor._id;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !planKey) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_DATA',
        message: 'Payment verification data is incomplete'
      });
    }

    // CRITICAL: Verify payment signature
    const isValid = razorpayService.verifyPaymentSignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    });

    if (!isValid) {
      await Transaction.findOneAndUpdate(
        { orderId: razorpay_order_id },
        { $set: { status: 'failed', paymentId: razorpay_payment_id, signatureValid: false, failedAt: new Date(), errorCode: 'INVALID_SIGNATURE', errorDescription: 'Payment signature verification failed' } }
      );
      return res.status(400).json({
        success: false,
        error: 'INVALID_SIGNATURE',
        message: 'Payment verification failed'
      });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: 'VENDOR_NOT_FOUND',
        message: 'Vendor not found'
      });
    }

    // IDEMPOTENCY: Check if this payment was already processed
    const alreadyProcessed = await Transaction.findOne({
      $or: [{ paymentId: razorpay_payment_id }, { orderId: razorpay_order_id }],
      status: 'paid'
    });
    if (alreadyProcessed) {
      return res.status(200).json({
        success: true,
        message: 'Payment already processed',
        subscription: {
          planKey: vendor.subscription.planKey,
          planName: vendor.subscription.planName,
          status: vendor.subscription.status,
          expiryDate: vendor.subscription.expiryDate
        }
      });
    }

    // CRITICAL: Verify plan matches the Razorpay order to prevent plan-mismatch fraud
    const razorpayOrder = await razorpayService.fetchOrder(razorpay_order_id);
    const razorpayPaymentDetails = await razorpayService.fetchPayment(razorpay_payment_id);
    const planMetadata = getPlanMetadata(planKey);
    const normalizedCycle = normalizeBillingCycle(billingCycle);
    const amountTerms = calculatePlanTerms(planMetadata, normalizedCycle, { isFirstPaidPurchase: false });
    if (!planMetadata || razorpayOrder.amount !== amountTerms.planPrice * 100) {
      console.error(`❌ Order-plan mismatch: order amount ${razorpayOrder.amount} vs expected ${amountTerms.planPrice * 100} for plan ${planKey} (${normalizedCycle})`);
      return res.status(400).json({
        success: false,
        error: 'ORDER_PLAN_MISMATCH',
        message: 'Order amount does not match the selected plan. Please contact support.'
      });
    }
    const now = new Date();
    const currentPlanKey = vendor.subscription.planKey;
    const currentBillingCycle = normalizeBillingCycle(vendor.subscription.billingCycle);
    const currentStatus = vendor.subscription.status;
    const currentExpiry = vendor.subscription.expiryDate;

    // Determine purchase type
    let purchaseType;
    const isSamePlanAndCycle = currentPlanKey === planKey && currentBillingCycle === normalizedCycle;
    if (currentPlanKey === 'free' || currentStatus === 'free') {
      purchaseType = 'first-purchase';
    } else if (isSamePlanAndCycle) {
      purchaseType = 'renewal';
    } else {
      purchaseType = 'upgrade';
    }

    // Determine if current plan is still active (not expired)
    const isCurrentPlanActive = currentStatus === 'active' && currentExpiry && currentExpiry > now;
    const shouldQueue = isCurrentPlanActive && purchaseType !== 'first-purchase';

    // Bonus is strictly one-time and only for the first paid purchase (free -> paid).
    // It must never apply on renewals or plan switches.
    const isEligibleForBonus = purchaseType === 'first-purchase' && !vendor.subscription.firstPaidBonusUsed;
    const terms = calculatePlanTerms(planMetadata, normalizedCycle, { isFirstPaidPurchase: isEligibleForBonus });
    const baseDays = terms.baseDays;
    const bonusDays = terms.bonusDays;
    const totalDays = terms.totalDays;


    if (shouldQueue) {
      // ==========================================
      // QUEUE AS UPCOMING PLAN (don't overwrite)
      // ==========================================
      const scheduledStartDate = currentExpiry;
      const scheduledExpiryDate = new Date(scheduledStartDate.getTime() + (totalDays * 24 * 60 * 60 * 1000));

      vendor.subscription.upcomingPlan = {
        planKey,
        planName: planMetadata.name,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        amount: terms.planPrice,
        billingCycle: normalizedCycle,
        purchaseDate: now,
        bonusDays,
        durationDays: baseDays,
        scheduledStartDate,
        notes: isEligibleForBonus
          ? `${planMetadata.name} — ${baseDays}+${bonusDays} bonus = ${totalDays} days. Starts ${scheduledStartDate.toLocaleDateString('en-IN')}, expires ${scheduledExpiryDate.toLocaleDateString('en-IN')}`
          : `${planMetadata.name} — ${baseDays} days. Starts ${scheduledStartDate.toLocaleDateString('en-IN')}, expires ${scheduledExpiryDate.toLocaleDateString('en-IN')}`
      };

      // Mark bonus as used immediately (so it's reserved for this queued plan)
      if (isEligibleForBonus) {
        vendor.subscription.firstPaidBonusUsed = true;
      }

      // Paid plans always get verified badge automatically.
      if (isPaidPlanKey(vendor.subscription.planKey) || isPaidPlanKey(planKey)) {
        vendor.verified = true;
      }

      await vendor.save();

      // Update transaction to paid (queued activation)
      await Transaction.findOneAndUpdate(
        { orderId: razorpay_order_id },
        { $set: {
          status: 'paid',
          paymentId: razorpay_payment_id,
          signatureValid: true,
          paidAt: now,
          razorpayOrderData: razorpayOrder,
          razorpayPaymentData: razorpayPaymentDetails || null,
          method: razorpayPaymentDetails?.method || null,
          bank: razorpayPaymentDetails?.bank || null,
          wallet: razorpayPaymentDetails?.wallet || null,
          vpa: razorpayPaymentDetails?.vpa || null
        }}
      );

      return res.status(200).json({
        success: true,
        queued: true,
        message: isEligibleForBonus
          ? `🎉 ${planMetadata.name} plan purchased! It will activate on ${scheduledStartDate.toLocaleDateString('en-IN')} when your current plan expires. You'll get ${bonusDays} bonus days — ${totalDays} days total!`
          : `✅ ${planMetadata.name} plan purchased! It will activate on ${scheduledStartDate.toLocaleDateString('en-IN')} when your current plan expires.`,
        purchaseType,
        hasBonus: isEligibleForBonus,
        bonusDays,
        totalDays,
        upcomingPlan: {
          planKey,
          planName: planMetadata.name,
          scheduledStartDate,
          scheduledExpiryDate,
          totalDays
        },
        currentPlan: {
          planKey: vendor.subscription.planKey,
          planName: vendor.subscription.planName,
          expiryDate: vendor.subscription.expiryDate
        }
      });
    }

    // ==========================================
    // INSTANT ACTIVATION (free/expired plan)
    // ==========================================
    const startDate = now;
    const expiryDate = new Date(startDate.getTime() + (totalDays * 24 * 60 * 60 * 1000));


    // Update subscription immediately
    vendor.subscription.planKey = planKey;
    vendor.subscription.planName = planMetadata.name;
    vendor.subscription.billingCycle = normalizedCycle;
    vendor.subscription.status = 'active';
    vendor.subscription.startDate = now;
    vendor.subscription.expiryDate = expiryDate;
    vendor.subscription.lastPaymentId = razorpay_payment_id;
    vendor.subscription.lastOrderId = razorpay_order_id;
    vendor.subscription.lastPaymentAmount = terms.planPrice;
    vendor.subscription.lastPaymentDate = now;

    if (isEligibleForBonus) {
      vendor.subscription.firstPaidBonusUsed = true;
    }

    // Ensure vendor is active
    vendor.isActive = true;

    // Paid plans always get verified badge automatically.
    if (isPaidPlanKey(planKey)) {
      vendor.verified = true;
    }

    await vendor.save();

    try {
      await applyVendorMediaEntitlements(vendor._id, planKey);
    } catch (entitlementError) {
      console.error(`❌ Entitlement sync failed after payment activation for vendor ${vendor._id}:`, entitlementError.message);
    }

    // Update transaction to paid (instant activation)
    await Transaction.findOneAndUpdate(
      { orderId: razorpay_order_id },
      { $set: {
        status: 'paid',
        paymentId: razorpay_payment_id,
        signatureValid: true,
        paidAt: now,
        razorpayOrderData: razorpayOrder,
        razorpayPaymentData: razorpayPaymentDetails || null,
        method: razorpayPaymentDetails?.method || null,
        bank: razorpayPaymentDetails?.bank || null,
        wallet: razorpayPaymentDetails?.wallet || null,
        vpa: razorpayPaymentDetails?.vpa || null
      }}
    );

    res.status(200).json({
      success: true,
      queued: false,
      message: isEligibleForBonus
        ? `${planMetadata.name} plan activated! You got 30 days FREE bonus — ${totalDays} days total.`
        : `${planMetadata.name} plan activated for ${baseDays} days.`,
      purchaseType,
      hasBonus: isEligibleForBonus,
      bonusDays,
      totalDays,
      subscription: {
        planKey: vendor.subscription.planKey,
        planName: vendor.subscription.planName,
        billingCycle: vendor.subscription.billingCycle,
        status: vendor.subscription.status,
        startDate: vendor.subscription.startDate,
        expiryDate: vendor.subscription.expiryDate,
        lastPaymentAmount: vendor.subscription.lastPaymentAmount,
        lastPaymentDate: vendor.subscription.lastPaymentDate
      }
    });

  } catch (error) {
    console.error('❌ Verify payment error:', error);
    res.status(500).json({
      success: false,
      error: 'VERIFICATION_FAILED',
      message: 'Failed to verify payment'
    });
  }
};

/**
 * Download Receipt
 * GET /api/subscription/receipt/:paymentId
 */
exports.downloadReceipt = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const vendorId = req.vendor._id;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: 'VENDOR_NOT_FOUND',
        message: 'Vendor not found'
      });
    }

    // Look up the transaction by paymentId and vendor
    const txn = await Transaction.findOne({ paymentId, vendor: vendorId }).lean();

    if (!txn) {
      return res.status(404).json({
        success: false,
        error: 'PAYMENT_NOT_FOUND',
        message: 'Payment not found in history'
      });
    }

    const receiptData = {
      receiptId: `RCP_${Date.now()}`,
      paymentId: txn.paymentId,
      orderId: txn.orderId,
      vendorName: vendor.businessName,
      vendorEmail: vendor.contact?.email || 'N/A',
      planName: txn.planName,
      planKey: txn.planKey,
      billingCycle: txn.billingCycle || 'monthly',
      amount: txn.amount,
      date: txn.paidAt || txn.createdAt,
      status: txn.status === 'paid' ? 'success' : txn.status,
      type: txn.type === 'first-purchase' ? 'registration' : txn.type,
      durationDays: txn.durationDays || 30,
      bonusDays: txn.bonusDays || 0,
      notes: txn.errorDescription || null
    };

    res.status(200).json({
      success: true,
      receipt: receiptData
    });

  } catch (error) {
    console.error('❌ Download receipt error:', error);
    res.status(500).json({
      success: false,
      error: 'RECEIPT_FAILED',
      message: 'Failed to generate receipt'
    });
  }
};

/**
 * Get Subscription Status
 * GET /api/subscription/status
 */
exports.getSubscriptionStatus = async (req, res) => {
  try {
    const vendorId = req.vendor._id;

    const vendor = await Vendor.findById(vendorId).select('subscription businessName');
    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: 'VENDOR_NOT_FOUND',
        message: 'Vendor not found'
      });
    }

    // Check if expired and auto-downgrade to free
    const now = new Date();
    if (vendor.subscription.status === 'active' && vendor.subscription.expiryDate && vendor.subscription.expiryDate <= now) {
      vendor.subscription.planKey = 'free';
      vendor.subscription.planName = 'Free';
      vendor.subscription.billingCycle = 'monthly';
      vendor.subscription.status = 'free';
      vendor.subscription.startDate = null;
      vendor.subscription.expiryDate = null;
      vendor.verified = false;
      await vendor.save();
      try {
        await applyVendorMediaEntitlements(vendor._id, 'free');
      } catch (entitlementError) {
        console.error(`❌ Entitlement sync failed after auto-downgrade for vendor ${vendor._id}:`, entitlementError.message);
      }
    } else if (vendor.subscription.status === 'expired') {
      vendor.subscription.planKey = 'free';
      vendor.subscription.planName = 'Free';
      vendor.subscription.billingCycle = 'monthly';
      vendor.subscription.status = 'free';
      vendor.subscription.startDate = null;
      vendor.subscription.expiryDate = null;
      vendor.verified = false;
      await vendor.save();
      try {
        await applyVendorMediaEntitlements(vendor._id, 'free');
      } catch (entitlementError) {
        console.error(`❌ Entitlement sync failed for expired vendor ${vendor._id}:`, entitlementError.message);
      }
    } else if (
      vendor.subscription.status === 'active' &&
      isPaidPlanKey(vendor.subscription.planKey) &&
      !vendor.verified
    ) {
      vendor.verified = true;
      await vendor.save();
    }

    // Calculate remaining days for current plan
    let daysRemaining = 0;
    if (vendor.subscription.status === 'active' && vendor.subscription.expiryDate) {
      daysRemaining = Math.max(0, Math.ceil((vendor.subscription.expiryDate - now) / (1000 * 60 * 60 * 24)));
    }

    // Check if there's an upcoming/queued plan
    const upcomingPlan = vendor.subscription.upcomingPlan?.planKey ? {
      planKey: vendor.subscription.upcomingPlan.planKey,
      planName: vendor.subscription.upcomingPlan.planName,
      amount: vendor.subscription.upcomingPlan.amount,
      billingCycle: vendor.subscription.upcomingPlan.billingCycle || 'monthly',
      purchaseDate: vendor.subscription.upcomingPlan.purchaseDate,
      scheduledStartDate: vendor.subscription.upcomingPlan.scheduledStartDate,
      bonusDays: vendor.subscription.upcomingPlan.bonusDays || 0,
      durationDays: vendor.subscription.upcomingPlan.durationDays || 30,
      totalDays: (vendor.subscription.upcomingPlan.durationDays || 30) + (vendor.subscription.upcomingPlan.bonusDays || 0),
      notes: vendor.subscription.upcomingPlan.notes
    } : null;

    res.status(200).json({
      success: true,
      subscription: {
        ...vendor.subscription.toObject(),
        daysRemaining,
        isExpired: vendor.subscription.status === 'expired',
        isActive: vendor.subscription.status === 'active',
        isFree: vendor.subscription.status === 'free' || vendor.subscription.planKey === 'free',
        hasUpcomingPlan: !!upcomingPlan,
        upcomingPlan
      }
    });

  } catch (error) {
    console.error('❌ Get subscription status error:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_FAILED',
      message: 'Failed to fetch subscription status'
    });
  }
};

/**
 * Get Payment History
 * GET /api/subscription/payment-history
 */
exports.getPaymentHistory = async (req, res) => {
  try {
    const vendorId = req.vendor._id;

    const vendor = await Vendor.findById(vendorId).select('businessName');
    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: 'VENDOR_NOT_FOUND',
        message: 'Vendor not found'
      });
    }

    const transactions = await Transaction.find({ vendor: vendorId })
      .sort({ createdAt: -1 })
      .lean();

    // Map Transaction fields to the response shape the frontend expects
    const paymentHistory = transactions.map(t => ({
      paymentId: t.paymentId,
      orderId: t.orderId,
      paymentDate: t.paidAt || t.createdAt,
      planName: t.planName,
      planKey: t.planKey,
      billingCycle: t.billingCycle || 'monthly',
      type: t.type === 'first-purchase' ? 'registration' : t.type,
      amount: t.amount,
      status: t.status === 'paid' ? 'success' : t.status,
      durationDays: t.durationDays,
      bonusDays: t.bonusDays,
      method: t.method,
      notes: t.errorDescription || null
    }));

    const successfulPayments = paymentHistory.filter(p => p.status === 'success');

    return res.status(200).json({
      success: true,
      data: {
        businessName: vendor.businessName,
        totalPayments: paymentHistory.length,
        totalAmountPaid: successfulPayments.reduce((sum, p) => sum + p.amount, 0),
        paymentHistory
      }
    });

  } catch (error) {
    console.error('❌ Get payment history error:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_FAILED',
      message: 'Failed to fetch payment history'
    });
  }
};

/**
 * Cancel Order (user dismissed Razorpay modal)
 * POST /api/subscription/cancel-order  (public — registration flow)
 * POST /api/subscription/cancel-order-auth  (authenticated — purchase flow)
 * Body: { orderId }
 */
exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'orderId is required' });
    }

    const result = await Transaction.findOneAndUpdate(
      { orderId, status: 'created' },
      { $set: { status: 'cancelled', cancelledAt: new Date() } },
      { new: true }
    );

    if (!result) {
      return res.status(200).json({ success: true, message: 'Order already processed or not found' });
    }

    res.status(200).json({ success: true, message: 'Order cancelled' });
  } catch (error) {
    console.error('❌ Cancel order error:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel order' });
  }
};

/**
 * Mark Order Failed (payment failed in Razorpay modal)
 * POST /api/subscription/mark-failed (public)
 * POST /api/subscription/mark-failed-auth (authenticated)
 * Body: { orderId, paymentId?, error? }
 */
exports.markOrderFailed = async (req, res) => {
  try {
    const { orderId, paymentId = null, error = {} } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'orderId is required' });
    }

    const update = {
      status: 'failed',
      failedAt: new Date(),
      paymentId,
      errorCode: error.code || null,
      errorDescription: error.description || null,
      errorSource: error.source || null,
      errorReason: error.reason || null
    };

    const result = await Transaction.findOneAndUpdate(
      { orderId, status: { $in: ['created', 'attempted'] } },
      { $set: update },
      { new: true }
    );

    if (!result) {
      return res.status(200).json({ success: true, message: 'Order already processed or not found' });
    }

    return res.status(200).json({ success: true, message: 'Order marked as failed' });
  } catch (error) {
    console.error('❌ Mark order failed error:', error);
    return res.status(500).json({ success: false, message: 'Failed to mark order as failed' });
  }
};

module.exports = exports;
