const User = require('../models/User');
const Vendor = require('../models/VendorNew');
const VendorInquiry = require('../models/VendorInquiry');
const ContactInquiry = require('../models/ContactInquiry');
const Inquiry = require('../models/Inquiry');
const VendorReview = require('../models/VendorReview');
const VendorMedia = require('../models/VendorMedia');
const VendorBlog = require('../models/VendorBlog');
const Notification = require('../models/Notification');

/**
 * Get Admin Dashboard Statistics
 */
exports.getDashboardStats = async (req, res, next) => {
  try {

    // Get counts with fallback to 0 on error
    let counts = {
      totalUsers: 0,
      totalVendors: 0,
      verifiedVendors: 0,
      totalVendorInquiries: 0,
      totalContactInquiries: 0,
      pendingVendorInquiries: 0,
      pendingContactInquiries: 0,
      pendingApprovalInquiries: 0,
      approvedInquiries: 0,
      rejectedInquiries: 0
    };

    try {
      const [
        totalUsers,
        totalVendors,
        verifiedVendors,
        totalVendorInquiries,
        totalContactInquiries,
        pendingVendorInquiries,
        pendingContactInquiries,
        pendingApprovalInquiries,
        approvedInquiries,
        rejectedInquiries
      ] = await Promise.all([
        User.countDocuments({ role: 'user' }).catch(() => 0),
        Vendor.countDocuments().catch(() => 0),
        Vendor.countDocuments({ verified: true }).catch(() => 0),
        VendorInquiry.countDocuments().catch(() => 0),
        ContactInquiry.countDocuments().catch(() => 0),
        VendorInquiry.countDocuments({ status: 'pending' }).catch(() => 0),
        ContactInquiry.countDocuments({ status: 'pending' }).catch(() => 0),
        VendorInquiry.countDocuments({ approvalStatus: 'pending' }).catch(() => 0),
        VendorInquiry.countDocuments({ approvalStatus: 'approved' }).catch(() => 0),
        VendorInquiry.countDocuments({ approvalStatus: 'rejected' }).catch(() => 0)
      ]);
      
      counts = {
        totalUsers,
        totalVendors,
        verifiedVendors,
        totalVendorInquiries,
        totalContactInquiries,
        pendingVendorInquiries,
        pendingContactInquiries,
        pendingApprovalInquiries,
        approvedInquiries,
        rejectedInquiries
      };
    } catch (countError) {
    }

    // Get recent inquiries with error handling
    let recentVendorInquiries = [];
    let recentContactInquiries = [];
    
    try {
      recentVendorInquiries = await VendorInquiry.find()
        .populate({ path: 'vendorId', select: 'name businessName', strictPopulate: false })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
        .catch(() => []);
    } catch (err) {
    }

    try {
      recentContactInquiries = await ContactInquiry.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
        .catch(() => []);
    } catch (err) {
    }

    // Get inquiry trends (last 7 days) with error handling
    let inquiryTrends = [];
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      inquiryTrends = await VendorInquiry.aggregate([
        {
          $match: { createdAt: { $gte: sevenDaysAgo } }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]).catch(() => []);
    } catch (err) {
    }

    // Get vendor distribution by service type with error handling
    let vendorsByService = [];
    try {
      vendorsByService = await Vendor.aggregate([
        {
          $group: {
            _id: '$serviceType',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]).catch(() => []);
    } catch (err) {
    }


    res.json({
      success: true,
      data: {
        overview: {
          totalUsers: counts.totalUsers,
          totalVendors: counts.totalVendors,
          verifiedVendors: counts.verifiedVendors,
          totalInquiries: counts.totalVendorInquiries + counts.totalContactInquiries,
          vendorInquiries: counts.totalVendorInquiries,
          contactInquiries: counts.totalContactInquiries,
          pendingInquiries: counts.pendingVendorInquiries + counts.pendingContactInquiries,
          pendingVendorInquiries: counts.pendingVendorInquiries,
          pendingContactInquiries: counts.pendingContactInquiries,
          // Approval statistics
          pendingApproval: counts.pendingApprovalInquiries,
          approvedInquiries: counts.approvedInquiries,
          rejectedInquiries: counts.rejectedInquiries
        },
        recentActivity: {
          vendorInquiries: recentVendorInquiries,
          contactInquiries: recentContactInquiries
        },
        trends: {
          inquiryTrends,
          vendorsByService
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error);
    // Return empty data instead of failing completely
    res.json({
      success: true,
      data: {
        overview: {
          totalUsers: 0,
          totalVendors: 0,
          verifiedVendors: 0,
          totalInquiries: 0,
          vendorInquiries: 0,
          contactInquiries: 0,
          pendingInquiries: 0,
          pendingVendorInquiries: 0,
          pendingContactInquiries: 0,
          pendingApproval: 0,
          approvedInquiries: 0,
          rejectedInquiries: 0
        },
        recentActivity: {
          vendorInquiries: [],
          contactInquiries: []
        },
        trends: {
          inquiryTrends: [],
          vendorsByService: []
        }
      }
    });
  }
};

/**
 * Get All Users
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;

    const query = { role: 'user' };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.isActive = status === 'active';
    }

    const skip = (page - 1) * limit;

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    next(error);
  }
};

/**
 * Update User Status
 */
exports.updateUserStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { isActive, role } = req.body;

    const updateData = {};
    if (typeof isActive !== 'undefined') updateData.isActive = isActive;
    if (role && ['user', 'admin'].includes(role)) updateData.role = role;

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }


    res.json({
      success: true,
      message: 'User updated successfully',
      data: user
    });

  } catch (error) {
    console.error('Error updating user:', error);
    next(error);
  }
};

/**
 * Get All Vendors (Admin)
 */
exports.getAllVendors = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, verified, serviceType, isActive } = req.query;

    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } },
        { 'contact.email': { $regex: search, $options: 'i' } }
      ];
    }

    if (typeof verified !== 'undefined') {
      query.verified = verified === 'true';
    }

    if (typeof isActive !== 'undefined') {
      query.isActive = isActive === 'true';
    }

    if (serviceType) {
      query.serviceType = serviceType;
    }

    const skip = (page - 1) * limit;

    const vendors = await Vendor.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Fetch media count for each vendor
    const vendorsWithMedia = await Promise.all(vendors.map(async (vendor) => {
      try {
        const mediaCount = await VendorMedia.countDocuments({ vendorId: vendor._id });
        const media = await VendorMedia.find({ vendorId: vendor._id })
          .sort({ orderIndex: 1 })
          .limit(5) // First 5 photos for preview
          .lean();
        return { ...vendor, mediaCount, media };
      } catch (error) {
        return { ...vendor, mediaCount: 0, media: [] };
      }
    }));

    const total = await Vendor.countDocuments(query);

    res.json({
      success: true,
      data: {
        vendors: vendorsWithMedia,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching vendors:', error);
    next(error);
  }
};

/**
 * Get Single Vendor by ID (Admin - includes inactive vendors with media)
 */
exports.getVendorById = async (req, res, next) => {
  try {
    const { vendorId } = req.params;

    const vendor = await Vendor.findById(vendorId).lean();

    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: { message: 'Vendor not found' }
      });
    }

    // Fetch vendor's media (uploaded during registration)
    let media = [];
    try {
      media = await VendorMedia.find({ vendorId: vendor._id })
        .sort({ orderIndex: 1 })
        .lean();
    } catch (mediaError) {
    }

    res.json({
      success: true,
      data: {
        ...vendor,
        media // Include media array in response
      }
    });

  } catch (error) {
    console.error('Error fetching vendor:', error);
    next(error);
  }
};

