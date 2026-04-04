/**
 * Production-Ready User Panel
 * Real-time inquiry tracking synchronized with admin decisions
 * 
 * Features:
 * - View all inquiry statuses (pending/approved/rejected)
 * - Real-time status updates from admin
 * - Inquiry history with vendor responses
 * - Profile management
 * - Responsive professional design
 */

import React, { useState, useEffect } from 'react';
import {
  User, Mail, Phone, Calendar, MapPin, Edit, FileText, Lock,
  Clock, CheckCircle, XCircle, RefreshCw, Eye, TrendingUp,
  Building2, IndianRupee, MessageCircle, AlertCircle, Bell, X,
  Activity, Award, Zap, Star, Target, Send, Search, Plus
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import StatusBadge from '../components/StatusBadge';
import { fetchAllInquiries, apiClient } from '../services/api';

const UserDashboard = () => {
  const { user } = useAuth();

  // State Management
  const [activeTab, setActiveTab] = useState('inquiries');
  const [loading, setLoading] = useState(false);
  const [inquiries, setInquiries] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    responded: 0
  });
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [notification, setNotification] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterEventDate, setFilterEventDate] = useState('');
  const [filterDateType, setFilterDateType] = useState('service');
  const [inquirySort, setInquirySort] = useState('newest');
  const [inquiryPage, setInquiryPage] = useState(1);
  const inquiriesPerPage = 10;

  const normalizePhoneInput = (value = '') => {
    const digitsOnly = String(value).replace(/\D/g, '');
    const withoutCountryCode = digitsOnly.startsWith('91') ? digitsOnly.slice(2) : digitsOnly;
    return withoutCountryCode.slice(0, 10);
  };

  // Profile State
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: normalizePhoneInput(user?.phone || '')
  });
  const [editMode, setEditMode] = useState(false);
  const [profileErrors, setProfileErrors] = useState({ name: '', phone: '' });
  const [profileTouched, setProfileTouched] = useState({ name: false, phone: false });
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    loadInquiries();
  }, []);

  // Load data on tab change
  useEffect(() => {
    if (activeTab === 'inquiries') {
      loadInquiries();
    }
  }, [activeTab]); // Removed auto-refresh interval

  const getLifecycleStatus = (inquiry) => {
    if (inquiry.approvalStatus === 'rejected') return 'declined';
    if (inquiry.vendorResponse) return inquiry.rejectionReason ? 'declined' : 'accepted';
    if (inquiry.approvalStatus === 'approved') return 'sent';
    return 'waiting';
  };

  // Load User Inquiries
  const loadInquiries = async () => {
    setLoading(true);
    try {
      const data = await fetchAllInquiries();

      const inquiriesArray = Array.isArray(data)
        ? data
        : (data?.inquiries || []);

      setInquiries(inquiriesArray);

      setStats({
        total: inquiriesArray.length,
        pending: inquiriesArray.filter(i => getLifecycleStatus(i) === 'waiting').length,
        approved: inquiriesArray.filter(i => getLifecycleStatus(i) === 'sent').length,
        rejected: inquiriesArray.filter(i => getLifecycleStatus(i) === 'declined').length,
        responded: inquiriesArray.filter(i => getLifecycleStatus(i) === 'accepted').length
      });
    } catch (error) {
      console.error('Error fetching inquiries:', error);
      showNotification('error', 'Failed to load inquiries');
      setInquiries([]);
      setStats({ total: 0, pending: 0, approved: 0, rejected: 0, responded: 0 });
    } finally {
      setLoading(false);
    }
  };

  const normalizePhoneForValidation = (value = '') => {
    return normalizePhoneInput(value);
  };

  const validateProfileForm = (values) => {
    const errors = { name: '', phone: '' };
    const trimmedName = values.name?.trim() || '';

    if (!trimmedName) {
      errors.name = 'Full name is required.';
    } else if (trimmedName.length < 2) {
      errors.name = 'Full name must be at least 2 characters.';
    } else if (trimmedName.length > 60) {
      errors.name = 'Full name cannot exceed 60 characters.';
    } else if (!/^[A-Za-z][A-Za-z\s.'-]*$/.test(trimmedName)) {
      errors.name = 'Use only letters, spaces, dots, apostrophes, or hyphens.';
    }

    const normalizedPhone = normalizePhoneForValidation(values.phone);
    if (values.phone?.trim() && !/^[6-9]\d{9}$/.test(normalizedPhone)) {
      errors.phone = 'Enter a valid Indian mobile number (10 digits, starting with 6-9).';
    }

    return errors;
  };

  const setProfileField = (field, rawValue) => {
    const value = field === 'name'
      ? rawValue.replace(/\s{2,}/g, ' ')
      : normalizePhoneInput(rawValue);
    const nextData = { ...profileData, [field]: value };
    setProfileData(nextData);

    if (profileTouched[field]) {
      const nextErrors = validateProfileForm(nextData);
      setProfileErrors(nextErrors);
    }
  };

  const handleProfileBlur = (field) => {
    const nextTouched = { ...profileTouched, [field]: true };
    setProfileTouched(nextTouched);
    setProfileErrors(validateProfileForm(profileData));
  };

  // Update Profile
  const handleUpdateProfile = async () => {
    const errors = validateProfileForm(profileData);
    setProfileErrors(errors);
    setProfileTouched({ name: true, phone: true });

    const firstError = errors.name || errors.phone;
    if (firstError) {
      showNotification('error', firstError);
      return;
    }

    try {
      setProfileSaving(true);
      const normalizedPhone = normalizePhoneForValidation(profileData.phone);

      // Never send email - it's the account identifier and must not change
      const updatePayload = {
        name: profileData.name.trim(),
        phone: normalizedPhone || ''
      };
      const data = await apiClient.put('/users/profile', updatePayload);
      if (data.success) {
        showNotification('success', 'Profile updated successfully');
        setProfileData((prev) => ({
          ...prev,
          name: prev.name.trim(),
          phone: normalizedPhone || ''
        }));
        setEditMode(false);
      } else {
        showNotification('error', data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      showNotification('error', 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  // Show Notification
  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Refresh Data
  const handleRefresh = () => {
    loadInquiries();
    showNotification('info', 'Data refreshed');
  };

  // Helper: safely extract start date from eventDate (which may be {start,end} or a raw Date string)
  const getEventStartDate = (eventDate) => {
    if (!eventDate) return null;
    const raw = eventDate?.start || eventDate;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatEventDate = (eventDate) => {
    const d = getEventStartDate(eventDate);
    if (!d) return 'Not Set';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatEventDateRange = (eventDate) => {
    if (!eventDate) return 'Not Set';
    if (eventDate?.start) {
      const start = new Date(eventDate.start);
      if (isNaN(start.getTime())) return 'Not Set';
      const end = eventDate.end ? new Date(eventDate.end) : null;
      const startStr = start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      if (!end || isNaN(end.getTime()) || start.toDateString() === end.toDateString()) return startStr;
      return `${startStr} – ${end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    }
    const d = new Date(eventDate);
    if (isNaN(d.getTime())) return 'Not Set';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Filter Inquiries
  const filteredInquiries = inquiries.filter(inquiry => {
    // Status filter
    const lifecycleStatus = getLifecycleStatus(inquiry);
    const statusMatch = filterStatus === 'all' || lifecycleStatus === filterStatus;
    if (!statusMatch) return false;

    // Date filter — created or service date based on filterDateType
    if (filterEventDate) {
      const rawDate = filterDateType === 'created'
        ? new Date(inquiry.createdAt)
        : getEventStartDate(inquiry.eventDate);
      if (!rawDate || isNaN(rawDate.getTime())) return false;
      const tzOffset = rawDate.getTimezoneOffset() * 60000;
      const localString = new Date(rawDate.getTime() - tzOffset).toISOString().split('T')[0];
      if (localString !== filterEventDate) return false;
    }

    return true;
  });

  const sortedInquiries = [...filteredInquiries].sort((a, b) => {
    if (inquirySort === 'event-date-asc' || inquirySort === 'event-date-desc') {
      const aDate = (getEventStartDate(a.eventDate) || new Date(0)).getTime();
      const bDate = (getEventStartDate(b.eventDate) || new Date(0)).getTime();
      return inquirySort === 'event-date-asc' ? aDate - bDate : bDate - aDate;
    }
    const aCreated = new Date(a.createdAt || 0).getTime();
    const bCreated = new Date(b.createdAt || 0).getTime();
    if (inquirySort === 'oldest') return aCreated - bCreated;
    return bCreated - aCreated;
  });

  // Pagination
  const inquiryTotalPages = Math.max(1, Math.ceil(sortedInquiries.length / inquiriesPerPage));
  const safeInquiryPage = Math.min(inquiryPage, inquiryTotalPages);
  const inquiryStartIndex = (safeInquiryPage - 1) * inquiriesPerPage;
  const paginatedInquiries = sortedInquiries.slice(inquiryStartIndex, inquiryStartIndex + inquiriesPerPage);

  useEffect(() => {
    setInquiryPage(1);
  }, [filterStatus, filterEventDate, filterDateType, inquirySort]);

  useEffect(() => {
    if (inquiryPage > inquiryTotalPages) {
      setInquiryPage(inquiryTotalPages);
    }
  }, [inquiryPage, inquiryTotalPages]);

  // Enhanced Stats Card Component with gradients and animations
  const StatsCard = ({ title, value, subtitle, icon: Icon, gradient, accentColor }) => (
    <div className="group relative bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
      {/* Gradient background overlay */}
      <div className={`absolute inset-0 ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>

      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-11 h-11 rounded-xl ${gradient} flex items-center justify-center shadow-md transform group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className={`text-xs font-bold ${accentColor} bg-opacity-10 px-2.5 py-0.5 rounded-full`}>
            {((value / (stats?.total || 1)) * 100).toFixed(0)}%
          </div>
        </div>
        <div>
          <p className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            {value}
          </p>
          <p className="text-sm font-bold text-gray-700 mt-1">{title}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      
      {/* Decorative corner element */}
      <div className={`absolute -right-4 -bottom-4 w-24 h-24 ${gradient} opacity-5 rounded-full`}></div>
    </div>
  );

  // Enhanced Notification Component
  const Notification = () => {
    if (!notification) return null;
    
    const config = {
      success: { 
        bg: 'bg-gradient-to-r from-green-500 to-emerald-600', 
        icon: CheckCircle,
        border: 'border-green-400'
      },
      error: { 
        bg: 'bg-gradient-to-r from-red-500 to-pink-600', 
        icon: XCircle,
        border: 'border-red-400'
      },
      info: { 
        bg: 'bg-gradient-to-r from-blue-500 to-indigo-600', 
        icon: Bell,
        border: 'border-blue-400'
      }
    };
    
    const { bg, icon: Icon, border } = config[notification.type] || config.info;
    
    return (
      <div className={`fixed top-6 right-6 z-50 ${bg} text-white px-6 py-4 rounded-2xl shadow-2xl border-2 ${border} flex items-center gap-3 animate-slide-in-right max-w-md`}>
        <div className="w-10 h-10 bg-white bg-opacity-20 backdrop-blur-sm rounded-xl flex items-center justify-center">
          <Icon className="w-6 h-6" />
        </div>
        <span className="font-bold flex-1">{notification.message}</span>
        <button 
          onClick={() => setNotification(null)} 
          className="ml-2 hover:bg-white hover:bg-opacity-20 rounded-lg p-1 transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    );
  };


  // Inquiry Progress Tracker — 4-step visual timeline
  // Step logic based on: approvalStatus + status (db fields) + vendorResponse
  const InquiryProgress = ({ inquiry, compact = false }) => {
    const lifecycleStatus = getLifecycleStatus(inquiry);
    const rejected = inquiry.approvalStatus === 'rejected';
    const approved = inquiry.approvalStatus === 'approved';
    const forwarded = approved && (inquiry.status === 'contacted' || inquiry.status === 'responded' || inquiry.vendorResponse);
    const responded = !!inquiry.vendorResponse || inquiry.status === 'responded';

    const steps = [
      {
        id: 1,
        label: 'Submitted',
        sublabel: 'Inquiry received',
        done: true,
        active: !approved && !rejected,
        color: 'green'
      },
      {
        id: 2,
        label: rejected ? 'Declined' : 'Processing',
        sublabel: rejected
          ? (inquiry.rejectionReason ? `Reason: ${inquiry.rejectionReason}` : 'Not accepted')
          : approved ? 'Matched and sent to vendor' : 'We are processing your request...',
        done: approved || rejected,
        active: !approved && !rejected,
        failed: rejected,
        color: rejected ? 'red' : 'green'
      },
      {
        id: 3,
        label: 'Sent to Vendor',
        sublabel: forwarded ? `Sent to ${inquiry.vendorDetails?.businessName || 'vendor'}` : 'Waiting to send',
        done: forwarded,
        active: approved && !forwarded,
        color: 'green',
        hidden: rejected
      },
      {
        id: 4,
        label: lifecycleStatus === 'declined' ? 'Declined' : lifecycleStatus === 'accepted' ? 'Accepted' : 'Vendor Response',
        sublabel: responded ? (lifecycleStatus === 'declined' ? 'Vendor declined this inquiry' : 'Vendor has replied') : 'Awaiting reply',
        done: responded,
        active: forwarded && !responded,
        color: 'green',
        hidden: rejected
      }
    ];

    if (compact) {
      // Compact horizontal stepper for inquiry cards
      const visibleSteps = steps.filter(s => !s.hidden);
      return (
        <div className="flex items-center gap-0 w-full mt-1.5 mb-0.5">
          {visibleSteps.map((step, idx) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center min-w-0">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border-2 ${
                  step.failed
                    ? 'bg-red-500 border-red-500 text-white'
                    : step.done
                    ? 'bg-green-500 border-green-500 text-white'
                    : step.active
                    ? 'bg-white border-blue-500 text-blue-600'
                    : 'bg-gray-100 border-gray-300 text-gray-400'
                }`}>
                  {step.failed ? <XCircle className="w-3 h-3" /> : step.done ? <CheckCircle className="w-3 h-3" /> : <span>{step.id}</span>}
                </div>
                <span className={`text-xs mt-1 font-semibold text-center leading-tight ${
                  step.failed ? 'text-red-600' : step.done ? 'text-green-700' : step.active ? 'text-blue-600' : 'text-gray-400'
                }`} style={{fontSize: '10px', maxWidth: 56}}>{step.label}</span>
              </div>
              {idx < visibleSteps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 rounded-full ${
                  visibleSteps[idx + 1].done || visibleSteps[idx + 1].active ? 'bg-green-400' : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      );
    }

    // Full vertical stepper for detail modal
    const visibleSteps = steps.filter(s => !s.hidden);
    return (
      <div className="bg-white rounded-2xl border-2 border-gray-100 p-5">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Inquiry Progress</p>
        <div className="space-y-0">
          {visibleSteps.map((step, idx) => (
            <div key={step.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 border-2 ${
                  step.failed
                    ? 'bg-red-500 border-red-500 text-white'
                    : step.done
                    ? 'bg-green-500 border-green-500 text-white'
                    : step.active
                    ? 'bg-white border-blue-500 text-blue-600 ring-2 ring-blue-200'
                    : 'bg-gray-50 border-gray-200 text-gray-400'
                }`}>
                  {step.failed ? <XCircle className="w-4 h-4" /> : step.done ? <CheckCircle className="w-4 h-4" /> : <span>{step.id}</span>}
                </div>
                {idx < visibleSteps.length - 1 && (
                  <div className={`w-0.5 h-8 my-1 ${
                    visibleSteps[idx + 1].done || visibleSteps[idx + 1].active ? 'bg-green-300' : 'bg-gray-200'
                  }`} />
                )}
              </div>
              <div className="pb-4">
                <p className={`text-sm font-bold ${
                  step.failed ? 'text-red-700' : step.done ? 'text-green-800' : step.active ? 'text-blue-700' : 'text-gray-400'
                }`}>{step.label}</p>
                <p className={`text-xs mt-0.5 ${
                  step.failed ? 'text-red-600' : step.done ? 'text-green-600' : step.active ? 'text-blue-500' : 'text-gray-400'
                }`}>{step.sublabel}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Inquiries Tab
  const renderInquiries = () => (
    <div className="space-y-4">
      {/* Enhanced Statistics Section */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Inquiry Overview</h2>
            <p className="text-sm text-gray-600 mt-1">Track your service planning progress</p>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span className="text-sm font-bold text-gray-900">Activity Score: {Math.min(100, (stats?.total || 0) * 10)}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatsCard
            title="Total Inquiries"
            value={stats?.total || 0}
            subtitle="All your inquiries"
            icon={Target}
            gradient="bg-gradient-to-br from-blue-600 to-indigo-600"
            accentColor="text-blue-600"
          />
          <StatsCard
            title="Pending Review"
            value={stats?.pending || 0}
            subtitle="Awaiting approval"
            icon={Clock}
            gradient="bg-gradient-to-br from-yellow-500 to-orange-500"
            accentColor="text-yellow-600"
          />
          <StatsCard
            title="Approved"
            value={stats?.approved || 0}
            subtitle="Sent to service providers"
            icon={CheckCircle}
            gradient="bg-gradient-to-br from-blue-600 to-indigo-600"
            accentColor="text-blue-600"
          />
          <StatsCard
            title="Rejected"
            value={stats?.rejected || 0}
            subtitle="Not approved"
            icon={XCircle}
            gradient="bg-gradient-to-br from-blue-600 to-indigo-600"
            accentColor="text-blue-600"
          />
          <StatsCard
            title="Responses"
            value={stats?.responded || 0}
            subtitle="Service provider replied"
            icon={Award}
            gradient="bg-gradient-to-br from-blue-600 to-indigo-600"
            accentColor="text-blue-600"
          />
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-3 overflow-hidden">
        {/* Bar header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Filter & Sort</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-bold text-xs shadow-sm">
              {filteredInquiries.length} {filteredInquiries.length === 1 ? 'Inquiry' : 'Inquiries'}
            </span>
            {(filterStatus !== 'all' || filterEventDate || filterDateType !== 'service' || inquirySort !== 'newest') && (
              <button
                onClick={() => { setFilterStatus('all'); setFilterDateType('service'); setFilterEventDate(''); setInquirySort('newest'); }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
              >
                <X className="w-3 h-3" /> Reset All
              </button>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 border-t border-blue-100/70 bg-white/80">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* Date Type */}
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-gray-600 mb-1.5 block">Date Type</label>
              <select
                value={filterDateType}
                onChange={(e) => { setFilterDateType(e.target.value); setFilterEventDate(''); }}
                className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-semibold text-gray-900 transition-all bg-white"
              >
                <option value="event">Service Schedule</option>
                <option value="created">Submitted Date</option>
              </select>
            </div>

            {/* Search by Date */}
            <div className="md:col-span-3">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-600">Search by Date</label>
                {filterEventDate && <button onClick={() => setFilterEventDate('')} className="text-xs font-semibold text-red-500 hover:text-red-600">Clear</button>}
              </div>
              <input
                type="date"
                value={filterEventDate}
                onChange={(e) => setFilterEventDate(e.target.value)}
                className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-semibold text-gray-900 transition-all bg-white"
              />
            </div>

            {/* Status */}
            <div className="md:col-span-4">
              <label className="text-xs font-bold text-gray-600 mb-1.5 block">Inquiry Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-semibold text-gray-900 transition-all bg-white"
              >
                <option value="all">All Inquiries ({inquiries.length})</option>
                <option value="waiting">In Queue ({stats?.pending || 0})</option>
                <option value="sent">Sent to Service Provider ({stats?.approved || 0})</option>
                <option value="accepted">Service Provider Accepted ({stats?.responded || 0})</option>
                <option value="declined">Declined ({stats?.rejected || 0})</option>
              </select>
            </div>

            {/* Sort */}
            <div className="md:col-span-3">
              <label className="text-xs font-bold text-gray-600 mb-1.5 block">Sort By</label>
              <select
                value={inquirySort}
                onChange={(e) => setInquirySort(e.target.value)}
                className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-semibold text-gray-900 transition-all bg-white"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="event-date-asc">Service Schedule (Earliest)</option>
                <option value="event-date-desc">Service Schedule (Latest)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Inquiries List */}
      <div className="bg-white/60 rounded-2xl p-3 border border-gray-100">
        <div className="space-y-2">
        {sortedInquiries.length > 0 ? paginatedInquiries.map((inquiry, index) => (
          <div
            key={inquiry._id}
            onClick={() => setSelectedInquiry(inquiry)}
            className="group bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all duration-200 cursor-pointer"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Row 1: Index + Event type + Status badge + Submitted date */}
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-bold text-blue-600 flex-shrink-0">{inquiryStartIndex + index + 1}.</span>
                <p className="font-bold text-gray-900 text-sm truncate">{inquiry.eventType}</p>
                <span className="text-gray-300 hidden sm:block">·</span>
                <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:block">#{inquiry._id.slice(-6)}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-gray-400 hidden sm:block">
                  {new Date(inquiry.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                </span>
                {(() => {
                  const lifecycleStatus = getLifecycleStatus(inquiry);
                  if (lifecycleStatus === 'declined') {
                    return (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                        <XCircle className="w-3 h-3" /> Declined
                      </span>
                    );
                  }
                  if (lifecycleStatus === 'accepted') {
                    return (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                        <MessageCircle className="w-3 h-3" /> Accepted
                      </span>
                    );
                  }
                  if (lifecycleStatus === 'sent') {
                    return (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                        <CheckCircle className="w-3 h-3" /> Sent to Service Provider
                      </span>
                    );
                  }
                  return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                      <Clock className="w-3 h-3" /> In Queue
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* Row 2: Details pills */}
            <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap mb-1.5">
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3 text-gray-400" />
                <span className="font-medium text-gray-700 truncate max-w-[110px]">{inquiry.vendorDetails?.businessName || 'General'}</span>
              </span>
              <span className="text-gray-200">|</span>
              <span className="flex items-center gap-1">
                <IndianRupee className="w-3 h-3 text-gray-400" />
                <span className="font-medium text-gray-700">₹{inquiry.budget?.toLocaleString()}</span>
              </span>
              <span className="text-gray-200">|</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-gray-400" />
                <span className="font-medium text-gray-700">{inquiry.city || 'N/A'}</span>
              </span>
              <span className="text-gray-200">|</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-gray-400" />
                <span className="font-medium text-gray-700">{formatEventDate(inquiry.eventDate)}</span>
              </span>
            </div>

            {/* Row 3: Progress tracker */}
            <InquiryProgress inquiry={inquiry} compact={true} />

            {/* Conditional alerts — compact single line */}
            {getLifecycleStatus(inquiry) === 'declined' && inquiry.rejectionReason && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-red-700 bg-red-50 px-2 py-1 rounded-lg">
                <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="font-semibold">Reason:</span>
                <span className="truncate">{inquiry.rejectionReason}</span>
              </div>
            )}
            {inquiry.approvalStatus === 'approved' && inquiry.vendorResponse && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded-lg">
                <MessageCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="font-semibold">Response:</span>
                <span className="truncate">{inquiry.vendorResponse}</span>
              </div>
            )}

            {/* Row 4: View details hint */}
            <div className="mt-2 flex items-center justify-end gap-1 text-xs text-gray-400 group-hover:text-blue-500 transition-colors select-none">
              <Eye className="w-3 h-3" />
              <span>View details</span>
            </div>
          </div>
        )) : (
          <div className="relative bg-gradient-to-br from-white to-blue-50 rounded-2xl p-10 text-center border-2 border-dashed border-blue-200 overflow-hidden">
            <div className="absolute inset-0 bg-blue-600 opacity-5"></div>
            <div className="relative z-10">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center transform rotate-3">
                <Send className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No inquiries found</h3>
              <p className="text-gray-500 mb-5 max-w-sm mx-auto text-sm">
                {filterStatus === 'all'
                  ? "Start your service planning journey by sending your first inquiry to service providers!"
                  : "No inquiries match this filter. Try selecting a different option."}
              </p>
              {filterStatus === 'all' && (
                <button
                  onClick={() => window.location.href = '/search'}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  <Plus className="w-4 h-4" />
                  Create Your First Inquiry
                </button>
              )}
            </div>
          </div>
        )}

        {/* Pagination Controls */}
        {sortedInquiries.length > 0 && inquiryTotalPages > 1 && (
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
            <p className="text-sm text-gray-600 font-medium">
              Showing {inquiryStartIndex + 1} to {Math.min(inquiryStartIndex + inquiriesPerPage, sortedInquiries.length)} of {sortedInquiries.length} inquiries
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setInquiryPage((p) => Math.max(1, p - 1))}
                disabled={safeInquiryPage === 1}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700"
              >
                Prev
              </button>
              <div className="hidden sm:flex items-center gap-1 mx-1">
                {Array.from({ length: inquiryTotalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    if (inquiryTotalPages <= 7) return true;
                    return page === 1 || page === inquiryTotalPages || Math.abs(page - safeInquiryPage) <= 1;
                  })
                  .map((page, idx, arr) => (
                    <React.Fragment key={page}>
                      {idx > 0 && arr[idx - 1] !== page - 1 && (
                        <span className="px-1 text-gray-400 text-sm font-medium">...</span>
                      )}
                      <button
                        onClick={() => setInquiryPage(page)}
                        className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${
                          safeInquiryPage === page
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                            : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  ))}
              </div>
              <button
                onClick={() => setInquiryPage((p) => Math.min(inquiryTotalPages, p + 1))}
                disabled={safeInquiryPage === inquiryTotalPages}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );

  // Profile Tab
  const renderProfile = () => (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gradient-to-br from-white to-blue-50 rounded-3xl p-8 shadow-2xl border border-gray-200 overflow-hidden relative">
        {/* Decorative background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-400 to-indigo-600 opacity-5 rounded-full -translate-y-32 translate-x-32"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl">
                <User className="w-9 h-9 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Your Profile</h2>
                <p className="text-sm text-gray-600 mt-1">Manage your personal information</p>
              </div>
            </div>
            {!editMode ? (
              <button
                onClick={() => {
                  setEditMode(true);
                  setProfileErrors({ name: '', phone: '' });
                  setProfileTouched({ name: false, phone: false });
                }}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold transform hover:-translate-y-0.5 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Edit className="w-5 h-5" />
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={handleUpdateProfile}
                  disabled={profileSaving}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-bold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {profileSaving ? 'Saving...' : '✔ Save'}
                </button>
                <button
                  onClick={() => {
                    setEditMode(false);
                    setProfileData({
                      name: user?.name || '',
                      email: user?.email || '',
                      phone: normalizePhoneInput(user?.phone || '')
                    });
                    setProfileErrors({ name: '', phone: '' });
                    setProfileTouched({ name: false, phone: false });
                  }}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold transition-all duration-200"
                >
                  ✖ Cancel
                </button>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">Full Name</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileField('name', e.target.value)}
                  onBlur={() => handleProfileBlur('name')}
                  disabled={!editMode}
                  maxLength={60}
                  className={`w-full pl-12 pr-4 py-4 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 font-semibold text-gray-900 transition-all ${
                    profileTouched.name && profileErrors.name ? 'border-red-400 bg-red-50/40' : 'border-gray-200'
                  }`}
                  placeholder="Enter your full name"
                />
              </div>
              {profileTouched.name && profileErrors.name && (
                <p className="mt-2 text-xs text-red-600 font-semibold">{profileErrors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">
                Email Address
                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-semibold rounded-full border border-gray-200">
                  <Lock className="w-3 h-3" />
                  Cannot be changed
                </span>
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  value={profileData.email}
                  disabled
                  className="w-full pl-12 pr-12 py-4 border-2 border-gray-200 rounded-xl bg-gray-50 font-semibold text-gray-500 cursor-not-allowed"
                  placeholder="your.email@example.com"
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <Lock className="w-4 h-4 text-gray-400" />
                </div>
              </div>
              <p className="mt-1.5 text-xs text-gray-500 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Email is linked to your account and cannot be modified.
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">Phone Number</label>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
                <span className="absolute left-12 top-1/2 -translate-y-1/2 text-gray-600 font-semibold pointer-events-none">
                  +91
                </span>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileField('phone', e.target.value)}
                  onBlur={() => handleProfileBlur('phone')}
                  disabled={!editMode}
                  inputMode="numeric"
                  maxLength={10}
                  className={`w-full pl-[92px] pr-4 py-4 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 font-semibold text-gray-900 transition-all ${
                    profileTouched.phone && profileErrors.phone ? 'border-red-400 bg-red-50/40' : 'border-gray-200'
                  }`}
                  placeholder="9876543210"
                />
              </div>
              {profileTouched.phone && profileErrors.phone ? (
                <p className="mt-2 text-xs text-red-600 font-semibold">{profileErrors.phone}</p>
              ) : (
                <p className="mt-2 text-xs text-gray-500">Optional. Enter only 10 digits after +91.</p>
              )}
            </div>
          </div>

          {/* Account Stats */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Account Statistics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-900">{stats?.total || 0}</p>
                    <p className="text-xs font-semibold text-blue-700">Total Inquiries</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-900">{stats?.responded || 0}</p>
                    <p className="text-xs font-semibold text-purple-700">Responses Received</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Welcome Banner Component
  const WelcomeBanner = () => (
    <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-2xl p-6 shadow-xl overflow-hidden mb-5">
      {/* Animated background patterns */}
      {/* decorative fades removed to maintain consistent theme */}
      
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <User className="w-6 h-6 text-blue-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Welcome back, {user?.name?.split(' ')[0] || 'User'}! 👋</h1>
              <p className="text-blue-100 text-xs mt-0.5">Manage your service inquiries and track responses</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <div className="flex items-center gap-2 bg-blue-600 bg-opacity-30 px-4 py-2 rounded-lg">
              <Target className="w-5 h-5 text-white" />
              <span className="text-white font-semibold">{stats?.total || 0} Total Inquiries</span>
            </div>
            <div className="flex items-center gap-2 bg-blue-600 bg-opacity-30 px-4 py-2 rounded-lg">
              <Activity className="w-5 h-5 text-white" />
              <span className="text-white font-semibold">{stats?.responded || 0} Responses</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          <button
            onClick={() => window.location.href = '/search'}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-blue-600 rounded-xl font-bold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            New Inquiry
          </button>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 bg-opacity-30 text-white rounded-xl font-semibold hover:bg-opacity-40 transition-all duration-200"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );

  // Main Render
  return (
    <div className="panel-theme user-panel min-h-screen bg-[var(--premium-bg-main)]">
      {/* Notification */}
      <Notification />

      {/* Enhanced Detail Modal */}
      {selectedInquiry && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl transform animate-scale-in">
            {/* Modal Header with Gradient */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-700" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Inquiry Details</h3>
                    <p className="text-blue-100 text-sm mt-1">#{selectedInquiry._id.slice(-8)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedInquiry(null)}
                  className="text-white hover:bg-black/10 p-2 rounded-xl transition-all"
                  aria-label="Close inquiry details"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>
            
            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
              <div className="space-y-6">
                {/* Status Progress Tracker */}
                <InquiryProgress inquiry={selectedInquiry} compact={false} />

                {/* Key Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-blue-700 uppercase mb-1">Service Type</p>
                        <p className="font-bold text-blue-900 text-lg">{selectedInquiry.eventType}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <IndianRupee className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-blue-700 uppercase mb-1">Budget</p>
                        <p className="font-bold text-blue-900 text-lg">₹{selectedInquiry.budget?.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-blue-700 uppercase mb-1">City</p>
                        <p className="font-bold text-blue-900 text-lg">{selectedInquiry.city || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-blue-700 uppercase mb-1">Service Provider</p>
                        <p className="font-bold text-blue-900 text-lg">{selectedInquiry.vendorDetails?.businessName || (selectedInquiry.vendorId?.businessName) || 'General'}</p>
                        {(selectedInquiry.vendorDetails?.serviceType || selectedInquiry.vendorId?.serviceType) && (
                          <p className="text-xs text-blue-700 mt-0.5">{selectedInquiry.vendorDetails?.serviceType || selectedInquiry.vendorId?.serviceType}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200 md:col-span-2">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-blue-700 uppercase mb-1">Service Schedule</p>
                        <p className="font-bold text-blue-900 text-lg">{formatEventDateRange(selectedInquiry.eventDate)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Your Contact Information */}
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Your Submitted Details</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Name</p>
                        <p className="text-sm font-semibold text-gray-900">{selectedInquiry.userName || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Contact</p>
                        <p className="text-sm font-semibold text-gray-900">{selectedInquiry.userContact || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="text-sm font-semibold text-gray-900 break-all">{selectedInquiry.userEmail || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Your Message */}
                {selectedInquiry.message && (
                  <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-6 border-2 border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageCircle className="w-5 h-5 text-gray-700" />
                      <h4 className="font-bold text-gray-900">Your Message</h4>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{selectedInquiry.message}</p>
                  </div>
                )}

                {/* Vendor Response */}
                {selectedInquiry.approvalStatus === 'approved' && selectedInquiry.vendorResponse && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-300">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <MessageCircle className="w-4 h-4 text-white" />
                      </div>
                      <h4 className="font-bold text-blue-900">Service Provider Response</h4>
                    </div>
                    <p className="text-blue-800 leading-relaxed font-medium">{selectedInquiry.vendorResponse}</p>
                  </div>
                )}

                {/* Timestamps */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Timeline</p>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-600 font-semibold w-28">Submitted:</span>
                    <span className="text-gray-900 font-bold">{new Date(selectedInquiry.createdAt).toLocaleString('en-IN')}</span>
                  </div>
                  {selectedInquiry.approvedAt && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-gray-600 font-semibold w-28">
                        {selectedInquiry.approvalStatus === 'rejected' ? 'Rejected:' : 'Approved:'}
                      </span>
                      <span className="text-gray-900 font-bold">{new Date(selectedInquiry.approvedAt).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {selectedInquiry.updatedAt && selectedInquiry.updatedAt !== selectedInquiry.createdAt && (
                    <div className="flex items-center gap-2 text-sm">
                      <RefreshCw className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-600 font-semibold w-28">Last Update:</span>
                      <span className="text-gray-900 font-bold">{new Date(selectedInquiry.updatedAt).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {selectedInquiry.rejectionReason && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-xs font-bold text-red-700 uppercase mb-1">Rejection Reason</p>
                      <p className="text-sm text-red-800">{selectedInquiry.rejectionReason}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header (now white and scrolls with page) */}
      <div className="bg-white border-b border-[var(--premium-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: 'var(--premium-blue)' }}>
                <User className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold font-display text-[var(--premium-blue)]">My Dashboard</h1>
                <p className="text-sm text-[var(--premium-ink-soft)]">Track and manage your service inquiries</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl shadow-sm bg-gradient-to-r from-[var(--premium-blue)] to-[#24496f]">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-white">All systems operational</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs - Enhanced */}
      <div className="bg-[var(--premium-bg-elevated)] border-b border-[var(--premium-border)] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-2">
            {[
              { id: 'inquiries', label: 'My Inquiries', count: inquiries.length, icon: FileText },
              { id: 'profile', label: 'Profile', icon: User }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-6 py-4 font-bold transition-all duration-200 ${
                    isActive
                      ? 'text-blue-700 bg-gradient-to-r from-blue-50 to-indigo-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`ml-2 px-2.5 py-0.5 text-xs font-bold rounded-full ${
                      isActive 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-200 text-gray-700'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-full"></div>
                    )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        {activeTab === 'inquiries' && <WelcomeBanner />}
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-blue-200 rounded-full animate-pulse"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <RefreshCw className="w-10 h-10 text-blue-600 animate-spin" />
              </div>
            </div>
            <p className="mt-4 text-gray-600 font-semibold">Loading your dashboard...</p>
          </div>
        ) : (
          <>
            {activeTab === 'inquiries' && renderInquiries()}
            {activeTab === 'profile' && renderProfile()}
          </>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
