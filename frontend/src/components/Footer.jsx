import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Linkedin, Youtube, Mail, Phone, MapPin, Heart } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    Company: [
      { name: 'About Us', href: '/about' },
      { name: 'How It Works', href: '/how-it-works' },
      { name: 'Contact', href: '/contact-us' },
      { name: 'Plans', href: '/plans' }
    ],
    'For Customers': [
      { name: 'Browse Services', href: '/search' },
      { name: 'Search Service Providers', href: '/search' },
      { name: 'FAQs', href: '/faq' },
      { name: 'Support', href: '/contact-us' }
    ],
    'For Service Providers': [
      { name: 'Become a Service Partner', href: '/vendor-registration' },
      { name: 'View Plans', href: '/plans' },
      { name: 'Partner Benefits', href: '/about' },
      { name: 'Partner Support', href: '/contact-us' }
    ],
    Legal: [
      { name: 'Privacy Policy', href: '/privacy-policy' },
      { name: 'Terms of Service', href: '/terms-and-conditions' },
      { name: 'Contact Legal', href: '/contact-us' },
      { name: 'Cookie Policy', href: '/cookie-policy' }
    ]
  };

  const socialLinks = [
    { icon: Facebook, href: 'https://www.facebook.com/SureService/', label: 'Facebook' },
    { icon: Twitter, href: 'https://x.com/SureService', label: 'Twitter' },
    { icon: Instagram, href: 'https://www.instagram.com/sureservice/', label: 'Instagram' },
    { icon: Youtube, href: 'https://www.youtube.com/@SureService', label: 'YouTube' },
    { icon: Linkedin, href: 'https://www.linkedin.com/company/sureservice/', label: 'LinkedIn' }
  ];

  return (
    <footer className="relative mt-10 border-t border-[var(--premium-border)] bg-[var(--premium-bg-elevated)] text-premium-textSecondary">

      {/* Coverage Banner */}
      <div className="border-b border-[var(--premium-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-center gap-3 flex-wrap">
          <div className="hidden sm:block h-px flex-1 bg-gradient-to-r from-transparent via-[var(--premium-border)] to-transparent"></div>
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-[#596274] flex-wrap text-center">
            <MapPin className="w-4 h-4 text-premium-blue" />
            <span className="font-semibold text-premium-text">Pan-India Coverage</span>
            <span className="text-premium-blue">·</span>
            <span>50+ Cities</span>
            <span className="text-premium-blue">·</span>
            <span>New listings added daily</span>
          </div>
          <div className="hidden sm:block h-px flex-1 bg-gradient-to-r from-transparent via-[var(--premium-border)] to-transparent"></div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-8">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-[linear-gradient(130deg,#1f3c5d_0%,#24496f_100%)] rounded-lg flex items-center justify-center shadow-premium-sm">
                <span className="text-white font-bold text-xl">S</span>
              </div>
              <div>
                <h3 className="font-display text-premium-text font-bold text-lg">SureService</h3>
                <p className="text-xs text-[#6a7488]">Service Management</p>
              </div>
            </div>
            <p className="text-sm text-[#5b6477] leading-relaxed mb-4">
              Premium managed service platform connecting customers with verified service providers.
            </p>
            {/* Social Links */}
            <div className="flex space-x-3">
              {socialLinks.map((social, index) => {
                const Icon = social.icon;
                return (
                  <a
                    key={index}
                    href={social.href}
                    aria-label={social.label}
                    className="w-10 h-10 bg-white border border-[var(--premium-border)] text-premium-blue rounded-lg flex items-center justify-center hover:bg-premium-blue hover:text-white hover:border-premium-blue transition-colors duration-300"
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Links Columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-premium-text font-semibold mb-4">{category}</h4>
              <ul className="space-y-2">
                {links.map((link, index) => (
                  <li key={index}>
                    {link.href.startsWith('#') ? (
                      <a
                        href={link.href}
                        className="text-sm text-[#5b6477] hover:text-premium-blue transition-colors duration-200"
                      >
                        {link.name}
                      </a>
                    ) : (
                      <Link
                        to={link.href}
                        className="text-sm text-[#5b6477] hover:text-premium-blue transition-colors duration-200"
                      >
                        {link.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact Info */}
        <div className="border-t border-[var(--premium-border)] pt-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start space-x-3">
              <Mail className="w-5 h-5 text-premium-blue mt-1" />
              <div>
                <div className="text-premium-text font-semibold text-sm">Email</div>
                <a href="mailto:info@sureservice.com" className="text-sm text-[#5b6477] hover:text-premium-blue">
                  info@sureservice.com
                </a>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Phone className="w-5 h-5 text-premium-blue mt-1" />
              <div>
                <div className="text-premium-text font-semibold text-sm">Phone</div>
                <a href="tel:+919220836393" className="text-sm text-[#5b6477] hover:text-premium-blue block">
                  +91 9220836393
                </a>
                <a href="tel:+919870823328" className="text-sm text-[#5b6477] hover:text-premium-blue block">
                  +91 9870823328
                </a>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <MapPin className="w-5 h-5 text-premium-blue mt-1" />
              <div>
                <div className="text-premium-text font-semibold text-sm">Company</div>
                <p className="text-sm text-[#5b6477]">
                  SURESERVICE PLATFORM PRIVATE LIMITED
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[var(--premium-border)] pt-8 flex flex-col md:flex-row items-center justify-between">
          <p className="text-sm text-[#5b6477] mb-4 md:mb-0">
            © {currentYear} SureService. All rights reserved.
          </p>
          <div className="flex items-center space-x-1 text-sm text-[#5b6477]">
            <span>Made with</span>
            <Heart className="w-4 h-4 text-premium-blue fill-current" />
            <span>in India</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
