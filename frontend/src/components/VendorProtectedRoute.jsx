import React from 'react';
import { Navigate } from 'react-router-dom';
import { useVendorAuth } from '../contexts/VendorAuthContext';
import Loader from './Loader';

/**
 * VendorProtectedRoute Component
 * Protects vendor-specific routes requiring authentication
 * 
 * @param {Object} props
 * @param {React.Component} props.children - The component to render if authorized
 * @param {string} props.redirectTo - Where to redirect if unauthorized (default: '/')
 */
const VendorProtectedRoute = ({ children, redirectTo = '/' }) => {
  const { vendor, isVendorAuthenticated, loading } = useVendorAuth();

  // Show loader while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  // Check if vendor is authenticated
  if (!isVendorAuthenticated()) {
    // Redirect to homepage with a message
    return <Navigate to={redirectTo} replace state={{ message: 'Please login as a vendor to access this page' }} />;
  }

  // Vendor is authenticated
  return children;
};

export default VendorProtectedRoute;
