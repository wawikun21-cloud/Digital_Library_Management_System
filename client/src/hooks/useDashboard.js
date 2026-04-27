/**
 * client/src/hooks/useDashboard.js
 *
 * FIXES IN THIS FILE:
 *
 * FIX 1 — mostBorrowedTotal was missing from INITIAL_STATE and from the
 *   return value, causing Dashboard.jsx to reference an undeclared variable
 *   (ReferenceError). Now initialised to 0 and exposed in the return.
 *
 * FIX 2 — borResult.totalBorrows: CONFIRMED from analyticsService.getMostBorrowed()
 *   that totalBorrows is returned at the TOP LEVEL of the response object
 *   (not inside result.data). The analyticsApi.fetchMostBorrowed now normalises
 *   the rows and passes totalBorrows through at the top level, so
 *   borResult.totalBorrows is the correct path. This was already correct in
 *   the previous version but is now confirmed against the server source.
 *
 * FIX 3 — kpiStats field names: CONFIRMED from analyticsService.getBookStats()
 *   that ALL fields are explicitly returned as camelCase:
 *     nemcoTotal, lexoraTotal, nemcoOutOfStock, returned, borrowed, overdue,
 *     totalBooks, totalCopies, availableCopies, borrowedBooks, overdueBooks, addedThisMonth
 *   NO normalisation needed here. Dashboard.jsx destructures these correctly.
 *
 * FIX 4 — holdingsBreakdown shape: CONFIRMED from analyticsController.getHoldingsBreakdown:
 *   server sends { success, data: { data: [...rows], maxNemco, maxLexora } }
 *   So holdResult.data is the wrapper object and holdResult.data.data is the rows array.
 *   This was already handled correctly. Confirmed and documented.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchBookStats,
  fetchMostBorrowed,
  fetchAttendance,
  fetchFines,
  fetchOverdue,
  fetchHoldingsBreakdown,
} from "../services/api/analyticsApi";

const INITIAL_STATE = {
  kpiStats:          null,
  mostBorrowed:      [],
  mostBorrowedTotal: 0,   // FIX 1: was missing — caused ReferenceError in Dashboard.jsx
  attendance:        [],
  fines:             [],
  overdue:           [],
  holdingsBreakdown: { data: [], maxNemco: 1, maxLexora: 1 },
};

const INITIAL_ERRORS = {
  kpiStats:          null,
  mostBorrowed:      null,
  attendance:        null,
  fines:             null,
  overdue:           null,
  holdingsBreakdown: null,
};

export function useDashboard({ schoolYear, semester, month }) {
  const [data,    setData]    = useState(INITIAL_STATE);
  const [loading, setLoading] = useState({ all: true });
  const [errors,  setErrors]  = useState(INITIAL_ERRORS);

  const cancelRef = useRef(false);

  const loadAll = useCallback(async (filters) => {
    cancelRef.current = false;
    setLoading({ all: true });
    setErrors(INITIAL_ERRORS);

    const [
      statsResult,
      borResult,
      attResult,
      fineResult,
      overdResult,
      holdResult,
    ] = await Promise.all([
      fetchBookStats(filters),
      fetchMostBorrowed(filters),   // analyticsApi normalises rows + passes totalBorrows through
      fetchAttendance(filters),
      fetchFines(filters),
      fetchOverdue(filters),
      fetchHoldingsBreakdown(filters),
    ]);

    if (cancelRef.current) return;

    // ── KPI stats ──
    // CONFIRMED: all fields already camelCase from server (nemcoTotal, lexoraTotal, etc.)
    if (statsResult.success) {
      setData(prev => ({ ...prev, kpiStats: statsResult.data }));
    } else {
      setErrors(prev => ({ ...prev, kpiStats: statsResult.error || "Failed to load stats" }));
    }

    // ── Charts ──
    setData(prev => ({
      ...prev,
      mostBorrowed:      borResult.success   ? borResult.data              : prev.mostBorrowed,
      // FIX 2: totalBorrows is at TOP LEVEL of borResult (confirmed from server).
      // analyticsApi.fetchMostBorrowed passes it through after normalisation.
      mostBorrowedTotal: borResult.success   ? (borResult.totalBorrows || 0) : prev.mostBorrowedTotal,
      attendance:        attResult.success   ? attResult.data              : prev.attendance,
      fines:             fineResult.success  ? fineResult.data             : prev.fines,
      overdue:           overdResult.success ? overdResult.data            : prev.overdue,
    }));

    setErrors(prev => ({
      ...prev,
      mostBorrowed: borResult.success   ? null : (borResult.error   || "Failed"),
      attendance:   attResult.success   ? null : (attResult.error   || "Failed"),
      fines:        fineResult.success  ? null : (fineResult.error  || "Failed"),
      overdue:      overdResult.success ? null : (overdResult.error || "Failed"),
    }));

    // ── Holdings breakdown ──
    // CONFIRMED: server response is { success, data: { data: [...], maxNemco, maxLexora } }
    if (holdResult.success) {
      const payload = holdResult.data || {};
      setData(prev => ({
        ...prev,
        holdingsBreakdown: {
          data:      Array.isArray(payload.data) ? payload.data  : [],
          maxNemco:  Number(payload.maxNemco)  || 1,
          maxLexora: Number(payload.maxLexora) || 1,
        },
      }));
    } else {
      setErrors(prev => ({
        ...prev,
        holdingsBreakdown: holdResult.error || "Failed to load holdings",
      }));
    }

    setLoading({ all: false });
  }, []);

  useEffect(() => {
    cancelRef.current = false;
    loadAll({ schoolYear, semester, month });
    return () => { cancelRef.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolYear, semester, month]);

  function updateKpiStats(newStats) {
    setData(prev => ({ ...prev, kpiStats: newStats }));
  }

  function refresh() {
    loadAll({ schoolYear, semester, month });
  }

  const loadingCompat = {
    kpiStats:          loading.all,
    charts:            loading.all,
    holdingsBreakdown: loading.all,
  };

  return {
    ...data,           // spreads kpiStats, mostBorrowed, mostBorrowedTotal, attendance, fines, overdue, holdingsBreakdown
    loading: loadingCompat,
    errors,
    refresh,
    updateKpiStats,
  };
}