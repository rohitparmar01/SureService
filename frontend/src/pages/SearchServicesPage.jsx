import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search, MapPin, X, ChevronDown, ChevronRight, ChevronUp,
  Star, Shield, IndianRupee, Calendar, Home, Loader2, Crosshair, ArrowRight, SlidersHorizontal,
  Sparkles, Users, LayoutGrid, RotateCcw
} from 'lucide-react';
import VendorCard from '../components/VendorCard';
import { fetchVendors, fetchSearchSuggestions } from '../services/api';
import { fetchServiceTypes, fetchCities, fetchAreas } from '../services/dynamicDataService';
import { formatCurrency } from '../utils/format';
import { getSuggestedServices } from '../services/filterService';
import { useSearch } from '../contexts/SearchContext';
import SearchAutocomplete from '../components/SearchAutocomplete';

const SearchServicesPage = () => {
  const navigate = useNavigate();
  const {
    searchQuery,
    setSearchQuery,
    selectedCity,
    setSelectedCity,
    selectedArea,
    setSelectedArea,
    location,
    filters,
    updateFilter,
    updateFilters,
    sortBy,
    setSortBy,
    isLocating,
    setIsLocating,
    locationStatus,
    setLocationStatus,
    showSuggestions,
    setShowSuggestions,
    suggestions,
    setSuggestions,
    activeFiltersCount,
    clearAllFilters,
    updateLocation,
    resetSearchState
  } = useSearch();
  
  // Local state for vendors and UI
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalVendors, setTotalVendors] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    eventType: true,
    budget: true,
    location: true,
    rating: true,
    services: true,
    verified: true
  });
  
  // Dynamic data from database
  const [serviceTypes, setServiceTypes] = useState([]);
  const [cities, setCities] = useState([]);
  const [availableAreas, setAvailableAreas] = useState([]);
  const [loadingFilters, setLoadingFilters] = useState(true);
  
  // Location dropdown states
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);
  
  // Service type search filter
  const [serviceTypeSearch, setServiceTypeSearch] = useState('');
  
  // Filtered service types based on search
  const filteredServiceTypes = serviceTypes.filter(service => 
    service.label.toLowerCase().includes(serviceTypeSearch.toLowerCase())
  );

  // Load dynamic filter data on mount
  useEffect(() => {
    const loadFilterData = async () => {
      setLoadingFilters(true);
      try {
        const [servicesData, citiesData] = await Promise.all([
          fetchServiceTypes(),
          fetchCities()
        ]);
        setServiceTypes(servicesData);
        setCities(citiesData);
      } catch (error) {
        console.error('Error loading filter data:', error);
      } finally {
        setLoadingFilters(false);
      }
    };
    
    loadFilterData();
  }, []);

  // Load areas when selected city changes
  useEffect(() => {
    const loadAreas = async () => {
      if (selectedCity) {
        try {
          const areasData = await fetchAreas(selectedCity);
          // Format to match expected structure
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

  // Debounce timer ref for search query
  const searchDebounceTimer = useRef(null);
  const suggestionDebounceTimer = useRef(null);
  const isInitialMount = useRef(true);
  const [liveVendorSuggestions, setLiveVendorSuggestions] = useState([]);

  // Memoized load vendors function
  const loadVendors = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch ALL vendors - no filtering on backend
      const response = await fetchVendors({
        page: 1,
        limit: 500
      });

      const vendorsList = response.vendors || response.data || response.results || [];
      setVendors(vendorsList);
      setTotalVendors(response.total || vendorsList.length);
    } catch (error) {
      console.error('❌ Error loading vendors:', error);
      setVendors([]);
      setTotalVendors(0);
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies - fetch same way always

  // Load vendors on component mount
  useEffect(() => {
    loadVendors();
  }, []); // Run only once on mount

  // Debounced search for text query
  useEffect(() => {
    // Skip debounce on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Clear previous timer
    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
    }

    // If search query changed, reload vendors
    searchDebounceTimer.current = setTimeout(() => {
      loadVendors();
    }, 500); // 500ms debounce for search query

    return () => {
      if (searchDebounceTimer.current) {
        clearTimeout(searchDebounceTimer.current);
      }
    };
  }, [searchQuery]);

  // Live suggestions for search query (faster debounce)
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setLiveVendorSuggestions([]);
      setSuggestions([]);
      return;
    }

    // Clear previous timer
    if (suggestionDebounceTimer.current) {
      clearTimeout(suggestionDebounceTimer.current);
    }

    suggestionDebounceTimer.current = setTimeout(async () => {
      try {
        // Fetch intelligent suggestions from database
        const dbSuggestions = await fetchSearchSuggestions(searchQuery.trim(), 8);
        
        // Also get service type suggestions from filter service
        const serviceSuggestions = getSuggestedServices(searchQuery.trim());
        
        // Combine and deduplicate
        const combined = [...dbSuggestions, ...serviceSuggestions];
        const unique = combined.filter((item, index, self) =>
          index === self.findIndex((t) => t.text === item.text)
        );
        
        setSuggestions(serviceSuggestions);
        setLiveVendorSuggestions(dbSuggestions.filter(s => s.type === 'vendor'));
      } catch (error) {
        // Fallback to local suggestions
        const localSuggestions = getSuggestedServices(searchQuery.trim());
        setSuggestions(localSuggestions);
        setLiveVendorSuggestions([]);
      }
    }, 300); // 300ms for suggestions (faster than full search)

    return () => {
      if (suggestionDebounceTimer.current) {
        clearTimeout(suggestionDebounceTimer.current);
      }
    };
  }, [searchQuery]);

  // Immediate load for filter changes (no debounce)
  useEffect(() => {
    if (!isInitialMount.current) {
      loadVendors();
    }
  }, [filters, sortBy, selectedCity, selectedArea, loadVendors]);

  const handleFilterChange = (key, value) => {
    updateFilter(key, value);
    // Close mobile filter after selection
    if (window.innerWidth < 1024) {
      setTimeout(() => setShowFilters(false), 300);
    }
  };

  // Batch update for budget range (prevents double render)
  const handleBudgetRangeChange = (min, max) => {
    updateFilters({ budgetMin: min, budgetMax: max });
    // Close mobile filter after selection
    if (window.innerWidth < 1024) {
      setTimeout(() => setShowFilters(false), 300);
    }
  };

  const updateURL = (newFilters) => {
    // URL sync is now handled by the context
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadVendors();
  };

  const handleClearSearchAndFilters = () => {
    resetSearchState();
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleCitySelect = (city) => {
    setSelectedCity(city.name);
    setSelectedArea('');
    updateLocation(city.name, '');
    setShowCityDropdown(false);
  };

  const handleAreaSelect = (area) => {
    setSelectedArea(area);
    updateLocation(selectedCity, area);
    setShowAreaDropdown(false);
  };

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
          
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          
          const data = await response.json();
          const address = data.address || {};
          
          const city = address.city || address.town || address.village || address.state_district || 'Unknown City';
          const area = address.suburb || address.neighbourhood || address.quarter || address.road || '';
          
          let locationString = '';
          if (area && city) {
            locationString = `${area}, ${city}`;
          } else if (city) {
            locationString = city;
          } else {
            locationString = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          }
          
          updateLocation(city, area);
          setSelectedCity(city);
          setSelectedArea(area);
          
          setLocationStatus(`✓ Location: ${locationString}`);
          setIsLocating(false);
        } catch (error) {
          console.error('Reverse geocoding error:', error);
          updateLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, '');
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

  // Normalize service type for better matching
  const normalizeServiceType = (serviceType) => {
    if (!serviceType) return undefined;
    
    // Convert to lowercase and get base word
    const normalized = serviceType.toLowerCase().trim();
    
    // Service type aliases - map UI terms to database terms
    const aliases = {
      // HVAC variations
      'ac': 'hvac',
      'ac repair': 'hvac',
      'cooling': 'hvac',
      'air conditioning': 'hvac',
      'hvac': 'hvac',
      
      // CCTV variations
      'cctv': 'cctv',
      'security camera': 'cctv',
      'surveillance': 'cctv',
      'camera installation': 'cctv',
      
      // IT Hardware variations
      'it': 'it',
      'hardware': 'it',
      'server': 'it',
      'computers': 'it',
      'networking': 'it',
      
      // Electrical variations
      'electrical': 'electrical',
      'electrician': 'electrical',
      'wiring': 'electrical',
      'power': 'electrical',
      
      // Plumbing variations
      'plumbing': 'plumbing',
      'plumber': 'plumbing',
      'pipe': 'plumbing',
      'bathroom': 'plumbing'
    };
    
    // Check if it's an alias, otherwise return normalized version
    return aliases[normalized] || normalized;
  };

  const popularSearches = [
    { text: 'AC Installation Services', icon: '❄️' },
    { text: 'CCTV Installation', icon: '📹' },
    { text: 'Server Setup', icon: '💻' },
    { text: 'Electrical Repair', icon: '⚡' },
    { text: 'Plumbing Services', icon: '🚰' },
    { text: 'HVAC Maintenance', icon: '🔧' },
    { text: 'IT Hardware Support', icon: '⚙️' },
    { text: 'Electrical Installation', icon: '💡' }
  ];

  // Removed: static serviceTypes array - now using dynamic state from API

  const sortOptions = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'popularity', label: 'Popularity' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'rating', label: 'Rating' },
    { value: 'distance', label: 'Nearest First' }
  ];

  const hasActiveSearchInputs =
    Boolean(searchQuery?.trim()) ||
    Boolean(selectedCity?.trim()) ||
    Boolean(selectedArea?.trim()) ||
    Boolean(location?.trim()) ||
    activeFiltersCount > 0 ||
    sortBy !== 'relevance';

  // Smart reordering based on MODE: Browse vs Search
  const vendorSections = useMemo(() => {
    if (!vendors.length) return [];

    // Helper to convert to number
    const toNumber = (value) => {
      const n = Number(value);
      return Number.isFinite(n) ? n : 0;
    };

    const getVendorBudget = (vendor) => {
      const pricing = vendor?.pricing || {};
      const pricingInfo = vendor?.pricingInfo || {};

      return (
        toNumber(pricing.average) ||
        toNumber(pricing.min) ||
        toNumber(pricing.basePrice) ||
        toNumber(pricingInfo.basePrice) ||
        toNumber(pricingInfo.average) ||
        toNumber(pricingInfo.min) ||
        0
      );
    };

    // Detect MODE: Browse (no search) vs Search (has search/filters)
    const query = (searchQuery || '').trim().toLowerCase();
    const queryTokens = query.split(/\s+/).filter(Boolean);
    const targetCity = (selectedCity || '').toLowerCase();
    const targetArea = (selectedArea || '').toLowerCase();
    const targetService = (filters?.eventCategory || '').toLowerCase();
    const budgetMin = toNumber(filters?.budgetMin || 0);
    const budgetMax = toNumber(filters?.budgetMax || 0);
    const hasBudgetFilter = budgetMin > 0 || budgetMax < 10000000;

    const isBrowseMode = !queryTokens.length && !targetCity && !targetArea && !targetService && budgetMin === 0 && budgetMax === 10000000;

    // Requested vendor priority:
    // premium > growth > starter > free(verified) > free
    const getPlanPriority = (vendor) => {
      const planKey = String(vendor?.subscription?.planKey || 'free').toLowerCase();
      const isVerified = Boolean(vendor?.verified);

      if (planKey === 'premium') return 4;
      if (planKey === 'growth') return 3;
      if (planKey === 'starter') return 2;

      // Treat all remaining/legacy/unknown plans as free-tier buckets.
      return isVerified ? 1 : 0;
    };

    if (isBrowseMode) {
      // ═══════════════════════════════════════════════════════════════════
      // MODE 1: BROWSE - Simple plan tier ordering only
      // ═══════════════════════════════════════════════════════════════════
      const vendorScores = vendors.map((vendor) => {
        const planTier = getPlanPriority(vendor);
        const rating = toNumber(vendor.rating || 0);
        const bookings = toNumber(vendor.totalBookings || vendor.completedBookings || 0);
        const qualityScore = (rating * 10) + (bookings * 0.5);
        const vendorBudget = getVendorBudget(vendor);
        const distance = toNumber(vendor.distance || Number.POSITIVE_INFINITY);

        return {
          vendor,
          planTier,
          qualityScore,
          vendorBudget,
          rating,
          bookings,
          distance
        };
      });

      // Respect explicit sort options first in browse mode.
      vendorScores.sort((a, b) => {
        if (sortBy === 'price-low') {
          const aPrice = a.vendorBudget > 0 ? a.vendorBudget : Number.POSITIVE_INFINITY;
          const bPrice = b.vendorBudget > 0 ? b.vendorBudget : Number.POSITIVE_INFINITY;
          if (aPrice !== bPrice) return aPrice - bPrice;
        }

        if (sortBy === 'price-high') {
          const aPrice = a.vendorBudget > 0 ? a.vendorBudget : Number.NEGATIVE_INFINITY;
          const bPrice = b.vendorBudget > 0 ? b.vendorBudget : Number.NEGATIVE_INFINITY;
          if (aPrice !== bPrice) return bPrice - aPrice;
        }

        if (sortBy === 'rating' && b.rating !== a.rating) {
          return b.rating - a.rating;
        }

        if (sortBy === 'popularity' && b.bookings !== a.bookings) {
          return b.bookings - a.bookings;
        }

        if (sortBy === 'distance' && a.distance !== b.distance) {
          return a.distance - b.distance;
        }

        // Default browse ordering: plan tier (Primary) → quality score (Secondary)
        if (b.planTier !== a.planTier) return b.planTier - a.planTier;
        if (b.qualityScore !== a.qualityScore) return b.qualityScore - a.qualityScore;
        return 0;
      });

      return [
        {
          key: 'all-vendors',
          title: 'All Vendors',
          icon: LayoutGrid,
          headerClass: 'bg-gradient-to-r from-blue-600 to-indigo-600',
          titleClass: 'text-white',
          iconClass: 'text-blue-200',
          badgeClass: 'bg-white/20 text-white border border-white/30',
          items: vendorScores.map((item) => item.vendor),
          emptyText: 'No vendors found'
        }
      ];
    }

    // ═══════════════════════════════════════════════════════════════════
    // MODE 2: SEARCH - Full matching algorithm with weights
    // ═══════════════════════════════════════════════════════════════════
    const vendorScores = vendors.map((vendor) => {
      const city = (vendor.city || '').toLowerCase();
      const area = (vendor.area || '').toLowerCase();
      const serviceType = (vendor.serviceType || '').toLowerCase();
      const vendorName = (vendor.name || vendor.businessName || '').toLowerCase();
      const description = (vendor.description || '').toLowerCase();

      // Include searchKeywords which contains keywords related to the service type
      const searchKeywords = (vendor.searchKeywords || []).map(k => k.toLowerCase()).join(' ');

      const vendorBudget = getVendorBudget(vendor);
      const rating = toNumber(vendor.rating || 0);

      // ──────────────────────────────────────────────────────────────────
      // MATCH SCORE CALCULATION
      // ──────────────────────────────────────────────────────────────────
      let matchScore = 0;

      // 1. LOCATION MATCHING (Highest boost)
      if (targetCity && city.includes(targetCity)) {
        matchScore += 30; // City match
        if (targetArea && area.includes(targetArea)) {
          matchScore += 20; // Area bonus
        }
      }

      // 2. SERVICE TYPE MATCHING
      if (targetService && serviceType.includes(targetService)) {
        matchScore += 25;
      }

      // 3. SEARCH QUERY MATCHING (Token-based weighted scoring)
      if (queryTokens.length > 0) {
        queryTokens.forEach(token => {
          // Check vendor name (highest priority = 20 points)
          if (vendorName.includes(token)) {
            matchScore += 20;
          }
          // Check service type OR searchKeywords (curated keywords = 15 points)
          else if (serviceType.includes(token) || searchKeywords.includes(token)) {
            matchScore += 15;
          }
          // Check description (medium = 10 points)
          else if (description.includes(token)) {
            matchScore += 10;
          }
          // Check city/area (low = 5 points)
          else if (city.includes(token) || area.includes(token)) {
            matchScore += 5;
          }
        });
      }

      // 4. BUDGET MATCHING
      if (budgetMax > 0 && vendorBudget > 0) {
        if (vendorBudget >= budgetMin && vendorBudget <= budgetMax) {
          matchScore += 15;
        }
      }

      // ──────────────────────────────────────────────────────────────────
      // SECONDARY SORT CRITERIA
      // ──────────────────────────────────────────────────────────────────
      const planTier = getPlanPriority(vendor);
      const qualityScore = (rating * 10) + (toNumber(vendor.totalBookings || vendor.completedBookings) * 0.5);
      const isVerified = vendor.verified ? 1 : 0;

      // Check if this vendor matches the selected city
      const cityMatched = targetCity ? city.includes(targetCity) : false;

      return {
        vendor,
        matchScore,
        planTier,
        qualityScore,
        isVerified,
        cityMatched
      };
    });

    const budgetFilteredScores = hasBudgetFilter
      ? vendorScores.filter(({ vendorBudget }) => {
          if (vendorBudget <= 0) return false;
          if (budgetMin > 0 && vendorBudget < budgetMin) return false;
          if (budgetMax > 0 && vendorBudget > budgetMax) return false;
          return true;
        })
      : vendorScores;

    // ──────────────────────────────────────────────────────────────────
    // SORTING PRIORITY (Search Mode)
    // ──────────────────────────────────────────────────────────────────
    budgetFilteredScores.sort((a, b) => {
      if (sortBy === 'price-low') {
        const aPrice = a.vendorBudget > 0 ? a.vendorBudget : Number.POSITIVE_INFINITY;
        const bPrice = b.vendorBudget > 0 ? b.vendorBudget : Number.POSITIVE_INFINITY;
        if (aPrice !== bPrice) return aPrice - bPrice;
      }

      if (sortBy === 'price-high') {
        const aPrice = a.vendorBudget > 0 ? a.vendorBudget : Number.NEGATIVE_INFINITY;
        const bPrice = b.vendorBudget > 0 ? b.vendorBudget : Number.NEGATIVE_INFINITY;
        if (aPrice !== bPrice) return bPrice - aPrice;
      }

      if (sortBy === 'rating') {
        const aRating = toNumber(a.vendor?.rating || 0);
        const bRating = toNumber(b.vendor?.rating || 0);
        if (bRating !== aRating) return bRating - aRating;
      }

      if (sortBy === 'popularity') {
        const aBookings = toNumber(a.vendor?.totalBookings || a.vendor?.completedBookings || 0);
        const bBookings = toNumber(b.vendor?.totalBookings || b.vendor?.completedBookings || 0);
        if (bBookings !== aBookings) return bBookings - aBookings;
      }

      if (sortBy === 'distance') {
        const aDistance = toNumber(a.vendor?.distance || Number.POSITIVE_INFINITY);
        const bDistance = toNumber(b.vendor?.distance || Number.POSITIVE_INFINITY);
        if (aDistance !== bDistance) return aDistance - bDistance;
      }

      // 0. CITY GROUPING (Group all selected city vendors together FIRST)
      if (targetCity && b.cityMatched !== a.cityMatched) {
        return b.cityMatched - a.cityMatched; // Matched city vendors come first
      }

      // 1. MATCH SCORE (Primary - user's search intent)
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;

      // 2. PLAN TIER (within same match score)
      // premium > growth > starter > free(verified) > free
      if (b.planTier !== a.planTier) return b.planTier - a.planTier;

      // 3. VERIFIED STATUS (within same score+tier)
      if (b.isVerified !== a.isVerified) return b.isVerified - a.isVerified;

      // 4. QUALITY SCORE (rating + bookings - last tiebreaker)
      if (b.qualityScore !== a.qualityScore) return b.qualityScore - a.qualityScore;

      return 0;
    });

    return [
      {
        key: 'all-vendors',
        title: 'All Vendors',
        icon: LayoutGrid,
        headerClass: 'bg-gradient-to-r from-blue-600 to-indigo-600',
        titleClass: 'text-white',
        iconClass: 'text-blue-200',
        badgeClass: 'bg-white/20 text-white border border-white/30',
        items: budgetFilteredScores.map((item) => item.vendor),
        emptyText: 'No vendors found'
      }
    ];
  }, [vendors, searchQuery, selectedCity, selectedArea, filters, sortBy]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Top Search Bar - Sticky & Responsive */}
      <div className="sticky top-0 z-40 bg-white lg:bg-white/90 backdrop-blur-none lg:backdrop-blur-md border-b border-gray-200 shadow-md overflow-visible">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 items-stretch relative">
            {/* Search Input - Extra Large & Prominent */}
            <div className="w-full lg:flex-1 h-[52px] sm:h-14 border-2 border-indigo-300 rounded-xl shadow-sm hover:border-indigo-400 hover:shadow-md focus-within:border-indigo-500 focus-within:shadow-lg focus-within:ring-2 focus-within:ring-indigo-100 transition-all bg-white lg:bg-white/98 backdrop-blur-none lg:backdrop-blur-sm">
              <SearchAutocomplete
                value={searchQuery}
                onSelect={(suggestion) => {
                  setSearchQuery(suggestion.label);
                  if (suggestion.taxonomyId) {
                    updateFilter('serviceId', suggestion.taxonomyId);
                  }
                  setShowSuggestions(false);
                }}
                onInputChange={(value) => {
                  setSearchQuery(value);
                }}
                placeholder="What are you looking for?"
                className="h-full"
                inputClassName="h-full text-base sm:text-lg font-medium"
                showIcon={true}
                debounceMs={200}
                maxSuggestions={15}
                hideHelperText={true}
              />
            </div>

            {/* Location Selector - Compact Size */}
            <div className="w-full lg:w-[320px] relative flex items-center px-4 sm:px-5 h-[52px] sm:h-14 border-2 border-indigo-300 rounded-xl shadow-sm hover:border-indigo-400 hover:shadow-md focus-within:border-indigo-500 focus-within:shadow-lg focus-within:ring-2 focus-within:ring-indigo-100 transition-all bg-white lg:bg-white/98 backdrop-blur-none lg:backdrop-blur-sm">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 flex-shrink-0" />

              {/* City Dropdown */}
              <div className="relative flex-1 min-w-0 pl-3 sm:pl-4">
                <input
                  type="text"
                  value={selectedCity}
                  onChange={(e) => {
                    setSelectedCity(e.target.value);
                    setShowCityDropdown(true);
                  }}
                  onFocus={() => setShowCityDropdown(true)}
                  onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                  placeholder="City"
                  className="w-full text-sm sm:text-base font-semibold placeholder-gray-350 focus:outline-none bg-transparent truncate text-gray-800"
                />

                {showCityDropdown && !loadingFilters && (
                  <div className="absolute top-full left-0 mt-2 w-52 sm:w-64 bg-white border-2 border-indigo-200 rounded-xl shadow-xl z-[100] max-h-56 overflow-y-auto">
                    {cities
                      .filter(city => !selectedCity || city.name.toLowerCase().includes(selectedCity.toLowerCase()))
                      .map((city) => (
                        <button
                          key={city.name}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleCitySelect(city);
                          }}
                          className="w-full px-4 sm:px-5 py-2 sm:py-3 text-left hover:bg-indigo-50 active:bg-indigo-100 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          <div className="text-sm sm:text-base font-semibold text-gray-900">{city.name}</div>
                          <div className="text-xs sm:text-sm text-gray-500 mt-0.5">
                            {city.state}
                            {city.count > 0 && <span className="ml-1 text-gray-700 font-medium">• {city.count}</span>}
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Area Dropdown - Only show if city is selected */}
              {selectedCity && (
                <>
                  <div className="w-px h-6 sm:h-7 bg-indigo-200 mx-2 sm:mx-3"></div>
                  <div className="relative flex-1 min-w-0">
                    <input
                      type="text"
                      value={selectedArea}
                      onChange={(e) => {
                        setSelectedArea(e.target.value);
                        setShowAreaDropdown(true);
                      }}
                      onFocus={() => setShowAreaDropdown(true)}
                      onBlur={() => setTimeout(() => setShowAreaDropdown(false), 200)}
                      placeholder="Area"
                      className="w-full text-sm sm:text-base font-semibold placeholder-gray-350 focus:outline-none bg-transparent truncate text-gray-800"
                    />

                    {showAreaDropdown && availableAreas.length > 0 && (
                      <div className="absolute top-full right-0 mt-2 w-52 sm:w-64 bg-white border-2 border-indigo-200 rounded-xl shadow-xl z-[100] max-h-56 overflow-y-auto">
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
                              className="w-full px-4 sm:px-5 py-2 sm:py-3 text-left hover:bg-indigo-50 active:bg-indigo-100 transition-colors text-sm sm:text-base font-semibold text-gray-900 border-b border-gray-100 last:border-b-0"
                            >
                              {area}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={handleLocate}
                className="text-indigo-500 hover:text-indigo-700 transition-colors flex-shrink-0 p-2 ml-1"
                title="Use my current location"
              >
                <Crosshair className={`w-5 h-5 sm:w-6 sm:h-6 ${isLocating ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="bg-white border-b hidden md:block">
        <div className="max-w-7xl mx-auto px-4 py-1">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <button onClick={() => navigate('/')} className="hover:text-blue-600 flex items-center gap-1">
              <Home className="w-3.5 h-3.5" />
              Home
            </button>
            <ChevronRight className="w-3 h-3" />
            <span>Service Categories</span>
            {filters.eventCategory && (
              <>
                <ChevronRight className="w-3 h-3" />
                <span className="text-gray-900 font-medium">{filters.eventCategory}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Ultra Compact */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-3">
        {/* Mobile Filter Toggle Button - Enhanced */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="lg:hidden w-full mb-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl flex items-center justify-center gap-2 font-semibold hover:shadow-lg transition-all shadow-md"
        >
          <SlidersHorizontal className="w-5 h-5" />
          Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
        </button>

        <div className="flex gap-3">
          {/* Left Sidebar - Filters - Polished */}
          <aside
            className={`${
              showFilters ? 'fixed inset-0 z-50 bg-black bg-opacity-50 lg:bg-transparent' : 'hidden'
            } lg:block lg:relative lg:w-64 lg:flex-shrink-0`}
            onClick={(e) => {
              if (e.target === e.currentTarget && window.innerWidth < 1024) {
                setShowFilters(false);
              }
            }}
          >
            <div className={`${
              showFilters ? 'fixed left-0 top-0 bottom-0 w-80 max-w-[85vw] overflow-y-auto' : ''
            } bg-white lg:rounded-2xl lg:border-2 lg:border-indigo-100 lg:sticky lg:top-20 lg:max-h-[calc(100vh-100px)] lg:overflow-y-auto shadow-lg lg:shadow-md`}>
              {/* Polished Filters Header */}
              <div className="px-5 py-4 border-b-2 border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                    <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
                    Filters
                  </h2>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {activeFiltersCount > 0 && (
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-sm text-gray-600">
                      {`${activeFiltersCount} filter${activeFiltersCount !== 1 ? 's' : ''} applied`}
                    </span>
                    <button
                      onClick={handleClearSearchAndFilters}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-bold uppercase tracking-wide hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                )}
              </div>

              <div>
                {/* Service Type Filter */}
                <div className="border-b-2 border-gray-100">
                  <button
                    onClick={() => toggleSection('eventType')}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-indigo-50 transition-colors group"
                  >
                    <span className="text-sm font-bold text-gray-900 uppercase tracking-wide">Service Type</span>
                    {expandedSections.eventType ? <ChevronUp className="w-5 h-5 text-indigo-600 group-hover:scale-110 transition-transform" /> : <ChevronDown className="w-5 h-5 text-gray-400 group-hover:scale-110 transition-transform" />}
                  </button>
                  {expandedSections.eventType && (
                    <div className="px-5 pb-4 space-y-3 bg-gray-50">
                      {/* Search Input */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-600" />
                        <input
                          type="text"
                          placeholder="Search services..."
                          value={serviceTypeSearch}
                          onChange={(e) => setServiceTypeSearch(e.target.value)}
                          className="w-full pl-10 pr-3 py-2 text-sm border-2 border-indigo-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                        />
                      </div>

                      {/* Service List */}
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {loadingFilters ? (
                          <div className="text-center py-4">
                            <Loader2 className="w-5 h-5 animate-spin inline-block text-indigo-600" />
                          </div>
                        ) : filteredServiceTypes.length > 0 ? (
                          filteredServiceTypes.map(service => (
                            <label key={service.value} className="flex items-center gap-3 cursor-pointer group py-2 px-2 rounded-lg hover:bg-white transition-all">
                              <div className="relative">
                                <input
                                  type="radio"
                                  name="serviceType"
                                  checked={filters.eventCategory === service.value}
                                  onChange={() => handleFilterChange('eventCategory', service.value)}
                                  className="w-4 h-4 text-indigo-600 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                />
                              </div>
                              <span className="text-sm text-gray-700 group-hover:text-indigo-700 flex-1 font-medium">
                                {service.label}
                              </span>
                              {service.count > 0 && (
                                <span className="text-xs text-white bg-indigo-600 px-2.5 py-0.5 rounded-full font-semibold">
                                  {service.count}
                                </span>
                              )}
                            </label>
                          ))
                        ) : (
                          <div className="text-sm text-gray-500 text-center py-6">
                            <Search className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                            {serviceTypeSearch ? 'No matching services' : 'No services available'}
                          </div>
                        )}
                      </div>

                      {/* Clear Button */}
                      {filters.eventCategory && (
                        <button
                          onClick={() => {
                            handleFilterChange('eventCategory', '');
                            setServiceTypeSearch('');
                          }}
                          className="text-xs text-indigo-600 hover:text-indigo-700 font-bold mt-3 flex items-center gap-1 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
                        >
                          <X className="w-3 h-3" />
                          Clear Selection
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Budget Range Filter */}
                <div className="border-b-2 border-gray-100">
                  <button
                    onClick={() => toggleSection('budget')}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-indigo-50 transition-colors group"
                  >
                    <span className="text-sm font-bold text-gray-900 uppercase tracking-wide">Budget</span>
                    {expandedSections.budget ? <ChevronUp className="w-5 h-5 text-indigo-600 group-hover:scale-110 transition-transform" /> : <ChevronDown className="w-5 h-5 text-gray-400 group-hover:scale-110 transition-transform" />}
                  </button>
                  {expandedSections.budget && (
                    <div className="px-5 pb-4 space-y-3 bg-gray-50">
                      <div className="space-y-2">
                        {[
                          { label: 'Under ₹10K', min: 0, max: 10000 },
                          { label: '₹10K - ₹25K', min: 10000, max: 25000 },
                          { label: '₹25K - ₹50K', min: 25000, max: 50000 },
                          { label: '₹50K - ₹1L', min: 50000, max: 100000 },
                          { label: 'Above ₹1L', min: 100000, max: 10000000 }
                        ].map((range) => (
                          <label key={range.label} className="flex items-center gap-2 cursor-pointer group">
                            <input
                              type="radio"
                              name="budgetRange"
                              checked={filters.budgetMin === range.min && filters.budgetMax === range.max}
                              onChange={() => handleBudgetRangeChange(range.min, range.max)}
                              className="w-3.5 h-3.5 text-blue-600 focus:ring-1 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 group-hover:text-gray-900">{range.label}</span>
                          </label>
                        ))}
                      </div>
                      
                      {/* Custom Range */}
                      <div className="pt-2 border-t border-gray-100">
                        <div className="text-xs text-gray-600 mb-2">Custom Range</div>
                        <div className="flex gap-2 items-center">
                          <input
                            type="number"
                            value={filters.budgetMin || ''}
                            onChange={(e) => handleFilterChange('budgetMin', parseInt(e.target.value) || 0)}
                            placeholder="Min"
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs
                                     focus:outline-none focus:border-blue-500"
                          />
                          <span className="text-gray-400">to</span>
                          <input
                            type="number"
                            value={filters.budgetMax === 10000000 ? '' : filters.budgetMax}
                            onChange={(e) => handleFilterChange('budgetMax', parseInt(e.target.value) || 10000000)}
                            placeholder="Max"
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs
                                     focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Search Radius */}
                <div className="border-b border-gray-200">
                  <button
                    onClick={() => toggleSection('location')}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
                  >
                    <span className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Search Radius</span>
                    {expandedSections.location ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {expandedSections.location && (
                    <div className="px-4 pb-3">
                      <div className="space-y-2">
                        {[5, 10, 25, 50, 100].map(km => (
                          <label key={km} className="flex items-center gap-2 cursor-pointer group">
                            <input
                              type="radio"
                              name="radius"
                              checked={filters.radius === km}
                              onChange={() => handleFilterChange('radius', km)}
                              className="w-3.5 h-3.5 text-blue-600 focus:ring-1 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 group-hover:text-gray-900">Within {km} km</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Rating Filter */}
                <div className="border-b border-gray-200">
                  <button
                    onClick={() => toggleSection('rating')}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
                  >
                    <span className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Rating</span>
                    {expandedSections.rating ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {expandedSections.rating && (
                    <div className="px-5 pb-4 space-y-3 bg-gray-50">
                      <div className="space-y-2">
                        {['4.5', '4.0', '3.5', '3.0'].map(rating => (
                          <label key={rating} className="flex items-center gap-3 cursor-pointer group py-2 px-2 rounded-lg hover:bg-white transition-all">
                            <input
                              type="radio"
                              name="rating"
                              checked={filters.rating === rating}
                              onChange={() => handleFilterChange('rating', rating)}
                              className="w-4 h-4 text-indigo-600 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                            />
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm text-gray-700 group-hover:text-indigo-700 font-medium">{rating}</span>
                              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                              <span className="text-sm text-gray-500">& above</span>
                            </div>
                          </label>
                        ))}
                      </div>
                      {filters.rating && (
                        <button
                          onClick={() => handleFilterChange('rating', '')}
                          className="text-xs text-indigo-600 hover:text-indigo-700 font-bold hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
                        >
                          Clear Rating
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Verified Service Providers - Enhanced */}
                <div className="border-b-2 border-gray-100">
                  <button
                    onClick={() => toggleSection('verified')}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-indigo-50 transition-colors group"
                  >
                    <span className="text-sm font-bold text-gray-900 uppercase tracking-wide">More Options</span>
                    {expandedSections.verified ? <ChevronUp className="w-5 h-5 text-indigo-600 group-hover:scale-110 transition-transform" /> : <ChevronDown className="w-5 h-5 text-gray-400 group-hover:scale-110 transition-transform" />}
                  </button>
                  {expandedSections.verified && (
                    <div className="px-5 pb-4 bg-gray-50">
                      <label className="flex items-center gap-3 cursor-pointer group py-2 px-2 rounded-lg hover:bg-white transition-all">
                        <input
                          type="checkbox"
                          checked={filters.verified === true}
                          onChange={(e) => handleFilterChange('verified', e.target.checked || undefined)}
                          className="w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        />
                        <Shield className="w-4 h-4 text-indigo-600" />
                        <span className="text-sm text-gray-700 group-hover:text-indigo-700 font-medium">Verified Service Providers Only</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>

          {/* Right Content - Results */}
          <main className="flex-1 min-w-0">
            {/* Enhanced Results Header - Mobile Optimized */}
            <div className="bg-gradient-to-r from-white to-indigo-50 rounded-xl sm:rounded-2xl border border-indigo-100 px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 mb-3 sm:mb-4 shadow-sm">
              <div className="flex flex-col gap-2 sm:gap-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                <div className="min-w-0">
                  <h1 className="text-xs sm:text-sm md:text-base text-gray-700 leading-tight sm:leading-relaxed truncate">
                    <span className="hidden sm:inline">Showing </span>{loading ? '...' : `1–${Math.min(vendors.length, totalVendors)}`}
                    <span className="hidden sm:inline"> of {totalVendors}</span>
                    <span className="font-bold text-gray-900">
                      {searchQuery ? ` "${searchQuery.slice(0, 20)}"` : ' Services'}
                    </span>
                    {location && <span className="text-gray-600"> {location}</span>}
                  </h1>
                </div>
                <div className="w-full sm:w-auto flex items-center gap-2">
                  {/* Mobile: Dropdown */}
                  <div className="sm:hidden w-full">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border-2 border-indigo-200 rounded-lg bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 font-medium"
                    >
                      {sortOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    {hasActiveSearchInputs && (
                      <button
                        type="button"
                        onClick={handleClearSearchAndFilters}
                        className="mt-2 w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-indigo-600 border-2 border-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Desktop: Single-row Sort Tray */}
              <div className="hidden sm:flex items-center gap-3 min-w-0">
                <span className="text-xs text-gray-600 font-semibold uppercase tracking-wide shrink-0">Sort</span>
                <div className="flex-1 min-w-0 overflow-x-auto scrollbar-thin">
                  <div className="inline-flex items-center gap-1.5 whitespace-nowrap pr-1">
                    {sortOptions.map((option) => (
                      <React.Fragment key={option.value}>
                        <button
                          onClick={() => setSortBy(option.value)}
                          className={`px-2.5 lg:px-3 py-1.5 text-xs lg:text-sm rounded-full border transition-all whitespace-nowrap ${
                            sortBy === option.value
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700'
                          }`}
                        >
                          {option.label}
                        </button>
                      </React.Fragment>
                    ))}
                    {hasActiveSearchInputs && (
                      <button
                        type="button"
                        onClick={handleClearSearchAndFilters}
                        className="ml-1 px-2.5 lg:px-3 py-1.5 text-xs lg:text-sm font-semibold text-indigo-600 border border-indigo-200 rounded-full hover:bg-indigo-50 transition-colors whitespace-nowrap"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

              {/* Active Filters - Enhanced */}
              {activeFiltersCount > 0 && (
                <div className="mt-4 pt-4 border-t-2 border-indigo-100">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs text-indigo-700 uppercase font-bold tracking-wide">Active Filters:</span>
                    {filters.eventCategory && (
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 rounded-full text-xs font-medium border border-indigo-200">
                        <Calendar className="w-3.5 h-3.5" />
                        {filters.eventCategory}
                        <button onClick={() => handleFilterChange('eventCategory', '')} className="ml-1 hover:text-indigo-900 hover:bg-indigo-200 rounded-full p-0.5 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    )}
                    {filters.verified && (
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 rounded-full text-xs font-medium border border-green-200">
                        <Shield className="w-3.5 h-3.5" />
                        Verified
                        <button onClick={() => handleFilterChange('verified', false)} className="ml-1 hover:text-green-900 hover:bg-green-200 rounded-full p-0.5 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    )}
                    {filters.rating && (
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-yellow-50 to-orange-50 text-orange-700 rounded-full text-xs font-medium border border-yellow-200">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        {filters.rating}+
                        <button onClick={() => handleFilterChange('rating', '')} className="ml-1 hover:text-orange-900 hover:bg-orange-200 rounded-full p-0.5 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    )}
                    {(filters.budgetMin > 0 || filters.budgetMax < 10000000) && (
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-50 to-teal-50 text-teal-700 rounded-full text-xs font-medium border border-green-200">
                        <IndianRupee className="w-3.5 h-3.5" />
                        {formatCurrency(filters.budgetMin)} - {formatCurrency(filters.budgetMax)}
                        <button onClick={() => {
                          handleFilterChange('budgetMin', 0);
                          handleFilterChange('budgetMax', 10000000);
                        }} className="ml-1 hover:text-teal-900 hover:bg-teal-200 rounded-full p-0.5 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Results Grid - Attractive Layout */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="relative w-20 h-20">
                  <Loader2 className="w-20 h-20 text-indigo-600 animate-spin absolute inset-0" />
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/30 to-purple-600/30 rounded-full blur-2xl"></div>
                </div>
                <div className="text-center space-y-2">
                  <p className="text-gray-800 font-bold text-xl">Searching for ideal service providers...</p>
                  <p className="text-gray-500 text-sm">Finding the best matches based on your preferences</p>
                </div>
              </div>
            ) : vendors.length > 0 ? (
              <div className="space-y-6">
                {vendorSections.map((section) => {
                  const SectionIcon = section.icon;
                  return (
                    <section key={section.key} className="overflow-hidden rounded-xl shadow-sm transition-all hover:shadow-md border border-slate-200 bg-white">
                      {/* Compact Attractive Header */}
                      <div className="px-3 sm:px-4 py-1.5 flex items-center justify-between bg-gradient-to-r from-white via-slate-50 to-indigo-50 border-b border-slate-200">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="p-1.5 bg-white rounded-md border border-indigo-100 shadow-sm">
                            <SectionIcon className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div>
                            <h2 className="text-sm sm:text-[15px] font-bold tracking-tight text-slate-900 leading-tight">
                              {section.title}
                            </h2>
                            <p className="text-slate-500 text-[10px] sm:text-[11px] mt-0.5 font-medium leading-none">
                              {section.items.length} provider{section.items.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>

                        <div className="px-2 py-0.5 bg-white rounded-md border border-indigo-100 leading-none shadow-sm">
                          <span className="text-indigo-700 font-semibold text-[11px] sm:text-xs">
                            {section.items.length}
                          </span>
                        </div>
                      </div>

                      {/* Service Provider Grid */}
                      <div className="bg-white p-3 sm:p-4 md:p-4">
                        {section.items.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
                            {section.items.map((vendor, idx) => (
                              <div
                                key={vendor._id || vendor.id}
                                className="animate-fadeIn"
                                style={{
                                  animationDelay: `${idx * 50}ms`
                                }}
                              >
                                <VendorCard
                                  vendor={vendor}
                                  variant="compact"
                                  showDistance={true}
                                  sectionLabel={section.title}
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-16">
                            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center shadow-md">
                              <Search className="w-8 h-8 text-indigo-600" />
                            </div>
                            <p className="text-gray-700 font-semibold text-base mb-1">
                              {section.emptyText}
                            </p>
                            <p className="text-gray-500 text-xs">Try adjusting your search criteria</p>
                          </div>
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 sm:py-24 bg-gradient-to-br from-white via-indigo-50 to-white rounded-3xl border-2 border-gray-100 px-4 shadow-lg">
                <div className="mb-8">
                  <div className="w-28 h-28 mx-auto mb-6 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 rounded-3xl flex items-center justify-center shadow-xl">
                    <Search className="w-14 h-14 text-indigo-600" />
                  </div>
                </div>
                <h3 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
                  No service providers found
                </h3>
                <p className="text-gray-600 font-semibold text-lg mb-3">
                  We couldn't find any service providers matching your criteria
                </p>
                <p className="text-gray-500 text-base mb-10 max-w-md mx-auto">
                  Try adjusting your search terms, removing filters, or exploring different service types
                </p>
                <button
                  onClick={handleClearSearchAndFilters}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                >
                  <RotateCcw className="w-4 h-4" />
                  Clear All Filters
                </button>
              </div>
            )}

            {/* Load More Button - Enhanced */}
            {vendors.length < totalVendors && !loading && (
              <div className="text-center mt-4 sm:mt-6">
                <button
                  onClick={loadVendors}
                  className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-xl font-semibold text-base transition-all hover:scale-105 active:scale-95"
                >
                  Load More Service Providers
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default SearchServicesPage;
