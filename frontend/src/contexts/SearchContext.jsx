import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const SearchContext = createContext();

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within SearchProvider');
  }
  return context;
};

export const SearchProvider = ({ children }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Search and Location State
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCity, setSelectedCity] = useState(searchParams.get('cityName') || '');
  const [selectedArea, setSelectedArea] = useState(searchParams.get('area') || '');
  const [location, setLocation] = useState(searchParams.get('city') || '');
  const [detailedLocation, setDetailedLocation] = useState({
    city: searchParams.get('cityName') || '',
    area: searchParams.get('area') || '',
    street: searchParams.get('street') || '',
    latitude: searchParams.get('lat') ? parseFloat(searchParams.get('lat')) : null,
    longitude: searchParams.get('lng') ? parseFloat(searchParams.get('lng')) : null,
    fullAddress: ''
  });
  
  // Filter State
  const [filters, setFilters] = useState({
    eventCategory: searchParams.get('category') || '',
    budgetMin: parseInt(searchParams.get('budgetMin')) || 0,
    budgetMax: parseInt(searchParams.get('budgetMax')) || 10000000,
    radius: parseInt(searchParams.get('radius')) || 10,
    rating: searchParams.get('rating') || '',
    verified: searchParams.get('verified') === 'true' ? true : undefined,
    services: []
  });
  
  // UI State
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'relevance');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');
  
  // Update filters with URL sync
  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  // Update multiple filters at once
  const updateFilters = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };
  
  // Clear all filters
  const clearAllFilters = () => {
    const resetFilters = {
      eventCategory: '',
      budgetMin: 0,
      budgetMax: 10000000,
      radius: 10,
      rating: '',
      verified: undefined,
      services: []
    };
    setFilters(resetFilters);
  };

  // Reset all search state (for navigation guard)
  const resetSearchState = () => {
    setSearchQuery('');
    setSelectedCity('');
    setSelectedArea('');
    setLocation('');
    setDetailedLocation({
      city: '',
      area: '',
      street: '',
      latitude: null,
      longitude: null,
      fullAddress: ''
    });
    clearAllFilters();
    setSortBy('relevance');
    setShowSuggestions(false);
    setSuggestions([]);
    setLocationStatus('');
  };
  
  // Update location
  const updateLocation = (city, area) => {
    setSelectedCity(city);
    setSelectedArea(area);
    const locationString = area && city ? `${area}, ${city}` : city;
    setLocation(locationString);
  };
  
  // Update detailed location
  const updateDetailedLocation = (details) => {
    setDetailedLocation(prev => ({ ...prev, ...details }));
    if (details.city) {
      const locationString = details.area && details.city 
        ? `${details.area}, ${details.city}` 
        : details.city;
      setLocation(locationString);
      setSelectedCity(details.city);
      if (details.area) setSelectedArea(details.area);
    }
  };
  
  // Sync with URL params
  const syncWithURL = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (location) params.set('city', location);
    if (selectedCity) params.set('cityName', selectedCity);
    if (selectedArea) params.set('area', selectedArea);
    if (detailedLocation.latitude) params.set('lat', detailedLocation.latitude.toString());
    if (detailedLocation.longitude) params.set('lng', detailedLocation.longitude.toString());
    if (detailedLocation.street) params.set('street', detailedLocation.street);
    if (filters.eventCategory) params.set('category', filters.eventCategory);
    if (filters.budgetMin > 0) params.set('budgetMin', filters.budgetMin.toString());
    if (filters.budgetMax < 10000000) params.set('budgetMax', filters.budgetMax.toString());
    if (filters.radius !== 10) params.set('radius', filters.radius.toString());
    if (filters.rating) params.set('rating', filters.rating);
    if (filters.verified) params.set('verified', 'true');
    if (sortBy && sortBy !== 'relevance') params.set('sort', sortBy);
    
    return params;
  };
  
  // Calculate active filters count
  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'budgetMin' && value === 0) return false;
    if (key === 'budgetMax' && value === 10000000) return false;
    if (key === 'radius' && value === 10) return false;
    if (Array.isArray(value)) return value.length > 0;
    return value && value !== '';
  }).length;
  
  const value = {
    // State
    searchQuery,
    setSearchQuery,
    selectedCity,
    setSelectedCity,
    selectedArea,
    setSelectedArea,
    location,
    setLocation,
    detailedLocation,
    setDetailedLocation,
    filters,
    setFilters,
    sortBy,
    setSortBy,
    showSuggestions,
    setShowSuggestions,
    suggestions,
    setSuggestions,
    isLocating,
    setIsLocating,
    locationStatus,
    setLocationStatus,
    activeFiltersCount,
    
    // Actions
    updateFilter,
    updateFilters,
    clearAllFilters,
    resetSearchState,
    updateLocation,
    updateDetailedLocation,
    syncWithURL
  };
  
  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
};
