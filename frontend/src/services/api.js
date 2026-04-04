import axios from 'axios';
import { API_BASE_URL } from '../config/api';

// Base API URL is centralized in config/api.js

// Create axios instance with default config
// NOTE: increase timeout to 30s to avoid transient admin dashboard timeouts
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    // Prefer vendor token for vendor-profile endpoints to avoid role mismatch
    const vendorToken = localStorage.getItem('vendorToken');
    const authToken = localStorage.getItem('authToken');
    const isVendorEndpoint = config.url?.startsWith('/vendor-profile');

    // Fallback to auth token if vendor token is missing (common after some login flows).
    const token = isVendorEndpoint
      ? (vendorToken || authToken)
      : (authToken || vendorToken);

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for consistent error handling
apiClient.interceptors.response.use(
  (response) => {
    // Always log responses for admin debugging
    if (response.config.url?.includes('/admin/')) {
    }
    
    // Don't unwrap response.data for blob responses (file downloads)
    if (response.config.responseType === 'blob') {
      return response; // Return full response object for blobs
    }
    
    return response.data;
  },
  (error) => {
    // Enhanced error handling with detailed logging
    const url = error.config?.url || 'unknown';
    const status = error.response?.status;
    const errorData = error.response?.data;
    
    console.error('❌ API Error:', {
      url,
      status,
      message: errorData?.message || error.message,
      error: errorData?.error
    });
    
    // Handle authentication errors
    if (status === 401) {
      const errorMessage = errorData?.error?.message || errorData?.message || 'Authentication required';
      const errorCode = errorData?.error?.code;
      
      console.error('🔒 Auth Error:', errorMessage, 'Code:', errorCode);
      
      // Only clear token and redirect on specific auth failures
      // Don't auto-logout on every 401 - let the component handle it
      if (errorCode === 'TOKEN_EXPIRED' || errorCode === 'INVALID_TOKEN') {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        // Redirect to home instead of non-existent /login
        if (!window.location.pathname.includes('/admin')) {
          window.location.href = '/';
        }
      }
      
      // Preserve response data by throwing the original error
      throw error;
    }
    
    // Handle forbidden errors
    if (status === 403) {
      const errorMessage = errorData?.error?.message || errorData?.message || 'Access forbidden';
      const errorReason = errorData?.reason;
      const errorDetails = errorData?.details;
      
      console.error('🚫 Forbidden:', errorMessage);
      if (errorReason) {
        console.error('   Reason:', errorReason);
      }
      if (errorDetails) {
        console.error('   Details:', errorDetails);
      }
      
      // If admin access denied, redirect to home
      if (url.includes('/admin/') && !window.location.pathname.includes('/admin')) {
        window.location.href = '/';
      }
      
      // Preserve response data by throwing the original error
      throw error;
    }
    // For all other errors, throw error with message
    const errorMessage = error?.error?.message || errorData?.message || error.message || 'An error occurred';
    throw new Error(errorMessage);
  }
);

/**
 * TAXONOMY API - Single Source of Truth
 * Fetch services grouped by category from database
 * @returns {Promise<Array>} Array of services with {value, label, icon, category}
 */
export const fetchServicesByCategory = async () => {
  try {
    const response = await apiClient.get('/services/categories');
    return response.success ? response.services : [];
  } catch (error) {
    console.error('Error fetching services by category:', error);
    return [];
  }
};

/**
 * Fetch vendors with optional filters
 * @param {Object} filters - Filter parameters
 * @param {string} filters.eventCategory - Service category filter (e.g., HVAC, CCTV, IT Hardware, Electrical, Plumbing)
 * @param {string} filters.eventSubType - Service sub-type filter
 * @param {string} filters.city - City filter
 * @param {number} filters.latitude - User latitude for location-based search
 * @param {number} filters.longitude - User longitude for location-based search
 * @param {number} filters.radius - Search radius in kilometers
 * @param {number} filters.budgetMin - Minimum budget
 * @param {number} filters.budgetMax - Maximum budget
 * @returns {Promise<Object>} Object with vendors array and total count
 */
