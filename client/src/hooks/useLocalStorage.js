/**
 * useLocalStorage Hook
 * Custom hook for localStorage management with React state
 */

import { useState, useEffect } from "react";

/**
 * Custom hook for managing localStorage with React state
 * @param {string} key - Storage key
 * @param {any} initialValue - Initial value if not found in storage
 * @returns {Array} [storedValue, setValue] - State and setter function
 */
export function useLocalStorage(key, initialValue) {
  // Get initial value from storage or use default
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`[useLocalStorage] Error reading key "${key}":`, error);
      return initialValue;
    }
  });

  // Update localStorage when value changes
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(`[useLocalStorage] Error setting key "${key}":`, error);
    }
  }, [key, storedValue]);

  // Remove from storage on unmount (optional - commented out by default)
  // useEffect(() => {
  //   return () => {
  //     try {
  //       localStorage.removeItem(key);
  //     } catch (error) {
  //       console.error(`[useLocalStorage] Error removing key "${key}":`, error);
  //     }
  //   };
  // }, [key]);

  return [storedValue, setStoredValue];
}

export default useLocalStorage;

