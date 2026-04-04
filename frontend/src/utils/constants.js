/**
 * UI CONSTANTS ONLY
 * 
 * This file contains ONLY UI-related constants such as:
 * - Status badge colors and labels
 * - Budget range presets for UI display
 * - Radius options for distance filters
 * 
 * ALL DATA (cities, services, vendors) IS FETCHED FROM DATABASE
 * No static data arrays are stored here.
 */

// Inquiry status options with UI styling
export const INQUIRY_STATUS = {
  pending: {
    label: 'Pending',
    color: 'yellow',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    borderColor: 'border-yellow-200'
  },
  sent: {
    label: 'Sent to Vendor', 
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-200'
  },
  responded: {
    label: 'Vendor Responded',
    color: 'green', 
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-200'
  },
  closed: {
    label: 'Closed',
    color: 'gray',
    bgColor: 'bg-gray-100', 
    textColor: 'text-gray-800',
    borderColor: 'border-gray-200'
  }
};

// Vendor approval status with UI styling
export const VENDOR_STATUS = {
  pending: {
    label: 'Pending Approval',
    color: 'yellow',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800', 
    borderColor: 'border-yellow-200'
  },
  approved: {
    label: 'Approved',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-200' 
  },
  rejected: {
    label: 'Rejected',
    color: 'red',
    bgColor: 'bg-red-100', 
    textColor: 'text-red-800',
    borderColor: 'border-red-200'
  }
};

// Budget range presets for B2B Services
export const BUDGET_RANGES = [
  { label: 'Under ₹10K', min: 0, max: 10000 },
  { label: '₹10K - ₹25K', min: 10000, max: 25000 },
  { label: '₹25K - ₹50K', min: 25000, max: 50000 },
  { label: '₹50K - ₹1L', min: 50000, max: 100000 },
  { label: '₹1L - ₹3L', min: 100000, max: 300000 },
  { label: '₹3L - ₹5L', min: 300000, max: 500000 },
  { label: '₹5L - ₹10L', min: 500000, max: 1000000 },
  { label: '₹10L+', min: 1000000, max: 50000000 }
];

// Radius options for location-based search (in kilometers)
export const RADIUS_OPTIONS = [
  { label: '2 km', value: 2 },
  { label: '5 km', value: 5 },
  { label: '10 km', value: 10 },
  { label: '15 km', value: 15 },
  { label: '25 km', value: 25 },
  { label: '50 km', value: 50 }
];
