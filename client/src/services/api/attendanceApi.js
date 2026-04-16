// ─────────────────────────────────────────────────────────
//  services/api/attendanceApi.js
//  Attendance API Service - Frontend API calls for attendance
// ─────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

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
  getAttendanceStats,
  tapAttendance,
  checkIn,
  checkOut,
  deleteAttendance,
};