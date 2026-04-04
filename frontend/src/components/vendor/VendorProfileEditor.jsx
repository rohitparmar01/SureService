/**
 * Professional Vendor Profile Editor
 * Instagram + Facebook style profile with real-time editing
 * All fields that show in search results are editable here
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Camera, MapPin, Phone, Mail, Globe, Instagram, Facebook,
  Edit2, Save, X, Loader2, CheckCircle, AlertCircle,
  Building2, Award, IndianRupee,
  Image as ImageIcon, Video, FileText, ChevronRight,
  MessageCircle, Lock
} from 'lucide-react';
import { getApiUrl } from '../../config/api';
import { uploadVendorImage, updateVendorProfile } from '../../services/vendorService';

const API_BASE_URL = getApiUrl();
const DESCRIPTION_MAX_CHARS = 500;
const MOBILE_REGEX = /^[6-9]\d{9}$/;

const mapVendorToEditorProfile = (vendor = {}) => ({
  businessName: vendor.businessName || '',
  ownerName: vendor.name || '',
  serviceType: vendor.serviceType || '',
  description: vendor.description || '',
  city: vendor.city || '',
  area: vendor.area || '',
  address: vendor.address || '',
  contact: vendor.contact?.phone || '',
  email: vendor.contact?.email || vendor.email || '',
  whatsapp: vendor.contact?.whatsapp || '',
  website: vendor.contact?.website || '',
  instagram: vendor.contact?.socialMedia?.instagram || '',
  facebook: vendor.contact?.socialMedia?.facebook || '',
  yearsInBusiness: vendor.yearsInBusiness ?? '',
  totalBookings: vendor.totalBookings ?? vendor.completedBookings ?? '',
  teamSize: vendor.teamSize ?? '',
  priceRange: {
    min: vendor.pricing?.min || '',
    max: vendor.pricing?.max || ''
  },
  profileImage: vendor.profileImage || '',
  coverImage: vendor.coverImage || '',
  verified: vendor.verified || false,
  rating: vendor.rating || 0,
  totalReviews: vendor.totalReviews || 0
});

const VendorProfileEditor = () => {
  const vendorToken = localStorage.getItem('vendorToken') || localStorage.getItem('authToken');
  const vendorId = localStorage.getItem('vendorId');
  
  // File upload refs
  const coverImageInputRef = useRef(null);
  const profileImageInputRef = useRef(null);
  // State Management
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [notification, setNotification] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  
  // Media Counters (redirect to dedicated sections)
  const [mediaStats, setMediaStats] = useState({ imageCount: 0, videoCount: 0 });
  
  // Subscription Plan
  const [currentPlan, setCurrentPlan] = useState('free');
  
  // Profile Data - All fields shown in search results
  const [profile, setProfile] = useState({
    // Basic Info (Shows in search cards)
    businessName: '',
    ownerName: '',
    serviceType: '',
    description: '',
    
    // Location (Shows in search results)
    city: '',
    area: '',
    address: '',
    
    // Contact (Shows in vendor card)
    contact: '',
    email: '',
    whatsapp: '',
    website: '',
    
    // Social Media (Shows in profile)
    instagram: '',
    facebook: '',
    
    // Business Details (Shows in filters/cards)
    yearsInBusiness: '',
    totalBookings: '',
    teamSize: '',
    priceRange: {
      min: '',
      max: ''
    },
    
    // Profile Media (Shows as thumbnail)
    profileImage: '',
    coverImage: '',
    
    // Stats (Shows in search)
    verified: false,
    rating: 0,
    totalReviews: 0
  });

  const [tempProfile, setTempProfile] = useState(null);

  useEffect(() => {
    loadProfile();
    loadMediaStats();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      
      const response = await fetch(`${API_BASE_URL}/vendor-profile/profile/me`, {
        headers: {
          'Authorization': `Bearer ${vendorToken}`,
          'Content-Type': 'application/json'
        }
      });


      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API Error:', errorData);
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        const vendor = data.data;
        
        // Extract subscription plan
        const planKey = vendor.subscription?.planKey || 'free';
        setCurrentPlan(planKey);
        
        setProfile(mapVendorToEditorProfile(vendor));
      }
    } catch (error) {
      console.error('❌ Error loading profile:', error);
      showNotification('error', `Failed to load profile: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadMediaStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/vendor-profile/dashboard/me`, {
        headers: {
          Authorization: `Bearer ${vendorToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) return;
      const payload = await response.json();
      const allMedia = payload?.data?.media || [];
      const imageCount = allMedia.filter((item) => item.type === 'image').length;
      const videoCount = allMedia.filter((item) => item.type === 'video').length;
      setMediaStats({ imageCount, videoCount });
    } catch (error) {
      console.error('❌ Error loading media stats:', error);
    }
  };

  const normalizePhone = (value) => String(value || '').replace(/\D/g, '').slice(0, 10);

  const normalizeUrl = (value) => {
    const text = String(value || '').trim();
    if (!text) return '';
    if (text.startsWith('http://') || text.startsWith('https://')) return text;
    return `https://${text}`;
  };

  const validateProfileData = (data) => {
    const errors = {};
    const cleaned = {
      ...data,
      description: String(data.description || '').slice(0, DESCRIPTION_MAX_CHARS),
      contact: normalizePhone(data.contact),
      whatsapp: normalizePhone(data.whatsapp),
      website: String(data.website || '').trim(),
      instagram: String(data.instagram || '').trim(),
      facebook: String(data.facebook || '').trim()
    };

    if (cleaned.description.length > DESCRIPTION_MAX_CHARS) {
      errors.description = `Description must be within ${DESCRIPTION_MAX_CHARS} characters.`;
    }

    if (cleaned.contact && !MOBILE_REGEX.test(cleaned.contact)) {
      errors.contact = 'Enter valid 10-digit Indian mobile number.';
    }

    if (cleaned.whatsapp && !MOBILE_REGEX.test(cleaned.whatsapp)) {
      errors.whatsapp = 'Enter valid 10-digit WhatsApp number.';
    }

    if (cleaned.website) {
      try {
        new URL(normalizeUrl(cleaned.website));
      } catch (error) {
        errors.website = 'Enter a valid website URL.';
      }
    }

    if (cleaned.facebook) {
      try {
        new URL(normalizeUrl(cleaned.facebook));
      } catch (error) {
        errors.facebook = 'Enter a valid Facebook URL.';
      }
    }

    if (cleaned.instagram.length > 60) {
      errors.instagram = 'Instagram handle/link is too long.';
    }

    return { errors, cleaned };
  };
  const handleEdit = () => {
    setTempProfile({ ...profile });
    setValidationErrors({});
    setEditMode(true);
  };

  const handleCancel = () => {
    setTempProfile(null);
    setValidationErrors({});
    setEditMode(false);
  };

  const handleSave = async () => {
    const { errors, cleaned } = validateProfileData(tempProfile);
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      showNotification('error', 'Please fix highlighted fields before saving.');
      return;
    }

    setSaving(true);
    try {
      const payload = {};

      const normalizedCurrentContact = normalizePhone(profile.contact);
      const normalizedNextContact = normalizePhone(cleaned.contact);
      if (normalizedNextContact && normalizedNextContact !== normalizedCurrentContact) {
        payload.contact = normalizedNextContact;
      }

      if ((cleaned.whatsapp || '') !== (profile.whatsapp || '')) {
        payload.whatsapp = cleaned.whatsapp;
      }

      const normalizedWebsite = normalizeUrl(cleaned.website);
      if (normalizedWebsite !== (profile.website || '')) {
        payload.website = normalizedWebsite;
      }

      const normalizedFacebook = normalizeUrl(cleaned.facebook);
      if (normalizedFacebook !== (profile.facebook || '')) {
        payload.facebook = normalizedFacebook;
      }

      ['businessName', 'ownerName', 'serviceType', 'description', 'city', 'area', 'address', 'instagram', 'profileImage', 'coverImage'].forEach((field) => {
        if ((cleaned[field] ?? '') !== (profile[field] ?? '')) {
          payload[field] = cleaned[field];
        }
      });

      const nextMinPrice = cleaned.priceRange?.min === '' ? undefined : Number(cleaned.priceRange?.min);
      const nextMaxPrice = cleaned.priceRange?.max === '' ? undefined : Number(cleaned.priceRange?.max);
      const currentMinPrice = profile.priceRange?.min === '' ? undefined : Number(profile.priceRange?.min);
      const currentMaxPrice = profile.priceRange?.max === '' ? undefined : Number(profile.priceRange?.max);

      if (nextMinPrice !== currentMinPrice || nextMaxPrice !== currentMaxPrice) {
        payload.priceRange = {
          min: nextMinPrice,
          max: nextMaxPrice
        };
      }

      if (Object.keys(payload).length === 0) {
        showNotification('error', 'No changes detected to save.');
        setSaving(false);
        return;
      }

      const response = await updateVendorProfile(payload);

      if (response && response.success) {
        const updatedVendor = response.data || response.vendor || null;
        if (updatedVendor) {
          setProfile(mapVendorToEditorProfile(updatedVendor));
        } else {
          setProfile((prev) => ({
            ...prev,
            ...payload,
            priceRange: payload.priceRange
              ? { ...prev.priceRange, ...payload.priceRange }
              : prev.priceRange
          }));
        }
        setEditMode(false);
        setTempProfile(null);
        setValidationErrors({});
        showNotification('success', 'Profile updated successfully! Changes are live in search results.');
        
        // Reload profile to verify persisted values from backend.
        await loadProfile();
      } else {
        throw new Error(response?.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to save changes';
      showNotification('error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (field, value) => {
    if (field === 'description') {
      value = String(value || '').slice(0, DESCRIPTION_MAX_CHARS);
    }
    if (field === 'contact' || field === 'whatsapp') {
      value = normalizePhone(value);
    }

    setValidationErrors((prev) => ({ ...prev, [field]: undefined }));

    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setTempProfile(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setTempProfile(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // ==================== IMAGE UPLOAD HANDLERS ====================
  
  const handleCoverImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showNotification('error', 'Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showNotification('error', 'Image size must be less than 5MB');
      return;
    }

    setUploadingCover(true);
    try {
      const result = await uploadVendorImage(file);
      
      
      // Update temp profile with new image URL
      setTempProfile(prev => ({
        ...prev,
        coverImage: result.url
      }));
      
      showNotification('success', 'Cover image uploaded! Click Save to apply changes.');
    } catch (error) {
      console.error('❌ Cover upload error:', error);
      showNotification('error', error.message || 'Failed to upload cover image');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleProfileImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showNotification('error', 'Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showNotification('error', 'Image size must be less than 5MB');
      return;
    }

    setUploadingProfile(true);
    try {
      const result = await uploadVendorImage(file);
      
      
      // Update temp profile with new image URL
      setTempProfile(prev => ({
        ...prev,
        profileImage: result.url
      }));
      
      showNotification('success', 'Profile image uploaded! Click Save to apply changes.');
    } catch (error) {
      console.error('❌ Profile image upload error:', error);
      showNotification('error', error.message || 'Failed to upload profile image');
    } finally {
      setUploadingProfile(false);
    }
  };

  const navigateToTab = (tabId) => {
    window.dispatchEvent(new CustomEvent('changeVendorTab', { detail: tabId }));
  };


  const currentData = editMode ? tempProfile : profile;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="vendor-profile-editor max-w-5xl mx-auto space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl animate-slide-in ${
          notification.type === 'success' 
            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
            : 'bg-gradient-to-r from-red-500 to-pink-600 text-white'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle className="w-6 h-6" />
          ) : (
            <AlertCircle className="w-6 h-6" />
          )}
          <p className="font-semibold">{notification.message}</p>
        </div>
      )}

      {/* Cover Image Section */}
      <div className="relative bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 rounded-2xl overflow-hidden h-64 shadow-xl">
        {currentData.coverImage ? (
          <img src={currentData.coverImage} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <ImageIcon className="w-16 h-16 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No cover image</p>
            </div>
          </div>
        )}
        
        {/* Edit Cover Button */}
        {editMode && (
          <>
            <input
              ref={coverImageInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverImageUpload}
              className="hidden"
            />
            <button 
              onClick={() => coverImageInputRef.current?.click()}
              disabled={uploadingCover}
              className="absolute top-4 right-4 bg-white bg-opacity-90 hover:bg-opacity-100 p-3 rounded-xl shadow-lg transition-all disabled:opacity-50"
            >
              {uploadingCover ? (
                <Loader2 className="w-5 h-5 text-gray-700 animate-spin" />
              ) : (
                <Camera className="w-5 h-5 text-gray-700" />
              )}
            </button>
          </>
        )}
      </div>

      {/* Profile Header with Instagram/Facebook Style */}
      <div className="relative -mt-20 px-4 sm:px-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6">
            {/* Profile Picture */}
            <div className="relative flex-shrink-0">
              <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl bg-gradient-to-br from-indigo-100 to-purple-100 overflow-hidden">
                {currentData.profileImage ? (
                  <img src={currentData.profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building2 className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>
              {editMode && (
                <>
                  <input
                    ref={profileImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProfileImageUpload}
                    className="hidden"
                  />
                  <button 
                    onClick={() => profileImageInputRef.current?.click()}
                    disabled={uploadingProfile}
                    className="absolute bottom-0 right-0 bg-indigo-600 hover:bg-indigo-700 p-2 rounded-full shadow-lg transition-all disabled:opacity-50"
                  >
                    {uploadingProfile ? (
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4 text-white" />
                    )}
                  </button>
                </>
              )}
              {currentData.verified && (
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                  <CheckCircle className="w-3 h-3" />
                  Verified
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 min-w-0">
              {editMode ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={tempProfile.businessName}
                    onChange={(e) => handleFieldChange('businessName', e.target.value)}
                    placeholder="Business Name"
                    className="text-3xl font-bold w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    value={tempProfile.ownerName}
                    onChange={(e) => handleFieldChange('ownerName', e.target.value)}
                    placeholder="Owner Name"
                    className="text-lg text-gray-600 w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    value={tempProfile.serviceType}
                    onChange={(e) => handleFieldChange('serviceType', e.target.value)}
                    placeholder="Service Type"
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ) : (
                <>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 break-words">{currentData.businessName || 'Your Business Name'}</h1>
                  <p className="text-lg text-gray-600 mb-2">{currentData.ownerName}</p>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold">
                      {currentData.serviceType || 'Service Type'}
                    </span>
                  </div>
                  
                  {/* Stats Row */}
                  <div className="flex items-center gap-4 sm:gap-8 text-sm flex-wrap">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-yellow-500" />
                      <span className="font-bold text-gray-900">{currentData.rating.toFixed(1)}</span>
                      <span className="text-gray-500">({currentData.totalReviews} reviews)</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="w-full md:w-auto flex flex-col sm:flex-row gap-2 md:self-start">
              {!editMode ? (
                <button
                  onClick={handleEdit}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 font-semibold shadow-lg transition-all transform hover:scale-105 whitespace-nowrap"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Profile
                </button>
              ) : (
                <>
                  <button
                    onClick={handleCancel}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold transition-all whitespace-nowrap"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 font-semibold shadow-lg transition-all disabled:opacity-50 whitespace-nowrap"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </> 
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-4 sm:px-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* About Section */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              About Business
            </h2>
            {editMode ? (
              <div>
                <textarea
                  value={tempProfile.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  placeholder="Describe your business, services, and what makes you unique..."
                  rows={6}
                  className={`w-full border-2 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${validationErrors.description ? 'border-red-400' : 'border-gray-200'}`}
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-500">Keep it concise and customer-focused.</p>
                  <p className="text-xs text-gray-400">{tempProfile.description?.length || 0}/{DESCRIPTION_MAX_CHARS}</p>
                </div>
                {validationErrors.description && <p className="text-xs text-red-600 mt-1">{validationErrors.description}</p>}
              </div>
            ) : (
              <p className="text-gray-700 leading-relaxed">
                {currentData.description || 'No description added yet. Click Edit Profile to add one.'}
              </p>
            )}
          </div>

          {/* Location Section - Shows in Search Results */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-600" />
              Location Details
              <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full ml-2">Shown in Search</span>
            </h2>
            {editMode ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={tempProfile.city}
                  onChange={(e) => handleFieldChange('city', e.target.value)}
                  placeholder="City"
                  className="border-2 border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  value={tempProfile.area}
                  onChange={(e) => handleFieldChange('area', e.target.value)}
                  placeholder="Area/Locality"
                  className="border-2 border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  value={tempProfile.address}
                  onChange={(e) => handleFieldChange('address', e.target.value)}
                  placeholder="Full Address"
                  className="md:col-span-2 border-2 border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-gray-700">
                  <span className="font-semibold">{currentData.area}</span>, {currentData.city}
                </p>
                {currentData.address && (
                  <p className="text-gray-600 text-sm">{currentData.address}</p>
                )}
              </div>
            )}
          </div>

          {/* Pricing Section - Shows in Search Filters */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-indigo-600" />
              Price Range
              <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full ml-2">Filterable</span>
            </h2>
            {editMode ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Price (₹)</label>
                  <input
                    type="number"
                    value={tempProfile.priceRange.min}
                    onChange={(e) => handleFieldChange('priceRange.min', e.target.value)}
                    placeholder="Min"
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Price (₹)</label>
                  <input
                    type="number"
                    value={tempProfile.priceRange.max}
                    onChange={(e) => handleFieldChange('priceRange.max', e.target.value)}
                    placeholder="Max"
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-3xl font-bold text-indigo-600">
                  ₹{currentData.priceRange.min ? Number(currentData.priceRange.min).toLocaleString('en-IN') : '---'}
                </span>
                <span className="text-gray-400">to</span>
                <span className="text-3xl font-bold text-indigo-600">
                  ₹{currentData.priceRange.max ? Number(currentData.priceRange.max).toLocaleString('en-IN') : '---'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Contact & Social */}
        <div className="space-y-6">
          {/* Contact Information - Shows in Vendor Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5 text-indigo-600" />
              Contact Info
            </h2>
            {editMode ? (
              <div className="space-y-3">
                <input
                  type="tel"
                  value={tempProfile.contact}
                  onChange={(e) => handleFieldChange('contact', e.target.value)}
                  maxLength={10}
                  placeholder="Phone Number"
                  className={`w-full border-2 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 ${validationErrors.contact ? 'border-red-400' : 'border-gray-200'}`}
                />
                {validationErrors.contact && <p className="text-xs text-red-600 mt-1">{validationErrors.contact}</p>}
                <div className="relative">
                  <input
                    type="email"
                    value={tempProfile.email}
                    disabled
                    placeholder="Email Address"
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 pl-10 bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">🔒 Login ID
                  </span>
                </div>
                <input
                  type="tel"
                  value={tempProfile.whatsapp}
                  onChange={(e) => handleFieldChange('whatsapp', e.target.value)}
                  maxLength={10}
                  placeholder="WhatsApp Number"
                  className={`w-full border-2 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 ${validationErrors.whatsapp ? 'border-red-400' : 'border-gray-200'}`}
                />
                {validationErrors.whatsapp && <p className="text-xs text-red-600 mt-1">{validationErrors.whatsapp}</p>}
                <input
                  type="url"
                  value={tempProfile.website}
                  onChange={(e) => handleFieldChange('website', e.target.value)}
                  placeholder="Website URL"
                  className={`w-full border-2 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 ${validationErrors.website ? 'border-red-400' : 'border-gray-200'}`}
                />
                {validationErrors.website && <p className="text-xs text-red-600 mt-1">{validationErrors.website}</p>}
              </div>
            ) : (
              <div className="space-y-3">
                <a href={`tel:${currentData.contact}`} className="flex items-center gap-3 text-gray-700 hover:text-indigo-600 transition-colors min-w-0">
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{currentData.contact || 'Not provided'}</span>
                </a>
                <a href={`mailto:${currentData.email}`} className="flex items-center gap-3 text-gray-700 hover:text-indigo-600 transition-colors min-w-0">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{currentData.email || 'Not provided'}</span>
                </a>
                {currentData.whatsapp && (
                  <a href={`https://wa.me/${currentData.whatsapp}`} className="flex items-center gap-3 text-gray-700 hover:text-green-600 transition-colors min-w-0">
                    <MessageCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{currentData.whatsapp}</span>
                  </a>
                )}
                {currentData.website && (
                  <a href={currentData.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-gray-700 hover:text-indigo-600 transition-colors min-w-0">
                    <Globe className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{currentData.website}</span>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Social Media Links */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Social Media</h2>
            {editMode ? (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Instagram className="w-4 h-4" />
                    Instagram
                  </label>
                  <input
                    type="text"
                    value={tempProfile.instagram}
                    onChange={(e) => handleFieldChange('instagram', e.target.value)}
                    placeholder="@username"
                    className={`w-full border-2 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 ${validationErrors.instagram ? 'border-red-400' : 'border-gray-200'}`}
                  />
                  {validationErrors.instagram && <p className="text-xs text-red-600 mt-1">{validationErrors.instagram}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Facebook className="w-4 h-4" />
                    Facebook
                  </label>
                  <input
                    type="text"
                    value={tempProfile.facebook}
                    onChange={(e) => handleFieldChange('facebook', e.target.value)}
                    placeholder="facebook.com/yourpage"
                    className={`w-full border-2 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 ${validationErrors.facebook ? 'border-red-400' : 'border-gray-200'}`}
                  />
                  {validationErrors.facebook && <p className="text-xs text-red-600 mt-1">{validationErrors.facebook}</p>}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {currentData.instagram ? (
                  <a href={`https://instagram.com/${currentData.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all min-w-0">
                    <Instagram className="w-5 h-5 flex-shrink-0" />
                    <span className="font-semibold truncate">@{currentData.instagram.replace('@', '')}</span>
                  </a>
                ) : (
                  <p className="text-gray-500 text-sm">No Instagram linked</p>
                )}
                
                {currentData.facebook ? (
                  <a href={currentData.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all min-w-0">
                    <Facebook className="w-5 h-5 flex-shrink-0" />
                    <span className="font-semibold truncate">Visit Facebook Page</span>
                  </a>
                ) : (
                  <p className="text-gray-500 text-sm">No Facebook page linked</p>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Media Navigation Section */}
      <div className="mx-4 sm:mx-6 mb-8">
        <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b-2 border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Portfolio Media</h2>
            <p className="text-sm text-gray-600">Manage images and videos in dedicated media sections.</p>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => navigateToTab('media')}
              className="text-left bg-white border border-indigo-100 rounded-xl p-5 hover:shadow-md hover:border-indigo-300 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-indigo-700 font-semibold">
                  <ImageIcon className="w-5 h-5" />
                  Portfolio Photos
                </div>
                <ChevronRight className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="text-3xl font-bold text-indigo-600">{mediaStats.imageCount}</p>
              <p className="text-sm text-gray-600 mt-1">Tap to manage photos</p>
            </button>

            <button
              type="button"
              onClick={() => navigateToTab('videos')}
              className="text-left bg-white border border-purple-100 rounded-xl p-5 hover:shadow-md hover:border-purple-300 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-purple-700 font-semibold">
                  <Video className="w-5 h-5" />
                  Video Content
                </div>
                <ChevronRight className="w-4 h-4 text-purple-500" />
              </div>
              <p className="text-3xl font-bold text-purple-600">{mediaStats.videoCount}</p>
              <p className="text-sm text-gray-600 mt-1">Tap to manage videos</p>
            </button>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mx-4 sm:mx-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 mb-2">💡 All Changes Reflect in Search Results</h3>
            <p className="text-gray-700 text-sm leading-relaxed">
              Every detail you edit here (business name, location, pricing, contact, etc.) will automatically 
              update in search results, vendor cards, and your public profile in real-time. Make sure all 
              information is accurate and professional!
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default VendorProfileEditor;
