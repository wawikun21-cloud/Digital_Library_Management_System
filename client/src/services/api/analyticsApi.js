/**
 * client/src/services/api/analyticsApi.js
 *
 * CONFIRMED FROM SERVER SOURCE (analyticsService.js):
 *
 * getBookStats returns data with these EXACT field names (already camelCase,
 * explicitly aliased in analyticsService.js):
 *   nemcoTotal, lexoraTotal, nemcoOutOfStock, returned, borrowed, overdue,
 *   totalBooks, totalCopies, availableCopies, borrowedBooks, overdueBooks, addedThisMonth
 * → NO normalisation needed for KPI fields. They are already camelCase.
 *
 * getMostBorrowed returns:
 *   { success, data: [{id, short, title, author, genre, borrows, total_copies, available_copies}],
 *     totalBorrows: N }
 * → data rows use snake_case for total_copies and available_copies.
 *   totalBorrows is at the TOP LEVEL of the response (not inside data).
 *   The normalise step maps these to camelCase for BookDashboard consumers.
 *
 * getBooksByStatus returns data with:
 *   { available: N, outOfStock: N, borrowed: N, reserved: N }
 * → already camelCase. BookDashboard's guards for s.Available, s.out_of_stock etc.
 *   are redundant but harmless. The real field is outOfStock (camelCase).
 *
 * getHoldingsBreakdown: controller wraps result as
 *   { success, data: { data: [...], maxNemco, maxLexora } }
 *   Each row: { category, nemco, lexora }
 */

const API_BASE = import.meta.env.VITE_API_URL || "/api";

// ── Route name map ────────────────────────────────────────────────────────────
const ROUTES = {
  bookStats:         "stats",
  mostBorrowed:      "most-borrowed",
  attendance:        "attendance",
  fines:             "fines",
  overdue:           "overdue",
  holdingsBreakdown: "holdings-breakdown",
  booksByStatus:     "books-by-status",
  bookDashboard:     "book-dashboard",
};

function buildParams(filters = {}) {
  const p = new URLSearchParams();
  p.set("semester",   filters.semester   || "All");
  p.set("month",      filters.month      || "All");
  p.set("schoolYear", filters.schoolYear || "All");
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
    if (typeof json.success === "undefined") {
      return { success: true, data: json };
    }
    return json;
  } catch (err) {
    console.error("[analyticsApi]", url, err.message);
    return { success: false, error: err.message, data: null };
  }
}

// ── normalise getMostBorrowed rows ────────────────────────────────────────────
// Server returns snake_case for copy fields in the rows array.
// Normalise once here so all consumers use camelCase.
function normaliseMostBorrowed(result) {
  if (!result.success || !Array.isArray(result.data)) return result;
  return {
    ...result,
    data: result.data.map(r => ({
      id:               r.id,
      title:            r.title            ?? "—",
      short:            r.short            ?? r.title ?? "—",
      author:           r.author           ?? "—",
      genre:            r.genre            ?? "—",
      borrows:          Number(r.borrows   ?? 0),
      // CONFIRMED: server returns snake_case for these two fields
      totalCopies:      Number(r.total_copies     ?? r.totalCopies     ?? 0),
      availableCopies:  Number(r.available_copies ?? r.availableCopies ?? 0),
    })),
    // totalBorrows is at the TOP LEVEL of the response — pass through unchanged
    totalBorrows: Number(result.totalBorrows ?? 0),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CONFIRMED fields returned (from analyticsService.getBookStats):
 *   nemcoTotal, lexoraTotal, nemcoOutOfStock, returned, borrowed, overdue,
 *   totalBooks, totalCopies, availableCopies, borrowedBooks, overdueBooks, addedThisMonth
 * All already camelCase — no normalisation needed.
 */
export async function fetchBookStats(filters = {}) {
  const qs = buildParams(filters);
  return safeFetch(`${API_BASE}/analytics/${ROUTES.bookStats}${qs ? `?${qs}` : ""}`);
}

/**
 * CONFIRMED: rows have snake_case total_copies / available_copies.
 * totalBorrows is at the top level of the response object.
 * normalised here to camelCase.
 */
export async function fetchMostBorrowed(filters = {}) {
  const qs = buildParams(filters);
  const result = await safeFetch(`${API_BASE}/analytics/${ROUTES.mostBorrowed}${qs ? `?${qs}` : ""}`);
  return normaliseMostBorrowed(result);
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

/**
 * CONFIRMED fields returned (from analyticsService.getBooksByStatus):
 *   { available, outOfStock, borrowed, reserved }
 * All already camelCase. The "Out of Stock" display label maps to outOfStock key.
 */
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