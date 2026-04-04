/**
 * Vendor Profile Controller
 * Handles vendor profile management - media, blogs, videos, reviews
 * Instagram + LinkedIn style profile system
 */

const VendorNew = require('../models/VendorNew');
const VendorMedia = require('../models/VendorMedia');
const VendorBlog = require('../models/VendorBlog');
const VendorVideo = require('../models/VendorVideo');
const VendorReview = require('../models/VendorReview');
const { uploadImage, uploadVideo, deleteFile } = require('../utils/cloudinaryHelper');

const PROFILE_DESCRIPTION_MAX_CHARS = 500;

const normalizePhone = (value) => String(value || '').replace(/\D/g, '').slice(0, 10);

const isValidHttpUrl = (value) => {
  if (!value) return false;
  try {
    const normalized = value.startsWith('http://') || value.startsWith('https://')
      ? value
      : `https://${value}`;
    const parsed = new URL(normalized);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch (error) {
    return false;
  }
};

const normalizeMediaUrlInput = (value) => {
  if (!value) return '';

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return isValidHttpUrl(trimmed) ? trimmed : '';
  }

  if (typeof value === 'object' && typeof value.url === 'string') {
    const trimmed = value.url.trim();
    return isValidHttpUrl(trimmed) ? trimmed : '';
  }

  return '';
};

const buildVideoThumbnailFromUrl = (videoUrl = '') => {
  if (!videoUrl || typeof videoUrl !== 'string') return '';

  const transformed = videoUrl.replace(
    /\/video\/upload\//,
    '/video/upload/so_auto,f_jpg,w_640,h_360,c_fill,q_auto/'
  );

  return transformed.replace(/\.(mp4|mov|avi|webm|mkv|m4v|qt)(\?.*)?$/i, '.jpg');
};

const isImageUrl = (value = '') => {
  if (!value || typeof value !== 'string') return false;
  return /\.(jpg|jpeg|png|webp|gif|avif)(\?.*)?$/i.test(value) || /[?&]f_jpg\b/i.test(value);
};

const getNextPortfolioLabel = async (vendorId, type) => {
  const normalizedType = type === 'video' ? 'video' : 'image';
  const prefix = normalizedType === 'video' ? 'Portfolio Video' : 'Portfolio Image';
  const currentCount = await VendorMedia.countDocuments({
    vendorId,
    type: normalizedType
  });
  return `${prefix} ${currentCount + 1}`;
};

/**
 * Helper: Get vendor plan limits
 * Updated with structured subscription plans
 */
const getVendorLimits = function(planType) {
  const limits = {
    free: {
      portfolioLimit: 5,        // 5 images total (NO videos allowed)
      blogLimit: 2,
      allowVideos: false,       // Video upload disabled
      planName: 'Free Plan',
      planPrice: '₹0',
      features: ['Basic listing', 'Up to 5 images only', 'No videos']
    },
    starter: {
      portfolioLimit: 15,       // 15 COMBINED total (images + videos together)
      blogLimit: 10,
      allowVideos: true,        // Video upload enabled
      planName: 'Starter Plan',
      planPrice: '₹499',
      features: ['Verified badge', 'Up to 15 images/videos (combined)', 'Images & Videos', 'Blog posts']
    },
    growth: {
      portfolioLimit: 30,       // 30 COMBINED total (images + videos together)
      blogLimit: 30,
      allowVideos: true,        // Video upload enabled
      planName: 'Growth Plan',
      planPrice: '₹999',
      features: ['Featured placement', 'Up to 30 images/videos (combined)', 'Images & Videos', 'Priority listing']
    },
    premium: {
      portfolioLimit: -1,       // Unlimited (images + videos)
      blogLimit: -1,
      allowVideos: true,        // Video upload enabled
      planName: 'Premium Plan',
      planPrice: '₹1499',
      features: ['Premium badge', 'Unlimited images/videos', 'Unlimited blogs', '24/7 Priority support']
    }
  };

  return limits[planType] || limits.free;
};

