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
// Development:
//   Use window.location.origin (same origin as the page = :5173).
//   Vite proxies /socket.io → :5000, so the WS upgrade succeeds.
//
// Production:
//   Set VITE_WS_URL=https://api.yourdomain.com in client/.env
//
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
    });

    socket.on("connect_error", (err) => {
      console.warn("[WS] Connection error (will retry):", err.message);
    });

    socket.on("disconnect", (reason) => {
      console.log("[WS] Disconnected:", reason);
    });

    socket.on("stats:update",          (data) => onStatsUpdate?.(data));
    socket.on("transaction:new",       (data) => onTransactionNew?.(data));
    socket.on("transaction:returned",  (data) => onTransactionReturned?.(data));

    return () => { socket.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function requestStats() {
    socketRef.current?.emit("request:stats");
  }

  return { requestStats };
}