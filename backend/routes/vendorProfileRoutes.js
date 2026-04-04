/**
 * Vendor Profile Routes
 * RESTful API routes for vendor profile management
 * Separate public and authenticated routes
 */

const express = require('express');
const router = express.Router();
const vendorProfileController = require('../controllers/vendorProfileController');
const { protect, vendorProtect } = require('../middleware/authMiddleware');
const multer = require('multer');
const { cloudinary } = require('../utils/cloudinaryHelper');

// Configure multer for IMAGE uploads only (memory storage for Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max for images
  },
  fileFilter: (req, file, cb) => {
    // IMAGES ONLY - videos should use /videos endpoint
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else if (file.mimetype.startsWith('video/')) {
      cb(new Error('Videos must be uploaded through the /videos endpoint, not /media'));
    } else {
      cb(new Error('Invalid file type. Only image files (JPG, PNG, etc.) are allowed.'));
    }
  }
});

// Separate multer instance for videos — higher size limit, video types only
const uploadVideoMulter = multer({
  storage,
  limits: {
    fileSize: 200 * 1024 * 1024 // 200MB for videos
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files are allowed here.'));
    }
  }
});

const multerErrorResponse = (error, res) => {
  if (!error) return false;

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: 'File exceeds upload size limit.'
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message || 'Upload failed due to invalid file payload.'
    });
  }

  return res.status(400).json({
    success: false,
    message: error.message || 'Upload failed due to invalid file.'
  });
};

const buildVideoThumbnailFromUrl = (videoUrl = '') => {
  if (!videoUrl) return '';

  const transformed = videoUrl.replace(
    /\/video\/upload\//,
    '/video/upload/so_auto,f_jpg,w_640,h_360,c_fill,q_auto/'
  );

  return transformed.replace(/\.(mp4|mov|avi|webm|m4v|qt|mkv)(\?.*)?$/i, '.jpg');
};

const isImageUrl = (value = '') => {
  if (!value || typeof value !== 'string') return false;
  return /\.(jpg|jpeg|png|webp|gif|avif)(\?.*)?$/i.test(value);
};

// ========================================
// AUTHENTICATED VENDOR ROUTES (Must come BEFORE parameterized routes)
// ========================================

/**
 * GET /api/vendor-profile/profile/me
 * Get vendor's own profile data for editing
 */
router.get('/profile/me', vendorProtect, vendorProfileController.getMyProfile);

/**
 * PUT /api/vendor-profile/profile/update
 * Update vendor's own profile information
 * Body: { businessName, description, city, area, contact, etc. }
 */
router.put('/profile/update', vendorProtect, vendorProfileController.updateVendorProfile);

/**
 * PUT /api/vendor-profile/profile/business-stats
 * Update vendor business stats only
 */
router.put('/profile/business-stats', vendorProtect, vendorProfileController.updateVendorBusinessStats);

/**
 * GET /api/vendor-profile/dashboard/me
 * Get vendor's own dashboard data (includes drafts and hidden content)
 */
router.get('/dashboard/me', vendorProtect, vendorProfileController.getVendorDashboard);

// ========================================
// REVIEW MANAGEMENT (Vendor)
// ========================================

/**
 * GET /api/vendor-profile/reviews
 * Get all approved reviews for this vendor (vendor dashboard)
 */
router.get('/reviews', vendorProtect, async (req, res) => {
  try {
    const VendorReview = require('../models/VendorReview');
    const vendorId = req.vendor._id;

    const reviews = await VendorReview.find({ vendorId, status: 'approved' })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: reviews });
  } catch (error) {
    console.error('Fetch vendor reviews error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch reviews' });
  }
});

/**
 * POST /api/vendor-profile/reviews/:reviewId/reply
 * Submit or update a vendor reply on a review
 * Body: { comment: string }
 */
router.post('/reviews/:reviewId/reply', vendorProtect, async (req, res) => {
  try {
    const VendorReview = require('../models/VendorReview');
    const vendorId = req.vendor._id;
    const { reviewId } = req.params;
    const { comment } = req.body;

    if (!comment || !comment.trim()) {
      return res.status(400).json({ success: false, message: 'Reply comment cannot be empty' });
    }

    const review = await VendorReview.findOne({ _id: reviewId, vendorId, status: 'approved' });

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    review.vendorResponse = {
      comment: comment.trim(),
      respondedAt: new Date()
    };
    await review.save();

    const updated = await VendorReview.findById(reviewId).populate('userId', 'name email');

    res.json({ success: true, message: 'Reply posted successfully', data: updated });
  } catch (error) {
    console.error('Vendor reply error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to post reply' });
  }
});

// ========================================
// GENERIC UPLOAD ENDPOINTS (used by profile/cover/blog image uploads)
// ========================================

/**
 * POST /api/vendor-profile/upload-image
 * Upload a single image to Cloudinary and return the URL
 * Body: multipart/form-data with 'file' field, optional 'folder' field
 * NOTE: No auth required — this only uploads and returns a URL.
 *       Actual data persistence routes remain protected.
 */
router.post('/upload-image', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }

    const { uploadImage } = require('../utils/cloudinaryHelper');
    const folder = req.body.folder || 'vendors/images';

    const result = await uploadImage(req.file.buffer, { folder });

    res.json({
      success: true,
      data: {
        url: result.url,
        publicId: result.publicId,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.size
      }
    });
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to upload image' });
  }
});

/**
 * POST /api/vendor-profile/cloudinary-signature
 * Generate signed upload parameters for direct Cloudinary uploads
 * Body: { resourceType, folder, uploadPreset }
 */
router.post('/cloudinary-signature', vendorProtect, async (req, res) => {
  try {
    const resourceType = String(req.body?.resourceType || 'auto').trim();
    const folder = String(req.body?.folder || '').trim();
    const uploadPreset = String(req.body?.uploadPreset || '').trim();

    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign = { timestamp };

    if (uploadPreset) {
      paramsToSign.upload_preset = uploadPreset;
    }

    if (folder) paramsToSign.folder = folder;

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    );

    return res.json({
      success: true,
      data: {
        timestamp,
        signature,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        uploadPreset: uploadPreset || null,
        folder,
        resourceType
      }
    });
  } catch (error) {
    console.error('Cloudinary signature generation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate upload signature'
    });
  }
});

// ========================================
// MEDIA MANAGEMENT
// ========================================

/**
 * GET /api/vendor-profile/media
 * Get vendor's portfolio media (photos/videos)
 */
router.get('/media', vendorProtect, vendorProfileController.getVendorMedia);

/**
 * POST /api/vendor-profile/media
 * Add media - supports two methods:
 * 1. With file upload (multipart/form-data)
 * 2. With Cloudinary URL in body (application/json)
 */
router.post('/media', vendorProtect, (req, res, next) => {
  upload.single('file')(req, res, (error) => {
    if (error) {
      return multerErrorResponse(error, res);
    }

    // If file uploaded, use uploadMedia; otherwise use addMedia
    if (req.file) {
      return vendorProfileController.uploadMedia(req, res, next);
    }

    return vendorProfileController.addMedia(req, res, next);
  });
});

/**
 * DELETE /api/vendor-profile/media/:mediaId
 * Delete media by ID
 */
router.delete('/media/:mediaId', vendorProtect, vendorProfileController.deleteMedia);

/**
 * PUT /api/vendor-profile/media/reorder
 * Reorder media items
 * Body: { mediaOrder: [{ mediaId, orderIndex }] }
 */
router.put('/media/reorder', vendorProtect, vendorProfileController.reorderMedia);

/**
 * PATCH /api/vendor-profile/media/:mediaId/toggle-visibility
 * Toggle media visibility (public/hidden)
 */
router.patch('/media/:mediaId/toggle-visibility', vendorProtect, async (req, res) => {
  try {
    const VendorMedia = require('../models/VendorMedia');
    const vendorId = req.vendor._id;
    const { mediaId } = req.params;

    const media = await VendorMedia.findOne({ _id: mediaId, vendorId });
    
    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }

    media.visibility = media.visibility === 'public' ? 'hidden' : 'public';
    await media.save();

    res.json({
      success: true,
      data: media
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to toggle visibility'
    });
  }
});

// ========================================
// PUBLIC ROUTES
// ========================================

/**
 * GET /api/vendor-profile/:vendorId
 * Get complete public vendor profile
 */
router.get('/:vendorId', vendorProfileController.getVendorProfile);

/**
 * PATCH /api/vendor-profile/media/:mediaId/feature
 * Toggle featured status
 */
