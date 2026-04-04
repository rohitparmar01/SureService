import axios from 'axios';
import apiClient from './api';

const cloudName = String(import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '').trim();
const configuredUploadPreset = String(import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '').trim();

const ensureCloudinaryConfig = () => {
  if (!cloudName) {
    throw new Error('Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME.');
  }
};

const buildUploadUrl = (resourceType = 'auto') => {
  ensureCloudinaryConfig();
  return `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
};

const getSignedUploadParams = async ({ resourceType, folder, uploadPreset: preset }) => {
  const response = await apiClient.post('/vendor-profile/cloudinary-signature', {
    resourceType,
    folder,
    uploadPreset: preset
  });

  if (!response?.success || !response?.data?.signature) {
    throw new Error(response?.message || 'Failed to get Cloudinary upload signature.');
  }

  return response.data;
};

const buildVideoThumbnailFromUrl = (videoUrl = '') => {
  if (!videoUrl || typeof videoUrl !== 'string') return '';

  const transformed = videoUrl.replace(
    /\/video\/upload\//,
    '/video/upload/so_auto,f_jpg,w_640,h_360,c_fill,q_auto/'
  );

  return transformed.replace(/\.(mp4|mov|avi|webm|m4v|qt|mkv)(\?.*)?$/i, '.jpg');
};

const normalizeCloudinaryResponse = (data = {}, resourceType = 'auto') => {
  const url = data.secure_url || data.url || '';
  return {
    url,
    publicId: data.public_id || '',
    duration: data.duration || 0,
    width: data.width || 0,
    height: data.height || 0,
    format: data.format || '',
    size: data.bytes || 0,
    thumbnail: resourceType === 'video' ? buildVideoThumbnailFromUrl(url) : url
  };
};

export const uploadToCloudinary = async (file, options = {}) => {
  const {
    resourceType = 'auto',
    folder,
    tags,
    context,
    onProgress,
    timeout = 15 * 60 * 1000
  } = options;

  if (!file) {
    throw new Error('No file provided for upload.');
  }

  ensureCloudinaryConfig();
  const preset = String(options.uploadPreset || configuredUploadPreset).trim();
  const signedParams = await getSignedUploadParams({
    resourceType,
    folder,
    uploadPreset: preset || undefined
  });

  const formData = new FormData();
  formData.append('file', file);
  if (preset) {
    formData.append('upload_preset', preset);
  }
  formData.append('api_key', signedParams.apiKey);
  formData.append('timestamp', signedParams.timestamp);
  formData.append('signature', signedParams.signature);

  if (folder) formData.append('folder', folder);
  if (tags) formData.append('tags', tags);
  if (context) formData.append('context', context);

  const response = await axios.post(buildUploadUrl(resourceType), formData, {
    timeout,
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: (event) => {
      if (typeof onProgress === 'function' && event.total) {
        onProgress(Math.round((event.loaded * 100) / event.total));
      }
    }
  });

  const normalized = normalizeCloudinaryResponse(response.data, resourceType);
  if (!normalized.url || !normalized.publicId) {
    throw new Error('Cloudinary upload did not return URL/publicId.');
  }

  return normalized;
};

export const uploadVendorImageDirect = (file, onProgress) =>
  uploadToCloudinary(file, {
    resourceType: 'image',
    folder: 'vendors/images',
    onProgress,
    timeout: 5 * 60 * 1000
  });

export const uploadVendorVideoDirect = (file, onProgress) =>
  uploadToCloudinary(file, {
    resourceType: 'video',
    folder: 'vendors/videos',
    onProgress,
    timeout: 20 * 60 * 1000
  });

export default {
  uploadToCloudinary,
  uploadVendorImageDirect,
  uploadVendorVideoDirect
};
