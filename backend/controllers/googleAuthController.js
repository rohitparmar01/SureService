const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const Vendor = require('../models/VendorNew');

// Initialize Google OAuth client with client secret for code exchange
const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'postmessage' // Special redirect_uri for popup-based auth-code flow
);

/**
 * @desc    Verify Google ID token
 * @param   {string} idToken - Google ID token
 * @returns {object} Verified payload with email, name, picture
 */
async function verifyGoogleToken(idToken) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();

  if (!payload.email_verified) {
    throw new Error('Email not verified by Google');
  }

  return {
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
    emailVerified: payload.email_verified
  };
}

/**
 * @desc    Resolve Google user from an OAuth access token (userinfo endpoint)
 * @param   {string} accessToken
 * @returns {object} Verified payload with email, name, picture
 */
async function verifyGoogleAccessToken(accessToken) {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Invalid Google access token');
  }

  const payload = await response.json();

  if (!payload.email || !payload.email_verified) {
    throw new Error('Email not verified by Google');
  }

  return {
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
    emailVerified: payload.email_verified
  };
}

function isLikelyJwt(token) {
  return typeof token === 'string' && token.split('.').length === 3;
}

/**
 * @desc    Exchange Google auth code for tokens on the server side,
 *          then verify the id_token and return user info.
 * @param   {string} code - Authorization code from frontend
 * @returns {object} Verified payload with email, name, picture
 */
async function exchangeCodeForUser(code) {
  const { tokens } = await client.getToken({
    code,
    redirect_uri: 'postmessage'
  });

  if (!tokens.id_token) {
    throw new Error('No id_token received from Google');
  }

  return verifyGoogleToken(tokens.id_token);
}

/**
 * @desc    Resolve Google user from either an id_token or auth code
 * @param   {object} body - Request body with { token } or { code }
 * @returns {object} Verified payload with email, name, picture
 */
async function resolveGoogleUser(body) {
  const {
    token,
    code,
    credential,
    idToken,
    id_token: idTokenSnake,
    accessToken,
    access_token: accessTokenSnake
  } = body || {};

  const normalizedCode = typeof code === 'string' ? code.trim() : '';
  const normalizedIdToken = [token, credential, idToken, idTokenSnake]
    .find((value) => typeof value === 'string' && value.trim().length > 0);
  const normalizedAccessToken = [accessToken, accessTokenSnake]
    .find((value) => typeof value === 'string' && value.trim().length > 0);

  if (!normalizedCode && !normalizedIdToken && !normalizedAccessToken) {
    return null; // caller will return 400
  }

  // Prefer auth-code exchange (production flow)
  if (normalizedCode) {
    return exchangeCodeForUser(normalizedCode);
  }

  // If token shape is unknown, try JWT verification first, else access-token userinfo.
  if (normalizedIdToken) {
    if (isLikelyJwt(normalizedIdToken)) {
      return verifyGoogleToken(normalizedIdToken);
    }
    return verifyGoogleAccessToken(normalizedIdToken);
  }

  return verifyGoogleAccessToken(normalizedAccessToken);
}

/**
 * @desc    Google Sign-In for Users (including Admin)
 * @route   POST /api/users/google-login
 * @access  Public
 * @body    { code } OR { token/credential/idToken/id_token } OR { accessToken/access_token }
 */
exports.googleLoginUser = async (req, res) => {
  try {
    const googleUser = await resolveGoogleUser(req.body);

    if (!googleUser) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_CREDENTIALS',
          message: 'Google authorization code or ID token is required'
        }
      });
    }
    
    // Check if user exists with this email
    const user = await User.findOne({ email: googleUser.email.toLowerCase() });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'No account found with this email. Please register first.'
        }
      });
    }
    
    // Check if user account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_INACTIVE',
          message: 'Your account has been deactivated. Please contact support.'
        }
      });
    }
    
    // Update email verification status if not already verified
    if (!user.isEmailVerified) {
      user.isEmailVerified = true;
    }
    
    // Update last login and profile image if not set
    user.lastLogin = new Date();
    if (!user.profileImage && googleUser.picture) {
      user.profileImage = googleUser.picture;
    }
    await user.save();
    
    // Generate JWT token (same as regular login)
    const authToken = user.generateAuthToken();
    
    res.status(200).json({
      success: true,
      data: {
        user: user.getPublicProfile(),
        token: authToken
      },
      message: 'Google login successful'
    });
    
  } catch (error) {
    console.error('❌ Google login error:', error.message);
    
    const errorMessage = String(error.message || '');
    const isAuthError = [
      'Invalid Google token',
      'Invalid Google access token',
      'Email not verified by Google',
      'No id_token received from Google'
    ].includes(errorMessage)
      || /invalid_grant|invalid_client|unauthorized_client|invalid_request/i.test(errorMessage);

    if (isAuthError) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid Google authentication. Please try again.',
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        }
      });
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Google login failed. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
};

/**
 * @desc    Google Sign-In for Vendors
 * @route   POST /api/vendors/google-login
 * @access  Public
 * @body    { code } OR { token/credential/idToken/id_token } OR { accessToken/access_token }
 */
exports.googleLoginVendor = async (req, res) => {
  try {
    const googleUser = await resolveGoogleUser(req.body);

    if (!googleUser) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_CREDENTIALS',
          message: 'Google authorization code or ID token is required'
        }
      });
    }
    
    // Check if vendor exists with this email
    const vendor = await Vendor.findOne({ 'contact.email': googleUser.email.toLowerCase() });
    
    if (!vendor) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'VENDOR_NOT_FOUND',
          message: 'No vendor account found with this email. Please register first.'
        }
      });
    }
    
    // Check if vendor is active (admin must activate after registration)
    if (!vendor.isActive) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_PENDING_APPROVAL',
          message: 'Your account is pending admin approval. You will be able to login once activated by admin.'
        }
      });
    }
    
    // Update email verification status
    if (!vendor.contact.emailVerified) {
      vendor.contact.emailVerified = true;
    }
    
    // Update profile image if not set
    if (!vendor.images?.logo && googleUser.picture) {
      if (!vendor.images) vendor.images = {};
      vendor.images.logo = googleUser.picture;
    }
    
    await vendor.save();
    
    // Generate JWT token (same as regular vendor login)
    const authToken = vendor.generateAuthToken();
    
    res.status(200).json({
      success: true,
      token: authToken,
      data: {
        vendorId: vendor.vendorId,
        _id: vendor._id,
        name: vendor.name,
        businessName: vendor.businessName,
        email: vendor.contact.email,
        phone: vendor.contact.phone,
        serviceType: vendor.serviceType,
        city: vendor.city,
        verified: vendor.verified,
        isActive: vendor.isActive,
        rating: vendor.rating,
        reviewCount: vendor.reviewCount,
        role: 'vendor'
      },
      message: 'Google login successful'
    });
    
  } catch (error) {
    console.error('❌ Vendor Google login error:', error.message);
    
    const errorMessage = String(error.message || '');
    const isAuthError = [
      'Invalid Google token',
      'Invalid Google access token',
      'Email not verified by Google',
      'No id_token received from Google'
    ].includes(errorMessage)
      || /invalid_grant|invalid_client|unauthorized_client|invalid_request/i.test(errorMessage);

    if (isAuthError) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid Google authentication. Please try again.',
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        }
      });
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Google login failed. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
};
