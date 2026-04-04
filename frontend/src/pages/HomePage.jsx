import React from 'react';
import HeroSection from '../components/HeroSection';
import ServiceSearch from '../components/ServiceSearch';
import ServiceCategories from '../components/ServiceCategories';
import HowItWorks from '../components/HowItWorks';
import WhySureService from '../components/WhySureService';
import PopularScenarios from '../components/PopularScenarios';
import VendorCTA from '../components/VendorCTA';

const HomePage = () => {
  return (
    <div className="min-h-screen bg-premium-bgMain">
      {/* Hero Section */}
      <HeroSection />

      {/* Service Search Form */}
      <ServiceSearch />

      {/* Service Categories */}
      <ServiceCategories />

      {/* How It Works */}
      <HowItWorks />

      {/* Why SureService */}
      <WhySureService />

      {/* Social Proof — Testimonials */}
      <PopularScenarios />

      {/* Vendor CTA */}
      <VendorCTA />
    </div>
  );
};

export default HomePage;