/**
 * Verify/Unverify Vendor
 * This is a premium badge indicator (paid plan status)
 * Does NOT affect vendor profile visibility - use isActive for that
 */
exports.toggleVendorVerification = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const { verified } = req.body;

    const vendor = await Vendor.findByIdAndUpdate(
      vendorId,
      { verified },
      { new: true }
    );

    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: { message: 'Vendor not found' }
      });
    }


    res.json({
      success: true,
      message: `Vendor ${verified ? 'verified' : 'unverified'} successfully`,
      data: vendor
    });

  } catch (error) {
    console.error('Error updating vendor:', error);
    next(error);
  }
};

/**
 * Get All Inquiries (Both Collections)
 */
exports.getAllInquiries = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, status, approvalStatus } = req.query;

    const query = {};
    if (status) query.status = status;
    if (approvalStatus) query.approvalStatus = approvalStatus;

    const skip = (page - 1) * limit;

    let vendorInquiries = [];
    let contactInquiries = [];
    let vendorTotal = 0;
    let contactTotal = 0;

    if (!type || type === 'vendor') {
      try {
        vendorInquiries = await VendorInquiry.find(query)
          .populate({
            path: 'vendorId',
            select: 'name businessName serviceType',
            options: { strictPopulate: false }
          })
          .populate({
            path: 'approvedBy',
            select: 'name email',
            options: { strictPopulate: false }
          })
          .sort({ createdAt: -1 })
          .limit(parseInt(limit))
          .lean()
          .catch(err => {
            console.error('❌ Error fetching vendor inquiries:', err.message);
            return [];
          });
        vendorTotal = await VendorInquiry.countDocuments(query).catch(() => 0);
      } catch (err) {
        console.error('❌ Error in vendor inquiries block:', err);
        vendorInquiries = [];
        vendorTotal = 0;
      }
    }

    if (!type || type === 'contact') {
      try {
        contactInquiries = await ContactInquiry.find(query)
          .sort({ createdAt: -1 })
          .limit(parseInt(limit))
          .lean()
          .catch(err => {
            console.error('❌ Error fetching contact inquiries:', err.message);
            return [];
          });
        contactTotal = await ContactInquiry.countDocuments(query).catch(() => 0);
      } catch (err) {
        console.error('❌ Error in contact inquiries block:', err);
        contactInquiries = [];
        contactTotal = 0;
      }
    }

    const vendorInqsWithType = vendorInquiries.map(inq => ({
      ...inq,
      inquiryType: 'vendor_inquiry'
    }));

    const contactInqsWithType = contactInquiries.map(inq => ({
      ...inq,
      inquiryType: 'contact_inquiry'
    }));

    const allInquiries = [...vendorInqsWithType, ...contactInqsWithType]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(skip, skip + parseInt(limit));

    const total = vendorTotal + contactTotal;

    res.json({
      success: true,
      data: {
        inquiries: allInquiries,
        total,
        vendorInquiriesCount: vendorTotal,
        contactInquiriesCount: contactTotal,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching inquiries:', error);
    // Return empty data instead of crashing
    res.json({
      success: true,
      data: {
        inquiries: [],
        total: 0,
        vendorInquiriesCount: 0,
        contactInquiriesCount: 0,
        page: parseInt(page),
        totalPages: 0
      }
    });
  }
};

/**
 * Update Inquiry Status
 */
exports.updateInquiryStatus = async (req, res, next) => {
  try {
    const { inquiryId } = req.params;
    const { status, notes, type } = req.body;

    let inquiry;

    if (type === 'vendor') {
      inquiry = await VendorInquiry.findByIdAndUpdate(
        inquiryId,
        { status },
        { new: true }
      ).populate('vendorId');
    } else if (type === 'contact') {
      const updateData = { status };
      if (notes) updateData.adminNotes = notes;
      
      inquiry = await ContactInquiry.findByIdAndUpdate(
        inquiryId,
        updateData,
        { new: true }
      );
    }

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        error: { message: 'Inquiry not found' }
      });
    }


    res.json({
      success: true,
      message: 'Inquiry updated successfully',
      data: inquiry
    });

  } catch (error) {
    console.error('Error updating inquiry:', error);
    next(error);
  }
};

