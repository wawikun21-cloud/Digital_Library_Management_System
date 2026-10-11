/**
 * features/books/hooks/useBookSocket.js
 *
 * Thin subscription to the server's `book:stock_update` event. Extracted
 * from the raw socket.io-client effect inside the former pages/Books.jsx.
 * (When/if the shared useWebSocket gains an onBookStockUpdate callback,
 * this hook can be replaced by it.)
 */

import { useEffect, useRef } from "react";

export default function useBookSocket(onStockUpdate) {
  // Keep the latest handler in a ref so the socket is connected once.
  const handlerRef = useRef(onStockUpdate);
  handlerRef.current = onStockUpdate;

  useEffect(() => {
    let socket;
    let cancelled = false;

    // Lazy-import so the socket client stays out of the initial bundle path
    // and a circular dep can never form if the shared hook is refactored.
    import("socket.io-client").then(({ io }) => {
      if (cancelled) return;
      const WS_URL = import.meta.env.VITE_WS_URL || window.location.origin;
      socket = io(WS_URL, {
        path:            "/socket.io",
        transports:      ["websocket", "polling"],
        withCredentials: true,
        // Don't reconnect indefinitely — this is a secondary listener
        reconnectionAttempts: 5,
      });

      socket.on("book:stock_update", (payload) => handlerRef.current?.(payload));
    });

    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, []);
}
