/**
 * client/src/hooks/useWebSocket.js
 *
 * Connects to Socket.io via the Vite dev proxy so WebSocket
 * traffic goes through :5173 → :5000 and is never blocked by
 * CORS or direct-port restrictions.
 */

import { useEffect, useRef } from "react";
import { io }                from "socket.io-client";

// ── Target ────────────────────────────────────────────────────────────────────
//
// Vite proxy: /socket.io → localhost:3001 (server port)
// WS connects via window.location.origin + "/socket.io" → proxies correctly
const WS_URL = import.meta.env.VITE_WS_URL || window.location.origin;

export function useWebSocket({
  onStatsUpdate,
  onTransactionNew,
  onTransactionReturned,
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

    socket.on("connect", () => {
      console.log("[WS] Connected:", socket.id);
      // Join admin room if admin (passed from caller)
      if (options?.isAdmin) {
        socket.emit("join:admin");
        console.log("[WS] Joined admin room");
      }
    });

    socket.on("connect_error", (err) => {
      console.warn("[WS] Connection error (will retry):", err.message);
      // Specific hint for common server-not-running case
      if (err.message.includes("WebSocket connection failed") || err.message.includes("ECONNREFUSED")) {
        console.warn("[WS] Tip: Make sure `server` is running on port 3001 (npm start in server/)");
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("[WS] Disconnected:", reason);
    });

    socket.on("stats:update",     (data) => onStatsUpdate?.(data));
    socket.on("transaction:new",  (data) => onTransactionNew?.(data));
    socket.on("transaction:returned", (data) => onTransactionReturned?.(data));
    // Audit events for AuditLog.jsx
    socket.on("audit:new", (data) => onAuditEvent?.(data));

    return () => { socket.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function requestStats() {
    socketRef.current?.emit("request:stats");
  }

  return { requestStats };
}