/**
 * Get complete vendor profile (Public)
 * Fetches all profile data dynamically from database
 */
exports.getVendorProfile = async (req, res) => {
  try {
    const { vendorId } = req.params;

    // Fetch vendor basic info
    const vendor = await VendorNew.findById(vendorId)
      .select('-password');

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }


    // Only show active vendors publicly (verification is just a badge for paid plans)
    if (!vendor.isActive) {
      
      return res.status(403).json({
        success: false,
        message: 'This vendor profile is currently inactive. Please contact the vendor for more information.',
        reason: 'inactive',
        details: {
          isActive: vendor.isActive,
          verified: vendor.verified
        }
      });
    }

    // Fetch photos only (public and approved only)
    const media = await VendorMedia.find({
      vendorId,
      type: { $ne: 'video' },
      visibility: 'public',
      approvalStatus: 'approved'
    }).sort({ isFeatured: -1, orderIndex: 1 }).limit(50);


    // Fetch published and approved blogs
    const blogs = await VendorBlog.find({
      vendorId,
      status: 'published',
      approvalStatus: 'approved'
    }).sort({ publishedAt: -1 }).limit(10);


    // Fetch videos — only ones whose VendorMedia record has been approved by admin
    const approvedVideoMedia = await VendorMedia.find({
      vendorId,
      type: 'video',
      visibility: 'public',
      approvalStatus: 'approved'
    }).select('publicId').lean();

    const approvedVideoPublicIds = approvedVideoMedia
      .map(m => m.publicId)
      .filter(Boolean);

    const videos = approvedVideoPublicIds.length > 0
      ? await VendorVideo.find({
          vendorId,
          visibility: 'public',
          publicId: { $in: approvedVideoPublicIds }
        }).sort({ orderIndex: 1 }).limit(20)
      : [];


    // Fetch approved reviews
    const reviews = await VendorReview.find({
      vendorId,
      status: 'approved'
    })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);


    // Calculate average rating
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    const sanitizedMedia = media
      .filter((m) => m && m.type !== 'video' && isValidHttpUrl(m.url))
      .map((m) => ({
        id: m._id,
        type: m.type,
        url: m.url,
        caption: m.caption,
        isFeatured: m.isFeatured
      }));

    const sanitizedVideos = videos
      .filter((v) => v && isValidHttpUrl(v.videoUrl))
      .map((v) => ({
        id: v._id,
        videoUrl: v.videoUrl,
        thumbnail: (() => {
          const thumbnailUrl = normalizeMediaUrlInput(v.thumbnail);
          return isImageUrl(thumbnailUrl)
            ? thumbnailUrl
            : buildVideoThumbnailFromUrl(v.videoUrl);
        })(),
        title: v.title,
        description: v.description,
        duration: v.duration
      }));

    // Build profile response
    const profile = {
      vendor: {
        id: vendor._id,
        businessName: vendor.businessName || vendor.name, // Fallback to name if businessName is empty
        ownerName: vendor.name,
        serviceType: vendor.serviceType,
        city: vendor.city,
        area: vendor.area,
        description: vendor.description,
        verified: vendor.verified,
        rating: avgRating.toFixed(1),
        totalReviews: reviews.length,
        yearsInBusiness: vendor.yearsInBusiness || 0,
        totalBookings: vendor.totalBookings || 0,
        completedBookings: vendor.completedBookings || 0,
        teamSize: vendor.teamSize || 0,
        contact: vendor.contact,
        pricing: vendor.pricing,
        planKey: vendor.subscription?.planKey || 'free',
        planName: vendor.subscription?.planName || 'Free',
        profileImage: vendor.profileImage || '',
        coverImage: vendor.coverImage || ''
      },
      media: sanitizedMedia,
      blogs: blogs.map(b => ({
        id: b._id,
        title: b.title,
        slug: b.slug,
        content: b.content,
        excerpt: b.excerpt,
        coverImage: b.coverImage?.url,
        publishedAt: b.publishedAt,
        readTime: b.metadata?.readTime,
        tags: b.tags
      })),
      videos: sanitizedVideos,
      reviews: reviews.map(r => ({
        id: r._id,
        userName: r.userId?.name,
        rating: r.rating,
        comment: r.comment,
        isVerified: r.isVerified,
        createdAt: r.createdAt,
        vendorResponse: r.vendorResponse
      })),
      stats: {
        totalMedia: sanitizedMedia.length,
        totalBlogs: blogs.length,
        totalVideos: sanitizedVideos.length,
        totalReviews: reviews.length,
        avgRating: avgRating.toFixed(1)
      }
    };

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Get vendor profile error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get vendor dashboard data (Authenticated)
 * Includes draft content and hidden media
 */
exports.getVendorDashboard = async (req, res) => {
  try {
    const vendorId = req.vendor._id;

    // Fetch all media (including hidden)
    const media = await VendorMedia.find({ vendorId })
      .sort({ orderIndex: 1 });

    // Fetch all blogs (including drafts)
    const blogs = await VendorBlog.find({ vendorId })
      .sort({ createdAt: -1 });

    // Fetch all videos
    const videos = await VendorVideo.find({ vendorId })
      .sort({ orderIndex: 1 });

    // Map video publicId -> admin approval status from VendorMedia records
    const videoMediaRecords = await VendorMedia.find({ vendorId, type: 'video' })
      .select('publicId approvalStatus createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const approvalStatusByPublicId = new Map();
    for (const record of videoMediaRecords) {
      if (record?.publicId && !approvalStatusByPublicId.has(record.publicId)) {
        approvalStatusByPublicId.set(record.publicId, record.approvalStatus || 'pending');
      }
    }

    const videosWithApprovalStatus = videos.map((video) => {
      const plainVideo = typeof video.toObject === 'function' ? video.toObject() : video;
      return {
        ...plainVideo,
        approvalStatus: approvalStatusByPublicId.get(plainVideo.publicId) || 'pending'
      };
    });

    // Calculate profile completion
    const vendor = await VendorNew.findById(vendorId);
    const completionScore = calculateProfileCompletion(vendor, media, blogs, videos);

    // Get plan limits and current usage
    const planKey = vendor.subscription?.planKey || 'free';
    const limits = getVendorLimits(planKey);
    const currentUsage = {
      portfolioCount: media.length,  // Combined images + videos count from VendorMedia
      blogCount: blogs.length,
      videoCount: videosWithApprovalStatus.length      // Separate video metadata count (for display only)
    };

    res.json({
      success: true,
      data: {
        media,
        blogs,
        videos: videosWithApprovalStatus,
        profileCompletion: completionScore,
        planKey,
        planName: vendor.subscription?.planName || 'Free',
        limits,
        currentUsage
      }
    });
  } catch (error) {
    console.error('Get vendor dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
};

/**
 * Get vendor's media (portfolio photos/videos) - Authenticated
 */
exports.getVendorMedia = async (req, res) => {
  try {
    const vendorId = req.vendor?._id || req.user?._id;
    
    if (!vendorId) {
      return res.status(401).json({
        success: false,
        message: 'Vendor ID not found. Please login again.'
      });
    }


    // Fetch all media for this vendor
    const media = await VendorMedia.find({ vendorId })
      .sort({ orderIndex: 1, createdAt: -1 });


    res.json({
      success: true,
      data: media
    });
  } catch (error) {
    console.error('❌ Error fetching vendor media:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch media',
      error: error.message
    });
  }
};

/**
 * Add media with Cloudinary URL (already uploaded)
 * Used when frontend uploads directly to Cloudinary
 * IMAGES ONLY - videos should use /videos endpoint
 */
exports.addMedia = async (req, res) => {
  try {
    const vendorId = req.vendor?._id || req.user?._id;
    const { url, publicId, type, caption } = req.body;

    if (!vendorId) {
      return res.status(401).json({
        success: false,
        message: 'Vendor ID not found. Please login again.'
      });
    }

    if (!url || !publicId) {
      return res.status(400).json({
        success: false,
        message: 'URL and publicId are required'
      });
    }

    const mediaType = type || 'image';

    // REJECT videos - they should use /videos endpoint
    if (mediaType === 'video') {
      return res.status(400).json({
        success: false,
        message: 'Videos must be uploaded through the /videos endpoint. Use the Video Content section in your dashboard.'
      });
    }


    // Check vendor plan limits
    const vendor = await VendorNew.findById(vendorId);
    const planKey = vendor?.subscription?.planKey || 'free';
    const limits = getVendorLimits(planKey);

    // Check combined media count
    const currentTotalCount = await VendorMedia.countDocuments({ vendorId });

    if (limits.portfolioLimit !== -1 && currentTotalCount >= limits.portfolioLimit) {
      return res.status(403).json({
        success: false,
        message: `Portfolio limit reached (${currentTotalCount}/${limits.portfolioLimit}). Your ${limits.planName} allows ${limits.portfolioLimit} media items total. Upgrade to access more storage.`,
        upgradeRequired: true,
        currentPlan: limits.planName,
        currentCount: currentTotalCount,
        limit: limits.portfolioLimit,
        suggestedPlan: planKey === 'free' ? 'Starter Plan (₹499)' :
                       planKey === 'starter' ? 'Growth Plan (₹999)' :
                       'Premium Plan (₹1499)'
      });
    }

    // Determine order index (add to end)
    const maxOrder = await VendorMedia.findOne({ vendorId })
      .sort({ orderIndex: -1 })
      .select('orderIndex');
    const orderIndex = maxOrder ? maxOrder.orderIndex + 1 : 0;

    const generatedCaption = await getNextPortfolioLabel(vendorId, 'image');

    // Create media record
    const media = new VendorMedia({
      vendorId,
      type: 'image',
      url,
      publicId,
      caption: generatedCaption,
      orderIndex,
      visibility: 'public',
      approvalStatus: 'pending'
    });

    await media.save();

    res.json({
      success: true,
      message: 'Media added successfully',
      data: media
    });
  } catch (error) {
    console.error('❌ Error adding media:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add media',
      error: error.message
    });
  }
};

/**
 * Upload media (IMAGE only)
 * Videos should use /videos endpoint
 */
exports.uploadMedia = async (req, res) => {
  try {
    const vendorId = req.vendor._id;
    const { type, isFeatured } = req.body;
    const file = req.file; // Assumes multer middleware

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided'
      });
    }

    const mediaType = type || 'image';

    // REJECT videos - they should use /videos endpoint
    if (mediaType === 'video' || file.mimetype.startsWith('video/')) {
      return res.status(400).json({
        success: false,
        message: 'Videos must be uploaded through the /videos endpoint. Use the Video Content section in your dashboard.'
      });
    }

    // Check vendor plan limits
    const vendor = await VendorNew.findById(vendorId);
    const planKey = vendor?.subscription?.planKey || 'free';
    const limits = getVendorLimits(planKey);

    // Check COMBINED total count (images + videos together)
    const currentCount = await VendorMedia.countDocuments({ vendorId });

    if (limits.portfolioLimit !== -1 && currentCount >= limits.portfolioLimit) {
      return res.status(403).json({
        success: false,
        message: `Portfolio limit reached (${currentCount}/${limits.portfolioLimit}). Your ${limits.planName} allows ${limits.portfolioLimit} images/videos combined.`,
        upgradeRequired: true,
        currentPlan: limits.planName,
        currentCount: currentCount,
        limit: limits.portfolioLimit
      });
    }

    // Upload to Cloudinary
    const uploadResult = await uploadImage(file.buffer || file.path);

    const generatedCaption = await getNextPortfolioLabel(vendorId, 'image');

    // Create media record
    const media = new VendorMedia({
      vendorId,
      type: 'image',
      url: uploadResult.url,
      publicId: uploadResult.publicId,
      caption: generatedCaption,
      isFeatured: isFeatured || false,
      metadata: {
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
        size: uploadResult.size
      }
    });

    await media.save();

    res.status(201).json({
      success: true,
      message: 'Media uploaded successfully',
      data: media
    });
  } catch (error) {
    console.error('Upload media error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload media'
    });
  }
};

