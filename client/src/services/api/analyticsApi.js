/**
 * client/src/services/api/analyticsApi.js
 *
 * FIXES IN THIS FILE:
 *
 *   Bug B (404) — fetchBookStats was calling /api/analytics/book-stats.
 *     That route does not exist in Express. The controller is registered as
 *     router.get('/stats', getBookStats) in server/routes/analytics.js,
 *     so the correct URL is /api/analytics/stats.
 *     Single source of truth: edit ROUTES.bookStats below if your route name
 *     differs — every function reads from it, nothing is hard-coded twice.
 *
 *   Bug C — buildParams now forwards genre, collection, dateFrom, dateTo
 *     so the backend parseFilters() actually receives dashboard filter values.
 *
 *   En-dash note — Dashboard.jsx uses Unicode en-dash "–" (U+2013) in school
 *     year strings. URLSearchParams encodes it as %E2%80%93, which is correct
 *     HTTP behaviour. analyticsService.buildDateFilter already splits on
 *     /[–\-]/ so no server-side change is needed for this.
 */

const API_BASE = import.meta.env.VITE_API_URL || "/api";

// ── ROUTE NAME MAP ─────────────────────────────────────────────────────────────
// Cross-reference with server/routes/analytics.js.
// The values here must match the path strings in router.get('<value>', handler).
// Change only here when a route is renamed — nowhere else needs to change.
const ROUTES = {
  bookStats:         "stats",              // router.get('/stats',               getBookStats)
  mostBorrowed:      "most-borrowed",      // router.get('/most-borrowed',        getMostBorrowed)
  attendance:        "attendance",         // router.get('/attendance',           getAttendance)
  fines:             "fines",              // router.get('/fines',                getFines)
  overdue:           "overdue",            // router.get('/overdue',              getOverdue)
  holdingsBreakdown: "holdings-breakdown", // router.get('/holdings-breakdown',   getHoldingsBreakdown)
  booksByStatus:     "books-by-status",    // router.get('/books-by-status',      getBooksByStatus)
  bookDashboard:     "book-dashboard",     // router.get('/book-dashboard',       getBookDashboard) — if exists
};

function buildParams(filters = {}) {
  const p = new URLSearchParams();

  // Semester / month / schoolYear — always send so the controller
  // knows whether to skip date-scoping ("All" = no scope).
  p.set("semester",   filters.semester   || "All");
  p.set("month",      filters.month      || "All");
  p.set("schoolYear", filters.schoolYear || "All");

  // Bug C fix: forward genre/collection/date range so they reach parseFilters()
  if (filters.genre      && filters.genre      !== "All") p.set("genre",      filters.genre);
  if (filters.collection && filters.collection !== "All") p.set("collection", filters.collection);
  if (filters.dateFrom) p.set("dateFrom", filters.dateFrom);
  if (filters.dateTo)   p.set("dateTo",   filters.dateTo);

  return p.toString();
}

async function safeFetch(url) {
  try {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
    const json = await res.json();
    // Normalise: backend always returns { success, data } — guard in case it doesn't
    if (typeof json.success === "undefined") {
      return { success: true, data: json };
    }
    return json;
  } catch (err) {
    console.error("[analyticsApi]", url, err.message);
    return { success: false, error: err.message, data: null };
  }
}

// Bug B fix: was "/api/analytics/book-stats" → 404
// Now:        "/api/analytics/stats"          → 200
export async function fetchBookStats(filters = {}) {
  const qs = buildParams(filters);
  return safeFetch(`${API_BASE}/analytics/${ROUTES.bookStats}${qs ? `?${qs}` : ""}`);
}

export async function fetchMostBorrowed(filters = {}) {
  const qs = buildParams(filters);
  return safeFetch(`${API_BASE}/analytics/${ROUTES.mostBorrowed}${qs ? `?${qs}` : ""}`);
}

export async function fetchAttendance(filters = {}) {
  const qs = buildParams(filters);
  return safeFetch(`${API_BASE}/analytics/${ROUTES.attendance}${qs ? `?${qs}` : ""}`);
}

export async function fetchFines(filters = {}) {
  const qs = buildParams(filters);
  return safeFetch(`${API_BASE}/analytics/${ROUTES.fines}${qs ? `?${qs}` : ""}`);
}

export async function fetchOverdue(filters = {}) {
  const qs = buildParams(filters);
  return safeFetch(`${API_BASE}/analytics/${ROUTES.overdue}${qs ? `?${qs}` : ""}`);
}

export async function fetchHoldingsBreakdown(filters = {}) {
  const qs = buildParams(filters);
  return safeFetch(`${API_BASE}/analytics/${ROUTES.holdingsBreakdown}${qs ? `?${qs}` : ""}`);
}

export async function fetchBooksByStatus(filters = {}) {
  const qs = buildParams(filters);
  return safeFetch(`${API_BASE}/analytics/${ROUTES.booksByStatus}${qs ? `?${qs}` : ""}`);
}

export async function fetchBookDashboard(filters = {}) {
  const qs = buildParams(filters);
  return safeFetch(`${API_BASE}/analytics/${ROUTES.bookDashboard}${qs ? `?${qs}` : ""}`);
}

export default {
  fetchBookStats,
  fetchMostBorrowed,
  fetchAttendance,
  fetchFines,
  fetchOverdue,
  fetchHoldingsBreakdown,
  fetchBooksByStatus,
  fetchBookDashboard,
};