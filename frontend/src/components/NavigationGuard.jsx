import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useSearch } from '../contexts/SearchContext';

/**
 * NavigationGuard Component
 * Handles state cleanup and filter resets on navigation, refresh, and browser back/forward
 * 
 * This component ensures:
 * 1. Filters are cleared when navigating away from search pages
 * 2. State is reset on page refresh
 * 3. Browser back/forward navigation doesn't retain stale state
 * 4. Predictable and clean page initialization
 */
const NavigationGuard = () => {
  const location = useLocation();
  const { resetSearchState } = useSearch();
  const previousPathRef = useRef(location.pathname);
  const isInitialMount = useRef(true);

  // Define which routes should preserve search state
  const SEARCH_ROUTES = [
    '/search',
    '/search-results',
    '/search-funnel',
    '/search-dynamic'
  ];

  // Check if current path is a search route
  const isSearchRoute = (path) => {
    return SEARCH_ROUTES.some(route => path.startsWith(route));
  };

  // Handle navigation changes
  useEffect(() => {
    const currentPath = location.pathname;
    const previousPath = previousPathRef.current;

    // Skip initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      
      // However, if landing on a non-search page, ensure state is clean
      if (!isSearchRoute(currentPath)) {
        resetSearchState();
      }
      
      previousPathRef.current = currentPath;
      return;
    }

    // If navigating away from search routes to non-search routes, clear state
    if (isSearchRoute(previousPath) && !isSearchRoute(currentPath)) {
      resetSearchState();
    }

    // Update previous path reference
    previousPathRef.current = currentPath;
  }, [location.pathname]);

  // Handle page refresh - reset state
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Clear search state from session on page unload
      sessionStorage.removeItem('searchState');
    };

    // On mount, check if this is a fresh page load (not a SPA navigation)
    const isPageRefresh = !window.performance || 
      window.performance.navigation.type === 1 || 
      window.performance.getEntriesByType('navigation')[0]?.type === 'reload';

    if (isPageRefresh && !isSearchRoute(location.pathname)) {
      resetSearchState();
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event) => {
      // If navigating to a non-search page via back/forward, clear filters
      const currentPath = window.location.pathname;
      if (!isSearchRoute(currentPath)) {
        resetSearchState();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // This component doesn't render anything
  return null;
};

export default NavigationGuard;
