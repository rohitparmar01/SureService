import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, Crosshair, Search, ChevronDown, Star, Shield, TrendingUp, Award, Compass, Loader2 } from 'lucide-react';
import { useSearch } from '../contexts/SearchContext';
import { fetchCities, fetchServiceTypes, fetchAreas } from '../services/dynamicDataService';
import SearchAutocomplete from './SearchAutocomplete';

const ServiceSearch = () => {
  const navigate = useNavigate();
  const {
    searchQuery,
    setSearchQuery,
    selectedCity,
    setSelectedCity,
    selectedArea,
    setSelectedArea,
    location,
    detailedLocation,
    filters,
    updateFilter,
    updateDetailedLocation,
    isLocating,
    setIsLocating,
    locationStatus,
    setLocationStatus,
    showSuggestions,
    setShowSuggestions,
    suggestions,
    setSuggestions,
    syncWithURL
  } = useSearch();
  
  // Dynamic data state
  const [cities, setCities] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [availableAreas, setAvailableAreas] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Local UI state only
  const [showCategoryMenu, setShowCategoryMenu] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);
  const [budgetLabel, setBudgetLabel] = useState('Budget (Any)');
  const [customBudget, setCustomBudget] = useState('');
  const cityInputRef = useRef(null);

  const presetBudgets = [
    { label: 'Under ₹10K', value: 10000 },
    { label: '₹10K - ₹25K', value: 25000 },
    { label: '₹25K - ₹50K', value: 50000 },
    { label: '₹50K - ₹1L', value: 100000 },
    { label: '₹1L+', value: 1000000 }
  ];

  useEffect(() => {
    if (filters && filters.budgetMax && filters.budgetMax !== 10000000) {
      const match = presetBudgets.find(p => p.value === filters.budgetMax);
      if (match) setBudgetLabel(match.label);
      else setBudgetLabel(`Up to ₹${Math.round(filters.budgetMax / 1000)}k`);
    } else {
      setBudgetLabel('Budget (Any)');
    }
  }, [filters.budgetMax]);

  // Load dynamic data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [citiesData, servicesData] = await Promise.all([
          fetchCities(),
          fetchServiceTypes()
        ]);
        // Ensure arrays are returned
        setCities(Array.isArray(citiesData) ? citiesData : []);
        setServiceTypes(Array.isArray(servicesData) ? servicesData : []);
      } catch (error) {
        console.error('❌ Failed to load dynamic data:', error);
        setCities([]);
        setServiceTypes([]);
      } finally {
        setLoadingData(false);
      }
    };
    
    loadData();
  }, []);

  // Load areas when selected city changes
  useEffect(() => {
    const loadAreas = async () => {
      if (selectedCity) {
        try {
          const areasData = await fetchAreas(selectedCity);
          setAvailableAreas(areasData.map(a => a.name));
        } catch (error) {
          console.error('Error loading areas:', error);
          setAvailableAreas([]);
        }
      } else {
        setAvailableAreas([]);
      }
    };
    
    loadAreas();
  }, [selectedCity]);

  // Generate menu from service types - NO hardcoded categorization
  const categoryMegaMenu = React.useMemo(() => {
    if (!serviceTypes.length) return {};
    
    // Simply return services without hardcoded categorization
    // Categorization logic should come from database, not hardcoded here
    return {};
  }, [serviceTypes]);

  const popularSearches = React.useMemo(() => {
    if (!serviceTypes.length || !cities.length) return [];
    
    // Generate popular searches from actual data
    const topCities = cities.slice(0, 3);
    const topServices = serviceTypes.slice(0, 4);
    
    const searches = [];
    
    // Add city-specific searches
    topCities.forEach(city => {
      if (topServices[0]) {
        searches.push({
          text: `${topServices[0].label} in ${city.name}`,
          category: 'Service',
          icon: '🏛️',
          type: topServices[0].value
        });
      }
    });
    
    // Add generic service searches
    topServices.forEach(service => {
      searches.push({
        text: service.label,
        category: 'Service',
        icon: '📸',
        type: service.value
      });
    });
    
    return searches.slice(0, 7);
  }, [serviceTypes, cities]);

  const serviceCategories = React.useMemo(() => {
    if (!Array.isArray(serviceTypes) || serviceTypes.length === 0) return [];
    return serviceTypes.slice(0, 5).map(s => ({ value: s.value, label: s.label }));
  }, [serviceTypes]);

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
          
          // Reverse geocoding using Nominatim (OpenStreetMap)
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
          
          // Extract detailed location components
          const city = address.city || address.town || address.village || address.state_district || 'Unknown City';
          const area = address.suburb || address.neighbourhood || address.quarter || address.road || '';
          const street = address.road || address.street || '';
          const fullAddress = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          
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
          
          // Update context with location details
          updateDetailedLocation({
            city,
            area,
            street,
            latitude,
            longitude,
            fullAddress
          });
          
          // Update dropdown selections
          setSelectedCity(city);
          setSelectedArea(area);
          
          setLocationStatus(`✓ Location: ${locationString}`);
          setIsLocating(false);
        } catch (error) {
          console.error('Reverse geocoding error:', error);
          // Fallback to coordinates
          updateDetailedLocation({
            latitude,
            longitude,
            fullAddress: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
          });
          setLocationStatus('Location detected (address lookup failed)');
          setIsLocating(false);
        }
      },
      (error) => {
        setLocationStatus(error.message || 'Unable to fetch location');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleContinue = () => {
    // Navigate to search page with synchronized state
    const params = syncWithURL();
    navigate(`/search?${params.toString()}`);
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion.text);
    updateFilter('serviceCategory', suggestion.type);
    setShowSuggestions(false);
  };

  const handleCitySelect = (city) => {
    setSelectedCity(city.name);
    setSelectedArea('');
    updateDetailedLocation({
      city: city.name,
      area: '',
      latitude: city.coords[0],
      longitude: city.coords[1]
    });
    // Ensure city dropdown closes immediately after selection.
    setShowCityDropdown(false);
    // Guard against any late focus/open handlers in the same tick.
    setTimeout(() => setShowCityDropdown(false), 0);
    if (cityInputRef.current) {
      cityInputRef.current.blur();
    }
  };

  const handleAreaSelect = (area) => {
    setSelectedArea(area);
    updateDetailedLocation({
      area: area
    });
    setShowAreaDropdown(false);
  };

  return (
    <section id="service-search" className="relative bg-white">
      {/* Main Search Bar Section */}
      <div className="bg-gradient-to-b from-[#f6f9ff] via-[#f8fbff] to-[#ffffff] border-b border-[var(--premium-border)]">
        <div className="max-w-7xl mx-auto px-2 md:px-4 py-4 md:py-8">
          <div className="text-center mb-4 md:mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-[#eef4ff] to-[#f6f9ff] border border-[#c9d9ec] rounded-full mb-3">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span className="text-xs md:text-sm font-semibold bg-gradient-to-r from-[#1f3c5d] to-[#24496f] bg-clip-text text-transparent">
                India's Premium Service Management Platform
              </span>
            </div>
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-extrabold mb-3">
              <span className="bg-gradient-to-r from-[#14213d] via-[#1f3c5d] to-[#24496f] bg-clip-text text-transparent">
                Discover Exceptional
              </span>
              <br />
              <span className="bg-gradient-to-r from-[#1b3958] via-[#1f3c5d] to-[#2f5b86] bg-clip-text text-transparent">
                Services in Your City
              </span>
            </h1>
            <p className="text-gray-600 text-sm md:text-lg lg:text-xl font-medium max-w-3xl mx-auto">
              <span className="text-indigo-600 font-semibold">✨ Instant Quotes</span> • 
              <span className="text-purple-600 font-semibold">100% Verified</span> • 
              <span className="text-pink-600 font-semibold">Best Prices Guaranteed</span>
            </p>
          </div>

          {/* Main Search Input */}
          <div className="max-w-6xl mx-auto mb-4 px-2">
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-md border-2 border-gray-300 hover:border-gray-400 hover:shadow-lg transition-all duration-200 overflow-visible">
                <div className="flex flex-col lg:flex-row items-stretch">
                  {/* Location Input with Dropdowns */}
                  <div className="relative z-30 flex flex-wrap lg:flex-nowrap items-center gap-1.5 lg:gap-2 px-3 md:px-4 py-3 lg:py-3.5 bg-gray-50/50 hover:bg-gray-50 border-b lg:border-b-0 lg:border-r-2 border-gray-200 min-w-0 lg:w-72 xl:w-80 transition-colors">
                    <button
                      onClick={handleLocate}
                      className="h-7 w-7 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors flex items-center justify-center flex-shrink-0"
                      title="Use my location"
                      aria-label="Use my location"
                      type="button"
                    >
                      <Crosshair className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
                    </button>
                    <span className="text-gray-300 font-light select-none">|</span>
                  
                  {/* City Dropdown */}
                  <div className="relative flex-1 min-w-[100px]">
                    <input
                      ref={cityInputRef}
                      type="text"
                      value={selectedCity}
                      onChange={(e) => {
                        setSelectedCity(e.target.value);
                        setShowCityDropdown(true);
                      }}
                      onFocus={() => {
                        // Avoid immediate reopen right after selecting a city.
                        if (!selectedCity) setShowCityDropdown(true);
                      }}
                      onClick={() => setShowCityDropdown(true)}
                      onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                      placeholder="Select City"
                      className="w-full text-sm md:text-base focus:outline-none font-semibold text-gray-900 bg-transparent placeholder-gray-500"
                    />
                    
                    {showCityDropdown && !loadingData && (
                      <div className="absolute top-full left-0 mt-2 w-[min(94vw,24rem)] min-w-[16rem] sm:w-[22rem] md:w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-[140] max-h-64 overflow-y-auto">
                        {cities
                          .filter(city => !selectedCity || city.name.toLowerCase().includes(selectedCity.toLowerCase()))
                          .map((city) => (
                            <button
                              key={city.name}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setShowCityDropdown(false);
                                handleCitySelect(city);
                              }}
                              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between border-b border-gray-50 last:border-b-0 transition-colors"
                            >
                              <div>
                                <div className="text-sm font-medium text-gray-900">{city.name}</div>
                                <div className="text-xs text-gray-500">
                                  {city.state}
                                  {city.count > 0 && <span className="ml-1 text-gray-700 font-medium">• {city.count} providers</span>}
                                </div>
                              </div>
                            </button>
                          ))}
                        {cities.length === 0 && (
                          <div className="px-4 py-3 text-sm text-gray-500">No cities found</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Area Dropdown - Only show if city is selected */}
                  {selectedCity && (
                    <>
                      <span className="hidden lg:inline text-gray-400 font-light">|</span>
                      <div className="relative basis-full w-full lg:basis-auto lg:w-auto lg:flex-1 lg:min-w-[100px] mt-1.5 lg:mt-0 pl-0 lg:pl-0 border-t border-gray-200 lg:border-0 pt-1.5 lg:pt-0 min-w-0">
                        <input
                          type="text"
                          value={selectedArea}
                          onChange={(e) => {
                            setSelectedArea(e.target.value);
                            setShowAreaDropdown(true);
                          }}
                          onFocus={() => setShowAreaDropdown(true)}
                          onBlur={() => setTimeout(() => setShowAreaDropdown(false), 200)}
                          placeholder="Select Area"
                          className="w-full text-sm md:text-base focus:outline-none font-semibold text-gray-900 bg-transparent placeholder-gray-500"
                        />
                        
                        {showAreaDropdown && availableAreas.length > 0 && (
                          <div className="absolute top-full left-0 mt-2 w-[min(94vw,24rem)] min-w-[16rem] sm:w-[22rem] md:w-64 bg-white border-2 border-gray-300 rounded-xl shadow-xl z-[140] max-h-64 overflow-y-auto">
                            {availableAreas
                              .filter(area => !selectedArea || area.toLowerCase().includes(selectedArea.toLowerCase()))
                              .map((area) => (
                                <button
                                  key={area}
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleAreaSelect(area);
                                  }}
                                  className="w-full px-4 py-3 text-left hover:bg-gray-100 active:bg-gray-200 text-sm font-semibold text-gray-900 border-b border-gray-100 last:border-b-0 transition-colors"
                                >
                                  {area}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  
                </div>

                {/* Search Input with Smart Autocomplete */}
                <div className="flex-1 relative z-20 border-t lg:border-t-0 lg:border-l-2 border-gray-200 hover:bg-gray-50/30 transition-colors min-h-[56px]">
                  <SearchAutocomplete
                    onSelect={(suggestion) => {
                      setSearchQuery(suggestion.label);
                      // Store taxonomy ID for filtering
                      if (suggestion.taxonomyId) {
                        updateFilter('serviceId', suggestion.taxonomyId);
                      }
                    }}
                    onInputChange={(value) => {
                      setSearchQuery(value);
                    }}
                    placeholder="Search for Plumbers, Electricians, Photographers, Designers..."
                    showIcon={false}
                    hideHelperText={true}
                    className="h-full"
                    inputClassName="min-h-[56px] py-3 text-sm md:text-base"
                  />
                </div>

                {/* Budget Input and Search Button */}
                <div className="flex flex-col sm:flex-row items-stretch lg:w-auto border-t lg:border-t-0 lg:border-l-2 border-gray-200">
                  {/* Manual Budget Input */}
                  <div className="relative flex items-center px-4 md:px-5 py-4 lg:w-52 bg-gray-50/50 hover:bg-gray-50 transition-colors border-b sm:border-b-0 sm:border-r border-gray-200">
                    <input
                      type="number"
                      value={customBudget}
                      onChange={(e) => setCustomBudget(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const v = parseInt(customBudget) || 10000000;
                          updateFilter('budgetMax', v);
                          setBudgetLabel(v === 10000000 ? 'Budget (Any)' : `Up to ₹${Math.round(v / 1000)}k`);
                        }
                      }}
                      onBlur={() => {
                        const v = parseInt(customBudget) || 10000000;
                        updateFilter('budgetMax', v);
                        setBudgetLabel(v === 10000000 ? 'Budget (Any)' : `Up to ₹${Math.round(v / 1000)}k`);
                      }}
                      placeholder="Budget (₹)"
                      className="w-full text-sm md:text-base focus:outline-none font-semibold text-gray-900 bg-transparent placeholder-gray-500"
                    />
                  </div>

                  {/* Search Button */}
                  <button
                    onClick={handleContinue}
                    className="px-8 md:px-10 lg:px-12 py-4 bg-gray-900 text-white font-bold text-base hover:bg-gray-800 active:bg-black flex items-center justify-center gap-2.5 transition-all duration-200 rounded-b-2xl sm:rounded-b-none sm:rounded-r-2xl shadow-sm hover:shadow-md"
                  >
                    <Search className="w-5 h-5" />
                    <span>Search</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
            {locationStatus && (
              <p className="text-xs text-gray-600 mt-2 px-1">{locationStatus}</p>
            )}
            {detailedLocation.fullAddress && (
              <div className="text-xs text-gray-500 mt-1 px-1 bg-blue-50 rounded p-2 border border-blue-100">
                <div className="font-semibold text-blue-900 mb-1">📍 Detected Location:</div>
                {detailedLocation.street && <div>Street: {detailedLocation.street}</div>}
                {detailedLocation.area && <div>Area: {detailedLocation.area}</div>}
                {detailedLocation.city && <div>City: {detailedLocation.city}</div>}
                <div className="text-gray-400 mt-1">Coordinates: {detailedLocation.latitude?.toFixed(6)}, {detailedLocation.longitude?.toFixed(6)}</div>
              </div>
            )}
          </div>

          {/* Category Browse Dropdowns - Professional Style */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {Object.keys(categoryMegaMenu).map((category, idx) => (
              <div 
                key={idx} 
                className="relative"
                onMouseEnter={() => setShowCategoryMenu(category)}
                onMouseLeave={() => setTimeout(() => setShowCategoryMenu(''), 200)}
              >
                <button
                  className={`text-sm font-medium px-4 py-2 rounded transition-colors flex items-center gap-1.5 ${
                    showCategoryMenu === category 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  {category}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCategoryMenu === category ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {showCategoryMenu === category && (
                  <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-2xl z-[100] overflow-hidden">
                    <div className="py-2">
                      {categoryMegaMenu[category]?.map((item, itemIdx) => (
                        <button
                          key={itemIdx}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSearchQuery(item.label);
                            setShowCategoryMenu('');
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-50 text-left transition-colors border-b border-gray-50 last:border-b-0"
                        >
                          <span className="text-xl">{item.icon}</span>
                          <span className="text-sm font-medium text-gray-900">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Suggested Budget Ranges (below search) */}
          <div className="max-w-6xl mx-auto mt-6 px-4">
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <span className="text-sm md:text-base font-bold text-gray-800 flex items-center gap-2">
                Popular Budgets:
              </span>
              {presetBudgets.map((p) => (
                <button
                  key={p.value}
                  onClick={() => {
                    updateFilter('budgetMax', p.value);
                    setBudgetLabel(p.label);
                    setCustomBudget(p.value.toString());
                  }}
                  className={`px-5 py-2.5 rounded-full text-sm font-semibold border-2 transition-all duration-200 whitespace-nowrap shadow-sm hover:shadow-md ${
                    filters.budgetMax === p.value
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-800 border-gray-300 hover:border-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Trust Indicators */}
      <div className="bg-gradient-to-r from-[#f6f9ff] via-[#eef4ff] to-[#f6f9ff] border-b border-[var(--premium-border)] trust-section">
        <div className="max-w-7xl mx-auto px-2 md:px-4 py-8 md:py-10">
          <div className="text-center mb-6">
            <h2 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Why Thousands Trust Us
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-center">
            <div className="transform hover:scale-105 transition-transform duration-300">
              <div className="bg-white rounded-2xl p-4 md:p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex flex-col items-center justify-center gap-2 mb-2">
                  <div className="p-3 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full">
                    <Shield className="w-6 h-6 md:w-8 md:h-8 text-indigo-600" />
                  </div>
                </div>
                <div className="text-xs md:text-sm text-gray-700 font-bold">Trusted Providers</div>
                <div className="text-xs text-gray-500 mt-1">Carefully verified</div>
              </div>
            </div>
            <div className="transform hover:scale-105 transition-transform duration-300">
              <div className="bg-white rounded-2xl p-4 md:p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex flex-col items-center justify-center gap-2 mb-2">
                  <div className="p-3 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full">
                    <Award className="w-6 h-6 md:w-8 md:h-8 text-purple-600" />
                  </div>
                </div>
                <div className="text-xs md:text-sm text-gray-700 font-bold">Services Delivered</div>
                <div className="text-xs text-gray-500 mt-1">Handled end-to-end</div>
              </div>
            </div>
            <div className="transform hover:scale-105 transition-transform duration-300">
              <div className="bg-white rounded-2xl p-4 md:p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex flex-col items-center justify-center gap-2 mb-2">
                  <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full">
                    <Star className="w-6 h-6 md:w-8 md:h-8 text-blue-600 fill-blue-500" />
                  </div>
                </div>
                <div className="text-xs md:text-sm text-gray-700 font-bold">Happy Customers</div>
                <div className="text-xs text-gray-500 mt-1">Positive feedback</div>
              </div>
            </div>
            <div className="transform hover:scale-105 transition-transform duration-300">
              <div className="bg-white rounded-2xl p-4 md:p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex flex-col items-center justify-center gap-2 mb-2">
                  <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full">
                    <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
                  </div>
                </div>
                <div className="text-xs md:text-sm text-gray-700 font-bold">Provider Growth</div>
                <div className="text-xs text-gray-500 mt-1">Built to scale</div>
              </div>
            </div>
          </div>

          <div className="mt-6 md:mt-8 flex flex-wrap justify-center gap-4 md:gap-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow">
              <Shield className="w-4 h-4 text-green-600" />
              <span className="text-xs md:text-sm font-semibold text-gray-700">100% Verified Providers</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="text-xs md:text-sm font-semibold text-gray-700">Best Price Guarantee</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow">
              <Award className="w-4 h-4 text-indigo-600" />
              <span className="text-xs md:text-sm font-semibold text-gray-700">Premium Quality Assured</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServiceSearch;
