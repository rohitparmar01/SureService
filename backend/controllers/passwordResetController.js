const User = require('../models/User');
const Vendor = require('../models/VendorNew');
const { sendPasswordResetEmail } = require('../services/emailService');

/**
 * PASSWORD RESET CONTROLLER
 * 
 * Handles secure password reset functionality for both Users and Vendors
 * 
 * Features:
 * - Secure token generation (single-use, time-limited)
 * - Generic responses (doesn't reveal if email exists)
 * - Email sending via Nodemailer
 * - Token validation and password update
 * - Automatic cleanup of expired tokens
 * 
 * Security Measures:
 * - Tokens are hashed before storage (SHA-256)
 * - 15-minute expiry window
 * - Single-use tokens (cleared after reset)
 * - Passwords are hashed with bcrypt
 * - No user existence disclosure
 */

// ====================================
// FORGOT PASSWORD - STEP 1
// ====================================

/**
 * @desc    Request password reset (sends email with reset token)
 * @route   POST /api/auth/forgot-password
 * @access  Public
 * 
 * Process:
 * 1. Check if email exists in User or Vendor collection
 * 2. Generate secure reset token
 * 3. Save hashed token to database with expiry
 * 4. Send reset email with token
 * 5. Return generic success message (security best practice)
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Validate email input
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address'
      });
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();


    // Search in both User and Vendor collections
    let account = await User.findOne({ email: normalizedEmail });
    let accountType = 'user';

    if (!account) {
      // Check in Vendor collection
      account = await Vendor.findOne({ 'contact.email': normalizedEmail });
      accountType = 'vendor';
    }

    // SECURITY: Always return same message even if email doesn't exist
    // This prevents email enumeration attacks
    const genericResponse = {
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent. Please check your email.'
    };

    // If account not found, still return success (security measure)
    if (!account) {
      return res.status(200).json(genericResponse);
    }

    // Check if account is active (optional additional security)
    if (account.isActive === false) {
      return res.status(200).json(genericResponse);
    }

    // Generate reset token
    const resetToken = account.generatePasswordResetToken();

    // Save token and expiry to database
    await account.save({ validateBeforeSave: false });


    // Prepare email data
    const emailData = {
      email: accountType === 'user' ? account.email : account.contact.email,
      name: account.name || account.contactPerson || 'User',
      resetToken,
      userType: accountType
    };

    // Send password reset email
    try {
      await sendPasswordResetEmail(emailData);
    } catch (emailError) {
      // If email fails, clear the reset token
      account.resetPasswordToken = undefined;
      account.resetPasswordExpiry = undefined;
      account.resetPasswordExpire = undefined;
      await account.save({ validateBeforeSave: false });

      console.error('❌ Failed to send reset email:', emailError.message);

      // Always return generic success to prevent account enumeration and avoid exposing transient SMTP failures.
      return res.status(200).json(genericResponse);
    }

    // Return generic success response
    res.status(200).json(genericResponse);

  } catch (error) {
    console.error('❌ Forgot password error:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'An error occurred while processing your request. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ====================================
// RESET PASSWORD - STEP 2
// ====================================

/**
 * @desc    Reset password using token
 * @route   POST /api/auth/reset-password/:token
 * @access  Public
 * 
 * Process:
 * 1. Validate token and check expiry
 * 2. Find account with matching token
 * 3. Validate new password
 * 4. Update password (auto-hashed by pre-save hook)
 * 5. Clear reset token fields
 * 6. Return success message
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;


    // Validate inputs
    if (!password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both password and confirm password'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    // Validate password strength
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPasswordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character'
      });
    }

    // Try to find user with valid token
    let account = await User.verifyResetToken(token);
    let accountType = 'user';

    if (!account) {
      // Try vendor collection
      account = await Vendor.verifyResetToken(token);
      accountType = 'vendor';
    }

    if (!account) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token. Please request a new password reset.'
      });
    }


    // Update password (will be automatically hashed by pre-save hook)
    account.password = password;

    // Clear reset token fields (single-use token)
    account.resetPasswordToken = undefined;
    account.resetPasswordExpiry = undefined;
    account.resetPasswordExpire = undefined;

    // Save account
    await account.save();


    // Return success response
    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.',
      accountType
    });

  } catch (error) {
    console.error('❌ Reset password error:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'An error occurred while resetting your password. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ====================================
// VERIFY RESET TOKEN (Optional)
// ====================================

/**
 * @desc    Verify if reset token is valid (optional endpoint for frontend validation)
 * @route   GET /api/auth/verify-reset-token/:token
 * @access  Public
 * 
 * Use Case:
 * Frontend can call this before showing the reset password form
 * to provide better UX (show error immediately if token is invalid)
 */
exports.verifyResetToken = async (req, res, next) => {
  try {
    const { token } = req.params;

    // Try to find user with valid token
    let account = await User.verifyResetToken(token);
    let accountType = 'user';

    if (!account) {
      account = await Vendor.verifyResetToken(token);
      accountType = 'vendor';
    }

    if (!account) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Token is valid
    res.status(200).json({
      success: true,
      valid: true,
      accountType,
      message: 'Token is valid'
    });

  } catch (error) {
    console.error('❌ Verify token error:', error.message);
    
    res.status(500).json({
      success: false,
      valid: false,
      message: 'Error verifying token'
    });
  }
};

// ====================================
// UTILITY: CLEANUP EXPIRED TOKENS (Cron Job)
// ====================================

/**
 * @desc    Clean up expired reset tokens from database
 * @access  Internal (call via cron job or scheduled task)
 * 
 * Usage: Schedule this to run periodically (e.g., every hour)
 * 
 * Example cron setup:
 * const cron = require('node-cron');
 * cron.schedule('0 * * * *', async () => {
 *   await cleanupExpiredTokens();
 * });
 */
exports.cleanupExpiredTokens = async () => {
  try {
    const now = Date.now();

    // Clean up User tokens
    const userResult = await User.updateMany(
      {
        $or: [
          { resetPasswordExpiry: { $lt: now } },
          { resetPasswordExpire: { $lt: now } }
        ]
      },
      { 
        $unset: { 
          resetPasswordToken: 1, 
          resetPasswordExpiry: 1,
          resetPasswordExpire: 1
        } 
      }
    );

    // Clean up Vendor tokens
    const vendorResult = await Vendor.updateMany(
      { resetPasswordExpiry: { $lt: now } },
      { 
        $unset: { 
          resetPasswordToken: 1, 
          resetPasswordExpiry: 1 
        } 
      }
    );


    return {
      success: true,
      usersUpdated: userResult.modifiedCount,
      vendorsUpdated: vendorResult.modifiedCount
    };

  } catch (error) {
    console.error('❌ Error cleaning up expired tokens:', error.message);
    return { success: false, error: error.message };
  }
};