router.patch('/media/:mediaId/feature', vendorProtect, async (req, res) => {
  try {
    const VendorMedia = require('../models/VendorMedia');
    const vendorId = req.vendor._id;
    const { mediaId } = req.params;

    const media = await VendorMedia.findOne({ _id: mediaId, vendorId });
    
    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }

    media.isFeatured = !media.isFeatured;
    await media.save();

    res.json({
      success: true,
      message: 'Featured status updated',
      data: media
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update featured status'
    });
  }
});

// ========================================
// BLOG MANAGEMENT
// ========================================

/**
 * POST /api/vendor-profile/blogs
 * Create new blog post
 */
router.post('/blogs', vendorProtect, vendorProfileController.createBlog);

/**
 * PUT /api/vendor-profile/blogs/:blogId
 * Update blog post
 */
router.put('/blogs/:blogId', vendorProtect, vendorProfileController.updateBlog);

/**
 * DELETE /api/vendor-profile/blogs/:blogId
 * Delete blog post
 */
router.delete('/blogs/:blogId', vendorProtect, vendorProfileController.deleteBlog);

/**
 * PATCH /api/vendor-profile/blogs/:blogId/publish
 * Publish draft blog
 */
router.patch('/blogs/:blogId/publish', vendorProtect, async (req, res) => {
  try {
    const VendorBlog = require('../models/VendorBlog');
    const vendorId = req.vendor._id;
    const { blogId } = req.params;

    const existingBlog = await VendorBlog.findOne({ _id: blogId, vendorId });

    if (!existingBlog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    if (!existingBlog.title?.trim() || !existingBlog.excerpt?.trim() || !existingBlog.content?.trim() || !existingBlog.coverImage?.url) {
      return res.status(400).json({
        success: false,
        message: 'Cannot publish. Title, excerpt, content, and cover image are required.'
      });
    }

    const blog = await VendorBlog.findOneAndUpdate(
      { _id: blogId, vendorId },
      { status: 'published', publishedAt: new Date() },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Blog published successfully',
      data: blog
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to publish blog'
    });
  }
});

// ========================================
// VIDEO MANAGEMENT
// ========================================

/**
 * POST /api/vendor-profile/videos
 * Upload new video - supports two methods:
 * 1. With file upload (multipart/form-data)
 * 2. With Cloudinary URL in body (application/json)
 */
router.post('/videos', vendorProtect, (req, res) => {
  uploadVideoMulter.single('media')(req, res, async (multerError) => {
    if (multerError) {
      return multerErrorResponse(multerError, res);
    }

  try {
    const VendorVideo = require('../models/VendorVideo');
    const VendorNew = require('../models/VendorNew');
    const VendorMedia = require('../models/VendorMedia');
    const { uploadVideo } = require('../utils/cloudinaryHelper');
    const { getVendorLimits } = require('../controllers/vendorProfileController');
    
    const vendorId = req.vendor._id;
    const file = req.file;

    // Check vendor plan limits - IMPORTANT: Use combined media count
    const vendor = await VendorNew.findById(vendorId);
    const planKey = vendor?.subscription?.planKey || 'free';
    const limits = getVendorLimits(planKey);

    // RULE 1: Free plan - Videos NOT allowed
    if (planKey === 'free') {
      return res.status(403).json({
        success: false,
        message: 'Video uploads are not available in the Free Plan. Upgrade to Starter Plan (₹499) or higher to upload videos.',
        upgradeRequired: true,
        currentPlan: limits.planName,
        suggestedPlan: 'Starter Plan (₹499)'
      });
    }

    // RULE 2: Check COMBINED media count (images + videos together)
    const currentTotalCount = await VendorMedia.countDocuments({ vendorId });
    
    if (limits.portfolioLimit !== -1 && currentTotalCount >= limits.portfolioLimit) {
      return res.status(403).json({
        success: false,
        message: `Portfolio limit reached (${currentTotalCount}/${limits.portfolioLimit}). Your ${limits.planName} allows ${limits.portfolioLimit} images/videos combined. Upgrade to access more storage.`,
        upgradeRequired: true,
        currentPlan: limits.planName,
        currentCount: currentTotalCount,
        limit: limits.portfolioLimit,
        suggestedPlan: planKey === 'starter' ? 'Growth Plan (₹999)' : 'Premium Plan (₹1499)'
      });
    }

    const nextVideoNumber = await VendorMedia.countDocuments({ vendorId, type: 'video' }) + 1;
    const autoVideoTitle = `Portfolio Video ${nextVideoNumber}`;

    let videoData;

    // Method 1: File uploaded (legacy backend upload)
    if (file) {
      const { description } = req.body;
      
      // Upload to Cloudinary
      const uploadResult = await uploadVideo(file.buffer || file.path);

      const uploadResultThumbnail = String(uploadResult.thumbnail || '').trim();
      const resolvedThumbnail = isImageUrl(uploadResultThumbnail)
        ? uploadResultThumbnail
        : buildVideoThumbnailFromUrl(uploadResult.url);

      videoData = {
        vendorId,
        videoUrl: uploadResult.url,
        publicId: uploadResult.publicId,
        title: autoVideoTitle,
        description: description || '',
        duration: uploadResult.duration,
        thumbnail: {
          url: resolvedThumbnail
        },
        metadata: {
          width: uploadResult.width,
          height: uploadResult.height,
          format: uploadResult.format,
          size: uploadResult.size
        }
      };
    } 
    // Method 2: Pre-uploaded URL provided (frontend upload)
    else {
      const { url, publicId, description, thumbnail, duration, width, height, format, size } = req.body;
      
      if (!url || !publicId) {
        return res.status(400).json({
          success: false,
          message: 'Either provide a video file or URL with publicId'
        });
      }

      const thumbnailInput = typeof thumbnail === 'string'
        ? thumbnail.trim()
        : String(thumbnail?.url || '').trim();

      const resolvedThumbnail = isImageUrl(thumbnailInput)
        ? thumbnailInput
        : buildVideoThumbnailFromUrl(url);

      videoData = {
        vendorId,
        videoUrl: url,
        publicId,
        title: autoVideoTitle,
        description: description || '',
        duration: duration || 0,
        thumbnail: {
          url: resolvedThumbnail
        },
        metadata: {
          width: width || 0,
          height: height || 0,
          format: format || 'video',
          size: size || 0
        }
      };
    }

    // Create video record
    const video = new VendorVideo(videoData);
    await video.save();

    // IMPORTANT: Also create VendorMedia record for combined portfolio count
    const mediaRecord = new VendorMedia({
      vendorId,
      type: 'video',
      url: videoData.videoUrl,
      publicId: videoData.publicId,
      caption: videoData.title || '',
      orderIndex: await VendorMedia.countDocuments({ vendorId }), // Add to end
      visibility: 'public',
      approvalStatus: 'pending'
    });
    await mediaRecord.save();

    res.status(201).json({
      success: true,
      message: 'Video uploaded successfully',
      data: video
    });
  } catch (error) {
    console.error('Upload video error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload video'
    });
  }
  });
});

/**
 * PATCH /api/vendor-profile/videos/:videoId/toggle-visibility
 * Toggle video visibility (public/hidden)
 */
router.patch('/videos/:videoId/toggle-visibility', vendorProtect, async (req, res) => {
  try {
    const VendorVideo = require('../models/VendorVideo');
    const vendorId = req.vendor._id;
    const { videoId } = req.params;

    const video = await VendorVideo.findOne({ _id: videoId, vendorId });
    
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    video.visibility = video.visibility === 'public' ? 'hidden' : 'public';
    await video.save();

    res.json({
      success: true,
      message: 'Video visibility updated',
      data: video
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update visibility'
    });
  }
});

/**
 * DELETE /api/vendor-profile/videos/:videoId
 * Delete video
 */
router.delete('/videos/:videoId', vendorProtect, async (req, res) => {
  try {
    const VendorVideo = require('../models/VendorVideo');
    const VendorMedia = require('../models/VendorMedia');
    const { deleteFile } = require('../utils/cloudinaryHelper');
    
    const vendorId = req.vendor._id;
    const { videoId } = req.params;

    const video = await VendorVideo.findOne({ _id: videoId, vendorId });

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Delete from Cloudinary
    await deleteFile(video.publicId, 'video');

    // Delete from VendorVideo database
    await video.deleteOne();

    // IMPORTANT: Also delete from VendorMedia to maintain accurate combined count
    await VendorMedia.deleteOne({ vendorId, publicId: video.publicId, type: 'video' });

    res.json({
      success: true,
      message: 'Video deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete video'
    });
  }
});

module.exports = router;
