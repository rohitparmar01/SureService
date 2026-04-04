const Blog = require('../models/Blog');
const cloudinary = require('cloudinary').v2;

/**
 * ADMIN BLOG CONTROLLER
 * Handles all admin blog management operations
 */

/**
 * @desc    Get all blogs (admin view)
 * @route   GET /api/admin/blogs
 * @access  Admin
 */
exports.getAllBlogs = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } }
      ];
    }
    
    const blogs = await Blog.find(query)
      .populate('author', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Blog.countDocuments(query);
    
    res.json({
      success: true,
      data: blogs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blogs',
      error: error.message
    });
  }
};

/**
 * @desc    Get single blog by ID (admin)
 * @route   GET /api/admin/blogs/:id
 * @access  Admin
 */
exports.getBlogById = async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate('author', 'name email');
    
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }
    
    res.json({
      success: true,
      data: blog
    });
  } catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blog',
      error: error.message
    });
  }
};

/**
 * @desc    Create new blog
 * @route   POST /api/admin/blogs
 * @access  Admin
 */
exports.createBlog = async (req, res, next) => {
  try {
    const {
      title,
      slug,
      excerpt,
      content,
      featuredImage,
      tags,
      category,
      status,
      metaTitle,
      metaDescription
    } = req.body;
    
    // Validate required fields
    if (!title || !excerpt || !content || !featuredImage) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields (title, excerpt, content, featuredImage)'
      });
    }
    
    // Check if slug already exists
    if (slug) {
      const existingBlog = await Blog.findOne({ slug });
      if (existingBlog) {
        return res.status(400).json({
          success: false,
          message: 'This slug is already in use'
        });
      }
    }
    
    const blog = await Blog.create({
      title,
      slug,
      excerpt,
      content,
      featuredImage,
      tags: tags || [],
      category: category || 'General',
      status: status || 'draft',
      metaTitle,
      metaDescription,
      author: req.user._id
    });
    
    const populatedBlog = await Blog.findById(blog._id)
      .populate('author', 'name email');
    
    res.status(201).json({
      success: true,
      message: 'Blog created successfully',
      data: populatedBlog
    });
  } catch (error) {
    console.error('Error creating blog:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create blog',
      error: error.message
    });
  }
};

/**
 * @desc    Update blog
 * @route   PUT /api/admin/blogs/:id
 * @access  Admin
 */
exports.updateBlog = async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }
    
    const {
      title,
      slug,
      excerpt,
      content,
      featuredImage,
      tags,
      category,
      status,
      metaTitle,
      metaDescription
    } = req.body;
    
    // Check if new slug is unique
    if (slug && slug !== blog.slug) {
      const existingBlog = await Blog.findOne({ slug, _id: { $ne: blog._id } });
      if (existingBlog) {
        return res.status(400).json({
          success: false,
          message: 'This slug is already in use'
        });
      }
    }
    
    // Update fields
    if (title) blog.title = title;
    if (slug) blog.slug = slug;
    if (excerpt) blog.excerpt = excerpt;
    if (content) blog.content = content;
    if (featuredImage) blog.featuredImage = featuredImage;
    if (tags !== undefined) blog.tags = tags;
    if (category) blog.category = category;
    if (status) blog.status = status;
    if (metaTitle) blog.metaTitle = metaTitle;
    if (metaDescription) blog.metaDescription = metaDescription;
    
    await blog.save();
    
    const updatedBlog = await Blog.findById(blog._id)
      .populate('author', 'name email');
    
    res.json({
      success: true,
      message: 'Blog updated successfully',
      data: updatedBlog
    });
  } catch (error) {
    console.error('Error updating blog:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update blog',
      error: error.message
    });
  }
};

/**
 * @desc    Delete blog
 * @route   DELETE /api/admin/blogs/:id
 * @access  Admin
 */
exports.deleteBlog = async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }
    
    // Delete featured image from Cloudinary if exists
    if (blog.featuredImage?.publicId) {
      try {
        await cloudinary.uploader.destroy(blog.featuredImage.publicId);
      } catch (cloudinaryError) {
        console.error('Cloudinary deletion error:', cloudinaryError);
      }
    }
    
    await blog.deleteOne();
    
    res.json({
      success: true,
      message: 'Blog deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting blog:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete blog',
      error: error.message
    });
  }
};

