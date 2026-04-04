import React from 'react';
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react';
import Button from './Button';

const NotFound = ({ 
  title = "Page Not Found",
  message = "Sorry, we couldn't find the page you're looking for.",
  showHomeButton = true,
  showBackButton = true,
  onHome,
  onBack
}) => {
  const handleHome = () => {
    if (onHome) {
      onHome();
    } else {
      window.location.href = '/';
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md">
        <div className="text-center">
          {/* 404 Illustration */}
          <div className="mx-auto w-32 h-32 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mb-8">
            <AlertTriangle className="w-16 h-16 text-indigo-600" />
          </div>
          
          {/* Error Code */}
          <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
          
          {/* Title */}
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            {title}
          </h2>
          
          {/* Message */}
          <p className="text-gray-600 mb-8 leading-relaxed">
            {message}
          </p>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {showHomeButton && (
              <Button
                variant="primary"
                size="lg"
                onClick={handleHome}
                className="flex items-center"
              >
                <Home className="w-5 h-5 mr-2" />
                Go Home
              </Button>
            )}
            
            {showBackButton && (
              <Button
                variant="outline"
                size="lg"
                onClick={handleBack}
                className="flex items-center"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Go Back
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;