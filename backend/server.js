const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { notFound, errorHandlerAdvanced } = require('./middleware/errorMiddleware');

// Load environment variables
dotenv.config();

// Validate critical environment variables
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in environment variables');
}

// Connect to MongoDB
connectDB();

// Initialize Express app
const app = express();

// Respect X-Forwarded-* headers when deployed behind a trusted reverse proxy (e.g., AWS ALB/Nginx).
// This keeps req.ip accurate for rate limiting and audit logs.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Middleware
app.use(cors());

// CRITICAL: Raw body parser for Razorpay webhooks (MUST be BEFORE express.json())
// Webhook signature verification requires raw request body
app.use('/api/webhook/razorpay', express.raw({ type: 'application/json' }), (req, res, next) => {
  // Store raw body for signature verification
  req.rawBody = req.body.toString('utf8');
  next();
});

// Standard JSON parser for all other routes with increased limit for vendor registration
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Import Routes
const serviceRoutes = require('./routes/serviceRoutes');
const searchRoutes = require('./routes/searchRoutes');
const vendorRoutes = require('./routes/vendorRoutesNew');
const inquiryRoutes = require('./routes/inquiryRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const dynamicRoutes = require('./routes/dynamicRoutes');
const taxonomyRoutes = require('./routes/taxonomyRoutes');
const vendorProfileRoutes = require('./routes/vendorProfileRoutes');
const locationRoutes = require('./routes/locationRoutes');
const blogRoutes = require('./routes/blogRoutes');
const vendorBlogRoutes = require('./routes/vendorBlogRoutes');
const passwordResetRoutes = require('./routes/passwordResetRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes'); // Production-ready Razorpay subscription
const notificationRoutes = require('./routes/notificationRoutes'); // Vendor notifications
const razorpayWebhook = require('./webhooks/razorpayWebhook'); // Webhook handler

// Use Routes
app.use('/api/services', serviceRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dynamic', dynamicRoutes); // Dynamic data endpoints
app.use('/api/taxonomy', taxonomyRoutes); // Master taxonomy system
app.use('/api/vendor-profile', vendorProfileRoutes); // Vendor profile management
app.use('/api/locations', locationRoutes); // Cities and areas from OSM
app.use('/api/blogs', blogRoutes); // Public blog endpoints
app.use('/api/vendor-blogs', vendorBlogRoutes); // Public vendor blog endpoints
app.use('/api/subscription', subscriptionRoutes); // Razorpay subscription management
app.use('/api/notifications', notificationRoutes); // Vendor notifications
app.use('/api/password-reset', passwordResetRoutes); // Password reset
app.use('/api/auth', passwordResetRoutes); // Alias used by frontend (forgot/reset password)

// Webhook endpoint uses raw body parser configured above
app.post('/api/webhook/razorpay', razorpayWebhook.handleRazorpayWebhook);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'B2B Service Management API Server - Dynamic Architecture',
    version: '2.0.0',
    architecture: 'Service-Driven Dynamic Filters',
    endpoints: {
      users: {
        register: 'POST /api/users/register',
        login: 'POST /api/users/login',
        profile: 'GET /api/users/profile',
        updateProfile: 'PUT /api/users/profile',
        logout: 'POST /api/users/logout'
      },
      taxonomy: {
        categories: 'GET /api/taxonomy/categories',
        subcategories: 'GET /api/taxonomy/subcategories?categoryId=xxx',
        services: 'GET /api/taxonomy/services?subcategoryId=xxx',
        allServices: 'GET /api/taxonomy/services/all',
        search: 'GET /api/taxonomy/search?q=keyword',
        hierarchy: 'GET /api/taxonomy/hierarchy',
        byId: 'GET /api/taxonomy/:taxonomyId'
      },
      services: {
        getAll: 'GET /api/services',
        getFilters: 'GET /api/services/:serviceId/filters',
        detectIntent: 'POST /api/detect-service-intent',
        suggestions: 'GET /api/services/suggestions?q=query',
        commonFilters: 'GET /api/common-filters'
      },
      search: {
        search: 'POST /api/search',
        featured: 'GET /api/search/featured',
        byService: 'GET /api/search/by-service/:serviceType',
        vendorDetail: 'GET /api/search/vendor/:vendorId'
      },
      vendors: {
        register: 'POST /api/vendors/register',
        login: 'POST /api/vendors/login',
        get: 'GET /api/vendors/:vendorId',
        update: 'PUT /api/vendors/:vendorId',
        addReview: 'POST /api/vendors/:vendorId/review',
        admin: {
          getAll: 'GET /api/vendors/admin/all',
          approve: 'PUT /api/vendors/admin/approve/:vendorId',
          reject: 'PUT /api/vendors/admin/reject/:vendorId'
        }
      },
      inquiries: {
        create: 'POST /api/inquiries',
        getAll: 'GET /api/inquiries',
        getById: 'GET /api/inquiries/:inquiryId',
        getByVendor: 'GET /api/inquiries/vendor/:vendorId',
        updateStatus: 'PATCH /api/inquiries/:inquiryId/status',
        delete: 'DELETE /api/inquiries/:inquiryId',
        stats: 'GET /api/inquiries/stats'
      },
      locations: {
        searchCities: 'GET /api/locations/cities/search?q=Mumbai',
        nearbyCities: 'GET /api/locations/cities/nearby?lat=19.0760&lon=72.8777&radius=50000',
        cityById: 'GET /api/locations/cities/:cityId',
        cityAreas: 'GET /api/locations/cities/:cityId/areas',
        searchAreas: 'GET /api/locations/areas/search?cityId=xxx&q=Bandra',
        nearbyAreas: 'GET /api/locations/areas/nearby?lat=19.0596&lon=72.8295&radius=25000',
        stats: 'GET /api/locations/stats'
      }
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware (must be after routes)
app.use(notFound);
app.use(errorHandlerAdvanced);

// ============================================
// CRON: Auto-manage subscriptions
// Runs every 24 hours:
// 1. Activate queued upcoming plans when current plan expires
// 2. Downgrade expired paid plans to free
// ============================================
const Vendor = require('./models/VendorNew');
const { applyVendorMediaEntitlements } = require('./services/subscriptionEntitlementService');
const PAID_PLAN_KEYS = ['starter', 'growth', 'premium'];

let isSubscriptionCronRunning = false;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isTransientCronError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toUpperCase();
  const name = String(error?.name || '').toLowerCase();

  if (['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EAI_AGAIN'].includes(code)) {
    return true;
  }

  return (
    message.includes('econnreset') ||
    message.includes('socket hang up') ||
    message.includes('timed out') ||
    name.includes('mongonetwork')
  );
};

const withCronRetry = async (taskFn, maxAttempts = 3) => {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await taskFn();
    } catch (error) {
      lastError = error;
      const shouldRetry = isTransientCronError(error) && attempt < maxAttempts;

      if (!shouldRetry) {
        throw error;
      }

      const backoffMs = attempt * 1500;
      console.warn(`⚠️ [Cron] Transient error on attempt ${attempt}/${maxAttempts}: ${error.message}. Retrying in ${backoffMs}ms...`);
      await wait(backoffMs);
    }
  }

  throw lastError;
};

