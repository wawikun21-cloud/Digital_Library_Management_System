/**
 * Helper Utilities
 * General-purpose helper functions
 */

/**
 * Generate initials from a name
 * @param {string} name - Full name
 * @param {number} maxWords - Maximum number of words to use
 * @returns {string} Initials
 */
export function getInitials(name, maxWords = 2) {
  if (!name) return "";
  
  const words = name.split(" ").filter(w => w.length > 0);
  const selected = words.slice(0, maxWords);
  return selected.map(w => w[0]).join("").toUpperCase();
}

/**
 * Format date for display
 * @param {Date|string} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date
 */
export function formatDate(date, options = {}) {
  if (!date) return "";
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  
  const defaultOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  
  return d.toLocaleDateString("en-US", { ...defaultOptions, ...options });
}

/**
 * Format date for input fields
 * @param {Date|string} date - Date to format
 * @returns {string} ISO date string (YYYY-MM-DD)
 */
export function formatDateForInput(date) {
  if (!date) return "";
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  
  return d.toISOString().split("T")[0];
}

/**
 * Format relative time (e.g., "2 hours ago")
 * @param {Date|string} date - Date to format
 * @returns {string} Relative time string
 */
export function formatRelativeTime(date) {
  if (!date) return "";
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  
  const now = new Date();
  const diffMs = now - d;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  
  return formatDate(date);
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncateText(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait = 300) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit = 100) {
  let inThrottle;
  
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Capitalize first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert string to slug format
 * @param {string} str - String to convert
 * @returns {string} Slugified string
 */
export function slugify(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array)
 * @param {any} value - Value to check
 * @returns {boolean} True if empty
 */
export function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Generate a unique ID
 * @returns {string} Unique ID
 */
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if an object has specific properties
 * @param {Object} obj - Object to check
 * @param {string[]} keys - Required keys
 * @returns {boolean} True if all keys exist
 */
export function hasProperties(obj, keys) {
  if (!obj || typeof obj !== "object") return false;
  return keys.every(key => key in obj && obj[key] !== undefined);
}

/**
 * Format number with thousand separators
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export function formatNumber(num) {
  if (num === null || num === undefined) return "";
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Calculate days between two dates
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {number} Number of days
 */
export function daysBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if a date is overdue
 * @param {Date|string} dueDate - Due date
 * @returns {boolean} True if overdue
 */
export function isOverdue(dueDate) {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

/**
 * Get status label for display
 * @param {string} status - Status value
 * @returns {string} Display label
 */
export function getStatusLabel(status) {
  const labels = {
    Available: "Available",
    OutOfStock: "Out of Stock",
    Borrowed: "Borrowed",
    Returned: "Returned",
    Overdue: "Overdue",
  };
  return labels[status] || status;
}

/**
 * Group array by a key
 * @param {Array} array - Array to group
 * @param {Function|string} keyFn - Key function or property name
 * @returns {Object} Grouped object
 */
export function groupBy(array, keyFn) {
  return array.reduce((result, item) => {
    const key = typeof keyFn === "function" ? keyFn(item) : item[keyFn];
    (result[key] = result[key] || []).push(item);
    return result;
  }, {});
}

/**
 * Sort array by multiple keys
 * @param {Array} array - Array to sort
 * @param {Array} keys - Sort keys with direction
 * @returns {Array} Sorted array
 */
export function sortBy(array, keys) {
  return [...array].sort((a, b) => {
    for (const { key, direction = "asc" } of keys) {
      const aVal = a[key];
      const bVal = b[key];
      
      if (aVal < bVal) return direction === "asc" ? -1 : 1;
      if (aVal > bVal) return direction === "asc" ? 1 : -1;
    }
    return 0;
  });
}

export default {
  getInitials,
  formatDate,
  formatDateForInput,
  formatRelativeTime,
  truncateText,
  debounce,
  throttle,
  capitalize,
  slugify,
  isEmpty,
  deepClone,
  generateId,
  hasProperties,
  formatNumber,
  daysBetween,
  isOverdue,
  getStatusLabel,
  groupBy,
  sortBy,
};