// New function to fetch ALL vendors without backend filtering for frontend-based searching
export const fetchAllVendorsNoFilter = async (options = {}) => {
  try {
    const {
      limit = 500,
      page = 1,
      city = null
    } = options;

    // Build query parameters
    const params = new URLSearchParams();
    params.append('limit', limit);
    params.append('page', page);

    if (city) {
      params.append('city', city);
    }

    const response = await apiClient.get(`/search/all?${params.toString()}`);

    if (!response || !response.success) {
      console.error('Fetch all vendors failed:', response);
      return { vendors: [], total: 0 };
    }

    return {
      vendors: response.data || [],
      total: response.total || 0
    };
  } catch (error) {
    console.error('❌ Error fetching all vendors:', error);
    if (error.response) {
      console.error('Response error:', error.response.data);
    }
    return { vendors: [], total: 0 };
  }
};

export const fetchVendors = async (filters = {}) => {
  try {
    // Fetch ALL vendors without backend filtering
    const searchPayload = {
      page: filters.page || 1,
      limit: filters.limit || 500
    };

    const response = await apiClient.post('/search', searchPayload);

    if (!response || !response.success) {
      console.error('Search failed:', response);
      return { vendors: [], total: 0 };
    }

    return {
      vendors: response.results || [],
      total: response.total || 0
    };
  } catch (error) {
    console.error('❌ Error fetching vendors [build-refresh]:', error);
    if (error.response) {
      console.error('Response error:', error.response.data);
    }
    return { vendors: [], total: 0 };
  }
};

/**
 * Fetch search suggestions based on query
 * @param {string} query - Search query
 * @param {number} limit - Max suggestions to return
 * @returns {Promise<Array>} Array of suggestions
 */
export const fetchSearchSuggestions = async (query = '', limit = 8) => {
  try {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const response = await apiClient.get(`/search/suggestions`, {
      params: {
        q: query.trim(),
        limit: limit
      }
    });

    if (!response || !response.success) {
      return [];
    }

    return Array.isArray(response.data) ? response.data : response.results || [];
  } catch (error) {
    console.error('❌ Error fetching search suggestions:', error);
    return [];
  }
};

/**
 * Fetch a single vendor by ID
 * @param {string} vendorId - Vendor ID
 * @returns {Promise<Object>} Vendor object
 */
export const fetchVendorById = async (vendorId) => {
  try {
    const response = await apiClient.get(`/vendors/${vendorId}`);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error fetching vendor:', error);
    throw error;
  }
};

/**
 * Send inquiry to a vendor
 * @param {Object} inquiryData - Inquiry information
 * @param {string} inquiryData.userName - Customer name
 * @param {string} inquiryData.userContact - Customer contact (phone)
 * @param {number} inquiryData.budget - Event budget
 * @param {Object} inquiryData.location - GeoJSON Point location
 * @param {string} inquiryData.eventType - Type of event
 * @param {string} inquiryData.vendorID - Target vendor ID
 * @returns {Promise<Object>} Created inquiry object
 */
export const sendInquiry = async (inquiryData) => {
  try {
    const response = await apiClient.post('/inquiries', inquiryData);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error sending inquiry:', error);
    throw error;
  }
};

/**
 * Fetch all inquiries for a specific vendor
 * @param {string} vendorId - Vendor ID
 * @returns {Promise<Array>} Array of inquiry objects
 */
export const fetchVendorInquiries = async (vendorId) => {
  try {
    const response = await apiClient.get(`/inquiries/vendor/${vendorId}`);
    return response.success ? response.data : [];
  } catch (error) {
    console.error('Error fetching vendor inquiries:', error);
    throw error;
  }
};

/**
 * Fetch all inquiries (Admin only)
 * @returns {Promise<Array>} Array of all inquiry objects
 */
