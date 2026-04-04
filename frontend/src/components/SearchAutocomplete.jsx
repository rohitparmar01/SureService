/**
 * SEARCH AUTOCOMPLETE COMPONENT
 * 
 * Production-ready live search with:
 * - Debounced API calls (300ms default)
 * - Intelligent keyword highlighting
 * - Keyboard navigation (↑↓ arrows, Enter, Esc)
 * - Edge case handling (empty, loading, no results)
 * - Accessible (ARIA labels, roles)
 * - Mobile-friendly
 * 
 * Usage:
 * <SearchAutocomplete
 *   onSelect={(suggestion) => console.log(suggestion)}
 *   placeholder="Search for services..."
 * />
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2, TrendingUp } from 'lucide-react';
import { fetchAutocomplete } from '../services/autocompleteService';

const SearchAutocomplete = ({
  onSelect,
  onInputChange,
  value = '',  // Add external value prop for controlled input
  placeholder = 'Search for services...',
  debounceMs = 300,
  minChars = 1,
  maxSuggestions = 12,
  className = '',
  inputClassName = '',
  showIcon = true,
  autoFocus = false,
  hideHelperText = false
}) => {
  // Component state
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState(null);

  // Controlled + resilient display:
  // if parent value is temporarily empty/lagging, keep showing typed query.
  const displayValue = value !== undefined && value !== null
    ? (value || query)
    : query;

  // Refs
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const abortControllerRef = useRef(null);

  /**
   * Fetch suggestions from API (debounced)
   */
  const fetchSuggestions = useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.trim().length < minChars) {
      setSuggestions([]);
      setIsLoading(false);
      setIsOpen(false);
      return;
    }

    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const results = await fetchAutocomplete(
        searchQuery.trim(), 
        maxSuggestions,
        abortControllerRef.current.signal
      );
      
      setSuggestions(results || []);
      setIsOpen(results && results.length > 0);
      setSelectedIndex(-1);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Autocomplete error:', err);
        setError('Failed to load suggestions');
        setSuggestions([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [minChars, maxSuggestions]);

  /**
   * Debounced search handler
   */
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    // Notify parent of input change
    if (onInputChange) {
      onInputChange(value);
    }

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, debounceMs);
  };

  /**
   * Handle suggestion selection
   */
  const handleSelect = (suggestion) => {
    setQuery(suggestion.label);
    setIsOpen(false);
    setSuggestions([]);
    setSelectedIndex(-1);

    if (onSelect) {
      onSelect(suggestion);
    }

    // Blur input after selection
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  /**
   * Clear search input
   */
  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    setError(null);

    if (onInputChange) {
      onInputChange('');
    }

    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  /**
   * Keyboard navigation handler
   */
  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Escape') {
        handleClear();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;

      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;

      default:
        break;
    }
  };

  /**
   * Close dropdown when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        inputRef.current &&
        !inputRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Sync internal state when external value prop changes
   * This enables the component to respond to parent state changes (e.g., Clear All)
   */
  useEffect(() => {
    if (value !== undefined && value !== null && value !== query) {
      setQuery(value);
    }
  }, [value]);

  /**
   * Scroll selected item into view
   */
  useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const selectedElement = dropdownRef.current.children[selectedIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }
    }
  }, [selectedIndex]);

  /**
   * Highlight matching text in suggestion
   */
  const highlightMatch = (text, query) => {
    if (!query || !text) return text;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-gray-200 text-gray-900 font-bold">
          {part}
        </mark>
      ) : (
        <span key={index}>{part}</span>
      )
    );
  };

  /**
   * Get type badge styling
   */
  const getTypeBadge = (type) => {
    const styles = {
      service: 'bg-gray-200 text-gray-800 border-gray-300',
      subcategory: 'bg-gray-200 text-gray-700 border-gray-300',
      category: 'bg-gray-200 text-gray-800 border-gray-300'
    };

    return (
      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${styles[type] || styles.service}`}>
        {type}
      </span>
    );
  };

  return (
    <div className={`relative w-full ${className}`}>
      {/* Search Input */}
      <div className="relative flex items-center h-full">
        {showIcon && (
          <Search className="absolute left-4 w-5 h-5 text-gray-600 pointer-events-none" />
        )}
        
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`
            w-full h-full
            ${showIcon ? 'pl-12 pr-4' : 'px-4'}
            border-0 focus:outline-none
            placeholder-gray-400 text-gray-900 font-semibold
            bg-transparent
            text-sm
            ${inputClassName}
          `}
          aria-label="Search input"
          aria-autocomplete="list"
          aria-controls="autocomplete-dropdown"
          aria-expanded={isOpen}
          role="combobox"
        />

        {/* Loading Spinner / Clear Button */}
        <div className="absolute right-3">
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          ) : query ? (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Clear search"
              type="button"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          id="autocomplete-dropdown"
          role="listbox"
          className="absolute z-[140] w-full mt-2 bg-white border-2 border-gray-300 rounded-xl shadow-xl max-h-96 overflow-y-auto"
        >
          {/* Loading State */}
          {isLoading && suggestions.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-sm">Searching...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="px-4 py-6 text-center text-red-600">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* No Results */}
          {!isLoading && !error && suggestions.length === 0 && query.trim().length >= minChars && (
            <div className="px-4 py-8 text-center text-gray-500">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No results found</p>
              <p className="text-xs mt-1">Try different keywords</p>
            </div>
          )}

          {/* Suggestions List */}
          {!isLoading && !error && suggestions.length > 0 && (
            <>
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.type}-${suggestion.id}`}
                  onClick={() => handleSelect(suggestion)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`
                    w-full px-4 py-3 text-left
                    flex items-center gap-3
                    hover:bg-gray-100 active:bg-gray-200 transition-colors
                    border-b border-gray-100 last:border-b-0
                    ${selectedIndex === index ? 'bg-gray-100' : 'bg-white'}
                  `}
                  role="option"
                  aria-selected={selectedIndex === index}
                  type="button"
                >
                  {/* Icon */}
                  <span className="text-2xl flex-shrink-0">
                    {suggestion.icon || '🔧'}
                  </span>

                  {/* Text Content */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      {highlightMatch(suggestion.label, query)}
                    </div>
                    
                    {suggestion.matchedKeyword && (
                      <div className="text-xs text-gray-600 mt-0.5">
                        Matches: {highlightMatch(suggestion.matchedKeyword, query)}
                      </div>
                    )}
                  </div>

                  {/* Type Badge */}
                  <div className="flex-shrink-0">
                    {getTypeBadge(suggestion.type)}
                  </div>

                  {/* Trending Icon (for high score items) */}
                  {suggestion.score > 80 && (
                    <TrendingUp className="w-4 h-4 text-gray-700 flex-shrink-0" />
                  )}
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {/* Helper Text */}
      {!hideHelperText && !isOpen && !query && (
        <p className="absolute top-full left-0 mt-1 text-xs text-gray-500 whitespace-nowrap">
          Start typing to see suggestions (min {minChars} character{minChars !== 1 ? 's' : ''})
        </p>
      )}
    </div>
  );
};

export default SearchAutocomplete;
