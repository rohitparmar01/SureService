import React, { useState, useEffect } from 'react';
import { ChevronDown, Search, MapPin, IndianRupee, Sliders, X } from 'lucide-react';

const FilterPanel = ({ 
  filters: externalFilters = {}, 
  onFilterChange, 
  onClearFilters,
  onFilter,
  userLocation,
  showHeader = true
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  // For service type dropdown - keep open by default
  const [expandedSections, setExpandedSections] = useState({
    'service-type': true
  });

  // Filter state - use external filters if provided, otherwise use internal state
  const [filters, setFilters] = useState({
    mainCategory: externalFilters.eventCategory || externalFilters.mainCategory || '',
    subService: externalFilters.eventSubType || externalFilters.subService || '',
    budgetMin: externalFilters.budgetMin || 0,
    budgetMax: externalFilters.budgetMax || 100000,
    radius: externalFilters.radius || 10,
  });

  // Main service categories (5 core buckets)
  const mainCategories = {
    'HVAC & Cooling': [
      'AC Installation',
      'AC Repair & Maintenance',
      'AC Cleaning',
      'Ventilation Systems'
    ],
    'Security Systems': [
      'CCTV Installation',
      'CCTV Repair',
      'Security Monitoring',
      'Access Control'
    ],
    'IT & Infrastructure': [
      'Server Setup',
      'Network Installation',
      'Hardware Repair',
      'System Upgrade'
    ],
    'Electrical Services': [
      'Electrical Installation',
      'Electrical Repair',
      'Maintenance & Inspection',
      'Re-wiring Services'
    ],
    'Plumbing & Sanitation': [
      'Plumbing Installation',
      'Leak Repair & Fixing',
      'Drain Cleaning',
      'Tank Cleaning'
    ]
  };

  // Vendor categories (5 core service types)
  const vendorCategories = [
    'All Services',
    'Air Conditioning (HVAC)',
    'CCTV & Security',
    'IT Hardware',
    'Electrical & Power',
    'Plumbing & Sanitation'
  ];

  // Get sub-services based on selected main category
  const getSubServices = () => {
    if (!filters.mainCategory) return [];
    return mainCategories[filters.mainCategory] || [];
  };

  // Handle responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsOpen(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle filter changes
  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    
    // Reset sub-service when main category changes
    if (field === 'mainCategory') {
      newFilters.subService = '';
    }
    
    setFilters(newFilters);
    
    // Call external handler if provided (for SearchResults integration)
    if (onFilterChange) {
      onFilterChange(field, value);
    }
  };

  // Toggle section expansion
  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Handle search
  const handleSearch = () => {
    if (onFilter) {
      onFilter({
        ...filters,
        latitude: userLocation?.latitude,
        longitude: userLocation?.longitude
      });
    }
  };

  // Reset filters
  const handleReset = () => {
    const resetFilters = {
      mainCategory: '',
      subService: '',
      budgetMin: 0,
      budgetMax: 100000,
      radius: 10,
    };
    setFilters(resetFilters);
    
    if (onClearFilters) {
      onClearFilters();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100">
      {/* Mobile Toggle Header */}
      {isMobile && (
        <div
          className="flex items-center justify-between p-4 cursor-pointer border-b border-gray-100"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-800">Filters</h2>
          </div>
          {isOpen ? (
            <X className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-600" />
          )}
        </div>
      )}

      {/* Desktop Header - Only show if showHeader is true */}
      {!isMobile && showHeader && (
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-6 h-6 text-indigo-600" />
              <h2 className="text-xl font-bold text-gray-800">Find Your Perfect Service Provider</h2>
            </div>
          </div>
        </div>
      )}

      {/* Filter Content */}
      {isOpen && (
        <div className={`${showHeader ? 'p-6' : 'p-4'} space-y-6`}>
          {/* Main Service Category - Always Expanded */}
          <div className="space-y-2">
            <button
              onClick={() => toggleSection('service-type')}
              className="w-full flex items-center justify-between text-left"
            >
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer">
                <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
                Service Type
              </label>
              <ChevronDown 
                className={`w-4 h-4 text-gray-400 transition-transform ${
                  expandedSections['service-type'] ? 'rotate-180' : ''
                }`}
              />
            </button>
            
            {expandedSections['service-type'] && (
              <div className="relative">
                <select
                  value={filters.mainCategory}
                  onChange={(e) => handleFilterChange('mainCategory', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none cursor-pointer transition-all hover:bg-gray-100 text-gray-700 font-medium"
                >
                  <option value="">Select Service Type</option>
                  {Object.keys(mainCategories).map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Service Details */}
          {filters.mainCategory && (
            <div className="space-y-2 animate-fadeIn">
              <button
                onClick={() => toggleSection('service-details')}
                className="w-full flex items-center justify-between text-left"
              >
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer">
                  <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                  Service Details
                </label>
                <ChevronDown 
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    expandedSections['service-details'] ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {expandedSections['service-details'] && (
                <div className="relative">
                  <select
                    value={filters.subService}
                    onChange={(e) => handleFilterChange('subService', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none cursor-pointer transition-all hover:bg-gray-100 text-gray-700 font-medium"
                  >
                    <option value="">Select Specific Service</option>
                    {getSubServices().map((service) => (
                      <option key={service} value={service}>
                        {service}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              )}
            </div>
          )}

          {/* Budget Range */}
          <div className="space-y-3">
            <button
              onClick={() => toggleSection('budget')}
              className="w-full flex items-center justify-between text-left"
            >
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer">
                <IndianRupee className="w-4 h-4 text-green-600" />
                Budget Range
              </label>
              <ChevronDown 
                className={`w-4 h-4 text-gray-400 transition-transform ${
                  expandedSections['budget'] ? 'rotate-180' : ''
                }`}
              />
            </button>

            {expandedSections['budget'] && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Minimum</label>
                    <input
                      type="number"
                      value={filters.budgetMin}
                      onChange={(e) => handleFilterChange('budgetMin', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-700"
                      placeholder="₹0"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Maximum</label>
                    <input
                      type="number"
                      value={filters.budgetMax}
                      onChange={(e) => handleFilterChange('budgetMax', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-700"
                      placeholder="₹100,000"
                    />
                  </div>
                </div>
                
                {/* Budget Slider */}
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="500000"
                    step="5000"
                    value={filters.budgetMax}
                    onChange={(e) => handleFilterChange('budgetMax', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>₹{filters.budgetMin.toLocaleString()}</span>
                    <span>₹{filters.budgetMax.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Radius */}
          <div className="space-y-3">
            <button
              onClick={() => toggleSection('radius')}
              className="w-full flex items-center justify-between text-left"
            >
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer">
                <MapPin className="w-4 h-4 text-blue-600" />
                Search Radius
              </label>
              <ChevronDown 
                className={`w-4 h-4 text-gray-400 transition-transform ${
                  expandedSections['radius'] ? 'rotate-180' : ''
                }`}
              />
            </button>

            {expandedSections['radius'] && (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={filters.radius}
                    onChange={(e) => handleFilterChange('radius', parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex items-center gap-1 min-w-[70px] sm:min-w-[80px] px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="font-bold text-blue-700">{filters.radius}</span>
                    <span className="text-sm text-blue-600">km</span>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>1 km</span>
                  <span>50 km</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons - Only show if onFilter callback is provided */}
          {onFilter && (
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={handleSearch}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <Search className="w-5 h-5" />
                Search Vendors
              </button>
              <button
                onClick={handleReset}
                className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-all"
              >
                Reset
              </button>
            </div>
          )}

          {/* Info Text */}
          {userLocation && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <MapPin className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700">
                Searching near your location: {userLocation.latitude?.toFixed(4)}, {userLocation.longitude?.toFixed(4)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterPanel;
