import React from 'react';
import { Shield, Eye, Lock, Users, Database, Mail } from 'lucide-react';

const Privacy = () => {
  const sections = [
    {
      icon: Eye,
      title: 'Information We Collect',
      content: [
        'For Service Providers: Business names, contact persons, phone numbers, email addresses, business addresses, and portfolio images/videos',
        'For Users (Customers): Names, contact numbers, email addresses, and service requirements (location, budget, and schedule)',
        'Technical Data: IP addresses, browser types, and usage patterns through cookies to improve your experience'
      ]
    },
    {
      icon: Lock,
      title: 'How We Use Your Information',
      content: [
        'To Facilitate Connections: We use user data to match customers with the right service providers based on budget and location',
        'Enquiry Verification: To maintain platform quality, our team uses your contact details to verify that an enquiry is genuine before passing it to a service provider',
        'Communication: We use your information to send subscription alerts, service booking notifications, and platform updates',
        'Marketing: With your consent, we may send promotional offers or newsletters'
      ]
    },
    {
      icon: Users,
      title: 'Data Sharing and Disclosure',
      content: [
        'Verified Sharing: A customer\'s contact details are shared only with the specific service providers they have enquired about, and only after SureService has verified the enquiry',
        'No Data Selling: We do not sell, rent, or trade your personal information to third-party marketing companies',
        'Legal Requirements: We may disclose information if required by law or to protect the rights and safety of our users'
      ]
    },
    {
      icon: Database,
      title: 'Data Security',
      content: [
        'We implement industry-standard security measures (such as SSL encryption) to protect your data',
        'However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Shield className="w-16 h-16 mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-4">Privacy Policy - SureService</h1>
          <p className="text-xl mb-4">
            Your privacy is important to us. This policy explains how we collect, use, and protect your information.
          </p>
          <p className="text-sm opacity-90">
            Last Updated: February 2026
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Introduction */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
          <p className="text-gray-600 leading-relaxed">
            SureService ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you visit our website or use our mobile application.
          </p>
        </div>

        {/* Main Sections */}
        {sections.map((section, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm p-8 mb-8">
            <div className="flex items-center mb-6">
              <section.icon className="w-8 h-8 text-indigo-600 mr-4" />
              <h2 className="text-2xl font-bold text-gray-900">{section.title}</h2>
            </div>
            <ul className="space-y-3">
              {section.content.map((item, itemIndex) => (
                <li key={itemIndex} className="flex items-start">
                  <span className="w-2 h-2 bg-indigo-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span className="text-gray-600">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Your Rights */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <div className="flex items-center mb-6">
            <Users className="w-8 h-8 text-indigo-600 mr-4" />
            <h2 className="text-2xl font-bold text-gray-900">6. Your Rights</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Access and Correction</h3>
              <p className="text-gray-600 text-sm">You have the right to access and update your personal or business information at any time through your profile dashboard.</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Data Deletion</h3>
              <p className="text-gray-600 text-sm">You may request the deletion of your account and data by contacting our support team.</p>
            </div>
          </div>
        </div>

        {/* Cookies */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Cookies</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Our website uses cookies to enhance user experience. You can choose to disable cookies through your browser settings, though some features of the site may not function properly.
          </p>
        </div>

        {/* Contact Information */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-8">
          <div className="flex items-center mb-6">
            <Mail className="w-8 h-8 text-indigo-600 mr-4" />
            <h2 className="text-2xl font-bold text-gray-900">9. Contact Us</h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-6">
            If you have any questions about this Privacy Policy, please contact us at:
          </p>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Email</h3>
              <a href="mailto:info@sureservice.com" className="text-indigo-600 hover:text-indigo-700">
                info@sureservice.com
              </a>
            </div>
          </div>
        </div>

        {/* Updates */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mt-8">
          <h3 className="font-semibold text-yellow-900 mb-2">8. Changes to This Policy</h3>
          <p className="text-yellow-800 text-sm">
            SureService reserves the right to update this Privacy Policy. We will notify users of significant changes by posting a notice on our platform.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Privacy;