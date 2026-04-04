import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, MapPin, Grid, List, SlidersHorizontal, ArrowUpDown, Star } from 'lucide-react';
import VendorCard from '../components/VendorCard';
import SolutionCard from '../components/SolutionCard';
import FilterPanel from '../components/FilterPanel';
import Loader, { ContentLoader } from '../components/Loader';
import Button from '../components/Button';
import { fetchVendors } from '../services/api';
import { formatCurrency, formatDistance } from '../utils/format';
import { BUDGET_RANGES } from '../utils/constants';

const SearchResults = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [vendors, setVendors] = useState([]);
  const [solutions, setSolutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalVendors, setTotalVendors] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [viewTab, setViewTab] = useState('vendors'); // 'solutions' or 'vendors'
  const [sortBy, setSortBy] = useState('relevance'); // 'relevance', 'distance', 'budget', 'rating'
  const [tierBreakdown, setTierBreakdown] = useState(null);
  const [searchMetadata, setSearchMetadata] = useState(null);

  // Search filters from URL params (updated for new funnel)
  const [filters, setFilters] = useState({
    eventCategory: searchParams.get('eventCategory') || '',
    eventSubType: searchParams.get('eventSubType') || '', 
    budgetMin: searchParams.get('budgetMin') ? parseInt(searchParams.get('budgetMin')) : null,
    budgetMax: searchParams.get('budgetMax') ? parseInt(searchParams.get('budgetMax')) : null,
    city: searchParams.get('city') || '',
    radius: searchParams.get('radius') ? (searchParams.get('radius') === 'city' ? 'city' : parseInt(searchParams.get('radius'))) : null,
    services: searchParams.getAll('services') || []
  });

  // Detailed location from URL params
  const [detailedLocation, setDetailedLocation] = useState({
    city: searchParams.get('cityName') || '',
    area: searchParams.get('area') || '',
    street: searchParams.get('street') || '',
    latitude: searchParams.get('lat') ? parseFloat(searchParams.get('lat')) : null,
    longitude: searchParams.get('lng') ? parseFloat(searchParams.get('lng')) : null
  });

  // Load vendors based on search criteria
  useEffect(() => {
    loadVendors();
  }, [filters, sortBy]);

  const buildSolutionsFromVendors = (list = []) => {
    return list.slice(0, Math.max(1, Math.min(6, list.length || 3))).map((vendor, idx) => {
      const cost = vendor?.budget?.average || vendor?.pricing?.average || vendor?.estimatedCost || 0;
      const budgetFit = (() => {
        if (!cost) return 'in-range';
        if (filters.budgetMax && cost > filters.budgetMax * 1.1) return 'slightly-above';
        if (filters.budgetMin && cost < filters.budgetMin * 0.9) return 'value';
        return 'in-range';
      })();

      return {
        id: vendor?._id ? `solution-${vendor._id}` : `solution-${idx}`,
        title: `${filters.eventCategory || 'Service'} Solution ${idx + 1}`,
        totalCost: cost,
        distanceKm: vendor?.distance || vendor?.distanceKm,
        radiusOk: filters.radius ? (vendor?.distance || vendor?.distanceKm || 0) <= filters.radius : true,
        budgetFit,
        services: vendor?.services || [
          {
            serviceType: vendor?.category || vendor?.serviceType || 'Core service',
            cost: cost || undefined
          }
        ],
        tags: vendor?.tags || ['Curated', 'Ready to book']
      };
    });
  };

  const loadVendors = async () => {
    try {
      setLoading(true);
      
      // Map filters to the format expected by the API
      const searchFilters = {
        // Map eventCategory/eventSubType to serviceType
        serviceType: filters.eventCategory || filters.eventSubType || undefined,
        query: filters.query || undefined,
        // Location filters
        city: filters.city || detailedLocation.city || undefined,
        area: detailedLocation.area || undefined,
        latitude: detailedLocation.latitude || undefined,
        longitude: detailedLocation.longitude || undefined,
        radius: filters.radius || undefined,
        // Budget filters - only send if user has set them
        budgetMin: filters.budgetMin && filters.budgetMin > 0 ? filters.budgetMin : undefined,
        budgetMax: filters.budgetMax && filters.budgetMax > 0 ? filters.budgetMax : undefined,
        // Other filters
        verified: filters.verified,
        rating: filters.rating,
        sortBy,
        page: 1,
        limit: 20
      };

      const response = await fetchVendors(searchFilters);
      
      // Use only database-driven results - no mock data fallback
      const vendorsList = response.vendors || [];
      
      // Debug: Check if vendors have matchTier
      
      setVendors(vendorsList);
      setTotalVendors(response.total || vendorsList.length);
      setSolutions(buildSolutionsFromVendors(vendorsList));
      
      // Store tier breakdown and metadata for beautiful sections
      setTierBreakdown(response.tierBreakdown || null);
      setSearchMetadata(response.metadata || null);
      
    } catch (error) {
      console.error('❌ Error loading vendors:', error);
      // Show empty state on error - no mock data
      setVendors([]);
      setTotalVendors(0);
      setSolutions([]);
    } finally {
      setLoading(false);
    }
  };

  // Update URL params when filters change
  const updateSearchParams = (newFilters) => {
    const params = new URLSearchParams();
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value && value !== '' && value !== 0) {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, v));
        } else {
          params.set(key, value);
        }
      }
    });
    
    setSearchParams(params);
    setFilters(newFilters);
  };

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    const newFilters = { ...filters, [filterType]: value };
    updateSearchParams(newFilters);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      eventCategory: '',
      eventSubType: '',
      budgetMin: null,
      budgetMax: null,
      city: '',
      radius: null,
      services: []
    });
    setSearchParams(new URLSearchParams());
  };

  // Get current search summary for display
  const getSearchSummary = () => {
    const parts = [];
    
    if (filters.eventCategory) {
      parts.push(filters.eventCategory);
    }
    
    if (filters.eventSubType) {
      parts.push(filters.eventSubType);
    }
    
    if (filters.budgetMin > 0 || filters.budgetMax > 0) {
      const minBudget = filters.budgetMin || 0;
      const maxBudget = filters.budgetMax || '∞';
      parts.push(`Budget: ${formatCurrency(minBudget)} - ${typeof maxBudget === 'number' ? formatCurrency(maxBudget) : maxBudget}`);
    }
    
    if (filters.city) {
      parts.push(`in ${filters.city}`);
    }
    
    return parts.join(' ') || 'All Services';
  };

  // Group vendors by tier - Strict Priority Order
  const groupVendorsByTier = () => {
    // If no vendors, return empty array
    if (!vendors || vendors.length === 0) {
      return [];
    }

    const groups = {
      exact_area: { 
        vendors: [], 
        title: 'Same Area Vendors', 
        subtitle: 'In Your Area',
        icon: '👑', 
        color: 'indigo', 
        description: `Located exactly in ${filters.area || detailedLocation.area || 'your selected area'} and highly rated`,
        priority: 1
      },
      nearby: { 
        vendors: [], 
        title: 'Nearby Vendors', 
        subtitle: 'Nearby',
        icon: '🔵', 
        color: 'blue', 
        description: `Vendors near ${filters.area || detailedLocation.area || filters.city || detailedLocation.city || 'your location'}`,
        priority: 2
      },
      same_city: { 
        vendors: [], 
        title: 'Same City – Other Areas', 
        subtitle: filters.city || detailedLocation.city || 'Same City',
        icon: '🔵', 
        color: 'purple', 
        description: `Other vendors in ${filters.city || detailedLocation.city || 'the same city'}`,
        priority: 3
      },
      adjacent_city: { 
        vendors: [], 
        title: 'Nearby Cities Vendors', 
        subtitle: 'Nearby Cities',
        icon: '🔵', 
        color: 'green', 
        description: 'Vendors from nearby cities within practical distance',
        priority: 4
      },
      all: {
        vendors: [],
        title: 'All Service Providers',
        subtitle: 'Available Providers',
        icon: '🔵',
        color: 'indigo',
        description: 'Browse all available service providers for your needs',
        priority: 5
      }
    };

    vendors.forEach(vendor => {
      const tier = vendor.matchTier || 'all'; // Default to 'all' if no tier
      if (groups[tier]) {
        groups[tier].vendors.push(vendor);
      } else {
        // Fallback to 'all' group if tier doesn't exist
        groups.all.vendors.push(vendor);
      }
    });


    // Filter out empty groups and return in strict priority order
    const result = Object.entries(groups)
      .filter(([_, group]) => group.vendors.length > 0)
      .sort((a, b) => a[1].priority - b[1].priority)
      .map(([tier, group]) => ({ tier, ...group }));
      
    
    return result;
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
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-start sm:justify-end">
              {distanceOptions.map((distance) => (
                <button
                  key={distance}
                  className="px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
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
      {/* Search Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Search Summary */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">
                Search Results
              </h1>
              <p className="text-gray-600 mt-1">
                {getSearchSummary()}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {totalVendors} vendor{totalVendors !== 1 ? 's' : ''} found
              </p>
            </div>

            {/* View Controls */}
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap w-full lg:w-auto">
              <div className="flex rounded-xl border border-gray-300 bg-white w-full sm:w-auto">
                <button
                  onClick={() => setViewTab('solutions')}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-l-xl text-sm font-semibold transition-colors ${
                    viewTab === 'solutions' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Solutions
                </button>
                <button
                  onClick={() => setViewTab('vendors')}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-r-xl text-sm font-semibold transition-colors ${
                    viewTab === 'vendors' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Vendors
                </button>
              </div>

              {/* Sort Dropdown */}
              <div className="relative w-full sm:w-auto">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full sm:min-w-[12.5rem] appearance-none bg-white border border-gray-300 rounded-xl px-4 py-2 pr-8 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="relevance">Sort by Relevance</option>
                  <option value="distance">Sort by Distance</option>
                  <option value="budget">Sort by Budget</option>
                  <option value="rating">Sort by Rating</option>
                </select>
                <ArrowUpDown className="absolute right-2 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              {/* View Mode Toggle */}
              <div className="flex rounded-xl border border-gray-300 bg-white">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-l-xl transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-indigo-50 text-indigo-600' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-r-xl transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-indigo-50 text-indigo-600' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>

              {/* Filter Toggle */}
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Desktop Filter Sidebar */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            <div className="sticky top-8">
              <FilterPanel
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={clearFilters}
                showHeader={false}
              />
            </div>
          </div>

          {/* Mobile Filter Overlay */}
          {showFilters && (
            <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50">
              <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-xl overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold">Filters</h2>
                    <button
                      onClick={() => setShowFilters(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <SlidersHorizontal className="w-5 h-5" />
                    </button>
                  </div>
                  <FilterPanel
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onClearFilters={clearFilters}
                    showHeader={false}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Results Section */}
          <div className="flex-1">
            {loading ? (
              <ContentLoader text="Finding the best vendors for you..." />
            ) : viewTab === 'solutions' ? (
              solutions.length > 0 ? (
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                  {solutions.map((solution) => (
                    <SolutionCard key={solution.id} solution={solution} showDistance={true} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-32 h-32 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                    <Search className="w-16 h-16 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Composing solutions</h3>
                  <p className="text-gray-600 max-w-md mx-auto">We’re assembling packages based on your inputs. Try widening radius or enabling alternatives.</p>
                </div>
              )
            ) : vendors.length > 0 ? (
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
                    <div className={`grid gap-6 ${
                      viewMode === 'grid' 
                        ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' 
                        : 'grid-cols-1'
                    }`}>
                      {group.vendors.map((vendor) => (
                        <VendorCard
                          key={vendor._id}
                          vendor={vendor}
                          variant={viewMode === 'list' ? 'compact' : 'default'}
                          showDistance={true}
                          sectionLabel={group.subtitle}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* No Results */
              <div className="text-center py-12">
                <div className="w-32 h-32 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                  <Search className="w-16 h-16 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No vendors found
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  We couldn't find any vendors matching your criteria. Try adjusting your filters or search terms.
                </p>
                <Button onClick={clearFilters} variant="outline">
                  Clear All Filters
                </Button>
              </div>
            )}

            {/* Load More Button */}
            {vendors.length > 0 && vendors.length < totalVendors && (
              <div className="text-center mt-12">
                <Button
                  onClick={loadVendors}
                  variant="outline"
                  size="lg"
                  loading={loading}
                >
                  Load More Vendors
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchResults;