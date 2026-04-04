// Email validation
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone number validation (Indian)
export const isValidPhoneNumber = (phone) => {
  const phoneRegex = /^[6-9]\d{9}$/; // Indian mobile numbers
  const cleaned = phone.replace(/\D/g, '');
  return phoneRegex.test(cleaned);
};

// Name validation
export const isValidName = (name) => {
  if (!name || (typeof name === 'string' && name.trim().length < 2)) return false;
  const nameRegex = /^[a-zA-Z\s]+$/; // Only letters and spaces
  return nameRegex.test(name.trim());
};

// Budget validation
export const isValidBudget = (budget) => {
  const num = parseFloat(budget);
  return !isNaN(num) && num > 0 && num <= 50000000; // Max 5 crores
};

// Password validation
export const isValidPassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// GST number validation (Indian)
export const isValidGST = (gst) => {
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstRegex.test(gst.toUpperCase());
};

// PAN card validation (Indian)
export const isValidPAN = (pan) => {
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(pan.toUpperCase());
};

// URL validation
export const isValidURL = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Form validation helper
export const validateForm = (data, rules) => {
  const errors = {};
  
  Object.keys(rules).forEach(field => {
    const value = data[field];
    const fieldRules = rules[field];
    
    // Required validation
    if (fieldRules.required && (!value || value.toString().trim() === '')) {
      errors[field] = `${fieldRules.label || field} is required`;
      return;
    }
    
    // Skip other validations if field is empty and not required
    if (!value) return;
    
    // Type-specific validations
    if (fieldRules.type === 'email' && !isValidEmail(value)) {
      errors[field] = 'Please enter a valid email address';
    } else if (fieldRules.type === 'phone' && !isValidPhoneNumber(value)) {
      errors[field] = 'Please enter a valid 10-digit mobile number';
    } else if (fieldRules.type === 'name' && !isValidName(value)) {
      errors[field] = 'Please enter a valid name (letters only)';
    } else if (fieldRules.type === 'password' && !isValidPassword(value)) {
      errors[field] = 'Password must be at least 8 characters with uppercase, lowercase, and number';
    } else if (fieldRules.type === 'url' && !isValidURL(value)) {
      errors[field] = 'Please enter a valid URL';
    }
    
    // Length validations
    const valLength = value ? (typeof value === 'string' ? value.length : (Array.isArray(value) ? value.length : String(value).length)) : 0;
    if (fieldRules.minLength && valLength < fieldRules.minLength) {
      errors[field] = `${fieldRules.label || field} must be at least ${fieldRules.minLength} characters`;
    }
    if (fieldRules.maxLength && valLength > fieldRules.maxLength) {
      errors[field] = `${fieldRules.label || field} must not exceed ${fieldRules.maxLength} characters`;
    }
    
    // Custom validation function
    if (fieldRules.validator && !fieldRules.validator(value)) {
      errors[field] = fieldRules.message || `Invalid ${fieldRules.label || field}`;
    }
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Example usage of validateForm:
/*
const formData = {
  name: 'John Doe',
  email: 'john@example.com',
  phone: '9876543210',
  budget: '50000'
};

const validationRules = {
  name: { 
    required: true, 
    type: 'name', 
    label: 'Full Name' 
  },
  email: { 
    required: true, 
    type: 'email', 
    label: 'Email Address' 
  },
  phone: { 
    required: true, 
    type: 'phone', 
    label: 'Mobile Number' 
  },
  budget: { 
    required: true, 
    validator: (value) => isValidBudget(value),
    message: 'Budget must be between ₹1,000 and ₹5,00,00,000'
  }
};

const { isValid, errors } = validateForm(formData, validationRules);
*/