/**
 * useToast Hook
 * Custom hook for toast notification management
 */

import { useState, useCallback } from "react";

const TOAST_DURATION = 4000; // 4 seconds

export function useToast() {
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "info", // "success" | "error" | "warning" | "info"
  });

  let timeoutId = null;

  const showToast = useCallback((message, type = "info") => {
    // Clear any existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    setToast({
      visible: true,
      message,
      type,
    });

    // Auto-hide after duration
    timeoutId = setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, TOAST_DURATION);
  }, []);

  const hideToast = useCallback(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  const success = useCallback((message) => {
    showToast(message, "success");
  }, [showToast]);

  const error = useCallback((message) => {
    showToast(message, "error");
  }, [showToast]);

  const warning = useCallback((message) => {
    showToast(message, "warning");
  }, [showToast]);

  const info = useCallback((message) => {
    showToast(message, "info");
  }, [showToast]);

  return {
    toast,
    showToast,
    hideToast,
    success,
    error,
    warning,
    info,
  };
}

export default useToast;

