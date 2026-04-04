import React from 'react';

/**
 * StatusBadge Component
 * Professional status badge with color-coded styling
 * 
 * @param {string} status - Status value: 'pending', 'contacted', 'responded', 'closed', 'cancelled', 'active', 'inactive', 'verified', 'unverified'
 * @param {string} size - Size: 'sm', 'md', 'lg'
 * @param {boolean} dot - Show dot indicator
 */
const StatusBadge = ({ status, size = 'md', dot = true }) => {
  const statusConfig = {
    pending: {
      label: 'Pending',
      color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      dotColor: 'bg-indigo-500'
    },
    contacted: {
      label: 'Contacted',
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      dotColor: 'bg-blue-500'
    },
    responded: {
      label: 'Responded',
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      dotColor: 'bg-purple-500'
    },
    closed: {
      label: 'Closed',
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      dotColor: 'bg-gray-500'
    },
    cancelled: {
      label: 'Cancelled',
      color: 'bg-red-100 text-red-800 border-red-200',
      dotColor: 'bg-red-500'
    },
    active: {
      label: 'Active',
      color: 'bg-green-100 text-green-800 border-green-200',
      dotColor: 'bg-green-500'
    },
    inactive: {
      label: 'Inactive',
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      dotColor: 'bg-gray-500'
    },
    verified: {
      label: 'Verified',
      color: 'bg-green-100 text-green-800 border-green-200',
      dotColor: 'bg-green-500'
    },
    unverified: {
      label: 'Unverified',
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      dotColor: 'bg-orange-500'
    },
    approved: {
      label: 'Approved',
      color: 'bg-green-100 text-green-800 border-green-200',
      dotColor: 'bg-green-500'
    },
    rejected: {
      label: 'Rejected',
      color: 'bg-red-100 text-red-800 border-red-200',
      dotColor: 'bg-red-500'
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const config = statusConfig[status?.toLowerCase()] || statusConfig.pending;

  return (
    <span 
      className={`
        inline-flex items-center font-medium rounded-full border
        ${config.color} ${sizeClasses[size]}
      `}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${config.dotColor}`}></span>
      )}
      {config.label}
    </span>
  );
};

export default StatusBadge;
