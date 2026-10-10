/**
 * useToast Hook
 * Custom hook for toast notification management
 */

import { useState, useCallback, useRef, useEffect } from "react";

const TOAST_DURATION = 4000; // 4 seconds

export function useToast() {
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "info", // "success" | "error" | "warning" | "info"
  });

  // A ref, not a plain let: a let is re-created on every render, so the
  // "clear any existing timeout" below could never actually cancel one and
  // rapid toasts would hide each other early.
  const timeoutId = useRef(null);

  const clearTimer = useCallback(() => {
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
      timeoutId.current = null;
    }
  }, []);

  // Cancel an in-flight timer on unmount so it cannot set state afterwards.
  useEffect(() => clearTimer, [clearTimer]);

  const showToast = useCallback((message, type = "info") => {
    clearTimer();
    setToast({ visible: true, message, type });

    timeoutId.current = setTimeout(() => {
      timeoutId.current = null;
      setToast((prev) => ({ ...prev, visible: false }));
    }, TOAST_DURATION);
  }, [clearTimer]);

  const hideToast = useCallback(() => {
    clearTimer();
    setToast((prev) => ({ ...prev, visible: false }));
  }, [clearTimer]);

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

