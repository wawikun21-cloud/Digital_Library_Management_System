/**
 * features/attendance/utils/attendanceKpi.js
 *
 * Pure KPI derivations for the attendance dashboard. Extracted from the
 * component body of the former pages/AttendanceDashboard.jsx.
 */

import { LIBRARY_CAPACITY } from "../constants/attendancePalette";

const minutesToHM = mins => {
  const totalMins = Math.round(mins);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

/**
 * FIX I: guard all kpi field reads against both camelCase and snake_case.
 * MySQL returns snake_case by default; if the service doesn't alias them,
 * kpi.totalVisits is undefined and .toLocaleString() throws.
 */
export function formatKpiValues(kpi) {
  if (!kpi) {
    return {
      totalVisits:        "—",
      totalHours:         "—",
      avgDuration:        "—",
      peakHourLabel:      "—",
      peakHourSub:        "No data yet",
      mostActiveProgram:  "—",
      mostActiveSub:      "—",
    };
  }

  return {
    totalVisits: (kpi.totalVisits ?? kpi.total_visits ?? 0).toLocaleString(),
    // totalMinutes uses the same Math.round-then-split behaviour as the original
    totalHours:  minutesToHM(kpi.totalMinutes ?? kpi.total_minutes ?? 0),
    // avgDurationMinutes keeps its own rounding (m rounded, h floored)
    avgDuration: (() => {
      const mins = kpi.avgDurationMinutes ?? kpi.avg_duration_minutes ?? 0;
      const h = Math.floor(mins / 60);
      const m = Math.round(mins % 60);
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    })(),
    peakHourLabel:     kpi.peakHourLabel ?? kpi.peak_hour_label ?? "—",
    peakHourSub:       `${kpi.peakHourCount ?? kpi.peak_hour_count ?? 0} check-ins`,
    mostActiveProgram: kpi.mostActiveProgram ?? kpi.most_active_program ?? "—",
    mostActiveSub:     `${(kpi.mostActiveProgramVisits ?? kpi.most_active_program_visits ?? 0).toLocaleString()} visits`,
  };
}

/**
 * Count actively checked-in students that match the current filters
 * (program / year level / school year / date range on check_in_time).
 */
export function countFilteredActive(activeAttendance, filters = {}) {
  return activeAttendance.filter(rec => {
    if (filters.program !== "All" && rec.student_course !== filters.program) return false;
    if (filters.yrLevel !== "All" && rec.student_yr_level !== filters.yrLevel) return false;
    if (filters.schoolYear !== "All" && rec.school_year !== filters.schoolYear) return false;
    if (filters.dateFrom || filters.dateTo) {
      const checkInDate = new Date(rec.check_in_time).toISOString().split('T')[0];
      if (filters.dateFrom && checkInDate < filters.dateFrom) return false;
      if (filters.dateTo && checkInDate > filters.dateTo) return false;
    }
    return true;
  }).length;
}

/** Occupancy display values against LIBRARY_CAPACITY. */
export function buildOccupancy(filteredActiveCount) {
  const occupancyPct   = LIBRARY_CAPACITY > 0 ? Math.round((filteredActiveCount / LIBRARY_CAPACITY) * 100) : 0;
  const occupancyValue = LIBRARY_CAPACITY > 0 ? `${filteredActiveCount}/${LIBRARY_CAPACITY}` : `${filteredActiveCount}`;
  const occupancySub   = LIBRARY_CAPACITY > 0 ? `${occupancyPct}% capacity` : undefined;
  return { occupancyValue, occupancySub };
}
