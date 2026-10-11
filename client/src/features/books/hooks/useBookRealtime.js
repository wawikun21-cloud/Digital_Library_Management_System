/**
 * features/books/hooks/useBookRealtime.js
 *
 * Real-time catalog sync: Socket.io transaction events (borrow / return
 * change available_copies) plus the dedicated `book:stock_update` event.
 * The raw socket listener previously lived inside the page body; it now
 * lives here so the page holds no transport code.
 *
 * Strategy by action:
 *   "created"       — re-fetch so the new book appears with full data.
 *   "updated"       — re-fetch to get accurate copy counts / status.
 *   "deleted"       — optimistically remove from local state; the
 *                     soft-delete already removes it from /api/books.
 *   "bulk_imported" — re-fetch to pick up all new/updated titles.
 */

import { useEffect } from "react";
import { useWebSocket } from "../../../hooks/useWebsocket";
import useBookSocket from "./useBookSocket";

export function useBookRealtime({ fetchBooks, removeBookById }) {
  // A new borrow changes available_copies — refresh book list
  useWebSocket({
    onStatsUpdate: () => {}, // handled by Dashboard; no-op here
    onTransactionNew:      () => fetchBooks(),
    onTransactionReturned: () => fetchBooks(),
  });

  // Dedicated book:stock_update listener (useWebSocket doesn't expose it as
  // a named callback). Scoped to this feature.
  useBookSocket(({ action, book_id }) => {
    if (action === "deleted") {
      // Optimistic removal — matches what confirmDelete() already does
      if (book_id) removeBookById(book_id);
    } else {
      // created / updated / bulk_imported — need fresh data from server
      fetchBooks();
    }
  });
}