/**
 * Delete media
 */
exports.deleteMedia = async (req, res) => {
  try {
    const vendorId = req.vendor._id;
    const { mediaId } = req.params;

    const media = await VendorMedia.findOne({ _id: mediaId, vendorId });

    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }

    // Delete from Cloudinary
    await deleteFile(media.publicId, media.type);

    // Delete from database
    await media.deleteOne();

    res.json({
      success: true,
      message: 'Media deleted successfully'
    });
  } catch (error) {
    console.error('Delete media error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete media'
    });
  }
};

/**
 * Reorder media
 */
exports.reorderMedia = async (req, res) => {
  try {
    const vendorId = req.vendor._id;
    const { mediaOrder } = req.body; // Array of { mediaId, orderIndex }

    if (!Array.isArray(mediaOrder)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid media order data'
      });
    }

    // Update order indexes
    const updates = mediaOrder.map(({ mediaId, orderIndex }) =>
      VendorMedia.updateOne(
        { _id: mediaId, vendorId },
        { orderIndex }
      )
    );

    await Promise.all(updates);

    res.json({
      success: true,
      message: 'Media order updated successfully'
    });
  } catch (error) {
    console.error('Reorder media error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reorder media'
    });
  }
};

/**
 * Create blog post
 */
exports.createBlog = async (req, res) => {
  try {
    const vendorId = req.vendor._id;
    const { title, excerpt, content, tags, status, coverImage } = req.body;

    const normalizedTitle = title?.trim();
    const normalizedExcerpt = excerpt?.trim();
    const normalizedContent = content?.trim();
    const normalizedStatus = ['draft', 'published'].includes(status) ? status : 'draft';
    const normalizedTags = Array.isArray(tags)
      ? tags.map(tag => String(tag).trim()).filter(Boolean)
      : [];
    const normalizedCoverImage = coverImage?.url
      ? { url: coverImage.url, publicId: coverImage.publicId || '' }
      : null;

    if (!normalizedTitle || !normalizedExcerpt || !normalizedContent || !normalizedCoverImage) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields (title, excerpt, content, coverImage).'
      });
    }

    const blog = new VendorBlog({
      vendorId,
      title: normalizedTitle,
      excerpt: normalizedExcerpt,
      content: normalizedContent,
      tags: normalizedTags,
      status: normalizedStatus,
      coverImage: normalizedCoverImage,
      approvalStatus: 'pending'
    });

    await blog.save();

    res.status(201).json({
      success: true,
      message: 'Blog created successfully',
      data: blog
    });
  } catch (error) {
    console.error('Create blog error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create blog'
    });
  }
};

