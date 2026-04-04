import apiClient from './api';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Blog Service
 * Handles all blog-related API calls (admin and public)
 */

// ==================== ADMIN BLOG APIs ====================

export const fetchAllBlogsAdmin = async (params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiClient.get(`/admin/blogs?${queryString}`);
    return response;
  } catch (error) {
    console.error('❌ Error fetching admin blogs:', error);
    throw error;
  }
};

export const getBlogByIdAdmin = async (blogId) => {
  try {
    const response = await apiClient.get(`/admin/blogs/${blogId}`);
    return response;
  } catch (error) {
    console.error('❌ Error fetching blog:', error);
    throw error;
  }
};

export const createBlog = async (blogData) => {
  try {
    const response = await apiClient.post('/admin/blogs', blogData);
    return response;
  } catch (error) {
    console.error('❌ Error creating blog:', error);
    throw error;
  }
};

export const updateBlog = async (blogId, blogData) => {
  try {
    const response = await apiClient.put(`/admin/blogs/${blogId}`, blogData);
    return response;
  } catch (error) {
    console.error('❌ Error updating blog:', error);
    throw error;
  }
};

export const deleteBlog = async (blogId) => {
  try {
    const response = await apiClient.delete(`/admin/blogs/${blogId}`);
    return response;
  } catch (error) {
    console.error('❌ Error deleting blog:', error);
    throw error;
  }
};

export const toggleBlogPublish = async (blogId) => {
  try {
    const response = await apiClient.patch(`/admin/blogs/${blogId}/toggle-publish`, {});
    return response;
  } catch (error) {
    console.error('❌ Error toggling blog status:', error);
    throw error;
  }
};

export const getBlogStats = async () => {
  try {
    const response = await apiClient.get('/admin/blogs/stats');
    return response;
  } catch (error) {
    console.error('❌ Error fetching blog stats:', error);
    throw error;
  }
};

// ==================== PUBLIC BLOG APIs ====================

export const fetchPublishedBlogs = async (params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiClient.get(`/blogs?${queryString}`);
    return response;
  } catch (error) {
    console.error('❌ Error fetching published blogs:', error);
    throw error;
  }
};

export const getBlogBySlug = async (slug, options = {}) => {
  try {
    const query = new URLSearchParams();
    if (typeof options.trackView !== 'undefined') {
      query.set('trackView', options.trackView ? 'true' : 'false');
    }
    const queryString = query.toString();
    const response = await apiClient.get(`/blogs/${slug}${queryString ? `?${queryString}` : ''}`);
    return response;
  } catch (error) {
    console.error('❌ Error fetching blog by slug:', error);
    throw error;
  }
};

export const getBlogCategories = async () => {
  try {
    const response = await apiClient.get('/blogs/categories');
    return response;
  } catch (error) {
    console.error('❌ Error fetching blog categories:', error);
    throw error;
  }
};

export const getBlogTags = async () => {
  try {
    const response = await apiClient.get('/blogs/tags');
    return response;
  } catch (error) {
    console.error('❌ Error fetching blog tags:', error);
    throw error;
  }
};

// ==================== IMAGE UPLOAD (via backend) ====================

export const uploadBlogImage = async (file) => {
  try {
    const { default: apiClient } = await import('./api');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'blogs');

    const response = await apiClient.post('/vendor-profile/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    if (!response.success) {
      throw new Error(response.message || 'Upload failed');
    }

    return {
      url: response.data.url,
      publicId: response.data.publicId
    };
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    throw new Error(error.response?.data?.message || error.message || 'Failed to upload image');
  }
};
