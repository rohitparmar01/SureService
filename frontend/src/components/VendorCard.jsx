import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, IndianRupee, Phone, Star, Clock, Award, ChevronRight, Briefcase, BadgeCheck } from 'lucide-react';
import InquiryModal from './InquiryModal';
import { useSearch } from '../contexts/SearchContext';
import { formatServiceType } from '../utils/format';

/**
 * VendorCard Component - Premium JustDial/UrbanCompany Style
 *
 * Displays comprehensive vendor information with all details
 * - Service type, pricing, location, ratings
 * - Professional responsive design
 * - Complete vendor information display
 * - Section-based display (section headers communicate tier)
 */
const VendorCard = ({
  vendor,
  onInquiry,
  showRating = true,
  variant = 'default',
  userLocation,
  prefilledEventType = '',
  sectionLabel = null  // Section label from parent (e.g., "In Your Area", "Nearby")
}) => {
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const navigate = useNavigate();

  // Access search filters from context
  const { filters } = useSearch();

  const handleInquiryClick = () => {
    if (onInquiry) {
      onInquiry(vendor);
    }
    setShowInquiryModal(true);
  };

  const handleViewDetails = () => {
    // Navigate to vendor profile page
    const vendorId = vendor._id || vendor.id;
    if (vendorId) {
      navigate(`/vendor/${vendorId}`);
    }
  };

  // Format pricing display
  const getPricingDisplay = () => {
    const pricing = vendor.pricing || {};
    if (pricing.min && pricing.max) {
      return {
        range: `₹${(pricing.min / 1000).toFixed(0)}K - ₹${(pricing.max / 1000).toFixed(0)}K`,
        unit: pricing.unit || 'per service'
      };
    }
    if (pricing.average) {
      return {
        range: `₹${(pricing.average / 1000).toFixed(0)}K`,
        unit: pricing.unit || 'per service'
      };
    }
    return { range: 'Contact for pricing', unit: '' };
  };

  // Get service type display
  const getServiceTypeDisplay = () => {
    return formatServiceType(vendor.serviceType) || 'Service';
  };

  // Get location display
  const getLocationDisplay = () => {
    if (vendor.city && vendor.area) {
      return `${vendor.area}, ${vendor.city}`;
    }
    return vendor.city || vendor.area || 'Location Available';
  };

  const pricing = getPricingDisplay();
  const isCompact = variant === 'compact';
  const cardPadding = variant === 'compact' ? 'p-3' : 'p-5';
  const headerHeightClass = variant === 'compact' ? 'h-32' : 'h-32';
  const profileImageSizeClass = variant === 'compact' ? 'w-14 h-14 -bottom-7' : 'w-16 h-16 -bottom-8';
  const contentTopPaddingClass = variant === 'compact' ? 'pt-8' : 'pt-10';
  const cardHeightClass = variant === 'compact' ? 'h-[27rem]' : 'h-full';
  const publicBusinessName = (vendor.businessName || vendor.companyName || 'Vendor').trim();
  const hasLocation = Boolean(vendor.city || vendor.area);
  const hasPricing = Boolean((vendor.pricing?.min && vendor.pricing?.max) || vendor.pricing?.average);
  const resolveMediaUrl = (value) => {
    if (!value) return '';
    if (typeof value === 'string') {
      return /^https?:\/\//i.test(value.trim()) ? value.trim() : '';
    }
    if (typeof value === 'object' && typeof value.url === 'string') {
      const url = value.url.trim();
      return /^https?:\/\//i.test(url) ? url : '';
    }
    return '';
  };

  const coverImageUrl = resolveMediaUrl(vendor.coverImage);
  const profileImageUrl = resolveMediaUrl(vendor.profileImage);

  return (
    <div
      className={`group ${cardHeightClass} flex flex-col bg-white rounded-2xl shadow-md hover:shadow-2xl border border-gray-150 overflow-hidden transition-all duration-300 hover:-translate-y-2 ${
        vendor.verified ? 'ring-2 ring-blue-200/50' : ''
      }`}
    >
      {/* Premium Header with Cover Image or Gradient */}
      <div className={`relative ${headerHeightClass} overflow-visible`}>
        {/* Cover Image or Gradient Background */}
        {coverImageUrl ? (
          <img
            src={coverImageUrl}
            alt={`${publicBusinessName} cover`}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500"></div>
        )}

        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black/20"></div>

        {/* Decorative elements (only if no cover image) */}
        {!coverImageUrl && (
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full -ml-12 -mb-12 blur-2xl"></div>
          </div>
        )}

        {/* Rating Badge */}
        {showRating && vendor.rating > 0 && (
          <div className="absolute top-3 right-3 px-2.5 py-1.5 bg-white/95 backdrop-blur-sm rounded-lg flex items-center gap-1 shadow-lg z-10 ring-2 ring-white/50">
            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
            <span className="text-sm font-bold text-gray-900">{vendor.rating}</span>
            <span className="text-xs text-gray-500">({vendor.reviewCount || 0})</span>
          </div>
        )}

        {/* Featured Badge */}
        {(variant === 'featured' || vendor.isFeatured) && (
          <div className="absolute bottom-3 left-3 px-2.5 py-1.5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center gap-1 shadow-lg z-10 ring-2 ring-yellow-200/50">
            <Award className="w-3.5 h-3.5 text-white" />
            <span className="text-xs font-bold text-white uppercase tracking-wide">Featured</span>
          </div>
        )}

        {/* Response Time Badge */}
        {vendor.responseTime && (
          <div className="absolute bottom-3 right-3 px-2.5 py-1.5 bg-green-500/90 backdrop-blur-sm rounded-lg flex items-center gap-1 z-10 shadow-lg ring-2 ring-green-200/50">
            <Clock className="w-3 h-3 text-white" />
            <span className="text-xs font-semibold text-white">{vendor.responseTime}</span>
          </div>
        )}

        {/* Profile Image Badge - Bottom right circle */}
        {profileImageUrl && (
          <div className={`absolute ${profileImageSizeClass} right-4 rounded-full border-4 border-white shadow-xl overflow-hidden bg-gray-100 z-10 ring-2 ring-white/50`}>
            <img
              src={profileImageUrl}
              alt={publicBusinessName}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className={`${cardPadding} ${contentTopPaddingClass} flex flex-col flex-1`}>
        {/* Vendor Name & Verification */}
        <div className={`flex items-start justify-between gap-2 ${variant === 'compact' ? 'mb-2' : 'mb-2'}`}>
          <h3 className={`font-extrabold tracking-tight line-clamp-2 flex-1 transition-all ${isCompact ? 'text-base min-h-[2.25rem] bg-gradient-to-r from-gray-900 via-indigo-800 to-purple-700 bg-clip-text text-transparent' : 'text-lg min-h-[3.5rem] text-gray-900 group-hover:text-indigo-600'}`}>
            {publicBusinessName}
          </h3>
          {vendor.verified && (
            <div
              className={`flex-shrink-0 inline-flex items-center gap-1.5 rounded-full border shadow-md ${
                isCompact
                  ? 'px-2 py-1'
                  : 'px-2.5 py-1.5'
              } bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 border-blue-300 text-white ring-2 ring-blue-100`}
              title="Verified Provider"
            >
              <BadgeCheck className={`${isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-white`} />
              <span className={`${isCompact ? 'text-[10px]' : 'text-[11px]'} font-extrabold uppercase tracking-wide`}>
                Verified
              </span>
            </div>
          )}
        </div>

        {/* Service Type Badge - PROMINENT */}
        <div className={`flex items-start ${variant === 'compact' ? 'mb-2 min-h-[1.75rem]' : 'mb-3 min-h-[2.5rem]'}`}>
          <div className={`inline-flex items-center gap-1.5 bg-gradient-to-r from-indigo-50 via-white to-purple-50 border border-indigo-300 rounded-xl shadow-sm ${variant === 'compact' ? 'px-2.5 py-1' : 'px-3 py-1.5'} ring-1 ring-indigo-100`}>
            <Briefcase className={`${variant === 'compact' ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-indigo-600`} />
            <span className={`${variant === 'compact' ? 'text-xs max-w-[11rem]' : 'text-sm max-w-[12rem]'} font-bold text-indigo-700 truncate`}>
              {getServiceTypeDisplay()}
            </span>
          </div>
        </div>

        {/* Location - PROMINENT */}
        <div className={`flex items-center gap-2 text-sm text-gray-700 ${variant === 'compact' ? 'mb-2 p-2' : 'mb-3 p-2.5'} bg-white rounded-xl border-2 border-indigo-100 shadow-sm hover:border-indigo-200 transition-colors`}>
          <span className={`inline-flex items-center justify-center rounded-lg bg-indigo-50 ${variant === 'compact' ? 'w-6 h-6' : 'w-7 h-7'}`}>
            <MapPin className={`${variant === 'compact' ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-blue-600 flex-shrink-0`} />
          </span>
          <span className={`${variant === 'compact' ? 'text-xs' : ''} font-semibold line-clamp-1 ${hasLocation ? '' : 'text-amber-700'}`}>
            {hasLocation ? getLocationDisplay() : 'Required: location'}
          </span>
        </div>

        {/* Budget Range - PROMINENT with Better Display */}
        <div className={`${variant === 'compact' ? 'mb-2 p-2.5 min-h-[3.25rem]' : 'mb-4 p-3.5 min-h-[5rem]'} bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-xl border-2 border-green-200 shadow-sm hover:border-green-300 transition-colors`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IndianRupee className={`${variant === 'compact' ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-green-600 flex-shrink-0 font-bold`} />
              <span className={`${variant === 'compact' ? 'text-[10px]' : 'text-xs'} font-bold text-gray-700 uppercase tracking-widest`}>Budget</span>
            </div>
            <div className="text-right">
              <div className={`${variant === 'compact' ? 'text-[13px]' : 'text-base'} font-extrabold bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent`}>
                {hasPricing ? pricing.range : 'Contact'}
              </div>
              <div className={`${variant === 'compact' ? 'text-[10px]' : 'text-xs'} text-gray-600 font-medium ${pricing.unit ? '' : 'invisible select-none'}`}>
                {pricing.unit || 'per service'}
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className={`border-t-2 border-gray-100 ${variant === 'compact' ? 'my-2' : 'my-3'}`}></div>

        {/* Action Buttons - Professional & Responsive */}
        <div className="flex gap-2">
          <button
            onClick={handleInquiryClick}
            className={`flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-purple-700 active:scale-[0.98] transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 ring-2 ring-indigo-100/50 ${variant === 'compact' ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'}`}
          >
            <Phone className={`${variant === 'compact' ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
            <span>Send Inquiry</span>
          </button>

          <button
            onClick={handleViewDetails}
            className={`bg-gray-100 hover:bg-indigo-50 text-gray-700 hover:text-indigo-600 font-semibold rounded-xl transition-all flex items-center justify-center border-2 border-gray-200 hover:border-indigo-200 ${variant === 'compact' ? 'px-2.5 py-2 text-xs' : 'px-3 py-2.5 text-sm'}`}
            title="View Details"
          >
            <ChevronRight className={`${variant === 'compact' ? 'w-4 h-4' : 'w-5 h-5'}`} />
          </button>
        </div>

      </div>

      {/* Inquiry Modal */}
      <InquiryModal
        isOpen={showInquiryModal}
        onClose={() => setShowInquiryModal(false)}
        vendor={vendor}
        userLocation={userLocation}
        prefilledEventType={prefilledEventType}
        searchFilters={filters}
      />
    </div>
  );
};

export default VendorCard;
