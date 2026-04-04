const express = require('express');
const router = express.Router();
const {
  registerVendor,
  loginVendor,
  updateVendor,
  getVendor,
  addReview,
  deleteVendor,
  getAllVendors,
  approveVendor,
  rejectVendor,
  submitReview
} = require('../controllers/vendorControllerNew');
const { googleLoginVendor } = require('../controllers/googleAuthController');
const inquiryController = require('../controllers/inquiryController');
const { protect } = require('../middleware/authMiddleware');

// Public Routes

// @route   POST /api/vendors/register
// @desc    Register a new vendor
// @access  Public
router.post('/register', registerVendor);

// (Payment routes removed - payment gateway has been disabled)

// @route   POST /api/vendors/login
// @desc    Login vendor
// @access  Public
router.post('/login', loginVendor);

// @route   POST /api/vendors/google-login
// @desc    Google Sign-In for vendors
// @access  Public
router.post('/google-login', googleLoginVendor);

// @route   GET /api/vendors/:vendorId
// @desc    Get vendor profile
// @access  Public
router.get('/:vendorId', getVendor);

// @route   POST /api/vendors/:vendorId/reviews
// @desc    Submit review for vendor (pending approval)
// @access  Private (User)
router.post('/:vendorId/reviews', protect, submitReview);

// @route   POST /api/vendors/:vendorId/review (Legacy - kept for backward compatibility)
// @desc    Add review to vendor
// @access  Private (User)
router.post('/:vendorId/review', protect, addReview);

// Vendor Routes (should be protected with auth middleware)

// @route   GET /api/vendors/dashboard/inquiries
// @desc    Get inquiries for logged-in vendor (approved only)
// @access  Private (Vendor)
router.get('/dashboard/inquiries', protect, async (req, res, next) => {
  try {
    // Get vendor MongoDB _id from authenticated user (NOT the custom vendorId string)
    const vendorMongoId = req.user._id;
    
    if (!vendorMongoId) {
      return res.status(401).json({
        success: false,
        message: 'Vendor authentication required'
      });
    }


    // Pass MongoDB _id as STRING to inquiry controller
    req.params.vendorId = vendorMongoId.toString();
    return inquiryController.getVendorInquiries(req, res, next);
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/vendors/dashboard/inquiries/:inquiryId/respond
// @desc    Vendor accept or decline an inquiry
// @access  Private (Vendor)
router.post('/dashboard/inquiries/:inquiryId/respond', protect, async (req, res, next) => {
  try {
    const vendorMongoId = req.user._id;
    if (!vendorMongoId) {
      return res.status(401).json({ success: false, message: 'Vendor authentication required' });
    }
    return inquiryController.vendorRespondToInquiry(req, res, next);
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/vendors/:vendorId
// @desc    Update vendor profile
// @access  Private (Vendor)
router.put('/:vendorId', updateVendor);

// @route   DELETE /api/vendors/:vendorId
// @desc    Delete vendor
// @access  Private (Vendor or Admin)
router.delete('/:vendorId', deleteVendor);

// Admin Routes (should be protected with admin auth middleware)

// @route   GET /api/vendors/admin/all
// @desc    Get all vendors (with filters)
// @access  Private (Admin)
router.get('/admin/all', getAllVendors);

// @route   PUT /api/vendors/admin/approve/:vendorId
// @desc    Approve vendor registration
// @access  Private (Admin)
router.put('/admin/approve/:vendorId', approveVendor);

// @route   PUT /api/vendors/admin/reject/:vendorId
// @desc    Reject vendor registration
// @access  Private (Admin)
router.put('/admin/reject/:vendorId', rejectVendor);

module.exports = router;
