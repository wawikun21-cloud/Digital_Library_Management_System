/**
 * features/attendance/hooks/useRfidCapture.js
 *
 * Hardware-scanner capture: character buffer + Enter handling, plus the
 * auto-focus and click-refocus effects that keep the hidden input active.
 * Extracted from the component body of the former
 * pages/KioskAttendance.jsx.
 */

import { useEffect, useCallback, useRef } from "react";

export function useRfidCapture({ onTap, inputRef }) {
  const rfidBufferRef = useRef("");

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter") {
      const code = rfidBufferRef.current.trim();
      rfidBufferRef.current = "";
      if (code) onTap(code);
    } else if (e.key.length === 1) {
      rfidBufferRef.current += e.key;
    }
    e.preventDefault();
  }, [onTap]);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, [inputRef]);

  // Maintain focus on any click
  useEffect(() => {
    const handler = () => {
      setTimeout(() => inputRef.current?.focus(), 100);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [inputRef]);

  return { rfidBufferRef, handleKeyDown };
}
