/**
 * Production-Ready Vendor Panel
 * Real-time inquiry management synchronized with admin panel
 * 
 * Features:
 * - Real-time approved inquiries (only admin-approved)
 * - Professional dashboard with statistics
 * - Inquiry response management
 * - Status tracking and updates
 * - Responsive design with confirmation dialogs
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail, Phone, Calendar, MapPin, Clock,
  CheckCircle, XCircle, AlertCircle, RefreshCw, Eye, MessageCircle,
  TrendingUp, BarChart3, Filter, Search, X, Send,
  Building2, User, FileText, Award, Bell, Receipt
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import SubscriptionStatus from '../components/SubscriptionStatus';
import VendorSubscriptionManager from '../components/vendor/VendorSubscriptionManager';
import PaymentHistory from '../components/vendor/PaymentHistory';
import { getApiUrl } from '../config/api';

const API_BASE_URL = getApiUrl();

const VendorDashboard = () => {
  const navigate = useNavigate();
  
  // Get vendor info from localStorage
  const vendorToken = localStorage.getItem('authToken') || localStorage.getItem('vendorToken');
  const vendorId = localStorage.getItem('vendorId');
  const vendorBusinessName = localStorage.getItem('vendorBusinessName');
  const vendorEmail = localStorage.getItem('vendorEmail');
  
  // Check authentication
  useEffect(() => {
    if (!vendorToken || !vendorId) {
      navigate('/');
    }
  }, [vendorToken, vendorId, navigate]);

  // State Management
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [inquiries, setInquiries] = useState([]);
  const [vendorData, setVendorData] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    responded: 0,
    closed: 0
  });
  
  // UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterEventDate, setFilterEventDate] = useState('');
  const [filterDateType, setFilterDateType] = useState('service');
  const [inquirySort, setInquirySort] = useState('newest');
  const [inquiryPage, setInquiryPage] = useState(1);
  const inquiriesPerPage = 10;
  const [respondModal, setRespondModal] = useState({ isOpen: false, inquiry: null, action: null });
  const [declineReason, setDeclineReason] = useState('');
  const [acceptMessage, setAcceptMessage] = useState('');
  const [respondLoading, setRespondLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  
  // Dialog States
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    type: 'warning'
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (activeTab === 'inquiries') {
      loadInquiries();
    }
  }, [activeTab]);

  // Listen for tab change events from header dropdown
  useEffect(() => {
    const handleTabChange = (event) => {
      if (event.detail) {
        setActiveTab(event.detail);
      }
    };
    
    window.addEventListener('changeVendorTab', handleTabChange);
    return () => window.removeEventListener('changeVendorTab', handleTabChange);
  }, []);

  // Load data on tab change
  useEffect(() => {
    if (activeTab === 'inquiries') {
      loadInquiries();
    } else if (activeTab === 'dashboard') {
      loadDashboardData();
    }
  }, [activeTab]); // Removed auto-refresh interval

  // Load Dashboard Data
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      if (!vendorToken) {
        showNotification('error', 'Authentication required');
        navigate('/');
        return;
      }
      
      
      const [inquiriesRes, vendorRes] = await Promise.all([
        fetch(`${API_BASE_URL}/vendors/dashboard/inquiries?limit=100`, {
          headers: { 
            'Authorization': `Bearer ${vendorToken}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${API_BASE_URL}/vendor-profile/profile/me`, {
          headers: { 
            'Authorization': `Bearer ${vendorToken}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      
      if (!inquiriesRes.ok) {
        const errorText = await inquiriesRes.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API error: ${inquiriesRes.status}`);
      }
      
      const inquiriesData = await inquiriesRes.json();
      
      if (vendorRes.ok) {
        const vendorData = await vendorRes.json();
        if (vendorData.success) {
          setVendorData(vendorData.data);
        }
      }
      
      if (inquiriesData.success) {
        // Handle different response formats
        const allInquiries = Array.isArray(inquiriesData.data)
          ? inquiriesData.data
          : (inquiriesData.data?.inquiries || []);
        
        
        setStats({
          total: allInquiries.length,
          new: allInquiries.filter(i => i.status === 'pending' || i.status === 'sent').length,
          responded: allInquiries.filter(i => i.status === 'responded').length,
          closed: allInquiries.filter(i => i.status === 'closed' || i.status === 'completed').length
        });
      } else {
        showNotification('error', inquiriesData.message || 'Failed to load data');
        setStats({ total: 0, new: 0, responded: 0, closed: 0 });
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      if (error.message.includes('Failed to fetch')) {
        showNotification('error', 'Cannot connect to server. Please check if backend is running on port 5000');
      } else {
        showNotification('error', 'Failed to load dashboard data: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Load Inquiries
  const loadInquiries = async () => {
    setLoading(true);
    try {
      if (!vendorToken) {
        showNotification('error', 'Authentication required');
        navigate('/');
        return;
      }
      
      
      const response = await fetch(`${API_BASE_URL}/vendors/dashboard/inquiries?limit=100`, {
        headers: { 
          'Authorization': `Bearer ${vendorToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Inquiries API Error:', errorText);
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Handle different response formats
        const allInquiries = Array.isArray(data.data)
          ? data.data
          : (data.data?.inquiries || []);
        
        
        // Only show approved inquiries
        const approvedInquiries = allInquiries.filter(i => i.approvalStatus === 'approved');
        
        setInquiries(approvedInquiries);
        
        if (approvedInquiries.length === 0 && allInquiries.length > 0) {
          showNotification('info', `Found ${allInquiries.length} inquiries but none are approved yet`);
        }
      } else {
        setInquiries([]);
        showNotification('error', data.message || 'Failed to load inquiries');
      }
    } catch (error) {
      console.error('Error fetching inquiries:', error);
      if (error.message.includes('Failed to fetch')) {
        showNotification('error', 'Cannot connect to server. Please check if backend is running');
      } else {
        showNotification('error', 'Failed to load inquiries: ' + error.message);
      }
      setInquiries([]);
    } finally {
      setLoading(false);
    }
  };

  // Open Accept or Decline modal
  const DEFAULT_ACCEPT_MSG = 'Thank you for your inquiry! We are delighted to accept your request and will reach out to you shortly to discuss the details.';

  const handleVendorRespond = (inquiry, action) => {
    setRespondModal({ isOpen: true, inquiry, action });
    setDeclineReason('');
    setAcceptMessage(DEFAULT_ACCEPT_MSG);
  };

  // Submit vendor Accept/Decline response
  const submitVendorResponse = async () => {
    const { inquiry, action } = respondModal;

    if (action === 'accept' && !acceptMessage.trim()) {
      showNotification('error', 'Response message cannot be empty');
      return;
    }

    if (action === 'decline' && !declineReason.trim()) {
      showNotification('error', 'Please provide a reason for declining');
      return;
    }

    if (!vendorToken) {
      showNotification('error', 'Authentication required');
      navigate('/');
      return;
    }

    setRespondLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/vendors/dashboard/inquiries/${inquiry._id}/respond`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${vendorToken}`
          },
          body: JSON.stringify({ action, declineReason: declineReason.trim(), customMessage: acceptMessage.trim() })
        }
      );

      const data = await response.json();
      if (data.success) {
        showNotification('success', action === 'accept' ? 'Inquiry accepted successfully!' : 'Inquiry declined');
        setRespondModal({ isOpen: false, inquiry: null, action: null });
        setDeclineReason('');
        setAcceptMessage('');
        loadInquiries();
      } else {
        showNotification('error', data.message || 'Failed to submit response');
      }
    } catch (error) {
      console.error('Error submitting response:', error);
      showNotification('error', 'Failed to submit response');
    } finally {
      setRespondLoading(false);
    }
  };

  // Show Notification
  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Refresh All Data
  const handleRefresh = () => {
    if (activeTab === 'dashboard') {
      loadDashboardData();
    } else if (activeTab === 'inquiries') {
      loadInquiries();
    }
    showNotification('info', 'Data refreshed');
  };

  // Helper: safely extract start date from eventDate ({start,end} or plain string)
  const getEventStartDate = (eventDate) => {
    if (!eventDate) return null;
    const raw = eventDate?.start || eventDate;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatEventDate = (eventDate) => {
    if (!eventDate) return 'TBD';
    if (eventDate?.start) {
      const s = new Date(eventDate.start);
      if (isNaN(s.getTime())) return 'TBD';
      const e = eventDate.end ? new Date(eventDate.end) : null;
      const sStr = s.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      if (!e || isNaN(e.getTime()) || s.toDateString() === e.toDateString()) return sStr;
      return `${s.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – ${e.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    }
    const d = new Date(eventDate);
    if (isNaN(d.getTime())) return 'TBD';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Filter + Sort Inquiries
  const filteredInquiries = inquiries
    .filter(inquiry => {
      const matchesSearch = searchTerm === '' ||
        inquiry.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inquiry.userContact?.includes(searchTerm) ||
        inquiry.eventType?.toLowerCase().includes(searchTerm.toLowerCase());

      const normalizedStatus = inquiry.status === 'sent'
        ? 'pending'
        : inquiry.status === 'closed'
          ? 'responded'
          : inquiry.status;
      const matchesStatus = filterStatus === 'all' || normalizedStatus === filterStatus;

      if (!matchesSearch || !matchesStatus) return false;

      if (filterEventDate) {
        const rawDate = filterDateType === 'created'
          ? new Date(inquiry.createdAt)
          : getEventStartDate(inquiry.eventDate);
        if (!rawDate || isNaN(rawDate.getTime())) return false;
        const tzOffset = rawDate.getTimezoneOffset() * 60000;
        const localStr = new Date(rawDate.getTime() - tzOffset).toISOString().split('T')[0];
        if (localStr !== filterEventDate) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (inquirySort === 'service-date-asc' || inquirySort === 'service-date-desc') {
        const aDate = (getEventStartDate(a.eventDate) || new Date(0)).getTime();
        const bDate = (getEventStartDate(b.eventDate) || new Date(0)).getTime();
        return inquirySort === 'service-date-asc' ? aDate - bDate : bDate - aDate;
      }
      const aCreated = new Date(a.createdAt || 0).getTime();
      const bCreated = new Date(b.createdAt || 0).getTime();
      return inquirySort === 'oldest' ? aCreated - bCreated : bCreated - aCreated;
    });

  const inquiryTotalPages = Math.max(1, Math.ceil(filteredInquiries.length / inquiriesPerPage));
  const safeInquiryPage = Math.min(inquiryPage, inquiryTotalPages);
  const inquiryStartIndex = (safeInquiryPage - 1) * inquiriesPerPage;
  const paginatedInquiries = filteredInquiries.slice(inquiryStartIndex, inquiryStartIndex + inquiriesPerPage);

  useEffect(() => {
    setInquiryPage(1);
  }, [searchTerm, filterStatus, filterEventDate, filterDateType, inquirySort]);

  useEffect(() => {
    if (inquiryPage > inquiryTotalPages) {
      setInquiryPage(inquiryTotalPages);
    }
  }, [inquiryPage, inquiryTotalPages]);

  // Stats Card Component
  const StatsCard = ({ title, value, subtitle, icon: Icon, gradient }) => (
    <div className={`bg-gradient-to-br ${gradient} rounded-2xl p-4 shadow-md text-white transform hover:scale-105 transition-all duration-300`}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md" style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold mb-0.5">{value}</p>
        <p className="text-sm font-semibold text-white text-opacity-90">{title}</p>
        {subtitle && <p className="text-xs text-white text-opacity-75 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );

  // Notification Component
  const Notification = () => {
    if (!notification) return null;
    
    const bgColor = notification.type === 'success' ? 'bg-green-500' : 
                    notification.type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    
    return (
      <div className={`fixed top-4 right-4 z-50 ${bgColor} text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3`}>
        {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
        {notification.type === 'error' && <AlertCircle className="w-5 h-5" />}
        {notification.type === 'info' && <Bell className="w-5 h-5" />}
        <span className="font-semibold">{notification.message}</span>
        <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-80">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  };

  // Dashboard Tab
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[var(--premium-blue)] to-[#24496f] rounded-2xl p-5 sm:p-8 text-white shadow-2xl">
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-2">Welcome Back! 👋</h2>
            <p className="text-lg sm:text-xl text-white text-opacity-90 break-words">{vendorBusinessName}</p>
            <p className="text-blue-100 mt-1">Manage your inquiries and grow your business</p>
          </div>
          <div className="hidden md:block">
            <Building2 className="w-24 h-24 text-white opacity-20" />
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Inquiries"
          value={stats?.total || 0}
          subtitle="All approved inquiries"
          icon={Mail}
          gradient="from-blue-500 to-blue-700"
        />
        <StatsCard
          title="New Inquiries"
          value={stats?.new || 0}
          subtitle="Awaiting response"
          icon={Bell}
          gradient="from-blue-500 to-blue-700"
        />
        <StatsCard
          title="Responded"
          value={stats?.responded || 0}
          subtitle="Responses sent"
          icon={MessageCircle}
          gradient="from-blue-500 to-blue-700"
        />
        <StatsCard
          title="Closed"
          value={stats?.closed || 0}
          subtitle="Completed deals"
          icon={CheckCircle}
          gradient="from-purple-500 to-purple-700"
        />
      </div>

      {/* Subscription Status */}
      {vendorData && (
        <SubscriptionStatus 
          vendor={vendorData} 
          onUpdate={loadDashboardData}
        />
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-100">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <TrendingUp className="w-7 h-7 text-indigo-600" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setActiveTab('inquiries')}
            className="flex items-center gap-4 p-5 bg-gradient-to-br from-blue-50 to-indigo-100 hover:from-blue-100 hover:to-indigo-200 rounded-xl transition-all transform hover:scale-105 shadow-md hover:shadow-xl"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-900">View Inquiries</p>
              <p className="text-sm text-gray-600">Manage customer requests</p>
            </div>
          </button>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-4 p-5 bg-gradient-to-br from-blue-50 to-indigo-100 hover:from-blue-100 hover:to-indigo-200 rounded-xl transition-all transform hover:scale-105 shadow-md hover:shadow-xl"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-900">Refresh Data</p>
              <p className="text-sm text-gray-600">Get latest updates</p>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('subscription')}
            className="flex items-center gap-4 p-5 bg-gradient-to-br from-blue-50 to-indigo-100 hover:from-blue-100 hover:to-indigo-200 rounded-xl transition-all transform hover:scale-105 shadow-md hover:shadow-xl"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-900">My Plan</p>
              <p className="text-sm text-gray-600">Manage subscription</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  // Inquiries Tab
  const renderInquiries = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-[var(--premium-blue)] to-[#24496f] rounded-2xl px-5 py-4 shadow-lg text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">📧 Customer Inquiries</h2>
          <p className="text-white/80 text-xs mt-0.5">Manage and respond to customer requests</p>
        </div>
        <div className="px-4 py-2 rounded-xl text-center" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
          <p className="text-2xl font-bold leading-none text-white">{filteredInquiries.length}</p>
          <p className="text-xs text-white/80 mt-0.5">Inquiries</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-purple-100 overflow-hidden">
        {/* Bar header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Filter & Sort</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-bold text-xs shadow-sm">
              {filteredInquiries.length} {filteredInquiries.length === 1 ? 'Inquiry' : 'Inquiries'}
            </span>
            {(filterStatus !== 'all' || searchTerm || filterEventDate || filterDateType !== 'service' || inquirySort !== 'newest') && (
              <button
                onClick={() => { setFilterStatus('all'); setSearchTerm(''); setFilterDateType('service'); setFilterEventDate(''); setInquirySort('newest'); }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
              >
                <X className="w-3 h-3" /> Reset All
              </button>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 border-t border-purple-100/70 bg-white/80">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* Search */}
            <div className="md:col-span-4">
              <label className="text-xs font-bold text-gray-600 mb-1.5 block">Search Customer</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Name, contact or event type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-12 pl-9 pr-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all bg-white"
                />
              </div>
            </div>

            {/* Date type */}
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-gray-600 mb-1.5 block">Date Type</label>
              <select
                value={filterDateType}
                onChange={(e) => { setFilterDateType(e.target.value); setFilterEventDate(''); }}
                className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-semibold bg-white"
              >
                <option value="service">Service Schedule</option>
                <option value="created">Submitted Date</option>
              </select>
            </div>

            {/* Date */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-600">Search by Date</label>
                {filterEventDate && <button onClick={() => setFilterEventDate('')} className="text-xs font-semibold text-red-500 hover:text-red-600">Clear</button>}
              </div>
              <input
                type="date"
                value={filterEventDate}
                onChange={(e) => setFilterEventDate(e.target.value)}
                className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-semibold bg-white"
              />
            </div>

            {/* Status filter */}
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-gray-600 mb-1.5 block">Inquiry Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-semibold bg-white"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="responded">Responded</option>
              </select>
            </div>

            {/* Sort */}
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-gray-600 mb-1.5 block">Sort By</label>
              <select
                value={inquirySort}
                onChange={(e) => setInquirySort(e.target.value)}
                className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-semibold bg-white"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="service-date-asc">Service Schedule (Earliest)</option>
                <option value="service-date-desc">Service Schedule (Latest)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Inquiry Cards */}
      <div className="bg-purple-50/60 rounded-2xl p-3 border border-purple-100">
        <div className="space-y-2">
          {paginatedInquiries.length > 0 ? paginatedInquiries.map((inquiry, index) => (
            <div
              key={inquiry._id}
              className={`group bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 border-l-4 hover:shadow-md transition-all duration-200 ${
                inquiry.status === 'responded' ? 'border-l-green-400 hover:border-l-green-500' :
                inquiry.status === 'closed'    ? 'border-l-purple-400 hover:border-l-purple-500' :
                                                 'border-l-indigo-400 hover:border-l-indigo-500'
              }`}
            >
              {/* Row 1: index · name · contact  |  submitted date  status */}
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-gray-400 shrink-0">{inquiryStartIndex + index + 1}.</span>
                  <span className="font-bold text-gray-900 text-sm truncate">{inquiry.userName}</span>
                  {inquiry.userContact && (
                    <span className="text-xs text-gray-400 truncate hidden sm:inline">· {inquiry.userContact}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-400 hidden sm:inline">
                    {new Date(inquiry.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </span>
                  <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                    inquiry.status === 'responded' ? 'bg-green-100 text-green-700' :
                    inquiry.status === 'closed'    ? 'bg-purple-100 text-purple-700' :
                                                     'bg-yellow-100 text-yellow-700'
                  }`}>
                    {inquiry.status === 'responded' ? 'Responded' : inquiry.status === 'closed' ? 'Closed' : 'Pending'}
                  </span>
                </div>
              </div>

              {/* Row 2: event meta pills */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs mb-2">
                <span className="font-semibold text-indigo-700 capitalize">{inquiry.eventType || 'Service'}</span>
                <span className="text-gray-300">|</span>
                <span className="font-bold text-gray-800">₹{inquiry.budget?.toLocaleString() || '—'}</span>
                <span className="text-gray-300">|</span>
                <span className="text-gray-500">{inquiry.city || 'N/A'}</span>
                <span className="text-gray-300">|</span>
                <span className="text-purple-600 font-medium">📅 {formatEventDate(inquiry.eventDate)}</span>
              </div>

              {/* Row 3 (optional): message preview */}
              {inquiry.message && (
                <p className="text-xs text-gray-400 truncate mb-2">
                  <span className="font-semibold text-gray-500">Message:</span> {inquiry.message}
                </p>
              )}

              {/* Row 4: action buttons */}
              <div className="flex items-center gap-2">
                {!inquiry.vendorResponse ? (
                  <>
                    <button
                      onClick={() => handleVendorRespond(inquiry, 'accept')}
                      className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Accept
                    </button>
                    <button
                      onClick={() => handleVendorRespond(inquiry, 'decline')}
                      className="flex items-center gap-1 px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-semibold transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Decline
                    </button>
                  </>
                ) : (
                  <span className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold ${
                    inquiry.rejectionReason ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {inquiry.rejectionReason
                      ? <><XCircle className="w-3.5 h-3.5" /> Declined</>
                      : <><CheckCircle className="w-3.5 h-3.5" /> Accepted</>}
                  </span>
                )}
              </div>
            </div>
          )) : (
            <div className="text-center py-10">
              <Mail className="w-12 h-12 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-500 font-semibold text-sm">
                {filterStatus !== 'all' || searchTerm ? 'No matching inquiries found' : 'No inquiries yet'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {filterStatus !== 'all' || searchTerm
                  ? 'Try adjusting your filters'
                  : 'New approved inquiries will appear here'}
              </p>
            </div>
          )}
        </div>
      </div>

      {filteredInquiries.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-gray-600">
            Showing {inquiryStartIndex + 1} to {Math.min(inquiryStartIndex + inquiriesPerPage, filteredInquiries.length)} of {filteredInquiries.length} inquiries
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setInquiryPage((p) => Math.max(1, p - 1))}
              disabled={safeInquiryPage === 1}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: inquiryTotalPages }, (_, i) => i + 1)
                .filter((page) => {
                  if (inquiryTotalPages <= 7) return true;
                  return page === 1 || page === inquiryTotalPages || Math.abs(page - safeInquiryPage) <= 1;
                })
                .map((page, idx, arr) => (
                  <React.Fragment key={page}>
                    {idx > 0 && arr[idx - 1] !== page - 1 && (
                      <span className="px-1 text-gray-400 text-xs">...</span>
                    )}
                    <button
                      onClick={() => setInquiryPage(page)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                        safeInquiryPage === page
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
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
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Main Render
  return (
    <div className="panel-theme vendor-panel vendor-dashboard min-h-screen bg-[var(--premium-bg-main)]">
      {/* Notification */}
      <Notification />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
      />

      {/* Accept / Decline Modal */}
      {respondModal.isOpen && respondModal.inquiry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl">
            <div className={`p-6 border-b border-gray-200 rounded-t-2xl ${
              respondModal.action === 'accept' ? 'bg-gradient-to-r from-green-50 to-emerald-50' : 'bg-gradient-to-r from-red-50 to-rose-50'
            }`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  {respondModal.action === 'accept' ? (
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <XCircle className="w-6 h-6 text-red-600" />
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-gray-900">
                    {respondModal.action === 'accept' ? 'Accept Inquiry' : 'Decline Inquiry'}
                  </h3>
                </div>
                <button
                  onClick={() => setRespondModal({ isOpen: false, inquiry: null, action: null })}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-4 p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500 mb-1">Customer</p>
                <p className="font-bold text-gray-900">{respondModal.inquiry.userName}</p>
                {respondModal.inquiry.userContact && (
                  <p className="text-sm text-gray-600">{respondModal.inquiry.userContact}</p>
                )}
                {respondModal.inquiry.eventType && (
                  <p className="text-sm text-gray-600 mt-1">Event: {respondModal.inquiry.eventType}</p>
                )}
              </div>

              {respondModal.action === 'accept' ? (
                <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Response to Customer
                    <span className="ml-2 text-xs font-normal text-gray-500">(you can edit before sending)</span>
                  </label>
                  <textarea
                    value={acceptMessage}
                    onChange={(e) => setAcceptMessage(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 resize-none transition-colors text-sm text-gray-700 leading-relaxed"
                    rows="4"
                  />
                </div>
              ) : (
                <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Reason for Declining <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    placeholder="e.g. We are fully booked on this date, budget does not match our pricing..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-red-400 resize-none transition-colors"
                    rows="4"
                  />
                  <p className="text-xs text-gray-500 mt-1">This reason will be included in the response sent to the customer.</p>
                </div>
              )}

              <div className="flex gap-3">
                {respondModal.action === 'accept' ? (
                  <button
                    onClick={submitVendorResponse}
                    disabled={respondLoading}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    {respondLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                    Confirm Accept
                  </button>
                ) : (
                  <button
                    onClick={submitVendorResponse}
                    disabled={respondLoading}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    {respondLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
                    Submit Decline
                  </button>
                )}
                <button
                  onClick={() => setRespondModal({ isOpen: false, inquiry: null, action: null })}
                  disabled={respondLoading}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header (now non-sticky, white background to scroll with page) */}
      <div className="bg-white shadow-lg border-b border-[var(--premium-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 min-h-16 py-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--premium-blue)' }}>
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold font-display text-[var(--premium-blue)]">Vendor Panel</h1>
            </div>
            <button
              onClick={handleRefresh}
              aria-label="Refresh data"
              className="flex items-center gap-2 px-3 sm:px-5 py-2.5 rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg whitespace-nowrap bg-gradient-to-r from-[var(--premium-blue)] to-[#24496f] text-white"
            >
              <RefreshCw className="w-4 h-4 text-white" />
              <span className="text-white">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-[var(--premium-bg-elevated)] border-b-2 border-[var(--premium-border)] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-2 sm:gap-4 overflow-x-auto scrollbar-hide py-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'inquiries', label: `Inquiries (${inquiries.length})`, icon: Mail },
              { id: 'subscription', label: 'My Plan', icon: Award },
              { id: 'payments', label: 'Payments', icon: Receipt }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-shrink-0 flex items-center gap-2 px-3 py-3 sm:py-4 border-b-3 font-bold transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-[var(--premium-gold)] text-[var(--premium-gold-dark)] transform scale-105'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && activeTab === 'dashboard' ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-[var(--premium-blue)] animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'inquiries' && renderInquiries()}
            {activeTab === 'subscription' && <VendorSubscriptionManager />}
            {activeTab === 'payments' && <PaymentHistory />}
          </>
        )}
      </div>
    </div>
  );
};

export default VendorDashboard;
