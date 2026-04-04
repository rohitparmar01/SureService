const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  logoutUser
} = require('../controllers/userController');
const { googleLoginUser } = require('../controllers/googleAuthController');
const { protect, authorize } = require('../middleware/authMiddleware');

// @route   POST /api/users/register
// @desc    Register a new user
// @access  Public
router.post('/register', registerUser);

// @route   POST /api/users/login
// @desc    Login user/admin
// @access  Public
router.post('/login', loginUser);

// @route   POST /api/users/google-login
// @desc    Google Sign-In for users/admin
// @access  Public
router.post('/google-login', googleLoginUser);

// @route   GET /api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', protect, getProfile);

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, updateProfile);

// @route   POST /api/users/logout
// @desc    Logout user
// @access  Private
router.post('/logout', protect, logoutUser);

module.exports = router;
