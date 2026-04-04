import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, Filter, Trash2 } from 'lucide-react';
import {
  toggleFilter,
  setSingleFilter,
  setBudgetFilter,
  getActiveFilterCount,
  clearAllFilters,
  calculateFilterCounts
} from '../utils/filterUtils';
import '../components/FilterPanel.css';

/**
 * MARKETPLACE-GRADE FILTER PANEL
 * 
 * Context-aware filters that work ONLY on current search results.
 * NO new API calls - filters apply in-memory.
 * 
 * Similar to Flipkart/Amazon left sidebar filters.
 */
const MarketplaceFilterPanel = ({ 
  availableFilters = {}, 
  vendors = [],
  activeFilters = {},
  onFilterChange,
  onClearAll,
  className = ''
}) => {
  const [expandedGroups, setExpandedGroups] = useState({
    services: true,
    budget: true,
    cities: false,
    areas: false,
    rating: false,
    verified: false
  });

  const [filterCounts, setFilterCounts] = useState({});

  // Calculate counts for each filter option
  useEffect(() => {
    if (vendors && availableFilters) {
      const counts = calculateFilterCounts(vendors, availableFilters, activeFilters);
      setFilterCounts(counts);
    }
  }, [vendors, availableFilters, activeFilters]);

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const handleToggleFilter = (filterType, value) => {
    const newFilters = toggleFilter(activeFilters, filterType, value);
    onFilterChange(newFilters);
  };

  const handleSingleFilter = (filterType, value) => {
    const newFilters = setSingleFilter(activeFilters, filterType, value);
    onFilterChange(newFilters);
  };

  const handleBudgetFilter = (min, max) => {
    const newFilters = setBudgetFilter(activeFilters, min, max);
    onFilterChange(newFilters);
  };

  const handleClearAll = () => {
    const emptyFilters = clearAllFilters();
    onClearAll(emptyFilters);
  };

  const activeCount = getActiveFilterCount(activeFilters);

  // Hide filter panel if no filters available
  if (!availableFilters || Object.keys(availableFilters).length === 0) {
    return null;
  }

  return (
    <div className={`filter-panel ${className}`}>
      {/* Header */}
      <div className="filter-panel-header">
        <div className="filter-header-title">
          <Filter className="filter-icon" size={20} />
          <h3>Filters</h3>
          {activeCount > 0 && (
            <span className="filter-badge">{activeCount}</span>
          )}
        </div>
        
        {activeCount > 0 && (
          <button 
            onClick={handleClearAll}
            className="clear-all-btn"
            title="Clear all filters"
          >
            <Trash2 size={16} />
            Clear All
          </button>
        )}
      </div>

      {/* Services Filter */}
      {availableFilters.services && availableFilters.services.length > 0 && (
        <FilterGroup
          title="Services"
          count={availableFilters.services.length}
          isExpanded={expandedGroups.services}
          onToggle={() => toggleGroup('services')}
        >
          <div className="filter-options">
            {availableFilters.services.map(service => {
              const isActive = activeFilters.services?.includes(service.taxonomyId);
              const countKey = `services_${service.taxonomyId}`;
              const count = filterCounts[countKey];
              
              // Hide if count is 0 and not already selected
              if (count === 0 && !isActive) return null;
              
              return (
                <label key={service.taxonomyId} className="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={() => handleToggleFilter('services', service.taxonomyId)}
                  />
                  <span className="filter-label">
                    {service.icon && <span className="filter-icon">{service.icon}</span>}
                    {service.name}
                    {count !== undefined && <span className="filter-count">({count})</span>}
                  </span>
                </label>
              );
            })}
          </div>
        </FilterGroup>
      )}

      {/* Budget Filter */}
      {availableFilters.budget?.ranges && availableFilters.budget.ranges.length > 0 && (
        <FilterGroup
          title="Budget"
          count={availableFilters.budget.ranges.length}
          isExpanded={expandedGroups.budget}
          onToggle={() => toggleGroup('budget')}
        >
          <div className="filter-options">
            {availableFilters.budget.ranges.map((range, index) => {
              const isActive = 
                activeFilters.budget?.min === range.min && 
                activeFilters.budget?.max === range.max;
              const countKey = `budget_${index}`;
              const count = filterCounts[countKey];
              
              if (count === 0 && !isActive) return null;
              
              return (
                <label key={index} className="filter-radio">
                  <input
                    type="radio"
                    name="budget"
                    checked={isActive}
                    onChange={() => handleBudgetFilter(range.min, range.max)}
                  />
                  <span className="filter-label">
                    {range.label}
                    {count !== undefined && <span className="filter-count">({count})</span>}
                  </span>
                </label>
              );
            })}
          </div>
        </FilterGroup>
      )}

      {/* Cities Filter */}
      {availableFilters.cities && availableFilters.cities.length > 0 && (
        <FilterGroup
          title="Cities"
          count={availableFilters.cities.length}
          isExpanded={expandedGroups.cities}
          onToggle={() => toggleGroup('cities')}
        >
          <div className="filter-options">
            {availableFilters.cities.map(city => {
              const isActive = activeFilters.cities?.includes(city.value);
              const countKey = `cities_${city.value}`;
              const count = filterCounts[countKey];
              
              if (count === 0 && !isActive) return null;
              
              return (
                <label key={city.value} className="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={() => handleToggleFilter('cities', city.value)}
                  />
                  <span className="filter-label">
                    {city.value}
                    {count !== undefined && <span className="filter-count">({count})</span>}
                  </span>
                </label>
              );
            })}
          </div>
        </FilterGroup>
      )}

      {/* Areas Filter */}
      {availableFilters.areas && availableFilters.areas.length > 0 && (
        <FilterGroup
          title="Areas"
          count={availableFilters.areas.length}
          isExpanded={expandedGroups.areas}
          onToggle={() => toggleGroup('areas')}
        >
          <div className="filter-options">
            {availableFilters.areas.slice(0, 10).map(area => {
              const isActive = activeFilters.areas?.includes(area.value);
              const countKey = `areas_${area.value}`;
              const count = filterCounts[countKey];
              
              if (count === 0 && !isActive) return null;
              
              return (
                <label key={area.value} className="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={() => handleToggleFilter('areas', area.value)}
                  />
                  <span className="filter-label">
                    {area.value}
                    {count !== undefined && <span className="filter-count">({count})</span>}
                  </span>
                </label>
              );
            })}
          </div>
        </FilterGroup>
      )}

      {/* Rating Filter */}
      {availableFilters.rating && availableFilters.rating.length > 0 && (
        <FilterGroup
          title="Rating"
          count={availableFilters.rating.length}
          isExpanded={expandedGroups.rating}
          onToggle={() => toggleGroup('rating')}
        >
          <div className="filter-options">
            {availableFilters.rating.map(rating => {
              const isActive = activeFilters.rating === rating.value;
              const countKey = `rating_${rating.value}`;
              const count = filterCounts[countKey];
              
              if (count === 0 && !isActive) return null;
              
              return (
                <label key={rating.value} className="filter-radio">
                  <input
                    type="radio"
                    name="rating"
                    checked={isActive}
                    onChange={() => handleSingleFilter('rating', rating.value)}
                  />
                  <span className="filter-label">
                    {rating.label}
                    {count !== undefined && <span className="filter-count">({count})</span>}
                  </span>
                </label>
              );
            })}
          </div>
        </FilterGroup>
      )}

      {/* Verified Filter */}
      {availableFilters.verified && (
        <FilterGroup
          title="Verified Only"
          isExpanded={expandedGroups.verified}
          onToggle={() => toggleGroup('verified')}
        >
          <div className="filter-options">
            <label className="filter-checkbox">
              <input
                type="checkbox"
                checked={activeFilters.verified === true}
                onChange={() => handleSingleFilter('verified', !activeFilters.verified ? true : undefined)}
              />
              <span className="filter-label">
                Show verified vendors only
              </span>
            </label>
          </div>
        </FilterGroup>
      )}
    </div>
  );
};

/**
 * Collapsible filter group component
 */
const FilterGroup = ({ title, count, isExpanded, onToggle, children }) => {
  return (
    <div className="filter-group">
      <button
        className="filter-group-header"
        onClick={onToggle}
      >
        <span className="filter-group-title">
          {title}
          {count !== undefined && <span className="filter-group-count">({count})</span>}
        </span>
        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      
      {isExpanded && (
        <div className="filter-group-content">
          {children}
        </div>
      )}
    </div>
  );
};

export default MarketplaceFilterPanel;