/**
 * Update blog post
 */
exports.updateBlog = async (req, res) => {
  try {
    const vendorId = req.vendor._id;
    const { blogId } = req.params;
    const updates = req.body || {};

    const existingBlog = await VendorBlog.findOne({ _id: blogId, vendorId });

    if (!existingBlog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    const nextTitle = updates.title !== undefined ? String(updates.title).trim() : existingBlog.title;
    const nextExcerpt = updates.excerpt !== undefined ? String(updates.excerpt).trim() : existingBlog.excerpt;
    const nextContent = updates.content !== undefined ? String(updates.content).trim() : existingBlog.content;
    const nextCoverImage = updates.coverImage !== undefined
      ? (updates.coverImage?.url
          ? { url: updates.coverImage.url, publicId: updates.coverImage.publicId || '' }
          : null)
      : existingBlog.coverImage;
    const nextStatus = updates.status !== undefined
      ? (['draft', 'published'].includes(updates.status) ? updates.status : existingBlog.status)
      : existingBlog.status;

    if (nextStatus === 'published' && (!nextTitle || !nextExcerpt || !nextContent || !nextCoverImage?.url)) {
      return res.status(400).json({
        success: false,
        message: 'To publish, title, excerpt, content, and coverImage are required.'
      });
    }

    const blogUpdates = {
      title: nextTitle,
      excerpt: nextExcerpt,
      content: nextContent,
      coverImage: nextCoverImage,
      status: nextStatus
    };

    if (updates.tags !== undefined) {
      blogUpdates.tags = Array.isArray(updates.tags)
        ? updates.tags.map(tag => String(tag).trim()).filter(Boolean)
        : [];
    }

    const blog = await VendorBlog.findOneAndUpdate(
      { _id: blogId, vendorId },
      blogUpdates,
      { new: true, runValidators: true }
    );

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    res.json({
      success: true,
      message: 'Blog updated successfully',
      data: blog
    });
  } catch (error) {
    console.error('Update blog error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update blog'
    });
  }
};

