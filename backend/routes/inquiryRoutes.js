const express = require('express');
const router = express.Router();
const inquiryController = require('../controllers/inquiryController');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');

// Public routes
router.post('/', inquiryController.createInquiry);

// Protected routes - Require authentication
router.get('/', protect, inquiryController.getAllInquiries);
router.get('/stats', adminOnly, inquiryController.getInquiryStats);
router.get('/:inquiryId', protect, inquiryController.getInquiryById);
router.patch('/:inquiryId/status', protect, inquiryController.updateInquiryStatus);
router.delete('/:inquiryId', adminOnly, inquiryController.deleteInquiry);

// Vendor-specific routes - Protected
router.get('/vendor/:vendorId', protect, inquiryController.getVendorInquiries);

module.exports = router;
