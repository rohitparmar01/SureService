import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

// Toast Context for managing multiple toasts
let toastId = 0;
const toasts = [];
const listeners = [];

const addToast = (toast) => {
  const id = ++toastId;
  const newToast = { id, ...toast };
  toasts.push(newToast);
  listeners.forEach(listener => listener([...toasts]));
  
  // Auto remove toast after duration
  if (toast.duration !== 0) {
    setTimeout(() => {
      removeToast(id);
    }, toast.duration || 5000);
  }
  
  return id;
};

const removeToast = (id) => {
  const index = toasts.findIndex(toast => toast.id === id);
  if (index > -1) {
    toasts.splice(index, 1);
    listeners.forEach(listener => listener([...toasts]));
  }
};

// Toast Hook
export const useToast = () => {
  const [toastList, setToastList] = useState([...toasts]);

  useEffect(() => {
    const listener = (newToasts) => setToastList(newToasts);
    listeners.push(listener);
    
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  const toast = {
    success: (message, options = {}) => addToast({
      type: 'success',
      message,
      ...options
    }),
    error: (message, options = {}) => addToast({
      type: 'error',
      message,
      duration: 0, // Don't auto-dismiss errors
      ...options
    }),
    warning: (message, options = {}) => addToast({
      type: 'warning',
      message,
      ...options
    }),
    info: (message, options = {}) => addToast({
      type: 'info',
      message,
      ...options
    }),
    dismiss: removeToast
  };

  return { toasts: toastList, toast };
};

// Individual Toast Component
const Toast = ({ id, type, message, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation
    setTimeout(() => setIsVisible(true), 10);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(id), 300); // Wait for animation
  };

  const variants = {
    success: {
      bg: 'bg-green-50 border-green-200',
      text: 'text-green-800',
      icon: CheckCircle,
      iconColor: 'text-green-500'
    },
    error: {
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-800',
      icon: AlertCircle,
      iconColor: 'text-red-500'
    },
    warning: {
      bg: 'bg-indigo-50 border-indigo-200',
      text: 'text-indigo-800',
      icon: AlertCircle,
      iconColor: 'text-indigo-500'
    },
    info: {
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-800',
      icon: Info,
      iconColor: 'text-blue-500'
    }
  };

  const { bg, text, icon: Icon, iconColor } = variants[type] || variants.info;

  return (
    <div
      className={`
        transform transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        max-w-sm w-full ${bg} border rounded-xl shadow-lg pointer-events-auto
      `}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className={`text-sm font-medium ${text}`}>
              {message}
            </p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={handleClose}
              className={`rounded-md inline-flex ${text} hover:text-gray-500 focus:outline-none transition-colors`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Toast Container Component
const ToastContainer = () => {
  const { toasts } = useToast();

  return (
    <div 
      className="fixed top-0 right-0 z-50 p-6 space-y-4 pointer-events-none"
      style={{ zIndex: 9999 }}
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={removeToast}
        />
      ))}
    </div>
  );
};

export default ToastContainer;