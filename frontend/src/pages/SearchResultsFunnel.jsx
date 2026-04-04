import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, IndianRupee, MapPin, Sparkles, Target, Compass, Loader2 } from 'lucide-react';
import { fetchServiceTypes } from '../services/dynamicDataService';

const SearchResultsFunnel = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialCategory = searchParams.get('category') || '';
  const initialCity = searchParams.get('city') || '';
  const initialBudget = searchParams.get('budget') || '';
  const initialRadius = searchParams.get('radius') || '10';

  const [currentStep, setCurrentStep] = useState(1);
  const [locationStatus, setLocationStatus] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [loadingServiceTypes, setLoadingServiceTypes] = useState(true);
  const [detailedLocation, setDetailedLocation] = useState({
    city: '',
    area: '',
    street: '',
    latitude: null,
    longitude: null
  });
  const [formData, setFormData] = useState({
    city: initialCity || '',
    radius: initialRadius || '10',
    budgetPreset: '',
    budgetAmount: initialBudget || '',
    showAlternatives: true,
    eventCategory: initialCategory || '',
    eventSubType: '' // Will be set after service types load
  });

  // Load dynamic service types
  useEffect(() => {
    const loadServiceTypes = async () => {
      try {
        const data = await fetchServiceTypes();
        setServiceTypes(data);
        
        // Set default category if not set
        if (!formData.eventCategory && data.length > 0) {
          setFormData(prev => ({
            ...prev,
            eventCategory: data[0].value
          }));
        }
      } catch (error) {
        console.error('Failed to load service types:', error);
      } finally {
        setLoadingServiceTypes(false);
      }
    };
    
    loadServiceTypes();
  }, []);

  const eventCategories = serviceTypes.map(s => s.label);

  const subTypeMapping = {
    'Air Conditioning (HVAC)': [
      { value: 'Installation', label: 'AC Installation', icon: '❄️' },
      { value: 'Repair', label: 'AC Repair & Maintenance', icon: '🔧' },
      { value: 'Cleaning', label: 'AC Cleaning', icon: '🧹' },
      { value: 'AMC', label: 'Annual Maintenance Contract', icon: '📋' }
    ],
    'CCTV & Security': [
      { value: 'Installation', label: 'CCTV Installation', icon: '📹' },
      { value: 'Repair', label: 'CCTV Repair', icon: '🔧' },
      { value: 'Monitoring', label: 'Remote Monitoring Setup', icon: '📱' },
      { value: 'Maintenance', label: 'System Maintenance', icon: '⚙️' }
    ],
    'IT Hardware': [
      { value: 'Server Setup', label: 'Server Setup & Config', icon: '💻' },
      { value: 'Network', label: 'Network Installation', icon: '🌐' },
      { value: 'Repair', label: 'Hardware Repair', icon: '🔌' },
      { value: 'Upgrade', label: 'System Upgrade', icon: '⬆️' }
    ],
    'Electrical & Power': [
      { value: 'Installation', label: 'Electrical Installation', icon: '⚡' },
      { value: 'Repair', label: 'Electrical Repair', icon: '🔧' },
      { value: 'Maintenance', label: 'Preventive Maintenance', icon: '🛡️' },
      { value: 'Wiring', label: 'Complete Re-wiring', icon: '🔌' }
    ],
    'Plumbing & Sanitation': [
      { value: 'Installation', label: 'Plumbing Installation', icon: '🚰' },
      { value: 'Repair', label: 'Leak Repair', icon: '🔧' },
      { value: 'Maintenance', label: 'Regular Maintenance', icon: '🧹' },
      { value: 'Cleaning', label: 'Drain & Tank Cleaning', icon: '💧' }
    ]
  };

  const budgetPresets = [
    { value: '10k-25k', label: '₹10K - ₹25K', min: 10000, max: 25000 },
    { value: '25k-50k', label: '₹25K - ₹50K', min: 25000, max: 50000 },
    { value: '50k-1L', label: '₹50K - ₹1L', min: 50000, max: 100000 },
    { value: '1L-5L', label: '₹1L - ₹5L', min: 100000, max: 500000 },
    { value: '5L+', label: '₹5L+', min: 500000, max: 10000000 }
  ];

  const radiusOptions = [
    { value: '2', label: '2 km', description: 'Ultra nearby' },
    { value: '5', label: '5 km', description: 'Nearby' },
    { value: '10', label: '10 km', description: 'Recommended' },
    { value: '20', label: '20 km', description: 'Wider area' },
    { value: 'city', label: 'Entire City', description: 'All vendors in city' }
  ];

  const totalSteps = 4;

  // Reset form on page reload/mount to prevent freezing
  useEffect(() => {
    // Clear any persisted state
    setCurrentStep(1);
    setLocationStatus('');
    setIsLocating(false);
    
    // Reset to step 1 with fresh data
    return () => {
      // Cleanup on unmount
      setCurrentStep(1);
    };
  }, []); // Run only on mount

  const handleLocate = () => {
    if (!navigator?.geolocation) {
      setLocationStatus('Location is not supported on this browser.');
      return;
    }

    setIsLocating(true);
    setLocationStatus('Detecting your location...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          setLocationStatus('Fetching address details...');
          
          // Reverse geocoding using Nominatim
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            {
              headers: {
                'Accept-Language': 'en'
              }
            }
          );
          
          const data = await response.json();
          const address = data.address || {};
          
          // Extract detailed location
          const city = address.city || address.town || address.village || address.state_district || 'Unknown City';
          const area = address.suburb || address.neighbourhood || address.quarter || address.road || '';
          const street = address.road || address.street || '';
          
          // Create readable location string
          let locationString = '';
          if (area && city) {
            locationString = `${area}, ${city}`;
          } else if (street && city) {
            locationString = `${street}, ${city}`;
          } else if (city) {
            locationString = city;
          } else {
            locationString = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          }
          
          setFormData((prev) => ({ ...prev, city: locationString }));
          setDetailedLocation({
            city,
            area,
            street,
            latitude,
            longitude
          });
          setLocationStatus(`✓ Location: ${locationString}`);
          setIsLocating(false);
        } catch (error) {
          console.error('Reverse geocoding error:', error);
          // Fallback to coordinates
          const locationString = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          setFormData((prev) => ({ ...prev, city: locationString }));
          setDetailedLocation({
            city: '',
            area: '',
            street: '',
            latitude,
            longitude
          });
          setLocationStatus('Location detected (address lookup failed)');
          setIsLocating(false);
        }
      },
      (error) => {
        setLocationStatus('Location detected');
        setIsLocating(false);
      },
      (error) => {
        setLocationStatus(error.message || 'Unable to fetch location');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleNext = () => {
    // Relaxed validation with helpful messages
    if (currentStep === 1 && !formData.city.trim()) {
      alert('⚠️ Please enter your location (City or Area) to continue');
      return;
    }
    if (currentStep === 2) {
      // Allow proceeding without budget (show all results)
      if (!formData.budgetAmount && !formData.budgetPreset) {
        setFormData(prev => ({ ...prev, budgetAmount: '50000' })); // Default ₹50K
      }
    }
    if (currentStep === 3 && !formData.eventCategory) {
      alert('⚠️ Please select your event category to continue');
      return;
    }
    if (currentStep === 3 && !formData.eventSubType) {
      alert('⚠️ Please select service type to get accurate results');
      return;
    }

    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setError(''); // Clear any errors when going back
    setLocationStatus(''); // Clear location status
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/');
    }
  };

  const handleReset = () => {
    // Full reset to initial state
    setCurrentStep(1);
    setLocationStatus('');
    setIsLocating(false);
    setDetailedLocation({ city: '', area: '', street: '', latitude: null, longitude: null });
    setFormData({
      city: '',
      radius: '10',
      budgetPreset: '',
      budgetAmount: '',
      showAlternatives: true,
      eventCategory: 'Air Conditioning (HVAC)',
      eventSubType: 'Installation'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = () => {
    const preset = budgetPresets.find((b) => b.value === formData.budgetPreset);
    const budgetNumber = parseInt(formData.budgetAmount, 10) || 0;
    const budgetMin = preset?.min || (budgetNumber ? Math.max(0, Math.round(budgetNumber * 0.85)) : 0);
    const budgetMax = preset?.max || (budgetNumber ? Math.round(budgetNumber * 1.15) : 5000000);

    const params = new URLSearchParams({
      eventCategory: formData.eventCategory,
      eventSubType: formData.eventSubType,
      city: formData.city,
      budgetMin: budgetMin.toString(),
      budgetMax: budgetMax.toString(),
      radius: formData.radius,
      showAlternatives: formData.showAlternatives ? 'true' : 'false'
    });

    // Add detailed location data if available
    if (detailedLocation.latitude && detailedLocation.longitude) {
      params.set('lat', detailedLocation.latitude.toString());
      params.set('lng', detailedLocation.longitude.toString());
    }
    if (detailedLocation.city) params.set('cityName', detailedLocation.city);
    if (detailedLocation.area) params.set('area', detailedLocation.area);
    if (detailedLocation.street) params.set('street', detailedLocation.street);

    navigate(`/search-results?${params.toString()}`);
  };

  const renderLocationStep = () => (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-3">Confirm your location</h2>
      <p className="text-gray-600 mb-8">Allow location for better radius results. You can also enter city and area manually.</p>

      {/* Helpful hint */}
      <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r-lg mb-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <span className="text-2xl">📍</span>
          </div>
          <div className="ml-3">
            <p className="text-sm text-indigo-900 font-semibold">Quick Start:</p>
            <p className="text-sm text-indigo-800 mt-1">
              Click "Use my location" for instant setup, or type your city/area manually (e.g., "Mumbai, Andheri")
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">City + Area</label>
          <input
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="e.g., Indore, Vijay Nagar"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <button
            type="button"
            onClick={handleLocate}
            className="px-5 py-3 rounded-xl border-2 border-indigo-200 bg-indigo-50 text-indigo-700 font-semibold flex items-center gap-2 hover:bg-indigo-100"
            disabled={isLocating}
          >
            {isLocating ? <Compass className="w-5 h-5 animate-spin" /> : <Compass className="w-5 h-5" />}
            <span>{isLocating ? 'Detecting...' : 'Use my location'}</span>
          </button>
          {locationStatus && <span className="text-sm text-indigo-700">{locationStatus}</span>}
        </div>

        {/* Display detailed location if detected */}
        {detailedLocation.latitude && detailedLocation.longitude && (
          <div className="text-xs text-gray-500 bg-blue-50 rounded-lg p-3 border border-blue-100">
            <div className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Detected Location Details:
            </div>
            {detailedLocation.street && <div className="mb-1">Street: <span className="font-medium text-gray-700">{detailedLocation.street}</span></div>}
            {detailedLocation.area && <div className="mb-1">Area: <span className="font-medium text-gray-700">{detailedLocation.area}</span></div>}
            {detailedLocation.city && <div className="mb-1">City: <span className="font-medium text-gray-700">{detailedLocation.city}</span></div>}
            <div className="text-gray-400 mt-2">
              Coordinates: {detailedLocation.latitude?.toFixed(6)}, {detailedLocation.longitude?.toFixed(6)}
            </div>
          </div>
        )}

        <div>
          <label className="text-sm font-semibold text-gray-700 mb-2 block">Service radius</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{radiusOptions.map((radius) => (
              <button
                key={radius.value}
                onClick={() => setFormData({ ...formData, radius: radius.value })}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  formData.radius === radius.value
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-indigo-200'
                }`}
              >
                <div className="font-semibold">{radius.label}</div>
                <div className="text-xs text-gray-500">{radius.description}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderBudgetStep = () => (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-3">Set your budget</h2>
      <p className="text-gray-600 mb-8 flex items-center gap-2">
        <IndianRupee className="w-5 h-5 text-green-600" />
        Enter a number or pick a preset. We will also show nearby alternatives when enabled.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <input
            type="number"
            value={formData.budgetAmount}
            onChange={(e) => setFormData({ ...formData, budgetAmount: e.target.value, budgetPreset: '' })}
            className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Enter budget (no min/max)"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {budgetPresets.map((preset) => (
              <button
                key={preset.value}
                onClick={() => setFormData({ ...formData, budgetPreset: preset.value, budgetAmount: '' })}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  formData.budgetPreset === preset.value
                    ? 'border-green-600 bg-green-50 text-green-700 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-green-200'
                }`}
              >
                <div className="font-semibold">{preset.label}</div>
                <div className="text-xs text-gray-500">Popular range</div>
                {formData.budgetPreset === preset.value && (
                  <div className="mt-2 inline-flex items-center text-xs font-semibold text-green-700">
                    <Check className="w-4 h-4 mr-1" /> Selected
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-200">
          <h3 className="text-sm font-bold text-gray-800 mb-3">Smart alternatives</h3>
          <p className="text-sm text-gray-600 mb-4">Surface solutions that are up to ±20% of your budget to avoid dead-ends.</p>
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={formData.showAlternatives}
                onChange={(e) => setFormData({ ...formData, showAlternatives: e.target.checked })}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
            <span className="text-sm font-medium text-gray-700">Show alternatives</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderEventStep = () => (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-3">Choose event type</h2>
      <p className="text-gray-600 mb-8">Pick your event type and subtype so we can assemble the right package.</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {eventCategories.map((category) => (
          <button
            key={category}
            onClick={() => setFormData({ ...formData, eventCategory: category, eventSubType: '' })}
            className={`px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
              formData.eventCategory === category
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                : 'border-gray-200 bg-white hover:border-indigo-200'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(subTypeMapping[formData.eventCategory] || []).map((subType) => (
          <button
            key={subType.value}
            onClick={() => setFormData({ ...formData, eventSubType: subType.value })}
            className={`p-5 rounded-2xl border-2 transition-all duration-300 text-left hover:scale-[1.01] ${
              formData.eventSubType === subType.value
                ? 'border-indigo-600 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-lg'
                : 'border-gray-200 bg-white hover:border-indigo-300'
            }`}
          >
            <div className="text-3xl mb-3">{subType.icon}</div>
            <h3 className={`text-lg font-bold ${
              formData.eventSubType === subType.value ? 'text-indigo-600' : 'text-gray-900'
            }`}>
              {subType.label}
            </h3>
            {formData.eventSubType === subType.value && (
              <div className="mt-3 inline-flex items-center space-x-1 text-indigo-600 text-sm font-semibold">
                <Check className="w-4 h-4" />
                <span>Selected</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="text-center py-8">
      <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Target className="w-10 h-10 text-indigo-600" />
      </div>
      <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to generate event solutions</h2>
      <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
        We will assemble budget-fit packages first and show nearby alternatives if enabled.
      </p>

      <div className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-2xl p-8 max-w-2xl mx-auto mb-8">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Your inputs</h3>
        <div className="space-y-4 text-left">
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <span className="text-gray-600">Location</span>
            <span className="font-bold text-gray-900">{formData.city || 'Not set'}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <span className="text-gray-600">Radius</span>
            <span className="font-bold text-gray-900">{formData.radius} km</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <span className="text-gray-600">Budget</span>
            <span className="font-bold text-gray-900">
              {formData.budgetPreset
                ? budgetPresets.find((b) => b.value === formData.budgetPreset)?.label
                : formData.budgetAmount ? `₹${formData.budgetAmount}` : 'Not set'}
            </span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <span className="text-gray-600">Event</span>
            <span className="font-bold text-gray-900">{formData.eventCategory} - {formData.eventSubType || 'Select subtype'}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-gray-600">Show alternatives</span>
            <span className="font-bold text-gray-900">{formData.showAlternatives ? 'Yes (±20%)' : 'No'}</span>
          </div>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        className="px-12 py-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-bold text-lg rounded-2xl shadow-2xl hover:shadow-indigo-500/50 hover:scale-105 transition-all duration-300 inline-flex items-center space-x-3"
      >
        <Sparkles className="w-6 h-6" />
        <span>Generate solutions</span>
        <ArrowRight className="w-6 h-6" />
      </button>
    </div>
  );

  const getStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderLocationStep();
      case 2:
        return renderBudgetStep();
      case 3:
        return renderEventStep();
      case 4:
        return renderReviewStep();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-indigo-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </button>
            <div className="flex items-center gap-4">
              <div className="text-sm font-semibold text-gray-600">Step {currentStep} of {totalSteps}</div>
              <button
                onClick={handleReset}
                className="text-sm text-red-600 hover:text-red-700 font-medium px-3 py-1 rounded-lg hover:bg-red-50 transition-colors"
                title="Start fresh from beginning"
              >
                🔄 Reset
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                  step <= currentStep ? 'bg-gradient-to-r from-indigo-600 to-purple-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-fadeIn">{getStepContent()}</div>

        {currentStep < 4 && (
          <div className="mt-12 flex justify-end">
            <button
              onClick={handleNext}
              className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center space-x-2"
            >
              <span>Continue</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResultsFunnel;
