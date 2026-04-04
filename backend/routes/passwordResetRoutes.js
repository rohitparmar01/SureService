const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const {
  forgotPassword,
  resetPassword,
  verifyResetToken
} = require('../controllers/passwordResetController');

// Rate limiters to prevent abuse
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again after 15 minutes.'
  }
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many attempts. Please try again later.'
  }
});

/**
 * PASSWORD RESET ROUTES
 * 
 * All routes are public (no authentication required)
 * Handles password reset for both Users and Vendors
 */

// ====================================
// PUBLIC ROUTES
// ====================================

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset (sends email with reset token)
 * @access  Public
 * @body    { email: string }
 * 
 * Example Request:
 * POST /api/auth/forgot-password
 * Content-Type: application/json
 * {
 *   "email": "user@example.com"
 * }
 * 
 * Example Response:
 * {
 *   "success": true,
 *   "message": "If an account with that email exists, a password reset link has been sent."
 * }
 */
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);

/**
 * @route   POST /api/auth/reset-password/:token
 * @desc    Reset password using token
 * @access  Public
 * @params  token - Reset token from email
 * @body    { password: string, confirmPassword: string }
 * 
 * Example Request:
 * POST /api/auth/reset-password/abc123def456...
 * Content-Type: application/json
 * {
 *   "password": "newPassword123",
 *   "confirmPassword": "newPassword123"
 * }
 * 
 * Example Response:
 * {
 *   "success": true,
 *   "message": "Password reset successful. You can now login with your new password.",
 *   "accountType": "user"
 * }
 */
router.post('/reset-password/:token', resetPasswordLimiter, resetPassword);

/**
 * @route   GET /api/auth/verify-reset-token/:token
 * @desc    Verify if reset token is valid (optional - for frontend validation)
 * @access  Public
 * @params  token - Reset token to verify
 * 
 * Example Request:
 * GET /api/auth/verify-reset-token/abc123def456...
 * 
 * Example Response:
 * {
 *   "success": true,
 *   "valid": true,
 *   "accountType": "user",
 *   "message": "Token is valid"
 * }
 */
router.get('/verify-reset-token/:token', verifyResetToken);

module.exports = router;
