/**
 * Cloudinary Upload Utility
 * Handles image and video uploads to Cloudinary
 * Production-safe with error handling and optimization
 */

const cloudinaryLib = require('cloudinary').v2;

// Graceful handling when Cloudinary credentials are absent.
const hasCloudinaryConfig = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

let cloudinary;
if (!hasCloudinaryConfig) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET must be set in environment variables');
  }

  console.warn('Cloudinary credentials not found — running without Cloudinary (development mode). Uploads will fail with informative errors.');

  // Provide a stubbed cloudinary object so imports don't crash in dev/test.
  cloudinary = {
    uploader: {
      upload: async () => {
        throw new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to enable uploads.');
      },
      upload_stream: (_options, callback) => {
        const { PassThrough } = require('stream');
        const pt = new PassThrough();
        process.nextTick(() =>
          callback(new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to enable uploads.'))
        );
        return pt;
      },
      destroy: async () => ({ result: 'not-configured' })
    },
    url: (publicId) => `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME || 'demo'}/image/upload/${publicId}`
  };
} else {
  cloudinaryLib.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  cloudinary = cloudinaryLib;
}

// Log configuration on startup (mask sensitive data)

/**
 * Upload image to Cloudinary
 * @param {Buffer|String} fileBuffer - File buffer or base64 string or file path
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result with url and publicId
 */
const uploadImage = async (fileBuffer, options = {}) => {
  try {
    const defaultOptions = {
      folder: 'sureservice-vendors/images',
      resource_type: 'image',
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ],
      ...options
    };

    // Convert Buffer to base64 data URI if it's a Buffer
    let uploadData = fileBuffer;
    if (Buffer.isBuffer(fileBuffer)) {
      uploadData = `data:image/jpeg;base64,${fileBuffer.toString('base64')}`;
    }

    const result = await cloudinary.uploader.upload(uploadData, defaultOptions);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes
    };
  } catch (error) {
    console.error('Cloudinary image upload error:', error);
    throw new Error('Failed to upload image');
  }
};

/**
 * Upload video to Cloudinary
 * @param {Buffer|String} fileBuffer - File buffer or base64 string or file path
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result with url and publicId
 */
const uploadVideo = async (fileBuffer, options = {}) => {
  try {
    const defaultOptions = {
      folder: 'sureservice-vendors/videos',
      resource_type: 'video',
      allowed_formats: ['mp4', 'mov', 'avi', 'webm', 'quicktime'],
      chunk_size: 6 * 1024 * 1024, // 6 MB chunks — reliable for large files
      timeout: 300000,              // 5 minutes — Cloudinary SDK timeout
      ...options
    };

    // Stream the buffer directly — avoids base64 inflation and hardcoded MIME type
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(defaultOptions, (error, result) => {
        if (error) return reject(error);
        resolve(result);
      });
      stream.end(fileBuffer);
    });

    const thumbnailUrl = cloudinary.url(result.public_id, {
      resource_type: 'video',
      format: 'jpg',
      secure: true,
      transformation: [
        { start_offset: 'auto' },
        { width: 640, height: 360, crop: 'fill', gravity: 'auto' },
        { quality: 'auto' }
      ]
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      duration: result.duration,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes,
      thumbnail: thumbnailUrl
    };
  } catch (error) {
    console.error('Cloudinary video upload error:', error);
    throw new Error('Failed to upload video');
  }
};

/**
 * Delete file from Cloudinary
 * @param {String} publicId - Cloudinary public_id
 * @param {String} resourceType - 'image' or 'video'
 * @returns {Promise<Object>} Deletion result
 */
const deleteFile = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete file');
  }
};

/**
 * Generate optimized image URL
 * @param {String} publicId - Cloudinary public_id
 * @param {Object} transformation - Transformation options
 * @returns {String} Optimized URL
 */
const getOptimizedUrl = (publicId, transformation = {}) => {
  return cloudinary.url(publicId, {
    quality: 'auto:good',
    fetch_format: 'auto',
    ...transformation
  });
};

module.exports = {
  uploadImage,
  uploadVideo,
  deleteFile,
  getOptimizedUrl,
  cloudinary
};
