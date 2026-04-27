// ─────────────────────────────────────────────────────────
//  services/api/attendanceApi.js
//
//  FIXES IN THIS FILE:
//
//  FIX 1 — normaliseDashboardStats()
//    The attendanceController passes result.data straight through from
//    AttendanceModel.getDashboardStats(). The model runs raw SQL that
//    returns MySQL snake_case column names unless explicitly aliased.
//    The component guards with `kpi.totalVisits ?? kpi.total_visits`
//    but this is fragile and only works because of the fallback.
//    Normalise in the API layer so the component reads ONE field name.
//
//  FIX 2 — normaliseOtherInsights()
//    The component reads: longestSession, longestSub, busiestDay, busiestSub,
//    consistentUser, consistentSub, freshmenCount, freshmenSub.
//    If the model returns snake_case (longest_session, busiest_day, etc.)
//    all four cards show "—". This normaliser maps both cases so it works
//    regardless of whether the model uses snake_case or camelCase.
//
//  FIX 3 — sessionTotal path:
//    CONFIRMED from attendanceController.getSessionDistribution:
//      res.json({ success, data: result.data, totalVisits: result.totalVisits })
//    So totalVisits is at the TOP LEVEL of the response, not inside data.
//    The component does: sessData.totalVisits where sessData = val(sessRes)
//    = the full response object. This is CORRECT — no fix needed in the component.
//    Documented here for clarity.
// ─────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || "";

function buildFilterParams(filters = {}) {
  const p = new URLSearchParams();
  if (filters.program    && filters.program    !== "All") p.set("program",    filters.program);
  if (filters.yrLevel    && filters.yrLevel    !== "All") p.set("yrLevel",    filters.yrLevel);
  if (filters.schoolYear && filters.schoolYear !== "All") p.set("schoolYear", filters.schoolYear);
  if (filters.dateFrom)  p.set("dateFrom", filters.dateFrom);
  if (filters.dateTo)    p.set("dateTo",   filters.dateTo);
  return p.toString();
}

const withCreds = (opts = {}) => ({
  ...opts,
  credentials: "include",
  headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
});

// ── FIX 1: Normalise dashboard KPI stats ──────────────────────────────────────
// Maps snake_case MySQL field names → camelCase names the component reads.
// Handles both cases so it works even if the model uses explicit SQL aliases.
function normaliseDashboardStats(result) {
  if (!result.success || !result.data) return result;
  const d = result.data;
  return {
    ...result,
    data: {
      // Total visits
      totalVisits:            d.totalVisits            ?? d.total_visits            ?? 0,
      // Total duration in minutes
      totalMinutes:           d.totalMinutes           ?? d.total_minutes           ?? 0,
      // Average session duration in minutes
      avgDurationMinutes:     d.avgDurationMinutes     ?? d.avg_duration_minutes    ?? 0,
      // Peak hour display label (e.g. "10:00 AM")
      peakHourLabel:          d.peakHourLabel          ?? d.peak_hour_label         ?? "—",
      // How many check-ins at peak hour
      peakHourCount:          d.peakHourCount          ?? d.peak_hour_count         ?? 0,
      // Most active program name
      mostActiveProgram:      d.mostActiveProgram      ?? d.most_active_program     ?? "—",
      // Visit count for most active program
      mostActiveProgramVisits: d.mostActiveProgramVisits ?? d.most_active_program_visits ?? 0,
    },
  };
}

