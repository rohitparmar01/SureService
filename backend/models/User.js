const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't return password by default
  },
  
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  
  phone: {
    type: String,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian phone number']
  },
  
  profileImage: {
    type: String,
    default: null
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  // User preferences
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    },
    favoriteVendors: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor'
    }]
  },
  
  // Booking history
  bookings: [{
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor'
    },
    serviceType: String,
    eventDate: Date,
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Security
  resetPasswordToken: String,
  // Canonical password-reset expiry field used across controller/services
  resetPasswordExpiry: Date,
  // Legacy field kept for backward compatibility with older records
  resetPasswordExpire: Date,
  lastLogin: Date,
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for faster queries (email already indexed via unique: true)
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash if password is modified
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password for login
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to generate JWT token
userSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      email: this.email,
      role: this.role
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRE || '7d'
    }
  );
};

// Method to get public profile
userSchema.methods.getPublicProfile = function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    phone: this.phone,
    profileImage: this.profileImage,
    isEmailVerified: this.isEmailVerified,
    createdAt: this.createdAt
  };
};

// Static method to check if user is admin
userSchema.statics.isAdmin = function(role) {
  return role === 'admin';
};

// Method to generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  const crypto = require('crypto');
  
  // Generate random token
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  // Hash token and store in database
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  // Set expiry to 15 minutes
  const expiryTime = Date.now() + 15 * 60 * 1000;
  this.resetPasswordExpiry = expiryTime;
  this.resetPasswordExpire = expiryTime;
  
  // Return unhashed token (to send via email)
  return resetToken;
};

// Static method to verify reset token
userSchema.statics.verifyResetToken = async function(token) {
  const crypto = require('crypto');
  
  // Hash the incoming token to compare with stored hash
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  // Find user with valid token and not expired
  const user = await this.findOne({
    resetPasswordToken: hashedToken,
    $or: [
      { resetPasswordExpiry: { $gt: Date.now() } },
      { resetPasswordExpire: { $gt: Date.now() } }
    ]
  });
  
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
