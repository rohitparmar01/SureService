const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const keywordController = require('../controllers/keywordController');
const blogController = require('../controllers/blogController');
const transactionController = require('../controllers/transactionController');
const { adminOnly } = require('../middleware/adminMiddleware');

// All routes protected by adminOnly middleware
router.use(adminOnly);

/**
 * @route   GET /api/admin/stats
 * @desc    Get dashboard statistics
 * @access  Admin
 */
router.get('/stats', adminController.getDashboardStats);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with filters
 * @access  Admin
 */
router.get('/users', adminController.getAllUsers);

/**
 * @route   PATCH /api/admin/users/:userId
 * @desc    Update user status or role
 * @access  Admin
 */
router.patch('/users/:userId', adminController.updateUserStatus);

/**
 * @route   GET /api/admin/vendors
 * @desc    Get all vendors with filters
 * @access  Admin
 */
router.get('/vendors', adminController.getAllVendors);

/**
 * @route   GET /api/admin/vendors/:vendorId
 * @desc    Get single vendor by ID (includes inactive)
 * @access  Admin
 */
router.get('/vendors/:vendorId', adminController.getVendorById);

/**
 * @route   PATCH /api/admin/vendors/:vendorId/verify
 * @desc    Verify or unverify a vendor
 * @access  Admin
 */
router.patch('/vendors/:vendorId/verify', adminController.toggleVendorVerification);

/**
 * @route   PATCH /api/admin/vendors/:vendorId/status
 * @desc    Toggle vendor active status (hide/show)
 * @access  Admin
 */
router.patch('/vendors/:vendorId/status', adminController.toggleVendorStatus);

/**
 * @route   DELETE /api/admin/vendors/:vendorId
 * @desc    Permanently delete a vendor
 * @access  Admin
 */
router.delete('/vendors/:vendorId', adminController.deleteVendor);

/**
 * @route   GET /api/admin/activity
 * @desc    Get recent activity (vendors, inquiries, users)
 * @access  Admin
 */
router.get('/activity', adminController.getRecentActivity);

/**
 * @route   GET /api/admin/inquiries/pending
 * @desc    Get all pending inquiries awaiting approval
 * @access  Admin
 */
router.get('/inquiries/pending', adminController.getPendingInquiries);

/**
 * @route   GET /api/admin/inquiries/approval-stats
 * @desc    Get inquiry approval statistics
 * @access  Admin
 */
router.get('/inquiries/approval-stats', adminController.getInquiryApprovalStats);

/**
 * @route   GET /api/admin/inquiries
 * @desc    Get all inquiries from both collections
 * @access  Admin
 */
router.get('/inquiries', adminController.getAllInquiries);

/**
 * @route   PATCH /api/admin/inquiries/:inquiryId
 * @desc    Update inquiry status
 * @access  Admin
 */
router.patch('/inquiries/:inquiryId', adminController.updateInquiryStatus);

/**
 * @route   POST /api/admin/inquiries/:inquiryId/approve
 * @desc    Approve an inquiry (allows vendor to see it)
 * @access  Admin
 */
router.post('/inquiries/:inquiryId/approve', adminController.approveInquiry);

/**
 * @route   POST /api/admin/inquiries/:inquiryId/reject
 * @desc    Reject an inquiry with reason (vendor won't see it)
 * @access  Admin
 */
router.post('/inquiries/:inquiryId/reject', adminController.rejectInquiry);

/**
 * @route   POST /api/admin/inquiries/:inquiryId/reset-pending
 * @desc    Reset inquiry to pending review state
 * @access  Admin
 */
router.post('/inquiries/:inquiryId/reset-pending', adminController.resetInquiryToPending);

/**
 * @route   POST /api/admin/inquiries/:inquiryId/forward
 * @desc    Forward inquiry to a different vendor
 * @access  Admin
 */
router.post('/inquiries/:inquiryId/forward', adminController.forwardInquiry);

/**
 * @route   PATCH /api/admin/inquiries/:inquiryId/toggle-active
 * @desc    Mark inquiry as active/inactive
 * @access  Admin
 */
router.patch('/inquiries/:inquiryId/toggle-active', adminController.toggleInquiryActive);

// ====================================
// SERVICE KEYWORDS MANAGEMENT
// ====================================

