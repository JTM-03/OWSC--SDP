/**
 * Frontend Input Sanitization Utilities
 * Provides functions to sanitize user input before sending to backend
 */

/**
 * Trim whitespace from string
 */
export const trimString = (str: string): string => {
  if (typeof str !== 'string') return str;
  return str.trim();
};

/**
 * Remove script tags and event handlers
 */
export const removeDangerousChars = (str: string): string => {
  if (typeof str !== 'string') return str;

  // Remove script tags
  let sanitized = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, '');

  return sanitized;
};

/**
 * Sanitize a string value
 * Trims and removes dangerous characters
 */
export const sanitizeString = (value: string): string => {
  if (typeof value !== 'string') return value;

  let sanitized = trimString(value);
  sanitized = removeDangerousChars(sanitized);

  return sanitized;
};

/**
 * Sanitize email address
 * Trims and converts to lowercase
 */
export const sanitizeEmail = (email: string): string => {
  if (typeof email !== 'string') return email;
  return trimString(email).toLowerCase();
};

/**
 * Sanitize phone number
 * Removes all non-digit characters except leading +
 */
export const sanitizePhone = (phone: string): string => {
  if (typeof phone !== 'string') return phone;

  const trimmed = trimString(phone);
  // Keep only digits and leading +
  return trimmed
    .replace(/[^\d+]/g, '')
    .replace(/\+/g, (match, offset) => (offset === 0 ? match : ''));
};

/**
 * Sanitize URL
 * Validates and returns URL or empty string if invalid
 */
export const sanitizeUrl = (url: string): string => {
  if (typeof url !== 'string') return '';

  const trimmed = trimString(url);

  try {
    // Validate URL format
    new URL(trimmed);
    return trimmed;
  } catch (e) {
    // If not a valid absolute URL, return empty
    return '';
  }
};

/**
 * Sanitize numeric input
 * Ensures value is a valid number
 */
export const sanitizeNumber = (value: any): number | null => {
  const num = Number(value);
  return isNaN(num) ? null : num;
};

/**
 * Sanitize boolean input
 * Converts various truthy/falsy values to boolean
 */
export const sanitizeBoolean = (value: any): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  return Boolean(value);
};

/**
 * Sanitize filename
 * Removes path traversal attempts and dangerous characters
 */
export const sanitizeFilename = (filename: string): string => {
  if (typeof filename !== 'string') return '';

  // Remove path traversal attempts
  let sanitized = filename.replace(/\.\.\//g, '').replace(/\.\.\\/g, '');

  // Remove special characters except dots, hyphens, underscores
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Remove leading dots
  sanitized = sanitized.replace(/^\.+/, '');

  return sanitized;
};

/**
 * Sanitize an object recursively
 * Trims and removes dangerous chars from all string values
 */
export const sanitizeObject = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  return obj;
};

/**
 * Sanitize form data object
 * Applies appropriate sanitization based on field type
 */
export const sanitizeFormData = (
  data: Record<string, any>,
  fieldTypes?: Record<string, 'email' | 'phone' | 'string' | 'number' | 'boolean'>
): Record<string, any> => {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    const fieldType = fieldTypes?.[key] || 'string';

    switch (fieldType) {
      case 'email':
        sanitized[key] = sanitizeEmail(value);
        break;
      case 'phone':
        sanitized[key] = sanitizePhone(value);
        break;
      case 'number':
        sanitized[key] = sanitizeNumber(value);
        break;
      case 'boolean':
        sanitized[key] = sanitizeBoolean(value);
        break;
      case 'string':
      default:
        sanitized[key] = sanitizeString(value);
        break;
    }
  }

  return sanitized;
};

/**
 * Escape HTML special characters for safe display
 * Use when displaying user-generated content
 */
export const escapeHtml = (text: string): string => {
  if (typeof text !== 'string') return text;

  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return text.replace(/[&<>"'\/]/g, (char) => map[char]);
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone format
 * Accepts Sri Lankan mobile (07X) and landline (011X, 038X, etc.) numbers — 10 digits starting with 0
 */
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^0\d{9}$/;
  return phoneRegex.test(phone);
};

/**
 * Validate password strength
 */
export const isStrongPassword = (password: string): boolean => {
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
  const isLongEnough = password.length >= 8;

  return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar && isLongEnough;
};

/**
 * Get password strength indicator
 */
export const getPasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
  let strength = 0;

  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  if (strength <= 2) return 'weak';
  if (strength <= 4) return 'medium';
  return 'strong';
};
