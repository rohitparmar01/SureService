import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown, User as UserIcon, LogOut, LayoutDashboard, Shield, Sparkles, UserCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useVendorAuth } from '../contexts/VendorAuthContext';

const UnifiedLoginModal = lazy(() => import('./UnifiedLoginModal'));

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [hasOpenedLoginModal, setHasOpenedLoginModal] = useState(false);
  const [loginUserType, setLoginUserType] = useState('user'); // 'user' or 'vendor'
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showVendorMenu, setShowVendorMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, isAdmin } = useAuth();
  const { vendor, vendorToken, setVendor, setVendorToken } = useVendorAuth();
  
  // Check if vendor is logged in
  const isVendor = !!vendor && !!vendorToken;
  const vendorBusinessName = vendor?.businessName || localStorage.getItem('vendorBusinessName');

  // Handle scroll effect
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const nextScrolled = window.scrollY > 10;
        setScrolled((prev) => (prev === nextScrolled ? prev : nextScrolled));
        ticking = false;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Open login modal if redirected from admin panel with query param
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const openLogin = params.get('openLogin');
      if (openLogin && !isAuthenticated()) {
        // open user login modal for admin sign-in
        setLoginUserType('user');
        setShowLoginModal(true);
        setHasOpenedLoginModal(true);
        // remove the query param from URL without reloading
        const newUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, newUrl);
      }
    } catch (e) {
      // ignore
    }
  }, [location.search]);

  const navItems = [
    { name: 'Home', href: '/', showForAdmin: false },
    { name: 'Search Services', href: '/search', showForAdmin: false },
    { name: 'Blog', href: '/blogs', showForAdmin: false },
    { name: 'How It Works', href: '/how-it-works', showForAdmin: false },
    { name: 'FAQ', href: '/faq', showForAdmin: false },
    { name: 'Contact', href: '/contact-us', showForAdmin: false },
    { name: 'Plans', href: '/plans', showForAdmin: false }
  ];

  // Filter nav items based on user role
  const filteredNavItems = (isAuthenticated() && isAdmin()) || isVendor
    ? navItems.filter(item => item.showForAdmin)
    : navItems;

  const isActive = (path) => location.pathname === path;

  const handleUserLoginClick = () => {
    setLoginUserType('user');
    setShowLoginModal(true);
    setHasOpenedLoginModal(true);
    setMobileMenuOpen(false);
  };

  const handleUserLogout = () => {
    logout();
    setShowUserMenu(false);
    setMobileMenuOpen(false);
  };

  const handleUserMenuClick = (path) => {
    navigate(path);
    setShowUserMenu(false);
    setMobileMenuOpen(false);
  };

  const handleVendorLogout = () => {
    // Clear localStorage
    localStorage.removeItem('vendorToken');
    localStorage.removeItem('authToken');
    localStorage.removeItem('vendorId');
    localStorage.removeItem('vendorEmail');
    localStorage.removeItem('vendorBusinessName');
    localStorage.removeItem('vendorData');
    localStorage.removeItem('userRole');
    
    // Update VendorAuthContext state
    setVendor(null);
    setVendorToken(null);
    
    setShowVendorMenu(false);
    setMobileMenuOpen(false);
    navigate('/');
  };

  const handleVendorMenuClick = (path) => {
    navigate(path);
    setShowVendorMenu(false);
    setMobileMenuOpen(false);
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 ${
      scrolled 
        ? 'bg-white/95 backdrop-blur-lg shadow-lg border-b border-gray-200/50' 
        : 'bg-white/90 backdrop-blur-sm shadow-sm border-b border-gray-100'
    }`}>
      <nav className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center group flex-shrink-0 transition-transform hover:scale-105">
            <img 
              src="/logo.png" 
              alt="SureService - Premium Services" 
              className="h-10 sm:h-12 w-auto object-contain"
            />
          </Link>

          {/* Desktop Navigation - Enhanced Design */}
          {filteredNavItems.length > 0 && (
            <div className="hidden lg:flex items-center flex-1 justify-center px-6">
              <div className="flex items-center space-x-2 bg-premium-bgCard/80 backdrop-blur-sm rounded-full px-3 py-2 shadow-inner">
                {filteredNavItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`relative px-4 py-2 rounded-full font-semibold text-sm transition-all duration-300 whitespace-nowrap ${
                      isActive(item.href)
                        ? 'bg-premium-blue text-white shadow-premium scale-105'
                        : 'text-primary-text hover:text-premium-blue hover:bg-white/80 hover:shadow-sm'
                    }`}
                  >
                    {item.name}
                    {isActive(item.href) && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full shadow-lg"></span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Desktop Auth Buttons - Enhanced Design */}
          <div className="hidden lg:flex items-center space-x-3 flex-shrink-0">
            {/* Guest View - Vendor Registration */}
            {!isAuthenticated() && !isVendor && (
              <>
                <Link 
                  to="/vendor-registration"
                  className="group relative px-4 py-2.5 bg-premium-blue text-white font-semibold text-sm rounded-lg overflow-hidden shadow-premium hover:shadow-premium-lg transform hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap"
                >
                  <div className="absolute inset-0 bg-[#1b3958] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <span className="relative flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>Partner</span>
                  </span>
                </Link>
              </>
            )}

            {/* Vendor Profile Menu - Compact */}
            {isVendor ? (
              <div className="relative">
                <button
                  onClick={() => setShowVendorMenu(!showVendorMenu)}
                  className="flex items-center space-x-2 px-2 xl:px-3 py-1.5 xl:py-2 rounded-lg hover:bg-premium-bgCard transition-all duration-200 border border-transparent hover:border-premium-blue/30 shadow-sm hover:shadow-premium-sm"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-premium-blue rounded-full blur opacity-40"></div>
                    <div className="relative w-8 h-8 bg-premium-blue rounded-full flex items-center justify-center shadow-premium">
                      <span className="text-white text-xs font-bold">
                        {vendorBusinessName?.charAt(0).toUpperCase() || 'V'}
                      </span>
                    </div>
                  </div>
                  <div className="text-left hidden xl:block">
                    <p className="text-xs font-bold text-gray-800 truncate max-w-[100px]">{vendorBusinessName || 'Service Provider'}</p>
                    <p className="text-[10px] font-semibold text-premium-blue">
                      Service Provider
                    </p>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${showVendorMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Vendor Dropdown - Enhanced */}
                {showVendorMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-[90]" 
                      onClick={() => setShowVendorMenu(false)}
                    ></div>
                    <div className="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 py-2 z-[100] animate-fadeIn overflow-hidden">
                      
                      <div className="relative overflow-hidden px-4 py-3 border-b border-gray-100">
                        <div className="absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 opacity-10"></div>
                        <p className="relative text-sm font-bold text-gray-900">{vendorBusinessName || 'Service Provider'}</p>
                        <p className="relative text-xs text-gray-600">{localStorage.getItem('vendorEmail')}</p>
                        <span className="relative inline-block mt-1.5 px-2 py-0.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-semibold rounded-full">
                          Service Provider
                        </span>
                      </div>
                      
                      <div className="relative py-1">
                        <button
                          onClick={() => handleVendorMenuClick('/vendor-dashboard')}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 hover:text-purple-600 transition-all"
                        >
                          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                            <LayoutDashboard className="w-4 h-4 text-purple-600" />
                          </div>
                          <span>My Dashboard</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            setShowVendorMenu(false);
                            navigate('/vendor-dashboard');
                            setTimeout(() => {
                              const event = new CustomEvent('changeVendorTab', { detail: 'profile' });
                              window.dispatchEvent(event);
                            }, 100);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 hover:text-purple-600 transition-all"
                        >
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                            <UserCircle className="w-4 h-4 text-indigo-600" />
                          </div>
                          <span>My Profile</span>
                        </button>
                      </div>
                      
                      <div className="relative border-t border-gray-100 mt-1 pt-1">
                        <button
                          onClick={handleVendorLogout}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
                        >
                          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                            <LogOut className="w-4 h-4 text-red-600" />
                          </div>
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : /* User Login/Profile - Compact */
            isAuthenticated() ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 px-2 xl:px-3 py-1.5 xl:py-2 rounded-lg hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200 border border-transparent hover:border-indigo-200 shadow-sm hover:shadow-md"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full blur opacity-40"></div>
                    <div className="relative w-8 h-8 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-md">
                      <span className="text-white text-xs font-bold">
                        {user?.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="text-left hidden xl:block">
                    <p className="text-xs font-bold text-gray-800 truncate max-w-[100px]">{user?.name}</p>
                    {isAdmin() && (
                      <p className="text-[10px] font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        Admin
                      </p>
                    )}
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* User Dropdown - Enhanced */}
                {showUserMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-[90]" 
                      onClick={() => setShowUserMenu(false)}
                    ></div>
                    <div className="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 py-2 z-[100] animate-fadeIn overflow-hidden">
                      
                      <div className="relative overflow-hidden px-4 py-3 border-b border-gray-100">
                        <div className="absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 opacity-10"></div>
                        <p className="relative text-sm font-bold text-gray-900">{user?.name}</p>
                        <p className="relative text-xs text-gray-600">{user?.email}</p>
                        {isAdmin() && (
                          <span className="relative inline-block mt-1.5 px-2 py-0.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-semibold rounded-full">
                            Admin
                          </span>
                        )}
                      </div>
                      
                      <div className="relative py-1">
                        {isAdmin() ? (
                          <button
                            onClick={() => handleUserMenuClick('/admin')}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-600 transition-all"
                          >
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                              <Shield className="w-4 h-4 text-indigo-600" />
                            </div>
                            <span>Admin Panel</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUserMenuClick('/dashboard')}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-600 transition-all"
                          >
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                              <LayoutDashboard className="w-4 h-4 text-indigo-600" />
                            </div>
                            <span>My Dashboard</span>
                          </button>
                        )}
                        
                      </div>
                      
                      <div className="relative border-t border-gray-100 mt-1 pt-1">
                        <button
                          onClick={handleUserLogout}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
                        >
                          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                            <LogOut className="w-4 h-4 text-red-600" />
                          </div>
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={handleUserLoginClick}
                className="group relative flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-indigo-600 text-indigo-600 font-semibold text-sm rounded-lg overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap"
              >
                <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 transition-opacity duration-300"></div>
                  <UserIcon className="w-4 h-4 relative z-20" />
                  <span className="relative z-20">Login</span>
              </button>
            )}
          </div>

          {/* Mobile Menu Button - Compact */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-gray-700 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-200"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu Backdrop */}
        {mobileMenuOpen && (
          <button
            type="button"
            aria-label="Close mobile menu"
            className="lg:hidden fixed inset-0 top-16 sm:top-20 bg-black/20 backdrop-blur-[1px] z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Menu - Enhanced Design */}
        {mobileMenuOpen && (
          <div className="lg:hidden absolute left-0 right-0 top-full z-50 border-t border-gray-100 bg-white/95 backdrop-blur-xl py-4 px-2 space-y-2 animate-fadeIn max-h-[calc(100vh-4rem)] sm:max-h-[calc(100vh-5rem)] overflow-y-auto shadow-xl rounded-b-2xl">
            {filteredNavItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`block px-4 py-3 rounded-xl font-semibold transition-all ${
                  isActive(item.href)
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                    : 'text-gray-700 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-600'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            
            <div className="pt-4 border-t border-gray-100 space-y-3">
              {/* Guest View - Mobile */}
              {!isAuthenticated() && !isVendor && (
                <>
                  <Link 
                    to="/vendor-registration"
                    className="block w-full px-4 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:shadow-xl transition-all text-center shadow-lg"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Sparkles className="w-4 h-4 inline mr-2" />
                    Become a Partner
                  </Link>
                </>
              )}

              {/* Vendor Profile - Mobile */}
              {isVendor ? (
                <>
                  <div className="px-4 py-4 bg-gradient-to-r from-purple-50 via-pink-50 to-rose-50 rounded-xl border-2 border-purple-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-lg">
                          {vendorBusinessName?.charAt(0).toUpperCase() || 'V'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{vendorBusinessName || 'Service Provider'}</p>
                        <p className="text-xs text-gray-600">{localStorage.getItem('vendorEmail')}</p>
                      </div>
                    </div>
                    <span className="inline-block px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-semibold rounded-full">
                      Service Provider Account
                    </span>
                  </div>
                  
                  <button
                    onClick={() => handleVendorMenuClick('/vendor-dashboard')}
                    className="block w-full px-4 py-3 text-left text-gray-700 font-semibold border-2 border-purple-300 rounded-xl hover:bg-purple-50 hover:text-purple-600 transition-all"
                  >
                    <LayoutDashboard className="w-5 h-5 inline mr-3" />
                    My Dashboard
                  </button>
                  
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/vendor-dashboard');
                      setTimeout(() => {
                        const event = new CustomEvent('changeVendorTab', { detail: 'profile' });
                        window.dispatchEvent(event);
                      }, 100);
                    }}
                    className="block w-full px-4 py-3 text-left text-gray-700 font-semibold border-2 border-indigo-300 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                  >
                    <UserCircle className="w-5 h-5 inline mr-3" />
                    My Profile
                  </button>
                  
                  <button
                    onClick={handleVendorLogout}
                    className="block w-full px-4 py-3 text-red-600 font-semibold border-2 border-red-300 rounded-xl hover:bg-red-50 transition-all text-center"
                  >
                    <LogOut className="w-5 h-5 inline mr-2" />
                    Logout
                  </button>
                </>
              ) : /* User Login/Profile - Mobile */
              isAuthenticated() ? (
                <>
                  <div className="px-4 py-4 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-xl border-2 border-indigo-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-lg">
                          {user?.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{user?.name}</p>
                        <p className="text-xs text-gray-600">{user?.email}</p>
                      </div>
                    </div>
                    {isAdmin() && (
                      <span className="inline-block px-3 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-semibold rounded-full">
                        Admin Account
                      </span>
                    )}
                  </div>
                  
                  {isAdmin() ? (
                    <button
                      onClick={() => handleUserMenuClick('/admin')}
                      className="block w-full px-4 py-3 text-left text-gray-700 font-semibold border-2 border-indigo-300 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                    >
                      <Shield className="w-5 h-5 inline mr-3" />
                      Admin Panel
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUserMenuClick('/dashboard')}
                      className="block w-full px-4 py-3 text-left text-gray-700 font-semibold border-2 border-indigo-300 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                    >
                      <LayoutDashboard className="w-5 h-5 inline mr-3" />
                      My Dashboard
                    </button>
                  )}
                  
                  <button
                    onClick={handleUserLogout}
                    className="block w-full px-4 py-3 text-red-600 font-semibold border-2 border-red-300 rounded-xl hover:bg-red-50 transition-all text-center"
                  >
                    <LogOut className="w-5 h-5 inline mr-2" />
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={handleUserLoginClick}
                  className="block w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-xl transition-all text-center shadow-lg"
                >
                  <UserIcon className="w-5 h-5 inline mr-2" />
                  Login
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Unified Login Modal */}
      {hasOpenedLoginModal && (
        <Suspense fallback={null}>
          <UnifiedLoginModal 
            isOpen={showLoginModal}
            onClose={() => setShowLoginModal(false)}
            initialUserType={loginUserType}
          />
        </Suspense>
      )}
    </header>
  );
};

export default Header;
