/**
 * features/analytics/hooks/useBookDashboardData.js
 *
 * Data hook for the book dashboard. Owns everything the former
 * pages/BookDashboard.jsx kept in its component body: all data state, the
 * debounced load effect (FIX 5), the try/finally spinner handling
 * (FIX 6 + 7), and the stable WS handles (FIX D). The page only holds
 * filter and modal state.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import useDebounce from "../../../hooks/useDebounce";
import { fetchBooks } from "../../../services/api/booksApi";
import {
  fetchBookStats,
  fetchMostBorrowed,
  fetchBooksByStatus,
} from "../api/analyticsApi";
import {
  filterBooks,
  buildGenreData,
  buildCollectionData,
  buildArrivals,
  getLowStockBooks,
} from "../utils/bookChartData";

/**
 * @param {object}   params
 * @param {object}   params.globalFilter    { genre, collection, dateFrom, dateTo }
 * @param {string}   params.arrivalsFilter  "Daily" | "Weekly" | "Monthly"
 */
export function useBookDashboardData({ globalFilter, arrivalsFilter }) {
  const [kpi, setKpi]                           = useState(null);
  const [genreData, setGenreData]               = useState([]);
  const [statusData, setStatusData]             = useState([]);
  const [statusLoading, setStatusLoading]       = useState(true);
  const [statusError, setStatusError]           = useState(null);
  const [topBorrowed, setTopBorrowed]           = useState([]);
  const [topBorrowedLoading, setTopBorrowedLoading] = useState(true);
  const [topBorrowedError, setTopBorrowedError] = useState(null);
  const [collectionData, setCollectionData]     = useState([]);
  const [newArrivals, setNewArrivals]           = useState([]);
  const [arrivalsDataKey, setArrivalsDataKey]   = useState("month");
  const [lowStock, setLowStock]                 = useState([]);

  // FIX 1: parameter is `period` (not `arrivalsFilter`) so it never shadows
  // the state variable; callers pass the current value explicitly.
  // FIX 6 + 7: loading/error states reset before fetching, try/finally
  // guarantees spinners always clear even on network error.
  const loadData = useCallback(async (filters = {}, period = "Monthly") => {
    setKpi(null);
    setStatusLoading(true);
    setStatusError(null);
    setTopBorrowedLoading(true);
    setTopBorrowedError(null);

    try {
      const [statsResult, borrowedResult, statusResult, booksResult] = await Promise.all([
        fetchBookStats(filters),
        fetchMostBorrowed(filters),
        fetchBooksByStatus(filters),
        fetchBooks(),
      ]);
      // Build a lookup map for accurate copy counts from the books API
      const booksMap = new Map();
      if (booksResult.success) {
        for (const b of booksResult.data || []) {
          booksMap.set(b.id, {
            totalCopies: Number(b.total_copies) || 0,
            availableCopies: Number(b.available_copies) || 0,
            collection: b.collection,
          });
        }
      }

      // ── KPI ──
      if (statsResult.success) {
        const s = statsResult.data;
        const now = new Date();

        const addedThisMonth = s.addedThisMonth != null
          ? s.addedThisMonth
          : booksResult.success
            ? (booksResult.data || []).filter(b => {
                if (!b.created_at) return false;
                const d = new Date(b.created_at);
                return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
              }).length
            : 0;

        const borrowed = s.borrowedBooks ?? s.borrowed ?? 0;
        const overdue  = s.overdueBooks  ?? s.overdue  ?? 0;

        setKpi({
          totalBooks:      s.totalBooks    ?? s.nemcoTotal ?? 0,
          totalCopies:     s.totalCopies   ??
            (booksResult.success
              ? (booksResult.data || []).reduce((sum, b) => sum + (Number(b.total_copies) || 0), 0)
              : (s.nemcoTotal ?? 0) + (s.lexoraTotal ?? 0)),
          availableCopies: s.availableCopies ??
            (booksResult.success
              ? (booksResult.data || []).reduce((sum, b) => sum + (Number(b.available_copies) || 0), 0)
              : (s.nemcoTotal ?? 0) - (s.nemcoOutOfStock ?? 0)),
          borrowedBooks:   borrowed,
          overdueBooks:    overdue,
          addedThisMonth,
        });
      }

      // ── Top Borrowed ──
      if (borrowedResult.success) {
        const list = Array.isArray(borrowedResult.data) ? borrowedResult.data : [];
        const corrected = list.map((b, i) => {
          const extra = booksMap.get(b.id);
          const rawBorrows = b.borrows ?? 0;
          if (extra) {
            return {
              rank: i + 1,
              title: b.title ?? "—",
              author: b.author ?? "—",
              genre: b.genre || "—",
              borrowCount: Number(rawBorrows),        // ← direct, no division
              totalCopies: extra.totalCopies || 0,
              availableCopies: extra.availableCopies ?? 0,
              collection: extra.collection,
            };
          } else {
            // Fallback to raw values if book not found in local catalog
            return {
              rank: i + 1,
              title: b.title ?? "—",
              author: b.author ?? "—",
              genre: b.genre || "—",
              borrowCount: Number(rawBorrows),
              totalCopies: b.totalCopies || 0,
              availableCopies: b.availableCopies || 0,
              collection: undefined,
            };
          }
        });
        setTopBorrowed(corrected);
      } else {
        setTopBorrowedError(borrowedResult.error || "Failed to load top borrowed books");
      }

      // ── Copies by Status ──
      // Server now returns per-copy counts: available, borrowed, reserved, unavailable.
      if (statusResult.success) {
        const s = statusResult.data;
        const available   = Number(s.available   ?? 0);
        const borrowed    = Number(s.borrowed    ?? 0);
        const reserved    = Number(s.reserved    ?? 0);
        const unavailable = Number(s.unavailable ?? 0);

        setStatusData([
          { status: "Available",   count: available,   color: "#22c55e" },
          { status: "Borrowed",    count: borrowed,    color: "#EEA23A" },
          { status: "Reserved",    count: reserved,    color: "#6366f1" },
          { status: "Unavailable", count: unavailable, color: "#f43f5e" },
        ].filter(e => e.count > 0));
      } else {
        setStatusError(statusResult.error || "Failed to load status data");
      }

      // ── Client-side derived charts from books list ──
      if (booksResult.success) {
        const filtered = filterBooks(booksResult.data || [], filters);

        setGenreData(buildGenreData(filtered));
        setCollectionData(buildCollectionData(filtered));

        // FIX 8: grouping uses the corrected getISOWeek() inside buildArrivals
        const { arrivalsData, dataKey } = buildArrivals(filtered, period);
        setNewArrivals(arrivalsData);
        setArrivalsDataKey(dataKey);

        setLowStock(getLowStockBooks(filtered).slice(0, 20));
      } else {
        setGenreData([]);
        setCollectionData([]);
        setNewArrivals([]);
        setLowStock([]);
        // Do NOT clear statusData — it comes from statusResult, independent of booksResult
      }
    } catch (err) {
      // FIX 7: surface network/parse errors instead of leaving spinners frozen
      console.error("[useBookDashboardData] loadData error:", err);
      setStatusError("Failed to load dashboard data. Check network connection.");
      setTopBorrowedError("Failed to load top borrowed books.");
    } finally {
      // FIX 6: always clear spinners regardless of success or error
      setStatusLoading(false);
      setTopBorrowedLoading(false);
    }
  }, []); // stable — all values are passed in as arguments, not closed over

  // FIX 5: a single debounced-filter effect handles mount + changes, so
  // there is no double fetch on mount.
  const debouncedGlobalFilter = useDebounce(globalFilter, 300);

  useEffect(() => {
    loadData(debouncedGlobalFilter, arrivalsFilter);
  }, [debouncedGlobalFilter, arrivalsFilter, loadData]);

  // ── FIX D: stable reload for WebSocket callbacks ─────────────────────
  // The socket listener is registered once inside useWebSocket's useEffect
  // ([isAdmin] deps). An inline callback would close over stale filter
  // values, so the latest loader is kept in a ref and exposed through a
  // stable wrapper whose identity never changes.
  const latestLoadRef = useRef(null);
  latestLoadRef.current = () => {
    loadData(globalFilter, arrivalsFilter);
  };

  const reload = useCallback(() => {
    latestLoadRef.current?.();
  }, []);

  // Partial KPI merge for `stats:update` socket events.
  const applyStatsUpdate = useCallback((newStats) => {
    if (!newStats) return;
    setKpi(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        borrowedBooks: newStats.borrowed   ?? prev.borrowedBooks,
        overdueBooks:  newStats.overdue    ?? prev.overdueBooks,
        totalBooks:    newStats.nemcoTotal ?? prev.totalBooks,
      };
    });
  }, []);

  return {
    kpi,
    genreData,
    statusData,
    statusLoading,
    statusError,
    topBorrowed,
    topBorrowedLoading,
    topBorrowedError,
    collectionData,
    newArrivals,
    arrivalsDataKey,
    lowStock,
    reload,
    applyStatsUpdate,
  };
}
