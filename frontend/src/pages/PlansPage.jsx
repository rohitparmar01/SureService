import React, { useState } from 'react';
import { Check, X, Star, Shield, Zap, TrendingUp, Users, Crown, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';

const PlansPage = () => {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState('monthly');
  const yearlyDiscount = 0.17;
  const getYearlyPrice = (monthlyPrice) => Math.round(monthlyPrice * 12 * (1 - yearlyDiscount));

  // Plans array (ids preserved where routing depends on them)
  const plans = [
    {
      id: 'free',
      name: 'Free Plan — Basic Service Provider Listing',
      tagline: 'Entry-level presence — organic discovery',
      icon: Users,
      iconColor: 'text-gray-600',
      bgGradient: 'from-gray-50 to-gray-100',
      borderColor: 'border-gray-200',
      price: 0,
      popular: false,
      features: [
        { text: 'Platform registration', included: true },
        { text: 'Service & city listing', included: true },
        { text: 'Portfolio showcase: Up to 5 images', included: true },
        { text: 'Appears in general search results', included: true },
        { text: 'Discoverable via category & location', included: true },
        { text: 'Verified badge', included: false },
        { text: 'Priority visibility', included: false },
        { text: 'Marketing push', included: false }
      ],
      cta: 'Get Started',
      ctaClass: 'from-amber-500 to-orange-500',
      ctaTextClass: 'text-white',
      description: 'Basic platform presence with organic service discovery.'
    },
    {
      id: 'starter',
      name: 'Starter',
      tagline: 'Verified visibility — entry level',
      icon: Zap,
      iconColor: 'text-blue-600',
      bgGradient: 'from-blue-50 to-indigo-50',
      borderColor: 'border-blue-200',
      price: 499,
      razorpayPlanId: 'plan_SL71J6JDaIhiFK',
      popular: false,
      bonusDays: 30,
      features: [
        { text: '🎁 First 30 days FREE on first purchase', included: true, highlight: true },
        { text: 'Verified service provider badge', included: true },
        { text: 'Portfolio: Up to 15 media files', included: true },
        { text: 'Improved placement in search results', included: true },
        { text: 'Category + location SEO optimization', included: true },
        { text: 'Profile reviewed & managed by SureService team', included: true }
      ],
      cta: 'Start Starter Plan',
      ctaClass: 'from-amber-500 to-orange-500',
      ctaTextClass: 'text-white',
      description: 'Enhanced credibility and improved discoverability. 30 days per purchase — first purchase gets 30 bonus days FREE.'
    },
    {
      id: 'growth',
      name: 'Growth',
      tagline: 'High visibility service provider',
      icon: Star,
      iconColor: 'text-purple-600',
      bgGradient: 'from-purple-50 to-pink-50',
      borderColor: 'border-purple-300',
      price: 999,
      razorpayPlanId: 'plan_SL73GQTdKIm6cg',
      popular: true,
      bonusDays: 30,
      features: [
        { text: '🎁 First 30 days FREE on first purchase', included: true, highlight: true },
        { text: 'Portfolio: Up to 30 media files', included: true },
        { text: 'Everything in Starter', included: true },
        { text: 'Higher ranking in category searches', included: true },
        { text: 'Featured placement in recommended providers', included: true },
        { text: 'Portfolio enhancement', included: true },
        { text: 'Basic social media promotion', included: true }
      ],
      cta: 'Start Growth Plan',
      ctaClass: 'from-amber-500 to-orange-500',
      ctaTextClass: 'text-white',
      description: 'Designed to increase discovery and inbound inquiries. 30 days per purchase — first purchase gets 30 bonus days FREE.',
      badge: 'MOST POPULAR'
    },
    {
      id: 'premium',
      name: 'Premium',
      tagline: 'Maximum visibility & brand push',
      icon: Crown,
      iconColor: 'text-blue-600',
      bgGradient: 'from-blue-50 to-indigo-50',
      borderColor: 'border-blue-200',
      price: 1499,
      razorpayPlanId: 'plan_SL74BmgIUboBiO',
      popular: false,
      bonusDays: 30,
      features: [
        { text: '🎁 First 30 days FREE on first purchase', included: true, highlight: true },
        { text: 'Unlimited media uploads', included: true },
        { text: 'Top-tier visibility in search results', included: true },
        { text: 'Premium verified badge', included: true },
        { text: 'Social media shoutouts & promotions', included: true },
        { text: 'Dedicated profile optimization', included: true },
        { text: 'Priority placement during high-demand searches', included: true }
      ],
      cta: 'Start Premium Plan',
      ctaClass: 'from-amber-500 to-orange-500',
      ctaTextClass: 'text-white',
      description: 'For service providers seeking strong brand presence and maximum reach.',
      badge: 'PREMIUM'
    }
  ];

  const handlePlanSelect = (planId) => {
    if (planId === 'free') {
      navigate('/vendor-registration');
    } else {
      // Redirect to vendor registration with plan info
      navigate(`/vendor-registration?plan=${planId}`);
    }
  };

  const getPriceDisplay = (price) => {
    if (price === 0) return 'Free';
    const effectivePrice = billingCycle === 'yearly' ? getYearlyPrice(price) : price;
    return `₹${effectivePrice.toLocaleString('en-IN')}`;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-[#8a611f] text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Sparkles className="w-16 h-16 mx-auto mb-6" />

          <h1 className="text-4xl font-bold mb-4">
            Service Provider Visibility Plans — Discovery & Growth Model
          </h1>

          <p className="text-xl mb-8 max-w-3xl mx-auto">
            SureService operates as a service discovery platform. Service provider visibility, ranking, and discovery improve based on plan selection and profile optimization. We enable genuine discovery — we do not guarantee leads.
          </p>

          <div className="inline-flex items-center gap-1 p-1 bg-white/15 rounded-full border border-white/30">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${billingCycle === 'monthly' ? 'bg-white text-[#8a611f]' : 'text-white/90'}`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${billingCycle === 'yearly' ? 'bg-white text-[#8a611f]' : 'text-white/90'}`}
            >
              Yearly
            </button>
            <span className="ml-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
              Save 17%
            </span>
          </div>


        </div>
      </div>

      {/* Plans Grid */}
      <div className="max-w-7xl mx-auto px-4 py-12 -mt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 ${
                  plan.popular ? 'transform scale-105 lg:scale-110' : ''
                } ${plan.borderColor}`}
              >
                {/* Popular Badge */}
                {plan.badge && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-4 py-1 rounded-bl-lg">{plan.badge}</div>
                )}

                {/* Plan Header */}
                <div className={`bg-gradient-to-br ${plan.bgGradient} p-6 text-center`}>
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full bg-white shadow-lg mb-4`}>
                    <Icon className={`w-7 h-7 ${plan.iconColor}`} />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">{plan.tagline}</p>

                  {/* Price */}
                  <div className="mb-4">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold text-gray-900">{getPriceDisplay(plan.price)}</span>
                      {plan.price > 0 && <span className="text-gray-600 text-sm">/{billingCycle === 'yearly' ? 'year' : '30 days'}</span>}
                    </div>

                    {plan.price > 0 && billingCycle === 'yearly' && (
                      <p className="text-xs text-green-700 font-semibold mt-1">
                        Monthly equivalent: ₹{Math.round(getYearlyPrice(plan.price) / 12).toLocaleString('en-IN')}/month
                      </p>
                    )}

                    {plan.bonusDays && (
                      <div className="mt-2 inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
                        <Sparkles className="w-3 h-3" />
                        <span>🎁 +{plan.bonusDays} Bonus Days on First Purchase</span>
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-gray-600">{plan.description}</p>
                </div>

                {/* Features List */}
                <div className="p-6">
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        {feature.included ? (
                          <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${feature.highlight ? 'text-purple-600' : 'text-green-600'}`} />
                        ) : (
                          <X className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5" />
                        )}
                        <span className={`text-sm ${feature.included ? 'text-gray-700' : 'text-gray-400'} ${feature.highlight ? 'font-semibold text-purple-700' : ''}`}>{feature.text}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button - unified style (same as Growth plan) */}
                  <button
                    onClick={() => handlePlanSelect(plan.id)}
                    className={`relative w-full py-3 px-6 rounded-lg font-semibold transition-all duration-300 text-center shadow-md overflow-hidden bg-gradient-to-r ${plan.ctaClass} ${plan.ctaTextClass} hover:shadow-lg hover:-translate-y-0.5`}
                  >
                    <span className="relative z-10">{plan.cta}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Important Notes - Discovery Model */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-indigo-600">
          <h3 className="text-lg font-bold mb-2">Important — How SureService Discovery Works</h3>
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-2">
            <li>Service provider contact numbers are not displayed publicly; all inquiries are routed through the SureService platform.</li>
            <li>Lead volume is not guaranteed — SureService enables genuine discovery and improves visibility based on plan level and profile optimization.</li>
            <li>SureService does not sell fake leads or promise guaranteed inquiries.</li>
            <li>Visibility and ranking depend on plan selection and quality of profile optimization.</li>
            <li><strong>Portfolio Limits:</strong> Each plan has specific portfolio limits per service provider profile. File type support for images and videos varies by plan tier.</li>
          </ul>
        </div>
      </div>

      {/* Comparison Table Section */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Compare All Features</h2>
          <p className="text-lg text-gray-600">Find the perfect plan for your business needs</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Feature</th>
                  {plans.map(plan => (
                    <th key={plan.id} className="px-6 py-4 text-center text-sm font-semibold text-gray-900">{plan.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {/* Business listing */}
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-700 font-medium">Business listing</td>
                  <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                </tr>
                {/* Service categories */}
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-700 font-medium">Service categories</td>
                  <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                </tr>
                {/* Image gallery */}
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-700 font-medium">Image gallery</td>
                  <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                </tr>
                {/* Video showcase */}
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-700 font-medium">Video showcase</td>
                  <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-gray-300 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                </tr>
                {/* Lead notifications */}
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-700 font-medium">Lead notifications</td>
                  <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-gray-300 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                </tr>
                {/* Analytics dashboard */}
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-700 font-medium">Analytics dashboard</td>
                  <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-gray-300 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-gray-300 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                </tr>
                {/* Verified badge */}
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-700 font-medium">Verified badge</td>
                  <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-gray-300 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                </tr>
                {/* Featured placement */}
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-700 font-medium">Featured placement</td>
                  <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-gray-300 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-gray-300 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                </tr>
                {/* Priority support */}
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-700 font-medium">Priority support</td>
                  <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-gray-300 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-gray-300 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-gray-300 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                </tr>
                {/* Custom branding */}
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-700 font-medium">Custom branding</td>
                  <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-gray-300 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-gray-300 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-gray-300 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Trust Signals */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white mb-4">
              <Shield className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Secure & Trusted</h3>
            <p className="text-gray-600">Industry-standard security with SSL encryption and data protection</p>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white mb-4">
              <TrendingUp className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Proven Results</h3>
            <p className="text-gray-600">Our service providers see improved discovery and platform exposure</p>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Support</h3>
            <p className="text-gray-600">Dedicated support to help optimize your profile and visibility</p>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-gradient-to-br from-gray-50 to-blue-50 py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-12">Frequently Asked Questions</h2>

          <div className="space-y-6">
            {[
              {
                q: 'What is the 30-day bonus on first purchase?',
                a: "When you purchase any paid plan for the first time, you get 30 extra days FREE as a one-time bonus. For monthly, that means 60 days total (30+30). For yearly, that means 395 days total (365+30)."
              },
              {
                q: 'What are the portfolio limits for each plan?',
                a: "Free Plan: Up to 5 images only (no videos) | Starter Plan: Up to 15 media files | Growth Plan: Up to 30 media files | Premium Plan: Unlimited media uploads. Portfolio limits are combined totals (images + videos) per service provider profile."
              },
              {
                q: 'How does billing work? Is there auto-renewal?',
                a: "You can choose monthly (30-day) or yearly billing. Yearly billing is priced at 17% savings compared to monthly x12. There is no auto-renewal or recurring billing. When your plan expires, it falls back to Free unless you renew."
              },
              {
                q: 'What happens when my plan expires?',
                a: "After your plan expires, your profile is automatically downgraded to the Free plan. You can renew or choose a new plan anytime to restore all your features and visibility."
              }
            ].map((faq, idx) => (
              <div key={idx} className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white py-16">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Grow Your Business?</h2>
          <p className="text-xl text-indigo-100 mb-8">Join successful service providers on our platform to improve discovery and reach</p>
          <Button
            variant="outline"
            size="lg"
            className="bg-white text-indigo-600 border-indigo-600 hover:bg-indigo-600 hover:text-white hover:!border-white transition-all duration-200 ease-in-out"
            onClick={() => navigate('/vendor-registration')}
          >
            Get Started Now
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PlansPage;
