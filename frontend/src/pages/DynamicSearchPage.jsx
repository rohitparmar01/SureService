import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, MapPin } from 'lucide-react';
import { ServiceProvider, useService } from '../contexts/ServiceContext';
import DynamicFilterPanel from '../components/DynamicFilterPanel';
import LocationFilters from '../components/LocationFilters';
import VendorCard from '../components/VendorCard';
import SolutionCard from '../components/SolutionCard';
import { getSuggestedServices } from '../services/filterService';
import { fetchVendors } from '../services/api';

/**
 * DYNAMIC SEARCH PAGE
 * 
 * This page is service-agnostic - it doesn't know about photography, tents, or pandits
 * All logic is driven by the active service context
 * 
 * When backend is ready:
 * 1. Replace mock fetchVendors with real API
 * 2. Replace detectService with ML intent detection API
 * 3. Add debounced search with cancel tokens
 */

const DynamicSearchPageContent = () => {
  const [searchParams] = useSearchParams();
  const {
    search,
    selectCategory,
    filterSchema,
    appliedFilters,
    searchContext,
    setFilter,
    clearAllFilters,
    isLoading: contextLoading
  } = useService();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('solutions'); // solutions | vendors
  const [sortBy, setSortBy] = useState('relevance');
  const [tierBreakdown, setTierBreakdown] = useState(null);
  const [searchMetadata, setSearchMetadata] = useState(null);

  // Detect service when query changes
  useEffect(() => {
    if (query.length > 0) {
      search(query);
      
      // Show suggestions
      const suggested = getSuggestedServices(query);
      setSuggestions(suggested);
      setShowSuggestions(suggested.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, [query]);

  // Execute search when filters change
  useEffect(() => {
    if (activeService && filterValues.city) {
      executeSearch();
    }
  }, [activeService, filterValues, sortBy]);

  const executeSearch = async () => {
    setLoading(true);
    
    try {
      // API search with proper field mapping - database-driven only
      const response = await fetchVendors({
        serviceType: activeService || serviceConfig?.serviceId,
        city: filterValues.city,
        radius: filterValues.radius || 10,
        budgetMin: filterValues.budgetMin || 0,
        budgetMax: filterValues.budgetMax || 10000000,
        sortBy
      });
      
      // Use only database-driven results - no mock data fallback
      const vendorsList = response.vendors || [];
      setResults(vendorsList);
      setTierBreakdown(response.tierBreakdown || null);
      setSearchMetadata(response.metadata || null);
    } catch (error) {
      console.error('❌ Search error:', error);
      // Show empty state on error - no mock data
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      detectService(query);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (serviceId) => {
    selectCategory(serviceId);
    setShowSuggestions(false);
  };

  const handleApplyFilters = (filters) => {
    // Filters are already updated in context
    // Just trigger search
    executeSearch();
  };

  // Group vendors by tier - Strict Priority Order
  const groupVendorsByTier = () => {
    // If no results, return empty array
    if (!results || results.length === 0) {
      return [];
    }

    const groups = {
      exact_area: { 
        vendors: [], 
        title: 'Same Area Service Providers', 
        subtitle: 'In Your Area',
        icon: '👑', 
        color: 'indigo', 
        description: `Located exactly in ${filterValues.area || 'your selected area'} and highly rated`,
        priority: 1
      },
      nearby: { 
        vendors: [], 
        title: 'Nearby Service Providers', 
        subtitle: 'Nearby',
        icon: '🔵', 
        color: 'blue', 
        description: `Service providers near ${filterValues.area || filterValues.city || 'your location'}`,
        priority: 2
      },
      same_city: { 
        vendors: [], 
        title: 'Same City – Other Areas', 
        subtitle: filterValues.city || 'Same City',
        icon: '🔵', 
        color: 'purple', 
        description: `Other service providers in ${filterValues.city || 'the same city'}`,
        priority: 3
      },
      adjacent_city: { 
        vendors: [], 
        title: 'Nearby Cities Service Providers', 
        subtitle: 'Nearby Cities',
        icon: '🔵', 
        color: 'green', 
        description: 'Service providers from nearby cities within practical distance',
        priority: 4
      },
      all: {
        vendors: [],
        title: 'All Service Providers',
        subtitle: 'Available Service Providers',
        icon: '🔵',
        color: 'indigo',
        description: 'Browse all available service providers for your requirement',
        priority: 5
      }
    };

    results.forEach(vendor => {
      const tier = vendor.matchTier || 'all'; // Default to 'all' if no tier
      if (groups[tier]) {
        groups[tier].vendors.push(vendor);
      } else {
        // Fallback to 'all' group if tier doesn't exist
        groups.all.vendors.push(vendor);
      }
    });

    // Filter out empty groups and return in strict priority order
    return Object.entries(groups)
      .filter(([_, group]) => group.vendors.length > 0)
      .sort((a, b) => a[1].priority - b[1].priority)
      .map(([tier, group]) => ({ tier, ...group }));
  };

  // Section Header Component - Exact Reference Image Style
  const SectionHeader = ({ title, subtitle, icon, color, description, count, priority }) => {
    // Emoji icons for each priority level
    const emojiIcons = {
      1: '👑',  // Crown for top vendors
      2: '🔵',  // Blue circle for nearby
      3: '🔵',  // Blue circle for more in city
      4: '🔵'   // Blue circle for nearby cities
    };

    const displayIcon = icon || emojiIcons[priority] || '🔵';

    // Distance filter options for "More Vendors" and "Nearby Cities" sections
    const showDistanceFilters = priority === 3 || priority === 4;
    const distanceOptions = ['5 km', '10 km', '25 km', '50 km'];

    return (
      <div className="mb-6">
        {/* Main Header Row */}
        <div className="flex items-center justify-between gap-4 mb-3">
          {/* Left: Icon + Title + Badge */}
          <div className="flex items-center gap-3">
            {/* Circular Icon Background */}
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center text-xl
              ${priority === 1 ? 'bg-purple-100' : 'bg-blue-100'}
            `}>
              {displayIcon}
            </div>
            
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                
                {/* Top Rated Badge */}
                {priority === 1 && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                    <span>⚡</span>
                    <span>Top Rated</span>
                  </span>
                )}
              </div>
              
              {/* Subtitle/Description */}
              <p className="text-sm text-gray-600 mt-0.5">
                {description}
              </p>
            </div>
          </div>

          {/* Right: Distance Filter Buttons */}
          {showDistanceFilters && (
            <div className="flex items-center gap-2">
              {distanceOptions.map((distance) => (
                <button
                  key={distance}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
                >
                  {distance}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Search Bar - Sticky */}
      <div className="sticky top-16 md:top-20 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="relative">
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 h-12 bg-white border-2 border-gray-300 rounded-lg shadow-md hover:border-gray-400 hover:shadow-lg focus-within:border-gray-500 focus-within:shadow-lg transition-all">
              <Search className="w-5 h-5 text-gray-600 flex-shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What service do you need? (e.g., AC repair, CCTV installation, Electrical maintenance)"
                className="flex-1 text-sm font-semibold placeholder-gray-400 focus:outline-none"
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              />
              {searchContext.category && filterSchema && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold flex-shrink-0">
                  <span>{filterSchema.detectedService?.icon || '🔍'}</span>
                  <span>{filterSchema.detectedService?.name || searchContext.category}</span>
                </div>
              )}
            </div>

            {/* Service Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-300 rounded-lg shadow-xl z-50">
                <div className="p-2">
                  <div className="text-xs font-semibold text-gray-500 uppercase px-3 py-2">
                    Detected Services
                  </div>
                  {suggestions.map(service => (
                    <button
                      key={service.serviceId}
                      onClick={() => handleSuggestionClick(service.serviceId)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-100 active:bg-gray-200 rounded text-left transition-colors"
                    >
                      <span className="text-2xl">{service.icon}</span>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{service.serviceName}</div>
                        <div className="text-xs text-gray-500">Click to load filters</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Active Service Indicator */}
          {activeService && serviceConfig && (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>
                Showing filters for <strong className="text-gray-900">{serviceConfig.serviceName}</strong>
              </span>
              {serviceConfig.budgetRange && (
                <span className="text-gray-500">
                  • Typical budget: ₹{serviceConfig.budgetRange.min.toLocaleString()} - ₹{serviceConfig.budgetRange.max.toLocaleString()}
                  {serviceConfig.budgetRange.unit && ` ${serviceConfig.budgetRange.unit}`}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Left Sidebar - Dynamic Filters */}
          <div className="w-80 flex-shrink-0">
            <div className="sticky top-24">
              {contextLoading ? (
                <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
                  <div className="h-8 bg-gray-200 rounded mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ) : (
                <div>
                  <LocationFilters onChange={({ city, area }) => {
                    // Update context filters when user selects city/area
                    setFilter('city', city || undefined);
                    setFilter('area', area || undefined);
                  }} />

                  <DynamicFilterPanel 
                    filterSchema={filterSchema}
                    appliedFilters={appliedFilters}
                    onFilterChange={setFilter}
                    onClearAll={clearAllFilters}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Content - Results */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {loading ? 'Searching...' : `${results.length} Results Found`}
                  </h2>
                  {appliedFilters.city && (
                    <p className="text-sm text-gray-600 mt-1">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      {appliedFilters.city}
                      {appliedFilters.area && `, ${appliedFilters.area}`}
                      {appliedFilters.radius && appliedFilters.radius !== 'city' && ` (Within ${appliedFilters.radius}km)`}
                      {appliedFilters.radius === 'city' && ' (Entire City)'}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {/* View Mode Toggle */}
                  <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('solutions')}
                      className={`px-3 py-1.5 text-sm font-medium rounded flex items-center gap-1 ${
                        viewMode === 'solutions'
                          ? 'bg-white text-indigo-600 shadow-sm'
                          : 'text-gray-600'
                      }`}
                    >
                      <Package className="w-4 h-4" />
                      Solutions
                    </button>
                    <button
                      onClick={() => setViewMode('vendors')}
                      className={`px-3 py-1.5 text-sm font-medium rounded flex items-center gap-1 ${
                        viewMode === 'vendors'
                          ? 'bg-white text-indigo-600 shadow-sm'
                          : 'text-gray-600'
                      }`}
                    >
                      <List className="w-4 h-4" />
                      Service Providers
                    </button>
                  </div>

                  {/* Sort */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="rating">Rating</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="distance">Distance</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Results Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
                    <div className="h-6 bg-gray-200 rounded mb-3"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Results Found</h3>
                <p className="text-gray-600 mb-6">
                  {!activeService
                    ? 'Try searching for a specific service like "Photographer", "Tent", or "Pandit"'
                    : !filterValues.city
                    ? 'Please select a location in the filters to see results'
                    : 'Try adjusting your filters or search in a wider area'}
                </p>
                {activeService && serviceConfig && (
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                    <span>{serviceConfig.icon}</span>
                    <span>Currently searching for: <strong>{serviceConfig.serviceName}</strong></span>
                  </div>
                )}
              </div>
            ) : (
              /* Tier-based Results Display - Reference Image Style */
              <div className="space-y-10">
                {groupVendorsByTier().map((group, index) => (
                  <div 
                    key={group.tier}
                    className={`
                      ${index > 0 ? 'pt-6' : ''}
                    `}
                  >
                    <SectionHeader 
                      title={group.title}
                      subtitle={group.subtitle}
                      icon={group.icon}
                      color={group.color}
                      description={group.description}
                      count={group.vendors.length}
                      priority={group.priority}
                    />
                    
                    {/* Vendor Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {group.vendors.map((vendor, idx) => (
                        <VendorCard 
                          key={vendor._id || idx} 
                          vendor={vendor}
                          sectionLabel={group.subtitle}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Wrapper with ServiceProvider
 */
const DynamicSearchPage = () => {
  return (
    <ServiceProvider>
      <DynamicSearchPageContent />
    </ServiceProvider>
  );
};

export default DynamicSearchPage;
