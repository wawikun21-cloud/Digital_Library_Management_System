/**
 * client/src/hooks/useWebSocket.js
 *
 * Connects to Socket.io via the Vite dev proxy so WebSocket
 * traffic goes through :5173 → :5000 and is never blocked by
 * CORS or direct-port restrictions.
 *
 * CHANGES:
 *   • FIX: `isAdmin` is now a proper destructured parameter —
 *     previously referenced as `options?.isAdmin` which was always
 *     falsy because `options` was never in scope after destructuring.
 *   • FIX: `onAuditEvent` added to destructured params (was used but
 *     never declared, causing a silent ReferenceError).
 *   • FIX: `onTransactionDeleted` and `onTransactionFinePaid` added
 *     to match the server events the hook was already supposed to handle.
 *   • NEW: `onDisconnect` callback so callers can show a toast or
 *     status indicator when the WS drops.
 *   • NEW: `requestStats()` is returned so callers can manually
 *     trigger a stats refresh.
 */

import { useEffect, useRef } from "react";
import { io }                from "socket.io-client";

// ── Target ────────────────────────────────────────────────────────────────────
//
// Vite proxy: /socket.io → localhost:3001 (server port)
// WS connects via window.location.origin + "/socket.io" → proxies correctly
const WS_URL = import.meta.env.VITE_WS_URL || window.location.origin;

export function useWebSocket({
  // Role flag — set true for admin users so this client joins the
  // "admins" room and receives audit:new events.
  isAdmin = false,

  // ── Stats ─────────────────────────────────────────────
  onStatsUpdate,

  // ── Transaction events ────────────────────────────────
  onTransactionNew,
  onTransactionReturned,
  onTransactionDeleted,
  onTransactionFinePaid,

  // ── Audit events (admin room only) ────────────────────
  onAuditEvent,

  // ── Attendance events ─────────────────────────────────
  onAttendanceUpdate,    // check-in / check-out
  onAttendanceDeleted,

  // ── Trash events (admin room only) ───────────────────
  onTrashRestored,
  onTrashDeleted,
  onTrashEmptied,

  // ── Connection lifecycle ──────────────────────────────
  onDisconnect,
} = {}) {
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(WS_URL, {
      path:                 "/socket.io",   // matches the Vite proxy key
      transports:           ["websocket", "polling"],
      withCredentials:      true,           // send session cookie on handshake
      reconnectionDelay:    2000,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    // ── Connect ───────────────────────────────────────────────────────────────
    socket.on("connect", () => {
      console.log("[WS] Connected:", socket.id);

      // FIX: `isAdmin` is now properly in scope as a destructured parameter.
      // Previously this block referenced `options?.isAdmin` which was always
      // undefined because the param object had already been destructured.
      if (isAdmin) {
        socket.emit("join:admin");
        console.log("[WS] Joined admin room");
      }
    });

    // ── Connection errors ─────────────────────────────────────────────────────
    socket.on("connect_error", (err) => {
      console.warn("[WS] Connection error (will retry):", err.message);
      if (
        err.message.includes("WebSocket connection failed") ||
        err.message.includes("ECONNREFUSED")
      ) {
        console.warn(
          "[WS] Tip: Make sure `server` is running on port 3001 (npm start in server/)"
        );
      }
    });

    // ── Disconnect ────────────────────────────────────────────────────────────
    socket.on("disconnect", (reason) => {
      console.log("[WS] Disconnected:", reason);
      // Let the caller show a toast / status indicator
      onDisconnect?.(reason);
    });

    // ── Event listeners ───────────────────────────────────────────────────────
    socket.on("stats:update",            (data) => onStatsUpdate?.(data));
    socket.on("transaction:new",         (data) => onTransactionNew?.(data));
    socket.on("transaction:returned",    (data) => onTransactionReturned?.(data));
    socket.on("transaction:deleted",     (data) => onTransactionDeleted?.(data));
    socket.on("transaction:fine_paid",   (data) => onTransactionFinePaid?.(data));

    // FIX: `onAuditEvent` was called but never declared in the params list,
    // causing a silent ReferenceError. Now properly destructured above.
    socket.on("audit:new",               (data) => onAuditEvent?.(data));

    // ── Attendance ────────────────────────────────────────────────────────────
    socket.on("attendance:update",       (data) => onAttendanceUpdate?.(data));
    socket.on("attendance:deleted",      (data) => onAttendanceDeleted?.(data));

    // ── Trash (admin room, so only admins receive these) ──────────────────────
    socket.on("trash:restored",          (data) => onTrashRestored?.(data));
    socket.on("trash:deleted",           (data) => onTrashDeleted?.(data));
    socket.on("trash:emptied",           (data) => onTrashEmptied?.(data));

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      socket.disconnect();
    };

    // Callbacks are intentionally excluded from deps — callers should
    // wrap them in useCallback to avoid unnecessary reconnects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  /** Trigger a manual stats refresh from the server. */
  function requestStats() {
    socketRef.current?.emit("request:stats");
  }

  return { requestStats };
}