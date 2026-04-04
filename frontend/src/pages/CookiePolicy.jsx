import React from 'react';
import { Cookie, Settings, BarChart3, Target, Shield, Mail } from 'lucide-react';

const CookiePolicy = () => {
  const cookieTypes = [
    {
      icon: Shield,
      title: 'Essential Cookies',
      description: 'These are necessary for the website to function properly (login, security, navigation).',
      color: 'text-indigo-600'
    },
    {
      icon: BarChart3,
      title: 'Performance & Analytics Cookies',
      description: 'These help us understand how users interact with our platform (pages visited, time spent, etc.).',
      color: 'text-indigo-600'
    },
    {
      icon: Settings,
      title: 'Functional Cookies',
      description: 'These remember your preferences such as selected city, service type, and budget range.',
      color: 'text-indigo-600'
    },
    {
      icon: Target,
      title: 'Marketing Cookies',
      description: 'Used to deliver relevant advertisements and measure campaign performance.',
      color: 'text-indigo-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Cookie className="w-16 h-16 mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-4">Cookie Policy</h1>
          <p className="text-xl mb-4">
            SureService
          </p>
          <p className="text-sm opacity-90">
            Effective Date: February 14, 2026
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Introduction */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            This Cookie Policy explains how SureService ("we", "our", "us") uses cookies and similar technologies when you visit our website and mobile application.
          </p>
          <p className="text-gray-600 leading-relaxed">
            By using our platform, you consent to the use of cookies in accordance with this policy.
          </p>
        </div>

        {/* What Are Cookies */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">2. What Are Cookies?</h2>
          <p className="text-gray-600 leading-relaxed">
            Cookies are small text files stored on your device (computer, mobile, tablet) when you visit a website. They help improve user experience, remember preferences, and analyze website performance.
          </p>
        </div>

        {/* How We Use Cookies */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Use Cookies</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            SureService uses cookies to:
          </p>
          <ul className="space-y-3">
            <li className="flex items-start">
              <span className="w-2 h-2 bg-indigo-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span className="text-gray-600">Improve website functionality</span>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-indigo-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span className="text-gray-600">Remember user preferences (city, service category, filters)</span>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-indigo-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span className="text-gray-600">Analyze traffic and user behavior</span>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-indigo-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span className="text-gray-600">Enhance security and prevent fraud</span>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-indigo-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span className="text-gray-600">Improve marketing and advertising performance</span>
            </li>
          </ul>
        </div>

        {/* Types of Cookies */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">4. Types of Cookies We Use</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cookieTypes.map((type, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-4">
                  <type.icon className={`w-8 h-8 ${type.color} mr-3`} />
                  <h3 className="font-semibold text-gray-900">{type.title}</h3>
                </div>
                <p className="text-gray-600 text-sm">{type.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Third-Party Cookies */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Third-Party Cookies</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            We may use third-party services such as:
          </p>
          <ul className="space-y-3 mb-4">
            <li className="flex items-start">
              <span className="w-2 h-2 bg-indigo-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span className="text-gray-600"><strong>Google Analytics</strong> – for traffic analysis</span>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-indigo-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span className="text-gray-600"><strong>Meta Platforms</strong> – for advertising and remarketing</span>
            </li>
          </ul>
          <p className="text-gray-600 leading-relaxed">
            These third parties may store cookies on your device according to their own privacy policies.
          </p>
        </div>

        {/* Managing Cookies */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Managing Cookies</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            You can control or disable cookies through your browser settings. However, disabling essential cookies may affect platform functionality.
          </p>
          <p className="text-gray-600 leading-relaxed mb-4">
            Most browsers allow you to:
          </p>
          <ul className="space-y-3">
            <li className="flex items-start">
              <span className="w-2 h-2 bg-indigo-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span className="text-gray-600">Delete stored cookies</span>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-indigo-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span className="text-gray-600">Block cookies</span>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-indigo-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span className="text-gray-600">Receive alerts before cookies are stored</span>
            </li>
          </ul>
        </div>

        {/* Updates */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Updates to This Policy</h2>
          <p className="text-gray-600 leading-relaxed">
            We may update this Cookie Policy from time to time. Changes will be posted on this page with an updated effective date.
          </p>
        </div>

        {/* Contact Us */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-8">
          <div className="flex items-center mb-4">
            <Mail className="w-8 h-8 text-indigo-600 mr-4" />
            <h2 className="text-2xl font-bold text-gray-900">8. Contact Us</h2>
          </div>
          <p className="text-gray-600 leading-relaxed">
            If you have any questions regarding this Cookie Policy, you may contact us at:
          </p>
          <a href="mailto:info@sureservice.com" className="inline-block mt-4 text-indigo-600 hover:text-indigo-700 font-semibold">
            info@sureservice.com
          </a>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicy;
