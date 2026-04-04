const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { vendorProtect } = require('../middleware/authMiddleware');

/**
 * Notification Routes for Vendors
 * All routes require vendor authentication
 */

// Get vendor notifications
router.get('/', vendorProtect, notificationController.getVendorNotifications);

// Get unread count
router.get('/unread-count', vendorProtect, notificationController.getUnreadCount);

// Mark notification as read
router.patch('/:notificationId/read', vendorProtect, notificationController.markAsRead);

// Mark all as read
router.patch('/mark-all-read', vendorProtect, notificationController.markAllAsRead);

// Delete notification
router.delete('/:notificationId', vendorProtect, notificationController.deleteNotification);

module.exports = router;