export const fetchAllInquiries = async () => {
  try {
    const response = await apiClient.get('/inquiries');
    return response.success ? response.data : [];
  } catch (error) {
    console.error('Error fetching all inquiries:', error);
    throw error;
  }
};

/**
 * Fetch a single inquiry by ID
 * @param {string} inquiryId - Inquiry ID
 * @returns {Promise<Object>} Inquiry object
 */
export const fetchInquiryById = async (inquiryId) => {
  try {
    const response = await apiClient.get(`/inquiries/${inquiryId}`);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error fetching inquiry:', error);
    throw error;
  }
};

/**
 * Update inquiry status
 * @param {string} inquiryId - Inquiry ID
 * @param {string} status - New status ('pending', 'sent', 'responded')
 * @returns {Promise<Object>} Updated inquiry object
 */
export const updateInquiryStatus = async (inquiryId, status) => {
  try {
    const response = await apiClient.patch(`/inquiries/${inquiryId}/status`, { status });
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error updating inquiry status:', error);
    throw error;
  }
};

/**
 * Delete inquiry by ID
 * @param {string} inquiryId - Inquiry ID
 * @returns {Promise<Object>} Delete confirmation
 */
export const deleteInquiry = async (inquiryId) => {
  try {
    const response = await apiClient.delete(`/inquiries/${inquiryId}`);
    return response;
  } catch (error) {
    console.error('Error deleting inquiry:', error);
    throw error;
  }
};

/**
 * ADMIN: Fetch pending inquiries awaiting approval
 * @param {Object} params - Query parameters (page, limit)
 * @returns {Promise<Object>} Object with inquiries array and pagination
 */
export const fetchPendingInquiries = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams(params).toString();
    const response = await apiClient.get(`/admin/inquiries/pending?${queryParams}`);
    return response && response.success ? response.data : response;
  } catch (error) {
    console.error('❌ Error fetching pending inquiries:', error);
    throw error;
  }
};

/**
 * ADMIN: Approve an inquiry (allows vendor to see it)
 * @param {string} inquiryId - Inquiry ID
 * @returns {Promise<Object>} Approved inquiry object
 */
export const approveInquiry = async (inquiryId) => {
  try {
    const response = await apiClient.post(`/admin/inquiries/${inquiryId}/approve`);
    return response && response.success ? response.data : response;
  } catch (error) {
    console.error('❌ Error approving inquiry:', error);
    throw error;
  }
};

/**
 * ADMIN: Reject an inquiry with reason (vendor won't see it)
 * @param {string} inquiryId - Inquiry ID
 * @param {string} reason - Rejection reason
 * @returns {Promise<Object>} Rejected inquiry object
 */
export const rejectInquiry = async (inquiryId, reason) => {
  try {
    const response = await apiClient.post(`/admin/inquiries/${inquiryId}/reject`, { reason });
    return response && response.success ? response.data : response;
  } catch (error) {
    console.error('❌ Error rejecting inquiry:', error);
    throw error;
  }
};

/**
 * ADMIN: Reset an inquiry back to pending review
 * @param {string} inquiryId - Inquiry ID
 * @returns {Promise<Object>} Updated inquiry object
 */
export const resetInquiryToPending = async (inquiryId) => {
  try {
    const response = await apiClient.post(`/admin/inquiries/${inquiryId}/reset-pending`);
    return response && response.success ? response.data : response;
  } catch (error) {
    console.error('❌ Error resetting inquiry to pending:', error);
    throw error;
  }
};

/**
 * ADMIN: Get inquiry approval statistics
 * @returns {Promise<Object>} Statistics object with pending, approved, rejected counts
 */
export const fetchInquiryApprovalStats = async () => {
  try {
    const response = await apiClient.get('/admin/inquiries/approval-stats');
    return response && response.success ? response.data : response;
  } catch (error) {
    console.error('❌ Error fetching approval stats:', error);
    throw error;
  }
};

/**
 * Create a new vendor
 * @param {Object} vendorData - Vendor information
 * @returns {Promise<Object>} Created vendor object
 */
