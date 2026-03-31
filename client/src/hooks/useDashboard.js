/**
 * client/src/hooks/useDashboard.js
 *
 * Central data hook for the Dashboard page.
 * Fetches all chart datasets + KPI stats whenever the active
 * filter (schoolYear / semester / month) changes.
 *
 * Returns:
 *   { kpiStats, mostBorrowed, attendance, fines, overdue,
 *     loading, errors, refresh }
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchBookStats,
  fetchMostBorrowed,
  fetchAttendance,
  fetchFines,
  fetchOverdue,
} from "../services/api/analyticsApi";

const INITIAL_STATE = {
  kpiStats:     null,
  mostBorrowed: [],
  attendance:   [],
  fines:        [],
  overdue:      [],
};

const INITIAL_ERRORS = {
  kpiStats:     null,
  mostBorrowed: null,
  attendance:   null,
  fines:        null,
  overdue:      null,
};

export function useDashboard({ schoolYear, semester, month }) {
  const [data,    setData]    = useState(INITIAL_STATE);
  const [loading, setLoading] = useState({
    kpiStats: true, charts: true,
  });
  const [errors,  setErrors]  = useState(INITIAL_ERRORS);

  // Avoid stale-closure issues when filters change mid-flight
  const cancelRef = useRef(false);

  const filters = { schoolYear, semester, month };

  // ── KPI stats (not filter-dependent — always totals) ──────────────────
  const loadKpiStats = useCallback(async () => {
    cancelRef.current = false;
    setLoading(prev => ({ ...prev, kpiStats: true }));
    setErrors(prev  => ({ ...prev, kpiStats: null  }));

    const result = await fetchBookStats();

    if (cancelRef.current) return;

    if (result.success) {
      setData(prev => ({ ...prev, kpiStats: result.data }));
    } else {
      setErrors(prev => ({ ...prev, kpiStats: result.error || "Failed to load stats" }));
    }
    setLoading(prev => ({ ...prev, kpiStats: false }));
  }, []);

  // ── Chart datasets (filter-dependent) ─────────────────────────────────
  const loadCharts = useCallback(async (f) => {
    cancelRef.current = false;
    setLoading(prev => ({ ...prev, charts: true }));
    setErrors(prev  => ({
      ...prev,
      mostBorrowed: null,
      attendance:   null,
      fines:        null,
      overdue:      null,
    }));

    const [borResult, attResult, fineResult, overdResult] = await Promise.all([
      fetchMostBorrowed(f),
      fetchAttendance(f),
      fetchFines(f),
      fetchOverdue(f),
    ]);

    if (cancelRef.current) return;

    setData(prev => ({
      ...prev,
      mostBorrowed: borResult.success  ? borResult.data  : prev.mostBorrowed,
      attendance:   attResult.success  ? attResult.data  : prev.attendance,
      fines:        fineResult.success ? fineResult.data : prev.fines,
      overdue:      overdResult.success? overdResult.data: prev.overdue,
    }));

    setErrors(prev => ({
      ...prev,
      mostBorrowed: borResult.success  ? null : (borResult.error  || "Failed"),
      attendance:   attResult.success  ? null : (attResult.error  || "Failed"),
      fines:        fineResult.success ? null : (fineResult.error || "Failed"),
      overdue:      overdResult.success? null : (overdResult.error|| "Failed"),
    }));

    setLoading(prev => ({ ...prev, charts: false }));
  }, []);

  // ── Initial KPI load ───────────────────────────────────────────────────
  useEffect(() => {
    loadKpiStats();
    return () => { cancelRef.current = true; };
  }, [loadKpiStats]);

  // ── Reload charts whenever filters change ─────────────────────────────
  useEffect(() => {
    loadCharts(filters);
    return () => { cancelRef.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolYear, semester, month]);

  /** Called by WebSocket hook when server pushes a stats:update event */
  function updateKpiStats(newStats) {
    setData(prev => ({ ...prev, kpiStats: newStats }));
  }

  /** Manual full refresh (e.g. pull-to-refresh) */
  function refresh() {
    loadKpiStats();
    loadCharts(filters);
  }

  return {
    ...data,
    loading,
    errors,
    refresh,
    updateKpiStats,
  };
}