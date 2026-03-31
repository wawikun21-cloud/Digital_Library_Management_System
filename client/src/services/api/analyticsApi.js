/**
 * client/src/services/api/analyticsApi.js
 * Centralised fetch calls for all analytics / dashboard endpoints.
 * Every function accepts a filters object:
 *   { semester, month, schoolYear }
 * and returns { success, data } matching the backend shape.
 */

const API_BASE = import.meta.env.VITE_API_URL || "/api";

function buildParams(filters = {}) {
  const p = new URLSearchParams();
  if (filters.semester  && filters.semester  !== "All") p.set("semester",   filters.semester);
  if (filters.month     && filters.month     !== "All") p.set("month",      filters.month);
  if (filters.schoolYear)                               p.set("schoolYear", filters.schoolYear);
  return p.toString();
}

async function safeFetch(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("[analyticsApi]", url, err.message);
    return { success: false, error: err.message, data: [] };
  }
}

/** GET /api/books/stats — KPI numbers */
export async function fetchBookStats() {
  return safeFetch(`${API_BASE}/books/stats`);
}

/** GET /api/analytics/most-borrowed */
export async function fetchMostBorrowed(filters = {}) {
  const qs = buildParams(filters);
  return safeFetch(`${API_BASE}/analytics/most-borrowed${qs ? `?${qs}` : ""}`);
}

/** GET /api/analytics/attendance */
export async function fetchAttendance(filters = {}) {
  const qs = buildParams(filters);
  return safeFetch(`${API_BASE}/analytics/attendance${qs ? `?${qs}` : ""}`);
}

/** GET /api/analytics/fines */
export async function fetchFines(filters = {}) {
  const qs = buildParams(filters);
  return safeFetch(`${API_BASE}/analytics/fines${qs ? `?${qs}` : ""}`);
}

/** GET /api/analytics/overdue */
export async function fetchOverdue(filters = {}) {
  const qs = buildParams(filters);
  return safeFetch(`${API_BASE}/analytics/overdue${qs ? `?${qs}` : ""}`);
}

export default {
  fetchBookStats,
  fetchMostBorrowed,
  fetchAttendance,
  fetchFines,
  fetchOverdue,
};