/**
 * Approve Vendor Inquiry (NEW)
 * Only admin can approve inquiries - once approved, vendor can see them
 */
exports.approveInquiry = async (req, res, next) => {
  try {
    const { inquiryId } = req.params;
    const adminId = req.user._id; // From auth middleware


    const inquiry = await VendorInquiry.findByIdAndUpdate(
      inquiryId,
      {
        approvalStatus: 'approved',
        status: 'contacted',
        isActive: true,
        approvedBy: adminId,
        approvedAt: new Date(),
        rejectionReason: undefined,
        vendorResponse: undefined,
        respondedAt: undefined,
        vendorDecision: undefined
      },
      { new: true }
    ).populate('vendorId', 'name businessName contact.email')
     .populate('approvedBy', 'name email');

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        error: { 
          code: 'INQUIRY_NOT_FOUND',
          message: 'Inquiry not found' 
        }
      });
    }


    // Create notification for vendor
    try {
      await Notification.create({
        vendor: inquiry.vendorId,
        type: 'inquiry',
        title: 'New Inquiry Assigned',
        message: `You have received a new inquiry from ${inquiry.userName} for ${inquiry.eventType || 'an event'}. Check your dashboard to respond.`,
        link: '/vendor-dashboard?tab=inquiries',
        relatedId: inquiry._id,
        priority: 'high'
      });
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
      // Don't fail the request if notification fails
    }

    res.json({
      success: true,
      message: 'Inquiry approved successfully. Vendor can now see this inquiry.',
      data: inquiry
    });

  } catch (error) {
    console.error('❌ Error approving inquiry:', error);
    next(error);
  }
};

/**
 * Reject Vendor Inquiry (NEW)
 * Admin can reject inquiries with a reason
 */
exports.rejectInquiry = async (req, res, next) => {
  try {
    const { inquiryId } = req.params;
    const { reason } = req.body;
    const adminId = req.user._id;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'REASON_REQUIRED',
          message: 'Please provide a reason for rejection'
        }
      });
    }


    const inquiry = await VendorInquiry.findByIdAndUpdate(
      inquiryId,
      {
        approvalStatus: 'rejected',
        status: 'closed',
        approvedBy: adminId,
        approvedAt: new Date(),
        rejectionReason: reason.trim(),
        vendorResponse: undefined,
        respondedAt: undefined,
        vendorDecision: undefined
      },
      { new: true }
    ).populate('vendorId', 'name businessName')
     .populate('approvedBy', 'name email');

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        error: { 
          code: 'INQUIRY_NOT_FOUND',
          message: 'Inquiry not found' 
        }
      });
    }

    // Create notification for vendor
    try {
      await Notification.create({
        vendor: inquiry.vendorId,
        type: 'inquiry',
        title: 'Inquiry Rejected',
        message: `An inquiry for ${inquiry.eventType || 'an event'} was rejected by admin.${reason ? ` Reason: ${reason.trim()}` : ''}`,
        link: '/vendor-dashboard?tab=inquiries',
        relatedId: inquiry._id,
        priority: 'normal'
      });
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
      // Don't fail the request if notification fails
    }


    res.json({
      success: true,
      message: 'Inquiry rejected successfully',
      data: inquiry
    });

  } catch (error) {
    console.error('❌ Error rejecting inquiry:', error);
    next(error);
  }
};

/**
 * Reset Vendor Inquiry back to pending review
 * Allows admin to move approved/rejected inquiries back into review state.
 */
exports.resetInquiryToPending = async (req, res, next) => {
  try {
    const { inquiryId } = req.params;

    const inquiry = await VendorInquiry.findById(inquiryId);
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INQUIRY_NOT_FOUND',
          message: 'Inquiry not found'
        }
      });
    }

    inquiry.approvalStatus = 'pending';
    inquiry.status = 'pending';
    inquiry.isActive = true;
    inquiry.approvedBy = undefined;
    inquiry.approvedAt = undefined;
    inquiry.rejectionReason = undefined;
    inquiry.vendorResponse = undefined;
    inquiry.respondedAt = undefined;
    inquiry.vendorDecision = undefined;

    await inquiry.save();

    res.json({
      success: true,
      message: 'Inquiry moved back to pending review successfully',
      data: inquiry
    });
  } catch (error) {
    console.error('❌ Error resetting inquiry to pending:', error);
    next(error);
  }
};

/**
 * Get Pending Inquiries for Admin Review (NEW)
 */
exports.getPendingInquiries = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;


    const skip = (page - 1) * limit;

    const inquiries = await VendorInquiry.find({ approvalStatus: 'pending' })
      .populate('vendorId', 'name businessName serviceType contact.email contact.phone city verified')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await VendorInquiry.countDocuments({ approvalStatus: 'pending' });


    res.json({
      success: true,
      data: {
        inquiries,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit)
      },
      message: `${total} inquiries pending approval`
    });

  } catch (error) {
    console.error('❌ Error fetching pending inquiries:', error);
    next(error);
  }
};

/**
 * Get Inquiry Approval Statistics (NEW)
 */
exports.getInquiryApprovalStats = async (req, res, next) => {
  try {
    const [pending, approved, rejected, total] = await Promise.all([
      VendorInquiry.countDocuments({ approvalStatus: 'pending' }),
      VendorInquiry.countDocuments({ approvalStatus: 'approved' }),
      VendorInquiry.countDocuments({ approvalStatus: 'rejected' }),
      VendorInquiry.countDocuments()
    ]);

    res.json({
      success: true,
      data: {
        pending,
        approved,
        rejected,
        total,
        approvalRate: total > 0 ? ((approved / total) * 100).toFixed(2) : 0,
        rejectionRate: total > 0 ? ((rejected / total) * 100).toFixed(2) : 0
      }
    });

  } catch (error) {
    console.error('❌ Error fetching approval stats:', error);
    next(error);
  }
};

