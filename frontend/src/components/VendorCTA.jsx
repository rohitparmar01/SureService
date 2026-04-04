import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from './Button';
import {
  UserPlus,
  TrendingUp,
  Shield,
  Headphones,
  Users,
  Briefcase,
  Calendar,
  CheckCircle
} from 'lucide-react';

const VendorCTA = () => {
  const navigate = useNavigate();

  const highlights = [
    {
      title: 'Active Service Providers',
      subtitle: 'Expanding network',
      icon: Users,
      iconColor: 'text-indigo-200',
      iconBg: 'bg-indigo-500/20',
      border: 'border-indigo-300/50',
      glow: 'from-indigo-300/35 via-indigo-200/10 to-transparent'
    },
    {
      title: 'Business Enablement',
      subtitle: 'Supporting growth',
      icon: Briefcase,
      iconColor: 'text-fuchsia-200',
      iconBg: 'bg-fuchsia-500/20',
      border: 'border-fuchsia-300/50',
      glow: 'from-fuchsia-300/35 via-fuchsia-200/10 to-transparent'
    },
    {
      title: 'Services Managed',
      subtitle: 'Diverse needs',
      icon: Calendar,
      iconColor: 'text-blue-200',
      iconBg: 'bg-blue-500/20',
      border: 'border-blue-300/50',
      glow: 'from-blue-300/35 via-blue-200/10 to-transparent'
    },
    {
      title: 'Consistent Ratings',
      subtitle: 'Strong trust',
      icon: CheckCircle,
      iconColor: 'text-blue-200',
      iconBg: 'bg-blue-500/20',
      border: 'border-blue-300/50',
      glow: 'from-blue-300/35 via-blue-200/10 to-transparent'
    }
  ];

  const handleRegisterVendor = () => {
    navigate('/vendor-registration');
  };

  const handleLearnMore = () => {
    navigate('/about');
  };

  return (
    <section id="partner" className="py-20 bg-gradient-to-r from-[#1f3c5d] to-[#24496f] relative overflow-hidden">

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-white">
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white text-indigo-600 font-semibold text-sm rounded-full mb-6 border border-indigo-600">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>For Service Providers</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Are you a Service Provider?
            </h2>

            <p className="text-xl text-blue-100 mb-8 leading-relaxed">
              Join India's fastest-growing service management platform. Get verified leads,
              zero spam, and full coordination support — all for free!
            </p>

            {/* Benefits */}
            <div className="space-y-4 mb-8">
              {[
                { icon: Shield, text: 'Free registration for Phase 1' },
                { icon: TrendingUp, text: 'Verified leads matching your budget' },
                { icon: Headphones, text: 'Managed inquiries by SureService team' },
                { icon: UserPlus, text: 'Build your reputation & grow business' }
              ].map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white/8 rounded-lg border border-white/15 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-lg text-blue-100">{benefit.text}</span>
                  </div>
                );
              })}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                variant="outline"
                size="lg"
                className="bg-white text-indigo-600 border-indigo-600 hover:bg-indigo-600 hover:text-white hover:!border-white transition-all duration-200 ease-in-out"
                onClick={handleRegisterVendor}
              >
                Join as Partner
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="bg-white text-indigo-600 border-indigo-600 hover:bg-indigo-600 hover:text-white hover:!border-white transition-all duration-200 ease-in-out"
                onClick={handleLearnMore}
              >
                Learn More
              </Button>
            </div>
          </div>

          {/* Right Image/Graphic */}
          <div className="relative">
            <div className="bg-[#1b3958] rounded-3xl p-8 border border-[#2f5b86]/55 shadow-2xl">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-4">
                {highlights.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.title}
                      className={`group relative overflow-hidden rounded-2xl p-5 md:p-6 border ${item.border} bg-[#24496f] shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-white`}
                    >
                      <div className="relative z-10 flex items-start gap-3 mb-4">
                        <div className={`w-10 h-10 rounded-xl ${item.iconBg} border border-white/20 flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 ${item.iconColor}`} />
                        </div>
                      </div>

                      <div className="relative z-10 text-xl md:text-3xl font-extrabold text-white leading-tight mb-1 drop-shadow-[0_1px_0_rgba(0,0,0,0.15)]">
                        {item.title}
                      </div>
                      <div className="relative z-10 text-sm md:text-base text-blue-100">{item.subtitle}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VendorCTA;
