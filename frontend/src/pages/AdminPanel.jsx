/**
 * Production Admin Panel - Professional Dashboard with Complete Admin Control
 * 
 * INQUIRY WORKFLOW (Fully Controlled):
 * 1. Pending → Admin reviews and changes status via dropdown (requires confirmation)
 * 2. Approved → Automatically forwarded to vendor
 * 3. Active/Inactive → Admin controls visibility to vendors (requires confirmation)
 * 4. Rejected → No further actions possible (requires rejection reason)
 * 
 * VENDOR MANAGEMENT (All Actions Require Confirmation):
 * - Verify/Unverify: Adds premium badge (paid plan indicator) - does NOT affect visibility
 * - Activate/Deactivate: Controls vendor profile visibility to public users
 * - Delete: Permanent removal (requires typing "DELETE")
 * 
 * USER MANAGEMENT (All Actions Require Confirmation):
 * - Block/Unblock: Controls user access to platform
 * 
 * KEY PRINCIPLES:
 * ✅ Every critical action requires explicit admin confirmation
 * ✅ No automatic forwarding or state changes
 * ✅ Clear messaging about consequences of each action
 * ✅ Professional notifications with context
 * ✅ Real-time data sync with backend
 * ✅ Production-grade error handling
 * 
 * Features: Toggle Active, Dynamic Approval Status, Real-time Sync
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Users, Mail, TrendingUp, Calendar, CheckCircle, XCircle,
  UserCheck, UserX, Filter, Search, Eye, Edit, Trash2,
  Plus, RefreshCw, MapPin, Phone, Award,
  AlertCircle, BarChart3, PieChart, Shield, EyeOff,
  Clock, Ban, X, Check, Building2, FileText, Upload, Image, Star, Download,
  CreditCard, IndianRupee, TrendingDown, Package
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import { formatServiceType } from '../utils/format';
import {
  fetchAdminStats,
  fetchRecentActivity,
  fetchAllUsers,
  updateUserStatus,
  fetchAllVendorsAdmin,
  fetchVendorById,
  fetchVendorByIdAdmin,
  toggleVendorVerification,
  toggleVendorStatus,
  deleteVendorPermanent,
  fetchAllInquiriesAdmin,
  approveInquiry,
  rejectInquiry,
  resetInquiryToPending,
  fetchInquiryApprovalStats,
  toggleInquiryActive,
  fetchAllReviewsAdmin,
  fetchReviewStats,
  fetchPendingReviews,
  approveReviewAdmin,
  rejectReviewAdmin,
  deleteReviewAdmin,
  fetchAllMediaAdmin,
  fetchMediaStats,
  fetchPendingMedia,
  approveMediaAdmin,
  rejectMediaAdmin,
  deleteMediaAdmin,
  fetchAllBlogsAdmin as fetchAllVendorBlogsAdmin,
  fetchBlogStats,
  fetchPendingBlogs,
  approveBlogAdmin,
  rejectBlogAdmin,
  deleteBlogAdmin,
  exportVendorsToExcel,
  exportUsersToExcel,
  exportInquiriesToExcel,
  exportPaymentsToExcel,
  fetchAllPaymentsAdmin
} from '../services/api';
import {
  fetchAllBlogsAdmin,
  createBlog,
  updateBlog,
  deleteBlog,
  toggleBlogPublish,
  getBlogStats,
  uploadBlogImage
} from '../services/blogService';

const AdminPanel = () => {
  const navigate = useNavigate();
  const { user, isAdmin, logout, loading: authLoading } = useAuth();

  // State Management
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState(null);
  
  // Data States
  // Payments state
  const [payments, setPayments] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [paymentFilter, setPaymentFilter] = useState({ planKey: 'all', status: 'all' });
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentPage, setPaymentPage] = useState(1);
  const [expandedPaymentId, setExpandedPaymentId] = useState(null);
  const paymentItemsPerPage = 10;
  const [reviewPage, setReviewPage] = useState(1);
  const [expandedReviewId, setExpandedReviewId] = useState(null);
  const [mediaPage, setMediaPage] = useState(1);
  const [selectedMediaDetail, setSelectedMediaDetail] = useState(null);
  const [selectedVendorBlogDetail, setSelectedVendorBlogDetail] = useState(null);
  const mediaGroupsPerPage = 10;
  const [vendors, setVendors] = useState([]);
  const [pendingVendorToOpen, setPendingVendorToOpen] = useState(null);
  const [users, setUsers] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [blogStats, setBlogStats] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState(null);
  const [reviewFilter, setReviewFilter] = useState('all'); // all, pending, approved, rejected
  const [media, setMedia] = useState([]);
  const [mediaStats, setMediaStats] = useState(null);
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [expandedRow, setExpandedRow] = useState(null);
  const [mediaFilter, setMediaFilter] = useState('all'); // all, pending, approved, rejected
  const [selectedMediaIds, setSelectedMediaIds] = useState(new Set());
  const [vendorBlogs, setVendorBlogs] = useState([]);
  const [vendorBlogStats, setVendorBlogStats] = useState(null);
  const [vendorBlogFilter, setVendorBlogFilter] = useState('all'); // all, pending, approved, rejected
  const [blogSubTab, setBlogSubTab] = useState('admin'); // 'admin' | 'vendor'
  const [expandedVendors, setExpandedVendors] = useState(new Set());
  
  // UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [inquirySubTab, setInquirySubTab] = useState('vendor'); // 'vendor' | 'contact'
  const [inquiryFilter, setInquiryFilter] = useState('all'); // all, vendor, contact
  const [approvalFilter, setApprovalFilter] = useState('all'); // all, pending, approved, rejected
  const [inquiryDateFilter, setInquiryDateFilter] = useState('');
  const [inquiryDateType, setInquiryDateType] = useState('service'); // service, submitted
  const [blogStatusFilter, setBlogStatusFilter] = useState('all'); // all, published, draft
  const [notification, setNotification] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showBlogModal, setShowBlogModal] = useState(false);
  const [editingBlog, setEditingBlog] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Dialog States
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    type: 'warning',
    requireInput: false,
    confirmText: 'Confirm',
    cancelText: 'Cancel'
  });

  // Reset pagination when filters or tab changes
  useEffect(() => {
    setCurrentPage(1);
    setExpandedRow(null);
  }, [activeTab, searchTerm, filterStatus, inquirySubTab, inquiryFilter, approvalFilter, inquiryDateFilter, inquiryDateType, blogStatusFilter, mediaFilter, vendorBlogFilter]);

  // Payments tab pagination/expansion reset on search and filter change
  useEffect(() => {
    setPaymentPage(1);
    setExpandedPaymentId(null);
  }, [activeTab, searchTerm, paymentFilter.planKey, paymentFilter.status]);

  useEffect(() => {
    setReviewPage(1);
    setExpandedReviewId(null);
  }, [activeTab, searchTerm, reviewFilter]);

  useEffect(() => {
    setMediaPage(1);
    setSelectedMediaDetail(null);
    setSelectedMediaIds(new Set());
  }, [activeTab, searchTerm, mediaFilter]);

  // Notification Helper
  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Verify admin access
  // Verify admin access
  useEffect(() => {
    
    // Check localStorage token
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('authUser');
    
    if (!user || !isAdmin()) {
      console.error('❌ Access denied - not an admin');
      showNotification('error', 'Access denied. Admin privileges required.');
      setTimeout(() => {
        logout();
        navigate('/');
      }, 2000);
      return;
    }
    
  }, [user]); // Only depend on user, not isAdmin function

  // Load Data on Mount
  useEffect(() => {
    // Wait for auth to finish loading before making API calls
    if (authLoading) {
      return;
    }
    
    // Only load data if user is admin
    if (user && isAdmin()) {
      loadDashboardData();
    }
  }, [user, authLoading]); // Removed auto-refresh interval

  useEffect(() => {
    // Wait for auth to finish loading before making API calls
    if (authLoading) return;
    
    if (user && isAdmin()) {
      setCurrentPage(1); // Reset to page 1 when switching tabs
      setExpandedRow(null); // Close any expanded rows
      if (activeTab === 'vendors') loadVendors();
      else if (activeTab === 'users') loadUsers();
      else if (activeTab === 'inquiries') loadInquiries();
      else if (activeTab === 'blogs') { loadBlogs(); loadVendorBlogs(); }
      else if (activeTab === 'reviews') loadReviews();
      else if (activeTab === 'media') loadMedia();
      else if (activeTab === 'payments') loadPayments();
    }
  }, [activeTab, authLoading]); // Removed user and isAdmin from dependencies

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
    setExpandedRow(null);
  }, [searchTerm, filterStatus, inquirySubTab, inquiryFilter, approvalFilter, inquiryDateFilter, inquiryDateType, blogStatusFilter, mediaFilter, vendorBlogFilter]);

  // Data Loading Functions
  const loadDashboardData = async (showSuccessNotification = false) => {
    setLoading(true);
    try {
      const [statsData, activityData] = await Promise.all([
        fetchAdminStats(),
        fetchRecentActivity(10)
      ]);
      
      // Data is already extracted from response.data in API service
      setStats(statsData || {});
      setRecentActivity(activityData || {});
      
      if (showSuccessNotification) {
        showNotification('success', 'Dashboard data loaded successfully');
      }
    } catch (error) {
      console.error('❌ Error loading dashboard:', error);
      showNotification('error', 'Failed to load dashboard data: ' + error.message);
      // Set empty defaults to prevent UI crashes
      setStats({});
      setRecentActivity({});
    } finally {
      setLoading(false);
    }
  };

  const loadVendors = async (showSuccessNotification = false) => {
    setLoading(true);
    try {
      const response = await fetchAllVendorsAdmin({ page: 1, limit: 100 });
      
      // Response is already extracted: { vendors: [], total, page, totalPages }
      const vendorsList = response?.vendors || [];
      
      setVendors(vendorsList);

      // If admin requested a vendor to be opened from another tab (e.g., inquiries), expand it after load
      if (pendingVendorToOpen) {
        // Small delay to ensure UI updated
        const idToOpen = pendingVendorToOpen;
        setTimeout(() => {
          setActiveTab('vendors');
          setExpandedRow(idToOpen);
          // Scroll into view if row exists
          try {
            const el = document.querySelector(`[data-vendor-id="${idToOpen}"]`);
            if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } catch (e) {
            // ignore
          }
          setPendingVendorToOpen(null);
        }, 250);
      }
      
      if (showSuccessNotification) {
        if (vendorsList.length === 0) {
          showNotification('info', 'No vendors found in database');
        } else {
          showNotification('success', `Loaded ${vendorsList.length} vendors successfully`);
        }
      }
    } catch (error) {
      console.error('❌ Error loading vendors:', error);
      showNotification('error', 'Failed to load vendors: ' + error.message);
      setVendors([]); // Set empty array to prevent UI crashes
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async (showSuccessNotification = false) => {
    setLoading(true);
    try {
      const data = await fetchAllUsers({ page: 1, limit: 100 });
      
      // Data is already extracted: { users: [], total, page, totalPages }
      const usersList = data?.users || [];
      setUsers(usersList);
      
      if (showSuccessNotification) {
        showNotification('success', `Loaded ${usersList.length} users successfully`);
      }
    } catch (error) {
      console.error('❌ Error loading users:', error);
      showNotification('error', 'Failed to load users: ' + error.message);
      setUsers([]); // Set empty array to prevent UI crashes
    } finally {
      setLoading(false);
    }
  };

  const loadInquiries = async (showSuccessNotification = false) => {
    setLoading(true);
    try {
      const data = await fetchAllInquiriesAdmin({ page: 1, limit: 200 });
      
      // Data is already extracted: { inquiries: [...], total, page, totalPages }
      const inquiriesList = data?.inquiries || [];
      setInquiries(inquiriesList);
      
      if (showSuccessNotification) {
        showNotification('success', `Loaded ${inquiriesList.length} inquiries successfully`);
      }
    } catch (error) {
      console.error('❌ Error loading inquiries:', error);
      showNotification('error', 'Failed to load inquiries: ' + error.message);
      setInquiries([]); // Set empty array to prevent UI crashes
    } finally {
      setLoading(false);
    }
  };

  // Export Handler Functions
  const handleExportVendors = async () => {
    try {
      setLoading(true);
      await exportVendorsToExcel();
      showNotification('success', 'Vendors exported successfully!');
    } catch (error) {
      console.error('❌ Error exporting vendors:', error);
      showNotification('error', 'Failed to export vendors: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleExportUsers = async () => {
    try {
      setLoading(true);
      await exportUsersToExcel();
      showNotification('success', 'Users exported successfully!');
    } catch (error) {
      console.error('❌ Error exporting users:', error);
      showNotification('error', 'Failed to export users: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleExportPayments = async () => {
    try {
      setLoading(true);
      await exportPaymentsToExcel();
      showNotification('success', 'Payments exported successfully!');
    } catch (error) {
      console.error('❌ Error exporting payments:', error);
      showNotification('error', 'Failed to export payments: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleExportInquiries = async () => {
    try {
      setLoading(true);
      await exportInquiriesToExcel();
      showNotification('success', 'Inquiries exported successfully!');
    } catch (error) {
      console.error('❌ Error exporting inquiries:', error);
      showNotification('error', 'Failed to export inquiries: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const loadBlogs = async (showSuccessNotification = false) => {
    setLoading(true);
    try {
      const [blogsData, statsData] = await Promise.all([
        fetchAllBlogsAdmin({ page: 1, limit: 100 }),
        getBlogStats()
      ]);
      
      // Backend returns { success: true, data: [...blogs], pagination: {...} }
      // apiClient returns response.data, so blogsData.data is the blogs array
      const blogsList = blogsData?.data || [];
      setBlogs(blogsList);
      
      
      // Extract stats from response
      const stats = statsData?.data || statsData || {};
      setBlogStats(stats);
      
      if (showSuccessNotification) {
        if (blogsList.length === 0) {
          showNotification('info', 'No blogs found. Create your first blog post!');
        } else {
          showNotification('success', `Loaded ${blogsList.length} blogs successfully`);
        }
      }
    } catch (error) {
      console.error('❌ Error loading blogs:', error);
      showNotification('error', 'Failed to load blogs: ' + error.message);
      setBlogs([]); // Set empty array to prevent UI crashes
      setBlogStats({}); // Set empty object to prevent UI crashes
    } finally {
      setLoading(false);
    }
  };

  // Load Reviews
  const loadReviews = async (showSuccessNotification = false) => {
    setLoading(true);
    try {
      
      // Fetch reviews and stats in parallel
      const [reviewsData, statsData] = await Promise.all([
        fetchAllReviewsAdmin({ 
          status: reviewFilter,
          page: 1, 
          limit: 100 
        }),
        fetchReviewStats()
      ]);
      
      
      const reviewsList = reviewsData?.data?.reviews || [];
      setReviews(reviewsList);
      
      const stats = statsData?.data || {};
      setReviewStats(stats);
      
      
      if (showSuccessNotification) {
        if (reviewsList.length === 0) {
          showNotification('info', 'No reviews found');
        } else {
          showNotification('success', `Loaded ${reviewsList.length} reviews successfully`);
        }
      }
    } catch (error) {
      console.error('❌ Error loading reviews:', error);
      showNotification('error', 'Failed to load reviews: ' + error.message);
      setReviews([]);
      setReviewStats({});
    } finally {
      setLoading(false);
    }
  };

  // Approve Review
  const handleApproveReview = async (reviewId) => {
    try {
      await approveReviewAdmin(reviewId);
      showNotification('success', 'Review approved successfully');
      loadReviews();
    } catch (error) {
      console.error('Error approving review:', error);
      showNotification('error', 'Failed to approve review: ' + error.message);
    }
  };

  // Reject Review
  const handleRejectReview = async (reviewId, reason) => {
    try {
      await rejectReviewAdmin(reviewId, reason);
      showNotification('success', 'Review rejected successfully');
      loadReviews();
    } catch (error) {
      console.error('Error rejecting review:', error);
      showNotification('error', 'Failed to reject review: ' + error.message);
    }
  };

  // Delete Review
  const handleDeleteReview = async (reviewId) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Review',
      message: 'Are you sure you want to permanently delete this review? This action cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
        try {
          await deleteReviewAdmin(reviewId);
          showNotification('success', 'Review deleted successfully');
          loadReviews();
        } catch (error) {
          console.error('Error deleting review:', error);
          showNotification('error', 'Failed to delete review: ' + error.message);
        }
      }
    });
  };

  // ========== MEDIA MANAGEMENT ==========

  // Load Media
  const loadMedia = async (showSuccessNotification = false) => {
    try {
      setLoading(true);

      // Fetch media and stats in parallel
      const [mediaData, statsData] = await Promise.all([
        fetchAllMediaAdmin({ 
          approvalStatus: mediaFilter === 'all' ? undefined : mediaFilter,
          page: 1, 
          limit: 80 
        }),
        fetchMediaStats()
      ]);
      
      
      const mediaList = mediaData?.data?.media || [];
      setMedia(mediaList);
      
      const stats = statsData?.data || {};
      setMediaStats(stats);
      
      
      if (showSuccessNotification) {
        if (mediaList.length === 0) {
          showNotification('info', 'No media found');
        } else {
          showNotification('success', `Loaded ${mediaList.length} media items successfully`);
        }
      }
    } catch (error) {
      console.error('❌ Error loading media:', error);
      showNotification('error', 'Failed to load media: ' + error.message);
      setMedia([]);
      setMediaStats({});
    } finally {
      setLoading(false);
    }
  };

  // Approve Media
  const handleApproveMedia = async (mediaId, currentStatus) => {
    const action = currentStatus === 'rejected' ? 're-approve' : 'approve';
    
    setConfirmDialog({
      isOpen: true,
      title: `${action === 're-approve' ? 'Re-approve' : 'Approve'} Media`,
      message: `Are you sure you want to ${action} this media? It will be visible on the vendor's public profile.`,
      type: 'info',
      onConfirm: async () => {
        try {
          await approveMediaAdmin(mediaId);
          showNotification('success', `Media ${action}d successfully`);
          loadMedia();
        } catch (error) {
          console.error('Error approving media:', error);
          showNotification('error', 'Failed to approve media: ' + error.message);
        }
      }
    });
  };

  // Reject Media
  const handleRejectMedia = async (mediaId, currentStatus, defaultReason = 'Content policy violation') => {
    const action = currentStatus === 'approved' ? 'reject' : 'reject';
    
    setConfirmDialog({
      isOpen: true,
      title: `${currentStatus === 'approved' ? 'Reject Approved Media' : 'Reject Media'}`,
      message: `Are you sure you want to reject this media? ${currentStatus === 'approved' ? 'It will be removed from the vendor\'s public profile.' : 'It will not be shown on the vendor\'s profile.'}`,
      type: 'danger',
      requireInput: true,
      inputPlaceholder: 'Enter rejection reason (optional)...',
      inputDefaultValue: defaultReason,
      onConfirm: async (reason) => {
        try {
          await rejectMediaAdmin(mediaId, reason || defaultReason);
          showNotification('success', 'Media rejected successfully');
          loadMedia();
        } catch (error) {
          console.error('Error rejecting media:', error);
          showNotification('error', 'Failed to reject media: ' + error.message);
        }
      }
    });
  };

  // Delete Media
  const handleDeleteMedia = async (mediaId) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Media',
      message: 'Are you sure you want to permanently delete this media? This action cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
        try {
          await deleteMediaAdmin(mediaId);
          showNotification('success', 'Media deleted successfully');
          loadMedia();
        } catch (error) {
          console.error('Error deleting media:', error);
          showNotification('error', 'Failed to delete media: ' + error.message);
        }
      }
    });
  };

  const toggleMediaSelection = (mediaId) => {
    setSelectedMediaIds(prev => {
      const next = new Set(prev);
      if (next.has(mediaId)) next.delete(mediaId);
      else next.add(mediaId);
      return next;
    });
  };

  const selectMultipleMedia = (mediaIds = [], shouldSelect = true) => {
    setSelectedMediaIds(prev => {
      const next = new Set(prev);
      mediaIds.forEach((id) => {
        if (shouldSelect) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  };

  const handleBulkApproveMedia = (mediaItems = []) => {
    if (!mediaItems.length) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Approve Selected Media',
      message: `Approve ${mediaItems.length} selected media item${mediaItems.length > 1 ? 's' : ''}? They will be visible on vendor public profiles.`,
      type: 'info',
      onConfirm: async () => {
        const results = await Promise.allSettled(
          mediaItems.map((item) => approveMediaAdmin(item._id))
        );

        const successCount = results.filter((result) => result.status === 'fulfilled').length;
        const failedCount = results.length - successCount;

        if (successCount > 0) {
          showNotification('success', `${successCount} media item${successCount > 1 ? 's' : ''} approved successfully`);
          setSelectedMediaIds(new Set());
          loadMedia();
        }

        if (failedCount > 0) {
          showNotification('error', `${failedCount} media item${failedCount > 1 ? 's' : ''} failed to approve`);
        }
      }
    });
  };

  const handleBulkRejectMedia = (mediaItems = [], defaultReason = 'Content policy violation') => {
    if (!mediaItems.length) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Reject Selected Media',
      message: `Reject ${mediaItems.length} selected media item${mediaItems.length > 1 ? 's' : ''}? They will not be visible on vendor public profiles.`,
      type: 'danger',
      requireInput: true,
      inputPlaceholder: 'Enter rejection reason (optional)...',
      inputDefaultValue: defaultReason,
      onConfirm: async (reason) => {
        const rejectReason = reason || defaultReason;
        const results = await Promise.allSettled(
          mediaItems.map((item) => rejectMediaAdmin(item._id, rejectReason))
        );

        const successCount = results.filter((result) => result.status === 'fulfilled').length;
        const failedCount = results.length - successCount;

        if (successCount > 0) {
          showNotification('success', `${successCount} media item${successCount > 1 ? 's' : ''} rejected successfully`);
          setSelectedMediaIds(new Set());
          loadMedia();
        }

        if (failedCount > 0) {
          showNotification('error', `${failedCount} media item${failedCount > 1 ? 's' : ''} failed to reject`);
        }
      }
    });
  };

  // ========== VENDOR BLOG MANAGEMENT ==========

  // Load Vendor Blogs
  const loadVendorBlogs = async (showSuccessNotification = false) => {
    try {
      setLoading(true);

      // Fetch blogs and stats in parallel
      const [blogsData, statsData] = await Promise.all([
        fetchAllVendorBlogsAdmin({ 
          approvalStatus: vendorBlogFilter === 'all' ? undefined : vendorBlogFilter,
          page: 1, 
          limit: 100 
        }),
        fetchBlogStats()
      ]);
      
      
      const blogList = blogsData?.data?.blogs || [];
      setVendorBlogs(blogList);
      
      const stats = statsData?.data || {};
      setVendorBlogStats(stats);
      
      
      if (showSuccessNotification) {
        if (blogList.length === 0) {
          showNotification('info', 'No vendor blogs found');
        } else {
          showNotification('success', `Loaded ${blogList.length} vendor blogs successfully`);
        }
      }
    } catch (error) {
      console.error('❌ Error loading vendor blogs:', error);
      showNotification('error', 'Failed to load vendor blogs: ' + error.message);
      setVendorBlogs([]);
      setVendorBlogStats({});
    } finally {
      setLoading(false);
    }
  };

  // Load All Payments
  const loadPayments = async (showSuccessNotification = false) => {
    setPaymentsLoading(true);
    try {
      const response = await fetchAllPaymentsAdmin({
        planKey: paymentFilter.planKey,
        status: paymentFilter.status,
        limit: 300
      });
      const data = response?.data || response;
      setPayments(data?.payments || []);
      setPaymentSummary(data?.summary || null);
      if (showSuccessNotification) showNotification('success', `Loaded ${(data?.payments || []).length} payments`);
    } catch (error) {
      console.error('❌ Error loading payments:', error);
      showNotification('error', 'Failed to load payments');
      setPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  };

  // Approve Vendor Blog
  const handleApproveVendorBlog = async (blogId) => {
    try {
      await approveBlogAdmin(blogId);
      showNotification('success', 'Blog approved successfully');
      loadVendorBlogs();
    } catch (error) {
      console.error('Error approving blog:', error);
      showNotification('error', 'Failed to approve blog: ' + error.message);
    }
  };

  // Reject Vendor Blog
  const handleRejectVendorBlog = async (blogId, reason) => {
    try {
      await rejectBlogAdmin(blogId, reason);
      showNotification('success', 'Blog rejected successfully');
      loadVendorBlogs();
    } catch (error) {
      console.error('Error rejecting blog:', error);
      showNotification('error', 'Failed to reject blog: ' + error.message);
    }
  };

  // Delete Vendor Blog
  const handleDeleteVendorBlog = async (blogId) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Blog',
      message: 'Are you sure you want to permanently delete this blog? This action cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
        try {
          await deleteBlogAdmin(blogId);
          showNotification('success', 'Blog deleted successfully');
          loadVendorBlogs();
        } catch (error) {
          console.error('Error deleting blog:', error);
          showNotification('error', 'Failed to delete blog: ' + error.message);
        }
      }
    });
  };

  // Refresh Current View
  const handleRefresh = () => {
    if (activeTab === 'overview') loadDashboardData(true);
    else if (activeTab === 'vendors') loadVendors(true);
    else if (activeTab === 'users') loadUsers(true);
    else if (activeTab === 'inquiries') loadInquiries(true);
    else if (activeTab === 'blogs') { loadBlogs(true); loadVendorBlogs(true); }
    else if (activeTab === 'reviews') loadReviews(true);
    else if (activeTab === 'media') loadMedia(true);
    else if (activeTab === 'payments') loadPayments(true);
  };

  // ========== INQUIRY ACTIONS ==========
  
  const handleApproveInquiry = (inquiry) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Approve Inquiry',
      message: `Approve inquiry from ${inquiry.userName}? Vendor will see this.`,
      type: 'success',
      requireInput: false,
      onConfirm: async () => {
        try {
          await approveInquiry(inquiry._id);
          showNotification('success', 'Inquiry approved!');
          loadDashboardData();
          loadInquiries();
        } catch (error) {
          showNotification('error', 'Failed to approve inquiry');
        }
      }
    });
  };

  const handleRejectInquiry = (inquiry) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Reject Inquiry',
      message: `Reject inquiry from ${inquiry.userName}? Provide reason:`,
      type: 'danger',
      requireInput: true,
      inputPlaceholder: 'Enter rejection reason...',
      onConfirm: async (reason) => {
        try {
          await rejectInquiry(inquiry._id, reason);
          showNotification('success', 'Inquiry rejected');
          loadDashboardData();
          loadInquiries();
        } catch (error) {
          showNotification('error', 'Failed to reject inquiry');
        }
      }
    });
  };

  // Dynamic Approval Status Change - With Confirmation
  const handleApprovalStatusChange = async (inquiry, newStatus) => {
    if (newStatus === inquiry.approvalStatus) return;
    
    // Show confirmation dialog before changing status
    setConfirmDialog({
      isOpen: true,
      title: `Change Status to ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
      message: `Are you sure you want to ${newStatus} this inquiry from ${inquiry.userName}?`,
      type: newStatus === 'approved' ? 'success' : newStatus === 'rejected' ? 'danger' : 'warning',
      requireInput: newStatus === 'rejected',
      inputPlaceholder: newStatus === 'rejected' ? 'Enter rejection reason (required)...' : '',
      onConfirm: async (inputValue) => {
        try {
          if (newStatus === 'approved') {
            await approveInquiry(inquiry._id);
            showNotification('success', '✅ Inquiry approved and sent to vendor successfully!');
          } else if (newStatus === 'pending') {
            await resetInquiryToPending(inquiry._id);
            showNotification('success', '⏳ Inquiry moved back to pending review');
          } else if (newStatus === 'rejected') {
            if (!inputValue || inputValue.trim().length === 0) {
              showNotification('error', 'Rejection reason is required');
              return;
            }
            await rejectInquiry(inquiry._id, inputValue);
            showNotification('success', '❌ Inquiry rejected');
          }
          loadDashboardData();
          loadInquiries();
        } catch (error) {
          showNotification('error', `Failed to ${newStatus} inquiry: ${error.message}`);
        }
      }
    });
  };

  const handleToggleInquiryActive = (inquiry) => {
    const willDeactivate = inquiry.isActive !== false;
    setConfirmDialog({
      isOpen: true,
      title: willDeactivate ? '🔒 Deactivate Inquiry' : '✅ Activate Inquiry',
      message: `Are you sure you want to ${willDeactivate ? 'deactivate' : 'activate'} this inquiry from ${inquiry.userName}? ${willDeactivate ? 'Vendors will not be able to see this inquiry.' : 'This inquiry will become visible to vendors again.'}`,
      type: 'warning',
      requireInput: false,
      onConfirm: async () => {
        try {
          await toggleInquiryActive(inquiry._id, !willDeactivate);
          showNotification('success', `✅ Inquiry ${!willDeactivate ? 'activated' : 'deactivated'} successfully`);
          loadInquiries();
        } catch (error) {
          showNotification('error', `Failed to update inquiry status: ${error.message}`);
        }
      }
    });
  };

  // ========== VENDOR ACTIONS ==========
  
  const handleToggleVendorVerification = (vendor) => {
    const willVerify = !vendor.verified;
    setConfirmDialog({
      isOpen: true,
      title: willVerify ? '✅ Verify Vendor' : '❌ Remove Verification',
      message: `Are you sure you want to ${willVerify ? 'verify' : 'remove verification from'} ${vendor.businessName || vendor.name}?\n\n${willVerify ? '✓ This vendor will receive a verified badge (Premium/Paid Plan indicator).' : '✗ This vendor will lose the verified badge.'}\n\nNote: Verification is a premium badge and does not affect profile visibility. Use Activate/Deactivate to control visibility.`,
      type: willVerify ? 'success' : 'warning',
      requireInput: false,
      onConfirm: async () => {
        try {
          await toggleVendorVerification(vendor._id, willVerify);
          showNotification('success', `✅ Vendor ${willVerify ? 'verified' : 'unverified'} successfully`);
          loadVendors();
        } catch (error) {
          showNotification('error', `Failed to update vendor: ${error.message}`);
        }
      }
    });
  };

  const handleToggleVendorStatus = (vendor) => {
    const willActivate = !vendor.isActive;
    setConfirmDialog({
      isOpen: true,
      title: willActivate ? '✅ Activate Vendor' : '🔒 Deactivate Vendor',
      message: `Are you sure you want to ${willActivate ? 'activate' : 'deactivate'} ${vendor.businessName || vendor.name}?\n\n${willActivate ? '✓ This vendor profile will become VISIBLE to users in search results and direct links.' : '✗ This vendor profile will be HIDDEN from users - not visible in search or via direct link.'}\n\nImportant: Activation status controls public visibility, not verification badge.`,
      type: 'warning',
      requireInput: false,
      onConfirm: async () => {
        try {
          await toggleVendorStatus(vendor._id, willActivate);
          showNotification('success', `✅ Vendor ${willActivate ? 'activated' : 'deactivated'} successfully`);
          loadVendors();
        } catch (error) {
          showNotification('error', `Failed to update vendor: ${error.message}`);
        }
      }
    });
  };

  const handleDeleteVendor = (vendor) => {
    setConfirmDialog({
      isOpen: true,
      title: '⚠️ Delete Vendor Permanently',
      message: `Are you ABSOLUTELY SURE you want to permanently delete ${vendor.businessName || vendor.name}? This action CANNOT be undone and will remove all vendor data including inquiries and bookings!`,
      type: 'danger',
      requireInput: true,
      inputPlaceholder: `Type "DELETE" to confirm permanent deletion...`,
      onConfirm: async (confirmText) => {
        if (confirmText?.toUpperCase() !== 'DELETE') {
          showNotification('error', 'You must type DELETE to confirm');
          return;
        }
        try {
          await deleteVendorPermanent(vendor._id);
          showNotification('success', '✅ Vendor deleted permanently');
          loadVendors();
          loadDashboardData();
        } catch (error) {
          showNotification('error', `Failed to delete vendor: ${error.message}`);
        }
      }
    });
  };

  // ========== USER ACTIONS ==========
  
  const handleToggleUserStatus = (user) => {
    const willBlock = user.isActive;
    setConfirmDialog({
      isOpen: true,
      title: willBlock ? '🔒 Block User' : '✅ Unblock User',
      message: `Are you sure you want to ${willBlock ? 'block' : 'unblock'} ${user.name || user.email}? ${willBlock ? 'This user will not be able to login or access the platform.' : 'This user will regain access to the platform.'}`,
      type: 'warning',
      requireInput: willBlock,
      inputPlaceholder: willBlock ? 'Optional: Reason for blocking...' : '',
      onConfirm: async (reason) => {
        try {
          await updateUserStatus(user._id, !user.isActive);
          showNotification('success', `✅ User ${willBlock ? 'blocked' : 'unblocked'} successfully`);
          loadUsers();
        } catch (error) {
          showNotification('error', `Failed to update user: ${error.message}`);
        }
      }
    });
  };

  // ========== BLOG ACTIONS ==========

  const handleCreateBlog = () => {
    setEditingBlog(null);
    setShowBlogModal(true);
  };

  const handleEditBlog = (blog) => {
    setEditingBlog(blog);
    setShowBlogModal(true);
  };

  const handleSaveBlog = async (blogData) => {
    try {
      if (editingBlog) {
        await updateBlog(editingBlog._id, blogData);
        showNotification('success', 'Blog updated successfully');
      } else {
        await createBlog(blogData);
        showNotification('success', 'Blog created successfully');
      }
      setShowBlogModal(false);
      setEditingBlog(null);
      loadBlogs();
    } catch (error) {
      showNotification('error', `Failed to save blog: ${error.message}`);
    }
  };

  const handleDeleteBlog = (blog) => {
    setConfirmDialog({
      isOpen: true,
      title: '⚠️ Delete Admin Blog',
      message: `This will permanently delete "${blog.title}". Type DELETE to confirm this action.`,
      type: 'danger',
      requireInput: true,
      inputPlaceholder: 'Type DELETE',
      confirmText: 'Delete Blog',
      cancelText: 'Keep Blog',
      onConfirm: async (confirmationText) => {
        if (String(confirmationText || '').trim().toUpperCase() !== 'DELETE') {
          showNotification('error', 'Please type DELETE exactly to confirm.');
          throw new Error('Delete confirmation text mismatch');
        }

        try {
          await deleteBlog(blog._id);
          showNotification('success', 'Blog deleted successfully');
          loadBlogs();
        } catch (error) {
          showNotification('error', `Failed to delete blog: ${error.message}`);
        }
      }
    });
  };

  const handleToggleBlogStatus = async (blog) => {
    try {
      await toggleBlogPublish(blog._id);
      showNotification('success', `Blog ${blog.status === 'published' ? 'unpublished' : 'published'} successfully`);
      loadBlogs();
    } catch (error) {
      showNotification('error', `Failed to update blog status: ${error.message}`);
    }
  };

  const handleImageUpload = async (file) => {
    try {
      setUploadingImage(true);
      const result = await uploadBlogImage(file);
      // result is {url, publicId}
      return result;
    } catch (error) {
      showNotification('error', 'Failed to upload image');
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  // Render Functions
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Welcome Banner with Gradient */}
      <div className="bg-gradient-to-r from-[#8a611f] to-[#c9932f] rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-10 rounded-full -ml-24 -mb-24"></div>
          <div className="relative z-10">
          <h2 className="text-3xl font-bold font-display mb-2">Welcome back, Admin! 👋</h2>
          <p className="text-blue-100 text-lg">Here's what's happening with your platform today</p>
        </div>
      </div>

      {/* Stats Cards with Gradients and Animations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-[#1f3c5d] to-[#24496f] rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300 cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Vendors</p>
              <p className="text-4xl font-bold mt-2">{stats?.overview?.totalVendors || 0}</p>
              <p className="text-blue-200 text-xs mt-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Active businesses
              </p>
            </div>
            <div className="bg-blue-50 p-3 rounded-xl">
              <Building2 className="w-10 h-10 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-[#1f3c5d] to-[#24496f] rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300 cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Users</p>
              <p className="text-4xl font-bold mt-2">{stats?.overview?.totalUsers || 0}</p>
              <p className="text-blue-200 text-xs mt-2 flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-blue-100" />
                Registered accounts
              </p>
            </div>
            <div className="bg-blue-50 p-3 rounded-xl">
              <Users className="w-10 h-10 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-[#1f3c5d] to-[#24496f] rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300 cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Inquiries</p>
              <p className="text-4xl font-bold mt-2">{stats?.overview?.totalInquiries || 0}</p>
              <p className="text-blue-200 text-xs mt-2 flex items-center gap-1">
                <Mail className="w-3 h-3 text-blue-100" />
                Customer requests
              </p>
            </div>
            <div className="bg-blue-50 p-3 rounded-xl">
              <Mail className="w-10 h-10 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-[#1f3c5d] to-[#24496f] rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300 cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Pending Approval</p>
              <p className="text-4xl font-bold mt-2">{stats?.overview?.pendingApproval || 0}</p>
              <p className="text-blue-200 text-xs mt-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-blue-100" />
                Need attention
              </p>
            </div>
            <div className="bg-blue-50 p-3 rounded-xl">
              <Clock className="w-10 h-10 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-[#1f3c5d]">
          <div className="flex items-center gap-4">
            <div className="bg-[#e8eef5] p-3 rounded-xl">
              <CheckCircle className="w-8 h-8 text-[#1f3c5d]" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Verified Vendors</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.overview?.verifiedVendors || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-[#1f3c5d]">
          <div className="flex items-center gap-4">
            <div className="bg-blue-50 p-3 rounded-xl">
              <Award className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <p className="text-gray-600 text-sm">Active Vendors</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.overview?.activeVendors || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-[#1f3c5d]">
          <div className="flex items-center gap-4">
            <div className="bg-blue-50 p-3 rounded-xl">
              <BarChart3 className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <p className="text-gray-600 text-sm">Approval Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.overview?.totalInquiries > 0 
                  ? Math.round(((stats?.overview?.totalInquiries - stats?.overview?.pendingApproval) / stats?.overview?.totalInquiries) * 100) 
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold font-display text-gray-900">Quick Actions & Overview</h3>
          </div>
          <button className="px-4 py-2 bg-[#1f3c5d] hover:bg-[#24496f] text-white rounded-lg font-medium transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Action
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 hover:shadow-md transition-all cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">View All Inquiries</p>
                <p className="text-sm text-gray-600">{stats?.overview?.totalInquiries || 0} total</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 hover:shadow-md transition-all cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Manage Vendors</p>
                <p className="text-sm text-gray-600">{stats?.overview?.totalVendors || 0} registered</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 hover:shadow-md transition-all cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">View All Users</p>
                <p className="text-sm text-gray-600">{stats?.overview?.totalUsers || 0} accounts</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Inquiries Tab
  const renderInquiries = () => {
    const toLocalDateInputString = (value) => {
      if (!value) return '';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      const tzOffset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() - tzOffset).toISOString().split('T')[0];
    };

    const getVendorOutcome = (inquiry) => {
      if (inquiry.inquiryType !== 'vendor_inquiry' || inquiry.approvalStatus !== 'approved') return 'not-sent';
      if (inquiry.isActive === false) return 'inactive';
      if (inquiry.vendorDecision === 'accepted') return 'accepted';
      if (inquiry.vendorDecision === 'declined') return 'declined';
      if (inquiry.status === 'responded' || inquiry.vendorResponse) {
        const responseText = String(inquiry.vendorResponse || '').toLowerCase();
        const declineHints = ['unable to accommodate', 'decline', 'declined', 'cannot accommodate', 'not available'];
        if (declineHints.some((hint) => responseText.includes(hint))) return 'declined';
        return 'accepted';
      }
      return 'awaiting';
    };

    const isVendorSubTab = inquirySubTab === 'vendor';

    const filteredInquiries = inquiries.filter(inquiry => {
      const matchesType = isVendorSubTab
        ? inquiry.inquiryType === 'vendor_inquiry'
        : inquiry.inquiryType === 'contact_inquiry';
      
      const matchesApproval = !isVendorSubTab || approvalFilter === 'all' || inquiry.approvalStatus === approvalFilter;
      
      const matchesSearch = searchTerm === '' || 
        inquiry.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inquiry.userContact?.includes(searchTerm) ||
        inquiry.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inquiry.eventType?.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesDate = true;
      if (inquiryDateFilter) {
        if (!isVendorSubTab || inquiryDateType === 'submitted') {
          matchesDate = toLocalDateInputString(inquiry.createdAt) === inquiryDateFilter;
        } else if (inquiry.eventDate && typeof inquiry.eventDate === 'object' && inquiry.eventDate.start) {
          matchesDate = toLocalDateInputString(inquiry.eventDate.start) === inquiryDateFilter;
        } else {
          matchesDate = toLocalDateInputString(inquiry.eventDate) === inquiryDateFilter;
        }
      }
      
      return matchesType && matchesApproval && matchesSearch && matchesDate;
    });

    // Pagination
    const totalPages = Math.ceil(filteredInquiries.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedInquiries = filteredInquiries.slice(startIndex, endIndex);

    const toggleRow = (id) => {
      setExpandedRow(expandedRow === id ? null : id);
    };

    return (
      <div className="space-y-6">
        {/* Sub-Tab Switcher */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="flex">
            <button
              onClick={() => { setInquirySubTab('vendor'); setInquiryDateType('service'); setCurrentPage(1); setExpandedRow(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-4 font-semibold text-sm border-b-2 transition-colors ${
                inquirySubTab === 'vendor'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Vendor Inquiries
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${inquirySubTab === 'vendor' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                {inquiries.filter((inq) => inq.inquiryType === 'vendor_inquiry').length}
              </span>
            </button>
            <button
              onClick={() => { setInquirySubTab('contact'); setInquiryDateType('submitted'); setCurrentPage(1); setExpandedRow(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-4 font-semibold text-sm border-b-2 transition-colors ${
                inquirySubTab === 'contact'
                  ? 'border-pink-600 bg-pink-50 text-pink-700'
                  : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              <Mail className="w-4 h-4" />
              Contact Inquiries
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${inquirySubTab === 'contact' ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                {inquiries.filter((inq) => inq.inquiryType === 'contact_inquiry').length}
              </span>
            </button>
          </div>
        </div>

        {/* Header with Stats */}
        <div className="bg-gradient-to-r from-[#1f3c5d] to-[#24496f] rounded-2xl shadow-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">{inquirySubTab === 'vendor' ? '📧 Vendor Inquiry Management' : '📞 Contact Inquiry Management'}</h2>
              <p className="text-white text-opacity-90">
                {inquirySubTab === 'vendor'
                  ? 'Manage and process vendor lead inquiries'
                  : 'Review and handle contact form submissions'}
              </p>
            </div>
            <div className="flex gap-4 items-center">
              <button
                onClick={handleExportInquiries}
                disabled={loading || inquiries.length === 0}
                className="bg-white text-blue-600 px-4 py-2 rounded-xl font-semibold hover:bg-opacity-90 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export all inquiries to Excel"
              >
                <Download className="w-5 h-5" />
                Export to Excel
              </button>
              <div className="bg-blue-600 bg-opacity-40 px-6 py-3 rounded-xl text-center">
                <p className="text-3xl font-bold text-white">{filteredInquiries.length}</p>
                <p className="text-sm text-blue-100">{inquirySubTab === 'vendor' ? 'Vendor Leads' : 'Contact Forms'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters with Modern Design */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-50 via-violet-50 to-pink-50 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-gray-900">Filters</h3>
            </div>
            {inquiryDateFilter && (
              <button
                onClick={() => setInquiryDateFilter('')}
                className="text-xs font-semibold text-red-500 hover:text-red-600"
              >
                Clear Date
              </button>
            )}
          </div>

          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-4">
                <label className="text-xs font-bold text-gray-600 mb-1.5 block">Search Inquiry</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by name, contact, email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-12 pl-10 pr-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-bold text-gray-600 mb-1.5 block">Date Type</label>
                <select
                  value={inquiryDateType}
                  onChange={(e) => setInquiryDateType(e.target.value)}
                  className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium bg-white"
                >
                  {inquirySubTab === 'vendor' ? (
                    <>
                      <option value="service">Service Schedule</option>
                      <option value="submitted">Submitted Date</option>
                    </>
                  ) : (
                    <option value="submitted">Submitted Date</option>
                  )}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-bold text-gray-600 mb-1.5 block">Search by Date</label>
                <input
                  type="date"
                  value={inquiryDateFilter}
                  onChange={(e) => setInquiryDateFilter(e.target.value)}
                  className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium bg-white"
                />
              </div>

              {inquirySubTab === 'vendor' ? (
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-gray-600 mb-1.5 block">Approval Status</label>
                  <select
                    value={approvalFilter}
                    onChange={(e) => setApprovalFilter(e.target.value)}
                    className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium bg-white"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              ) : (
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-gray-600 mb-1.5 block">Category</label>
                  <div className="h-12 px-4 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-500 flex items-center text-sm font-medium">
                    From contact form submissions
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Compact Table View */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {filteredInquiries.length > 0 ? (
            <>
              {/* Table Header */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-3 border-b border-gray-200 hidden md:grid md:grid-cols-12 gap-4 font-semibold text-gray-700 text-sm">
                <div className="col-span-1">#</div>
                <div className="col-span-2">Name</div>
                <div className="col-span-1">Contact</div>
                <div className="col-span-2">{inquirySubTab === 'vendor' ? 'Service Type' : 'Subject'}</div>
                <div className="col-span-2">{inquirySubTab === 'vendor' ? 'Service Date' : 'Submitted On'}</div>
                <div className="col-span-1">{inquirySubTab === 'vendor' ? 'Type' : 'Category'}</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1">Actions</div>
              </div>

              {/* Table Body */}
              {paginatedInquiries.map((inquiry, index) => (
                <div key={inquiry._id} className="border-b border-gray-100 last:border-none">
                  {/* Compact Row */}
                  <div 
                    className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 cursor-pointer items-center"
                    onClick={() => toggleRow(inquiry._id)}
                  >
                    <div className="col-span-1 font-bold text-gray-900">{startIndex + index + 1}</div>
                    <div className="col-span-2">
                      <p className="font-semibold text-gray-900 truncate">{inquiry.userName}</p>
                      <p className="text-xs text-gray-500 truncate">{inquiry.userEmail}</p>
                    </div>
                    <div className="col-span-1 text-sm text-gray-600 truncate">{inquiry.userContact}</div>
                    <div className="col-span-2 text-sm text-gray-600 truncate capitalize">
                      {inquiry.eventType}
                    </div>
                    <div className="col-span-2 text-xs text-gray-600">
                      {inquiry.inquiryType === 'contact_inquiry' ? (
                        <span className="font-medium text-gray-700">{new Date(inquiry.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      ) : inquiry.eventDate ? (
                        (() => {
                          // Check if it's an object with start/end
                          if (typeof inquiry.eventDate === 'object' && inquiry.eventDate.start) {
                            const startDate = new Date(inquiry.eventDate.start);
                            const endDate = inquiry.eventDate.end ? new Date(inquiry.eventDate.end) : null;
                            const isSameDay = endDate && startDate.toDateString() === endDate.toDateString();
                            
                            if (isSameDay) {
                              // Same day - treat as single event
                              return (
                                <div className="flex flex-col">
                                  <span className="font-semibold text-indigo-700">📅 Single</span>
                                  <span className="truncate">{startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                </div>
                              );
                            } else {
                              // Different days - multi-day event
                              return (
                                <div className="flex flex-col">
                                  <span className="font-semibold text-purple-700">📅 Multi-day</span>
                                  <span className="truncate">
                                    {startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - {endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                  </span>
                                </div>
                              );
                            }
                          } else {
                            // Simple date string - single day event
                            return (
                              <div className="flex flex-col">
                                <span className="font-semibold text-indigo-700">📅 Single</span>
                                <span className="truncate">{new Date(inquiry.eventDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                              </div>
                            );
                          }
                        })()
                      ) : (
                        <span className="text-gray-400 italic">Not set</span>
                      )}
                    </div>
                    <div className="col-span-1">
                      {inquiry.inquiryType === 'vendor_inquiry' ? (
                        <span className="px-2 py-1 text-xs rounded-lg font-semibold bg-blue-100 text-blue-700">🏢 V</span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded-lg font-semibold bg-purple-100 text-purple-700 capitalize">
                          {(inquiry.category || 'general').replace('-', ' ')}
                        </span>
                      )}
                    </div>
                    <div className="col-span-2">
                      {inquiry.inquiryType === 'vendor_inquiry' ? (
                        <>
                          <select
                            value={inquiry.approvalStatus || 'pending'}
                            onChange={(e) => { e.stopPropagation(); handleApprovalStatusChange(inquiry, e.target.value); }}
                            onClick={(e) => e.stopPropagation()}
                            className={`px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                              inquiry.approvalStatus === 'approved' ? 'bg-green-100 text-green-700' :
                              inquiry.approvalStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            <option value="pending">⏳ Pending</option>
                            <option value="approved">✓ Approved</option>
                            <option value="rejected">✗ Rejected</option>
                          </select>
                          <div className="mt-1">
                            {(() => {
                              const outcome = getVendorOutcome(inquiry);
                              if (outcome === 'accepted') {
                                return <span className="inline-flex px-2 py-0.5 rounded-lg text-[10px] font-bold bg-green-100 text-green-700">Vendor: Accepted</span>;
                              }
                              if (outcome === 'declined') {
                                return <span className="inline-flex px-2 py-0.5 rounded-lg text-[10px] font-bold bg-red-100 text-red-700">Vendor: Declined</span>;
                              }
                              if (outcome === 'inactive') {
                                return <span className="inline-flex px-2 py-0.5 rounded-lg text-[10px] font-bold bg-gray-100 text-gray-700">Vendor: Inactive</span>;
                              }
                              if (outcome === 'awaiting') {
                                return <span className="inline-flex px-2 py-0.5 rounded-lg text-[10px] font-bold bg-yellow-100 text-yellow-700">Vendor: Awaiting Response</span>;
                              }
                              return <span className="inline-flex px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600">Vendor: Not Sent</span>;
                            })()}
                          </div>
                        </>
                      ) : (
                        <span className="inline-flex px-2 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600">
                          Contact Form
                        </span>
                      )}
                    </div>
                    <div className="col-span-1">
                      <button 
                        className="text-indigo-600 hover:text-indigo-800" 
                        onClick={(e) => { e.stopPropagation(); toggleRow(inquiry._id); }}
                        title="View Details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedRow === inquiry._id && (
                    <div className="bg-gray-50 px-6 py-6 border-t border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Email</p>
                          <p className="text-sm font-medium text-gray-900">{inquiry.userEmail}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Phone</p>
                          <p className="text-sm font-medium text-gray-900">{inquiry.userContact}</p>
                        </div>
                        {inquiry.inquiryType === 'vendor_inquiry' && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Budget</p>
                          <p className="text-sm font-medium text-gray-900">₹{inquiry.budget}</p>
                        </div>
                        )}
                        {inquiry.inquiryType === 'vendor_inquiry' && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Service Date</p>
                          <p className="text-sm font-medium text-gray-900">
                            {inquiry.eventDate ? (
                              typeof inquiry.eventDate === 'object' && inquiry.eventDate.start ? (
                                // Multi-day event object
                                (() => {
                                  const startDate = new Date(inquiry.eventDate.start);
                                  const endDate = inquiry.eventDate.end ? new Date(inquiry.eventDate.end) : null;
                                  const isSameDay = endDate && startDate.toDateString() === endDate.toDateString();
                                  
                                  return (
                                    <>
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3 text-purple-600" />
                                        {startDate.toLocaleDateString()}
                                        {endDate && !isSameDay && (
                                          <>
                                            {' → '}
                                            {endDate.toLocaleDateString()}
                                          </>
                                        )}
                                      </span>
                                      {!isSameDay && (
                                        <span className="text-xs text-purple-600 font-semibold">Multi-day Service</span>
                                      )}
                                    </>
                                  );
                                })()
                              ) : (
                                // Single day event (date string)
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-indigo-600" />
                                  {new Date(inquiry.eventDate).toLocaleDateString()}
                                </span>
                              )
                            ) : 'Not specified'}
                          </p>
                        </div>
                        )}
                        {inquiry.inquiryType === 'vendor_inquiry' && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">City</p>
                          <p className="text-sm font-medium text-gray-900">{inquiry.city || 'N/A'}</p>
                        </div>
                        )}
                        {inquiry.inquiryType === 'contact_inquiry' && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Category</p>
                            <p className="text-sm font-medium text-gray-900 capitalize">{(inquiry.category || 'general').replace('-', ' ')}</p>
                          </div>
                        )}
                        {inquiry.inquiryType === 'contact_inquiry' && (
                          <div className="md:col-span-3">
                            <p className="text-xs text-gray-500 mb-1">Subject</p>
                            <p className="text-sm font-medium text-gray-900 break-words">{inquiry.eventType || 'N/A'}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Created On</p>
                          <p className="text-sm font-medium text-gray-900">{new Date(inquiry.createdAt).toLocaleString()}</p>
                        </div>
                        {inquiry.inquiryType === 'vendor_inquiry' && (
                        <div className="md:col-span-3">
                          <p className="text-xs text-gray-500 mb-1">Vendor</p>
                          <p className="text-sm font-medium text-gray-900">
                            {inquiry.vendorId ? (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    // If admin, show admin vendor details modal (professional admin flow)
                                    if (isAdmin && typeof isAdmin === 'function' && isAdmin()) {
                                      // Redirect admin to Vendors tab and auto-expand the selected vendor
                                      const vendorId = inquiry.vendorId._id || inquiry.vendorId;
                                      if (!vendorId) {
                                        showNotification('info', 'No vendor details available');
                                        return;
                                      }
                                      setSearchTerm(inquiry.vendorId?.businessName || inquiry.vendorId?.name || '');
                                      setActiveTab('vendors');
                                      setCurrentPage(1);
                                      // set pending id to expand after vendors load
                                      setPendingVendorToOpen(vendorId);
                                      return;
                                    }

                                    // Non-admin users: navigate to public vendor profile
                                    const extractId = (v) => {
                                      if (!v) return null;
                                      if (typeof v === 'string') return v;
                                      if (v._id) {
                                        if (typeof v._id === 'string') return v._id;
                                        if (v._id.$oid) return v._id.$oid;
                                        if (v._id.toString) return v._id.toString();
                                      }
                                      if (v.id) return v.id;
                                      if (v.toString && typeof v.toString === 'function') return v.toString();
                                      return null;
                                    };

                                    const vendorId = extractId(inquiry.vendorId);
                                    if (!vendorId) {
                                      showNotification('info', 'No vendor details available');
                                      return;
                                    }
                                    navigate(`/vendor/${vendorId}`);
                                  } catch (err) {
                                    console.error('Vendor action failed:', err);
                                    showNotification('error', 'Failed to open vendor profile');
                                  }
                                }}
                                className="text-left text-indigo-600 underline hover:text-indigo-800"
                              >
                                {inquiry.vendorId?.businessName || inquiry.vendorId?.name || String(inquiry.vendorId)}
                              </button>
                            ) : 'General'}
                          </p>
                        </div>
                        )}
                      </div>

                      {inquiry.message && (
                        <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
                          <p className="text-xs text-gray-500 mb-1">Message</p>
                          <p className="text-sm text-gray-700">{inquiry.message}</p>
                        </div>
                      )}

                      {inquiry.approvalStatus === 'rejected' && inquiry.rejectionReason && (
                        <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                          <p className="text-xs font-bold text-red-900 mb-1 flex items-center gap-1">
                            <XCircle className="w-4 h-4" />
                            Rejection Reason:
                          </p>
                          <p className="text-sm text-red-700">{inquiry.rejectionReason}</p>
                        </div>
                      )}

                      {inquiry.inquiryType === 'vendor_inquiry' && inquiry.approvalStatus === 'approved' && (
                        <div className={`mb-6 p-4 rounded-lg border-2 ${
                          getVendorOutcome(inquiry) === 'accepted'
                            ? 'bg-green-50 border-green-200'
                            : getVendorOutcome(inquiry) === 'declined'
                              ? 'bg-red-50 border-red-200'
                              : getVendorOutcome(inquiry) === 'inactive'
                                ? 'bg-gray-50 border-gray-200'
                                : 'bg-yellow-50 border-yellow-200'
                        }`}>
                          <p className="text-xs font-bold text-gray-800 mb-1">Vendor Status</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {getVendorOutcome(inquiry) === 'accepted' && 'Accepted by vendor'}
                            {getVendorOutcome(inquiry) === 'declined' && 'Declined by vendor'}
                            {getVendorOutcome(inquiry) === 'inactive' && 'Inactive (hidden from vendor)'}
                            {getVendorOutcome(inquiry) === 'awaiting' && 'Awaiting vendor response'}
                          </p>
                          {inquiry.vendorResponse && (
                            <p className="text-sm text-gray-700 mt-2">{inquiry.vendorResponse}</p>
                          )}
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-3">
                        {inquiry.approvalStatus === 'approved' && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleToggleInquiryActive(inquiry); }}
                              className={`px-4 py-2 ${inquiry.isActive !== false ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'} text-white rounded-lg font-semibold transition-all flex items-center gap-2 text-sm`}
                            >
                              {inquiry.isActive !== false ? <><EyeOff className="w-4 h-4" />Make Inactive</> : <><Eye className="w-4 h-4" />Make Active</>}
                            </button>
                          </>
                        )}
                        {inquiry.approvalStatus === 'pending' && (
                          <div className="px-4 py-2 bg-yellow-50 border-2 border-yellow-400 rounded-lg text-sm text-yellow-800 flex items-center gap-2 font-semibold">
                            <Clock className="w-4 h-4" />
                            Awaiting Admin Review
                          </div>
                        )}
                        {inquiry.approvalStatus === 'rejected' && (
                          <div className="px-4 py-2 bg-red-50 border-2 border-red-400 rounded-lg text-sm text-red-800 flex items-center gap-2 font-bold">
                            <XCircle className="w-4 h-4" />
                            Rejected - No Further Action
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Pagination */}
              {filteredInquiries.length > 0 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredInquiries.length)} of {filteredInquiries.length} inquiries
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`px-4 py-2 rounded-lg ${
                          currentPage === i + 1
                            ? 'bg-purple-600 text-white'
                            : 'bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20">
              <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No inquiries found</p>
              <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Vendors Tab
  const renderVendors = () => {
    const filteredVendors = vendors.filter(vendor => {
      const matchesSearch = searchTerm === '' || 
        vendor.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.contact?.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'active' && vendor.isActive) ||
        (filterStatus === 'inactive' && !vendor.isActive) ||
        (filterStatus === 'pending' && !vendor.isActive) || // Pending approval
        (filterStatus === 'verified' && vendor.verified);
      
      return matchesSearch && matchesStatus;
    });

    // Pagination
    const totalPages = Math.ceil(filteredVendors.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedVendors = filteredVendors.slice(startIndex, endIndex);

    const toggleRow = (id) => {
      setExpandedRow(expandedRow === id ? null : id);
    };

    return (
      <div className="space-y-6">
        {/* Header with Stats */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">🏢 Vendor Management</h2>
              <p className="text-white text-opacity-90">Manage verified vendors and service providers</p>
            </div>
            <div className="flex gap-4 items-center">
              <button
                onClick={handleExportVendors}
                disabled={loading || vendors.length === 0}
                className="bg-white text-blue-600 px-4 py-2 rounded-xl font-semibold hover:bg-opacity-90 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export all vendors to Excel"
              >
                <Download className="w-5 h-5" />
                Export to Excel
              </button>
              <div className="bg-blue-600 bg-opacity-40 px-6 py-3 rounded-xl text-center">
                <p className="text-3xl font-bold text-white">{filteredVendors.length}</p>
                <p className="text-sm text-blue-100">Vendors</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-900">Search & Filter</h3>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name, email, business..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium bg-white"
            >
              <option value="all">🔄 All Status</option>
              <option value="pending">⏳ Pending Approval</option>
              <option value="active">✅ Active</option>
              <option value="inactive">🔒 Inactive</option>
              <option value="verified">✓ Verified</option>
            </select>
          </div>
        </div>

        {/* Compact Table View */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {filteredVendors.length > 0 ? (
            <>
              {/* Table Header */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-3 border-b border-gray-200 hidden md:grid md:grid-cols-12 gap-4 font-semibold text-gray-700 text-sm">
                <div className="col-span-1">#</div>
                <div className="col-span-3">Business Name</div>
                <div className="col-span-2">Service Type</div>
                <div className="col-span-2">City</div>
                <div className="col-span-1">Rating</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1">Actions</div>
              </div>

              {/* Table Body */}
              {paginatedVendors.map((vendor, index) => (
                <div key={vendor._id} data-vendor-id={vendor._id} className="border-b border-gray-100 last:border-none">
                  {/* Compact Row */}
                  <div 
                    className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 cursor-pointer items-center"
                    onClick={() => toggleRow(vendor._id)}
                  >
                    <div className="col-span-1 font-bold text-gray-900">{startIndex + index + 1}</div>
                    <div className="col-span-3">
                      <p className="font-semibold text-gray-900 truncate">{vendor.businessName || vendor.name}</p>
                      <p className="text-xs text-gray-500 truncate">{vendor.contact?.email}</p>
                    </div>
                    <div className="col-span-2 text-sm text-gray-600 truncate">{formatServiceType(vendor.serviceType) || 'N/A'}</div>
                    <div className="col-span-2 text-sm text-gray-600 truncate">{vendor.city || 'N/A'}</div>
                    <div className="col-span-1 text-sm font-medium">{vendor.rating ? `${vendor.rating} ⭐` : '-'}</div>
                    <div className="col-span-2 flex gap-2 flex-wrap">
                      {!vendor.isActive && <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-lg font-semibold">⏳ Pending</span>}
                      {vendor.verified && <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-lg font-semibold">✓ Verified</span>}
                      <span className={`px-2 py-1 text-xs rounded-lg font-semibold ${vendor.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {vendor.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {(vendor.media?.filter(m => m.type !== 'video').length || vendor.mediaCount || 0) > 0 && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-lg font-semibold">
                          📷 {vendor.media?.filter(m => m.type !== 'video').length || vendor.mediaCount || 0}
                        </span>
                      )}
                      {(vendor.media?.filter(m => m.type === 'video').length || vendor.videoCount || 0) > 0 && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-lg font-semibold">
                          🎬 {vendor.media?.filter(m => m.type === 'video').length || vendor.videoCount || 0}
                        </span>
                      )}
                    </div>
                    <div className="col-span-1">
                      <button 
                        className="text-indigo-600 hover:text-indigo-800" 
                        onClick={(e) => { e.stopPropagation(); toggleRow(vendor._id); }}
                        title="View Details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedRow === vendor._id && (
                    <div className="bg-gray-50 px-6 py-6 border-t border-gray-200">
                      {/* Contact Info */}
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Contact Information</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                          <p className="text-xs text-gray-400 font-semibold mb-1">Email</p>
                          <p className="text-sm font-medium text-gray-900 break-all">{vendor.contact?.email || '—'}</p>
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                          <p className="text-xs text-gray-400 font-semibold mb-1">Phone</p>
                          <p className="text-sm font-medium text-gray-900">{vendor.contact?.phone || '—'}</p>
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                          <p className="text-xs text-gray-400 font-semibold mb-1">WhatsApp</p>
                          <p className="text-sm font-medium text-gray-900">{vendor.contact?.whatsapp || '—'}</p>
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                          <p className="text-xs text-gray-400 font-semibold mb-1">Location</p>
                          <p className="text-sm font-medium text-gray-900">{[vendor.area, vendor.city].filter(Boolean).join(', ') || '—'}</p>
                        </div>
                      </div>

                      {/* Business Info */}
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Business Details</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                          <p className="text-xs text-gray-400 font-semibold mb-1">Service Type</p>
                          <p className="text-sm font-medium text-gray-900">{formatServiceType(vendor.serviceType) || '—'}</p>
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                          <p className="text-xs text-gray-400 font-semibold mb-1">Registered On</p>
                          <p className="text-sm font-medium text-gray-900">{vendor.createdAt ? new Date(vendor.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—'}</p>
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                          <p className="text-xs text-gray-400 font-semibold mb-1">Rating</p>
                          <p className="text-sm font-medium text-gray-900">{vendor.rating ? `${vendor.rating} ⭐` : '—'} <span className="text-gray-400">({vendor.reviewCount || 0} reviews)</span></p>
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm md:col-span-2">
                          <p className="text-xs text-gray-400 font-semibold mb-1">Price Range</p>
                          <p className="text-sm font-medium text-gray-900">
                            {vendor.pricing?.min || vendor.pricing?.max
                              ? `₹${Number(vendor.pricing?.min || 0).toLocaleString('en-IN')} - ₹${Number(vendor.pricing?.max || 0).toLocaleString('en-IN')}`
                              : '—'}
                          </p>
                        </div>
                      </div>

                      {/* Social Links */}
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Social Links</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                          <p className="text-xs text-gray-400 font-semibold mb-1">Website</p>
                          {vendor.contact?.website ? (
                            <a href={vendor.contact.website} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-indigo-600 hover:underline break-all">
                              {vendor.contact.website}
                            </a>
                          ) : (
                            <p className="text-sm font-medium text-gray-900">—</p>
                          )}
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                          <p className="text-xs text-gray-400 font-semibold mb-1">Instagram</p>
                          {vendor.contact?.socialMedia?.instagram ? (
                            <p className="text-sm font-medium text-gray-900 break-all">{vendor.contact.socialMedia.instagram}</p>
                          ) : (
                            <p className="text-sm font-medium text-gray-900">—</p>
                          )}
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                          <p className="text-xs text-gray-400 font-semibold mb-1">Facebook</p>
                          {vendor.contact?.socialMedia?.facebook ? (
                            <p className="text-sm font-medium text-gray-900 break-all">{vendor.contact.socialMedia.facebook}</p>
                          ) : (
                            <p className="text-sm font-medium text-gray-900">—</p>
                          )}
                        </div>
                      </div>

                      {/* Business Description */}
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Business Description</p>
                      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm mb-5">
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{vendor.description || '—'}</p>
                      </div>

                      {/* Subscription & Plan */}
                      <div className="bg-white rounded-xl border border-indigo-100 shadow-sm mb-5 overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-2.5 border-b border-indigo-100 flex items-center gap-2">
                          <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                          <p className="text-xs font-bold text-indigo-700 uppercase tracking-widest">Subscription & Plan</p>
                        </div>
                        <div className="p-4 grid grid-cols-2 md:grid-cols-5 gap-4">
                          <div>
                            <p className="text-xs text-gray-400 font-semibold mb-1.5">Current Plan</p>
                            <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold capitalize ${
                              vendor.subscription?.planKey === 'premium' ? 'bg-amber-100 text-amber-800' :
                              vendor.subscription?.planKey === 'growth' ? 'bg-purple-100 text-purple-700' :
                              vendor.subscription?.planKey === 'starter' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>{vendor.subscription?.planName || 'Free'}</span>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 font-semibold mb-1.5">Plan Status</p>
                            {(() => {
                              const s = vendor.subscription?.status;
                              return <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${s === 'active' ? 'bg-green-100 text-green-700' : s === 'expired' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>{s === 'active' ? '✓ Active' : s === 'expired' ? '✗ Expired' : s || 'Free'}</span>;
                            })()}
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 font-semibold mb-1.5">Plan Start</p>
                            <p className="text-sm font-medium text-gray-900">{vendor.subscription?.startDate ? new Date(vendor.subscription.startDate).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 font-semibold mb-1.5">Expires On</p>
                            {(() => {
                              if (!vendor.subscription?.expiryDate) return <p className="text-sm font-medium text-gray-500">—</p>;
                              const days = Math.ceil((new Date(vendor.subscription.expiryDate) - new Date()) / 86400000);
                              return <p className={`text-sm font-bold ${days <= 0 ? 'text-red-600' : days <= 7 ? 'text-orange-500' : 'text-gray-900'}`}>{new Date(vendor.subscription.expiryDate).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</p>;
                            })()}
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 font-semibold mb-1.5">Days Remaining</p>
                            {(() => {
                              if (!vendor.subscription?.expiryDate || vendor.subscription?.status !== 'active') return <p className="text-sm text-gray-400">—</p>;
                              const days = Math.ceil((new Date(vendor.subscription.expiryDate) - new Date()) / 86400000);
                              return <p className={`text-sm font-black ${days <= 0 ? 'text-red-600' : days <= 7 ? 'text-orange-500' : 'text-green-600'}`}>{days <= 0 ? 'Expired' : `${days}d left`}</p>;
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* Last Payment */}
                      {vendor.subscription?.lastPaymentId && (
                        <div className="bg-white rounded-xl border border-green-100 shadow-sm mb-5 overflow-hidden">
                          <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-2.5 border-b border-green-100 flex items-center gap-2">
                            <IndianRupee className="w-3.5 h-3.5 text-green-600" />
                            <p className="text-xs font-bold text-green-700 uppercase tracking-widest">Last Payment</p>
                          </div>
                          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs text-gray-400 font-semibold mb-1">Transaction ID</p>
                              <p className="text-xs font-mono text-gray-700 break-all">{vendor.subscription.lastPaymentId}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 font-semibold mb-1">Amount Paid</p>
                              <p className="text-lg font-black text-green-700">₹{(vendor.subscription.lastPaymentAmount || 0).toLocaleString('en-IN')}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 font-semibold mb-1">Payment Date</p>
                              <p className="text-sm font-medium text-gray-900">{vendor.subscription.lastPaymentDate ? new Date(vendor.subscription.lastPaymentDate).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 font-semibold mb-1">First-Time Bonus</p>
                              <p className="text-sm font-medium">{vendor.subscription.firstPaidBonusUsed ? <span className="text-green-600 font-bold">✓ Used (+30 days)</span> : <span className="text-gray-400">Not used</span>}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Media Content Summary */}
                      {(vendor.mediaCount > 0 || vendor.media?.length > 0 || vendor.videoCount > 0) && (
                        <div className="mb-5">
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Media Content</p>
                          <div className="flex flex-wrap gap-3">
                            <button
                              onClick={(e) => { e.stopPropagation(); setSearchTerm(vendor.businessName || vendor.name || ''); setActiveTab('media'); }}
                              className="flex items-center gap-3 px-5 py-3 bg-blue-50 border-2 border-blue-200 rounded-xl hover:bg-blue-100 hover:border-blue-400 transition-all group"
                            >
                              <span className="text-3xl font-black text-blue-700">
                                {vendor.media?.filter(m => m.type !== 'video').length || vendor.mediaCount || 0}
                              </span>
                              <div className="text-left">
                                <p className="text-xs font-bold text-blue-900">Portfolio Images</p>
                                <p className="text-xs text-blue-500 group-hover:underline">View in Media tab →</p>
                              </div>
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setSearchTerm(vendor.businessName || vendor.name || ''); setActiveTab('media'); }}
                              className="flex items-center gap-3 px-5 py-3 bg-purple-50 border-2 border-purple-200 rounded-xl hover:bg-purple-100 hover:border-purple-400 transition-all group"
                            >
                              <span className="text-3xl font-black text-purple-700">
                                {vendor.media?.filter(m => m.type === 'video').length || vendor.videoCount || 0}
                              </span>
                              <div className="text-left">
                                <p className="text-xs font-bold text-purple-900">Video Content</p>
                                <p className="text-xs text-purple-500 group-hover:underline">View in Media tab →</p>
                              </div>
                            </button>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleVendorVerification(vendor); }}
                          className={`px-4 py-2 ${vendor.verified ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-lg font-semibold transition-all flex items-center gap-2 text-sm`}
                        >
                          <Shield className="w-4 h-4" />
                          {vendor.verified ? 'Remove Verification' : 'Verify'}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleVendorStatus(vendor); }}
                          className={`px-4 py-2 ${vendor.isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white rounded-lg font-semibold transition-all flex items-center gap-2 text-sm`}
                        >
                          {vendor.isActive ? <><Ban className="w-4 h-4" />Deactivate</> : <><CheckCircle className="w-4 h-4" />Activate</>}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteVendor(vendor); }}
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-lg font-semibold transition-all flex items-center gap-2 text-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Pagination */}
              {filteredVendors.length > 0 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredVendors.length)} of {filteredVendors.length} vendors
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`px-4 py-2 rounded-lg ${
                          currentPage === i + 1
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20">
              <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No vendors found</p>
              <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Users Tab
  const renderUsers = () => {
    const filteredUsers = users.filter(user => {
      const matchesSearch = searchTerm === '' || 
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'active' && user.isActive) ||
        (filterStatus === 'blocked' && !user.isActive);
      
      return matchesSearch && matchesStatus;
    });

    // Pagination
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    const toggleRow = (id) => {
      setExpandedRow(expandedRow === id ? null : id);
    };

    return (
      <div className="space-y-6">
        {/* Header with Stats */}
        <div className="panel-hero rounded-2xl shadow-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">👥 User Management</h2>
              <p className="text-white text-opacity-90">Monitor and manage platform users</p>
            </div>
            <div className="flex gap-4 items-center">
              <button
                onClick={handleExportUsers}
                disabled={loading || users.length === 0}
                className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export all users to Excel"
              >
                <Download className="w-5 h-5" />
                Export to Excel
              </button>
              <div className="bg-blue-600 bg-opacity-40 px-6 py-3 rounded-xl text-center">
                <p className="text-3xl font-bold text-white">{filteredUsers.length}</p>
                <p className="text-sm text-blue-100">Users</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-900">Search & Filter</h3>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium bg-white"
            >
              <option value="all">🔄 All Status</option>
              <option value="active">✅ Active</option>
              <option value="blocked">🔒 Blocked</option>
            </select>
          </div>
        </div>

        {/* Compact Table View */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {filteredUsers.length > 0 ? (
            <>
              {/* Table Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-3 border-b border-gray-200 hidden md:grid md:grid-cols-12 gap-4 font-semibold text-gray-700 text-sm">
                <div className="col-span-1">#</div>
                <div className="col-span-3">Name</div>
                <div className="col-span-3">Email</div>
                <div className="col-span-2">Joined</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1">Actions</div>
              </div>

              {/* Table Body */}
              {paginatedUsers.map((user, index) => (
                <div key={user._id} className="border-b border-gray-100 last:border-none">
                  {/* Compact Row */}
                  <div 
                    className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 cursor-pointer items-center"
                    onClick={() => toggleRow(user._id)}
                  >
                    <div className="col-span-1 font-bold text-gray-900">{startIndex + index + 1}</div>
                    <div className="col-span-3">
                      <p className="font-semibold text-gray-900 truncate">{user.name || 'No Name'}</p>
                      <p className="text-xs text-gray-500 truncate">{user.role === 'admin' ? '👑 Admin' : '👤 User'}</p>
                    </div>
                    <div className="col-span-3 text-sm text-gray-600 truncate">{user.email}</div>
                    <div className="col-span-2 text-sm text-gray-600">{new Date(user.createdAt).toLocaleDateString()}</div>
                    <div className="col-span-2">
                      <span className={`px-2 py-1 text-xs rounded-lg font-semibold ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {user.isActive ? 'Active' : 'Blocked'}
                      </span>
                    </div>
                    <div className="col-span-1">
                      <button 
                        className="text-indigo-600 hover:text-indigo-800" 
                        onClick={(e) => { e.stopPropagation(); toggleRow(user._id); }}
                        title="View Details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedRow === user._id && (
                    <div className="bg-gray-50 px-6 py-6 border-t border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Email</p>
                          <p className="text-sm font-medium text-gray-900">{user.email}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Phone</p>
                          <p className="text-sm font-medium text-gray-900">{user.phone || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Last Login</p>
                          <p className="text-sm font-medium text-gray-900">{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Joined</p>
                          <p className="text-sm font-medium text-gray-900">{new Date(user.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Total Inquiries</p>
                          <p className="text-sm font-medium text-gray-900">{user.inquiriesCount || 0}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Role</p>
                          <p className="text-sm font-medium text-gray-900">{user.role === 'admin' ? '👑 Admin' : '👤 User'}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleUserStatus(user); }}
                          className={`px-4 py-2 ${user.isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white rounded-lg font-semibold transition-all flex items-center gap-2 text-sm`}
                        >
                          {user.isActive ? <><Ban className="w-4 h-4" />Block User</> : <><CheckCircle className="w-4 h-4" />Unblock User</>}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Pagination */}
              {filteredUsers.length > 0 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`px-4 py-2 rounded-lg ${
                          currentPage === i + 1
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No users found</p>
              <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderBlogs = () => {
    const filteredBlogs = blogs.filter(blog => {
      const matchesSearch = searchTerm === '' || 
        blog.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        blog.excerpt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        blog.category?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = blogStatusFilter === 'all' || 
        blog.status === blogStatusFilter;
      
      return matchesSearch && matchesStatus;
    });

    // Pagination
    const totalPages = Math.ceil(filteredBlogs.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedBlogs = filteredBlogs.slice(startIndex, endIndex);

    const toggleRow = (id) => {
      setExpandedRow(expandedRow === id ? null : id);
    };

    if (blogSubTab === 'vendor') return renderVendorBlogs();

    return (
      <div className="space-y-6">
        {/* Sub-Tab Switcher */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="flex">
            <button
              onClick={() => { setBlogSubTab('admin'); setCurrentPage(1); setExpandedRow(null); setSearchTerm(''); }}
              className="flex-1 flex items-center justify-center gap-2 py-4 font-semibold text-sm border-b-2 border-indigo-600 bg-indigo-50 text-indigo-700"
            >
              <FileText className="w-4 h-4" />
              Admin Blogs
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-600 text-white">{blogStats?.totalBlogs || 0}</span>
            </button>
            <button
              onClick={() => { setBlogSubTab('vendor'); setCurrentPage(1); setExpandedRow(null); setSearchTerm(''); }}
              className="flex-1 flex items-center justify-center gap-2 py-4 font-semibold text-sm border-b-2 border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
            >
              <Building2 className="w-4 h-4" />
              Vendor Blogs
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-200 text-gray-600">{vendorBlogStats?.totalBlogs || 0}</span>
              {(vendorBlogStats?.pendingBlogs || 0) > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-400 text-yellow-900">{vendorBlogStats.pendingBlogs} pending</span>
              )}
            </button>
          </div>
        </div>

        {/* Header with Stats */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">📝 Admin Blogs</h2>
              <p className="text-white text-opacity-90">Create and manage platform blog content</p>
            </div>
            <div className="flex gap-4">
              <div className="bg-blue-600 bg-opacity-40 px-6 py-3 rounded-xl text-center">
                <p className="text-3xl font-bold text-white">{blogStats?.totalBlogs || 0}</p>
                <p className="text-sm text-blue-100">Total</p>
              </div>
              <div className="bg-blue-600 bg-opacity-40 px-6 py-3 rounded-xl text-center">
                <p className="text-3xl font-bold text-white">{blogStats?.publishedBlogs || 0}</p>
                <p className="text-sm text-blue-100">Published</p>
              </div>
              <div className="bg-blue-600 bg-opacity-40 px-6 py-3 rounded-xl text-center">
                <p className="text-3xl font-bold text-white">{blogStats?.draftBlogs || 0}</p>
                <p className="text-sm text-blue-100">Drafts</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions and Filters */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-gray-900">Search & Filter</h3>
            </div>
            <button
              onClick={handleCreateBlog}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              Create New Blog
            </button>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search blogs by title, excerpt, or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
            <select
              value={blogStatusFilter}
              onChange={(e) => setBlogStatusFilter(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium bg-white"
            >
              <option value="all">🔄 All Status</option>
              <option value="published">✅ Published</option>
              <option value="draft">📝 Draft</option>
            </select>
          </div>
        </div>

        {/* Compact Table View */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {filteredBlogs.length > 0 ? (
            <>
              {/* Table Header */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-3 border-b border-gray-200 hidden md:grid md:grid-cols-12 gap-4 font-semibold text-gray-700 text-sm">
                <div className="col-span-1">#</div>
                <div className="col-span-4">Title</div>
                <div className="col-span-2">Category</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1">Views</div>
                <div className="col-span-2">Actions</div>
              </div>

              {/* Table Body */}
              {paginatedBlogs.map((blog, index) => (
                <div key={blog._id} className="border-b border-gray-100 last:border-none">
                  {/* Compact Row */}
                  <div 
                    className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 cursor-pointer items-center"
                    onClick={() => toggleRow(blog._id)}
                  >
                    <div className="col-span-1 font-bold text-gray-900">{startIndex + index + 1}</div>
                    <div className="col-span-4 flex items-center gap-3">
                      {blog.featuredImage?.url ? (
                        <img 
                          src={blog.featuredImage.url} 
                          alt={blog.title}
                          className="w-12 h-12 object-cover rounded-lg border-2 border-gray-200 flex-shrink-0"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f3f4f6" width="100" height="100"/%3E%3Ctext fill="%239ca3af" font-family="Arial" font-size="14" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 flex-shrink-0 bg-gray-200 rounded-lg border-2 border-gray-300 flex items-center justify-center">
                          <FileText className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{blog.title}</p>
                        <p className="text-xs text-gray-500 truncate">{blog.excerpt}</p>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold">
                        {blog.category || 'Uncategorized'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                        blog.status === 'published' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {blog.status === 'published' ? '✅ Published' : '📝 Draft'}
                      </span>
                    </div>
                    <div className="col-span-1 text-sm text-gray-600 font-medium">
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {blog.views || 0}
                      </div>
                    </div>
                    <div className="col-span-2 flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditBlog(blog); }}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit Blog"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleBlogStatus(blog); }}
                        className={`${
                          blog.status === 'published'
                            ? 'text-yellow-600 hover:text-yellow-800'
                            : 'text-green-600 hover:text-green-800'
                        }`}
                        title={blog.status === 'published' ? 'Unpublish' : 'Publish'}
                      >
                        {blog.status === 'published' ? <EyeOff className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteBlog(blog); }}
                        className="text-red-600 hover:text-red-800"
                        title="Delete Blog"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedRow === blog._id && (
                    <div className="bg-gray-50 px-6 py-6 border-t border-gray-200">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Blog Preview */}
                        <div>
                          <p className="text-xs text-gray-500 mb-2 font-semibold">Blog Preview</p>
                          {blog.featuredImage?.url && (
                            <img 
                              src={blog.featuredImage.url} 
                              alt={blog.title}
                              className="w-full max-h-64 rounded-lg object-cover bg-gray-100 border-2 border-gray-300 mb-4"
                            />
                          )}
                          <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">{blog.title}</h3>
                            <p className="text-sm text-gray-600 mb-3">{blog.excerpt}</p>
                            {blog.content && (
                              <div className="text-sm text-gray-700 line-clamp-4 prose prose-sm">
                                {blog.content.substring(0, 200)}...
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Details & Actions */}
                        <div>
                          <p className="text-xs text-gray-500 mb-3 font-semibold">Blog Information & Actions</p>
                          <div className="space-y-4">
                            {/* Blog Metadata */}
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                              <p className="text-xs text-gray-500 mb-2 font-semibold">Metadata</p>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-xs text-gray-500">Category</p>
                                  <p className="text-sm font-medium text-gray-900">{blog.category || 'Uncategorized'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Status</p>
                                  <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                                    blog.status === 'published' 
                                      ? 'bg-green-100 text-green-700' 
                                      : 'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {blog.status === 'published' ? 'Published' : 'Draft'}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Views</p>
                                  <p className="text-sm font-medium text-gray-900">{blog.views || 0}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Read Time</p>
                                  <p className="text-sm font-medium text-gray-900">{blog.readTime || 0} min</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Created</p>
                                  <p className="text-sm font-medium text-gray-900">{new Date(blog.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Published</p>
                                  <p className="text-sm font-medium text-gray-900">
                                    {blog.publishedAt ? new Date(blog.publishedAt).toLocaleDateString() : 'Not published'}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* SEO Information */}
                            {blog.metaDescription && (
                              <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <p className="text-xs text-gray-500 mb-2 font-semibold">SEO</p>
                                <div className="space-y-2">
                                  <div>
                                    <p className="text-xs text-gray-500">Meta Description</p>
                                    <p className="text-sm font-medium text-gray-900">{blog.metaDescription}</p>
                                  </div>
                                  {blog.slug && (
                                    <div>
                                      <p className="text-xs text-gray-500">Slug</p>
                                      <p className="text-sm font-medium text-gray-900">{blog.slug}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Author Information */}
                            {blog.author && (
                              <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <p className="text-xs text-gray-500 mb-2 font-semibold">Author</p>
                                <div className="flex items-center gap-3">
                                  {blog.author.avatar && (
                                    <img 
                                      src={blog.author.avatar} 
                                      alt={blog.author.name}
                                      className="w-10 h-10 rounded-full border-2 border-gray-300"
                                    />
                                  )}
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{blog.author.name || 'Admin'}</p>
                                    <p className="text-xs text-gray-500">{blog.author.email || 'admin@sureservice.com'}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-3">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEditBlog(blog); }}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all flex items-center gap-2 text-sm"
                              >
                                <Edit className="w-4 h-4" />
                                Edit Blog
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleToggleBlogStatus(blog); }}
                                className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 text-sm ${
                                  blog.status === 'published'
                                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                    : 'bg-green-600 hover:bg-green-700 text-white'
                                }`}
                              >
                                {blog.status === 'published' ? (
                                  <>
                                    <EyeOff className="w-4 h-4" />
                                    Unpublish
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4" />
                                    Publish
                                  </>
                                )}
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteBlog(blog); }}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all flex items-center gap-2 text-sm"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Pagination */}
              {filteredBlogs.length > 0 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredBlogs.length)} of {filteredBlogs.length} blogs
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`px-4 py-2 rounded-lg ${
                          currentPage === i + 1
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No blogs found</p>
              <p className="text-gray-400 text-sm mt-1">Create your first blog post to get started</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Notification Component
  const Notification = () => notification && (
    <div className={`fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 ${
      notification.type === 'success' ? 'bg-green-500' :
      notification.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
    } text-white`}>

      {notification.message}
    </div>
  );

  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  // Render Reviews Tab
  const renderReviews = () => {
    const reviewItemsPerPage = 10;
    const filteredReviews = reviews.filter(review => {
      const matchesSearch = searchTerm === '' || 
        review.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.vendorId?.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = reviewFilter === 'all' || review.status === reviewFilter;
      
      return matchesSearch && matchesStatus;
    });

    // Pagination
    const totalPages = Math.ceil(filteredReviews.length / reviewItemsPerPage);
    const startIndex = (reviewPage - 1) * reviewItemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedReviews = filteredReviews.slice(startIndex, endIndex);

    const formatReviewDate = (value) => {
      if (!value) return '—';
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return '—';
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    return (
      <div className="space-y-4">
        {/* Header with Stats */}
        <div className="panel-hero rounded-2xl shadow-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">⭐ Review Management</h2>
              <p className="text-white text-opacity-90">Approve, reject, or delete customer reviews</p>
            </div>
            <div className="flex gap-3">
              <div className="bg-blue-600 bg-opacity-40 px-4 py-2 rounded-xl text-center">
                <p className="text-2xl font-bold text-white">{reviewStats?.totalReviews || 0}</p>
                <p className="text-sm text-blue-100">Total</p>
              </div>
              <div className="bg-blue-600 bg-opacity-40 px-4 py-2 rounded-xl text-center">
                <p className="text-2xl font-bold text-white">{reviewStats?.pendingReviews || 0}</p>
                <p className="text-sm text-blue-100">Pending</p>
              </div>
              <div className="bg-blue-600 bg-opacity-40 px-4 py-2 rounded-xl text-center">
                <p className="text-2xl font-bold text-white">{reviewStats?.approvedReviews || 0}</p>
                <p className="text-sm text-blue-100">Approved</p>
              </div>
              <div className="bg-blue-600 bg-opacity-40 px-4 py-2 rounded-xl text-center">
                <p className="text-2xl font-bold text-white">{reviewStats?.rejectedReviews || 0}</p>
                <p className="text-sm text-blue-100">Rejected</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions and Filters */}
        <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-yellow-600" />
              <h3 className="font-semibold text-gray-900">Search & Filter</h3>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search reviews by comment, vendor, or user..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
            <select
              value={reviewFilter}
              onChange={(e) => {
                setReviewFilter(e.target.value);
                loadReviews();
              }}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium bg-white"
            >
              <option value="all">🔄 All Reviews</option>
              <option value="pending">⏳ Pending</option>
              <option value="approved">✅ Approved</option>
              <option value="rejected">❌ Rejected</option>
            </select>
          </div>
        </div>

        {/* Reviews Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {filteredReviews.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {paginatedReviews.map((review, index) => {
                const isExpanded = expandedReviewId === review._id;
                return (
                <div key={review._id} className="border-b border-gray-100 last:border-none">
                  <div
                    className="p-4 hover:bg-yellow-50 transition-colors cursor-pointer"
                    onClick={() => setExpandedReviewId(isExpanded ? null : review._id)}
                  >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-yellow-100 text-yellow-800 font-bold text-sm flex items-center justify-center flex-shrink-0">
                        {startIndex + index + 1}
                      </div>

                      {/* Vendor Info */}
                      <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {review.vendorId?.businessName?.charAt(0).toUpperCase() || 'V'}
                      </div>
                      
                      <div className="flex-1">
                        {/* Vendor Name */}
                        <h3 className="font-bold text-base text-gray-900 mb-1">
                          {review.vendorId?.businessName || 'Unknown Vendor'}
                        </h3>
                        
                        {/* Rating */}
                        <div className="flex items-center gap-1 mb-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating
                                  ? 'text-yellow-500 fill-yellow-500'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                          <span className="ml-2 text-sm font-semibold text-gray-700">
                            {review.rating} / 5
                          </span>
                        </div>
                        
                        {/* Review Comment */}
                        <p className="text-gray-700 mb-2 text-sm leading-relaxed line-clamp-2">
                          "{review.comment || 'No comment'}"
                        </p>
                        
                        {/* Reviewer Info */}
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {review.userId?.name || 'Anonymous'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Status and Actions */}
                      <div className="flex flex-col items-end gap-2">
                      {/* Status Badge */}
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        review.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        review.status === 'approved' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {review.status === 'pending' ? '⏳ Pending' :
                         review.status === 'approved' ? '✅ Approved' :
                         '❌ Rejected'}
                      </span>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        {review.status === 'pending' && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleApproveReview(review._id); }}
                              className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                              title="Approve Review"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDialog({
                                  isOpen: true,
                                  title: 'Reject Review',
                                  message: 'Please provide a reason for rejecting this review:',
                                  type: 'warning',
                                  requireInput: true,
                                  inputPlaceholder: 'Rejection reason...',
                                  onConfirm: async (reason) => {
                                    await handleRejectReview(review._id, reason || 'Does not meet community guidelines');
                                  }
                                });
                              }}
                              className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                              title="Reject Review"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteReview(review._id);
                          }}
                          className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                          title="Delete Review"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedReviewId(isExpanded ? null : review._id);
                        }}
                        className="text-xs font-semibold text-yellow-700 px-2.5 py-1 rounded-lg bg-yellow-100"
                      >
                        {isExpanded ? 'Hide' : 'View'}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 bg-white border border-yellow-200 rounded-xl p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-gray-500">Review ID</p>
                          <p className="font-mono text-gray-900 break-all">{review._id}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Vendor</p>
                          <p className="text-gray-900 font-medium">{review.vendorId?.businessName || 'Unknown Vendor'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Reviewer</p>
                          <p className="text-gray-900 font-medium">{review.userId?.name || review.userName || 'Anonymous'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Status</p>
                          <p className="text-gray-900 font-medium">{review.status || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Rating</p>
                          <p className="text-gray-900 font-medium">{review.rating || 0} / 5</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Created</p>
                          <p className="text-gray-900 font-medium">{formatReviewDate(review.createdAt)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Updated</p>
                          <p className="text-gray-900 font-medium">{formatReviewDate(review.updatedAt)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Verified Booking</p>
                          <p className="text-gray-900 font-medium">{review.verifiedBooking ? 'Yes' : 'No'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Images</p>
                          <p className="text-gray-900 font-medium">{review.images?.length || 0}</p>
                        </div>
                      </div>
                      {review.rejectionReason && (
                        <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                          <p className="text-xs text-red-600 mb-1">Rejection Reason</p>
                          <p className="text-sm text-red-800">{review.rejectionReason}</p>
                        </div>
                      )}
                    </div>
                  )}
                  </div>
                </div>
              )})}
            </div>
          ) : (
            <div className="text-center py-20">
              <Star className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Reviews Found</h3>
              <p className="text-gray-600">
                {reviewFilter !== 'all' 
                  ? `No ${reviewFilter} reviews found. Try changing the filter.`
                  : 'No reviews have been submitted yet.'}
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredReviews.length > 0 && (
          <div className="flex items-center justify-between gap-2 mt-4 bg-white border border-gray-200 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-600">
              Showing {filteredReviews.length === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, filteredReviews.length)} of {filteredReviews.length}
            </p>
            <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setReviewPage(p => Math.max(1, p - 1))}
              disabled={reviewPage === 1}
              className="px-4 py-2 border-2 border-gray-200 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:border-yellow-500 hover:bg-yellow-50 transition-all"
            >
              Previous
            </button>
            <div className="flex gap-2">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setReviewPage(i + 1)}
                  className={`w-10 h-10 rounded-xl font-bold transition-all ${
                    reviewPage === i + 1
                      ? 'bg-gradient-to-r from-yellow-500 to-red-500 text-white shadow-lg'
                      : 'border-2 border-gray-200 hover:border-yellow-500 hover:bg-yellow-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              onClick={() => setReviewPage(p => Math.min(totalPages, p + 1))}
              disabled={reviewPage === totalPages}
              className="px-4 py-2 border-2 border-gray-200 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:border-yellow-500 hover:bg-yellow-50 transition-all"
            >
              Next
            </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Reusable media thumbnail card for images and videos
  const MediaCard = ({
    item,
    label,
    thumbnail,
    isVideo,
    onView,
    onDownload,
    onApprove,
    onReject,
    onDelete,
    onDetails,
    isSelected = false,
    onToggleSelect
  }) => (
    <div className="group relative bg-gray-100 rounded-xl overflow-hidden border-2 border-gray-200 hover:border-purple-400 transition-all">
      <div className="aspect-square relative">
        {onToggleSelect && (
          <button
            type="button"
            onClick={onToggleSelect}
            className={`absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-md border-2 flex items-center justify-center shadow-sm transition-all ${
              isSelected
                ? 'bg-purple-700 border-purple-700 text-white'
                : 'bg-white/95 border-gray-300 text-gray-700 hover:border-purple-300'
            }`}
            title={isSelected ? 'Deselect' : 'Select'}
          >
            <span
              className={`inline-flex w-3.5 h-3.5 items-center justify-center rounded-sm border-2 ${
                isSelected ? 'border-white bg-white' : 'border-gray-500 bg-transparent'
              }`}
            >
              {isSelected ? <span className="w-1.5 h-1.5 rounded-[2px] bg-purple-700" /> : null}
            </span>
          </button>
        )}
        {/* Thumbnail */}
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={label || (isVideo ? 'Video' : 'Photo')}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            onError={(e) => { e.target.onerror = null; e.target.src = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\'%3E%3Crect fill=\'%23e0e7ff\' width=\'100\' height=\'100\'/%3E%3Ctext fill=\'%236366f1\' font-family=\'Arial\' font-size=\'32\' x=\'50%25\' y=\'54%25\' text-anchor=\'middle\' dy=\'.3em\'%3E%E2%96%B6%3C/text%3E%3C/svg%3E'; }}
          />
        ) : (
          <div className="w-full h-full bg-indigo-50 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-indigo-400">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        )}
        {/* Video play badge */}
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-9 h-9 bg-black/50 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-5 h-5 ml-0.5">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}
        {/* Status badge */}
        <span className={`absolute top-1.5 left-1.5 px-1.5 py-[2px] rounded-md text-[9px] font-semibold uppercase tracking-normal border ${
          item.approvalStatus === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
          item.approvalStatus === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
          'bg-amber-50 text-amber-700 border-amber-200'
        }`}>
          {item.approvalStatus === 'approved' ? 'Approved' : item.approvalStatus === 'rejected' ? 'Rejected' : 'Pending'}
        </span>
        {/* Hover actions */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/45 transition-all opacity-0 group-hover:opacity-100 pointer-events-none">
          <div className="absolute left-1.5 right-1.5 bottom-1.5 grid grid-cols-3 gap-1 pointer-events-auto">
            <button onClick={onView} className="h-7 bg-white/95 rounded-md flex items-center justify-center text-gray-800 hover:bg-indigo-100 shadow-sm" title="View"><Eye className="w-3.5 h-3.5" /></button>
            <button onClick={onDetails} className="h-7 bg-white/95 rounded-md flex items-center justify-center text-gray-800 hover:bg-yellow-100 shadow-sm" title="Details"><AlertCircle className="w-3.5 h-3.5" /></button>
            <button onClick={onDownload} className="h-7 bg-white/95 rounded-md flex items-center justify-center text-gray-800 hover:bg-green-100 shadow-sm" title="Download"><Download className="w-3.5 h-3.5" /></button>
            {item.approvalStatus !== 'approved' && (
              <button onClick={onApprove} className="h-7 bg-green-500 rounded-md flex items-center justify-center text-white hover:bg-green-600 shadow-sm" title="Approve"><CheckCircle className="w-3.5 h-3.5" /></button>
            )}
            {item.approvalStatus !== 'rejected' && (
              <button onClick={onReject} className="h-7 bg-red-500 rounded-md flex items-center justify-center text-white hover:bg-red-600 shadow-sm" title="Reject"><XCircle className="w-3.5 h-3.5" /></button>
            )}
            <button onClick={onDelete} className="h-7 bg-gray-700 rounded-md flex items-center justify-center text-white hover:bg-gray-800 shadow-sm" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </div>
      {label && (
        <div className="px-2 py-1.5 bg-white border-t border-gray-100">
          <p className="text-xs text-gray-500 truncate">{label}</p>
        </div>
      )}
    </div>
  );

  const renderMedia = () => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filteredMedia = media.filter(item => {
      const matchesSearch = normalizedSearch === '' ||
        item.caption?.toLowerCase().includes(normalizedSearch) ||
        item.vendorId?.businessName?.toLowerCase().includes(normalizedSearch);
      const matchesStatus = mediaFilter === 'all' || item.approvalStatus === mediaFilter;
      return matchesSearch && matchesStatus;
    });

    // Helper: generate optimized image thumbnail URL
    const getImageThumbnail = (url) => {
      if (!url) return null;
      try {
        return url.replace(/\/image\/upload\//, '/image/upload/w_320,h_320,c_fill,f_auto,q_auto/');
      } catch {
        return url;
      }
    };

    // Helper: generate Cloudinary video thumbnail URL
    const getVideoThumbnail = (url) => {
      if (!url) return null;
      try {
        return url
          .replace(/\/video\/upload\//, '/video/upload/w_320,h_320,c_fill,so_auto,f_jpg,q_auto/')
          .replace(/\.(mp4|webm|mov|avi|mkv)(\?.*)?$/i, '.jpg');
      } catch {
        return null;
      }
    };

    // Helper: clean up auto-generated video captions
    const getDisplayName = (item, videoIndex) => {
      const raw = item.caption || '';
      if (/^portfolio video\s*\d*/i.test(raw.trim())) return `Video ${videoIndex}`;
      if (!raw.trim()) return `Video ${videoIndex}`;
      return raw;
    };

    // Group by vendor
    const vendorGroups = {};
    filteredMedia.forEach(item => {
      const key = item.vendorId?._id || 'unknown';
      if (!vendorGroups[key]) {
        vendorGroups[key] = {
          vendorInfo: item.vendorId,
          vendorName: item.vendorId?.businessName || 'Unknown Vendor',
          images: [],
          videos: [],
          pendingCount: 0,
          approvedCount: 0,
          rejectedCount: 0,
        };
      }
      if (item.type === 'video') vendorGroups[key].videos.push(item);
      else vendorGroups[key].images.push(item);
      if (item.approvalStatus === 'pending') vendorGroups[key].pendingCount++;
      else if (item.approvalStatus === 'approved') vendorGroups[key].approvedCount++;
      else if (item.approvalStatus === 'rejected') vendorGroups[key].rejectedCount++;
    });

    const vendorGroupList = Object.entries(vendorGroups).sort((a, b) => b[1].pendingCount - a[1].pendingCount);
    const mediaTotalPages = Math.max(1, Math.ceil(vendorGroupList.length / mediaGroupsPerPage));
    const mediaStartIndex = (mediaPage - 1) * mediaGroupsPerPage;
    const paginatedVendorGroups = vendorGroupList.slice(mediaStartIndex, mediaStartIndex + mediaGroupsPerPage);

    const toggleVendor = (vid) => {
      setExpandedVendors(prev => {
        const next = new Set(prev);
        if (next.has(vid)) next.delete(vid); else next.add(vid);
        return next;
      });
    };

    const handleViewMedia = (url) => window.open(url, '_blank');

    const handleDownloadMedia = async (url, filename) => {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const dlUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = dlUrl;
        link.download = filename || 'media-' + Date.now() + '.jpg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(dlUrl);
        showNotification('success', 'Media downloaded successfully');
      } catch {
        showNotification('error', 'Failed to download media');
      }
    };

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1f3c5d] to-[#24496f] rounded-2xl shadow-xl p-4 text-white">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold mb-1">📸 Media Management</h2>
              <p className="text-white/80">Vendor photos grouped by vendor — review before publishing</p>
            </div>
            <div className="flex gap-3">
              <div className="bg-blue-600 bg-opacity-40 px-4 py-2 rounded-xl text-center">
                <p className="text-xl font-bold text-white">{filteredMedia.filter(i => i.type !== 'video').length}</p>
                <p className="text-xs text-blue-100">📷 Photos</p>
              </div>
              <div className="bg-blue-600 bg-opacity-40 px-4 py-2 rounded-xl text-center">
                <p className="text-xl font-bold text-white">{filteredMedia.filter(i => i.type === 'video').length}</p>
                <p className="text-xs text-blue-100">🎬 Videos</p>
              </div>
              <div className="bg-blue-600 bg-opacity-40 px-4 py-2 rounded-xl text-center">
                <p className="text-xl font-bold text-white">{vendorGroupList.length}</p>
                <p className="text-xs text-blue-100">Vendors</p>
              </div>
              {(mediaStats?.pendingMedia || 0) > 0 && (
                <div className="bg-yellow-400/80 px-4 py-2 rounded-xl text-center">
                  <p className="text-xl font-bold text-yellow-900">{mediaStats.pendingMedia}</p>
                  <p className="text-xs text-yellow-900">⏳ Pending</p>
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 px-4 py-3 bg-white/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-white/90"><strong>All vendor photos require approval</strong> before appearing on their public profile.</p>
          </div>
        </div>

        {/* Filters + Controls */}
        <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 text-gray-600 font-medium text-sm">
              <Filter className="w-4 h-4" />Filter:
            </div>
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search vendor or caption..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
              />
            </div>
            <select
              value={mediaFilter}
              onChange={(e) => setMediaFilter(e.target.value)}
              className="px-4 py-2.5 border-2 border-gray-200 rounded-xl bg-white text-sm font-medium"
            >
              <option value="all">All Status</option>
              <option value="pending">⏳ Pending</option>
              <option value="approved">✅ Approved</option>
              <option value="rejected">❌ Rejected</option>
            </select>
            <button
              onClick={() => setExpandedVendors(new Set(vendorGroupList.map(([k]) => k)))}
              className="px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-sm font-semibold transition-all"
            >
              Expand All
            </button>
            <button
              onClick={() => setExpandedVendors(new Set())}
              className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-all"
            >
              Collapse All
            </button>
            {selectedMediaIds.size > 0 && (
              <div className="ml-auto flex items-center gap-2">
                <span className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold">
                  {selectedMediaIds.size} selected
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedMediaIds(new Set())}
                  className="px-3 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-semibold hover:bg-black transition-all"
                >
                  Clear Selection
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Vendor Groups */}
        {vendorGroupList.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 text-center py-20">
            <Image className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No media found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedVendorGroups.map(([vendorKey, group], vendorIdx) => {
              const isExpanded = expandedVendors.has(vendorKey);
              const imageIds = group.images.map((item) => item._id);
              const videoIds = group.videos.map((item) => item._id);
              const selectedImages = group.images.filter((item) => selectedMediaIds.has(item._id));
              const selectedVideos = group.videos.filter((item) => selectedMediaIds.has(item._id));
              const allImagesSelected = imageIds.length > 0 && imageIds.every((id) => selectedMediaIds.has(id));
              const allVideosSelected = videoIds.length > 0 && videoIds.every((id) => selectedMediaIds.has(id));
              return (
                <div key={vendorKey} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                  {/* Vendor Header */}
                  <button
                    onClick={() => toggleVendor(vendorKey)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center">
                        {mediaStartIndex + vendorIdx + 1}
                      </div>
                      <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {group.vendorName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{group.vendorName}</p>
                        <p className="text-xs text-gray-500">{group.vendorInfo?.city || 'N/A'} · {group.vendorInfo?.serviceType || 'N/A'}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-2 flex-wrap">
                        {group.images.length > 0 && <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg font-semibold">📷 {group.images.length} photo{group.images.length !== 1 ? 's' : ''}</span>}
                        {group.videos.length > 0 && <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg font-semibold">🎬 {group.videos.length} video{group.videos.length !== 1 ? 's' : ''}</span>}
                        {group.pendingCount > 0 && <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-lg font-semibold">{group.pendingCount} pending</span>}
                        {group.approvedCount > 0 && <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs rounded-lg font-semibold">{group.approvedCount} approved</span>}
                        {group.rejectedCount > 0 && <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs rounded-lg font-semibold">{group.rejectedCount} rejected</span>}
                      </div>
                    </div>
                    <div className={`w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 transition-transform duration-200 flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-600">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Media: Photos + Videos */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-4 py-4 space-y-4">

                      {/* Photos Section */}
                      {group.images.length > 0 && (
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">📷 Photos ({group.images.length})</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => selectMultipleMedia(imageIds, !allImagesSelected)}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
                              >
                                {allImagesSelected ? 'Unselect All' : 'Select All'}
                              </button>
                              {selectedImages.length > 0 && (
                                <>
                                  <span className="text-xs font-semibold text-gray-600">{selectedImages.length} selected</span>
                                  <button
                                    type="button"
                                    onClick={() => handleBulkApproveMedia(selectedImages)}
                                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-green-100 text-green-700 border border-green-200 hover:bg-green-200"
                                  >
                                    Approve Selected
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleBulkRejectMedia(selectedImages)}
                                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-100 text-red-700 border border-red-200 hover:bg-red-200"
                                  >
                                    Reject Selected
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2.5">
                            {group.images.map(item => (
                              <MediaCard
                                key={item._id}
                                item={item}
                                label={item.caption || ''}
                                thumbnail={getImageThumbnail(item.url) || item.url}
                                isVideo={false}
                                onView={() => handleViewMedia(item.url)}
                                onDetails={() => setSelectedMediaDetail({ ...item, vendorName: group.vendorName, vendorCity: group.vendorInfo?.city })}
                                onDownload={() => handleDownloadMedia(item.url, item.caption)}
                                onApprove={() => handleApproveMedia(item._id, item.approvalStatus)}
                                onReject={() => handleRejectMedia(item._id, item.approvalStatus, item.rejectionReason)}
                                onDelete={() => handleDeleteMedia(item._id)}
                                isSelected={selectedMediaIds.has(item._id)}
                                onToggleSelect={() => toggleMediaSelection(item._id)}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Videos Section */}
                      {group.videos.length > 0 && (
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">🎬 Videos ({group.videos.length})</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => selectMultipleMedia(videoIds, !allVideosSelected)}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
                              >
                                {allVideosSelected ? 'Unselect All' : 'Select All'}
                              </button>
                              {selectedVideos.length > 0 && (
                                <>
                                  <span className="text-xs font-semibold text-gray-600">{selectedVideos.length} selected</span>
                                  <button
                                    type="button"
                                    onClick={() => handleBulkApproveMedia(selectedVideos)}
                                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-green-100 text-green-700 border border-green-200 hover:bg-green-200"
                                  >
                                    Approve Selected
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleBulkRejectMedia(selectedVideos)}
                                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-100 text-red-700 border border-red-200 hover:bg-red-200"
                                  >
                                    Reject Selected
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5">
                            {group.videos.map((item, vidIdx) => (
                              <MediaCard
                                key={item._id}
                                item={item}
                                label={getDisplayName(item, vidIdx + 1)}
                                thumbnail={getVideoThumbnail(item.url)}
                                isVideo={true}
                                onView={() => handleViewMedia(item.url)}
                                onDetails={() => setSelectedMediaDetail({ ...item, vendorName: group.vendorName, vendorCity: group.vendorInfo?.city })}
                                onDownload={() => handleDownloadMedia(item.url, `video-${vidIdx + 1}.mp4`)}
                                onApprove={() => handleApproveMedia(item._id, item.approvalStatus)}
                                onReject={() => handleRejectMedia(item._id, item.approvalStatus, item.rejectionReason)}
                                onDelete={() => handleDeleteMedia(item._id)}
                                isSelected={selectedMediaIds.has(item._id)}
                                onToggleSelect={() => toggleMediaSelection(item._id)}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {vendorGroupList.length > 0 && (
          <div className="flex items-center justify-between gap-2 mt-4 bg-white border border-gray-200 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-600">
              Showing {vendorGroupList.length === 0 ? 0 : mediaStartIndex + 1} to {Math.min(mediaStartIndex + mediaGroupsPerPage, vendorGroupList.length)} of {vendorGroupList.length} vendor groups
            </p>
            <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setMediaPage((p) => Math.max(1, p - 1))}
              disabled={mediaPage === 1}
              className="px-4 py-2 border-2 border-gray-200 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-500 hover:bg-blue-50 transition-all"
            >
              Previous
            </button>
            <div className="flex gap-2">
              {Array.from({ length: mediaTotalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setMediaPage(page)}
                  className={`w-10 h-10 rounded-xl font-bold transition-all ${
                    mediaPage === page
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setMediaPage((p) => Math.min(mediaTotalPages, p + 1))}
              disabled={mediaPage === mediaTotalPages}
              className="px-4 py-2 border-2 border-gray-200 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-500 hover:bg-blue-50 transition-all"
            >
              Next
            </button>
            </div>
          </div>
        )}

        {selectedMediaDetail && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedMediaDetail(null)}>
            <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Media Details</h3>
                <button className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center" onClick={() => setSelectedMediaDetail(null)}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  {selectedMediaDetail.type === 'video' ? (
                    <video controls className="w-full rounded-xl border border-gray-200 bg-black" src={selectedMediaDetail.url} />
                  ) : (
                    <img src={selectedMediaDetail.url} alt={selectedMediaDetail.caption || 'media'} className="w-full rounded-xl border border-gray-200 object-cover" />
                  )}
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Vendor</p>
                    <p className="font-medium text-gray-900">{selectedMediaDetail.vendorName || 'Unknown Vendor'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">City</p>
                    <p className="font-medium text-gray-900">{selectedMediaDetail.vendorCity || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Type</p>
                    <p className="font-medium text-gray-900">{selectedMediaDetail.type || 'image'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Caption</p>
                    <p className="font-medium text-gray-900">{selectedMediaDetail.caption || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <p className="font-medium text-gray-900">{selectedMediaDetail.approvalStatus || 'pending'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Uploaded At</p>
                    <p className="font-medium text-gray-900">{selectedMediaDetail.createdAt ? new Date(selectedMediaDetail.createdAt).toLocaleString('en-IN') : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Rejection Reason</p>
                    <p className="font-medium text-gray-900">{selectedMediaDetail.rejectionReason || '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
  const renderVendorBlogs = () => {
    const filteredBlogs = vendorBlogs.filter(blog => {
      const matchesSearch = searchTerm === '' || 
        blog.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        blog.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        blog.vendorId?.businessName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = vendorBlogFilter === 'all' || blog.approvalStatus === vendorBlogFilter;
      
      return matchesSearch && matchesStatus;
    });

    // Pagination
    const totalPages = Math.ceil(filteredBlogs.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedBlogs = filteredBlogs.slice(startIndex, endIndex);

    const toggleRow = (id) => {
      setExpandedRow(expandedRow === id ? null : id);
    };

    return (
      <div className="space-y-6">
        {/* Sub-Tab Switcher */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="flex">
            <button
              onClick={() => { setBlogSubTab('admin'); setCurrentPage(1); setExpandedRow(null); setSearchTerm(''); }}
              className="flex-1 flex items-center justify-center gap-2 py-4 font-semibold text-sm border-b-2 border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Admin Blogs
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-200 text-gray-600">{blogStats?.totalBlogs || 0}</span>
            </button>
            <button
              onClick={() => { setBlogSubTab('vendor'); setCurrentPage(1); setExpandedRow(null); setSearchTerm(''); }}
              className="flex-1 flex items-center justify-center gap-2 py-4 font-semibold text-sm border-b-2 border-blue-600 bg-blue-50 text-blue-700"
            >
              <Building2 className="w-4 h-4" />
              Vendor Blogs
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white">{vendorBlogStats?.totalBlogs || 0}</span>
              {(vendorBlogStats?.pendingBlogs || 0) > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-400 text-yellow-900">{vendorBlogStats.pendingBlogs} pending</span>
              )}
            </button>
          </div>
        </div>

        {/* Header with Stats */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">📝 Vendor Blog Management</h2>
              <p className="text-white text-opacity-90">Approve, reject, or delete vendor blogs</p>
            </div>
            <div className="flex gap-4">
              <div className="bg-blue-600 bg-opacity-40 px-6 py-3 rounded-xl text-center">
                <p className="text-3xl font-bold text-white">{vendorBlogStats?.totalBlogs || 0}</p>
                <p className="text-sm text-blue-100">Total</p>
              </div>
              <div className="bg-blue-600 bg-opacity-40 px-6 py-3 rounded-xl text-center">
                <p className="text-3xl font-bold text-white">{vendorBlogStats?.pendingBlogs || 0}</p>
                <p className="text-sm text-blue-100">Pending</p>
              </div>
              <div className="bg-blue-600 bg-opacity-40 px-6 py-3 rounded-xl text-center">
                <p className="text-3xl font-bold text-white">{vendorBlogStats?.approvedBlogs || 0}</p>
                <p className="text-sm text-blue-100">Approved</p>
              </div>
              <div className="bg-blue-600 bg-opacity-40 px-6 py-3 rounded-xl text-center">
                <p className="text-3xl font-bold text-white">{vendorBlogStats?.rejectedBlogs || 0}</p>
                <p className="text-sm text-blue-100">Rejected</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions and Filters */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Search & Filter</h3>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search vendor blogs by title, content, or vendor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
            <select
              value={vendorBlogFilter}
              onChange={(e) => {
                setVendorBlogFilter(e.target.value);
                loadVendorBlogs();
              }}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium bg-white"
            >
              <option value="all">🔄 All Status</option>
              <option value="pending">⏳ Pending</option>
              <option value="approved">✅ Approved</option>
              <option value="rejected">❌ Rejected</option>
            </select>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-800">
            <strong>📌 Vendor Blog Workflow:</strong> All vendor-submitted blogs require admin approval before being published. Approve quality content, reject inappropriate posts, or delete spam.
          </p>
        </div>

        {/* Blogs Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {filteredBlogs.length > 0 ? (
            <>
              {/* Table Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-3 border-b border-gray-200 hidden md:grid md:grid-cols-12 gap-4 font-semibold text-gray-700 text-sm">
                <div className="col-span-1">#</div>
                <div className="col-span-4">Title & Vendor</div>
                <div className="col-span-2">Tags</div>
                <div className="col-span-2">Approval Status</div>
                <div className="col-span-1">Views</div>
                <div className="col-span-2">Actions</div>
              </div>

              {/* Table Body */}
              {paginatedBlogs.map((blog, index) => (
                <div key={blog._id} className="border-b border-gray-100 last:border-none">
                  {/* Compact Row */}
                  <div 
                    className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 cursor-pointer items-center"
                    onClick={() => toggleRow(blog._id)}
                  >
                    <div className="col-span-1 font-bold text-gray-900">{startIndex + index + 1}</div>
                    <div className="col-span-4 flex items-center gap-3">
                      {blog.coverImage?.url ? (
                        <img 
                          src={blog.coverImage.url} 
                          alt={blog.title}
                          className="w-12 h-12 object-cover rounded-lg border-2 border-gray-200 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 flex-shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                          {blog.vendorId?.businessName?.charAt(0).toUpperCase() || 'V'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{blog.title}</p>
                        <p className="text-xs text-gray-500 truncate">{blog.vendorId?.businessName || 'Unknown Vendor'}</p>
                      </div>
                    </div>
                    <div className="col-span-2">
                      {blog.tags && blog.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {blog.tags.slice(0, 2).map((tag, idx) => (
                            <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold">
                              {tag}
                            </span>
                          ))}
                          {blog.tags.length > 2 && (
                            <span className="text-xs text-gray-500">+{blog.tags.length - 2}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No tags</span>
                      )}
                    </div>
                    <div className="col-span-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        blog.approvalStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        blog.approvalStatus === 'approved' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {blog.approvalStatus === 'pending' ? '⏳ Pending' :
                         blog.approvalStatus === 'approved' ? '✅ Approved' :
                         '❌ Rejected'}
                      </span>
                    </div>
                    <div className="col-span-1 text-sm text-gray-600 font-medium">
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {blog.views || 0}
                      </div>
                    </div>
                    <div className="col-span-2 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVendorBlogDetail(blog);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                        title="View Full Blog"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      {blog.approvalStatus === 'pending' && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDialog({
                                isOpen: true,
                                title: 'Approve Blog',
                                message: `Are you sure you want to approve "${blog.title}"? This will make it visible to the public.`,
                                type: 'success',
                                onConfirm: async () => {
                                  await handleApproveVendorBlog(blog._id);
                                }
                              });
                            }}
                            className="text-green-600 hover:text-green-800"
                            title="Approve Blog"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDialog({
                                isOpen: true,
                                title: 'Reject Blog',
                                message: 'Please provide a reason for rejecting this blog:',
                                type: 'warning',
                                requireInput: true,
                                inputPlaceholder: 'Rejection reason...',
                                onConfirm: async (reason) => {
                                  await handleRejectVendorBlog(blog._id, reason || 'Does not meet content guidelines');
                                }
                              });
                            }}
                            className="text-red-600 hover:text-red-800"
                            title="Reject Blog"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </>
                      )}
                      {blog.approvalStatus !== 'pending' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDialog({
                              isOpen: true,
                              title: 'Change Status',
                              message: `This blog is currently ${blog.approvalStatus}. Do you want to change its status?`,
                              type: 'info',
                              onConfirm: async () => {
                                // Toggle between approved and pending
                                if (blog.approvalStatus === 'approved') {
                                  await handleRejectVendorBlog(blog._id, 'Status changed by admin');
                                } else {
                                  await handleApproveVendorBlog(blog._id);
                                }
                              }
                            });
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="Change Status"
                        >
                          <RefreshCw className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDialog({
                            isOpen: true,
                            title: 'Delete Blog',
                            message: `Are you sure you want to permanently delete "${blog.title}"? This action cannot be undone.`,
                            type: 'danger',
                            onConfirm: async () => {
                              await handleDeleteVendorBlog(blog._id);
                            }
                          });
                        }}
                        className="text-gray-600 hover:text-gray-800"
                        title="Delete Blog"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedRow === blog._id && (
                    <div className="bg-gray-50 px-6 py-6 border-t border-gray-200">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Blog Preview */}
                        <div>
                          <p className="text-xs text-gray-500 mb-2 font-semibold">Blog Preview</p>
                          {blog.coverImage?.url && (
                            <img 
                              src={blog.coverImage.url} 
                              alt={blog.title}
                              className="w-full max-h-64 rounded-lg object-cover bg-gray-100 border-2 border-gray-300 mb-4"
                            />
                          )}
                          <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">{blog.title}</h3>
                            <p className="text-sm text-gray-600 mb-3">{blog.excerpt}</p>
                            {blog.content && (
                              <div className="mt-3">
                                <p className="text-xs text-gray-500 mb-2 font-semibold">Content</p>
                                <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-80 overflow-y-auto pr-2">
                                  {blog.content}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Details & Metadata */}
                        <div>
                          <p className="text-xs text-gray-500 mb-3 font-semibold">Blog Information</p>
                          <div className="space-y-4">
                            {/* Vendor Info */}
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                              <p className="text-xs text-gray-500 mb-2 font-semibold">Vendor Details</p>
                              <div className="space-y-2">
                                <div>
                                  <p className="text-xs text-gray-500">Business Name</p>
                                  <p className="text-sm font-medium text-gray-900">{blog.vendorId?.businessName || 'Unknown'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Service Type</p>
                                  <p className="text-sm font-medium text-gray-900">{blog.vendorId?.serviceType || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Vendor ID</p>
                                  <p className="text-sm font-medium text-gray-900">{blog.vendorId?.vendorId || 'N/A'}</p>
                                </div>
                              </div>
                            </div>

                            {/* Blog Metadata */}
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                              <p className="text-xs text-gray-500 mb-2 font-semibold">Metadata</p>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-xs text-gray-500">Approval Status</p>
                                  <span className={`inline-block mt-1 px-2 py-1 rounded text-xs font-semibold ${
                                    blog.approvalStatus === 'approved' ? 'bg-green-100 text-green-700' :
                                    blog.approvalStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                                    'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {blog.approvalStatus}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Post Status</p>
                                  <span className={`inline-block mt-1 px-2 py-1 rounded text-xs font-semibold ${
                                    blog.status === 'published' ? 'bg-blue-100 text-blue-700' :
                                    blog.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                                    'bg-purple-100 text-purple-700'
                                  }`}>
                                    {blog.status}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Views</p>
                                  <p className="text-sm font-medium text-gray-900">{blog.views || 0}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Likes</p>
                                  <p className="text-sm font-medium text-gray-900">{blog.likes || 0}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Read Time</p>
                                  <p className="text-sm font-medium text-gray-900">{blog.metadata?.readTime || 0} min</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Word Count</p>
                                  <p className="text-sm font-medium text-gray-900">{blog.metadata?.wordCount || 0}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Created</p>
                                  <p className="text-sm font-medium text-gray-900">{new Date(blog.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Published</p>
                                  <p className="text-sm font-medium text-gray-900">
                                    {blog.publishedAt ? new Date(blog.publishedAt).toLocaleDateString() : 'Not published'}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Tags */}
                            {blog.tags && blog.tags.length > 0 && (
                              <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <p className="text-xs text-gray-500 mb-2 font-semibold">Tags</p>
                                <div className="flex flex-wrap gap-2">
                                  {blog.tags.map((tag, idx) => (
                                    <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Rejection Reason */}
                            {blog.rejectionReason && (
                              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                <p className="text-xs text-red-500 mb-2 font-semibold">Rejection Reason</p>
                                <p className="text-sm text-red-700">{blog.rejectionReason}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </>
          ) : (
            <div className="text-center py-20">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Vendor Blogs Found</h3>
              <p className="text-gray-600">
                {vendorBlogFilter !== 'all' 
                  ? `No ${vendorBlogFilter} blogs found. Try changing the filter.`
                  : 'No vendor blogs have been submitted yet.'}
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredBlogs.length > 0 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border-2 border-gray-200 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-500 hover:bg-blue-50 transition-all"
            >
              Previous
            </button>
            <div className="flex gap-2">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-10 h-10 rounded-xl font-bold transition-all ${
                    currentPage === i + 1
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg'
                      : 'border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border-2 border-gray-200 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-500 hover:bg-blue-50 transition-all"
            >
              Next
            </button>
          </div>
        )}

        {/* Fullscreen Blog View (page-like) */}
        {selectedVendorBlogDetail && (
          <div
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={() => setSelectedVendorBlogDetail(null)}
          >
            <div
              className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 font-semibold">Vendor Blog</p>
                  <h3 className="text-lg font-bold text-gray-900 truncate">{selectedVendorBlogDetail.title}</h3>
                  <p className="text-xs text-gray-500 truncate">
                    {selectedVendorBlogDetail.vendorId?.businessName || 'Unknown Vendor'}
                    {selectedVendorBlogDetail.approvalStatus ? ` • ${selectedVendorBlogDetail.approvalStatus}` : ''}
                  </p>
                </div>
                <button
                  className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                  onClick={() => setSelectedVendorBlogDetail(null)}
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                <div className="bg-gray-50 p-6 border-b lg:border-b-0 lg:border-r border-gray-200">
                  {selectedVendorBlogDetail.coverImage?.url ? (
                    <img
                      src={selectedVendorBlogDetail.coverImage.url}
                      alt={selectedVendorBlogDetail.title}
                      className="w-full h-64 object-cover rounded-xl border border-gray-200 bg-white"
                    />
                  ) : (
                    <div className="w-full h-64 rounded-xl border border-gray-200 bg-white flex items-center justify-center">
                      <FileText className="w-16 h-16 text-gray-300" />
                    </div>
                  )}

                  {selectedVendorBlogDetail.excerpt && (
                    <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4">
                      <p className="text-xs text-gray-500 mb-2 font-semibold">Excerpt</p>
                      <p className="text-sm text-gray-700">{selectedVendorBlogDetail.excerpt}</p>
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    {selectedVendorBlogDetail.tags?.length > 0 ? (
                      selectedVendorBlogDetail.tags.map((tag, idx) => (
                        <span key={`${tag}-${idx}`} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400">No tags</span>
                    )}
                  </div>

                  <div className="border border-gray-200 rounded-xl p-4 max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
                    {selectedVendorBlogDetail.content || '—'}
                  </div>

                  {selectedVendorBlogDetail.rejectionReason && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-xs text-red-600 mb-1 font-semibold">Rejection Reason</p>
                      <p className="text-sm text-red-700">{selectedVendorBlogDetail.rejectionReason}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPayments = () => {
    const PLAN_COLORS = {
      starter: 'bg-blue-100 text-blue-700',
      growth: 'bg-purple-100 text-purple-700',
      premium: 'bg-amber-100 text-amber-800',
      free: 'bg-gray-100 text-gray-600'
    };
    const TYPE_LABELS = {
      'first-purchase': 'First Purchase',
      renewal: 'Renewal',
      upgrade: 'Upgrade'
    };

    const filtered = payments.filter(p => {
      const matchesPlan = paymentFilter.planKey === 'all' || p.planKey === paymentFilter.planKey;
      const matchesStatus = paymentFilter.status === 'all' || p.status === paymentFilter.status;
      const matchesSearch = !searchTerm ||
        p.vendorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.vendorEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.paymentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.orderId?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesPlan && matchesStatus && matchesSearch;
    });

    const sortedPayments = [...filtered].sort((a, b) => {
      const aDate = new Date(a.paymentDate || a.createdAt || 0).getTime();
      const bDate = new Date(b.paymentDate || b.createdAt || 0).getTime();
      return bDate - aDate;
    });

    const paymentTotalPages = Math.max(1, Math.ceil(sortedPayments.length / paymentItemsPerPage));
    const safePaymentPage = Math.min(paymentPage, paymentTotalPages);
    const paymentStartIndex = (safePaymentPage - 1) * paymentItemsPerPage;
    const paginatedPayments = sortedPayments.slice(paymentStartIndex, paymentStartIndex + paymentItemsPerPage);

    const getPaymentKey = (payment, idx) => payment.paymentId || payment.orderId || `${idx}-${payment.vendorEmail || 'payment'}`;

    const formatDateTime = (value) => {
      if (!value) return '—';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '—';
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    return (
      <div>
        {/* Section Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-xl p-6 text-white mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">💳 Payment Management</h2>
              <p className="text-white text-opacity-90">All vendor transactions and billing records</p>
            </div>
            <div className="flex gap-4 items-center">
              <button
                onClick={handleExportPayments}
                disabled={loading || payments.length === 0}
                className="bg-white text-blue-600 px-4 py-2 rounded-xl font-semibold hover:bg-opacity-90 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export all payments to Excel"
              >
                <Download className="w-5 h-5" />
                Export to Excel
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <IndianRupee className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ₹{(paymentSummary?.totalRevenue || 0).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-sm font-medium text-gray-500">Successful</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{paymentSummary?.successCount || 0}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <XCircle className="w-5 h-5 text-indigo-600" />
              </div>
              <p className="text-sm font-medium text-gray-500">Failed</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{paymentSummary?.failedCount || 0}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-200 rounded-xl flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-blue-700" />
              </div>
              <p className="text-sm font-medium text-gray-500">Total Payments</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{paymentSummary?.totalCount || 0}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search vendor, email, payment ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={paymentFilter.planKey}
            onChange={e => setPaymentFilter(f => ({ ...f, planKey: e.target.value }))}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Plans</option>
            <option value="starter">Starter</option>
            <option value="growth">Growth</option>
            <option value="premium">Premium</option>
          </select>
          <select
            value={paymentFilter.status}
            onChange={e => setPaymentFilter(f => ({ ...f, status: e.target.value }))}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
            <option value="authorized">Authorized</option>
            <option value="created">Created</option>
          </select>
          <button
            onClick={() => loadPayments()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${paymentsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              All Payments
              <span className="ml-2 text-sm font-normal text-gray-500">({filtered.length} records)</span>
            </h3>
          </div>
          {paymentsLoading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-7 h-7 animate-spin text-blue-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No payments found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold text-gray-600">#</th>
                    <th className="px-5 py-3 text-left font-semibold text-gray-600">Date</th>
                    <th className="px-5 py-3 text-left font-semibold text-gray-600">Vendor</th>
                    <th className="px-5 py-3 text-left font-semibold text-gray-600">Plan</th>
                    <th className="px-5 py-3 text-left font-semibold text-gray-600">Type</th>
                    <th className="px-5 py-3 text-right font-semibold text-gray-600">Amount</th>
                    <th className="px-5 py-3 text-left font-semibold text-gray-600">Status</th>
                    <th className="px-5 py-3 text-left font-semibold text-gray-600">Payment ID</th>
                    <th className="px-5 py-3 text-left font-semibold text-gray-600">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedPayments.map((payment, idx) => {
                    const paymentKey = getPaymentKey(payment, paymentStartIndex + idx);
                    const isExpanded = expandedPaymentId === paymentKey;

                    return (
                      <React.Fragment key={paymentKey}>
                        <tr
                          className="hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => setExpandedPaymentId(isExpanded ? null : paymentKey)}
                        >
                          <td className="px-5 py-3 text-gray-500">{paymentStartIndex + idx + 1}</td>
                          <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                            {payment.paymentDate
                              ? new Date(payment.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                              : '—'}
                          </td>
                          <td className="px-5 py-3">
                            <p className="font-semibold text-gray-900">{payment.vendorName || '—'}</p>
                            <p className="text-xs text-gray-500">{payment.vendorEmail || ''}</p>
                            {payment.vendorCity && <p className="text-xs text-gray-400">{payment.vendorCity}</p>}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${PLAN_COLORS[payment.planKey] || 'bg-gray-100 text-gray-600'}`}>
                              {payment.planName || payment.planKey || '—'}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-gray-600">
                            {TYPE_LABELS[payment.type] || payment.type || '—'}
                          </td>
                          <td className="px-5 py-3 text-right font-bold text-gray-900">
                            ₹{(payment.amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              payment.status === 'success' ? 'bg-green-100 text-green-700' :
                              payment.status === 'failed' ? 'bg-red-100 text-red-700' :
                              payment.status === 'cancelled' ? 'bg-orange-100 text-orange-700' :
                              payment.status === 'refunded' ? 'bg-indigo-100 text-indigo-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {payment.status === 'success' ? '✓ Success' :
                               payment.status === 'failed' ? '✗ Failed' :
                               payment.status === 'cancelled' ? '• Cancelled' :
                               payment.status === 'refunded' ? '↺ Refunded' :
                               payment.status || '—'}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-xs text-gray-400 font-mono">
                            {payment.paymentId ? payment.paymentId.slice(0, 18) + '…' : '—'}
                          </td>
                          <td className="px-5 py-3 text-xs font-semibold text-blue-600">
                            {isExpanded ? 'Hide' : 'View'}
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-gray-50">
                            <td colSpan="10" className="px-5 py-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                                <div className="bg-white border border-gray-200 rounded-xl p-3">
                                  <p className="text-xs text-gray-500 mb-1">Payment ID</p>
                                  <p className="font-mono text-gray-800 break-all">{payment.paymentId || '—'}</p>
                                </div>
                                <div className="bg-white border border-gray-200 rounded-xl p-3">
                                  <p className="text-xs text-gray-500 mb-1">Order ID</p>
                                  <p className="font-mono text-gray-800 break-all">{payment.orderId || '—'}</p>
                                </div>
                                <div className="bg-white border border-gray-200 rounded-xl p-3">
                                  <p className="text-xs text-gray-500 mb-1">Method</p>
                                  <p className="text-gray-900 font-medium">{payment.method || payment.wallet || payment.bank || '—'}</p>
                                </div>
                                <div className="bg-white border border-gray-200 rounded-xl p-3">
                                  <p className="text-xs text-gray-500 mb-1">Created/Updated</p>
                                  <p className="text-gray-900 font-medium">{formatDateTime(payment.paymentDate || payment.createdAt)}</p>
                                </div>
                                <div className="bg-white border border-gray-200 rounded-xl p-3">
                                  <p className="text-xs text-gray-500 mb-1">Raw Razorpay Status</p>
                                  <p className="text-gray-900 font-medium">{payment.razorpayStatus || payment.status || '—'}</p>
                                </div>
                                <div className="bg-white border border-gray-200 rounded-xl p-3">
                                  <p className="text-xs text-gray-500 mb-1">Error Code</p>
                                  <p className="text-gray-900 font-medium">{payment.errorCode || '—'}</p>
                                </div>

                                <div className="bg-white border border-gray-200 rounded-xl p-3">
                                  <p className="text-xs text-gray-500 mb-1">Plan Duration</p>
                                  <p className="text-gray-900 font-medium">
                                    {payment.durationDays || 30} days
                                    {Number(payment.bonusDays || 0) > 0 ? ` + ${payment.bonusDays} bonus` : ''}
                                  </p>
                                </div>

                                <div className="bg-white border border-gray-200 rounded-xl p-3">
                                  <p className="text-xs text-gray-500 mb-1">Total Plan Days</p>
                                  <p className="text-gray-900 font-medium">{payment.totalDays || 30} days</p>
                                </div>

                                <div className="bg-white border border-gray-200 rounded-xl p-3">
                                  <p className="text-xs text-gray-500 mb-1">Days Remaining</p>
                                  <p className="text-gray-900 font-medium">
                                    {payment.daysRemaining === null || payment.daysRemaining === undefined
                                      ? '—'
                                      : `${payment.daysRemaining} days`}
                                  </p>
                                </div>

                                <div className="bg-white border border-gray-200 rounded-xl p-3">
                                  <p className="text-xs text-gray-500 mb-1">Plan Start</p>
                                  <p className="text-gray-900 font-medium">{formatDateTime(payment.planStartDate)}</p>
                                </div>

                                <div className="bg-white border border-gray-200 rounded-xl p-3">
                                  <p className="text-xs text-gray-500 mb-1">Plan Expiry</p>
                                  <p className="text-gray-900 font-medium">{formatDateTime(payment.planExpiryDate)}</p>
                                </div>

                                <div className="bg-white border border-gray-200 rounded-xl p-3">
                                  <p className="text-xs text-gray-500 mb-1">Subscription Status</p>
                                  <p className="text-gray-900 font-medium">{payment.subscriptionStatus || '—'}</p>
                                </div>

                                <div className="bg-white border border-gray-200 rounded-xl p-3">
                                  <p className="text-xs text-gray-500 mb-1">Current Active Plan</p>
                                  <p className="text-gray-900 font-medium">{payment.currentPlanName || payment.currentPlanKey || '—'}</p>
                                </div>

                                <div className="bg-white border border-gray-200 rounded-xl p-3">
                                  <p className="text-xs text-gray-500 mb-1">Transaction Source</p>
                                  <p className="text-gray-900 font-medium">{payment.source || 'local'}</p>
                                </div>

                                <div className="bg-white border border-gray-200 rounded-xl p-3">
                                  <p className="text-xs text-gray-500 mb-1">Lifecycle</p>
                                  <p className="text-gray-900 font-medium text-xs leading-5">
                                    Created: {formatDateTime(payment.createdAt)}<br />
                                    Paid: {formatDateTime(payment.paidAt)}<br />
                                    Failed: {formatDateTime(payment.failedAt)}
                                  </p>
                                </div>
                              </div>

                              {(payment.isLastPaymentForSubscription || payment.isQueuedPayment) && (
                                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3">
                                  <p className="text-xs text-blue-700 mb-1">Subscription Linkage</p>
                                  <p className="text-sm text-blue-900">
                                    {payment.isLastPaymentForSubscription ? 'This payment is linked to current active subscription.' : ''}
                                    {payment.isLastPaymentForSubscription && payment.isQueuedPayment ? ' ' : ''}
                                    {payment.isQueuedPayment ? 'This payment is queued for upcoming plan activation.' : ''}
                                  </p>
                                  {payment.queuedPlan?.scheduledStartDate && (
                                    <p className="text-xs text-blue-800 mt-1">
                                      Queued start: {formatDateTime(payment.queuedPlan.scheduledStartDate)}
                                    </p>
                                  )}
                                </div>
                              )}

                              {(payment.errorDescription || payment.errorReason) && (
                                <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3">
                                  <p className="text-xs text-red-600 mb-1">Failure Details</p>
                                  <p className="text-sm text-red-800">
                                    {payment.errorDescription || '—'}
                                    {payment.errorReason ? ` (Reason: ${payment.errorReason})` : ''}
                                  </p>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!paymentsLoading && filtered.length > 0 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPaymentPage(p => Math.max(1, p - 1))}
              disabled={safePaymentPage === 1}
              className="px-4 py-2 border-2 border-gray-200 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-500 hover:bg-blue-50 transition-all"
            >
              Previous
            </button>

            <div className="flex items-center gap-2">
              {Array.from({ length: paymentTotalPages }, (_, i) => i + 1)
                .filter(page => {
                  if (paymentTotalPages <= 7) return true;
                  return Math.abs(page - safePaymentPage) <= 1 || page === 1 || page === paymentTotalPages;
                })
                .map((page, idx, arr) => (
                  <React.Fragment key={page}>
                    {idx > 0 && arr[idx - 1] !== page - 1 && (
                      <span className="px-2 text-gray-400">...</span>
                    )}
                    <button
                      onClick={() => setPaymentPage(page)}
                      className={`w-10 h-10 rounded-xl font-bold transition-all ${
                        safePaymentPage === page
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg'
                          : 'border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                      }`}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                ))}
            </div>

            <button
              onClick={() => setPaymentPage(p => Math.min(paymentTotalPages, p + 1))}
              disabled={safePaymentPage === paymentTotalPages}
              className="px-4 py-2 border-2 border-gray-200 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-500 hover:bg-blue-50 transition-all"
            >
              Next
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="panel-theme admin-panel min-h-screen bg-[var(--premium-bg-main)] text-[var(--premium-ink)]">
      {/* Header */}
      <div className="bg-[var(--premium-bg-elevated)]/95 backdrop-blur border-b border-[var(--premium-border)] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold font-display text-[var(--premium-ink)]">Admin Panel</h1>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--premium-blue)] text-white rounded-lg hover:bg-[#24496f] transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-[var(--premium-bg-surface)] border-b border-[var(--premium-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto">
            {[
              { id: 'overview', label: 'Dashboard', icon: BarChart3 },
              { id: 'inquiries', label: 'All Inquiries', icon: Mail },
              { id: 'vendors', label: 'Vendors', icon: Building2 },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'blogs', label: 'Blogs', icon: FileText },
              { id: 'reviews', label: 'Reviews', icon: Star },
              { id: 'media', label: 'Media', icon: Image },
              { id: 'payments', label: 'Payments', icon: CreditCard }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSearchTerm('');
                    setFilterStatus('all');
                  }}
                  className={`flex items-center gap-2 px-4 py-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-[var(--premium-gold)] text-[var(--premium-gold-dark)]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-[var(--premium-blue)]" />
          </div>
        ) : (
          <>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'inquiries' && renderInquiries()}
            {activeTab === 'vendors' && renderVendors()}
            {activeTab === 'users' && renderUsers()}
            {activeTab === 'blogs' && renderBlogs()}
            {activeTab === 'reviews' && renderReviews()}
            {activeTab === 'media' && renderMedia()}
            {activeTab === 'payments' && renderPayments()}
          </>
        )}
      </div>

      {/* Notification */}
      <Notification />
      {/* Details Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => setSelectedItem(null)}></div>
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 z-50 p-6 animate-modalSlideIn">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Details</h3>
              <button onClick={() => setSelectedItem(null)} className="text-gray-600 hover:text-gray-900"><X className="w-5 h-5" /></button>
            </div>

            {/* Vendor - CHECK FIRST (vendors have 'name' too, so check serviceType or contact) */}
            {(selectedItem.serviceType || selectedItem.contact) && (
              <div className="space-y-3">
                <p className="text-lg font-bold text-gray-900">{selectedItem.businessName || selectedItem.name}</p>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-700"><span className="font-semibold">Email:</span> {selectedItem.contact?.email || selectedItem.contactInfo?.email || 'N/A'}</p>
                  {selectedItem.contact?.phone && <p className="text-gray-700"><span className="font-semibold">Phone:</span> {selectedItem.contact.phone}</p>}
                  <p className="text-gray-600"><span className="font-semibold">Service:</span> {selectedItem.serviceType || 'N/A'}</p>
                  <p className="text-gray-600"><span className="font-semibold">City:</span> {selectedItem.city || 'N/A'}</p>
                  <p className="text-gray-600"><span className="font-semibold">Verified:</span> <span className={selectedItem.verified ? 'text-green-600 font-medium' : 'text-gray-500'}>{selectedItem.verified ? '✓ Yes' : 'No'}</span></p>
                  <p className="text-gray-600"><span className="font-semibold">Status:</span> <span className={selectedItem.isActive ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>{selectedItem.isActive ? 'Active' : 'Inactive'}</span></p>
                  {selectedItem.rating && <p className="text-gray-600"><span className="font-semibold">Rating:</span> {selectedItem.rating} ⭐ ({selectedItem.reviewCount || 0} reviews)</p>}
                  {selectedItem.pricing && (
                    <p className="text-gray-600"><span className="font-semibold">Pricing:</span> ₹{selectedItem.pricing.min?.toLocaleString()} - ₹{selectedItem.pricing.max?.toLocaleString()}</p>
                  )}
                </div>
              </div>
            )}

            {/* User - CHECK AFTER VENDOR */}
            {selectedItem.role && !selectedItem.serviceType && (
              <div className="space-y-2">
                <p className="text-lg font-bold">{selectedItem.name}</p>
                <p className="text-sm text-gray-600">{selectedItem.email}</p>
                {selectedItem.phone && <p className="text-sm text-gray-600">{selectedItem.phone}</p>}
                <p className="text-sm text-gray-500">Role: {selectedItem.role || 'user'}</p>
                <p className="text-sm text-gray-500">Joined: {selectedItem.createdAt ? new Date(selectedItem.createdAt).toLocaleString() : 'N/A'}</p>
              </div>
            )}

            {/* Inquiry */}
            {selectedItem.userName && (
              <div className="space-y-2">
                <p className="text-lg font-bold">Inquiry from {selectedItem.userName}</p>
                <p className="text-sm text-gray-600">Contact: {selectedItem.userContact} • {selectedItem.userEmail}</p>
                <p className="text-sm text-gray-500">Event: {selectedItem.eventType}</p>
                <p className="text-sm text-gray-500">City: {selectedItem.city || 'N/A'}</p>
                <p className="text-sm text-gray-500">Budget: ₹{selectedItem.budget || 'N/A'}</p>
                {selectedItem.message && <div className="mt-2 p-3 bg-gray-50 rounded-lg"><p className="text-sm text-gray-700">{selectedItem.message}</p></div>}
              </div>
            )}

            <div className="mt-6 text-right">
              <button onClick={() => setSelectedItem(null)} className="px-4 py-2 bg-gray-200 rounded-lg">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        type={confirmDialog.type}
        requireInput={confirmDialog.requireInput}
        inputPlaceholder={confirmDialog.inputPlaceholder}
        inputType={confirmDialog.inputType}
        selectOptions={confirmDialog.selectOptions}
      />

      {/* Blog Modal */}
      {showBlogModal && (
        <BlogModal 
          blog={editingBlog}
          onSave={handleSaveBlog}
          onClose={() => {
            setShowBlogModal(false);
            setEditingBlog(null);
          }}
          uploadingImage={uploadingImage}
          onImageUpload={handleImageUpload}
        />
      )}
    </div>
  );
};

// Blog Modal Component
const BlogModal = ({ blog, onSave, onClose, uploadingImage, onImageUpload }) => {
  const [formData, setFormData] = useState({
    title: blog?.title || '',
    slug: blog?.slug || '',
    excerpt: blog?.excerpt || '',
    content: blog?.content || '',
    featuredImage: typeof blog?.featuredImage === 'string' ? blog?.featuredImage : blog?.featuredImage?.url || '',
    category: blog?.category || 'Service Planning',
    tags: blog?.tags?.join(', ') || '',
    status: blog?.status || 'draft'
  });
  const [manualSlug, setManualSlug] = useState(!!blog?.slug);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      // Auto-generate slug from title if not manually set
      if (name === 'title' && !manualSlug) {
        newData.slug = value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      }
      return newData;
    });
  };

  const handleSlugChange = (e) => {
    setManualSlug(true);
    setFormData(prev => ({ ...prev, slug: e.target.value }));
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const imageData = await onImageUpload(file);
        // imageData is {url, publicId} from uploadBlogImage
        setFormData(prev => ({ ...prev, featuredImage: imageData }));
      } catch (error) {
        console.error('Image upload failed:', error);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Prepare blog data with proper structure
    const blogData = {
      title: formData.title,
      slug: formData.slug,
      excerpt: formData.excerpt,
      content: formData.content,
      // Handle featuredImage - can be string URL or {url, publicId} object
      featuredImage: typeof formData.featuredImage === 'object' && formData.featuredImage?.url
        ? formData.featuredImage
        : { url: formData.featuredImage, publicId: '' },
      category: formData.category,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      status: formData.status
    };
    
    onSave(blogData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black opacity-50" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-modalSlideIn">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-2xl font-bold text-gray-900">
            {blog ? '✏️ Edit Blog' : '➕ Create New Blog'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title & Category Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                placeholder="Enter an engaging blog title..."
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              >
                <option value="Service Planning">Service Planning</option>
                <option value="B2B Tips">B2B Tips</option>
                <option value="Maintenance Guides">Maintenance Guides</option>
                <option value="Technology Updates">Technology Updates</option>
                <option value="Vendor Guides">Vendor Guides</option>
                <option value="Industry News">Industry News</option>
              </select>
            </div>
          </div>

          {/* URL Slug - Auto-generated */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              URL Slug <span className="text-xs text-gray-500 font-normal">(auto-generated, editable)</span>
            </label>
            <input
              type="text"
              name="slug"
              value={formData.slug}
              onChange={handleSlugChange}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              placeholder="url-friendly-slug"
            />
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <span>🔗</span> URL: <span className="font-mono text-indigo-600">/blogs/{formData.slug || 'your-slug'}</span>
            </p>
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Excerpt <span className="text-red-500">*</span>
              <span className="text-xs text-gray-500 font-normal ml-2">(Brief summary - max 300 chars)</span>
            </label>
            <textarea
              name="excerpt"
              value={formData.excerpt}
              onChange={handleChange}
              required
              rows={3}
              maxLength={300}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
              placeholder="Write a compelling short description that will appear in blog cards..."
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{formData.excerpt.length}/300</p>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Content <span className="text-red-500">*</span>
              <span className="text-xs text-gray-500 font-normal ml-2">(Full blog post content)</span>
            </label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleChange}
              required
              rows={12}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-y"
              placeholder="Write your full blog content here...\n\nTips:\n• Use clear paragraphs\n• Add headings for sections\n• Keep it engaging and informative\n• Include relevant examples"
            />
          </div>

          {/* Featured Image */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Featured Image <span className="text-red-500">*</span>
            </label>
            <div className="space-y-3">
              {/* Upload Button - Primary Option */}
              <label className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold cursor-pointer transition-all shadow-md hover:shadow-lg">
                <Upload className="w-5 h-5" />
                {uploadingImage ? 'Uploading Image...' : 'Upload Featured Image'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={uploadingImage}
                />
              </label>
              
              {/* OR Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-gray-300"></div>
                <span className="text-sm text-gray-500 font-medium">OR</span>
                <div className="flex-1 border-t border-gray-300"></div>
              </div>
              
              {/* URL Input - Secondary Option */}
              <input
                type="url"
                name="featuredImage"
                value={typeof formData.featuredImage === 'object' ? formData.featuredImage?.url || '' : formData.featuredImage}
                onChange={(e) => setFormData(prev => ({ ...prev, featuredImage: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                placeholder="Or paste image URL here..."
              />
              
              {/* Image Preview */}
              {(typeof formData.featuredImage === 'string' ? formData.featuredImage : formData.featuredImage?.url) && (
                <div className="relative rounded-xl overflow-hidden border-2 border-indigo-200">
                  <img 
                    src={typeof formData.featuredImage === 'string' ? formData.featuredImage : formData.featuredImage?.url} 
                    alt="Featured preview" 
                    className="w-full h-64 object-cover"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/800x400?text=Image+Not+Found';
                    }}
                  />
                  <div className="absolute top-2 right-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, featuredImage: '' }))}
                      className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-all shadow-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tags & Status Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Tags <span className="text-xs text-gray-500 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                placeholder="HVAC, security, plumbing, electrical, IT services (comma-separated)"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              >
                <option value="draft">📝 Draft</option>
                <option value="published">✅ Published</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 justify-end pt-4 border-t-2 border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-bold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl"
            >
              {blog ? 'Update Blog' : 'Create Blog'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminPanel;