/**
 * Delete blog post
 */
exports.deleteBlog = async (req, res) => {
  try {
    const vendorId = req.vendor._id;
    const { blogId } = req.params;

    const blog = await VendorBlog.findOneAndDelete({ _id: blogId, vendorId });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    res.json({
      success: true,
      message: 'Blog deleted successfully'
    });
  } catch (error) {
    console.error('Delete blog error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete blog'
    });
  }
};

/**
 * Update vendor profile (Owner only)
 * Updates business information that shows in search results
 */
exports.updateVendorProfile = async (req, res) => {
  try {
    const vendorId = req.vendor?._id || req.user?._id;

    if (!vendorId) {
      return res.status(401).json({
        success: false,
        message: 'Vendor ID not found. Please login again.'
      });
    }

    const {
      businessName,
      ownerName,
      serviceType,
      description,
      city,
      area,
      address,
      contact,
      email,
      whatsapp,
      website,
      instagram,
      facebook,
      yearsInBusiness,
      totalBookings,
      completedBookings,
      teamSize,
      priceRange,
      profileImage,
      coverImage
    } = req.body;

    if (description !== undefined && String(description).trim().length > PROFILE_DESCRIPTION_MAX_CHARS) {
      return res.status(400).json({
        success: false,
        message: `Business description cannot exceed ${PROFILE_DESCRIPTION_MAX_CHARS} characters.`
      });
    }

    if (contact !== undefined) {
      const phone = normalizePhone(contact);
      if (!/^[6-9]\d{9}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid 10-digit Indian mobile number.'
        });
      }
    }

    if (whatsapp !== undefined && String(whatsapp).trim() !== '') {
      const wa = normalizePhone(whatsapp);
      if (!/^[6-9]\d{9}$/.test(wa)) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid 10-digit WhatsApp number.'
        });
      }
    }

    if (website !== undefined && String(website).trim() !== '' && !isValidHttpUrl(String(website).trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid website URL.'
      });
    }

    if (instagram !== undefined && String(instagram).trim() !== '' && String(instagram).trim().length > 60) {
      return res.status(400).json({
        success: false,
        message: 'Instagram username/link is too long.'
      });
    }

    if (facebook !== undefined && String(facebook).trim() !== '' && !isValidHttpUrl(String(facebook).trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid Facebook page URL.'
      });
    }

    if (yearsInBusiness !== undefined) {
      const experience = Number(yearsInBusiness);
      if (!Number.isInteger(experience) || experience < 0) {
        return res.status(400).json({
          success: false,
          message: 'Years in business must be a non-negative integer.'
        });
      }
    }

    if (totalBookings !== undefined) {
      const eventsDone = Number(totalBookings);
      if (!Number.isInteger(eventsDone) || eventsDone < 0) {
        return res.status(400).json({
          success: false,
          message: 'Events completed must be a non-negative integer.'
        });
      }
    }

    if (completedBookings !== undefined) {
      const completed = Number(completedBookings);
      if (!Number.isInteger(completed) || completed < 0) {
        return res.status(400).json({
          success: false,
          message: 'Completed bookings must be a non-negative integer.'
        });
      }
    }

    if (teamSize !== undefined && String(teamSize).trim() !== '') {
      const team = Number(teamSize);
      if (!Number.isInteger(team) || team < 0) {
        return res.status(400).json({
          success: false,
          message: 'Team size must be a non-negative integer.'
        });
      }
    }

    // Find and update vendor
    const vendor = await VendorNew.findById(vendorId);
    
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Update basic info
    if (businessName !== undefined) vendor.businessName = businessName;
    if (ownerName !== undefined) vendor.name = ownerName;
    if (serviceType !== undefined) vendor.serviceType = serviceType;
    if (description !== undefined) vendor.description = description;

    // Update location
    if (city !== undefined) vendor.city = city;
    if (area !== undefined) vendor.area = area;
    if (address !== undefined) vendor.address = address;

    // Update contact (nested schema)
    if (!vendor.contact) vendor.contact = {};
    if (contact !== undefined) vendor.contact.phone = normalizePhone(contact);
    // Email is readonly - don't allow updates
    if (whatsapp !== undefined) vendor.contact.whatsapp = String(whatsapp).trim() ? normalizePhone(whatsapp) : '';
    if (website !== undefined) vendor.contact.website = String(website).trim();

    // Update social media (nested in contact)
    if (!vendor.contact.socialMedia) vendor.contact.socialMedia = {};
    if (instagram !== undefined) vendor.contact.socialMedia.instagram = String(instagram).trim();
    if (facebook !== undefined) vendor.contact.socialMedia.facebook = String(facebook).trim();

    // Update business stats
    if (yearsInBusiness !== undefined) vendor.yearsInBusiness = Number(yearsInBusiness);
    if (totalBookings !== undefined) {
      const eventsDone = Number(totalBookings);
      vendor.totalBookings = eventsDone;
      // Keep completedBookings aligned when total bookings is manually updated from profile editor.
      vendor.completedBookings = eventsDone;
    }
    if (completedBookings !== undefined) vendor.completedBookings = Number(completedBookings);
    if (teamSize !== undefined) vendor.teamSize = String(teamSize).trim() === '' ? 0 : Number(teamSize);

    // Update pricing
    if (priceRange) {
      if (!vendor.pricing) vendor.pricing = {};
      if (priceRange.min !== undefined) vendor.pricing.min = priceRange.min;
      if (priceRange.max !== undefined) vendor.pricing.max = priceRange.max;
    }

    // Update profile images (Cloudinary URLs)
    if (profileImage !== undefined) {
      const normalizedProfileImage = normalizeMediaUrlInput(profileImage);
      vendor.profileImage = normalizedProfileImage || '';
    }
    if (coverImage !== undefined) {
      const normalizedCoverImage = normalizeMediaUrlInput(coverImage);
      vendor.coverImage = normalizedCoverImage || '';
    }

    vendor.updatedAt = Date.now();

    await vendor.save();

    
    // Verify save worked by fetching again
    const verifyVendor = await VendorNew.findById(vendorId).select('profileImage coverImage');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: vendor
    });

  } catch (error) {
    console.error('Error updating vendor profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

/**
 * Update vendor business stats only (Owner only)
 * Fields: yearsInBusiness, totalBookings, completedBookings, teamSize
 */
exports.updateVendorBusinessStats = async (req, res) => {
  try {
    const vendorId = req.vendor?._id || req.user?._id;

    if (!vendorId) {
      return res.status(401).json({
        success: false,
        message: 'Vendor ID not found. Please login again.'
      });
    }

    const {
      yearsInBusiness,
      totalBookings,
      completedBookings,
      teamSize
    } = req.body;

    const update = {};

    if (yearsInBusiness !== undefined) {
      const experience = Number(yearsInBusiness);
      if (!Number.isInteger(experience) || experience < 0) {
        return res.status(400).json({ success: false, message: 'Years in business must be a non-negative integer.' });
      }
      update.yearsInBusiness = experience;
    }

    if (totalBookings !== undefined) {
      const eventsDone = Number(totalBookings);
      if (!Number.isInteger(eventsDone) || eventsDone < 0) {
        return res.status(400).json({ success: false, message: 'Events completed must be a non-negative integer.' });
      }
      update.totalBookings = eventsDone;
      // Keep completed in sync when only total events are edited.
      update.completedBookings = eventsDone;
    }

    if (completedBookings !== undefined) {
      const completed = Number(completedBookings);
      if (!Number.isInteger(completed) || completed < 0) {
        return res.status(400).json({ success: false, message: 'Completed bookings must be a non-negative integer.' });
      }
      update.completedBookings = completed;
    }

    if (teamSize !== undefined) {
      if (String(teamSize).trim() === '') {
        update.teamSize = 0;
      } else {
        const team = Number(teamSize);
        if (!Number.isInteger(team) || team < 0) {
          return res.status(400).json({ success: false, message: 'Team size must be a non-negative integer.' });
        }
        update.teamSize = team;
      }
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No business stats fields provided for update.'
      });
    }

    if (update.totalBookings !== undefined && update.completedBookings !== undefined && update.completedBookings > update.totalBookings) {
      return res.status(400).json({
        success: false,
        message: 'Completed bookings cannot exceed total bookings.'
      });
    }

    const vendor = await VendorNew.findByIdAndUpdate(
      vendorId,
      { $set: update },
      { new: true }
    ).select('-password');

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    return res.json({
      success: true,
      message: 'Business stats updated successfully',
      data: vendor
    });
  } catch (error) {
    console.error('Error updating vendor business stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update business stats',
      error: error.message
    });
  }
};

/**
 * Get vendor's own profile for editing (Owner only)
 */
exports.getMyProfile = async (req, res) => {
  try {
    const vendorId = req.vendor?._id || req.user?._id;

    if (!vendorId) {
      return res.status(401).json({
        success: false,
        message: 'Vendor ID not found. Please login again.'
      });
    }

    const vendor = await VendorNew.findById(vendorId).select('-password');
    
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }


    res.json({
      success: true,
      data: vendor
    });

  } catch (error) {
    console.error('❌ Error fetching vendor profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
};

/**
 * Helper: Calculate profile completion percentage
 */
function calculateProfileCompletion(vendor, media, blogs, videos) {
  let score = 0;
  const weights = {
    basicInfo: 20,
    contact: 15,
    description: 10,
    pricing: 10,
    media: 25,
    blogs: 10,
    videos: 10
  };

  // Basic info
  if (vendor.businessName && vendor.serviceType && vendor.city) score += weights.basicInfo;

  // Contact
  if (vendor.contact?.email && vendor.contact?.phone) score += weights.contact;

  // Description
  if (vendor.description && vendor.description.length > 50) score += weights.description;

  // Pricing
  if (vendor.pricing?.min && vendor.pricing?.max) score += weights.pricing;

  // Media (at least 3 images)
  if (media.length >= 3) score += weights.media;
  else if (media.length > 0) score += (media.length / 3) * weights.media;

  // Blogs (at least 1)
  if (blogs.length > 0) score += weights.blogs;

  // Videos (at least 1)
  if (videos.length > 0) score += weights.videos;

  return Math.round(score);
}

/**
 * Helper: Get vendor plan limits
 */
exports.getVendorLimits = function(planType) {
  const limits = {
    free: {
      portfolioLimit: 5,        // 5 images total (NO videos allowed)
      blogLimit: 2,
      allowVideos: false,
      features: ['Basic listing', 'Up to 5 images only', 'No videos']
    },
    starter: {
      portfolioLimit: 15,       // 15 COMBINED total (images + videos together)
      blogLimit: 10,
      allowVideos: true,
      features: ['Verified badge', 'Up to 15 images/videos (combined)', 'Blog posts']
    },
    growth: {
      portfolioLimit: 30,       // 30 COMBINED total (images + videos together)
      blogLimit: 30,
      allowVideos: true,
      features: ['Featured placement', 'Up to 30 images/videos (combined)', 'Unlimited blogs']
    },
    premium: {
      portfolioLimit: -1,       // Unlimited (images + videos)
      blogLimit: -1,
      allowVideos: true,
      features: ['Premium badge', 'Unlimited images/videos', 'Priority support']
    }
  };

  return limits[planType] || limits.free;
};
