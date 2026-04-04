import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, BadgeCheck, FolderKanban, HeartHandshake, Headphones } from 'lucide-react';
import PremiumButton from './PremiumButton';
import PremiumBadge from './PremiumBadge';

const HeroSection = () => {
  const navigate = useNavigate();

  const handleStartPlanning = () => {
    const searchSection = document.getElementById('service-search');
    if (searchSection) {
      searchSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleHowItWorks = () => {
    navigate('/how-it-works');
  };

  return (
    <section className="relative bg-premium-bgMain pt-6 pb-24 md:pt-8 md:pb-32 overflow-hidden">
      {/* Background Decorative Elements - Premium theme */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-5"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-8">
          {/* Badge */}
          <div className="flex justify-center">
            <PremiumBadge icon={Sparkles}>
              Premium Managed Services
            </PremiumBadge>
          </div>

          {/* Main Headline */}
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-[#1e2636] leading-tight">
            Find Your Perfect Service —{' '}
            <span className="bg-gradient-to-r from-[#1f3c5d] to-[#24496f] bg-clip-text text-transparent">
              Within Your Budget & Location
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-lg sm:text-xl md:text-2xl text-[#596274] max-w-4xl mx-auto leading-relaxed">
            Discover trusted professionals for every service need — fully managed by{' '}
            <span className="font-semibold text-[#24496f]">SureService experts</span>.
            <br className="hidden sm:block" />
            No spam calls. No hassle. Just professional service delivery.
          </p>

          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-5 text-sm md:text-base">
            <div className="flex items-center space-x-2 rounded-full border border-[var(--premium-border)] bg-[#f8fbff] px-4 py-2 shadow-premium-sm">
              <div className="w-2 h-2 bg-premium-blue rounded-full animate-pulse"></div>
              <span className="text-[#273146] font-medium">Verified Service Providers</span>
            </div>
            <div className="flex items-center space-x-2 rounded-full border border-[var(--premium-border)] bg-[#f8fbff] px-4 py-2 shadow-premium-sm">
              <div className="w-2 h-2 bg-premium-blue rounded-full animate-pulse"></div>
              <span className="text-[#273146] font-medium">Budget-Based Discovery</span>
            </div>
            <div className="flex items-center space-x-2 rounded-full border border-[var(--premium-border)] bg-[#f8fbff] px-4 py-2 shadow-premium-sm">
              <div className="w-2 h-2 bg-premium-blue rounded-full animate-pulse"></div>
              <span className="text-[#273146] font-medium">Single Point of Contact</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <PremiumButton 
              onClick={handleStartPlanning}
              size="lg"
              fullWidth={window.innerWidth < 640}
              icon={ArrowRight}
            >
              Start Planning
            </PremiumButton>
            <PremiumButton 
              onClick={handleHowItWorks}
              variant="secondary"
              size="lg"
              fullWidth={window.innerWidth < 640}
            >
              See How It Works
            </PremiumButton>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 pt-10 max-w-5xl mx-auto w-full">
            <div className="text-center min-w-0 rounded-3xl border border-[var(--premium-border)] bg-[#f8fbff] px-3 py-5 shadow-premium-sm">
              <BadgeCheck className="mx-auto mb-2 h-8 w-8 text-premium-blue" />
              <div className="text-lg md:text-xl font-bold text-[#1f3c5d] leading-tight">Verified Professionals</div>
              <div className="text-xs md:text-sm text-premium-textSecondary">Growing daily</div>
            </div>
            <div className="text-center min-w-0 rounded-3xl border border-[var(--premium-border)] bg-[#f8fbff] px-3 py-5 shadow-premium-sm">
              <FolderKanban className="mx-auto mb-2 h-8 w-8 text-premium-blue" />
              <div className="text-lg md:text-xl font-bold text-[#2f4f73] leading-tight">Services Managed</div>
              <div className="text-xs md:text-sm text-premium-textSecondary">Across categories</div>
            </div>
            <div className="text-center min-w-0 rounded-3xl border border-[var(--premium-border)] bg-[#f8fbff] px-3 py-5 shadow-premium-sm">
              <HeartHandshake className="mx-auto mb-2 h-8 w-8 text-premium-blue" />
              <div className="text-lg md:text-xl font-bold text-[#1f3c5d] leading-tight">Customer Satisfaction</div>
              <div className="text-xs md:text-sm text-premium-textSecondary">Always a priority</div>
            </div>
            <div className="text-center min-w-0 rounded-3xl border border-[var(--premium-border)] bg-[#f8fbff] px-3 py-5 shadow-premium-sm">
              <Headphones className="mx-auto mb-2 h-8 w-8 text-premium-blue" />
              <div className="text-lg md:text-xl font-bold text-[#2f4f73] leading-tight">Responsive Support</div>
              <div className="text-xs md:text-sm text-premium-textSecondary">Quick assistance</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