export const createVendor = async (vendorData) => {
  try {
    const response = await apiClient.post('/vendors', vendorData);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error creating vendor:', error);
    throw error;
  }
};

/**
 * Update vendor by ID
 * @param {string} vendorId - Vendor ID
 * @param {Object} vendorData - Updated vendor data
 * @returns {Promise<Object>} Updated vendor object
 */
export const updateVendor = async (vendorId, vendorData) => {
  try {
    const response = await apiClient.put(`/vendors/${vendorId}`, vendorData);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error updating vendor:', error);
    throw error;
  }
};

/**
 * Delete vendor by ID
 * @param {string} vendorId - Vendor ID
 * @returns {Promise<Object>} Delete confirmation
 */
export const deleteVendor = async (vendorId) => {
  try {
    const response = await apiClient.delete(`/vendors/${vendorId}`);
    return response;
  } catch (error) {
    console.error('Error deleting vendor:', error);
    throw error;
  }
};

// ==========================================
// ADDITIONAL ADMIN API ENDPOINTS
// ==========================================

/**
 * ADMIN: Get dashboard statistics
 * @returns {Promise<Object>} Dashboard stats
 */
export const fetchAdminStats = async () => {
  try {
    // Retry on timeout up to 2 times with small backoff
    const maxAttempts = 2;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await apiClient.get('/admin/stats', {
          timeout: 30000
        });
        // Response interceptor already returns response.data
        // Backend structure: { success: true, data: {...} }
        return response && response.success ? response.data : response;
      } catch (err) {
        const msg = err.message || '';
        console.error(`❌ Attempt ${attempt} failed:`, msg);
        if (attempt === maxAttempts || !/timeout/i.test(msg)) {
          throw err;
        }
        // small delay before retry
        await new Promise(res => setTimeout(res, 500 * attempt));
      }
    }
    return null;
  } catch (error) {
    console.error('❌ Error fetching admin stats:', error);
    throw error;
  }
};

/**
 * ADMIN: Get recent activity
 * @param {number} limit - Number of items to fetch
 * @returns {Promise<Object>} Recent activity data
 */
export const fetchRecentActivity = async (limit = 10) => {
  try {
    const response = await apiClient.get(`/admin/activity?limit=${limit}`, {
      timeout: 30000
    });
    return response && response.success ? response.data : response;
  } catch (error) {
    console.error('❌ Error fetching recent activity:', error);
    throw error;
  }
};

/**
 * ADMIN: Get all users
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Users data
 */
export const fetchAllUsers = async (params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiClient.get(`/admin/users?${queryString}`);
    return response && response.success ? response.data : response;
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    throw error;
  }
};

/**
 * ADMIN: Update user status
 * @param {string} userId - User ID
 * @param {Object} updates - Status updates (isActive, role)
 * @returns {Promise<Object>} Updated user
 */
export const updateUserStatus = async (userId, updates) => {
  try {
    const response = await apiClient.patch(`/admin/users/${userId}`, updates);
    return response && response.success ? response.data : response;
  } catch (error) {
    console.error('❌ Error updating user status:', error);
    throw error;
  }
};

/**
 * ADMIN: Get all vendors
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Vendors data
 */
export const fetchAllVendorsAdmin = async (params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiClient.get(`/admin/vendors?${queryString}`);
    // Return consistent structure - response already has { success, data }
    return response && response.success ? response.data : response;
  } catch (error) {
    console.error('❌ Error fetching vendors:', error);
    throw error;
  }
};

/**
 * ADMIN: Get single vendor by ID (includes inactive vendors)
 * @param {string} vendorId - Vendor ID
 * @returns {Promise<Object>} Vendor object
 */
export const fetchVendorByIdAdmin = async (vendorId) => {
  try {
    const response = await apiClient.get(`/admin/vendors/${vendorId}`);
    return response && response.success ? response.data : response;
  } catch (error) {
    console.error('❌ Error fetching vendor:', error);
    throw error;
  }
};

