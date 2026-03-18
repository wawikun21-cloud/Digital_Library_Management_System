import { useState, useEffect } from 'react';

/**
 * Custom hook for debouncing a value.
 * @param {any} value - Value to debounce
 * @param {number} delay - Debounce delay in ms (default 300)
 * @returns {any} Debounced value
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;