/**
 * Toggle Vendor Active Status (Hide/Show)
 */
exports.toggleVendorStatus = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const { isActive } = req.body;

    const vendor = await Vendor.findByIdAndUpdate(
      vendorId,
      { isActive },
      { new: true }
    );

    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: { message: 'Vendor not found' }
      });
    }


    res.json({
      success: true,
      message: `Vendor ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: vendor
    });

  } catch (error) {
    console.error('Error toggling vendor status:', error);
    next(error);
  }
};

/**
 * Delete Vendor (Permanent)
 */
exports.deleteVendor = async (req, res, next) => {
  try {
    const { vendorId } = req.params;

    const vendor = await Vendor.findByIdAndDelete(vendorId);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: { message: 'Vendor not found' }
      });
    }

    // Also delete associated inquiries
    await VendorInquiry.deleteMany({ vendorId });


    res.json({
      success: true,
      message: 'Vendor deleted permanently'
    });

  } catch (error) {
    console.error('Error deleting vendor:', error);
    next(error);
  }
};

/**
 * Get Recent Activity (For Dashboard)
 */
exports.getRecentActivity = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const [recentVendors, recentInquiries, recentUsers] = await Promise.all([
      Vendor.find()
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .select('name businessName serviceType city verified createdAt')
        .lean()
        .catch(err => {
          return [];
        }),
      
      VendorInquiry.find()
        .populate({ path: 'vendorId', select: 'name businessName', strictPopulate: false })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .lean()
        .catch(err => {
          return [];
        }),
      
      User.find({ role: 'user' })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .select('name email createdAt')
        .lean()
        .catch(err => {
          return [];
        })
    ]);

    res.json({
      success: true,
      data: {
        recentVendors,
        recentInquiries,
        recentUsers
      }
    });

  } catch (error) {
    console.error('Error fetching recent activity:', error);
    // Return empty data instead of failing
    res.json({
      success: true,
      data: {
        recentVendors: [],
        recentInquiries: [],
        recentUsers: []
      }
    });
  }
};

/**
 * Forward Inquiry to Different Vendor
 */
exports.forwardInquiry = async (req, res, next) => {
  try {
    const { inquiryId } = req.params;
    const { newVendorId, reason } = req.body;

    if (!newVendorId) {
      return res.status(400).json({
        success: false,
        error: { 
          code: 'VENDOR_REQUIRED',
          message: 'Please select a vendor to forward to' 
        }
      });
    }

    // Get the inquiry
    const inquiry = await VendorInquiry.findById(inquiryId);
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        error: { message: 'Inquiry not found' }
      });
    }

    // Lifecycle guard: only approved and active inquiries can be forwarded.
    if (inquiry.approvalStatus !== 'approved') {
      return res.status(400).json({
        success: false,
        error: { message: 'Only approved inquiries can be forwarded' }
      });
    }

    if (inquiry.isActive === false) {
      return res.status(400).json({
        success: false,
        error: { message: 'Inactive inquiries cannot be forwarded' }
      });
    }

    // Get new vendor details
    const newVendor = await Vendor.findById(newVendorId);
    if (!newVendor) {
      return res.status(404).json({
        success: false,
        error: { message: 'Vendor not found' }
      });
    }

    // Store old vendor ID for reference
    const oldVendorId = inquiry.vendorId;

    // Update inquiry with new vendor
    inquiry.vendorId = newVendorId;
    
    // Update vendor details snapshot
    inquiry.vendorDetails = {
      name: newVendor.name,
      businessName: newVendor.businessName,
      serviceType: newVendor.serviceType,
      contact: {
        email: newVendor.contact?.email,
        phone: newVendor.contact?.phone,
        whatsapp: newVendor.contact?.whatsapp
      },
      address: {
        street: newVendor.address?.street,
        area: newVendor.address?.area,
        city: newVendor.address?.city || newVendor.city,
        state: newVendor.address?.state,
        pincode: newVendor.address?.pincode
      },
      city: newVendor.city,
      rating: newVendor.rating,
      verified: newVendor.verified
    };

    // Add forwarding note
    inquiry.adminNotes = (inquiry.adminNotes || '') + 
      `\n[${new Date().toLocaleString()}] Forwarded from vendor ${oldVendorId} to ${newVendorId}. Reason: ${reason || 'Not specified'}`;

    // Mark as contacted so user sees 'Forwarded to Vendor'
    inquiry.status = 'contacted';
    inquiry.vendorResponse = undefined;
    inquiry.rejectionReason = undefined;
    inquiry.respondedAt = undefined;
    inquiry.vendorDecision = undefined;

    await inquiry.save();


    res.json({
      success: true,
      message: `Inquiry forwarded to ${newVendor.businessName} successfully`,
      data: inquiry
    });

  } catch (error) {
    console.error('Error forwarding inquiry:', error);
    next(error);
  }
};

/**
 * Mark Inquiry as Active/Inactive
 */
exports.toggleInquiryActive = async (req, res, next) => {
  try {
    const { inquiryId } = req.params;
    const { isActive } = req.body;

    // Update vendor inquiry
    let inquiry = await VendorInquiry.findByIdAndUpdate(
      inquiryId,
      { isActive: isActive !== false },
      { new: true }
    ).populate('vendorId', 'name businessName');

    if (!inquiry) {
      // Try contact inquiry
      inquiry = await ContactInquiry.findByIdAndUpdate(
        inquiryId,
        { isActive: isActive !== false },
        { new: true }
      );
    }

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        error: { message: 'Inquiry not found' }
      });
    }


    res.json({
      success: true,
      message: `Inquiry marked as ${isActive !== false ? 'active' : 'inactive'}`,
      data: inquiry
    });

  } catch (error) {
    console.error('Error toggling inquiry status:', error);
    next(error);
  }
};

/**
 * ==========================================
 * REVIEW MANAGEMENT
 * ==========================================
 */

/**
 * Get all reviews with filters
 * @route GET /api/admin/reviews
 */
exports.getAllReviews = async (req, res, next) => {
  try {
    const { status, vendorId, page = 1, limit = 20 } = req.query;


    const query = {};
    
    if (status) {
      query.status = status;
    }

    if (vendorId) {
      const vendor = await Vendor.findOne({ vendorId });
      if (vendor) {
        query.vendorId = vendor._id;
      }
    }

    const reviews = await VendorReview.find(query)
      .populate('vendorId', 'businessName vendorId serviceType city')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const totalReviews = await VendorReview.countDocuments(query);


    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalReviews,
          pages: Math.ceil(totalReviews / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Error fetching reviews:', error);
    next(error);
  }
};

/**
 * Get pending reviews
 * @route GET /api/admin/reviews/pending
 */
exports.getPendingReviews = async (req, res, next) => {
  try {

    const reviews = await VendorReview.find({ status: 'pending' })
      .populate('vendorId', 'businessName vendorId serviceType city profileImage')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });


    res.json({
      success: true,
      data: reviews
    });

  } catch (error) {
    console.error('Error fetching pending reviews:', error);
    next(error);
  }
};

/**
 * Get review statistics
 * @route GET /api/admin/reviews/stats
 */
exports.getReviewStats = async (req, res, next) => {
  try {

    const [totalReviews, pendingReviews, approvedReviews, rejectedReviews] = await Promise.all([
      VendorReview.countDocuments(),
      VendorReview.countDocuments({ status: 'pending' }),
      VendorReview.countDocuments({ status: 'approved' }),
      VendorReview.countDocuments({ status: 'rejected' })
    ]);

    const stats = {
      totalReviews,
      pendingReviews,
      approvedReviews,
      rejectedReviews
    };


    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error calculating review stats:', error);
    next(error);
  }
};

/**
 * Approve a review
 * @route POST /api/admin/reviews/:reviewId/approve
 */
exports.approveReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;


    const review = await VendorReview.findByIdAndUpdate(
      reviewId,
      { status: 'approved' },
      { new: true }
    )
      .populate('vendorId', 'businessName vendorId')
      .populate('userId', 'name email');

    if (!review) {
      return res.status(404).json({
        success: false,
        error: { message: 'Review not found' }
      });
    }


    res.json({
      success: true,
      message: 'Review approved successfully',
      data: review
    });

  } catch (error) {
    console.error('Error approving review:', error);
    next(error);
  }
};

/**
 * Reject a review
 * @route POST /api/admin/reviews/:reviewId/reject
 */
exports.rejectReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { reason } = req.body;


    const review = await VendorReview.findByIdAndUpdate(
      reviewId,
      { 
        status: 'rejected',
        rejectionReason: reason || 'Does not meet community guidelines'
      },
      { new: true }
    )
      .populate('vendorId', 'businessName vendorId')
      .populate('userId', 'name email');

    if (!review) {
      return res.status(404).json({
        success: false,
        error: { message: 'Review not found' }
      });
    }


    res.json({
      success: true,
      message: 'Review rejected successfully',
      data: review
    });

  } catch (error) {
    console.error('Error rejecting review:', error);
    next(error);
  }
};

/**
 * Delete a review
 * @route DELETE /api/admin/reviews/:reviewId
 */
exports.deleteReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;


    const review = await VendorReview.findByIdAndDelete(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: { message: 'Review not found' }
      });
    }


    res.json({
      success: true,
      message: 'Review deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting review:', error);
    next(error);
  }
};

// ===================================
// MEDIA MANAGEMENT FUNCTIONS
// ===================================

/**
 * Get all media with filters
 * @route GET /api/admin/media
 */
exports.getAllMedia = async (req, res, next) => {
  try {
    const { approvalStatus, vendorId, type, page = 1, limit = 20 } = req.query;


    const query = {};
    
    if (approvalStatus) {
      query.approvalStatus = approvalStatus;
    }

    if (vendorId) {
      const vendor = await Vendor.findOne({ vendorId });
      if (vendor) {
        query.vendorId = vendor._id;
      }
    }

    if (type) {
      query.type = type;
    }

    const media = await VendorMedia.find(query)
      .populate('vendorId', 'businessName vendorId serviceType')
      .select('vendorId type url caption approvalStatus rejectionReason createdAt')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const totalMedia = await VendorMedia.countDocuments(query);


    res.json({
      success: true,
      data: {
        media,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalMedia,
          pages: Math.ceil(totalMedia / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Error fetching media:', error);
    next(error);
  }
};

/**
 * Get pending media
 * @route GET /api/admin/media/pending
 */
exports.getPendingMedia = async (req, res, next) => {
  try {

    const media = await VendorMedia.find({ approvalStatus: 'pending' })
      .populate('vendorId', 'businessName vendorId serviceType')
      .sort({ createdAt: -1 });


    res.json({
      success: true,
      data: media
    });

  } catch (error) {
    console.error('Error fetching pending media:', error);
    next(error);
  }
};

/**
 * Get media statistics
 * @route GET /api/admin/media/stats
 */
exports.getMediaStats = async (req, res, next) => {
  try {

    const [totalMedia, pendingMedia, approvedMedia, rejectedMedia] = await Promise.all([
      VendorMedia.countDocuments(),
      VendorMedia.countDocuments({ approvalStatus: 'pending' }),
      VendorMedia.countDocuments({ approvalStatus: 'approved' }),
      VendorMedia.countDocuments({ approvalStatus: 'rejected' })
    ]);

    const stats = {
      totalMedia,
      pendingMedia,
      approvedMedia,
      rejectedMedia
    };


    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error calculating media stats:', error);
    next(error);
  }
};

/**
 * Approve media
 * @route POST /api/admin/media/:mediaId/approve
 */
exports.approveMedia = async (req, res, next) => {
  try {
    const { mediaId } = req.params;


    const media = await VendorMedia.findByIdAndUpdate(
      mediaId,
      { approvalStatus: 'approved' },
      { new: true }
    )
      .populate('vendorId', 'businessName vendorId');

    if (!media) {
      return res.status(404).json({
        success: false,
        error: { message: 'Media not found' }
      });
    }


    // Create notification for vendor
    try {
      const rawMediaType = String(media.type || media.mediaType || '').toLowerCase();
      const mediaLabel = rawMediaType === 'video' ? 'video' : (rawMediaType === 'image' ? 'photo' : 'media');
      await Notification.create({
        vendor: media.vendorId._id,
        type: 'profile',
        title: 'Media Approved',
        message: `Your ${mediaLabel} has been approved and is now visible on your profile.`,
        link: '/vendor-profile-dashboard?tab=media',
        relatedId: media._id,
        priority: 'normal'
      });
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
    }

    res.json({
      success: true,
      message: 'Media approved successfully',
      data: media
    });

  } catch (error) {
    console.error('Error approving media:', error);
    next(error);
  }
};

/**
 * Reject media
 * @route POST /api/admin/media/:mediaId/reject
 */
exports.rejectMedia = async (req, res, next) => {
  try {
    const { mediaId } = req.params;
    const { reason } = req.body;


    const media = await VendorMedia.findByIdAndUpdate(
      mediaId,
      { 
        approvalStatus: 'rejected',
        rejectionReason: reason || 'Does not meet content guidelines'
      },
      { new: true }
    )
      .populate('vendorId', 'businessName vendorId');

    if (!media) {
      return res.status(404).json({
        success: false,
        error: { message: 'Media not found' }
      });
    }

    // Create notification for vendor
    try {
      const rawMediaType = String(media.type || media.mediaType || '').toLowerCase();
      const mediaLabel = rawMediaType === 'video' ? 'video' : (rawMediaType === 'image' ? 'photo' : 'media');
      await Notification.create({
        vendor: media.vendorId._id,
        type: 'profile',
        title: 'Media Rejected',
        message: `Your ${mediaLabel} was rejected.${media.rejectionReason ? ` Reason: ${media.rejectionReason}` : ''}`,
        link: '/vendor-profile-dashboard?tab=media',
        relatedId: media._id,
        priority: 'high'
      });
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
    }


    res.json({
      success: true,
      message: 'Media rejected successfully',
      data: media
    });

  } catch (error) {
    console.error('Error rejecting media:', error);
    next(error);
  }
};

/**
 * Delete media
 * @route DELETE /api/admin/media/:mediaId
 */
exports.deleteMedia = async (req, res, next) => {
  try {
    const { mediaId } = req.params;


    const media = await VendorMedia.findByIdAndDelete(mediaId);

    if (!media) {
      return res.status(404).json({
        success: false,
        error: { message: 'Media not found' }
      });
    }


    res.json({
      success: true,
      message: 'Media deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting media:', error);
    next(error);
  }
};

// ===================================
// BLOG MANAGEMENT FUNCTIONS
// ===================================

/**
 * Get all blogs with filters
 * @route GET /api/admin/blogs
 */
exports.getAllBlogs = async (req, res, next) => {
  try {
    const { approvalStatus, vendorId, status, page = 1, limit = 20 } = req.query;


    const query = {};
    
    if (approvalStatus) {
      query.approvalStatus = approvalStatus;
    }

    if (vendorId) {
      const vendor = await Vendor.findOne({ vendorId });
      if (vendor) {
        query.vendorId = vendor._id;
      }
    }

    if (status) {
      query.status = status;
    }

    const blogs = await VendorBlog.find(query)
      .populate('vendorId', 'businessName vendorId serviceType')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const totalBlogs = await VendorBlog.countDocuments(query);


    res.json({
      success: true,
      data: {
        blogs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalBlogs,
          pages: Math.ceil(totalBlogs / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Error fetching blogs:', error);
    next(error);
  }
};

/**
 * Get pending blogs
 * @route GET /api/admin/blogs/pending
 */
exports.getPendingBlogs = async (req, res, next) => {
  try {

    const blogs = await VendorBlog.find({ approvalStatus: 'pending' })
      .populate('vendorId', 'businessName vendorId serviceType')
      .sort({ createdAt: -1 });


    res.json({
      success: true,
      data: blogs
    });

  } catch (error) {
    console.error('Error fetching pending blogs:', error);
    next(error);
  }
};

/**
 * Get blog statistics
 * @route GET /api/admin/blogs/stats
 */
exports.getBlogStats = async (req, res, next) => {
  try {

    const [totalBlogs, pendingBlogs, approvedBlogs, rejectedBlogs] = await Promise.all([
      VendorBlog.countDocuments(),
      VendorBlog.countDocuments({ approvalStatus: 'pending' }),
      VendorBlog.countDocuments({ approvalStatus: 'approved' }),
      VendorBlog.countDocuments({ approvalStatus: 'rejected' })
    ]);

    const stats = {
      totalBlogs,
      pendingBlogs,
      approvedBlogs,
      rejectedBlogs
    };


    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error calculating blog stats:', error);
    next(error);
  }
};

/**
 * Approve blog
 * @route POST /api/admin/blogs/:blogId/approve
 */
exports.approveBlog = async (req, res, next) => {
  try {
    const { blogId } = req.params;


    const blog = await VendorBlog.findByIdAndUpdate(
      blogId,
      { 
        approvalStatus: 'approved',
        status: 'published',  // Auto-publish when approved
        publishedAt: new Date()  // Set publish timestamp
      },
      { new: true }
    )
      .populate('vendorId', 'businessName vendorId');

    if (!blog) {
      return res.status(404).json({
        success: false,
        error: { message: 'Blog not found' }
      });
    }


    // Create notification for vendor
    try {
      await Notification.create({
        vendor: blog.vendorId._id,
        type: 'profile',
        title: 'Blog Post Published',
        message: `Your blog post "${blog.title}" has been approved and is now live on your profile.`,
        link: '/vendor-profile-dashboard?tab=blogs',
        relatedId: blog._id,
        priority: 'normal'
      });
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
    }

    res.json({
      success: true,
      message: 'Blog approved and published successfully',
      data: blog
    });

  } catch (error) {
    console.error('Error approving blog:', error);
    next(error);
  }
};

/**
 * Reject blog
 * @route POST /api/admin/blogs/:blogId/reject
 */
exports.rejectBlog = async (req, res, next) => {
  try {
    const { blogId } = req.params;
    const { reason } = req.body;


    const blog = await VendorBlog.findByIdAndUpdate(
      blogId,
      { 
        approvalStatus: 'rejected',
        rejectionReason: reason || 'Does not meet content guidelines'
      },
      { new: true }
    )
      .populate('vendorId', 'businessName vendorId');

    if (!blog) {
      return res.status(404).json({
        success: false,
        error: { message: 'Blog not found' }
      });
    }


    res.json({
      success: true,
      message: 'Blog rejected successfully',
      data: blog
    });

  } catch (error) {
    console.error('Error rejecting blog:', error);
    next(error);
  }
};

/**
 * Delete blog
 * @route DELETE /api/admin/blogs/:blogId
 */
exports.deleteBlog = async (req, res, next) => {
  try {
    const { blogId } = req.params;


    const blog = await VendorBlog.findByIdAndDelete(blogId);

    if (!blog) {
      return res.status(404).json({
        success: false,
        error: { message: 'Blog not found' }
      });
    }


    res.json({
      success: true,
      message: 'Blog deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting blog:', error);
    next(error);
  }
};

/**
 * Export Vendors to Excel
 */
exports.exportVendors = async (req, res, next) => {
  try {
    const XLSX = require('xlsx');

    // Fetch all vendors without pagination
    const vendors = await Vendor.find()
      .select('-password -__v')
      .lean();

    
    if (vendors.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No vendors found to export'
      });
    }

    // Log raw vendor data for debugging

    const safeValue = (value) => {
      if (value === undefined || value === null || value === '') return 'N/A';
      return value;
    };

    const formatDate = (value) => {
      if (!value) return 'N/A';
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('en-IN');
    };

    const vendorIds = vendors.map(v => v._id);
    const reviewStats = await VendorReview.aggregate([
      { $match: { vendorId: { $in: vendorIds }, status: 'approved' } },
      {
        $group: {
          _id: '$vendorId',
          reviewCount: { $sum: 1 },
          avgRating: { $avg: '$rating' }
        }
      }
    ]);

    const reviewStatsMap = new Map(
      reviewStats.map(stat => [String(stat._id), stat])
    );

    // Format data for Excel
    const excelData = vendors.map(vendor => {
      const stat = reviewStatsMap.get(String(vendor._id));
      const derivedReviewCount = stat?.reviewCount ?? vendor.reviewCount ?? 0;
      const derivedRating = stat?.avgRating ?? vendor.rating ?? 0;
      const row = {
        'Vendor ID': safeValue(vendor.vendorId),
        'Business Name': safeValue(vendor.businessName),
        'Name': safeValue(vendor.name),
        'Service Type': safeValue(vendor.serviceType),
        'Email': safeValue(vendor.contact?.email),
        'Phone': safeValue(vendor.contact?.phone),
        'City': safeValue(vendor.city),
        'Area': safeValue(vendor.area),
        'Verified': vendor.verified ? 'Yes' : 'No',
        'Active': vendor.isActive !== false ? 'Yes' : 'No',
        'Rating': Number(derivedRating).toFixed(1),
        'Total Reviews': derivedReviewCount,
        'Pricing Range': `${safeValue(vendor.pricing?.min)} - ${safeValue(vendor.pricing?.max)}`,
        'Created Date': formatDate(vendor.createdAt),
        'Updated Date': formatDate(vendor.updatedAt)
      };
      return row;
    });


    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths for better readability
    worksheet['!cols'] = [
      { wch: 20 }, // Vendor ID
      { wch: 25 }, // Business Name
      { wch: 20 }, // Name
      { wch: 20 }, // Service Type
      { wch: 30 }, // Email
      { wch: 15 }, // Phone
      { wch: 15 }, // City
      { wch: 15 }, // Area
      { wch: 10 }, // Verified
      { wch: 10 }, // Active
      { wch: 10 }, // Rating
      { wch: 15 }, // Total Reviews
      { wch: 22 }, // Pricing Range
      { wch: 15 }, // Created Date
      { wch: 15 }  // Updated Date
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Vendors');

    // Generate buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });


    // Set response headers
    const fileName = `vendors_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', excelBuffer.length);

    res.send(excelBuffer);

  } catch (error) {
    console.error('❌ Error exporting vendors:', error);
    next(error);
  }
};

