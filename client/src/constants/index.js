/**
 * Application Constants
 * Centralized constant values for the application
 */

// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || "http://localhost:3001",
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
};

// API Endpoints
export const API_ENDPOINTS = {
  BOOKS: "/api/books",
  BOOK_BY_ID: (id) => `/api/books/${id}`,
  BOOK_COUNT: "/api/books/count/all",
  TRANSACTIONS: "/api/transactions",
  TRANSACTION_BY_ID: (id) => `/api/transactions/${id}`,
  TRANSACTION_RETURN: (id) => `/api/transactions/${id}/return`,
  TRANSACTION_STATS: "/api/transactions/stats",
  SEARCH_BOOKS: "/api/search-books",
  SEARCH_EDITIONS: "/api/search-editions",
  HEALTH: "/api/health",
};

// Book Status Constants
export const BOOK_STATUS = {
  AVAILABLE: "Available",
  OUT_OF_STOCK: "OutOfStock",
  ALL: "All",
};

export const BOOK_STATUS_LABELS = {
  [BOOK_STATUS.AVAILABLE]: "Available",
  [BOOK_STATUS.OUT_OF_STOCK]: "Out of Stock",
  [BOOK_STATUS.ALL]: "All",
};

// Transaction Status Constants
export const TRANSACTION_STATUS = {
  BORROWED: "Borrowed",
  RETURNED: "Returned",
  OVERDUE: "Overdue",
};

// Storage Keys
export const STORAGE_KEYS = {
  DELETED_ITEMS: "LEXORA_DELETED",
  THEME: "LEXORA_THEME",
  SIDEBAR_COLLAPSED: "LEXORA_SIDEBAR_COLLAPSED",
};

// Pagination Defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: "MMM DD, YYYY",
  INPUT: "YYYY-MM-DD",
  FULL: "MMMM DD, YYYY",
};

// Validation Rules
export const VALIDATION_RULES = {
  TITLE_MIN_LENGTH: 1,
  TITLE_MAX_LENGTH: 255,
  AUTHOR_MAX_LENGTH: 255,
  GENRE_MAX_LENGTH: 100,
  ISBN_LENGTH: 10,
  ISBN_13_LENGTH: 13,
  YEAR_MIN: 1000,
  YEAR_MAX: new Date().getFullYear() + 1,
  QUANTITY_MIN: 0,
  QUANTITY_MAX: 9999,
};

// Feature Flags
export const FEATURES = {
  ENABLE_BARCODE_SCANNER: true,
  ENABLE_BOOK_LOOKUP: true,
  ENABLE_EDITIONS: true,
  ENABLE_DARK_MODE: true,
  ENABLE_ANIMATIONS: true,
};

// App Info
export const APP_INFO = {
  NAME: "Lexora",
  VERSION: "1.0.0",
  DESCRIPTION: "Library Management System",
  AUTHOR: "Lexora Team",
};

export default {
  API_CONFIG,
  API_ENDPOINTS,
  BOOK_STATUS,
  BOOK_STATUS_LABELS,
  TRANSACTION_STATUS,
  STORAGE_KEYS,
  PAGINATION,
  DATE_FORMATS,
  VALIDATION_RULES,
  FEATURES,
  APP_INFO,
};

