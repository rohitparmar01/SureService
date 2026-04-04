const Inquiry = require('../models/Inquiry'); // Legacy - kept for backward compatibility
const VendorInquiry = require('../models/VendorInquiry');
const ContactInquiry = require('../models/ContactInquiry');
const Vendor = require('../models/VendorNew');

/**
 * INQUIRY CONTROLLER
 * NOTE: Internal field names (eventType, eventDate) are legacy names kept for backward compatibility.
 * These represent "serviceType" and "serviceDate" in the B2B service management context.
 * Database schema uses these names for existing data compatibility.
 * 
 * Create a new inquiry (Vendor-specific or General)
 */
exports.createInquiry = async (req, res, next) => {
  try {
    const {
      userName,
      userEmail,
      userContact,
      eventType,
      eventDate,
      budget,
      location,
      city,
      vendorId,
      message,
      category,
      inquiryType = 'vendor_inquiry',
      source = 'website'
    } = req.body;

    // ========== DETAILED LOGGING FOR INQUIRY TYPE ==========
    
    if (inquiryType === 'vendor_inquiry' && vendorId) {
    } else if (inquiryType === 'contact_inquiry') {
    } else {
    }
    

    // Validation
    // For vendor inquiries we require budget; for general/contact inquiries budget is optional
    const budgetRequired = inquiryType === 'vendor_inquiry' && vendorId;
    const budgetValue = budget ? parseInt(budget) : 0;
    
    if (!userName || !userContact || !eventType || (budgetRequired && budgetValue <= 0)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: budgetRequired
            ? 'Name, contact, service type, and budget are required'
            : 'Name, contact, and service type are required'
        }
      });
    }

    // ===== Event date parsing and validation =====
    // Accept either:
    // - eventDate as an object { start, end }
    // - eventDate as a single ISO/string date
    let eventStartDate = null;
    let eventEndDate = null;

    if (eventDate) {
      try {
        if (typeof eventDate === 'string' || eventDate instanceof String) {
          eventStartDate = new Date(eventDate);
          eventEndDate = new Date(eventDate);
        } else if (typeof eventDate === 'object') {
          // Prefer explicit start and end
          eventStartDate = eventDate.start ? new Date(eventDate.start) : (eventDate?.startDate ? new Date(eventDate.startDate) : null);
          eventEndDate = eventDate.end ? new Date(eventDate.end) : (eventDate?.endDate ? new Date(eventDate.endDate) : null);
          // If only a single date provided as raw Date value
          if (!eventStartDate && eventDate instanceof Date) {
            eventStartDate = new Date(eventDate);
            eventEndDate = new Date(eventDate);
          }
        }
      } catch (err) {
      }
    }

    // If no start provided, leave undefined for now (frontend should send start)
    if (!eventStartDate || isNaN(eventStartDate.getTime())) {
      // do not abort here; later validation will require start for vendor inquiries
      eventStartDate = null;
    }

    // Enforce start date is required ONLY for vendor inquiries
    // Contact inquiries don't need event dates
    if (!eventStartDate && inquiryType !== 'contact_inquiry') {
      return res.status(400).json({ success: false, error: { code: 'MISSING_EVENT_START', message: 'Start date is required' } });
    }

    if (!eventEndDate || isNaN(eventEndDate.getTime())) {
      eventEndDate = eventStartDate ? new Date(eventStartDate) : null;
    }

    // Enforce start >= today (no past dates) and end >= start
    if (eventStartDate) {
      const today = new Date();
      today.setHours(0,0,0,0);
      const s = new Date(eventStartDate);
      s.setHours(0,0,0,0);
      const e = eventEndDate ? new Date(eventEndDate) : new Date(s);
      e.setHours(0,0,0,0);

      if (s < today) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_EVENT_DATE', message: 'Start date cannot be in the past' } });
      }

      if (e < s) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_EVENT_DATE', message: 'End date cannot be before start date' } });
      }
    }

    // Validate vendor exists if vendor inquiry
    let vendorSnapshot = null;
    if (inquiryType === 'vendor_inquiry' && vendorId) {
      const vendor = await Vendor.findById(vendorId);
      if (!vendor) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'VENDOR_NOT_FOUND',
            message: 'Vendor not found'
          }
        });
      }
      
      // Create vendor details snapshot
      vendorSnapshot = {
        name: vendor.name,
        businessName: vendor.businessName,
        serviceType: vendor.serviceType,
        contact: {
          email: vendor.contact?.email,
          phone: vendor.contact?.phone,
          whatsapp: vendor.contact?.whatsapp
        },
        address: {
          street: vendor.address?.street,
          area: vendor.address?.area,
          city: vendor.address?.city || vendor.city,
          state: vendor.address?.state,
          pincode: vendor.address?.pincode
        },
        city: vendor.city,
        rating: vendor.rating,
        reviewCount: vendor.reviews?.length || 0,
        verified: vendor.verified,
        responseTime: vendor.responseTime,
        profileImage: vendor.profileImage,
        coverImage: vendor.coverImage
      };
      
      // Log vendor details
    }

    // Create inquiry in appropriate collection based on type
    let inquiry;
    
    if (inquiryType === 'vendor_inquiry' && vendorId) {
      // Save to VendorInquiry collection (vendorinquiries)
      inquiry = await VendorInquiry.create({
        userName,
        userEmail,
        userContact,
        eventType,
        eventDate: eventStartDate ? { start: eventStartDate, end: eventEndDate || eventStartDate } : undefined,
        budget: budgetValue,
        location: location || { type: 'Point', coordinates: [0, 0] },
        city,
        vendorId,
        vendorDetails: vendorSnapshot, // Embedded vendor snapshot
        message,
        source,
        status: 'pending'
      });
      
      // Populate vendor reference for response
      await inquiry.populate('vendorId', 'name businessName contact.email contact.phone serviceType city');
      
    } else if (inquiryType === 'contact_inquiry') {
      // Save to ContactInquiry collection (contactinquiries)
      inquiry = await ContactInquiry.create({
        userName,
        userEmail,
        userContact,
        eventType,
        message,
        budget: budgetValue,
        source,
        status: 'pending',
        category: category || 'general'
      });
      
    } else {
      // Fallback to general Inquiry collection
      inquiry = await Inquiry.create({
        userName,
        userEmail,
        userContact,
        eventType,
        eventDate: eventStartDate ? { start: eventStartDate, end: eventEndDate || eventStartDate } : undefined,
        budget: budgetValue,
        location: location || { type: 'Point', coordinates: [0, 0] },
        city,
        vendorId: vendorId || undefined,
        message,
        inquiryType,
        source,
        status: 'pending'
      });
    }

    // Log success with inquiry details and collection info
    
    if (inquiryType === 'vendor_inquiry' && vendorId) {
    } else if (inquiryType === 'contact_inquiry') {
    } else {
    }
    

    res.status(201).json({
      success: true,
      message: 'Inquiry submitted successfully',
      data: inquiry
    });

  } catch (error) {
    console.error('Error creating inquiry:', error);
    next(error);
  }
};