/**
 * @route   GET /api/admin/keywords
 * @desc    Get all service keyword patterns
 * @access  Admin
 */
router.get('/keywords', keywordController.getAllKeywords);

/**
 * @route   GET /api/admin/keywords/:servicePattern
 * @desc    Get keywords for specific service pattern
 * @access  Admin
 */
router.get('/keywords/:servicePattern', keywordController.getKeywordsByService);

/**
 * @route   POST /api/admin/keywords
 * @desc    Add or update keyword pattern
 * @access  Admin
 * @body    { servicePattern, keywords, description, priority }
 */
router.post('/keywords', keywordController.addOrUpdateKeywords);

/**
 * @route   DELETE /api/admin/keywords/:id
 * @desc    Delete keyword pattern
 * @access  Admin
 */
router.delete('/keywords/:id', keywordController.deleteKeywords);

/**
 * @route   POST /api/admin/keywords/suggest
 * @desc    Get keyword suggestions for a service type
 * @access  Admin
 * @body    { serviceType }
 */
router.post('/keywords/suggest', keywordController.getKeywordSuggestions);

/**
 * @route   POST /api/admin/keywords/regenerate
 * @desc    Regenerate keywords for all vendors
 * @access  Admin
 */
router.post('/keywords/regenerate', keywordController.regenerateAllVendorKeywords);

/**
 * ==========================================
 * BLOG MANAGEMENT ROUTES
 * ==========================================
 */

/**
 * @route   GET /api/admin/blogs/stats
 * @desc    Get blog statistics
 * @access  Admin
 */
router.get('/blogs/stats', blogController.getBlogStats);

/**
 * @route   GET /api/admin/blogs
 * @desc    Get all blogs (admin view)
 * @access  Admin
 */
router.get('/blogs', blogController.getAllBlogs);

/**
 * @route   POST /api/admin/blogs
 * @desc    Create new blog
 * @access  Admin
 */
router.post('/blogs', blogController.createBlog);

/**
 * @route   GET /api/admin/blogs/:id
 * @desc    Get single blog by ID
 * @access  Admin
 */
router.get('/blogs/:id', blogController.getBlogById);

/**
 * @route   PUT /api/admin/blogs/:id
 * @desc    Update blog
 * @access  Admin
 */
router.put('/blogs/:id', blogController.updateBlog);

/**
 * @route   DELETE /api/admin/blogs/:id
 * @desc    Delete blog
 * @access  Admin
 */
router.delete('/blogs/:id', blogController.deleteBlog);

/**
 * @route   PATCH /api/admin/blogs/:id/toggle-publish
 * @desc    Toggle blog publish status
 * @access  Admin
 */
router.patch('/blogs/:id/toggle-publish', blogController.togglePublish);

/**
 * ==========================================
 * REVIEW MANAGEMENT ROUTES
 * ==========================================
 */

/**
 * @route   GET /api/admin/reviews/stats
 * @desc    Get review statistics
 * @access  Admin
 */
router.get('/reviews/stats', adminController.getReviewStats);

/**
 * @route   GET /api/admin/reviews/pending
 * @desc    Get all pending reviews
 * @access  Admin
 */
router.get('/reviews/pending', adminController.getPendingReviews);

/**
 * @route   GET /api/admin/reviews
 * @desc    Get all reviews with filters
 * @access  Admin
 */
router.get('/reviews', adminController.getAllReviews);

/**
 * @route   POST /api/admin/reviews/:reviewId/approve
 * @desc    Approve a review
 * @access  Admin
 */
router.post('/reviews/:reviewId/approve', adminController.approveReview);

/**
 * @route   POST /api/admin/reviews/:reviewId/reject
 * @desc    Reject a review
 * @access  Admin
 */
router.post('/reviews/:reviewId/reject', adminController.rejectReview);

/**
 * @route   DELETE /api/admin/reviews/:reviewId
 * @desc    Delete a review
 * @access  Admin
 */
router.delete('/reviews/:reviewId', adminController.deleteReview);

/**
 * ==========================================
 * MEDIA MANAGEMENT ROUTES
 * ==========================================
 */

/**
 * @route   GET /api/admin/media/stats
 * @desc    Get media statistics
 * @access  Admin
 */
router.get('/media/stats', adminController.getMediaStats);

