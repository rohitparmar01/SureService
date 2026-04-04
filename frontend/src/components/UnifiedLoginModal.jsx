import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { X, Mail, Lock, User, Phone, AlertCircle, Loader2, Eye, EyeOff, Building2, UserCircle, Sparkles } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { useVendorAuth } from '../contexts/VendorAuthContext';
import { getApiUrl } from '../config/api';

const UnifiedLoginModal = ({ isOpen, onClose, initialUserType = 'user' }) => {
  const [userType, setUserType] = useState(initialUserType); // 'user' or 'vendor'
  const [activeTab, setActiveTab] = useState('login'); // 'login' or 'register' (for users)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const googleAuthInFlightRef = useRef(false);

  const navigate = useNavigate();
  const { login, register, googleLogin } = useAuth();
  const { setVendor, setVendorToken } = useVendorAuth();

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    setApiError('');
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (userType === 'user' && activeTab === 'register') {
      if (!formData.name.trim()) {
        newErrors.name = 'Name is required';
      } else if (formData.name.trim().length < 2) {
        newErrors.name = 'Name must be at least 2 characters';
      }

      if (formData.phone && !/^[6-9]\d{9}$/.test(formData.phone)) {
        newErrors.phone = 'Please enter a valid 10-digit phone number';
      }

      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    } else {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      }
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle user login
  const handleUserLogin = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setApiError('');

    try {
      await login(formData.email, formData.password);
      onClose();
      resetForm();
    } catch (error) {
      setApiError(error.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle vendor login
  const handleVendorLogin = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setApiError('');

    try {
      const response = await fetch(getApiUrl('vendors/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: formData.email, 
          password: formData.password 
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const vendor = data.data;
        const token = data.token;
        
        // Store JWT token for API authentication
        localStorage.setItem('authToken', token);
        localStorage.setItem('vendorToken', token);
        localStorage.setItem('vendorId', vendor._id);
        localStorage.setItem('vendorEmail', vendor.email);
        localStorage.setItem('vendorBusinessName', vendor.businessName || vendor.name);
        localStorage.setItem('vendorData', JSON.stringify(vendor));
        localStorage.setItem('userRole', 'vendor');
        
        // Update VendorAuthContext
        setVendor(vendor);
        setVendorToken(token);
        
        onClose();
        resetForm();
        navigate('/vendor-dashboard');
      } else {
        setApiError(data.error?.message || data.message || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('Vendor login error:', error);
      setApiError('Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle user registration
  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setApiError('');

    try {
      await register(
        formData.name,
        formData.email,
        formData.password,
        formData.phone || undefined
      );
      onClose();
      resetForm();
    } catch (error) {
      setApiError(error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      confirmPassword: ''
    });
    setErrors({});
    setApiError('');
    setShowPassword(false);
  };

  // Handle Google login for users
  const handleUserGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      if (googleAuthInFlightRef.current) return;
      googleAuthInFlightRef.current = true;
      setGoogleLoading(true);
      setApiError('');
      
      try {
        // Send full Google response; backend resolves code/id_token/access_token safely.
        await googleLogin(tokenResponse, 'user');
        onClose();
        resetForm();
      } catch (error) {
        console.error('Google login error:', error);
        setApiError(error.message || 'Google sign-in failed. Please try again.');
      } finally {
        setGoogleLoading(false);
        googleAuthInFlightRef.current = false;
      }
    },
    onError: (error) => {
      console.error('Google login error:', error);
      setApiError('Google sign-in was cancelled or failed. Please try again.');
      setGoogleLoading(false);
      googleAuthInFlightRef.current = false;
    },
    flow: 'implicit',
    scope: 'openid email profile',
  });

  // Handle Google login for vendors
  const handleVendorGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      if (googleAuthInFlightRef.current) return;
      googleAuthInFlightRef.current = true;
      setGoogleLoading(true);
      setApiError('');
      
      try {
        // Send full Google response; backend resolves code/id_token/access_token safely.
        const loginResponse = await fetch(getApiUrl('vendors/google-login'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: tokenResponse?.code,
            token: tokenResponse?.token,
            credential: tokenResponse?.credential,
            idToken: tokenResponse?.idToken || tokenResponse?.id_token,
            accessToken: tokenResponse?.accessToken || tokenResponse?.access_token
          })
        });

        const loginData = await loginResponse.json();

        if (loginResponse.ok && loginData.success) {
          const vendor = loginData.data;
          const token = loginData.token;
          
          localStorage.setItem('authToken', token);
          localStorage.setItem('vendorToken', token);
          localStorage.setItem('vendorId', vendor._id);
          localStorage.setItem('vendorEmail', vendor.email);
          localStorage.setItem('vendorBusinessName', vendor.businessName || vendor.name);
          localStorage.setItem('vendorData', JSON.stringify(vendor));
          localStorage.setItem('userRole', 'vendor');
          
          setVendor(vendor);
          setVendorToken(token);
          
          onClose();
          resetForm();
          navigate('/vendor-dashboard');
        } else {
          throw new Error(loginData.error?.details || loginData.error?.message || 'Google sign-in failed');
        }
      } catch (error) {
        console.error('Google login error:', error);
        setApiError(error.message || 'Google sign-in failed. Please try again.');
      } finally {
        setGoogleLoading(false);
        googleAuthInFlightRef.current = false;
      }
    },
    onError: (error) => {
      console.error('Google login error:', error);
      setApiError('Google sign-in was cancelled or failed. Please try again.');
      setGoogleLoading(false);
      googleAuthInFlightRef.current = false;
    },
    flow: 'implicit',
    scope: 'openid email profile',
  });

  // Handle user type change
  const handleUserTypeChange = (type) => {
    setUserType(type);
    setActiveTab('login');
    resetForm();
  };

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    resetForm();
  };

  // Handle modal close
  const handleClose = () => {
    resetForm();
    setActiveTab('login');
    onClose();
  };

  // Prevent background scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
    return undefined;
  }, [isOpen]);

  // Reset to initial user type when modal opens
  useEffect(() => {
    if (isOpen) {
      setUserType(initialUserType);
      setActiveTab('login');
    }
  }, [isOpen, initialUserType]);

  if (!isOpen) return null;

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slideUp my-8 max-h-[95vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all hover:rotate-90 transform duration-300"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header with User Type Selection */}
        <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white p-8 pb-6">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-2">Welcome Back!</h2>
            <p className="text-indigo-100 text-sm mb-6">
              Sign in to access your account
            </p>

            {/* User Type Selector */}
            <div className="flex gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-1.5">
              <button
                onClick={() => handleUserTypeChange('user')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-300 ${
                  userType === 'user'
                    ? 'bg-white text-indigo-600 shadow-lg'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <UserCircle className="w-5 h-5" />
                <span>User</span>
              </button>
              <button
                onClick={() => handleUserTypeChange('vendor')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-300 ${
                  userType === 'vendor'
                    ? 'bg-white text-purple-600 shadow-lg'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <Building2 className="w-5 h-5" />
                <span>Vendor</span>
              </button>
            </div>
          </div>
          
        </div>

        {/* Login/Register Tabs (Only for User) */}
        {userType === 'user' && (
          <div className="flex border-b border-gray-200 bg-gray-50">
            <button
              onClick={() => handleTabChange('login')}
              className={`flex-1 py-4 text-center font-semibold transition-all duration-200 relative ${
                activeTab === 'login'
                  ? 'text-indigo-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              Login
              {activeTab === 'login' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-600 to-purple-600"></div>
              )}
            </button>
            <button
              onClick={() => handleTabChange('register')}
              className={`flex-1 py-4 text-center font-semibold transition-all duration-200 relative ${
                activeTab === 'register'
                  ? 'text-indigo-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              Register
              {activeTab === 'register' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-600 to-purple-600"></div>
              )}
            </button>
          </div>
        )}

        {/* Vendor Header Info */}
        {userType === 'vendor' && (
          <div className="bg-gradient-to-r from-[var(--premium-bg-elevated)] to-[#f3f8ff] border-b border-[var(--premium-border)] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[var(--premium-blue)] to-[#24496f] rounded-lg flex items-center justify-center shadow-sm">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Vendor Access</h3>
                <p className="text-xs text-gray-600">Manage your business dashboard</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {apiError && (
          <div className="mx-6 mt-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 flex-1">{apiError}</p>
          </div>
        )}

        {/* Form */}
        <form 
          onSubmit={
            userType === 'vendor' 
              ? handleVendorLogin 
              : activeTab === 'login' 
                ? handleUserLogin 
                : handleRegister
          } 
          className="p-6 space-y-5"
        >
          {/* Name Field (Only for user registration) */}
          {userType === 'user' && activeTab === 'register' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full pl-11 pr-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all ${
                    errors.name ? 'border-red-500' : 'border-gray-200 focus:border-indigo-500'
                  }`}
                  placeholder="John Doe"
                />
              </div>
              {errors.name && (
                <p className="text-xs text-red-600 mt-1.5 ml-1">{errors.name}</p>
              )}
            </div>
          )}

          {/* Email Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full pl-11 pr-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all ${
                  errors.email ? 'border-red-500' : 'border-gray-200 focus:border-indigo-500'
                }`}
                placeholder="your@email.com"
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-600 mt-1.5 ml-1">{errors.email}</p>
            )}
          </div>

          {/* Phone Field (Only for user registration) */}
          {userType === 'user' && activeTab === 'register' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Phone Number <span className="text-gray-400 text-xs">(Optional)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`w-full pl-11 pr-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all ${
                    errors.phone ? 'border-red-500' : 'border-gray-200 focus:border-indigo-500'
                  }`}
                  placeholder="10-digit mobile number"
                  maxLength="10"
                />
              </div>
              {errors.phone && (
                <p className="text-xs text-red-600 mt-1.5 ml-1">{errors.phone}</p>
              )}
            </div>
          )}

          {/* Password Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete={activeTab === 'login' ? 'current-password' : 'new-password'}
                value={formData.password}
                onChange={handleChange}
                className={`w-full pl-11 pr-12 py-3 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all ${
                  errors.password ? 'border-red-500' : 'border-gray-200 focus:border-indigo-500'
                }`}
                placeholder={activeTab === 'register' ? 'Min 6 characters' : 'Enter your password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle-btn"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-600 mt-1.5 ml-1">{errors.password}</p>
            )}
            {activeTab === 'login' && (
              <div className="mt-2 text-right">
                <Link
                  to="/forgot-password"
                  onClick={handleClose}
                  className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline font-medium"
                >
                  Forgot Password?
                </Link>
              </div>
            )}
          </div>

          {/* Confirm Password Field (Only for user registration) */}
          {userType === 'user' && activeTab === 'register' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full pl-11 pr-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all ${
                    errors.confirmPassword ? 'border-red-500' : 'border-gray-200 focus:border-indigo-500'
                  }`}
                  placeholder="Confirm your password"
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-600 mt-1.5 ml-1">{errors.confirmPassword}</p>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 ${
              userType === 'vendor'
                ? 'bg-gradient-to-r from-[var(--premium-blue)] to-[#24496f] hover:from-[#1b3958] hover:to-[#1f3c5d]'
                : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {activeTab === 'register' ? 'Creating Account...' : 'Signing In...'}
              </>
            ) : (
              <>
                {userType === 'vendor' ? (
                  <>
                    <Building2 className="w-5 h-5" />
                    Login to Dashboard
                  </>
                ) : activeTab === 'login' ? (
                  <>
                    <UserCircle className="w-5 h-5" />
                    Sign In
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Create Account
                  </>
                )}
              </>
            )}
          </button>

          {/* Separator */}
          {activeTab === 'login' && (
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-white text-sm text-gray-500 font-medium">Or continue with</span>
              </div>
            </div>
          )}

          {/* Google Sign-In Button */}
          {activeTab === 'login' && (
            <button
              type="button"
              onClick={userType === 'vendor' ? handleVendorGoogleLogin : handleUserGoogleLogin}
              disabled={googleLoading || loading}
              className="w-full bg-white border-2 border-gray-200 text-gray-700 py-3.5 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-300 hover:shadow-md transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
            >
              {googleLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign in with Google
                </>
              )}
            </button>
          )}

          {/* Vendor Registration Link */}
          {userType === 'vendor' && (
            <div className="pt-4 border-t border-gray-200">
              <p className="text-center text-sm text-gray-600">
                Don't have a vendor account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    navigate('/vendor-registration');
                  }}
                  className="text-purple-600 hover:text-purple-700 font-bold hover:underline inline-flex items-center gap-1"
                >
                  <Sparkles className="w-4 h-4" />
                  Become a Partner
                </button>
              </p>
            </div>
          )}
        </form>

        {/* Footer Note */}
        <div className={`px-6 py-4 border-t border-gray-100 ${
          userType === 'vendor' 
            ? 'bg-gradient-to-r from-purple-50 to-pink-50' 
            : 'bg-gray-50'
        }`}>
          <p className="text-xs text-gray-600 text-center leading-relaxed">
            {userType === 'vendor' ? (
              <>
                <Building2 className="w-3.5 h-3.5 inline mr-1" />
                Vendor accounts have access to business dashboard and analytics
              </>
            ) : activeTab === 'login' ? (
              <>
                <UserCircle className="w-3.5 h-3.5 inline mr-1" />
                Sign in with your account credentials
              </>
            ) : (
              <>
                By registering, you agree to our{' '}
                <Link to="/terms-and-conditions" onClick={handleClose} className="text-indigo-600 hover:underline font-medium">
                  Terms of Service
                </Link>
                {' '}and{' '}
                <Link to="/privacy-policy" onClick={handleClose} className="text-indigo-600 hover:underline font-medium">
                  Privacy Policy
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default UnifiedLoginModal;
