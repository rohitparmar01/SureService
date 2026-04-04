import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Header from './components/Header';
import Footer from './components/Footer';
import VendorLayout from './components/VendorLayout';
import ToastContainer from './components/Toast';
import NotFound from './components/NotFound';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from './components/ProtectedRoute';
import VendorProtectedRoute from './components/VendorProtectedRoute';
import NavigationGuard from './components/NavigationGuard';
import { SearchProvider } from './contexts/SearchContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { VendorAuthProvider, useVendorAuth } from './contexts/VendorAuthContext';

const HomePage = lazy(() => import('./pages/HomePage'));
const SearchResults = lazy(() => import('./pages/SearchResults'));
const SearchResultsFunnel = lazy(() => import('./pages/SearchResultsFunnel'));
const DynamicSearchPage = lazy(() => import('./pages/DynamicSearchPage'));
const SearchServicesPage = lazy(() => import('./pages/SearchServicesPage'));
const VendorRegistrationNew = lazy(() => import('./pages/VendorRegistrationNew'));
const VendorDashboard = lazy(() => import('./pages/VendorDashboard'));
const VendorProfilePage = lazy(() => import('./pages/VendorProfilePage'));
const VendorProfileDashboard = lazy(() => import('./pages/VendorProfileDashboard'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const UserDashboardNew = lazy(() => import('./pages/UserDashboardNew'));
const About = lazy(() => import('./pages/About'));
const HowItWorksPage = lazy(() => import('./pages/HowItWorks'));
const FAQ = lazy(() => import('./pages/FAQ'));
const Contact = lazy(() => import('./pages/Contact'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const CookiePolicy = lazy(() => import('./pages/CookiePolicy'));
const PlansPage = lazy(() => import('./pages/PlansPage'));
const BlogListingPage = lazy(() => import('./pages/BlogListingPage'));
const BlogDetailPage = lazy(() => import('./pages/BlogDetailPage'));
const VendorBlogDetailPage = lazy(() => import('./pages/VendorBlogDetailPage'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VendorSettings = lazy(() => import('./pages/VendorSettings'));
import WhatsAppButton from './components/WhatsAppButton';

const RouteLoader = () => (
  <div className="min-h-[50vh] w-full flex items-center justify-center">
    <div className="h-9 w-9 border-4 border-[var(--premium-border)] border-t-[var(--premium-blue)] rounded-full animate-spin" />
  </div>
);

const withRouteSuspense = (element) => (
  <Suspense fallback={<RouteLoader />}>
    {element}
  </Suspense>
);

// PublicLayout component
const PublicLayout = () => (
  <div className="App min-h-screen flex flex-col">
    <Header />
    <main className="flex-1 page-transition pt-16 sm:pt-20">
      <Routes>
        {/* Public routes */}
        <Route path="/" element={withRouteSuspense(<HomePage />)} />
        <Route path="/search" element={withRouteSuspense(<SearchServicesPage />)} />
        <Route path="/search-funnel" element={withRouteSuspense(<SearchResultsFunnel />)} />
        <Route path="/search-dynamic" element={withRouteSuspense(<DynamicSearchPage />)} />
        <Route path="/search-results" element={withRouteSuspense(<SearchResults />)} />
        <Route path="/about" element={withRouteSuspense(<About />)} />
        <Route path="/how-it-works" element={withRouteSuspense(<HowItWorksPage />)} />
        <Route path="/plans" element={withRouteSuspense(<PlansPage />)} />
        <Route path="/faq" element={withRouteSuspense(<FAQ />)} />
        <Route path="/contact-us" element={withRouteSuspense(<Contact />)} />
        <Route path="/blogs" element={withRouteSuspense(<BlogListingPage />)} />
        <Route path="/blogs/:slug" element={withRouteSuspense(<BlogDetailPage />)} />
        <Route path="/vendor-blogs/:slug" element={withRouteSuspense(<VendorBlogDetailPage />)} />
        <Route path="/privacy-policy" element={withRouteSuspense(<Privacy />)} />
        <Route path="/cookie-policy" element={withRouteSuspense(<CookiePolicy />)} />
        <Route path="/terms-and-conditions" element={withRouteSuspense(<Terms />)} />
        
        {/* Password Reset Routes */}
        <Route path="/forgot-password" element={withRouteSuspense(<ForgotPassword />)} />
        <Route path="/reset-password" element={withRouteSuspense(<ResetPassword />)} />
        
        {/* Public Vendor Registration */}
        <Route path="/vendor-registration" element={withRouteSuspense(<VendorRegistrationNew />)} />
        
        {/* Public Vendor Profile Page */}
        <Route path="/vendor/:vendorId" element={withRouteSuspense(<VendorProfilePage />)} />
        
        {/* Protected User Dashboard */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['user', 'admin']}>
              {withRouteSuspense(<UserDashboardNew />)}
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/user/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['user', 'admin']}>
              {withRouteSuspense(<UserDashboardNew />)}
            </ProtectedRoute>
          } 
        />
        
        {/* Protected Admin Panel */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              {withRouteSuspense(<AdminPanel />)}
            </ProtectedRoute>
          } 
        />
        
        {/* Redirect vendor routes to homepage if not logged in */}
        <Route path="/vendor-dashboard" element={<Navigate to="/" replace />} />
        <Route path="/vendor-profile-dashboard" element={<Navigate to="/" replace />} />
        
        {/* Catch all route - 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </main>
    <Footer />
    <ToastContainer />
    <WhatsAppButton />
  </div>
);

// AppRoutes component
const AppRoutes = () => {
  const { vendor, vendorToken } = useVendorAuth();
  const { user, isAuthenticated } = useAuth();
  const isVendor = !!(vendor && vendorToken);
  const isAdmin = !!(isAuthenticated() && user?.role === 'admin');

  return (
    <>
      <NavigationGuard />
      <ScrollToTop />
      {isVendor ? (
        // Vendor Panel - Isolated Experience
        <Routes>
          <Route element={<VendorLayout />}>
            <Route path="/vendor-dashboard" element={<VendorProtectedRoute>{withRouteSuspense(<VendorDashboard />)}</VendorProtectedRoute>} />
            <Route path="/vendor-profile-dashboard" element={<VendorProtectedRoute>{withRouteSuspense(<VendorProfileDashboard />)}</VendorProtectedRoute>} />
            <Route path="/vendor-settings" element={<VendorProtectedRoute>{withRouteSuspense(<VendorSettings />)}</VendorProtectedRoute>} />
            {/* Redirect all other routes to vendor dashboard */}
            <Route path="*" element={<Navigate to="/vendor-dashboard" replace />} />
          </Route>
        </Routes>
      ) : isAdmin ? (
        // Admin Panel - Strictly isolated from public routes
        <div className="App min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 page-transition pt-16 sm:pt-20">
            <Routes>
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    {withRouteSuspense(<AdminPanel />)}
                  </ProtectedRoute>
                }
              />
              {/* Redirect every other path to admin panel for logged-in admins */}
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </main>
          <ToastContainer />
        </div>
      ) : (
        // Public Site - Customer Experience
        <PublicLayout />
      )}
    </>
  );
};

function App() {
  return (
    <HelmetProvider>
      <Router>
        <AuthProvider>
          <VendorAuthProvider>
            <SearchProvider>
              <AppRoutes />
            </SearchProvider>
          </VendorAuthProvider>
        </AuthProvider>
      </Router>
    </HelmetProvider>
  );
}

export default App;
