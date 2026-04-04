import React, { useState } from 'react';
import { useVendorAuth } from '../contexts/VendorAuthContext';
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Bell, 
  CreditCard,
  Shield,
  Eye,
  EyeOff,
  Save
} from 'lucide-react';

/**
 * VendorSettings - Settings page for vendor panel
 */
const VendorSettings = () => {
  const { vendor } = useVendorAuth();
  const [activeSection, setActiveSection] = useState('account');
  const [passwordVisibility, setPasswordVisibility] = useState({
    current: false,
    next: false,
    confirm: false
  });
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [notification, setNotification] = useState(null);

  const sections = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'billing', label: 'Billing', icon: CreditCard }
  ];

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      setNotification({ type: 'error', message: 'Passwords do not match' });
      return;
    }

    // TODO: Implement password change API call
    setNotification({ type: 'success', message: 'Password updated successfully' });
    setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  return (
    <div className="panel-theme vendor-panel vendor-settings-panel min-h-screen bg-[var(--premium-bg-main)] py-6 sm:py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <nav className="space-y-1 lg:space-y-1 flex lg:block gap-2 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`
                        flex-shrink-0 lg:w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap
                        ${activeSection === section.id
                          ? 'bg-[#f7eddc] text-[var(--premium-blue)]'
                          : 'text-gray-600 hover:bg-gray-50'
                        }
                      `}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{section.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {notification && (
                <div className={`
                  mb-6 p-4 rounded-lg
                  ${notification.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}
                `}>
                  {notification.message}
                </div>
              )}

              {/* Account Section */}
              {activeSection === 'account' && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Account Information</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Business Name
                      </label>
                      <input
                        type="text"
                        value={vendor?.businessName || ''}
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={vendor?.email || ''}
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={vendor?.contact?.phone || ''}
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      />
                    </div>
                    <p className="text-sm text-gray-500">
                      Contact support to update your account information
                    </p>
                  </div>
                </div>
              )}

              {/* Security Section */}
              {activeSection === 'security' && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Security Settings</h2>
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={passwordVisibility.current ? 'text' : 'password'}
                          value={formData.currentPassword}
                          onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                          className="w-full px-4 pr-11 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--premium-blue)]"
                          required
                        />
                        <button
                          type="button"
                          className="password-toggle-btn"
                          aria-label={passwordVisibility.current ? 'Hide password' : 'Show password'}
                          onClick={() => setPasswordVisibility((prev) => ({ ...prev, current: !prev.current }))}
                        >
                          {passwordVisibility.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={passwordVisibility.next ? 'text' : 'password'}
                          value={formData.newPassword}
                          onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                          className="w-full px-4 pr-11 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--premium-blue)]"
                          required
                        />
                        <button
                          type="button"
                          className="password-toggle-btn"
                          aria-label={passwordVisibility.next ? 'Hide password' : 'Show password'}
                          onClick={() => setPasswordVisibility((prev) => ({ ...prev, next: !prev.next }))}
                        >
                          {passwordVisibility.next ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={passwordVisibility.confirm ? 'text' : 'password'}
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          className="w-full px-4 pr-11 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--premium-blue)]"
                          required
                        />
                        <button
                          type="button"
                          className="password-toggle-btn"
                          aria-label={passwordVisibility.confirm ? 'Hide password' : 'Show password'}
                          onClick={() => setPasswordVisibility((prev) => ({ ...prev, confirm: !prev.confirm }))}
                        >
                          {passwordVisibility.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-6 py-2 bg-[var(--premium-blue)] text-white rounded-lg hover:bg-[#24496f] transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Update Password
                    </button>
                  </form>
                </div>
              )}

              {/* Notifications Section */}
              {activeSection === 'notifications' && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Notification Preferences</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-gray-200">
                      <div>
                        <p className="font-medium text-gray-900">Email Notifications</p>
                        <p className="text-sm text-gray-500">Receive inquiry updates via email</p>
                      </div>
                      <input type="checkbox" defaultChecked className="rounded" />
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-gray-200">
                      <div>
                        <p className="font-medium text-gray-900">SMS Notifications</p>
                        <p className="text-sm text-gray-500">Get SMS for urgent inquiries</p>
                      </div>
                      <input type="checkbox" className="rounded" />
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-gray-200">
                      <div>
                        <p className="font-medium text-gray-900">Weekly Summary</p>
                        <p className="text-sm text-gray-500">Get weekly performance reports</p>
                      </div>
                      <input type="checkbox" defaultChecked className="rounded" />
                    </div>
                  </div>
                </div>
              )}

              {/* Billing Section */}
              {activeSection === 'billing' && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Billing & Subscription</h2>
                  <div className="space-y-4">
                    <div className="p-4 bg-[#f4e7cf] border border-[#dfc79f] rounded-lg">
                      <p className="font-semibold text-[var(--premium-ink)]">Current Plan: Free</p>
                      <p className="text-sm text-[var(--premium-ink-soft)] mt-1">Upgrade to unlock premium features</p>
                    </div>
                    <button className="px-6 py-2 bg-[var(--premium-blue)] text-white rounded-lg hover:bg-[#24496f] transition-colors">
                      Upgrade Plan
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorSettings;