/**
 * ADMIN: Toggle vendor verification status
 * @param {string} vendorId - Vendor ID
 * @param {boolean} verified - Verification status
 * @returns {Promise<Object>} Updated vendor
 */
export const toggleVendorVerification = async (vendorId, verified) => {
  try {
    const response = await apiClient.patch(
      `/admin/vendors/${vendorId}/verify`,
      { verified }
    );
    return response && response.success ? response.data : response;
  } catch (error) {
    console.error('❌ Error toggling vendor verification:', error);
    throw error;
  }
};

/**
 * ADMIN: Toggle vendor active status (hide/show)
 * @param {string} vendorId - Vendor ID
 * @param {boolean} isActive - Active status
 * @returns {Promise<Object>} Updated vendor
 */
export const toggleVendorStatus = async (vendorId, isActive) => {
  try {
    const response = await apiClient.patch(
      `/admin/vendors/${vendorId}/status`,
      { isActive }
    );
    return response && response.success ? response.data : response;
  } catch (error) {
    console.error('❌ Error toggling vendor status:', error);
    throw error;
  }
};

/**
 * ADMIN: Delete vendor permanently
 * @param {string} vendorId - Vendor ID
 * @returns {Promise<Object>} Delete confirmation
 */
export const deleteVendorPermanent = async (vendorId) => {
  try {
    const response = await apiClient.delete(`/admin/vendors/${vendorId}`);
    return response;
  } catch (error) {
    console.error('❌ Error deleting vendor:', error);
    throw error;
  }
};

/**
 * ADMIN: Forward inquiry to different vendor
 * @param {string} inquiryId - Inquiry ID
 * @param {string} newVendorId - New vendor ID
 * @param {string} reason - Reason for forwarding
 * @returns {Promise<Object>} Updated inquiry
 */
/**
 * ADMIN: Forward inquiry to a different vendor
 * @param {string} inquiryId - Inquiry ID
 * @param {string} newVendorId - New vendor ID
 * @param {string} reason - Reason for forwarding
 * @returns {Promise<Object>} Updated inquiry
 */
export const forwardInquiry = async (inquiryId, newVendorId, reason) => {
  try {
    const response = await apiClient.post(
      `/admin/inquiries/${inquiryId}/forward`,
      { newVendorId, reason }
    );
    return response && response.success ? response.data : response;
  } catch (error) {
    console.error('❌ Error forwarding inquiry:', error);
    throw error;
  }
};

/**
 * ADMIN: Toggle inquiry active/inactive status
 * @param {string} inquiryId - Inquiry ID
 * @param {boolean} isActive - Active status
 * @returns {Promise<Object>} Updated inquiry
 */
/**
 * ADMIN: Toggle inquiry active status
 * @param {string} inquiryId - Inquiry ID
 * @param {boolean} isActive - Active status
 * @returns {Promise<Object>} Updated inquiry
 */
export const toggleInquiryActive = async (inquiryId, isActive) => {
  try {
    const response = await apiClient.patch(
      `/admin/inquiries/${inquiryId}/toggle-active`,
      { isActive }
    );
    return response && response.success ? response.data : response;
  } catch (error) {
    console.error('❌ Error toggling inquiry status:', error);
    throw error;
  }
};

/**
 * ADMIN: Get all inquiries
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Inquiries data
 */
export const fetchAllInquiriesAdmin = async (params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiClient.get(`/admin/inquiries?${queryString}`);
    return response && response.success ? response.data : response;
  } catch (error) {
    console.error('❌ Error fetching inquiries:', error);
    throw error;
  }
};

/**
 * ADMIN: Update inquiry status
 * @param {string} inquiryId - Inquiry ID
 * @param {Object} updates - Status updates
 * @returns {Promise<Object>} Updated inquiry
 */
export const updateInquiryStatusAdmin = async (inquiryId, updates) => {
  try {
    const response = await apiClient.patch(
      `/admin/inquiries/${inquiryId}`,
      updates
    );
    return response && response.success ? response.data : response;
  } catch (error) {
    console.error('❌ Error updating inquiry:', error);
    throw error;
  }
};

