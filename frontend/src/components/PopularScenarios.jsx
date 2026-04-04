import React from 'react';
import { Quote, Star } from 'lucide-react';

const testimonials = [
  {
    name: 'Rajesh Kumar',
    role: 'Building Manager, Delhi',
    text: 'SureService helped us find reliable HVAC and electrical contractors. The verified network and quick response time saved us significant downtime. Excellent service!',
    rating: 5,
    initials: 'RK',
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    name: 'Priya Sharma',
    role: 'IT Operations Manager',
    text: 'We depend on SureService for all our IT hardware and networking needs. The vetted vendors understand our business requirements perfectly.',
    rating: 5,
    initials: 'PS',
    gradient: 'from-indigo-500 to-purple-500'
  },
  {
    name: 'Vikram Singh',
    role: 'Facility Director',
    text: 'SureService connected us with excellent plumbing and sanitation service providers. Professional, punctual, and cost-effective solutions every time!',
    rating: 5,
    initials: 'VS',
    gradient: 'from-emerald-500 to-teal-500'
  }
];

const SocialProof = () => {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            What Our Clients Say
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Real experiences from people who used our services
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 shadow-sm border border-transparent hover:shadow-md transition-shadow">
              <div className={`w-10 h-10 mb-4 rounded-full bg-premium-blue flex items-center justify-center`}>
                <Quote className="w-5 h-5 text-white" />
              </div>
              <p className="text-premium-textSecondary leading-relaxed mb-6">"{t.text}"</p>
              <div className="flex items-center gap-1 mb-4">
                {[...Array(t.rating)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-blue-500 text-blue-500" />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full bg-premium-blue flex items-center justify-center text-white text-sm font-bold`}>
                  {t.initials}
                </div>
                <div>
                  <div className="font-semibold text-premium-text text-sm">{t.name}</div>
                  <div className="text-xs text-premium-textSecondary">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProof;
