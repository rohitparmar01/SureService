import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Loader from './Loader';

/**
 * ProtectedRoute Component
 * Wraps routes that require authentication and optional role-based access
 * 
 * @param {Object} props
 * @param {React.Component} props.children - The component to render if authorized
 * @param {string[]} props.allowedRoles - Optional array of allowed roles (e.g., ['admin'])
 * @param {string} props.redirectTo - Where to redirect if unauthorized (default: '/')
 */
const ProtectedRoute = ({ children, allowedRoles = [], redirectTo = '/' }) => {
  const { user, isAuthenticated, loading } = useAuth();


  // Show loader while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  // Check if user is authenticated
  if (!isAuthenticated()) {
    return <Navigate to={redirectTo} replace />;
  }

  // Check role-based access if roles are specified
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    // Redirect based on user role
    if (user?.role === 'admin') {
      return <Navigate to="/admin" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // User is authenticated and authorized
  return children;
};

export default ProtectedRoute;
