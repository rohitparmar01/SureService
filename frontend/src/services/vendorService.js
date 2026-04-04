/**
 * Vendor Service
 * Handles vendor profile, media uploads, and dashboard operations
 */

import apiClient from './api';

// ==================== MEDIA UPLOADS (via backend) ====================

/**
 * Upload vendor image via backend
 * Used for: Profile image, Cover image, Portfolio images
 */
export const uploadVendorImage = async (file, folder = 'vendors/images') => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const response = await apiClient.post('/vendor-profile/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    if (!response.success) {
      throw new Error(response.message || 'Upload failed');
    }

    return response.data;
  } catch (error) {
    console.error('❌ Error uploading vendor image:', error);
    throw new Error(error.response?.data?.message || error.message || 'Failed to upload image');
  }
};

/**
 * Upload vendor video via backend
 * Used for: Portfolio videos, promotional videos
 */
export const uploadVendorVideo = async (file) => {
  try {
    const formData = new FormData();
    formData.append('media', file);

    const response = await apiClient.post('/vendor-profile/videos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    if (!response.success) {
      throw new Error(response.message || 'Upload failed');
    }

    return response.data;
  } catch (error) {
    console.error('❌ Error uploading vendor video:', error);
    throw new Error(error.response?.data?.message || error.message || 'Failed to upload video');
  }
};

// ==================== VENDOR PROFILE ====================

/**
 * Get vendor profile
 */
export const getVendorProfile = async () => {
  try {
    const response = await apiClient.get('/vendor-profile/profile/me');
    return response;
  } catch (error) {
    console.error('❌ Error fetching vendor profile:', error);
    throw error;
  }
};

/**
 * Update vendor profile (with Cloudinary URLs)
 */
export const updateVendorProfile = async (profileData) => {
  try {
    const response = await apiClient.put('/vendor-profile/profile/update', profileData);
    return response;
  } catch (error) {
    console.error('❌ Error updating vendor profile:', error);
    throw error;
  }
};

/**
 * Update vendor business stats only
 */
export const updateVendorBusinessStats = async (statsData) => {
  try {
    const response = await apiClient.put('/vendor-profile/profile/business-stats', statsData);
    return response;
  } catch (error) {
    console.error('❌ Error updating vendor business stats:', error);
    throw error;
  }
};

// ==================== VENDOR MEDIA (Portfolio) ====================

/**
 * Get vendor media (portfolio images/videos)
 */
export const getVendorMedia = async () => {
  try {
    const response = await apiClient.get('/vendor-profile/media');
    return response;
  } catch (error) {
    console.error('❌ Error fetching vendor media:', error);
    throw error;
  }
};

/**
 * Add media to vendor portfolio
 * @param {Object} mediaData - { url, publicId, type, caption, isFeatured, metadata }
 */
export const addVendorMedia = async (mediaData) => {
  try {
    const response = await apiClient.post('/vendor-profile/media', mediaData);
    return response;
  } catch (error) {
    console.error('❌ Error adding vendor media:', error);
    throw error;
  }
};

/**
 * Delete media from vendor portfolio
 */
export const deleteVendorMedia = async (mediaId) => {
  try {
    const response = await apiClient.delete(`/vendor-profile/media/${mediaId}`);
    return response;
  } catch (error) {
    console.error('❌ Error deleting vendor media:', error);
    throw error;
  }
};

/**
 * Update media details (caption, featured status, etc.)
 */
export const updateVendorMedia = async (mediaId, updates) => {
  try {
    const response = await apiClient.put(`/vendor-profile/media/${mediaId}`, updates);
    return response;
  } catch (error) {
    console.error('❌ Error updating vendor media:', error);
    throw error;
  }
};

// ==================== VENDOR BLOGS ====================

/**
 * Get vendor's blogs
 */
export const getVendorBlogs = async () => {
  try {
    const response = await apiClient.get('/vendor-profile/blogs');
    return response;
  } catch (error) {
    console.error('❌ Error fetching vendor blogs:', error);
    throw error;
  }
};

/**
 * Create vendor blog (with Cloudinary cover image)
 */
export const createVendorBlog = async (blogData) => {
  try {
    const response = await apiClient.post('/vendor-profile/blogs', blogData);
    return response;
  } catch (error) {
    console.error('❌ Error creating vendor blog:', error);
    throw error;
  }
};

/**
 * Update vendor blog
 */
export const updateVendorBlog = async (blogId, blogData) => {
  try {
    const response = await apiClient.put(`/vendor-profile/blogs/${blogId}`, blogData);
    return response;
  } catch (error) {
    console.error('❌ Error updating vendor blog:', error);
    throw error;
  }
};

/**
 * Delete vendor blog
 */
export const deleteVendorBlog = async (blogId) => {
  try {
    const response = await apiClient.delete(`/vendor-profile/blogs/${blogId}`);
    return response;
  } catch (error) {
    console.error('❌ Error deleting vendor blog:', error);
    throw error;
  }
};

// ==================== VENDOR REGISTRATION ====================

/**
 * Register new vendor (with Cloudinary images)
 */
export const registerVendor = async (vendorData) => {
  try {
    const response = await apiClient.post('/vendors/register', vendorData);
    return response;
  } catch (error) {
    console.error('❌ Error registering vendor:', error);
    throw error;
  }
};

export default {
  uploadVendorImage,
  uploadVendorVideo,
  getVendorProfile,
  updateVendorProfile,
  updateVendorBusinessStats,
  getVendorMedia,
  addVendorMedia,
  deleteVendorMedia,
  updateVendorMedia,
  getVendorBlogs,
  createVendorBlog,
  updateVendorBlog,
  deleteVendorBlog,
  registerVendor
};
