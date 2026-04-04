const Notification = require('../models/Notification');

/**
 * Get notifications for logged-in vendor
 */
exports.getVendorNotifications = async (req, res) => {
  try {
    const vendorId = req.vendor._id;
    const { limit = 20, skip = 0, unreadOnly = false } = req.query;

    // Build query
    const query = { vendor: vendorId };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    // Fetch notifications
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    // Get unread count
    const unreadCount = await Notification.countDocuments({
      vendor: vendorId,
      isRead: false
    });

    // Get total count
    const totalCount = await Notification.countDocuments({ vendor: vendorId });

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        totalCount,
        hasMore: totalCount > parseInt(skip) + notifications.length
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
};

/**
 * Get unread notification count
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const vendorId = req.vendor._id;

    const unreadCount = await Notification.countDocuments({
      vendor: vendorId,
      isRead: false
    });

    res.json({
      success: true,
      data: { unreadCount }
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count',
      error: error.message
    });
  }
};

/**
 * Mark notification as read
 */
exports.markAsRead = async (req, res) => {
  try {
    const vendorId = req.vendor._id;
    const { notificationId } = req.params;

    const notification = await Notification.markAsRead(notificationId, vendorId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
};

/**
 * Mark all notifications as read
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const vendorId = req.vendor._id;

    const result = await Notification.markAllAsRead(vendorId);

    res.json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount
      },
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message
    });
  }
};

/**
 * Delete notification
 */
exports.deleteNotification = async (req, res) => {
  try {
    const vendorId = req.vendor._id;
    const { notificationId } = req.params;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      vendor: vendorId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message
    });
  }
};

/**
 * Helper function to create notifications (used by other controllers)
 */
exports.createNotification = async (vendorId, data) => {
  try {
    const notification = await Notification.create({
      vendor: vendorId,
      ...data
    });
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};
