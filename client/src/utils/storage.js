/**
 * Storage Utilities
 * LocalStorage and sessionStorage helper functions
 */

import { STORAGE_KEYS } from "../constants";

/**
 * Get item from localStorage
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value if not found
 * @returns {any} Parsed value or default
 */
export function getItem(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`[Storage] Error getting item "${key}":`, error);
    return defaultValue;
  }
}

/**
 * Set item in localStorage
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 * @returns {boolean} Success status
 */
export function setItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`[Storage] Error setting item "${key}":`, error);
    return false;
  }
}

/**
 * Remove item from localStorage
 * @param {string} key - Storage key
 * @returns {boolean} Success status
 */
export function removeItem(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`[Storage] Error removing item "${key}":`, error);
    return false;
  }
}

/**
 * Clear all localStorage
 * @returns {boolean} Success status
 */
export function clear() {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.error("[Storage] Error clearing storage:", error);
    return false;
  }
}

// ─────────────────────────────────────────────────────────
// Application-specific storage helpers
// ─────────────────────────────────────────────────────────

/**
 * Get deleted items from storage
 * @returns {Array} Deleted items array
 */
export function getDeletedItems() {
  return getItem(STORAGE_KEYS.DELETED_ITEMS, []);
}

/**
 * Add item to deleted items
 * @param {Object} item - Item to add
 * @returns {boolean} Success status
 */
export function addDeletedItem(item) {
  const items = getDeletedItems();
  const newItem = {
    ...item,
    deletedAt: new Date().toISOString(),
  };
  return setItem(STORAGE_KEYS.DELETED_ITEMS, [newItem, ...items]);
}

/**
 * Remove item from deleted items
 * @param {number|string} itemId - Item ID
 * @returns {boolean} Success status
 */
export function removeDeletedItem(itemId) {
  const items = getDeletedItems();
  const filtered = items.filter(item => item.id !== itemId);
  return setItem(STORAGE_KEYS.DELETED_ITEMS, filtered);
}

/**
 * Clear all deleted items
 * @returns {boolean} Success status
 */
export function clearDeletedItems() {
  return removeItem(STORAGE_KEYS.DELETED_ITEMS);
}

/**
 * Get theme preference
 * @returns {string} "dark" or "light"
 */
export function getTheme() {
  return getItem(STORAGE_KEYS.THEME, "light");
}

/**
 * Set theme preference
 * @param {string} theme - "dark" or "light"
 * @returns {boolean} Success status
 */
export function setTheme(theme) {
  return setItem(STORAGE_KEYS.THEME, theme);
}

/**
 * Get sidebar collapsed state
 * @returns {boolean} Collapsed state
 */
export function getSidebarCollapsed() {
  return getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, false);
}

/**
 * Set sidebar collapsed state
 * @param {boolean} collapsed - Collapsed state
 * @returns {boolean} Success status
 */
export function setSidebarCollapsed(collapsed) {
  return setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, collapsed);
}

/**
 * Get session data
 * @param {string} key - Session key
 * @param {any} defaultValue - Default value
 * @returns {any} Session data
 */
export function getSession(key, defaultValue = null) {
  try {
    const item = sessionStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`[Storage] Error getting session "${key}":`, error);
    return defaultValue;
  }
}

/**
 * Set session data
 * @param {string} key - Session key
 * @param {any} value - Value to store
 * @returns {boolean} Success status
 */
export function setSession(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`[Storage] Error setting session "${key}":`, error);
    return false;
  }
}

/**
 * Remove session data
 * @param {string} key - Session key
 * @returns {boolean} Success status
 */
export function removeSession(key) {
  try {
    sessionStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`[Storage] Error removing session "${key}":`, error);
    return false;
  }
}

export default {
  getItem,
  setItem,
  removeItem,
  clear,
  getDeletedItems,
  addDeletedItem,
  removeDeletedItem,
  clearDeletedItems,
  getTheme,
  setTheme,
  getSidebarCollapsed,
  setSidebarCollapsed,
  getSession,
  setSession,
  removeSession,
};