/**
 * ==========================================
 * REVIEW MANAGEMENT (ADMIN)
 * ==========================================
 */

/**
 * Get all reviews with filters (Admin)
 */
export const fetchAllReviewsAdmin = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.status && params.status !== 'all') queryParams.append('status', params.status);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    
    const response = await apiClient.get(`/admin/reviews?${queryParams.toString()}`);
    return response;
  } catch (error) {
    console.error('❌ Error fetching reviews:', error);
    throw error;
  }
};

/**
 * Get review statistics (Admin)
 */
export const fetchReviewStats = async () => {
  try {
    const response = await apiClient.get('/admin/reviews/stats');
    return response;
  } catch (error) {
    console.error('❌ Error fetching review stats:', error);
    throw error;
  }
};

/**
 * Get pending reviews (Admin)
 */
export const fetchPendingReviews = async () => {
  try {
    const response = await apiClient.get('/admin/reviews/pending');
    return response;
  } catch (error) {
    console.error('❌ Error fetching pending reviews:', error);
    throw error;
  }
};

/**
 * Approve a review (Admin)
 */
export const approveReviewAdmin = async (reviewId) => {
  try {
    const response = await apiClient.post(`/admin/reviews/${reviewId}/approve`);
    return response;
  } catch (error) {
    console.error('❌ Error approving review:', error);
    throw error;
  }
};

/**
 * Reject a review (Admin)
 */
export const rejectReviewAdmin = async (reviewId, reason) => {
  try {
    const response = await apiClient.post(`/admin/reviews/${reviewId}/reject`, { reason });
    return response;
  } catch (error) {
    console.error('❌ Error rejecting review:', error);
    throw error;
  }
};

/**
 * Delete a review (Admin)
 */
export const deleteReviewAdmin = async (reviewId) => {
  try {
    const response = await apiClient.delete(`/admin/reviews/${reviewId}`);
    return response;
  } catch (error) {
    console.error('❌ Error deleting review:', error);
    throw error;
  }
};

/**
 * ========================================
 * MEDIA MANAGEMENT (Admin)
 * ========================================
 */

/**
 * Get all media with filters (Admin)
 */
export const fetchAllMediaAdmin = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.approvalStatus && params.approvalStatus !== 'all') queryParams.append('approvalStatus', params.approvalStatus);
    if (params.type && params.type !== 'all') queryParams.append('type', params.type);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    
    const response = await apiClient.get(`/admin/media?${queryParams.toString()}`);
    return response;
  } catch (error) {
    console.error('❌ Error fetching media:', error);
    throw error;
  }
};

/**
 * Get media statistics (Admin)
 */
export const fetchMediaStats = async () => {
  try {
    const response = await apiClient.get('/admin/media/stats');
    return response;
  } catch (error) {
    console.error('❌ Error fetching media stats:', error);
    throw error;
  }
};

/**
 * Get pending media (Admin)
 */
export const fetchPendingMedia = async () => {
  try {
    const response = await apiClient.get('/admin/media/pending');
    return response;
  } catch (error) {
    console.error('❌ Error fetching pending media:', error);
    throw error;
  }
};

/**
 * Approve media (Admin)
 */
export const approveMediaAdmin = async (mediaId) => {
  try {
    const response = await apiClient.post(`/admin/media/${mediaId}/approve`);
    return response;
  } catch (error) {
    console.error('❌ Error approving media:', error);
    throw error;
  }
};

/**
 * Reject media (Admin)
 */
export const rejectMediaAdmin = async (mediaId, reason) => {
  try {
    const response = await apiClient.post(`/admin/media/${mediaId}/reject`, { reason });
    return response;
  } catch (error) {
    console.error('❌ Error rejecting media:', error);
    throw error;
  }
};

/**
 * Delete media (Admin)
 */
export const deleteMediaAdmin = async (mediaId) => {
  try {
    const response = await apiClient.delete(`/admin/media/${mediaId}`);
    return response;
  } catch (error) {
    console.error('❌ Error deleting media:', error);
    throw error;
  }
};

