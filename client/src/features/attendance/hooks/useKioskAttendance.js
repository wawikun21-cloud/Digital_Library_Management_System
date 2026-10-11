/**
 * features/attendance/hooks/useKioskAttendance.js
 *
 * Kiosk session: active-students list with real-time socket sync + HTTP
 * fallback poll, the RFID tap handler (debounce, banners, optimistic
 * updates), online status and the scan cooldown. Extracted from the
 * component body of the former pages/KioskAttendance.jsx — including the
 * socket connection that used to be created inline in the page.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import { tapRfid } from "../../../services/api/rfidApi";
import { getActiveAttendance } from "../../../services/api/attendanceApi";

export function useKioskAttendance({ focusInput }) {
  const [active, setActive]               = useState([]);
  const [tapResult, setTapResult]         = useState(null);
  const [notFound, setNotFound]           = useState(null);
  const [unregistered, setUnregistered]   = useState(null);
  const [online, setOnline]               = useState(navigator.onLine);
  const [processing, setProcessing]       = useState(false);
  const [nextScanIn, setNextScanIn]       = useState(0);

  const lastSuccessTime = useRef(0);

  // ── Fetch active students (HTTP) ─────────────────────
  const fetchActive = useCallback(async () => {
    try {
      const res = await getActiveAttendance();
      if (res.success) setActive(res.data || []);
    } catch {
      // silent on kiosk — WS will recover
    }
  }, []);

  // ── Real-time active-list sync via Socket.io ──────────
  useEffect(() => {
    fetchActive();

    const WS_URL = import.meta.env.VITE_WS_URL || window.location.origin;
    const socket = io(WS_URL, {
      path:                 "/socket.io",
      transports:           ["websocket", "polling"],
      withCredentials:      true,
      reconnectionDelay:    2000,
      reconnectionAttempts: 10,
    });

    const applyAttendanceUpdate = ({ action, data }) => {
      if (!data?.id) return;
      if (action === "checked_in") {
        setActive(prev =>
          prev.some(r => r.id === data.id) ? prev : [data, ...prev]
        );
      } else if (action === "checked_out") {
        setActive(prev => prev.filter(r => r.id !== data.id));
      }
    };

    socket.on("attendance:update", applyAttendanceUpdate);
    socket.on("rfid:tap",         applyAttendanceUpdate);

    const fallback = setInterval(fetchActive, 60_000);

    return () => {
      socket.disconnect();
      clearInterval(fallback);
    };
  }, [fetchActive]);

  // ── Online / offline indicator ────────────────────────
  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // ── Countdown timer for next scan ─────────────────────
  useEffect(() => {
    if (nextScanIn <= 0) return;

    const interval = setInterval(() => {
      setNextScanIn(prev => {
        if (prev <= 16) return 0;
        return prev - 16;
      });
    }, 16);

    return () => clearInterval(interval);
  }, [nextScanIn]);

  // ── Core RFID tap handler ─────────────────────────────
  const handleRfidTap = useCallback(async (rfidCode) => {
    const now = Date.now();
    const debounceMs = 3000; // 3 seconds

    // Block if within debounce window OR processing
    if (!rfidCode?.trim() || processing || (now - lastSuccessTime.current) < debounceMs) {
      return;
    }

    setProcessing(true);
    try {
      const res = await tapRfid(rfidCode.trim());

      if (res.unregistered) {
        setUnregistered(rfidCode.trim());
      } else if (res.success) {
        setTapResult(res);

        // Set 3s debounce after SUCCESS only
        lastSuccessTime.current = now;
        setNextScanIn(debounceMs);

        // Optimistic update — apply immediately from HTTP response,
        // WS round-trip duplicate guard will silently no-op when it arrives.
        if (res.action === "checked_in" && res.data?.id) {
          setActive(prev =>
            prev.some(r => r.id === res.data.id)
              ? prev
              : [res.data, ...prev]
          );
        } else if (res.action === "checked_out" && res.data?.id) {
          setActive(prev => prev.filter(r => r.id !== res.data.id));
        }
      } else if (res.error?.toLowerCase().includes("not found")) {
        setNotFound(rfidCode.trim());
      }
    } catch {
      // silent — network banner would be distracting on a kiosk
    } finally {
      setProcessing(false);
      setTimeout(focusInput, 50);
    }
  }, [processing, focusInput]);

  const dismissTapResult = useCallback(() => setTapResult(null), []);
  const dismissNotFound = useCallback(() => setNotFound(null), []);
  const dismissUnregistered = useCallback(() => setUnregistered(null), []);

  return {
    active,
    online, processing, nextScanIn,
    tapResult, dismissTapResult,
    notFound, dismissNotFound,
    unregistered, dismissUnregistered,
    handleRfidTap,
  };
}