// ── FIX 2: Normalise other insights ──────────────────────────────────────────
// The component reads camelCase field names. If the model returns snake_case,
// all four insight cards show "—". This maps both variants.
function normaliseOtherInsights(result) {
  if (!result.success || !result.data) return result;
  const d = result.data;
  return {
    ...result,
    data: {
      // Longest session today
      longestSession: d.longestSession ?? d.longest_session  ?? "—",
      longestSub:     d.longestSub     ?? d.longest_sub      ?? "—",
      // Busiest day of the week
      busiestDay:     d.busiestDay     ?? d.busiest_day      ?? "—",
      busiestSub:     d.busiestSub     ?? d.busiest_sub      ?? "—",
      // Most consistent user
      consistentUser: d.consistentUser ?? d.consistent_user  ?? "—",
      consistentSub:  d.consistentSub  ?? d.consistent_sub   ?? "—",
      // Unique students this month (labelled "freshmenCount" in component)
      freshmenCount:  d.freshmenCount  ?? d.freshmen_count   ?? d.unique_students   ?? d.uniqueStudents  ?? "—",
      freshmenSub:    d.freshmenSub    ?? d.freshmen_sub     ?? d.unique_students_sub ?? "—",
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// API functions
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllAttendance() {
  try {
    const res = await fetch(`${API_BASE}/api/attendance`, withCreds());
    return await res.json();
  } catch (error) {
    console.error("[attendanceApi.getAllAttendance]", error);
    return { success: false, error: error.message };
  }
}

export async function getActiveAttendance() {
  try {
    const res = await fetch(`${API_BASE}/api/attendance/active`, withCreds());
    return await res.json();
  } catch (error) {
    console.error("[attendanceApi.getActiveAttendance]", error);
    return { success: false, error: error.message };
  }
}

export async function getAttendanceByStudentId(studentIdNumber) {
  try {
    const res = await fetch(`${API_BASE}/api/attendance/student/${studentIdNumber}`, withCreds());
    return await res.json();
  } catch (error) {
    console.error("[attendanceApi.getAttendanceByStudentId]", error);
    return { success: false, error: error.message };
  }
}

export async function getAllLowUsageStudents() {
  try {
    const res = await fetch(`${API_BASE}/api/attendance/all-low-usage-students`, withCreds());
    return await res.json();
  } catch (error) {
    console.error("[attendanceApi.getAllLowUsageStudents]", error);
    return { success: false, error: error.message };
  }
}

export async function getLowUsageStudents(filters = {}) {
  try {
    const qs = buildFilterParams(filters);
    const res = await fetch(`${API_BASE}/api/attendance/low-usage-students${qs ? `?${qs}` : ""}`, withCreds());
    return await res.json();
  } catch (error) {
    console.error("[attendanceApi.getLowUsageStudents]", error);
    return { success: false, error: error.message };
  }
}

// FIX 3: Confirmed — totalVisits is at TOP LEVEL of response, not inside data.
// { success, data: [...buckets], totalVisits: N }
// The component reads sessData.totalVisits where sessData = the full response.
// No change needed here — returned as-is.
export async function getSessionDistribution(filters = {}) {
  try {
    const qs = buildFilterParams(filters);
    const res = await fetch(`${API_BASE}/api/attendance/session-distribution${qs ? `?${qs}` : ""}`, withCreds());
    return await res.json();
  } catch (error) {
    console.error("[attendanceApi.getSessionDistribution]", error);
    return { success: false, error: error.message };
  }
}

// FIX 2: normalise other insights so camelCase fields are always present
export async function getOtherInsights(filters = {}) {
  try {
    const qs = buildFilterParams(filters);
    const res = await fetch(`${API_BASE}/api/attendance/other-insights${qs ? `?${qs}` : ""}`, withCreds());
    const json = await res.json();
    return normaliseOtherInsights(json);
  } catch (error) {
    console.error("[attendanceApi.getOtherInsights]", error);
    return { success: false, error: error.message };
  }
}

export async function getVisitsOverTime(groupBy = "Daily", filters = {}) {
  try {
    const qs = buildFilterParams(filters);
    const base = `${API_BASE}/api/attendance/visits-over-time?groupBy=${encodeURIComponent(groupBy)}`;
    const res = await fetch(qs ? `${base}&${qs}` : base, withCreds());
    return await res.json();
  } catch (error) {
    console.error("[attendanceApi.getVisitsOverTime]", error);
    return { success: false, error: error.message };
  }
}

export async function getPeakHours(filters = {}) {
  try {
    const qs = buildFilterParams(filters);
    const res = await fetch(`${API_BASE}/api/attendance/peak-hours${qs ? `?${qs}` : ""}`, withCreds());
    return await res.json();
  } catch (error) {
    console.error("[attendanceApi.getPeakHours]", error);
    return { success: false, error: error.message };
  }
}

export async function getVisitsByDay(filters = {}) {
  try {
    const qs = buildFilterParams(filters);
    const res = await fetch(`${API_BASE}/api/attendance/visits-by-day${qs ? `?${qs}` : ""}`, withCreds());
    return await res.json();
  } catch (error) {
    console.error("[attendanceApi.getVisitsByDay]", error);
    return { success: false, error: error.message };
  }
}

export async function getAllTopStudents() {
  try {
    const res = await fetch(`${API_BASE}/api/attendance/all-top-students`, withCreds());
    return await res.json();
  } catch (error) {
    console.error("[attendanceApi.getAllTopStudents]", error);
    return { success: false, error: error.message };
  }
}

export async function getTopStudents(filters = {}) {
  try {
    const qs = buildFilterParams(filters);
    const res = await fetch(`${API_BASE}/api/attendance/top-students${qs ? `?${qs}` : ""}`, withCreds());
    return await res.json();
  } catch (error) {
    console.error("[attendanceApi.getTopStudents]", error);
    return { success: false, error: error.message };
  }
}

export async function getProgramUsage(filters = {}) {
  try {
    const qs = buildFilterParams(filters);
    const res = await fetch(`${API_BASE}/api/attendance/program-usage${qs ? `?${qs}` : ""}`, withCreds());
    return await res.json();
  } catch (error) {
    console.error("[attendanceApi.getProgramUsage]", error);
    return { success: false, error: error.message };
  }
}

// FIX 1: normalise dashboard KPI stats to camelCase
export async function getAttendanceDashboardStats(filters = {}) {
  try {
    const qs = buildFilterParams(filters);
    const res = await fetch(`${API_BASE}/api/attendance/dashboard-stats${qs ? `?${qs}` : ""}`, withCreds());
    const json = await res.json();
    return normaliseDashboardStats(json);
  } catch (error) {
    console.error("[attendanceApi.getAttendanceDashboardStats]", error);
    return { success: false, error: error.message };
  }
}

export async function getSchoolYears() {
  try {
    const res = await fetch(`${API_BASE}/api/attendance/school-years`, withCreds());
    return await res.json();
  } catch (error) {
    console.error("[attendanceApi.getSchoolYears]", error);
    return { success: false, error: error.message };
  }
}

export async function getAttendanceStats() {
  try {
    const res = await fetch(`${API_BASE}/api/attendance/stats`, withCreds());
    return await res.json();
  } catch (error) {
    console.error("[attendanceApi.getAttendanceStats]", error);
    return { success: false, error: error.message };
  }
}

export async function tapAttendance(studentIdNumber) {
  try {
    const res = await fetch(
      `${API_BASE}/api/attendance/tap/${encodeURIComponent(studentIdNumber)}`,
      withCreds({ method: "POST" })
    );
    return await res.json();
  } catch (error) {
    console.error("[attendanceApi.tapAttendance]", error);
    return { success: false, error: error.message };
  }
}

export async function checkIn(attendanceData) {
  try {
    const res = await fetch(
      `${API_BASE}/api/attendance/check-in`,
      withCreds({ method: "POST", body: JSON.stringify(attendanceData) })
    );
    return await res.json();
  } catch (error) {
    console.error("[attendanceApi.checkIn]", error);
    return { success: false, error: error.message };
  }
}

export async function checkOut(studentIdNumber) {
  try {
    const res = await fetch(
      `${API_BASE}/api/attendance/check-out/${studentIdNumber}`,
      withCreds({ method: "POST" })
    );
    return await res.json();
  } catch (error) {
    console.error("[attendanceApi.checkOut]", error);
    return { success: false, error: error.message };
  }
}

export async function deleteAttendance(id) {
  try {
    const res = await fetch(
      `${API_BASE}/api/attendance/${id}`,
      withCreds({ method: "DELETE" })
    );
    return await res.json();
  } catch (error) {
    console.error("[attendanceApi.deleteAttendance]", error);
    return { success: false, error: error.message };
  }
}

export default {
  getAllAttendance,
  getActiveAttendance,
  getAttendanceByStudentId,
  getAttendanceDashboardStats,
  getTopStudents,
  getAllTopStudents,
  getProgramUsage,
  getVisitsOverTime,
  getPeakHours,
  getVisitsByDay,
  getLowUsageStudents,
  getAllLowUsageStudents,
  getSessionDistribution,
  getOtherInsights,
  getAttendanceStats,
  getSchoolYears,
  tapAttendance,
  checkIn,
  checkOut,
  deleteAttendance,
};