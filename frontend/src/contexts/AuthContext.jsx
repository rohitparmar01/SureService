import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../config/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedToken = localStorage.getItem('authToken');
        const storedUser = localStorage.getItem('authUser');

        
        if (storedToken) {
        }

        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsedUser);
        } else {
        }
      } catch (error) {
        console.error('❌ Error initializing auth:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      
      const response = await fetch(getApiUrl('users/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Login failed');
      }

      // Store token and user data
      const userToken = data.data.token;
      const userData = data.data.user;
      
      localStorage.setItem('authToken', userToken);
      localStorage.setItem('authUser', JSON.stringify(userData));
      
      
      setToken(userToken);
      setUser(userData);

      // Redirect based on role
      if (userData.role === 'admin') {
        setTimeout(() => navigate('/admin'), 100); // Small delay to ensure state is set
      } else {
        navigate('/dashboard');
      }

      return { success: true, user: userData };
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  };

  // Register function
  const register = async (name, email, password, phone) => {
    try {
      const response = await fetch(getApiUrl('users/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password, phone })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Registration failed');
      }

      // Store token and user data
      localStorage.setItem('authToken', data.data.token);
      localStorage.setItem('authUser', JSON.stringify(data.data.user));
      
      setToken(data.data.token);
      setUser(data.data.user);

      // Redirect to user dashboard
      navigate('/dashboard');

      return { success: true, user: data.data.user };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  // Google Login function — supports auth-code and token-based Google responses
  const googleLogin = async (googleCredential, userType = 'user') => {
    try {
      // Determine the endpoint based on user type
      const endpoint = userType === 'vendor' 
        ? getApiUrl('vendors/google-login')
        : getApiUrl('users/google-login');

      const payload =
        typeof googleCredential === 'string'
          ? { code: googleCredential }
          : {
              code: googleCredential?.code,
              token: googleCredential?.token,
              credential: googleCredential?.credential,
              idToken: googleCredential?.idToken || googleCredential?.id_token,
              accessToken: googleCredential?.accessToken || googleCredential?.access_token
            };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Google login failed');
      }

      // For vendors, the response structure is slightly different
      if (userType === 'vendor') {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('authUser', JSON.stringify(data.data));
        
        setToken(data.token);
        setUser(data.data);

        // Redirect to vendor dashboard
        navigate('/vendor/dashboard');
      } else {
        // For users/admin
        localStorage.setItem('authToken', data.data.token);
        localStorage.setItem('authUser', JSON.stringify(data.data.user));
        
        setToken(data.data.token);
        setUser(data.data.user);

        // Redirect based on role
        if (data.data.user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }

      return { success: true, user: userType === 'vendor' ? data.data : data.data.user };
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  };

  // Logout function
  const logout = () => {
    try {
      // Clear storage
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      
      // Clear state
      setToken(null);
      setUser(null);

      // Redirect to home
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Update user profile
  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('authUser', JSON.stringify(updatedUser));
  };

  // Check if user is admin
  const isAdmin = () => {
    return user?.role === 'admin';
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!token && !!user;
  };

  // Get auth header for API calls
  const getAuthHeader = () => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    googleLogin,
    logout,
    updateUser,
    isAdmin,
    isAuthenticated,
    getAuthHeader
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
