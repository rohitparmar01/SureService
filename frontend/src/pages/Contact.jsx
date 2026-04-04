import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapPin, Phone, Mail, Clock, Send, CheckCircle } from 'lucide-react';
import Button from '../components/Button';
import { useToast } from '../components/Toast';
import { validateForm } from '../utils/validation';
import { getApiUrl } from '../config/api';

const Contact = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    inquiryType: 'general'
  });
  const [errors, setErrors] = useState({});

  // Pre-fill subject from query parameters
  useEffect(() => {
    const subjectParam = searchParams.get('subject');
    if (subjectParam) {
      setFormData(prev => ({ ...prev, subject: subjectParam }));
    }
  }, [searchParams]);

  const handleInputChange = (field, value) => {
    // Sanitize phone input to only allow digits
    if (field === 'phone') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
    if (submitSuccess) {
      setSubmitSuccess('');
    }
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationRules = {
      name: { required: true, type: 'name', minLength: 2, maxLength: 50, label: 'Full Name' },
      email: { required: true, type: 'email', maxLength: 100, label: 'Email' },
      phone: { required: true, type: 'phone', label: 'Phone Number' },
      subject: { required: true, minLength: 5, maxLength: 100, label: 'Subject' },
      message: { required: true, minLength: 10, maxLength: 1000, label: 'Message' }
    };

    const { isValid, errors: validationErrors } = validateForm(formData, validationRules);
    
    if (!isValid) {
      setErrors(validationErrors);
      return;
    }

    try {
      setLoading(true);
      
      // Submit to backend API
      const inquiryData = {
        userName: formData.name,
        userEmail: formData.email,
        userContact: formData.phone,
        eventType: formData.subject, // Using subject as service type
        message: formData.message,
        budget: 0, // Default for general inquiries
        category: formData.inquiryType,
        inquiryType: 'contact_inquiry',
        source: 'website',
        status: 'pending',
        submittedAt: new Date().toISOString() // Automatic timestamp
      };

      const response = await fetch(getApiUrl('inquiries'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inquiryData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const successMessage = data.message || 'Inquiry submitted successfully.';
        setSubmitSuccess(`${successMessage} We\'ll get back to you within 24 hours.`);
        toast.success(`${successMessage} We\'ll get back to you within 24 hours.`);
        
        // Reset form
        setFormData({
          name: '',
          email: '',
          phone: '',
          subject: '',
          message: '',
          inquiryType: 'general'
        });
      } else {
        throw new Error(data.message || data.error?.message || 'Failed to send message');
      }
      
    } catch (error) {
      console.error('Contact form error:', error);
      toast.error(error.message || 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const contactInfo = [
    {
      icon: MapPin,
      title: 'Address',
      content: ['Gurugram, Haryana 122001', 'India'],
      link: null
    },
    {
      icon: Phone,
      title: 'Phone',
      content: ['+91 9220836393'],
      link: 'tel:+919220836393'
    },
    {
      icon: Mail,
      title: 'Email',
      content: ['info@sureservice.com'],
      link: 'mailto:info@sureservice.com'
    },
    {
      icon: Clock,
      title: 'Business Hours',
      content: ['Mon - Sat: 10:00 AM - 8:00 PM (Call & Visit Support)', 'Sunday: 11:00 AM - 6:00 PM (Call Support Only)', 'Everyday: 24/7 (Online Search & Service Booking)'],
      link: null
    }
  ];

  const inquiryTypes = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'customer-support', label: 'Customer Support' },
    { value: 'vendor-application', label: 'Service Provider Application' },
    { value: 'partnership', label: 'Partnership Opportunities' },
    { value: 'technical', label: 'Technical Issues' },
    { value: 'feedback', label: 'Feedback & Suggestions' }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-[#8a611f] text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Mail className="w-16 h-16 mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-4">
            Get in Touch
          </h1>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            Have questions, need support, or want to partner with us? We'd love to hear from you.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Contact Info */}
          <div className="lg:col-span-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Contact Information</h2>
            
            <div className="space-y-6">
              {contactInfo.map((info, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <info.icon className="w-6 h-6 text-indigo-600 mt-1" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">{info.title}</h3>
                    {info.content.map((line, lineIndex) => (
                      <p key={lineIndex} className="text-gray-600">
                        {info.link ? (
                          <a 
                            href={info.link} 
                            className="hover:text-indigo-600 transition-colors"
                          >
                            {line}
                          </a>
                        ) : (
                          line
                        )}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Response Promise */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 mt-8">
              <CheckCircle className="w-8 h-8 text-indigo-600 mb-3" />
              <h3 className="font-semibold text-indigo-900 mb-2">Quick Response Guarantee</h3>
              <p className="text-indigo-700 text-sm">
                We respond to all inquiries within 24 hours. For urgent matters, call us directly during business hours.
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white/90 rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Send us a Message</h2>

              {submitSuccess && (
                <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                  {submitSuccess}
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Inquiry Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Inquiry Type *
                  </label>
                  <select
                    value={formData.inquiryType}
                    onChange={(e) => handleInputChange('inquiryType', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {inquiryTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Name and Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                        errors.name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Your full name"
                      maxLength={50}
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                        errors.email ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="your.email@example.com"
                      maxLength={100}
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                  </div>
                </div>

                {/* Phone and Subject */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                        errors.phone ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="9876543210"
                      maxLength={10}
                      pattern="[0-9]*"
                    />
                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject *
                    </label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => handleInputChange('subject', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                        errors.subject ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Brief subject of your inquiry"
                      maxLength={100}
                    />
                    {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject}</p>}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Message *
                    </label>
                    <span className="text-xs text-gray-500">
                      {formData.message.length}/1000 characters
                    </span>
                  </div>
                  <textarea
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    rows={6}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                      errors.message ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Please provide details about your inquiry..."
                    maxLength={1000}
                  />
                  {errors.message && <p className="text-red-500 text-xs mt-1">{errors.message}</p>}
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    loading={loading}
                    size="lg"
                    className="flex items-center"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;