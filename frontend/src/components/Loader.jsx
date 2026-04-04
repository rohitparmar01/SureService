import React from 'react';
import { Loader2 } from 'lucide-react';

const Loader = ({ 
  size = 'md', 
  text = '', 
  variant = 'primary',
  centered = true,
  className = '' 
}) => {
  const sizes = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const variants = {
    primary: 'text-indigo-600',
    secondary: 'text-gray-500',
    white: 'text-white',
    dark: 'text-gray-900'
  };

  const content = (
    <div className={`flex flex-col items-center space-y-3 ${className}`}>
      <Loader2 className={`${sizes[size]} ${variants[variant]} animate-spin`} />
      {text && (
        <p className={`text-sm ${variants[variant]} font-medium`}>
          {text}
        </p>
      )}
    </div>
  );

  if (centered) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        {content}
      </div>
    );
  }

  return content;
};

// Full-page loader overlay
export const PageLoader = ({ text = 'Loading...' }) => (
  <div className="fixed inset-0 z-50 bg-white bg-opacity-95 flex items-center justify-center">
    <Loader size="lg" text={text} />
  </div>
);

// Inline content loader
export const ContentLoader = ({ text = 'Loading...' }) => (
  <div className="flex items-center justify-center py-12">
    <Loader size="md" text={text} variant="secondary" />
  </div>
);

// Button loader (small)
export const ButtonLoader = () => (
  <Loader size="xs" centered={false} variant="white" />
);

export default Loader;