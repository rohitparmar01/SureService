import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  CheckCircle, ChevronRight, ChevronLeft, Check, AlertCircle, 
  Building2, MapPin, Clock, User, Mail, Phone, Camera, 
  IndianRupee, Shield, Info, Lock, Eye, EyeOff, Search,
  Zap, TrendingUp, Crown, Sparkles, Award, Star, Home,
  Upload, X, Image as ImageIcon, Loader, Plus, Trash2
} from 'lucide-react';
import { getAllServices } from '../services/taxonomyService';
import { fetchCities } from '../services/dynamicDataService';
import UnifiedLoginModal from '../components/UnifiedLoginModal';
import { getApiUrl } from '../config/api';

const API_BASE_URL = getApiUrl();
import { getImageLimit, formatImageLimit } from '../utils/planLimits';
import { uploadVendorImage } from '../services/vendorService';

/**
 * PROFESSIONAL VENDOR REGISTRATION FORM
 * Redesigned like JustDial/Amazon/Flipkart
 * - Clean UI
 * - Simple validation
 * - User-friendly
 */

const VendorRegistrationNew = () => {
  const YEARLY_DISCOUNT = 0.17;
  const getYearlyPrice = (monthlyPrice) => Math.round(monthlyPrice * 12 * (1 - YEARLY_DISCOUNT));

  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showManualCategory, setShowManualCategory] = useState(false);
  const [citySearchTerm, setCitySearchTerm] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  // Data from backend
  const [services, setServices] = useState([]);
  const [vendorServices, setVendorServices] = useState([]); // Formatted for dropdown
  const [cities, setCities] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Login modal
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  // Image upload state
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imagePreview, setImagePreview] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  // Form data - Keep it simple
  const [formData, setFormData] = useState({
    // Step 1: Business Category
    serviceType: '',
    customService: '',
    
    // Step 2: Business Details
    businessName: '',
    city: '',
    area: '',
    pincode: '',
    address: '',
    
    // Step 3: Business Hours
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    openTime: '09:00',
    closeTime: '18:00',
    
    // Step 4: Contact Details
    contactPerson: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    
    // Step 5: Photos (Optional)
    photos: [],
    
    // Step 6: Pricing (Swapped)
    minPrice: '',
    maxPrice: '',
    priceUnit: 'per service',
    description: '',
    
    // Step 7: Plan Selection (Moved to end)
    selectedPlan: 'free',
    billingCycle: 'monthly',
    planPrice: 0,
    planDuration: 'Forever'
  });

  const totalSteps = 7;

  // Visibility Plans - Detailed version with all features
  // ⚠️ IMPORTANT: Replace razorpayPlanId with YOUR actual Plan IDs from Razorpay Dashboard
  // These are example IDs - they won't work until you create plans in YOUR Razorpay account
  // Guide: See CREATE_RAZORPAY_PLANS_GUIDE.md in project root
  const visibilityPlans = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      duration: 'Forever',
      popular: false,
      icon: Home,
      color: 'green',
      features: [
        'Basic listing',
        'Up to 5 portfolio images',
        'Standard search visibility',
        'Customer inquiries enabled'
      ],
      limitations: ['No featured placement', 'No verified badge', 'Limited visibility']
    },
    {
      id: 'starter',
      name: 'Starter',
      price: 499,
      duration: '30 days',
      razorpayPlanId: 'plan_SL71J6JDaIhiFK',
      popular: false,
      icon: Zap,
      color: 'indigo',
      bonusDays: 30,
      features: [
        '🎁 First 30 days FREE on first purchase',
        'Verified badge',
        'Up to 15 media files',
        'Higher search ranking',
        'Profile managed by SureService team',
        'Priority customer support'
      ],
      limitations: []
    },
    {
      id: 'growth',
      name: 'Growth',
      price: 999,
      duration: '30 days',
      razorpayPlanId: 'plan_SL73GQTdKIm6cg',
      popular: true,
      icon: TrendingUp,
      color: 'purple',
      bonusDays: 30,
      features: [
        '🎁 First 30 days FREE on first purchase',
        'Featured placement',
        'Up to 30 media files',
        'Top search priority',
        'Portfolio enhancement',
        'Social media promotion'
      ],
      limitations: []
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 1499,
      duration: '30 days',
      razorpayPlanId: 'plan_SL74BmgIUboBiO',
      popular: false,
      icon: Crown,
      color: 'amber',
      bonusDays: 30,
      features: [
        '🎁 First 30 days FREE on first purchase',
        'Premium badge',
        'Unlimited media uploads',
        'Maximum visibility',
        'Social media shoutouts',
        'Dedicated optimization',
        'Priority in high-demand searches'
      ],
      limitations: []
    }
  ];

  useEffect(() => {
    const selectedPlan = visibilityPlans.find((p) => p.id === formData.selectedPlan);
    if (!selectedPlan || selectedPlan.price === 0) {
      return;
    }

    const effectivePrice = formData.billingCycle === 'yearly'
      ? getYearlyPrice(selectedPlan.price)
      : selectedPlan.price;
    const effectiveDuration = formData.billingCycle === 'yearly' ? '365 days' : selectedPlan.duration;

    if (formData.planPrice !== effectivePrice || formData.planDuration !== effectiveDuration) {
      setFormData((prev) => ({
        ...prev,
        planPrice: effectivePrice,
        planDuration: effectiveDuration
      }));
    }
  }, [formData.billingCycle, formData.selectedPlan]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const planFromQuery = (params.get('plan') || '').toLowerCase().trim();
    if (!planFromQuery) return;

    const matchedPlan = visibilityPlans.find((p) => p.id === planFromQuery);
    if (!matchedPlan) return;

    const effectivePrice = formData.billingCycle === 'yearly'
      ? getYearlyPrice(matchedPlan.price)
      : matchedPlan.price;
    const effectiveDuration = matchedPlan.price === 0
      ? matchedPlan.duration
      : formData.billingCycle === 'yearly' ? '365 days' : matchedPlan.duration;

    setFormData((prev) => ({
      ...prev,
      selectedPlan: matchedPlan.id,
      planPrice: effectivePrice,
      planDuration: effectiveDuration
    }));
  }, [location.search]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Cleanup image previews on unmount
  useEffect(() => {
    return () => {
      imagePreview.forEach(image => {
        if (image.preview) {
          URL.revokeObjectURL(image.preview);
        }
      });
    };
  }, [imagePreview]);

  const loadData = async () => {
    setDataLoading(true);
    try {
      const [servicesData, citiesData] = await Promise.all([
        getAllServices(),
        fetchCities()
      ]);
      
      setServices(servicesData || []);
      
      // Format services for dropdown
      const formattedServices = (servicesData || []).map(service => ({
        value: service.taxonomyId,
        label: service.name,
        icon: service.icon || '🔧',
        category: service.parentName || 'Others'
      }));
      setVendorServices(formattedServices);
      
      setCities(Array.isArray(citiesData) ? citiesData : []);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load data. Please refresh the page.');
    } finally {
      setDataLoading(false);
    }
  };

  // Handle input change
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(''); // Clear error when user types
  };

  const getCityName = (city) => {
    if (typeof city === 'string') return city;
    return city?.name || '';
  };

  const cityNames = Array.from(new Set((cities || []).map(getCityName).filter(Boolean)));
  const filteredCityNames = citySearchTerm.trim()
    ? cityNames.filter((name) => name.toLowerCase().includes(citySearchTerm.trim().toLowerCase())).slice(0, 80)
    : cityNames.slice(0, 80);

  const handleCitySelect = (cityName) => {
    handleChange('city', cityName);
    setCitySearchTerm(cityName);
    setShowCityDropdown(false);
  };

  useEffect(() => {
    setCitySearchTerm(formData.city || '');
  }, [formData.city]);

  // Toggle working day
  const toggleDay = (day) => {
    setFormData(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day]
    }));
  };

  // Image Upload Functions
  const handleImageUpload = async (files) => {
    const fileArray = Array.from(files);
    // Free plan gets 5 images during registration
    const maxImages = getImageLimit('free');
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    // Validate number of images
    if (imagePreview.length + fileArray.length > maxImages) {
      setError(`Free plan allows maximum ${maxImages} images. Upgrade to add more photos later!`);
      return;
    }

    // Validate each file
    const validFiles = [];
    for (const file of fileArray) {
      if (!allowedTypes.includes(file.type)) {
        setError(`Invalid file type: ${file.name}. Only JPG, PNG, and WEBP are allowed.`);
        continue;
      }
      if (file.size > maxSize) {
        setError(`File too large: ${file.name}. Maximum size is 5MB.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    setUploadingImages(true);
    setError('');

    // Create preview URLs
    const newPreviews = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      uploading: true
    }));

    setImagePreview(prev => [...prev, ...newPreviews]);

    // Upload images to Cloudinary immediately
    try {
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        
        try {
          
          // Upload to Cloudinary
          const cloudinaryResult = await uploadVendorImage(file);
          
          // Store Cloudinary URL with proper metadata structure
          setFormData(prev => ({
            ...prev,
            photos: [...prev.photos, {
              url: cloudinaryResult.url,
              publicId: cloudinaryResult.publicId,
              metadata: {
                width: cloudinaryResult.width,
                height: cloudinaryResult.height,
                format: cloudinaryResult.format,
                size: cloudinaryResult.size
              }
            }]
          }));

          // Update preview to show uploaded
          setImagePreview(prev => 
            prev.map(p => 
              p.name === file.name ? { ...p, uploading: false, uploaded: true } : p
            )
          );
        } catch (uploadError) {
          console.error(`❌ Failed to upload ${file.name}:`, uploadError);
          setError(`Failed to upload ${file.name}: ${uploadError.message}`);
          
          // Remove failed preview
          setImagePreview(prev => prev.filter(p => p.name !== file.name));
        }
      }
    } catch (err) {
      console.error('❌ Image upload error:', err);
      setError(err.message || 'Failed to upload images');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleRemoveImage = (index) => {
    // Get the preview item to clean up
    const preview = imagePreview[index];
    if (preview.preview) {
      URL.revokeObjectURL(preview.preview);
    }
    
    // Remove from both preview and formData
    setImagePreview(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleImageUpload(files);
    }
  };

  // Handle category selection
  const handleCategorySelect = (service) => {
    handleChange('serviceType', service.value);
    setCategorySearch(service.label);
    setShowCategoryDropdown(false);
    handleChange('customService', '');
  };

  // Filter services based on search
  const filteredServices = vendorServices.filter(service => {
    const searchLower = categorySearch.toLowerCase();
    return service.label?.toLowerCase().includes(searchLower);
  });

  // SIMPLE VALIDATION - Only required fields
  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!formData.serviceType && !formData.customService.trim()) return 'Please select or enter a business category';
        break;
        
      case 2:
        if (!formData.businessName.trim()) return 'Business name is required';
        if (!formData.city) return 'Please select city';
        if (!formData.area.trim()) return 'Area/Locality is required';
        if (!formData.pincode.trim()) return 'Pincode is required';
        if (!/^\d{6}$/.test(formData.pincode.trim())) return 'Enter valid 6-digit pincode';
        break;
        
      case 3:
        if (formData.workingDays.length === 0) return 'Select at least one working day';
        break;
        
      case 4:
        if (!formData.contactPerson.trim()) return 'Contact person name is required';
        
        const phone = formData.phone.replace(/\D/g, '');
        if (phone.length !== 10) return 'Enter valid 10-digit mobile number';
        
        if (!formData.email.trim()) return 'Email is required';
        if (!/^\S+@\S+\.\S+$/.test(formData.email)) return 'Enter valid email address';
        
        if (!formData.password) return 'Password is required';
        if (formData.password.length < 6) return 'Password must be at least 6 characters';
        
        if (formData.password !== formData.confirmPassword) return 'Passwords do not match';
        break;
        
      case 5:
        // Photos optional, but if uploading, wait for completion
        if (uploadingImages) return 'Please wait for images to finish uploading';
        break;
        
      case 6:
        if (!formData.minPrice || !formData.maxPrice) return 'Enter your pricing range';
        if (Number(formData.minPrice) >= Number(formData.maxPrice)) return 'Max price must be greater than min price';
        if (Number(formData.minPrice) < 100) return 'Minimum price seems too low';
        break;
        
      case 7:
        if (!formData.selectedPlan) return 'Please select a plan';
        break;
    }
    return null;
  };

  // Navigate to next step
  const nextStep = () => {
    const validationError = validateStep(currentStep);
    if (validationError) {
      setError(validationError);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    setError('');
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Navigate to previous step
  const prevStep = () => {
    setError('');
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Submit form
  const handleSubmit = async () => {
    // Validate all steps before submit
    for (let i = 1; i <= 7; i++) {
      const validationError = validateStep(i);
      if (validationError) {
        setError(`Step ${i}: ${validationError}`);
        return;
      }
    }

    setError('');
    
    const selectedPlan = visibilityPlans.find(p => p.id === formData.selectedPlan);
    
    // Free plan: Direct registration (no payment)
    if (selectedPlan.id === 'free') {
      await registerFreeVendor();
      return;
    }

    // Paid plans: Initialize Razorpay subscription
    await initializePayment(selectedPlan);
  };

  // Register vendor with free plan (no payment required)
  const registerFreeVendor = async () => {
    setLoading(true);
    setError('');

    try {
      const payload = prepareVendorData();
      payload.subscription = {
        planKey: 'free',
        planName: 'Free',
        status: 'inactive'
      };

      

      const response = await fetch(`${API_BASE_URL}/vendors/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Registration failed');
      }

      
      setSuccess(true);
      setRegisteredEmail(formData.email);
      
      setTimeout(() => {
        setShowLoginModal(true);
      }, 2000);

    } catch (err) {
      console.error('❌ Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Initialize Razorpay payment for paid plans
  const initializePayment = async (selectedPlan) => {
    setLoading(true);
    setError('');

    try {
      const vendorData = prepareVendorData();
      
      // Step 1: Create order with backend
      
      const response = await fetch(`${API_BASE_URL}/subscription/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planKey: selectedPlan.id, // SECURITY: Only send plan key, not Razorpay plan ID
          billingCycle: formData.billingCycle,
          vendorData: vendorData
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to create order');
      }

      
      // Step 2: Open Razorpay standard checkout (NOT autopay)
      if (!window.Razorpay) {
        throw new Error('Razorpay SDK not loaded. Please refresh the page.');
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID, // Must be set in environment
        amount: data.amount, // Amount in paise
        currency: data.currency,
        order_id: data.orderId, // STANDARD CHECKOUT (not subscription)
        name: 'SureService',
        description: `${selectedPlan.name} Plan - ₹${data.planPrice}/${data.billingCycle === 'yearly' ? 'year' : '30 days'}`,
        handler: async function(paymentResponse) {
          // Step 3: Verify payment and complete registration
          await completeRegistrationWithPayment(paymentResponse, vendorData, selectedPlan);
        },
        prefill: {
          name: formData.contactPerson,
          email: formData.email,
          contact: formData.phone
        },
        notes: {
          plan: selectedPlan.name,
          billingCycle: formData.billingCycle,
          duration: data.baseDays ? `${data.baseDays} days` : (formData.billingCycle === 'yearly' ? '365 days' : '30 days')
        },
        theme: {
          color: '#4F46E5' // Indigo color
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
            setError('Payment cancelled. Please try again.');
            fetch(`${API_BASE_URL}/subscription/cancel-order`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId: data.orderId })
            }).catch(() => {});
          }
        }
      };

      const rzp = new window.Razorpay(options);
      
      rzp.on('payment.failed', function(response) {
        console.error('❌ Payment failed:', response.error);
        setError(`Payment failed: ${response.error.description}`);

        const failedOrderId = response?.error?.metadata?.order_id || data.orderId;
        const failedPaymentId = response?.error?.metadata?.payment_id || null;
        fetch(`${API_BASE_URL}/subscription/mark-failed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: failedOrderId,
            paymentId: failedPaymentId,
            error: {
              code: response?.error?.code,
              description: response?.error?.description,
              source: response?.error?.source,
              reason: response?.error?.reason
            }
          })
        }).catch(() => {});

        setLoading(false);
      });

      rzp.open();
      setLoading(false);

    } catch (err) {
      console.error('❌ Payment initialization error:', err);
      setError(err.message || 'Failed to initialize payment');
      setLoading(false);
    }
  };

  // Complete registration after successful payment
  const completeRegistrationWithPayment = async (paymentResponse, vendorData, selectedPlan) => {
    setLoading(true);
    setError('');

    try {
      
      const response = await fetch(`${API_BASE_URL}/subscription/complete-registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_payment_id: paymentResponse.razorpay_payment_id,
          razorpay_order_id: paymentResponse.razorpay_order_id,
          razorpay_signature: paymentResponse.razorpay_signature,
          vendorData: {
            ...vendorData,
            subscription: {
              planKey: selectedPlan.id,
              planName: selectedPlan.name,
              billingCycle: formData.billingCycle
            }
          }
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Registration verification failed');
      }

      
      // Store token and vendor data
      if (data.token) {
        localStorage.setItem('vendorToken', data.token);
        localStorage.setItem('vendorData', JSON.stringify(data.vendor));
      }
      
      setSuccess(true);
      setRegisteredEmail(formData.email);
      
      setTimeout(() => {
        setShowLoginModal(true);
      }, 2000);

    } catch (err) {
      console.error('❌ Registration completion error:', err);
      setError(err.message || 'Failed to complete registration. Please contact support.');
    } finally {
      setLoading(false);
    }
  };

  // Prepare vendor data payload
  const prepareVendorData = () => {
    return {
      name: formData.contactPerson.trim(),
      businessName: formData.businessName.trim(),
      serviceType: formData.serviceType || formData.customService.trim(),
      location: {
        type: 'Point',
        coordinates: [75.8577, 22.7196] // Default, will be geocoded by backend
      },
      city: formData.city,
      area: formData.area,
      address: formData.address || `${formData.area}, ${formData.city}`,
      pincode: formData.pincode,
      pricing: {
        min: Number(formData.minPrice),
        max: Number(formData.maxPrice),
        average: Math.round((Number(formData.minPrice) + Number(formData.maxPrice)) / 2),
        unit: formData.priceUnit,
        currency: 'INR'
      },
      filters: {
        working_days: formData.workingDays,
        open_time: formData.openTime,
        close_time: formData.closeTime
      },
      contact: {
        phone: formData.phone,
        email: formData.email.toLowerCase(),
        whatsapp: formData.phone
      },
      password: formData.password,
      yearsInBusiness: 0,
      totalBookings: 0,
      completedBookings: 0,
      teamSize: 0,
      description: formData.description.trim() || undefined,
      photos: formData.photos.length > 0 ? formData.photos : undefined
    };
  };

  // Function to complete registration (OLD - for reference, will be replaced)
  const completeRegistration = async () => {
    // This function is no longer used - replaced by registerFreeVendor and completeRegistrationWithPayment
  };

  // Step titles
  const stepTitles = [
    'Category',
    'Business',
    'Timing',
    'Contact',
    'Photos (Optional)',
    'Pricing',
    'Plan'
  ];

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
          <p className="text-gray-600 mb-4">
            Your account has been created successfully. Please check your email ({registeredEmail}) for verification.
          </p>
          <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-left">
            <p className="text-sm text-amber-900 font-semibold mb-1">⏳ Pending Admin Approval</p>
            <p className="text-xs text-amber-700">
              Your profile and uploaded photos are pending admin approval. Once approved, your profile will be live and you can login to manage your dashboard.
            </p>
          </div>
          <button
            onClick={() => setShowLoginModal(true)}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium"
          >
            Login Now
          </button>
        </div>
        <UnifiedLoginModal 
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          initialUserType="vendor"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto px-4 mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Vendor Registration</h1>
        <p className="text-gray-600">Join our platform and grow your business</p>
      </div>

      {/* Progress Steps */}
      <div className="max-w-4xl mx-auto px-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6 vendor-steps">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5, 6, 7].map((step, idx) => (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold step-indicator
                    ${currentStep > step ? 'step-complete' : currentStep === step ? 'step-active' : 'step-upcoming'}`}>
                    {currentStep > step ? <Check className="w-5 h-5" /> : step}
                  </div>
                  <span className="text-xs mt-2 text-center max-w-[60px] hidden sm:block">
                    {stepTitles[step - 1]}
                  </span>
                </div>
                {idx < 6 && (
                  <div className={`flex-1 h-1 mx-2 ${currentStep > step ? 'bg-green-600' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-4xl mx-auto px-4 mb-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Form */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-8">
          
          {/* STEP 1: Business Category */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">Select Business Category</h2>
                <p className="text-sm text-gray-600">Choose your primary service category</p>
              </div>

              {/* Loading State */}
              {dataLoading && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                  <p className="text-sm text-gray-600">Loading business categories...</p>
                </div>
              )}

              {/* Unified Category Browser */}
              {!dataLoading && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Business Category <span className="text-red-500">*</span>
                  </label>

                  {/* Selected Category Display */}
                  {(formData.serviceType || formData.customService) && (
                    <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <span className="text-sm text-green-800 font-medium">
                        Selected: {formData.serviceType ? (vendorServices.find(s => s.value === formData.serviceType)?.label) : formData.customService}
                      </span>
                    </div>
                  )}

                  {/* Unified Scrollable Category Browser */}
                  <div className="border-2 border-gray-300 rounded-lg shadow-md overflow-hidden">
                    {/* Search Header */}
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                        <input
                          type="text"
                          value={categorySearch}
                          onChange={(e) => setCategorySearch(e.target.value)}
                          placeholder="Search services (e.g., AC repair, CCTV, IT hardware, electrical, plumbing)"
                          className="w-full h-12 pl-12 pr-4 border-2 border-gray-300 rounded-lg text-sm font-semibold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Scrollable Category List */}
                    <div className="max-h-64 overflow-y-auto">
                      {[
                        'Air Conditioning (HVAC)',
                        'CCTV & Security',
                        'IT Hardware & Computer',
                        'Electrical & Power',
                        'Plumbing & Sanitation',
                        'Others'
                      ].map((cat) => {
                        const categoryServices = filteredServices.filter(s => s.category === cat);
                        if (categoryServices.length === 0) return null;
                        
                        return (
                          <div key={cat}>
                            {/* Sticky Category Header */}
                            <div className="sticky top-0 bg-gray-100 px-4 py-2 border-b border-gray-200">
                              <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{cat}</h4>
                            </div>
                            
                            {/* Services under this category */}
                            <div className="bg-white">
                              {categoryServices.map((service) => (
                                <button
                                  key={service.value}
                                  type="button"
                                  onClick={() => handleCategorySelect(service)}
                                  className={`w-full px-4 py-2.5 text-left hover:bg-blue-50 flex items-center gap-3 border-b border-gray-100 transition-colors
                                            ${formData.serviceType === service.value ? 'bg-blue-50' : ''}`}
                                >
                                  <span className="text-xl">{service.icon}</span>
                                  <span className="text-sm text-gray-700 flex-1">{service.label}</span>
                                  {formData.serviceType === service.value && (
                                    <Check className="w-4 h-4 text-blue-600" />
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Manual Category Entry - Below Dropdown */}
                  <div className="mt-4 p-4 bg-gray-50 border border-gray-300 rounded-lg">
                    <div className="flex items-start gap-2 mb-3">
                      <Info className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Can't find your category?</p>
                        <p className="text-xs text-gray-600">Enter your service or business category manually below</p>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={formData.customService}
                      onChange={(e) => {
                        handleChange('customService', e.target.value);
                        handleChange('serviceType', ''); // Clear dropdown selection
                      }}
                      placeholder="e.g. AC Installation, CCTV Maintenance, Server Setup, Electrical Repair, etc."
                      className="w-full px-4 py-2.5 text-sm font-medium border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Business Details */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Business Details</h2>
                <p className="text-gray-600">Tell us about your business location</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={(e) => handleChange('businessName', e.target.value)}
                    placeholder="Enter your business name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={citySearchTerm}
                        onChange={(e) => {
                          setCitySearchTerm(e.target.value);
                          setShowCityDropdown(true);
                          handleChange('city', e.target.value);
                        }}
                        onFocus={() => setShowCityDropdown(true)}
                        onBlur={() => setTimeout(() => setShowCityDropdown(false), 180)}
                        placeholder="Search and select city"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />

                      {showCityDropdown && (
                        <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                          {filteredCityNames.length > 0 ? (
                            filteredCityNames.map((cityName) => (
                              <button
                                key={cityName}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => handleCitySelect(cityName)}
                                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 border-b border-gray-100 last:border-b-0 ${
                                  formData.city === cityName ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700'
                                }`}
                              >
                                {cityName}
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-sm text-gray-500">No city found</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pincode <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.pincode}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        if (value.length <= 6) handleChange('pincode', value);
                      }}
                      placeholder="452001"
                      maxLength="6"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Area/Locality <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.area}
                    onChange={(e) => handleChange('area', e.target.value)}
                    placeholder="e.g., Vijay Nagar, MG Road"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Address (Optional)
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="Building name, street, landmark..."
                    rows="3"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Business Hours */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Business Hours</h2>
                <p className="text-gray-600">When are you available?</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Working Days <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                    <button
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={`px-6 py-3 rounded-lg font-medium transition-all
                        ${formData.workingDays.includes(day)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opening Time
                  </label>
                  <input
                    type="time"
                    value={formData.openTime}
                    onChange={(e) => handleChange('openTime', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Closing Time
                  </label>
                  <input
                    type="time"
                    value={formData.closeTime}
                    onChange={(e) => handleChange('closeTime', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Contact Details */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Contact Details</h2>
                <p className="text-gray-600">How can customers reach you?</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Person Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => handleChange('contactPerson', e.target.value)}
                    placeholder="Your full name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        if (value.length <= 10) handleChange('phone', value);
                      }}
                      placeholder="10-digit mobile number"
                      maxLength="10"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="your@email.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => handleChange('password', e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
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
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(e) => handleChange('confirmPassword', e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="password-toggle-btn"
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Photos with Upload Functionality */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Add Business Photos</h2>
                <p className="text-gray-600">Upload up to 5 photos of your work, services, or installations (Free Plan)</p>
                <div className="mt-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">💡 Tip:</span> You can add more photos after registration. Upgrade to paid plans for up to 30 images!
                  </p>
                </div>
              </div>

              {/* Upload Progress Alert */}
              {uploadingImages && (
                <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
                  <Loader className="w-5 h-5 text-amber-600 animate-spin flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">Uploading images to cloud storage...</p>
                    <p className="text-xs text-amber-700">Please wait, don't close this page.</p>
                  </div>
                </div>
              )}

              {/* Upload Area */}
              <div
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                  dragActive 
                    ? 'border-indigo-500 bg-indigo-50' 
                    : uploadingImages 
                    ? 'border-gray-300 bg-gray-100 cursor-wait'
                    : 'border-gray-300 hover:border-indigo-400 bg-gray-50 cursor-pointer'
                }`}
              >
                <input
                  type="file"
                  id="photo-upload"
                  multiple
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={(e) => handleImageUpload(e.target.files)}
                  disabled={uploadingImages}
                  className="hidden"
                />
                
                <label htmlFor="photo-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 transform hover:scale-110 transition-transform">
                      {uploadingImages ? (
                        <Loader className="w-10 h-10 text-white animate-spin" />
                      ) : (
                        <Upload className="w-10 h-10 text-white" />
                      )}
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {dragActive ? 'Drop images here' : 'Upload Business Photos'}
                    </h3>
                    
                    <p className="text-gray-600 mb-4">
                      Drag & drop or click to browse
                    </p>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <ImageIcon className="w-4 h-4" />
                        <span>JPG, PNG, WEBP</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Info className="w-4 h-4" />
                        <span>Max 5MB each</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4" />
                        <span>Up to 5 images (Free Plan)</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="mt-6 px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      disabled={uploadingImages}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); document.getElementById('photo-upload').click(); }}
                    >
                      {uploadingImages ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Plus className="w-5 h-5" />
                          Choose Photos
                        </>
                      )}
                    </button>
                  </div>
                </label>

                {dragActive && (
                  <div className="absolute inset-0 bg-indigo-500 bg-opacity-10 rounded-2xl pointer-events-none"></div>
                )}
              </div>

              {/* Image Preview Grid */}
              {imagePreview.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900">
                      Uploaded Photos ({imagePreview.length}/{getImageLimit('free')})
                    </h3>
                    {imagePreview.length > 0 && (
                      <p className="text-sm text-gray-600">
                        Total size: {(imagePreview.reduce((acc, img) => acc + img.size, 0) / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                  </div>

                  {/* Success confirmation */}
                  {formData.photos.length > 0 && (
                    <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-green-900">
                          {formData.photos.length} photo{formData.photos.length > 1 ? 's' : ''} ready for registration
                        </p>
                        <p className="text-xs text-green-700">Photos will be submitted for admin approval before appearing on your profile</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {imagePreview.map((image, index) => (
                      <div
                        key={index}
                        className="relative group bg-white rounded-xl overflow-hidden border-2 border-gray-200 hover:border-indigo-400 transition-all duration-300 shadow-md hover:shadow-xl"
                      >
                        {/* Image */}
                        <div className="aspect-square bg-gray-100 relative overflow-hidden">
                          <img
                            src={image.preview}
                            alt={`Upload ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          
                          {/* Loading Overlay */}
                          {image.uploading && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center">
                              <Loader className="w-8 h-8 text-white animate-spin mb-2" />
                              <span className="text-white text-xs font-semibold">Uploading...</span>
                            </div>
                          )}

                          {/* Success Badge */}
                          {!image.uploading && image.uploaded && (
                            <div className="absolute top-2 left-2 bg-green-500 text-white rounded-full p-1">
                              <Check className="w-4 h-4" />
                            </div>
                          )}

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            disabled={image.uploading}
                            className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all duration-200 transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          {/* Image Info Overlay */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <p className="text-white text-xs font-semibold truncate">{image.name}</p>
                            <p className="text-white text-xs">{(image.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Add More Button */}
                    {imagePreview.length < getImageLimit('free') && (
                      <label
                        htmlFor="photo-upload"
                        className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 hover:border-indigo-400 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:shadow-lg group"
                      >
                        <div className="w-12 h-12 bg-indigo-100 group-hover:bg-indigo-200 rounded-full flex items-center justify-center mb-2 transition-colors">
                          <Plus className="w-6 h-6 text-indigo-600" />
                        </div>
                        <span className="text-sm font-semibold text-gray-600 group-hover:text-indigo-600 transition-colors">
                          Add More
                        </span>
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* Tips Section */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Info className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">Photo Tips for Better Visibility</h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li>✓ Upload high-quality, well-lit photos of your work</li>
                      <li>✓ Show variety - include installations, work samples, team photos</li>
                      <li>✓ Clear, professional images attract more customers</li>
                      <li>✓ You can add more photos later from your dashboard</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Skip Option */}
              {imagePreview.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-gray-600 text-sm">
                    Don't have photos right now? No problem! You can skip this step and add photos later from your vendor dashboard.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 6: Service Pricing */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Service Pricing Details</h2>
                <p className="text-sm text-gray-600">Tell customers about your pricing</p>
              </div>

              {/* Pricing Range Section */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm">
                    1
                  </span>
                  Pricing Range
                </h3>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Minimum Price */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Minimum Price <span className="text-red-500">*</span>
                      </label>
                      <div className="relative group">
                        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gray-50 border border-r-0 border-gray-300 rounded-l-lg flex items-center justify-center group-focus-within:border-indigo-500 group-focus-within:bg-indigo-50 transition-colors">
                          <IndianRupee className="w-5 h-5 text-gray-500 group-focus-within:text-indigo-600" />
                        </div>
                        <input
                          type="number"
                          value={formData.minPrice}
                          onChange={(e) => handleChange('minPrice', e.target.value)}
                          placeholder="10000"
                          min="0"
                          step="1000"
                          className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-lg text-base font-medium
                                   focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
                                   transition-all"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1.5">Starting price for your services</p>
                    </div>

                    {/* Maximum Price */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Maximum Price <span className="text-red-500">*</span>
                      </label>
                      <div className="relative group">
                        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gray-50 border border-r-0 border-gray-300 rounded-l-lg flex items-center justify-center group-focus-within:border-indigo-500 group-focus-within:bg-indigo-50 transition-colors">
                          <IndianRupee className="w-5 h-5 text-gray-500 group-focus-within:text-indigo-600" />
                        </div>
                        <input
                          type="number"
                          value={formData.maxPrice}
                          onChange={(e) => handleChange('maxPrice', e.target.value)}
                          placeholder="50000"
                          min="0"
                          step="1000"
                          className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-lg text-base font-medium
                                   focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
                                   transition-all"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1.5">Maximum price for premium services</p>
                    </div>
                  </div>

                  {/* Price Preview */}
                  {formData.minPrice && formData.maxPrice && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        <span className="font-semibold">Your pricing range:</span> ₹{formData.minPrice?.toLocaleString()} - ₹{formData.maxPrice?.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Price Unit Section */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm">
                    2
                  </span>
                  Price Unit
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    How do you charge for your services?
                  </label>
                  <select
                    value={formData.priceUnit}
                    onChange={(e) => handleChange('priceUnit', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base font-medium
                             focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
                             bg-white cursor-pointer transition-all"
                  >
                    <option value="per service">Per Service</option>
                    <option value="per day">Per Day</option>
                    <option value="per hour">Per Hour</option>
                    <option value="per sqft">Per Square Feet</option>
                    <option value="per unit">Per Unit</option>
                    <option value="per package">Per Package</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1.5">Select how you typically charge customers</p>
                </div>
              </div>

              {/* Business Description Section */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm">
                    3
                  </span>
                  Business Description (Optional)
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tell customers about your business
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Tell customers about your business, experience, and services..."
                    rows="5"
                    maxLength="500"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base
                             focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
                             transition-all resize-none"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-500">Share your expertise, experience, and what makes you unique</p>
                    <p className="text-xs text-gray-400">{formData.description?.length || 0}/500</p>
                  </div>
                </div>
              </div>

              {/* Important Note */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-semibold mb-1">Important:</p>
                    <p>These prices will be visible to customers. Make sure they accurately reflect your service charges.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: Choose Visibility Plan */}
          {currentStep === 7 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Visibility Plan</h2>
                <p className="text-sm text-gray-600 mb-1">Select a plan that fits your business goals</p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg mt-3">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <p className="text-xs text-blue-700 font-medium">
                    Plans affect your <strong>visibility on the platform</strong>, not your service charges
                  </p>
                </div>

                <div className="mt-4 inline-flex items-center gap-1 p-1 bg-gray-100 rounded-full border border-gray-200">
                  <button
                    type="button"
                    onClick={() => handleChange('billingCycle', 'monthly')}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      formData.billingCycle === 'monthly'
                        ? 'bg-white text-indigo-700 shadow'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('billingCycle', 'yearly')}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      formData.billingCycle === 'yearly'
                        ? 'bg-white text-indigo-700 shadow'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Yearly
                  </button>
                  <span className="ml-1 px-2 py-1 text-[10px] font-bold rounded-full bg-green-100 text-green-700 border border-green-200">
                    Save 17%
                  </span>
                </div>
                
                {/* 🎁 BONUS INFORMATION - Clear & Prominent */}
                <div className="inline-flex flex-col items-center gap-1 px-6 py-3 bg-green-50 border-2 border-green-300 rounded-xl mt-3 shadow-sm">
                  <p className="text-sm text-green-800 font-bold">
                    {formData.billingCycle === 'monthly' ? '🎉 +30 Bonus Days FREE on First Purchase!' : '🎉 Yearly +30 Bonus Days FREE on First Purchase!'}
                  </p>
                  <p className="text-xs text-green-700">
                    {formData.billingCycle === 'monthly'
                      ? <>Pay for 30 days, get <strong>60 days total</strong> on your first paid plan</>
                      : <>Pay yearly once and get <strong>395 days total</strong> on your first paid plan (includes 30 bonus days) + save 17%</>}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    One-time payment • No auto-renewal • Renew anytime
                  </p>
                </div>
              </div>

              {/* Plan Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                {visibilityPlans.map((plan) => {
                  const PlanIcon = plan.icon;
                  const isSelected = formData.selectedPlan === plan.id;
                  const effectivePrice = plan.price > 0 && formData.billingCycle === 'yearly'
                    ? getYearlyPrice(plan.price)
                    : plan.price;
                  const durationLabel = plan.price === 0
                    ? plan.duration
                    : formData.billingCycle === 'yearly' ? 'year' : plan.duration;
                  
                  // Color classes
                  const getColorClasses = () => {
                    if (!isSelected) {
                      return {
                        border: 'border-gray-200',
                        bg: 'bg-white',
                        iconBg: plan.color === 'green' ? 'bg-green-100' : 
                                plan.color === 'indigo' ? 'bg-indigo-100' : 
                                plan.color === 'purple' ? 'bg-purple-100' : 'bg-amber-100',
                        iconText: plan.color === 'green' ? 'text-green-600' : 
                                  plan.color === 'indigo' ? 'text-indigo-600' : 
                                  plan.color === 'purple' ? 'text-purple-600' : 'text-amber-600',
                        checkIcon: 'text-green-600',
                        borderT: 'border-gray-200',
                        selectedText: ''
                      };
                    }
                    
                    return {
                      border: plan.color === 'green' ? 'border-green-500' : 
                              plan.color === 'indigo' ? 'border-indigo-500' : 
                              plan.color === 'purple' ? 'border-purple-500' : 'border-amber-500',
                      bg: plan.color === 'green' ? 'bg-green-50' : 
                          plan.color === 'indigo' ? 'bg-indigo-50' : 
                          plan.color === 'purple' ? 'bg-purple-50' : 'bg-amber-50',
                      iconBg: plan.color === 'green' ? 'bg-green-500' : 
                              plan.color === 'indigo' ? 'bg-indigo-500' : 
                              plan.color === 'purple' ? 'bg-purple-500' : 'bg-amber-500',
                      iconText: 'text-white',
                      checkIcon: plan.color === 'green' ? 'text-green-600' : 
                                 plan.color === 'indigo' ? 'text-indigo-600' : 
                                 plan.color === 'purple' ? 'text-purple-600' : 'text-amber-600',
                      borderT: plan.color === 'green' ? 'border-green-200' : 
                               plan.color === 'indigo' ? 'border-indigo-200' : 
                               plan.color === 'purple' ? 'border-purple-200' : 'border-amber-200',
                      selectedText: plan.color === 'green' ? 'text-green-600' : 
                                    plan.color === 'indigo' ? 'text-indigo-600' : 
                                    plan.color === 'purple' ? 'text-purple-600' : 'text-amber-600'
                    };
                  };
                  
                  const colors = getColorClasses();
                  
                  return (
                    <div
                      key={plan.id}
                      onClick={() => {
                        handleChange('selectedPlan', plan.id);
                        handleChange('planPrice', effectivePrice);
                        handleChange('planDuration', plan.price === 0 ? plan.duration : (formData.billingCycle === 'yearly' ? '365 days' : plan.duration));
                      }}
                      className={`relative cursor-pointer rounded-2xl border-2 transition-all transform hover:scale-105 ${
                        colors.border
                      } ${colors.bg} ${
                        isSelected ? 'shadow-xl' : 'hover:border-gray-300 hover:shadow-lg'
                      } ${plan.popular ? 'ring-4 ring-purple-100' : ''}`}
                    >
                      {/* Popular Badge */}
                      {plan.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                          <div className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full text-xs font-bold shadow-lg">
                            <Sparkles className="w-3 h-3" />
                            Most Popular
                          </div>
                        </div>
                      )}

                      <div className="p-6">
                        {/* Plan Header */}
                        <div className="text-center mb-4">
                          <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full mb-3 ${colors.iconBg}`}>
                            <PlanIcon className={`w-7 h-7 ${colors.iconText}`} />
                          </div>
                          <h3 className="text-lg font-bold text-gray-900 mb-1">{plan.name}</h3>
                          <div className="flex items-baseline justify-center gap-1">
                            {plan.price === 0 ? (
                              <span className="text-3xl font-bold text-green-600">Free</span>
                            ) : (
                              <>
                                <span className="text-2xl font-bold text-gray-900">₹{effectivePrice}</span>
                                <span className="text-sm text-gray-600">/{durationLabel}</span>
                              </>
                            )}
                          </div>

                          {plan.price > 0 && formData.billingCycle === 'yearly' && (
                            <p className="text-[11px] text-green-700 font-semibold mt-1">
                              Monthly equivalent: ₹{Math.round(effectivePrice / 12)}/month
                            </p>
                          )}
                        </div>

                        {/* Features */}
                        <div className="space-y-2 mb-4">
                          {plan.features
                            .filter((feature) => formData.billingCycle === 'monthly' || !feature.includes('First 30 days FREE'))
                            .map((feature, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${colors.checkIcon}`} />
                              <span className="text-xs text-gray-700">{feature}</span>
                            </div>
                          ))}
                        </div>

                        {/* Selection Indicator */}
                        <div className={`text-center pt-4 border-t ${colors.borderT}`}>
                          {isSelected ? (
                            <div className={`flex items-center justify-center gap-2 ${colors.selectedText} font-semibold text-sm`}>
                              <CheckCircle className="w-5 h-5" />
                              Selected
                            </div>
                          ) : (
                            <button className="text-sm text-gray-600 hover:text-gray-900 font-medium">
                              Select Plan
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Plan Comparison Helper */}
              <div className="mt-8 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <Award className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">Why upgrade?</h4>
                    <p className="text-xs text-gray-700 leading-relaxed">
                      Higher plans get better visibility in search results, featured placements on category pages, 
                      verified badges that build trust, and priority customer support. Your service pricing remains 
                      completely independent - you set your own rates regardless of the plan.
                    </p>
                  </div>
                </div>
              </div>


            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium
                ${currentStep === 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100'}`}
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Back</span>
            </button>

            {currentStep < totalSteps ? (
              <button
                onClick={nextStep}
                className="flex items-center space-x-2 px-8 py-3 bg-premium-blue text-white rounded-lg font-medium hover:brightness-95 transition-colors"
              >
                <span>Continue</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center space-x-2 px-8 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Registration</span>
                    <CheckCircle className="w-5 h-5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Unified Login Modal */}
      <UnifiedLoginModal 
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        initialUserType="vendor"
      />
    </div>
  );
};

export default VendorRegistrationNew;
