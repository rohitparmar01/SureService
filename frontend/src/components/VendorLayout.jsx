import React, { useEffect, useState, useRef } from 'react';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useVendorAuth } from '../contexts/VendorAuthContext';
import VendorNotifications from './VendorNotifications';
import apiClient from '../services/api';
import { 
  LayoutDashboard, 
  User, 
  LogOut, 
  ChevronDown
} from 'lucide-react';

/**
 * VendorLayout - Dedicated layout for vendor panel
 * Only shows Dashboard and Profile
 * No access to customer pages
 */
const VendorLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { vendor, logoutVendor, updateVendor } = useVendorAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  const headerRef = useRef(null);

  // Redirect if not authenticated
  if (!vendor) {
    return <Navigate to="/" replace />;
  }

  // Update CSS variable for vendor header height so subheaders align correctly
  useEffect(() => {
    const setHeaderHeight = () => {
      const h = headerRef.current ? headerRef.current.offsetHeight : 64;
      document.documentElement.style.setProperty('--vendor-header-height', `${h}px`);
    };

    setHeaderHeight();
    window.addEventListener('resize', setHeaderHeight);
    return () => window.removeEventListener('resize', setHeaderHeight);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const syncVendorProfile = async () => {
      try {
        const response = await apiClient.get('/vendor-profile/profile/me');
        if (!isMounted || !response?.success || !response?.data) return;

        const latestVendor = response.data;
        if (
          latestVendor.profileImage &&
          latestVendor.profileImage !== vendor?.profileImage
        ) {
          updateVendor({ ...vendor, ...latestVendor });
          setAvatarLoadFailed(false);
        }
      } catch (error) {
        // Non-blocking: UI will keep existing vendor details.
      }
    };

    syncVendorProfile();

    return () => {
      isMounted = false;
    };
  }, [vendor?._id]);

  const vendorAvatarUrl = typeof vendor?.profileImage === 'string'
    ? vendor.profileImage.trim()
    : vendor?.profileImage?.url || '';

  const showVendorAvatarImage = Boolean(vendorAvatarUrl) && !avatarLoadFailed;

  const vendorNavItems = [
    { 
      label: 'Dashboard', 
      path: '/vendor-dashboard', 
      icon: LayoutDashboard 
    },
    { 
      label: 'Profile', 
      path: '/vendor-profile-dashboard', 
      icon: User 
    }
  ];

  const handleLogout = () => {
    logoutVendor();
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="vendor-shell panel-theme min-h-screen bg-[var(--premium-bg-main)] flex flex-col text-[var(--premium-ink)]">
      {/* Vendor Header */}
      <header ref={headerRef} className="bg-[var(--premium-bg-elevated)] border-b border-[var(--premium-border)] sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2 sm:gap-3">
            {/* Logo & Brand */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center shadow-premium-sm" style={{ backgroundColor: 'var(--premium-blue)' }}>
                  <span className="text-white font-bold text-xl">S</span>
                </div>
                <div className="min-w-0">
                  <h1 className="text-sm sm:text-lg font-bold font-display text-[var(--premium-ink)] truncate">SureService Vendor Panel</h1>
                  <p className="text-xs text-[var(--premium-ink-soft)] hidden sm:block">Service Management</p>
                </div>
              </div>
            </div>

            {/* Profile & Actions */}
            <div className="flex items-center gap-3">
              {/* Notifications */}
              <VendorNotifications />

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--premium-bg-surface)] transition-colors border border-transparent hover:border-[var(--premium-border)]"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-white flex items-center justify-center text-white font-semibold text-sm ring-1 ring-[var(--premium-border)]">
                    {showVendorAvatarImage ? (
                      <img
                        src={vendorAvatarUrl}
                        alt={vendor.businessName || 'Vendor'}
                        className="w-full h-full object-cover bg-white"
                        onError={() => setAvatarLoadFailed(true)}
                      />
                    ) : (
                      <span className="w-full h-full rounded-full bg-gradient-to-br from-[var(--premium-blue)] to-[var(--premium-gold)] flex items-center justify-center text-white">
                        {vendor.businessName?.[0]?.toUpperCase() || 'V'}
                      </span>
                    )}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-semibold text-[var(--premium-ink)] truncate max-w-[150px]">
                      {vendor.businessName || 'Vendor'}
                    </p>
                    <p className="text-xs text-[var(--premium-ink-soft)]">Vendor Account</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-[var(--premium-ink-soft)] transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {profileMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setProfileMenuOpen(false)}
                    ></div>
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-blue-200 py-2 z-20">
                    <div className="px-4 py-3 border-b border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                      <p className="text-sm font-semibold text-blue-900">
                        {vendor.businessName || 'Vendor'}
                      </p>
                      <p className="text-xs text-blue-600">{vendor.email}</p>
                    </div>
                    
                    {/* Navigation Items */}
                    <div className="py-1">
                      {vendorNavItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);
                        return (
                          <button
                            key={item.path}
                            onClick={() => {
                              navigate(item.path);
                              setProfileMenuOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                              active
                                ? 'bg-blue-50 text-blue-600 font-semibold border-l-4 border-blue-600'
                                : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    
                    <div className="border-t border-blue-200 mt-1 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Simple Footer */}
      <footer className="bg-[var(--premium-bg-elevated)] border-t border-[var(--premium-border)] py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-[var(--premium-ink-soft)]">
            © 2026 SureService. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default VendorLayout;
