/**
 * client/src/hooks/useDashboard.js
 *
 * Central data hook for the Dashboard page.
 * ALL datasets — KPIs, charts, and holdings — re-fetch whenever
 * the active filter (schoolYear / semester / month) changes.
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

  // ── Load ALL data — always filter-dependent ────────────────────────────
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
      fetchMostBorrowed(filters),
      fetchAttendance(filters),
      fetchFines(filters),
      fetchOverdue(filters),
      fetchHoldingsBreakdown(filters),
    ]);

    if (cancelRef.current) return;

    // ── KPI stats ──
    if (statsResult.success) {
      setData(prev => ({ ...prev, kpiStats: statsResult.data }));
    } else {
      setErrors(prev => ({ ...prev, kpiStats: statsResult.error || "Failed to load stats" }));
    }

    // ── Charts ──
    setData(prev => ({
      ...prev,
      mostBorrowed: borResult.success  ? borResult.data   : prev.mostBorrowed,
      attendance:   attResult.success  ? attResult.data   : prev.attendance,
      fines:        fineResult.success ? fineResult.data  : prev.fines,
      overdue:      overdResult.success? overdResult.data : prev.overdue,
    }));
    setErrors(prev => ({
      ...prev,
      mostBorrowed: borResult.success  ? null : (borResult.error   || "Failed"),
      attendance:   attResult.success  ? null : (attResult.error   || "Failed"),
      fines:        fineResult.success ? null : (fineResult.error  || "Failed"),
      overdue:      overdResult.success? null : (overdResult.error || "Failed"),
    }));

    // ── Holdings breakdown ──
    if (holdResult.success) {
      const payload = holdResult.data || {};
      setData(prev => ({
        ...prev,
        holdingsBreakdown: {
          data:      Array.isArray(payload.data)  ? payload.data  : [],
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

  // ── Re-fetch whenever any filter changes ──────────────────────────────
  useEffect(() => {
    cancelRef.current = false;
    loadAll({ schoolYear, semester, month });
    return () => { cancelRef.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolYear, semester, month]);

  /** Called by WebSocket when server pushes a stats:update event */
  function updateKpiStats(newStats) {
    setData(prev => ({ ...prev, kpiStats: newStats }));
  }

  /** Manual full refresh */
  function refresh() {
    loadAll({ schoolYear, semester, month });
  }

  // Expose loading flags compatible with existing Dashboard consumers
  const loadingCompat = {
    kpiStats:          loading.all,
    charts:            loading.all,
    holdingsBreakdown: loading.all,
  };

  return {
    ...data,
    loading: loadingCompat,
    errors,
    refresh,
    updateKpiStats,
  };
}