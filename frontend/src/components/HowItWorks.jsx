import React from 'react';
import { FileText, Search, Users, CheckCircle } from 'lucide-react';
import SectionContainer from './SectionContainer';
import FeatureCard from './FeatureCard';

const HowItWorks = () => {
  const steps = [
    {
      id: 1,
      icon: FileText,
      title: 'Tell us your service need & budget',
      description: 'Share your service requirements, budget range, and location through our simple form'
    },
    {
      id: 2,
      icon: Search,
      title: 'We shortlist verified service providers',
      description: 'Our AI matches you with verified service providers that fit your requirements perfectly'
    },
    {
      id: 3,
      icon: Users,
      title: 'SureService manages coordination',
      description: 'Your dedicated SureService expert handles all communication and coordination'
    },
    {
      id: 4,
      icon: CheckCircle,
      title: 'Stress-free service execution',
      description: 'Relax while we ensure everything runs smoothly from request to completion'
    }
  ];

  return (
    <SectionContainer id="how-it-works" padding="large">
      {/* Section Header */}
      <div className="text-center mb-16 max-w-3xl mx-auto">
        <h2 className="text-headline-lg text-premium-text mb-4">
          How SureService Works
        </h2>
        <p className="text-subheading text-premium-textSecondary">
          Simple, transparent, and fully managed — that's our promise
        </p>
      </div>

      {/* Steps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((step) => (
          <FeatureCard
            key={step.id}
            icon={step.icon}
            title={step.title}
            description={step.description}
            bgVariant="white"
          />
        ))}
      </div>

      {/* Trust Message */}
      <div className="mt-16 text-center">
        <div className="inline-flex items-center space-x-2 px-6 py-3 bg-premium-bgCard border border-premium-blue/30 rounded-full">
          <CheckCircle className="w-5 h-5 text-premium-blue" />
          <span className="text-premium-text font-semibold">Trusted by 1000+ happy customers</span>
        </div>
      </div>
    </SectionContainer>
  );
};

export default HowItWorks;