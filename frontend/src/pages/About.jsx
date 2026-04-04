import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Target, Award, Heart, CheckCircle, Zap } from 'lucide-react';
import Button from '../components/Button';

const About = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              About SureService
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
              India's premier managed service discovery platform, connecting you with verified service providers for stress-free service planning.
            </p>
          </div>
        </div>
      </div>

      {/* Mission Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="text-center">
            <Target className="w-16 h-16 text-indigo-600 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h3>
            <p className="text-gray-600">
              To revolutionize service planning in India by providing a curated, managed platform that eliminates the hassle of provider discovery and coordination.
            </p>
          </div>
          <div className="text-center">
            <Award className="w-16 h-16 text-indigo-600 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Vision</h3>
            <p className="text-gray-600">
              To become India's most trusted service planning platform, known for quality providers, transparent processes, and exceptional customer experiences.
            </p>
          </div>
          <div className="text-center">
            <Heart className="w-16 h-16 text-indigo-600 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Values</h3>
            <p className="text-gray-600">
              Trust, transparency, quality, and customer-centricity drive everything we do. We believe every service request is important and deserves exceptional care.
            </p>
          </div>
        </div>
      </div>

      {/* Why Choose Us */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose SureService?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We're not just another marketplace. We're your dedicated service planning partner.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: CheckCircle,
                title: 'Verified Providers Only',
                description: 'Every service provider is personally verified by our team for quality, reliability, and professionalism.'
              },
              {
                icon: Users,
                title: 'Managed Service',
                description: 'Our experts handle provider coordination, negotiations, and timeline management for you.'
              },
              {
                icon: Zap,
                title: 'No Spam Calls',
                description: 'Your contact details stay private. Service providers connect through our managed inquiry system only.'
              }
            ].map((feature, index) => (
              <div key={index} className="text-center p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
                <feature.icon className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team Section */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Built with ❤️ in India
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Founded in 2024, SureService is based in Indore, Madhya Pradesh, with plans to expand across major Indian cities.
            </p>
          </div>

          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to Plan Your Perfect Service?
            </h3>
            <p className="text-gray-600 mb-6">
              Join thousands of satisfied customers who trusted us with their service needs.
            </p>
            <Link to="/search">
              <Button size="lg" className="mr-4">
                Start Planning
              </Button>
            </Link>
            <Link to="/vendor-registration">
              <Button variant="outline" size="lg">
                Become a Service Provider
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;