/**
 * @desc    Toggle blog publish status
 * @route   PATCH /api/admin/blogs/:id/toggle-publish
 * @access  Admin
 */
exports.togglePublish = async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }
    
    blog.status = blog.status === 'published' ? 'draft' : 'published';
    
    // Set publishedAt when publishing
    if (blog.status === 'published' && !blog.publishedAt) {
      blog.publishedAt = new Date();
    }
    
    await blog.save();
    
    res.json({
      success: true,
      message: `Blog ${blog.status === 'published' ? 'published' : 'unpublished'} successfully`,
      data: blog
    });
  } catch (error) {
    console.error('Error toggling blog status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle blog status',
      error: error.message
    });
  }
};

/**
 * @desc    Get blog statistics
 * @route   GET /api/admin/blogs/stats
 * @access  Admin
 */
exports.getBlogStats = async (req, res, next) => {
  try {
    const [totalBlogs, publishedBlogs, draftBlogs, totalViews] = await Promise.all([
      Blog.countDocuments(),
      Blog.countDocuments({ status: 'published' }),
      Blog.countDocuments({ status: 'draft' }),
      Blog.aggregate([
        { $group: { _id: null, total: { $sum: '$views' } } }
      ])
    ]);
    
    const topBlogs = await Blog.find({ status: 'published' })
      .sort({ views: -1 })
      .limit(5)
      .select('title slug views publishedAt');
    
    res.json({
      success: true,
      data: {
        totalBlogs,
        publishedBlogs,
        draftBlogs,
        totalViews: totalViews[0]?.total || 0,
        topBlogs
      }
    });
  } catch (error) {
    console.error('Error fetching blog stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blog statistics',
      error: error.message
    });
  }
};

/**
 * PUBLIC BLOG CONTROLLER
 * Handles public-facing blog operations
 */

/**
 * @desc    Get published blogs (public)
 * @route   GET /api/blogs
 * @access  Public
 */
exports.getPublishedBlogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 12, category, tag } = req.query;
    
    const query = { status: 'published' };
    if (category) query.category = category;
    if (tag) query.tags = tag;
    
    const blogs = await Blog.find(query)
      .populate('author', 'name')
      .select('-content')
      .sort({ publishedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Blog.countDocuments(query);
    
    res.json({
      success: true,
      data: blogs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching published blogs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blogs',
      error: error.message
    });
  }
};

/**
 * @desc    Get single blog by slug (public)
 * @route   GET /api/blogs/:slug
 * @access  Public
 */
exports.getBlogBySlug = async (req, res, next) => {
  try {
    const trackView = req.query.trackView !== 'false';
    const blog = await Blog.findOne({
      slug: req.params.slug,
      status: 'published'
    }).populate('author', 'name email');
    
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }
    
    // Increment views only when tracking is enabled.
    if (trackView) {
      blog.views += 1;
      await blog.save();
    }
    
    // Get related blogs
    const relatedBlogs = await Blog.find({
      _id: { $ne: blog._id },
      status: 'published',
      $or: [
        { tags: { $in: blog.tags } },
        { category: blog.category }
      ]
    })
      .select('title slug excerpt featuredImage publishedAt readTime')
      .sort({ publishedAt: -1 })
      .limit(3);
    
    res.json({
      success: true,
      data: {
        blog,
        relatedBlogs
      }
    });
  } catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blog',
      error: error.message
    });
  }
};

/**
 * @desc    Get blog categories (public)
 * @route   GET /api/blogs/categories
 * @access  Public
 */
exports.getBlogCategories = async (req, res, next) => {
  try {
    const categories = await Blog.distinct('category', { status: 'published' });
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
};

/**
 * @desc    Get blog tags (public)
 * @route   GET /api/blogs/tags
 * @access  Public
 */
exports.getBlogTags = async (req, res, next) => {
  try {
    const tags = await Blog.aggregate([
      { $match: { status: 'published' } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);
    
    res.json({
      success: true,
      data: tags.map(t => ({ name: t._id, count: t.count }))
    });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tags',
      error: error.message
    });
  }
};
