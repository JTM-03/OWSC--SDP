/**
 * Input Sanitization Utilities
 * Provides functions to sanitize and escape user input to prevent XSS and injection attacks
 */

/**
 * Trim whitespace from string
 * @param {string} str - String to trim
 * @returns {string} Trimmed string
 */
function trimString(str) {
  if (typeof str !== 'string') return str;
  return str.trim();
}

/**
 * Escape HTML special characters to prevent XSS attacks
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  
  const htmlEscapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    // NOTE: '/' is intentionally NOT escaped here.
    // Encoding '/' as '&#x2F;' breaks file paths like /uploads/file.jpg
    // when those paths are stored in the database and later used as image src URLs.
    // The slash is not an XSS vector in HTML attribute values.
  };
  
  return str.replace(/[&<>"']/g, char => htmlEscapeMap[char]);
}

/**
 * Remove potentially dangerous characters and scripts
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function removeDangerousChars(str) {
  if (typeof str !== 'string') return str;
  
  // Remove script tags and event handlers
  let sanitized = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, '');
  
  return sanitized;
}

/**
 * Sanitize a single string value
 * Trims, escapes HTML, and removes dangerous characters
 * @param {string} value - Value to sanitize
 * @returns {string} Sanitized value
 */
function sanitizeString(value) {
  if (typeof value !== 'string') return value;
  
  let sanitized = trimString(value);
  sanitized = removeDangerousChars(sanitized);
  sanitized = escapeHtml(sanitized);
  
  return sanitized;
}

/**
 * Sanitize an object recursively
 * Trims and escapes all string values
 * @param {object} obj - Object to sanitize
 * @returns {object} Sanitized object
 */
function sanitizeObject(obj) {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Sanitize email address
 * Trims and converts to lowercase
 * @param {string} email - Email to sanitize
 * @returns {string} Sanitized email
 */
function sanitizeEmail(email) {
  if (typeof email !== 'string') return email;
  return trimString(email).toLowerCase();
}

/**
 * Sanitize phone number
 * Removes all non-digit characters except leading +
 * @param {string} phone - Phone number to sanitize
 * @returns {string} Sanitized phone
 */
function sanitizePhone(phone) {
  if (typeof phone !== 'string') return phone;
  
  const trimmed = trimString(phone);
  // Keep only digits and leading +
  return trimmed.replace(/[^\d+]/g, '').replace(/\+/g, (match, offset) => offset === 0 ? match : '');
}

/**
 * Sanitize URL
 * Validates and encodes URL
 * @param {string} url - URL to sanitize
 * @returns {string} Sanitized URL or empty string if invalid
 */
function sanitizeUrl(url) {
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
}

/**
 * Sanitize numeric input
 * Ensures value is a valid number
 * @param {any} value - Value to sanitize
 * @returns {number|null} Sanitized number or null
 */
function sanitizeNumber(value) {
  const num = Number(value);
  return isNaN(num) ? null : num;
}

/**
 * Sanitize boolean input
 * Converts various truthy/falsy values to boolean
 * @param {any} value - Value to sanitize
 * @returns {boolean} Sanitized boolean
 */
function sanitizeBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  return Boolean(value);
}

/**
 * Sanitize file name
 * Removes path traversal attempts and dangerous characters
 * @param {string} filename - Filename to sanitize
 * @returns {string} Sanitized filename
 */
function sanitizeFilename(filename) {
  if (typeof filename !== 'string') return '';
  
  // Remove path traversal attempts
  let sanitized = filename.replace(/\.\.\//g, '').replace(/\.\.\\/g, '');
  
  // Remove special characters except dots, hyphens, underscores
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  // Remove leading dots
  sanitized = sanitized.replace(/^\.+/, '');
  
  return sanitized;
}

module.exports = {
  trimString,
  escapeHtml,
  removeDangerousChars,
  sanitizeString,
  sanitizeObject,
  sanitizeEmail,
  sanitizePhone,
  sanitizeUrl,
  sanitizeNumber,
  sanitizeBoolean,
  sanitizeFilename
};
