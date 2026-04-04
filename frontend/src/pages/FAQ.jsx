import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, HelpCircle, Search, MessageCircle } from 'lucide-react';
import Button from '../components/Button';

const FAQ = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [openItems, setOpenItems] = useState(new Set([0])); // First item open by default

  const toggleItem = (index) => {
    const newOpenItems = new Set(openItems);
    if (openItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  const faqs = [
    {
      category: 'General FAQs',
      questions: [
        {
          question: 'What is SureService?',
          answer: 'SureService is a tech-enabled service ecosystem that combines smart provider discovery with managed execution. The platform helps customers find and finalize services based on location, budget, and preferences, while SureService ensures verified service providers, transparent pricing, and single-point accountability throughout the service lifecycle.'
        },
        {
          question: 'What does "Verified Service Provider" mean?',
          answer: 'Every service provider on our platform undergoes a strict vetting process, including background checks, service quality audits, and past performance reviews to ensure your requirement is in safe hands.'
        },
        {
          question: 'Is SureService available in all cities?',
          answer: 'Currently, SureService is expanding phase-wise across selected cities. More locations will be added soon.'
        }
      ]
    },
    {
      category: 'Service Booking & Process',
      questions: [
        {
          question: 'How do I book a service through the platform?',
          answer: 'Simply enter your location, budget, and service preferences. Our smart discovery tool suggests the best-matched service providers. Once you choose, our team helps you finalize the booking and manages the execution.'
        },
        {
          question: 'Can I customize my requirements?',
          answer: 'Absolutely! You can filter services based on your specific needs, or speak to our service consultants for a completely tailored package.'
        },
        {
          question: 'Do I have to talk to multiple service providers?',
          answer: 'No. SureService acts as your single point of contact. We handle provider communications so you can focus on outcomes.'
        }
      ]
    },
    {
      category: 'Payments & Financials',
      questions: [
        {
          question: 'Is the pricing transparent?',
          answer: 'Yes. We believe in "Transparent Pricing." The quote you see is what you pay—no hidden costs or last-minute surprises.'
        }
      ]
    },
    {
      category: 'Customer FAQs',
      questions: [
        {
          question: 'How do I find service providers on SureService?',
          answer: 'Simply select your city, service type, and budget range to view verified provider options.'
        },
        {
          question: 'Are service providers verified?',
          answer: 'Yes, service providers undergo a verification and profile screening process before being listed.'
        },
        {
          question: 'Can I contact service providers directly?',
          answer: 'SureService manages the coordination process to ensure quality control and smooth communication.'
        },
        {
          question: 'What types of services are covered?',
          answer: 'Home services, business services, creative services, maintenance, and more.'
        }
      ]
    },
    {
      category: 'Service Provider FAQs',
      questions: [
        {
          question: 'How do I register as a service provider?',
          answer: 'Click "Become a Partner" on our homepage and complete the 4-step registration process. Provide your business details, services, location, and required documents. Our team will review and approve your application within 24-48 hours.'
        },
        {
          question: 'Is there a listing fee?',
          answer: 'SureService offers multiple listing plans including basic and featured options. Pricing details are available in the Service Provider Plans section.'
        },
        {
          question: 'How do I receive customer inquiries?',
          answer: 'Once approved, you will receive inquiries through your service provider dashboard. Our admin team may assign inquiries based on customer requirements and your service offerings. You can respond directly through the platform.'
        }
      ]
    }
  ];

  const filteredFAQs = faqs.map(category => ({
    ...category,
    questions: category.questions.filter(
      item => 
        item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-[#8a611f] text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <HelpCircle className="w-16 h-16 mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
          <p className="text-xl mb-8">
            Find answers to common questions about SureService
          </p>
          
          {/* Search Box */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search for questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600"
            />
          </div>
        </div>
      </div>

      {/* FAQ Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {filteredFAQs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">
              No questions found matching "{searchTerm}". Try a different search term.
            </p>
          </div>
        ) : (
          filteredFAQs.map((category, categoryIndex) => (
            <div key={categoryIndex} className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {category.category}
              </h2>
              
              <div className="space-y-4">
                {category.questions.map((faq, faqIndex) => {
                  const globalIndex = categoryIndex * 100 + faqIndex;
                  const isOpen = openItems.has(globalIndex);
                  
                  return (
                    <div key={faqIndex} className="bg-white rounded-xl shadow-sm border border-gray-200">
                      <button
                        onClick={() => toggleItem(globalIndex)}
                        className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 rounded-xl transition-colors"
                      >
                        <span className="font-medium text-gray-900 pr-4">
                          {faq.question}
                        </span>
                        {isOpen ? (
                          <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                        )}
                      </button>
                      
                      {isOpen && (
                        <div className="px-6 pb-4">
                          <p className="text-gray-600 leading-relaxed">
                            {faq.answer}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {/* Contact Support */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 text-center mt-12 border border-indigo-100">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white mx-auto mb-4">
            <MessageCircle className="w-6 h-6" />
          </div>
          <h3 className="text-2xl font-bold text-premium-text mb-4">
            Still have questions?
          </h3>
          <p className="text-premium-textSecondary mb-6 max-w-2xl mx-auto">
            Cannot find what you are looking for? Our support team is here to help you with any questions about our platform or services.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/contact-us')}>
              Contact Support
            </Button>
            <Button variant="outline" size="lg" onClick={() => window.location.href = 'mailto:info@sureservice.com'}>
              Email Us
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQ;