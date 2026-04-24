// ─────────────────────────────────────────────────────────
//  services/api/attendanceApi.js
//  Attendance API Service - Frontend API calls for attendance
// ─────────────────────────────────────────────────────────

// Empty string → same-origin → Vite proxy forwards to server (cookie sent correctly)
const API_BASE = import.meta.env.VITE_API_URL || "";

/** Build query string from global filter object */
function buildFilterParams(filters = {}) {
  const p = new URLSearchParams();
  if (filters.program    && filters.program    !== "All") p.set("program",    filters.program);
  if (filters.yrLevel    && filters.yrLevel    !== "All") p.set("yrLevel",    filters.yrLevel);
  if (filters.schoolYear && filters.schoolYear !== "All") p.set("schoolYear", filters.schoolYear);
  if (filters.dateFrom)  p.set("dateFrom", filters.dateFrom);
  if (filters.dateTo)    p.set("dateTo",   filters.dateTo);
  return p.toString();
}

/** Shared fetch options — always send the session cookie */
const withCreds = (opts = {}) => ({
  ...opts,
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
  },
});

/** GET /api/attendance — all records */
export async function getAllAttendance() {
  try {
    const res = await fetch(`${API_BASE}/api/attendance`, withCreds());
    return await res.json();
  } catch (error) {
    console.error("[attendanceApi.getAllAttendance]", error);
    return { success: false, error: error.message };
  }
}

/** GET /api/attendance/active — currently checked-in students */
export async function getActiveAttendance() {
  try {
    const res = await fetch(`${API_BASE}/api/attendance/active`, withCreds());
    return await res.json();
  } catch (error) {
    console.error("[attendanceApi.getActiveAttendance]", error);
    return { success: false, error: error.message };
  }
}

/** GET /api/attendance/student/:id — history for one student */
export async function getAttendanceByStudentId(studentIdNumber) {
  try {
    const res = await fetch(
      `${API_BASE}/api/attendance/student/${studentIdNumber}`,
      withCreds()
    );
    return await res.json();
  } catch (error) {
    console.error("[attendanceApi.getAttendanceByStudentId]", error);
    return { success: false, error: error.message };
  }
}

/** GET /api/attendance/all-low-usage-students — full list for modal */
export async function getAllLowUsageStudents() {
  try {
    const res = await fetch(`${API_BASE}/api/attendance/all-low-usage-students`, withCreds());
    return await res.json();
  } catch (error) {
    console.error("[attendanceApi.getAllLowUsageStudents]", error);
    return { success: false, error: error.message };
  }
}

/** GET /api/attendance/low-usage-students */
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

/** GET /api/attendance/session-distribution */
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

/** GET /api/attendance/other-insights */
export async function getOtherInsights(filters = {}) {
  try {
    const qs = buildFilterParams(filters);
    const res = await fetch(`${API_BASE}/api/attendance/other-insights${qs ? `?${qs}` : ""}`, withCreds());
    return await res.json();
  } catch (error) {
    console.error("[attendanceApi.getOtherInsights]", error);
    return { success: false, error: error.message };
  }
}

/** GET /api/attendance/visits-over-time?groupBy=Daily|Weekly|Monthly */
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

/** GET /api/attendance/peak-hours */
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

/** GET /api/attendance/visits-by-day */
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

/** GET /api/attendance/all-top-students — full ranked list for modal */
export async function getAllTopStudents() {
  try {
    const res = await fetch(`${API_BASE}/api/attendance/all-top-students`, withCreds());
    return await res.json();
  } catch (error) {
    console.error("[attendanceApi.getAllTopStudents]", error);
    return { success: false, error: error.message };
  }
}

/** GET /api/attendance/top-students — top 50 by total hours */
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

/** GET /api/attendance/program-usage — visits/hours grouped by program */
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

/** GET /api/attendance/dashboard-stats — KPI stats for AttendanceDashboard */
export async function getAttendanceDashboardStats(filters = {}) {
  try {
    const qs = buildFilterParams(filters);
    const res = await fetch(`${API_BASE}/api/attendance/dashboard-stats${qs ? `?${qs}` : ""}`, withCreds());
    return await res.json();
  } catch (error) {
    console.error("[attendanceApi.getAttendanceDashboardStats]", error);
    return { success: false, error: error.message };
  }
}

/** GET /api/attendance/school-years → distinct school years with data */
export async function getSchoolYears() {
  try {
    const res = await fetch(`${API_BASE}/api/attendance/school-years`, withCreds());
    return await res.json();
  } catch (error) {
    console.error("[attendanceApi.getSchoolYears]", error);
    return { success: false, error: error.message };
  }
}

/** GET /api/attendance/stats */
export async function getAttendanceStats() {
  try {
    const res = await fetch(`${API_BASE}/api/attendance/stats`, withCreds());
    return await res.json();
  } catch (error) {
    console.error("[attendanceApi.getAttendanceStats]", error);
    return { success: false, error: error.message };
  }
}

/**
 * POST /api/attendance/tap/:studentIdNumber
 * Smart toggle — first call checks in, second call checks out.
 * Returns { success, action: 'checked_in'|'checked_out', data, message }
 */
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

/** POST /api/attendance/check-in — explicit check-in (legacy / direct use) */
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

/** POST /api/attendance/check-out/:id — explicit check-out */
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

/** DELETE /api/attendance/:id */
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