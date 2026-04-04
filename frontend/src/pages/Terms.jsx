import React from 'react';
import { FileText, AlertTriangle, CheckCircle, Users, Shield, Gavel } from 'lucide-react';

const Terms = () => {
  const sections = [
    {
      icon: Users,
      title: '1. Nature of Service',
      content: [
        'SureService is an online discovery platform and service-tech search engine',
        'We facilitate a connection between Users (Customers) and Service Providers based on specific preferences, locations, and budget constraints',
        'SureService acts solely as a facilitator/marketplace and is not a service planning agency or direct service provider'
      ]
    },
    {
      icon: CheckCircle,
      title: '2. For Vendors (Service Providers)',
      content: [
        'Accuracy of Information: Service providers are solely responsible for the authenticity of the information, portfolio images, and pricing listed on their profile. Any misrepresentation may lead to immediate account termination',
        'Subscription & Billing: All subscription plans (Starter, Growth, Premium) are pre-paid and non-refundable. Visibility and premium features will be suspended immediately upon the expiry of the subscription',
        'Enquiry Verification: SureService verifies enquiries to the best of its ability to ensure quality. However, SureService does not guarantee that every verified enquiry will result in a confirmed booking or financial transaction',
        'Business Conduct: Service providers are expected to maintain professional standards. SureService reserves the right to ban any provider without a refund if legitimate customer complaints regarding fraud or non-delivery of services are received'
      ]
    },
    {
      icon: Shield,
      title: '3. For Users (Customers)',
      content: [
        'Free Platform Access: The use of the platform to search for and discover service providers is free of charge for customers',
        'Budget Search Disclaimer: The "Budget-Based Search" is based on base prices provided by service providers. Final quotes may vary depending on specific requirements, schedules, and customization',
        'Due Diligence: While SureService verifies provider profiles, users are advised to conduct their own due diligence before making any payments or signing contracts with providers'
      ]
    },
    {
      icon: AlertTriangle,
      title: '4. Booking and Financial Transactions',
      content: [
        'Zero Commission Policy: SureService does not charge any commission on bookings made through the platform',
        'Direct Transactions: All financial dealings, including advance payments and final settlements, occur directly between the Customer and the Service Provider. SureService is not a party to these transactions and shall not be held liable for any payment disputes, refunds, or financial losses'
      ]
    },
    {
      icon: Gavel,
      title: '5. Limitation of Liability',
      content: [
        'SureService shall not be held liable for any deficiency in service, cancellations, delays, or disputes arising between the customer and the service provider',
        'Our liability is limited strictly to the digital platform\'s functionality'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FileText className="w-16 h-16 mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-4">Terms and Conditions - SureService</h1>
          <p className="text-xl mb-4">
            Please read these terms carefully before using our platform. By using our service, you agree to these terms.
          </p>
          <p className="text-sm opacity-90">
            Last Updated: February 2026
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Acceptance - Removed this section */}

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

        {/* Payment Terms - Removed old version */}

        {/* Data Privacy */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Privacy Policy (Essential for App Stores)</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">1. Data Collection</h3>
              <p className="text-gray-600 text-sm">
                We collect minimal personal data required to provide our services, including names, contact numbers, and location data from both users and service providers.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">2. Use of Data</h3>
              <ul className="space-y-1 text-gray-600 text-sm">
                <li>• For Service Providers: Your business details and portfolio are displayed to potential customers</li>
                <li>• For Users: Your contact details are only shared with relevant, verified service providers after our team has confirmed your enquiry to prevent spam</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">3. Data Security</h3>
              <p className="text-gray-600 text-sm">
                SureService employs industry-standard security measures to protect your data from unauthorized access or disclosure. We do not sell your personal data to third-party marketing agencies.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">4. Enquiry Filtration</h3>
              <p className="text-gray-600 text-sm">
                To maintain platform quality, we monitor and verify enquiries. This involves checking the validity of the contact information provided by the user before passing it to the service provider.
              </p>
            </div>
          </div>
        </div>

        {/* Governing Law - Updated */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <div className="flex items-center mb-6">
            <Gavel className="w-8 h-8 text-indigo-600 mr-4" />
            <h2 className="text-2xl font-bold text-gray-900">5. Governing Law</h2>
          </div>
          <p className="text-gray-600 leading-relaxed">
            Any legal disputes related to the platform shall be subject to the exclusive jurisdiction of the courts in India.
          </p>
        </div>

        {/* Contact Information */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            If you have any questions about these Terms and Conditions, please contact us:
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

        {/* Changes Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <h3 className="font-semibold text-yellow-900 mb-2">Changes to Terms</h3>
          <p className="text-yellow-800 text-sm">
            We reserve the right to modify these Terms at any time. We will notify users of significant changes via email or platform notifications. Continued use of our Service after changes constitutes acceptance of the updated Terms.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Terms;