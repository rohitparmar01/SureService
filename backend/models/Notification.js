const mongoose = require('mongoose');

/**
 * Notification Model
 * Stores notifications for vendors about inquiries, subscriptions, and other events
 */
const notificationSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VendorNew',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['inquiry', 'subscription', 'review', 'profile', 'system'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  link: {
    type: String, // URL to navigate to when notification is clicked
    default: null
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId, // Reference to inquiry, subscription, etc.
    default: null
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal'
  }
}, {
  timestamps: true
});

// Index for efficient queries
notificationSchema.index({ vendor: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ vendor: 1, createdAt: -1 });

// Static method to create notification
notificationSchema.statics.createNotification = async function(data) {
  try {
    const notification = await this.create(data);
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Static method to mark as read
notificationSchema.statics.markAsRead = async function(notificationId, vendorId) {
  try {
    const notification = await this.findOneAndUpdate(
      { _id: notificationId, vendor: vendorId },
      { isRead: true },
      { new: true }
    );
    return notification;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

// Static method to mark all as read for vendor
notificationSchema.statics.markAllAsRead = async function(vendorId) {
  try {
    const result = await this.updateMany(
      { vendor: vendorId, isRead: false },
      { isRead: true }
    );
    return result;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

module.exports = mongoose.model('Notification', notificationSchema);
