import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

/**
 * CityAreaSelector Component
 * 
 * Dropdown selector for cities and areas with autocomplete
 * Uses the location API endpoints to fetch data from OSM database
 * 
 * Usage:
 * <CityAreaSelector 
 *   onSelectionChange={(city, area) => console.log(city, area)}
 *   initialCity="Mumbai"
 *   initialArea="Bandra"
 * />
 */

const CityAreaSelector = ({ 
  onSelectionChange, 
  initialCity = '', 
  initialArea = '',
  required = false,
  className = ''
}) => {
  // State
  const [citySearchTerm, setCitySearchTerm] = useState(initialCity);
  const [areaSearchTerm, setAreaSearchTerm] = useState(initialArea);
  const [cities, setCities] = useState([]);
  const [areas, setAreas] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Debounce timer
  const [cityDebounce, setCityDebounce] = useState(null);
  const [areaDebounce, setAreaDebounce] = useState(null);

  /**
   * Search cities by name
   */
  const searchCities = useCallback(async (searchTerm) => {
    if (!searchTerm || searchTerm.length < 2) {
      setCities([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get('/api/locations/cities/search', {
        params: { q: searchTerm, limit: 20 }
      });

      if (response.data.success) {
        setCities(response.data.data);
      }
    } catch (err) {
      console.error('Error searching cities:', err);
      setError('Failed to search cities');
      setCities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Search areas within selected city
   */
  const searchAreas = useCallback(async (cityId, searchTerm) => {
    if (!cityId || !searchTerm || searchTerm.length < 2) {
      setAreas([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get('/api/locations/areas/search', {
        params: { cityId, q: searchTerm, limit: 20 }
      });

      if (response.data.success) {
        setAreas(response.data.data);
      }
    } catch (err) {
      console.error('Error searching areas:', err);
      setError('Failed to search areas');
      setAreas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get all areas for a city
   */
  const getAreasForCity = useCallback(async (cityId) => {
    if (!cityId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/locations/cities/${cityId}/areas`, {
        params: { limit: 100 }
      });

      if (response.data.success) {
        setAreas(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching areas:', err);
      setError('Failed to fetch areas');
      setAreas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Handle city input change with debounce
   */
  const handleCityInputChange = (e) => {
    const value = e.target.value;
    setCitySearchTerm(value);
    setShowCityDropdown(true);

    // Clear previous debounce
    if (cityDebounce) clearTimeout(cityDebounce);

    // Set new debounce
    const timeout = setTimeout(() => {
      searchCities(value);
    }, 300); // 300ms delay

    setCityDebounce(timeout);
  };

  /**
   * Handle city selection
   */
  const handleCitySelect = (city) => {
    setSelectedCity(city);
    setCitySearchTerm(city.name);
    setShowCityDropdown(false);
    setCities([]);
    
    // Reset area selection
    setSelectedArea(null);
    setAreaSearchTerm('');
    setAreas([]);

    // Fetch areas for selected city
    getAreasForCity(city.id);

    // Notify parent
    if (onSelectionChange) {
      onSelectionChange(city, null);
    }
  };

  /**
   * Handle area input change with debounce
   */
  const handleAreaInputChange = (e) => {
    const value = e.target.value;
    setAreaSearchTerm(value);
    setShowAreaDropdown(true);

    if (!selectedCity) {
      setError('Please select a city first');
      return;
    }

    // Clear previous debounce
    if (areaDebounce) clearTimeout(areaDebounce);

    // Set new debounce
    const timeout = setTimeout(() => {
      searchAreas(selectedCity.id, value);
    }, 300);

    setAreaDebounce(timeout);
  };

  /**
   * Handle area selection
   */
  const handleAreaSelect = (area) => {
    setSelectedArea(area);
    setAreaSearchTerm(area.name);
    setShowAreaDropdown(false);
    setAreas([]);

    // Notify parent
    if (onSelectionChange) {
      onSelectionChange(selectedCity, area);
    }
  };

  /**
   * Cleanup debounce timers
   */
  useEffect(() => {
    return () => {
      if (cityDebounce) clearTimeout(cityDebounce);
      if (areaDebounce) clearTimeout(areaDebounce);
    };
  }, [cityDebounce, areaDebounce]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">
          {error}
        </div>
      )}

      {/* City Selector */}
      <div className="relative">
        <label className="block text-sm font-semibold text-premium-text mb-1.5">
          City {required && <span className="text-red-500">*</span>}
        </label>
        
        <input
          type="text"
          value={citySearchTerm}
          onChange={handleCityInputChange}
          onFocus={() => setShowCityDropdown(true)}
          onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
          placeholder="Search for a city..."
          className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl bg-white text-premium-text focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          required={required}
        />

        {/* City Dropdown */}
        {showCityDropdown && cities.length > 0 && (
          <div className="absolute z-10 w-full mt-2 bg-white border border-indigo-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
            {cities.map((city) => (
              <div
                key={city.id}
                onClick={() => handleCitySelect(city)}
                className="px-4 py-2.5 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              >
                <div className="font-semibold text-premium-text">{city.name}</div>
                {city.state && (
                  <div className="text-sm text-premium-textSecondary">{city.state}</div>
                )}
                {city.areaCount > 0 && (
                  <div className="text-xs text-[#8d97a7]">
                    {city.areaCount} areas available
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Loading indicator */}
        {loading && showCityDropdown && (
          <div className="absolute right-3 top-9 text-gray-400">
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
      </div>

      {/* Area Selector */}
      <div className="relative">
        <label className="block text-sm font-semibold text-premium-text mb-1.5">
          Area / Suburb {required && <span className="text-red-500">*</span>}
        </label>
        
        <input
          type="text"
          value={areaSearchTerm}
          onChange={handleAreaInputChange}
          onFocus={() => selectedCity && setShowAreaDropdown(true)}
          onBlur={() => setTimeout(() => setShowAreaDropdown(false), 200)}
          placeholder={selectedCity ? "Search for an area..." : "Select a city first"}
          disabled={!selectedCity}
          className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl bg-white text-premium-text focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          required={required}
        />

        {/* Area Dropdown */}
        {showAreaDropdown && areas.length > 0 && (
          <div className="absolute z-10 w-full mt-2 bg-white border border-indigo-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
            {areas.map((area) => (
              <div
                key={area.id}
                onClick={() => handleAreaSelect(area)}
                className="px-4 py-2.5 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              >
                <div className="font-semibold text-premium-text">{area.name}</div>
                {area.placeType && (
                  <div className="text-xs text-premium-textSecondary capitalize">
                    {area.placeType}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Loading indicator */}
        {loading && showAreaDropdown && (
          <div className="absolute right-3 top-9 text-gray-400">
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
      </div>

      {/* Selected Values Display (optional) */}
      {selectedCity && (
        <div className="bg-indigo-50 border border-indigo-100 px-4 py-2.5 rounded-xl text-sm">
          <span className="font-medium text-premium-textSecondary">Selected: </span>
          <span className="text-premium-text font-semibold">
            {selectedArea ? `${selectedArea.name}, ${selectedCity.name}` : selectedCity.name}
          </span>
        </div>
      )}
    </div>
  );
};

export default CityAreaSelector;
