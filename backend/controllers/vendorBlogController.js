const VendorBlog = require('../models/VendorBlog');

/**
 * PUBLIC VENDOR BLOG CONTROLLER
 * Public-facing endpoints for vendor blogs (approved + published only)
 */

/**
 * @desc    Get single vendor blog by slug (public)
 * @route   GET /api/vendor-blogs/:slug
 * @access  Public
 */
exports.getVendorBlogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const blog = await VendorBlog.findOne({
      slug,
      status: 'published',
      approvalStatus: 'approved'
    })
      .populate('vendorId', 'businessName name city area serviceType profileImage')
      .lean(false);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    // Increment views (best-effort)
    try {
      blog.views = (blog.views || 0) + 1;
      await blog.save();
    } catch (e) {
      // no-op
    }

    res.json({
      success: true,
      data: {
        blog: {
          id: blog._id,
          title: blog.title,
          slug: blog.slug,
          content: blog.content,
          excerpt: blog.excerpt,
          coverImage: blog.coverImage?.url,
          tags: blog.tags || [],
          publishedAt: blog.publishedAt,
          readTime: blog.metadata?.readTime,
          views: blog.views || 0,
          vendor: blog.vendorId
            ? {
                id: blog.vendorId._id,
                businessName: blog.vendorId.businessName || blog.vendorId.name,
                city: blog.vendorId.city,
                area: blog.vendorId.area,
                serviceType: blog.vendorId.serviceType,
                profileImage: blog.vendorId.profileImage
              }
            : null
        }
      }
    });
  } catch (error) {
    console.error('Error fetching vendor blog by slug:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor blog',
      error: error.message
    });
  }
};