/**
 * @route   GET /api/admin/media/pending
 * @desc    Get all pending media
 * @access  Admin
 */
router.get('/media/pending', adminController.getPendingMedia);

/**
 * @route   GET /api/admin/media
 * @desc    Get all media with filters
 * @access  Admin
 */
router.get('/media', adminController.getAllMedia);

/**
 * @route   POST /api/admin/media/:mediaId/approve
 * @desc    Approve media
 * @access  Admin
 */
router.post('/media/:mediaId/approve', adminController.approveMedia);

/**
 * @route   POST /api/admin/media/:mediaId/reject
 * @desc    Reject media
 * @access  Admin
 */
router.post('/media/:mediaId/reject', adminController.rejectMedia);

/**
 * @route   DELETE /api/admin/media/:mediaId
 * @desc    Delete media
 * @access  Admin
 */
router.delete('/media/:mediaId', adminController.deleteMedia);

/**
 * ==========================================
 * BLOG APPROVAL MANAGEMENT ROUTES
 * ==========================================
 */

/**
 * @route   GET /api/admin/vendor-blogs/stats
 * @desc    Get vendor blog statistics
 * @access  Admin
 */
router.get('/vendor-blogs/stats', adminController.getBlogStats);

/**
 * @route   GET /api/admin/vendor-blogs/pending
 * @desc    Get all pending vendor blogs
 * @access  Admin
 */
router.get('/vendor-blogs/pending', adminController.getPendingBlogs);

/**
 * @route   GET /api/admin/vendor-blogs
 * @desc    Get all vendor blogs with filters
 * @access  Admin
 */
router.get('/vendor-blogs', adminController.getAllBlogs);

/**
 * @route   POST /api/admin/vendor-blogs/:blogId/approve
 * @desc    Approve vendor blog
 * @access  Admin
 */
router.post('/vendor-blogs/:blogId/approve', adminController.approveBlog);

/**
 * @route   POST /api/admin/vendor-blogs/:blogId/reject
 * @desc    Reject vendor blog
 * @access  Admin
 */
router.post('/vendor-blogs/:blogId/reject', adminController.rejectBlog);

/**
 * @route   DELETE /api/admin/vendor-blogs/:blogId
 * @desc    Delete vendor blog
 * @access  Admin
 */
router.delete('/vendor-blogs/:blogId', adminController.deleteBlog);

/**
 * @route   GET /api/admin/export/vendors
 * @desc    Export all vendors to Excel
 * @access  Admin
 */
router.get('/export/vendors', adminController.exportVendors);

/**
 * @route   GET /api/admin/export/users
 * @desc    Export all users to Excel
 * @access  Admin
 */
router.get('/export/users', adminController.exportUsers);

/**
 * @route   GET /api/admin/export/inquiries
 * @desc    Export all inquiries to Excel
 * @access  Admin
 */
router.get('/export/inquiries', adminController.exportInquiries);

/**
 * @route   GET /api/admin/export/payments
 * @desc    Export all payment transactions to Excel
 * @access  Admin
 */
router.get('/export/payments', transactionController.exportPayments);

// ==========================================
// TRANSACTION LEDGER ROUTES (Dynamic, from Transaction collection)
// ==========================================

/**
 * @route   GET /api/admin/transactions/razorpay
 * @desc    Get live transactions directly from Razorpay (with local enrichment)
 * @access  Admin
 */
router.get('/transactions/razorpay', transactionController.getRazorpayTransactionsLive);

/**
 * @route   GET /api/admin/transactions
 * @desc    Get all transactions with dynamic filters, search, pagination
 * @access  Admin
 * @query   status, type, planKey, vendorEmail, method, from, to, search, page, limit, sort, order
 */
router.get('/transactions', transactionController.getAllTransactions);

/**
 * @route   GET /api/admin/transactions/stats
 * @desc    Get transaction summary stats (revenue, counts by status, etc.)
 * @access  Admin
 * @query   from, to
 */
router.get('/transactions/stats', transactionController.getTransactionStats);

/**
 * @route   GET /api/admin/transactions/:id
 * @desc    Get single transaction with full Razorpay data
 * @access  Admin
 */
router.get('/transactions/:id', transactionController.getTransactionById);

module.exports = router;