/**
 * Get all inquiries (Admin/Dashboard/User)
 * Fetches from both VendorInquiry and ContactInquiry collections
 * SECURITY: Filters by user role - users see only their own inquiries
 */
exports.getAllInquiries = async (req, res, next) => {
  try {
    const { 
      status, 
      inquiryType, 
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;

    const query = {};
    if (status) query.status = status;

    // CRITICAL SECURITY FIX: Filter inquiries based on user role
    const loggedInUser = req.user;
    
    if (!loggedInUser) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    // Apply role-based filtering
    if (loggedInUser.role === 'user') {
      // Regular users: Only see their own inquiries (filter by email OR phone)
      // Using $or to match either email or phone from the logged-in user
      query.$or = [
        { userEmail: loggedInUser.email },
        { userContact: loggedInUser.phone }
      ];
    } else if (loggedInUser.role === 'vendor') {
      // Vendors: Only see inquiries sent to them (filter by vendorId)
      query.vendorId = loggedInUser._id;
      query.approvalStatus = 'approved'; // Vendors only see approved inquiries
      query.isActive = { $ne: false }; // Vendors should not see inactive inquiries
    } else if (loggedInUser.role === 'admin') {
      // Admins: Can see all inquiries (no filter)
    } else {
      // Unknown role - deny access
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied' }
      });
    }

    const skip = (page - 1) * limit;
    const sortOrder = order === 'desc' ? -1 : 1;

    let vendorInquiries = [];
    let contactInquiries = [];
    let vendorTotal = 0;
    let contactTotal = 0;

    // Fetch based on inquiryType filter with defensive error handling
    if (!inquiryType || inquiryType === 'vendor_inquiry') {
      try {
        vendorInquiries = await VendorInquiry.find(query)
          .populate({
            path: 'vendorId',
            select: 'name businessName serviceType contact.email contact.phone city',
            options: { strictPopulate: false }
          })
          .sort({ [sortBy]: sortOrder })
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

    if (!inquiryType || inquiryType === 'contact_inquiry') {
      try {
        contactInquiries = await ContactInquiry.find(query)
          .sort({ [sortBy]: sortOrder })
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

    // Add type identifier to each inquiry
    const vendorInqsWithType = vendorInquiries.map(inq => ({
      ...(typeof inq.toObject === 'function' ? inq.toObject() : inq),
      inquiryType: 'vendor_inquiry',
      collection: 'vendorinquiries'
    }));

    const contactInqsWithType = contactInquiries.map(inq => ({
      ...(typeof inq.toObject === 'function' ? inq.toObject() : inq),
      inquiryType: 'contact_inquiry',
      collection: 'contactinquiries'
    }));

    // Combine and sort
    const allInquiries = [...vendorInqsWithType, ...contactInqsWithType]
      .sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        return sortOrder === -1 ? (bVal > aVal ? 1 : -1) : (aVal > bVal ? 1 : -1);
      })
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
        totalPages: Math.ceil(total / limit),
        hasMore: page < Math.ceil(total / limit)
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
        totalPages: 0,
        hasMore: false
      }
    });
  }
};

/**
 * Get inquiries for a specific vendor
 * Uses VendorInquiry collection only
 * NOTE: Vendors can only see APPROVED inquiries
 * SECURITY: Vendors can only access their own inquiries
 */
exports.getVendorInquiries = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;
    const loggedInUser = req.user;


    // SECURITY CHECK: Vendors can only view their own inquiries
    // Convert both to strings for proper comparison
    const vendorIdStr = vendorId.toString();
    const userIdStr = loggedInUser._id.toString();
    
    if (loggedInUser.role === 'vendor' && vendorIdStr !== userIdStr) {
      console.error('❌ 403 FORBIDDEN: Vendor trying to access another vendor\'s inquiries');
      console.error('   vendorId param:', vendorIdStr);
      console.error('   loggedInUser._id:', userIdStr);
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You can only view your own inquiries' }
      });
    }
    

    // IMPORTANT: Vendors can only see approved inquiries
    const query = { 
      vendorId,
      approvalStatus: 'approved', // Only show approved inquiries to vendors
      isActive: { $ne: false } // Exclude inquiries deactivated by admin
    };
    
    if (status) query.status = status;


    const skip = (page - 1) * limit;

    // Query with defensive error handling
    let inquiries = [];
    let total = 0;
    
    try {
      inquiries = await VendorInquiry.find(query)
        .populate({
          path: 'vendorId',
          select: 'name businessName serviceType contact.email contact.phone city',
          options: { strictPopulate: false }
        })
        .populate({
          path: 'approvedBy',
          select: 'name email',
          options: { strictPopulate: false }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean()
        .catch(err => {
          console.error('❌ Error populating inquiries:', err.message);
          return [];
        });

      total = await VendorInquiry.countDocuments(query).catch(() => 0);
    } catch (queryError) {
      console.error('❌ Error in vendor inquiries query:', queryError);
      inquiries = [];
      total = 0;
    }
    

    res.json({
      success: true,
      data: {
        inquiries,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching vendor inquiries:', error);
    // Return empty data instead of crashing
    res.json({
      success: true,
      data: {
        inquiries: [],
        total: 0,
        page: parseInt(page),
        totalPages: 0
      }
    });
  }
};

/**
 * Get single inquiry by ID
 * SECURITY: Users can only view their own inquiries, vendors only their inquiries, admins see all
 */
exports.getInquiryById = async (req, res, next) => {
  try {
    const { inquiryId } = req.params;
    const loggedInUser = req.user;

    // Try both collections
    let inquiry = await VendorInquiry.findById(inquiryId)
      .populate('vendorId', 'name businessName serviceType contact city');
    
    if (!inquiry) {
      inquiry = await ContactInquiry.findById(inquiryId);
    }
    
    // Legacy fallback
    if (!inquiry) {
      inquiry = await Inquiry.findById(inquiryId)
        .populate('vendorId', 'name businessName serviceType contact city');
    }

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INQUIRY_NOT_FOUND',
          message: 'Inquiry not found'
        }
      });
    }

    // SECURITY CHECK: Verify user has permission to view this inquiry
    if (loggedInUser.role === 'user') {
      // Users can only view their own inquiries
      if (inquiry.userEmail !== loggedInUser.email) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You can only view your own inquiries' }
        });
      }
    } else if (loggedInUser.role === 'vendor') {
      // Vendors can only view inquiries sent to them
      if (!inquiry.vendorId || inquiry.vendorId.toString() !== loggedInUser._id.toString()) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You can only view inquiries sent to you' }
        });
      }
    }
    // Admins can view all inquiries (no check needed)

    res.json({
      success: true,
      data: inquiry
    });

  } catch (error) {
    console.error('Error fetching inquiry:', error);
    next(error);
  }
};

