import React from 'react';

/**
 * ServiceCategories Component - CLEANED
 *
 * All hardcoded categories removed. This component will be empty until
 * categories are dynamically loaded from the database.
 *
 * NO hardcoded data • NO fallback categories • NO mock data
 */
const ServiceCategories = () => {
  // No hardcoded categories - starting with clean baseline
  // Categories should be fetched from database when implementing dynamic logic
  const categories = [];

  // Return null if no categories exist - don't render anything
  if (!categories || categories.length === 0) {
    return null;
  }

  return null;
};

export default ServiceCategories;