/**
 * ========================================
 * BLOG MANAGEMENT (Admin)
 * ========================================
 */

/**
 * Get all vendor blogs with filters (Admin)
 */
export const fetchAllBlogsAdmin = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.approvalStatus && params.approvalStatus !== 'all') queryParams.append('approvalStatus', params.approvalStatus);
    if (params.status && params.status !== 'all') queryParams.append('status', params.status);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    
    const response = await apiClient.get(`/admin/vendor-blogs?${queryParams.toString()}`);
    return response;
  } catch (error) {
    console.error('❌ Error fetching blogs:', error);
    throw error;
  }
};

/**
 * Get blog statistics (Admin)
 */
export const fetchBlogStats = async () => {
  try {
    const response = await apiClient.get('/admin/vendor-blogs/stats');
    return response;
  } catch (error) {
    console.error('❌ Error fetching blog stats:', error);
    throw error;
  }
};

/**
 * Get pending blogs (Admin)
 */
export const fetchPendingBlogs = async () => {
  try {
    const response = await apiClient.get('/admin/vendor-blogs/pending');
    return response;
  } catch (error) {
    console.error('❌ Error fetching pending blogs:', error);
    throw error;
  }
};

/**
 * Approve blog (Admin)
 */
export const approveBlogAdmin = async (blogId) => {
  try {
    const response = await apiClient.post(`/admin/vendor-blogs/${blogId}/approve`);
    return response;
  } catch (error) {
    console.error('❌ Error approving blog:', error);
    throw error;
  }
};

/**
 * Reject blog (Admin)
 */
export const rejectBlogAdmin = async (blogId, reason) => {
  try {
    const response = await apiClient.post(`/admin/vendor-blogs/${blogId}/reject`, { reason });
    return response;
  } catch (error) {
    console.error('❌ Error rejecting blog:', error);
    throw error;
  }
};

/**
 * Delete blog (Admin)
 */
export const deleteBlogAdmin = async (blogId) => {
  try {
    const response = await apiClient.delete(`/admin/vendor-blogs/${blogId}`);
    return response;
  } catch (error) {
    console.error('❌ Error deleting blog:', error);
    throw error;
  }
};

/**
 * Export Vendors to Excel (Admin)
 */
export const exportVendorsToExcel = async () => {
  try {
    const response = await apiClient.get('/admin/export/vendors', {
      responseType: 'blob' // Important for file download
    });
    
    // Create a download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `vendors_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    return { success: true, message: 'Vendors exported successfully' };
  } catch (error) {
    console.error('❌ Error exporting vendors:', error);
    throw error;
  }
};

/**
 * Export Users to Excel (Admin)
 */
export const exportUsersToExcel = async () => {
  try {
    const response = await apiClient.get('/admin/export/users', {
      responseType: 'blob' // Important for file download
    });
    
    // Create a download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    return { success: true, message: 'Users exported successfully' };
  } catch (error) {
    console.error('❌ Error exporting users:', error);
    throw error;
  }
};

/**
 * Export Inquiries to Excel (Admin)
 */
export const exportInquiriesToExcel = async () => {
  try {
    const response = await apiClient.get('/admin/export/inquiries', {
      responseType: 'blob' // Important for file download
    });
    
    // Create a download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `inquiries_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    return { success: true, message: 'Inquiries exported successfully' };
  } catch (error) {
    console.error('❌ Error exporting inquiries:', error);
    throw error;
  }
};

/**
 * Export Payments to Excel (Admin)
 */