/**
 * Export Users to Excel
 */
exports.exportUsers = async (req, res, next) => {
  try {
    const XLSX = require('xlsx');

    // Fetch all users without pagination
    const users = await User.find({ role: 'user' })
      .select('-password -__v')
      .lean();

    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No users found to export'
      });
    }

    // Log raw user data for debugging

    const safeValue = (value) => {
      if (value === undefined || value === null || value === '') return 'N/A';
      return value;
    };

    const formatDate = (value) => {
      if (!value) return 'N/A';
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('en-IN');
    };

    // Format data for Excel
    const excelData = users.map(user => {
      const isEmailVerified = Boolean(user.isEmailVerified || user.emailVerified);
      const row = {
        'User ID': user._id ? user._id.toString() : 'N/A',
        'Name': safeValue(user.name),
        'Email': safeValue(user.email),
        'Phone': safeValue(user.phone),
        'Active': user.isActive !== false ? 'Yes' : 'No',
        'Email Verified': isEmailVerified ? 'Yes' : 'No',
        'Created Date': formatDate(user.createdAt),
        'Last Login': formatDate(user.lastLogin)
      };
      return row;
    });


    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 25 }, // User ID
      { wch: 20 }, // Name
      { wch: 30 }, // Email
      { wch: 15 }, // Phone
      { wch: 10 }, // Active
      { wch: 15 }, // Email Verified
      { wch: 15 }, // Created Date
      { wch: 15 }  // Last Login
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');

    // Generate buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });


    // Set response headers
    const fileName = `users_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', excelBuffer.length);

    res.send(excelBuffer);

  } catch (error) {
    console.error('❌ Error exporting users:', error);
    next(error);
  }
};

/**
 * Export Inquiries to Excel
 */
exports.exportInquiries = async (req, res, next) => {
  try {
    const XLSX = require('xlsx');

    // Fetch all vendor inquiries and contact inquiries
    const [vendorInquiries, contactInquiries] = await Promise.all([
      VendorInquiry.find()
        .populate({ path: 'vendorId', select: 'name businessName', strictPopulate: false })
        .lean(),
      ContactInquiry.find().lean()
    ]);

    
    if (vendorInquiries.length === 0 && contactInquiries.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No inquiries found to export'
      });
    }

    // Log raw inquiry data for debugging
    if (vendorInquiries.length > 0) {
    }
    if (contactInquiries.length > 0) {
    }

    const safeValue = (value) => {
      if (value === undefined || value === null || value === '') return 'N/A';
      return value;
    };

    const formatDate = (value) => {
      if (!value) return 'N/A';
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('en-IN');
    };

    const vendorInquiriesData = vendorInquiries
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .map(inquiry => ({
        'Inquiry ID': safeValue(inquiry.inquiryId || inquiry._id?.toString()),
        'Customer Name': safeValue(inquiry.userName),
        'Email': safeValue(inquiry.userEmail),
        'Phone': safeValue(inquiry.userContact),
        'Event Type': safeValue(inquiry.eventType),
        'Event Date': formatDate(inquiry.eventDate?.start || inquiry.eventDate),
        'Budget': inquiry.budget || 0,
        'City': safeValue(inquiry.city),
        'Vendor Name': safeValue(inquiry.vendorDetails?.name || inquiry.vendorId?.name || inquiry.vendorId?.businessName),
        'Status': safeValue(inquiry.status),
        'Approval Status': safeValue(inquiry.approvalStatus),
        'Is Active': inquiry.isActive !== false ? 'Yes' : 'No',
        'Message': safeValue(inquiry.message),
        'Created Date': formatDate(inquiry.createdAt),
        'Updated Date': formatDate(inquiry.updatedAt)
      }));

    const contactInquiriesData = contactInquiries
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .map(inquiry => ({
        'Inquiry ID': safeValue(inquiry.inquiryId || inquiry._id?.toString()),
        'Customer Name': safeValue(inquiry.userName),
        'Email': safeValue(inquiry.userEmail),
        'Phone': safeValue(inquiry.userContact),
        'Subject': safeValue(inquiry.subject || inquiry.eventType),
        'Event Date': formatDate(inquiry.eventDate),
        'Budget': inquiry.budget || 0,
        'City': safeValue(inquiry.city),
        'Status': safeValue(inquiry.status),
        'Message': safeValue(inquiry.message),
        'Created Date': formatDate(inquiry.createdAt),
        'Updated Date': formatDate(inquiry.updatedAt)
      }));

    const workbook = XLSX.utils.book_new();

    if (vendorInquiriesData.length > 0) {
      const vendorWorksheet = XLSX.utils.json_to_sheet(vendorInquiriesData);
      vendorWorksheet['!cols'] = [
        { wch: 22 }, // Inquiry ID
        { wch: 20 }, // Customer Name
        { wch: 30 }, // Email
        { wch: 15 }, // Phone
        { wch: 20 }, // Event Type
        { wch: 15 }, // Event Date
        { wch: 12 }, // Budget
        { wch: 15 }, // City
        { wch: 25 }, // Vendor Name
        { wch: 12 }, // Status
        { wch: 18 }, // Approval Status
        { wch: 10 }, // Is Active
        { wch: 40 }, // Message
        { wch: 15 }, // Created Date
        { wch: 15 }  // Updated Date
      ];
      XLSX.utils.book_append_sheet(workbook, vendorWorksheet, 'Vendor Inquiries');
    }

    if (contactInquiriesData.length > 0) {
      const contactWorksheet = XLSX.utils.json_to_sheet(contactInquiriesData);
      contactWorksheet['!cols'] = [
        { wch: 22 }, // Inquiry ID
        { wch: 20 }, // Customer Name
        { wch: 30 }, // Email
        { wch: 15 }, // Phone
        { wch: 20 }, // Subject
        { wch: 15 }, // Event Date
        { wch: 12 }, // Budget
        { wch: 15 }, // City
        { wch: 12 }, // Status
        { wch: 40 }, // Message
        { wch: 15 }, // Created Date
        { wch: 15 }  // Updated Date
      ];
      XLSX.utils.book_append_sheet(workbook, contactWorksheet, 'Contact Inquiries');
    }

    // Generate buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });


    // Set response headers
    const fileName = `inquiries_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', excelBuffer.length);

    res.send(excelBuffer);

  } catch (error) {
    console.error('❌ Error exporting inquiries:', error);
    next(error);
  }
};
