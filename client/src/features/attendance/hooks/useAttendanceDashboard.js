/**
 * features/attendance/hooks/useAttendanceDashboard.js
 *
 * Data hook for the attendance dashboard. Owns everything the former
 * pages/AttendanceDashboard.jsx kept in its component body: all data state,
 * fetchAllData (FIX G), the WS-stable refetch (FIX H), and the load/filter
 * effects. The page only holds filter and modal state.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useWebSocket } from "../../../hooks/useWebsocket";
import {
  getAttendanceDashboardStats, getTopStudents,
  getProgramUsage, getVisitsOverTime, getPeakHours, getVisitsByDay,
  getLowUsageStudents, getSessionDistribution, getOtherInsights,
  getActiveAttendance, getSchoolYears,
} from "../../../services/api/attendanceApi";
import { getCurrentSchoolYear } from "../../../utils/schoolYearUtils";

const CURRENT_SY = getCurrentSchoolYear();

/**
 * @param {object}   params
 * @param {object}   params.globalFilter       { program, yrLevel, schoolYear, dateFrom, dateTo }
 * @param {string}   params.visitsFilter       "Daily" | "Weekly" | "Monthly"
 * @param {Function} params.onSchoolYearChange Page-owned filter patch: (schoolYear) => void
 */
export function useAttendanceDashboard({ globalFilter, visitsFilter, onSchoolYearChange }) {
  const [kpi, setKpi]                       = useState(null);
  const [topStudents, setTopStudents]       = useState([]);
  const [programData, setProgramData]       = useState([]);
  const [visitsOverTime, setVisitsOverTime] = useState([]);
  const [peakHours, setPeakHours]           = useState([]);
  const [visitsByDay, setVisitsByDay]       = useState([]);
  const [lowUsage, setLowUsage]             = useState([]);
  const [sessionDist, setSessionDist]       = useState([]);
  const [sessionTotal, setSessionTotal]     = useState(0);
  const [otherInsights, setOtherInsights]   = useState(null);
  const [activeAttendance, setActiveAttendance] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);

  // ── FIX G: fetchAllData no longer closes over `gf` at definition time.
  // Every call site must pass the current filter value explicitly.
  // useCallback with [] keeps the function identity stable (needed for WS).
  const fetchAllData = useCallback(async (filters) => {
    await Promise.all([
      getAttendanceDashboardStats(filters).then(res => {
        if (res.success) setKpi(res.data ?? null);
      }).catch(() => setKpi(null)),

      getTopStudents(filters).then(res => {
        if (res.success) setTopStudents(Array.isArray(res.data) ? res.data : []);
      }).catch(() => setTopStudents([])),

      getProgramUsage(filters).then(res => {
        if (res.success) setProgramData(Array.isArray(res.data) ? res.data : []);
      }).catch(() => setProgramData([])),

      getPeakHours(filters).then(res => {
        if (res.success) setPeakHours(Array.isArray(res.data) ? res.data : []);
      }).catch(() => setPeakHours([])),

      getVisitsByDay(filters).then(res => {
        if (res.success) setVisitsByDay(Array.isArray(res.data) ? res.data : []);
      }).catch(() => setVisitsByDay([])),

      getLowUsageStudents(filters).then(res => {
        if (res.success) setLowUsage(Array.isArray(res.data) ? res.data : []);
      }).catch(() => setLowUsage([])),

      getSessionDistribution(filters).then(res => {
        if (res.success) {
          setSessionDist(Array.isArray(res.data) ? res.data : []);
          const total = res.totalVisits ??
                        (res.data && typeof res.data === 'object' && 'totalVisits' in res.data
                          ? res.data.totalVisits
                          : 0);
          setSessionTotal(total);
        }
      }).catch(() => { setSessionDist([]); setSessionTotal(0); }),

      getOtherInsights(filters).then(res => {
        if (res.success) setOtherInsights(res.data ?? null);
      }).catch(() => setOtherInsights(null)),

      getActiveAttendance().then(res => {
        if (res.success && Array.isArray(res.data)) {
          setActiveAttendance(res.data);
        } else {
          setActiveAttendance([]);
        }
      }).catch(() => setActiveAttendance([])),

      getSchoolYears().then(res => {
        if (res.success && Array.isArray(res.data)) {
          setAvailableYears(res.data);
        } else {
          setAvailableYears([]);
        }
      }).catch(() => setAvailableYears([])),
    ]);
  }, []);

  // ── FIX H: ref-based stable wrapper so the WS handler always calls with
  // the current globalFilter and visitsFilter, not their values at mount.
  const latestRefetchRef = useRef(null);
  latestRefetchRef.current = useCallback(async () => {
    setKpi(null);
    await fetchAllData(globalFilter);
    getVisitsOverTime(visitsFilter, globalFilter).then(res => {
      if (res.success && Array.isArray(res.data) && res.data.length > 0) setVisitsOverTime(res.data);
    });
  }, [fetchAllData, globalFilter, visitsFilter]);

  // Stable WS callback — identity never changes, so useWebSocket never reconnects
  const stableRefetch = useCallback(() => {
    latestRefetchRef.current?.();
  }, []);

  useWebSocket({
    isAdmin: false,
    onAttendanceUpdate: (payload) => {
      console.log("[WS] Attendance update:", payload?.action, payload?.data);
      stableRefetch();
    },
  });

  // ── Stable serialised key for globalFilter so effects only re-run when
  // values actually change, not when the object gets a new reference.
  // JSON.stringify is safe here because globalFilter only contains primitives.
  const globalFilterKey = JSON.stringify(globalFilter);

  // ── Single effect for initial load + filter changes ───────────────────────
  // Using globalFilterKey (a string) instead of globalFilter (an object)
  // prevents the effect from firing on every render when the object reference
  // changes but the values are identical — which was the source of the flood.
  // The separate initial-load effect is removed to prevent the double-fetch
  // on mount that was also causing duplicate API calls.
  useEffect(() => {
    const filters = JSON.parse(globalFilterKey);
    setKpi(null);
    fetchAllData(filters);
    getVisitsOverTime(visitsFilter, filters).then(res => {
      if (res.success && Array.isArray(res.data)) {
        setVisitsOverTime(res.data.length > 0 ? res.data : []);
      } else {
        setVisitsOverTime([]);
      }
    }).catch(() => setVisitsOverTime([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalFilterKey]);

  // Re-fetch visits over time when groupBy changes (filter unchanged)
  useEffect(() => {
    const filters = JSON.parse(globalFilterKey);
    getVisitsOverTime(visitsFilter, filters).then(res => {
      if (res.success && Array.isArray(res.data)) {
        setVisitsOverTime(res.data.length > 0 ? res.data : []);
      } else {
        setVisitsOverTime([]);
      }
    }).catch(() => setVisitsOverTime([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitsFilter]);

  // Auto-select current school year once availableYears loads.
  // Falls back to "All" if the previously selected year is no longer in the list.
  // Runs only when availableYears changes — NOT on every globalFilter change.
  // Writes go through onSchoolYearChange so the filter state stays page-owned.
  const didAutoSelectYear = useRef(false);
  useEffect(() => {
    if (availableYears.length === 0) return;

    if (!didAutoSelectYear.current && globalFilter.schoolYear === "All" && availableYears.includes(CURRENT_SY)) {
      didAutoSelectYear.current = true;
      onSchoolYearChange(CURRENT_SY);
    } else if (!availableYears.includes(globalFilter.schoolYear) && globalFilter.schoolYear !== "All") {
      onSchoolYearChange("All");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableYears]);

  // Program options for the filter bar: known programs (minus "Others"),
  // sorted, with "Others" always last. The bar prepends its own "All".
  const programOptions = useMemo(
    () => [...Array.from(new Set(programData.map(p => p.program).filter(p => p !== "Others"))).sort(), "Others"],
    [programData]
  );

  return {
    kpi,
    topStudents,
    programData,
    visitsOverTime,
    peakHours,
    visitsByDay,
    lowUsage,
    sessionDist,
    sessionTotal,
    otherInsights,
    activeAttendance,
    availableYears,
    programOptions,
  };
}