export const exportPaymentsToExcel = async () => {
  try {
    const response = await apiClient.get('/admin/export/payments', {
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `payments_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return { success: true, message: 'Payments exported successfully' };
  } catch (error) {
    console.error('❌ Error exporting payments:', error);
    throw error;
  }
};

/**
 * ADMIN: Get all payments across all vendors
 * @param {Object} params - Optional filters { planKey, status, page, limit }
 */
export const fetchAllPaymentsAdmin = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.planKey && params.planKey !== 'all') queryParams.append('planKey', params.planKey);
    if (params.status && params.status !== 'all') queryParams.append('status', params.status);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);

    try {
      const response = await apiClient.get(`/admin/transactions/razorpay?${queryParams.toString()}`);
      const payload = response?.data ? response.data : response;

      return {
        data: {
          payments: payload?.payments || [],
          summary: payload?.summary || null
        }
      };
    } catch (liveError) {
      console.warn('⚠️ Live Razorpay fetch failed, falling back to local transaction ledger:', liveError?.message || liveError);

      const normalizedStatus = params.status === 'success' ? 'paid' : params.status;
      const fallbackParams = new URLSearchParams();
      if (params.planKey && params.planKey !== 'all') fallbackParams.append('planKey', params.planKey);
      if (normalizedStatus && normalizedStatus !== 'all') fallbackParams.append('status', normalizedStatus);
      if (params.page) fallbackParams.append('page', params.page);
      if (params.limit) fallbackParams.append('limit', params.limit);

      const [transactionsRes, statsRes] = await Promise.all([
        apiClient.get(`/admin/transactions?${fallbackParams.toString()}`),
        apiClient.get('/admin/transactions/stats')
      ]);

      const txPayload = transactionsRes?.data ? transactionsRes.data : transactionsRes;
      const statsPayload = statsRes?.data ? statsRes.data : statsRes;

      const transactions = txPayload?.transactions || [];
      const stats = statsPayload || {};

      const payments = transactions.map((txn) => ({
        ...txn,
        vendorName: txn.businessName || txn.vendor?.businessName || null,
        status: txn.status === 'paid' ? 'success' : txn.status,
        paymentDate: txn.paidAt || txn.failedAt || txn.cancelledAt || txn.createdAt,
        durationDays: Number(txn.durationDays || 30),
        bonusDays: Number(txn.bonusDays || 0),
        totalDays: Number(txn.durationDays || 30) + Number(txn.bonusDays || 0),
        planStartDate: txn.vendor?.subscription?.startDate || null,
        planExpiryDate: txn.vendor?.subscription?.expiryDate || null,
        daysRemaining: txn.vendor?.subscription?.status === 'active' && txn.vendor?.subscription?.expiryDate
          ? Math.max(0, Math.ceil((new Date(txn.vendor.subscription.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
          : null,
        subscriptionStatus: txn.vendor?.subscription?.status || null,
        currentPlanKey: txn.vendor?.subscription?.planKey || null,
        currentPlanName: txn.vendor?.subscription?.planName || null,
        isLastPaymentForSubscription: Boolean(
          txn.vendor?.subscription && (
            txn.vendor.subscription.lastPaymentId === txn.paymentId ||
            txn.vendor.subscription.lastOrderId === txn.orderId
          )
        ),
        isQueuedPayment: Boolean(
          txn.vendor?.subscription?.upcomingPlan && (
            txn.vendor.subscription.upcomingPlan.paymentId === txn.paymentId ||
            txn.vendor.subscription.upcomingPlan.orderId === txn.orderId
          )
        )
      }));

      const successCount = stats?.byStatus?.paid?.count || 0;
      const failedCount = (stats?.byStatus?.failed?.count || 0) + (stats?.byStatus?.cancelled?.count || 0);
      const refundedCount = stats?.byStatus?.refunded?.count || 0;
      const totalCount = Object.values(stats?.byStatus || {}).reduce((sum, item) => sum + (item?.count || 0), 0);
      const totalRevenue = stats?.totalRevenue || 0;

      return {
        data: {
          payments,
          summary: {
            totalRevenue,
            successCount,
            failedCount,
            refundedCount,
            totalCount
          }
        }
      };
    }
  } catch (error) {
    console.error('❌ Error fetching payments:', error);
    throw error;
  }
};

// Export the axios instance for custom requests
export default apiClient;