/**
 * Update inquiry status
 */
exports.updateInquiryStatus = async (req, res, next) => {
  try {
    const { inquiryId } = req.params;
    const { status, vendorResponse } = req.body;

    const validStatuses = ['pending', 'contacted', 'responded', 'closed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: `Status must be one of: ${validStatuses.join(', ')}`
        }
      });
    }

    const inquiry = await Inquiry.findById(inquiryId);
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INQUIRY_NOT_FOUND',
          message: 'Inquiry not found'
        }
      });
    }

    inquiry.status = status;
    if (status === 'responded' && vendorResponse) {
      inquiry.vendorResponse = vendorResponse;
      inquiry.respondedAt = Date.now();
    }

    await inquiry.save();

    res.json({
      success: true,
      message: 'Inquiry status updated',
      data: inquiry
    });

  } catch (error) {
    console.error('Error updating inquiry:', error);
    next(error);
  }
};

/**
 * Delete inquiry
 */
exports.deleteInquiry = async (req, res, next) => {
  try {
    const { inquiryId } = req.params;

    const inquiry = await Inquiry.findByIdAndDelete(inquiryId);
    
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INQUIRY_NOT_FOUND',
          message: 'Inquiry not found'
        }
      });
    }

    res.json({
      success: true,
      message: 'Inquiry deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting inquiry:', error);
    next(error);
  }
};

/**
 * Get inquiry statistics (Admin Dashboard)
 */
exports.vendorRespondToInquiry = async (req, res, next) => {
  try {
    const { inquiryId } = req.params;
    const { action, declineReason, customMessage } = req.body;

    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action. Must be accept or decline' });
    }

    if (action === 'decline' && (!declineReason || !declineReason.trim())) {
      return res.status(400).json({ success: false, message: 'Decline reason is required' });
    }

    const vendorId = req.user._id.toString();
    const inquiry = await VendorInquiry.findOne({
      _id: inquiryId,
      vendorId,
      approvalStatus: 'approved',
      isActive: { $ne: false }
    });

    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found or not authorized' });
    }

    if (inquiry.vendorResponse || !['pending', 'contacted'].includes(inquiry.status)) {
      return res.status(400).json({ success: false, message: 'You have already responded to this inquiry' });
    }

    if (action === 'accept') {
      inquiry.vendorResponse = (customMessage && customMessage.trim())
        ? customMessage.trim()
        : 'Thank you for your inquiry! We are delighted to accept your request and will reach out to you shortly to discuss the details.';
      inquiry.vendorDecision = 'accepted';
    } else {
      inquiry.vendorResponse = `Thank you for reaching out. Unfortunately, we are unable to accommodate your request at this time. Reason: ${declineReason.trim()}`;
      inquiry.rejectionReason = declineReason.trim();
      inquiry.vendorDecision = 'declined';
    }

    inquiry.status = 'responded';
    inquiry.respondedAt = new Date();
    await inquiry.save();

    res.json({
      success: true,
      message: action === 'accept' ? 'Inquiry accepted successfully' : 'Inquiry declined',
      inquiry
    });
  } catch (error) {
    console.error('Error in vendorRespondToInquiry:', error);
    next(error);
  }
};

exports.getInquiryStats = async (req, res, next) => {
  try {
    const total = await Inquiry.countDocuments();
    const pending = await Inquiry.countDocuments({ status: 'pending' });
    const responded = await Inquiry.countDocuments({ status: 'responded' });
    const closed = await Inquiry.countDocuments({ status: 'closed' });

    // Recent inquiries (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentCount = await Inquiry.countDocuments({ 
      createdAt: { $gte: sevenDaysAgo } 
    });

    // By inquiry type
    const byType = await Inquiry.aggregate([
      {
        $group: {
          _id: '$inquiryType',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        total,
        pending,
        responded,
        closed,
        recentCount,
        byType: byType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });

  } catch (error) {
    console.error('Error fetching inquiry stats:', error);
    next(error);
  }
};
