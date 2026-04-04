import React from 'react';
import { Shield, MapPin, Award, Users, Phone, Clock } from 'lucide-react';
import FeatureCard from './FeatureCard';
import SectionContainer from './SectionContainer';

const WhySureService = () => {
  const features = [
    {
      icon: MapPin,
      title: 'Budget-Based Discovery',
      description: 'Find service providers that match your exact budget — no hidden costs or surprises'
    },
    {
      icon: Shield,
      title: 'Location-Accurate Results',
      description: 'Get service providers near you with real-time distance calculations'
    },
    {
      icon: Award,
      title: 'Verified Professionals',
      description: 'Every service provider is vetted and approved by our expert team'
    },
    {
      icon: Users,
      title: 'Single Point of Contact',
      description: 'One dedicated SureService expert manages everything for you'
    },
    {
      icon: Phone,
      title: 'No Spam Calls',
      description: 'Your contact details stay private — we handle vendor communication'
    },
    {
      icon: Clock,
      title: '24/7 Expert Support',
      description: 'Round-the-clock assistance whenever you need help'
    }
  ];

  return (
    <SectionContainer background="card" padding="large">
      {/* Section Header */}
      <div className="text-center mb-16 max-w-3xl mx-auto">
        <h2 className="text-headline-lg text-premium-text mb-4">
          Why Choose SureService?
        </h2>
        <p className="text-subheading text-premium-textSecondary">
          We're not just another listing platform — we're your service planning partner with expertise, trust, and convenience
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <FeatureCard
            key={index}
            icon={feature.icon}
            title={feature.title}
            description={feature.description}
            bgVariant="white"
          />
        ))}
      </div>
    </SectionContainer>
  );
};

export default WhySureService;