const runSubscriptionExpiryCheck = async () => {
  if (isSubscriptionCronRunning) {
    console.warn('⚠️ [Cron] Subscription check skipped: previous run still in progress.');
    return;
  }

  isSubscriptionCronRunning = true;

  try {
    await withCronRetry(async () => {
      const now = new Date();

      // ==========================================
      // STEP 0: Reconcile legacy paid vendors -> verified badge
      // ==========================================
      const paidReconcileResult = await Vendor.updateMany(
        {
          'subscription.status': 'active',
          'subscription.planKey': { $in: PAID_PLAN_KEYS },
          verified: { $ne: true }
        },
        {
          $set: {
            verified: true
          }
        }
      );

      if (paidReconcileResult.modifiedCount > 0) {
      }
      
      // ==========================================
      // STEP 1: Activate queued upcoming plans
      // ==========================================
      const vendorsWithUpcomingPlans = await Vendor.find({
        'subscription.upcomingPlan.planKey': { $exists: true, $ne: null },
        'subscription.upcomingPlan.scheduledStartDate': { $lte: now }
      });

      for (const vendor of vendorsWithUpcomingPlans) {
        const upcoming = vendor.subscription.upcomingPlan;
        const totalDays = upcoming.durationDays + (upcoming.bonusDays || 0);
        const startDate = now;
        const expiryDate = new Date(startDate.getTime() + (totalDays * 24 * 60 * 60 * 1000));

        // Activate the queued plan
        vendor.subscription.planKey = upcoming.planKey;
        vendor.subscription.planName = upcoming.planName;
        vendor.subscription.billingCycle = upcoming.billingCycle || 'monthly';
        vendor.subscription.status = 'active';
        vendor.subscription.startDate = startDate;
        vendor.subscription.expiryDate = expiryDate;
        vendor.subscription.lastPaymentId = upcoming.paymentId;
        vendor.subscription.lastOrderId = upcoming.orderId;
        vendor.subscription.lastPaymentAmount = upcoming.amount;
        vendor.subscription.lastPaymentDate = upcoming.purchaseDate;

        if (PAID_PLAN_KEYS.includes(String(upcoming.planKey || '').toLowerCase())) {
          vendor.verified = true;
        }

        // Clear the upcoming plan queue
        vendor.subscription.upcomingPlan = {
          planKey: null,
          planName: null,
          paymentId: null,
          orderId: null,
          amount: null,
          billingCycle: 'monthly',
          purchaseDate: null,
          bonusDays: 0,
          durationDays: 30,
          scheduledStartDate: null,
          notes: null
        };

        await vendor.save();

        try {
          await applyVendorMediaEntitlements(vendor._id, upcoming.planKey);
        } catch (entitlementError) {
          console.error(`❌ [Cron] Entitlement sync failed for vendor ${vendor._id}:`, entitlementError.message);
        }
      }

      if (vendorsWithUpcomingPlans.length > 0) {
      }

      // ==========================================
      // STEP 2: Downgrade old active paid plans to free
      // ==========================================
      const vendorsToDowngrade = await Vendor.find(
        {
          'subscription.status': 'active',
          'subscription.planKey': { $ne: 'free' },
          'subscription.expiryDate': { $lte: now },
          // Don't expire if there's an upcoming plan ready to activate
          $or: [
            { 'subscription.upcomingPlan.planKey': null },
            { 'subscription.upcomingPlan.planKey': { $exists: false } }
          ]
        },
        { _id: 1 }
      ).lean();

      const result = await Vendor.updateMany(
        {
          'subscription.status': 'active',
          'subscription.planKey': { $ne: 'free' },
          'subscription.expiryDate': { $lte: now },
          // Don't expire if there's an upcoming plan ready to activate
          $or: [
            { 'subscription.upcomingPlan.planKey': null },
            { 'subscription.upcomingPlan.planKey': { $exists: false } }
          ]
        },
        {
          $set: {
            'subscription.planKey': 'free',
            'subscription.planName': 'Free',
            'subscription.billingCycle': 'monthly',
            'subscription.status': 'free',
            'subscription.startDate': null,
            'subscription.expiryDate': null,
            verified: false
          }
        }
      );

      if (result.modifiedCount > 0) {
        for (const vendor of vendorsToDowngrade) {
          try {
            await applyVendorMediaEntitlements(vendor._id, 'free');
          } catch (entitlementError) {
            console.error(`❌ [Cron] Free-plan entitlement sync failed for vendor ${vendor._id}:`, entitlementError.message);
          }
        }
      }
    });
  } catch (error) {
    console.error('❌ [Cron] Subscription check failed:', error.message);
  } finally {
    isSubscriptionCronRunning = false;
  }
};

// Run on startup after 30 seconds, then every 15 minutes for smoother transitions.
setTimeout(() => {
  runSubscriptionExpiryCheck();
  setInterval(runSubscriptionExpiryCheck, 15 * 60 * 1000);
}, 30000);

// Server Port
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
});

module.exports = app;
