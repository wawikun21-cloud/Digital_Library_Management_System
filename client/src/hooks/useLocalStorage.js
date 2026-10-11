/**
 * useLocalStorage Hook
 * Custom hook for localStorage management with React state
 */

import { useState, useEffect } from "react";

/*
 * Same-tab sync registry.
 *
 * Every hook instance holds its own copy of the value, so a write made by
 * one instance — ProtectedRoute refreshing the cached user from /me after
 * a Super Admin changed a permission — left every other mounted reader
 * (Sidebar, useAuth) on the stale value until a full page reload. That is
 * the "I revoked it but the button is still there" symptom.
 *
 * One listener set per key (not per hook instance) keeps this from scaling
 * with the number of readers.
 */
const keyListeners = new Map();

function subscribeKey(key, callback) {
  if (typeof window === "undefined") return () => {};
  let listeners = keyListeners.get(key);
  if (!listeners) {
    listeners = new Set();
    keyListeners.set(key, listeners);
  }
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
    if (listeners.size === 0) keyListeners.delete(key);
  };
}

function emitKey(key, value) {
  if (typeof window === "undefined") return;
  keyListeners.get(key)?.forEach((callback) => callback(value));
}

function readKey(key, initialValue) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : initialValue;
  } catch (error) {
    console.error(`[useLocalStorage] Error reading key "${key}":`, error);
    return initialValue;
  }
}

/**
 * Custom hook for managing localStorage with React state
 * @param {string} key - Storage key
 * @param {any} initialValue - Initial value if not found in storage
 * @returns {Array} [storedValue, setValue] - State and setter function
 */
export function useLocalStorage(key, initialValue) {
  // Get initial value from storage or use default
  const [storedValue, setStoredValue] = useState(() => readKey(key, initialValue));

  // Persist on change, then tell the other instances of this key. The write
  // is skipped when storage already matches, so another instance mounting
  // with the same value never kicks off a pointless re-render chain.
  useEffect(() => {
    try {
      const serialized = JSON.stringify(storedValue);
      if (localStorage.getItem(key) === serialized) return;
      localStorage.setItem(key, serialized);
      emitKey(key, storedValue);
    } catch (error) {
      console.error(`[useLocalStorage] Error setting key "${key}":`, error);
    }
  }, [key, storedValue]);

  // Same-tab writes from another instance of this key
  useEffect(() => subscribeKey(key, setStoredValue), [key]);

  // Cross-tab writes (the browser's `storage` event)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (event) => {
      if (event.key !== key) return;
      try {
        setStoredValue(event.newValue ? JSON.parse(event.newValue) : null);
      } catch {
        // ignore malformed values
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key]);

  return [storedValue, setStoredValue];
}

export default useLocalStorage;
