import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../config/api';

const VendorAuthContext = createContext(null);

export const useVendorAuth = () => {
  const context = useContext(VendorAuthContext);
  if (!context) {
    throw new Error('useVendorAuth must be used within a VendorAuthProvider');
  }
  return context;
};

export const VendorAuthProvider = ({ children }) => {
  const [vendor, setVendor] = useState(null);
  const [vendorToken, setVendorToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Initialize vendor auth state from localStorage
  useEffect(() => {
    const initializeVendorAuth = () => {
      try {
        const storedToken = localStorage.getItem('vendorToken') || localStorage.getItem('authToken');
        const storedVendorId = localStorage.getItem('vendorId');
        const storedVendorData = localStorage.getItem('vendorData');
        const storedBusinessName = localStorage.getItem('vendorBusinessName');
        const storedEmail = localStorage.getItem('vendorEmail');

        if (storedToken && storedVendorId) {
          setVendorToken(storedToken);
          
          // Construct vendor object from available data
          const vendorData = storedVendorData 
            ? JSON.parse(storedVendorData)
            : {
                _id: storedVendorId,
                businessName: storedBusinessName,
                email: storedEmail
              };
          
          setVendor(vendorData);
        }
      } catch (error) {
        console.error('Error initializing vendor auth:', error);
        clearVendorAuth();
      } finally {
        setLoading(false);
      }
    };

    initializeVendorAuth();
  }, []);

  // Login function for vendors
  const loginVendor = async (email, password) => {
    try {
      const response = await fetch(getApiUrl('vendors/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Vendor login failed');
      }

      // Store vendor data
      localStorage.setItem('vendorToken', data.token);
      localStorage.setItem('vendorId', data.data._id || data.data.vendorId);
      localStorage.setItem('vendorBusinessName', data.data.businessName || '');
      localStorage.setItem('vendorEmail', data.data.email || '');
      localStorage.setItem('vendorData', JSON.stringify(data.data));
      
      setVendorToken(data.token);
      setVendor(data.data);

      // Redirect to vendor dashboard
      navigate('/vendor-dashboard');

      return { success: true, vendor: data.data };
    } catch (error) {
      console.error('Vendor login error:', error);
      throw error;
    }
  };

  // Google login for vendors
  const googleLoginVendor = async (idToken) => {
    try {
      const response = await fetch(getApiUrl('vendors/google-login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: idToken })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Google login failed');
      }

      // Store vendor data
      localStorage.setItem('vendorToken', data.token);
      localStorage.setItem('vendorId', data.data._id || data.data.vendorId);
      localStorage.setItem('vendorBusinessName', data.data.businessName || '');
      localStorage.setItem('vendorEmail', data.data.email || '');
      localStorage.setItem('vendorData', JSON.stringify(data.data));
      
      setVendorToken(data.token);
      setVendor(data.data);

      // Redirect to vendor dashboard
      navigate('/vendor-dashboard');

      return { success: true, vendor: data.data };
    } catch (error) {
      console.error('Google vendor login error:', error);
      throw error;
    }
  };

  // Logout function
  const logoutVendor = () => {
    try {
      clearVendorAuth();
      
      // Redirect to home
      navigate('/');
    } catch (error) {
      console.error('Vendor logout error:', error);
    }
  };

  // Clear vendor authentication data
  const clearVendorAuth = () => {
    localStorage.removeItem('vendorToken');
    localStorage.removeItem('vendorId');
    localStorage.removeItem('vendorBusinessName');
    localStorage.removeItem('vendorEmail');
    localStorage.removeItem('vendorData');
    
    setVendorToken(null);
    setVendor(null);
  };

  // Update vendor profile
  const updateVendor = (updatedVendor) => {
    setVendor(updatedVendor);
    localStorage.setItem('vendorData', JSON.stringify(updatedVendor));
  };

  // Check if vendor is authenticated
  const isVendorAuthenticated = () => {
    return !!vendorToken && !!vendor;
  };

  // Get auth header for API calls
  const getVendorAuthHeader = () => {
    return vendorToken ? { Authorization: `Bearer ${vendorToken}` } : {};
  };

  const value = {
    vendor,
    vendorToken,
    loading,
    setVendor,
    setVendorToken,
    loginVendor,
    googleLoginVendor,
    logoutVendor,
    updateVendor,
    isVendorAuthenticated,
    getVendorAuthHeader,
    clearVendorAuth
  };

  return (
    <VendorAuthContext.Provider value={value}>
      {!loading && children}
    </VendorAuthContext.Provider>
  );
};

export default VendorAuthContext;
