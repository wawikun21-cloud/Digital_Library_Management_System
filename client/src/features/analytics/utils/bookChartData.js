/**
 * features/analytics/utils/bookChartData.js
 *
 * Pure derivations for the book dashboard, extracted from the former
 * pages/BookDashboard.jsx `fetchAllData` body. Everything here runs without
 * React and takes plain arrays in, plain arrays out.
 */

import { normalizeStatus } from "./bookStatus";
import { getISOWeek } from "./isoWeek";

/**
 * Apply the toolbar filters (genre / collection / date range) to a book list.
 * `filters` accepts { genre, collection, dateFrom, dateTo }; "All" / empty
 * values are treated as no filter — same semantics as the original page code.
 */
export function filterBooks(allBooks, filters = {}) {
  const genre      = filters.genre      || "All";
  const collection = filters.collection || "All";
  const dateFrom   = filters.dateFrom   ? new Date(filters.dateFrom) : null;
  const dateTo     = filters.dateTo     ? new Date(filters.dateTo)   : null;

  return allBooks.filter(b => {
    if (genre      !== "All" && b.genre      !== genre)      return false;
    if (collection !== "All" && b.collection !== collection) return false;
    if (dateFrom && new Date(b.created_at) < dateFrom)       return false;
    if (dateTo   && new Date(b.created_at) > dateTo)         return false;
    return true;
  });
}

/** Genre breakdown — top 8 genres by title count. */
export function buildGenreData(books) {
  const genreMap = {};
  for (const b of books) {
    const g = b.genre || "Uncategorized";
    genreMap[g] = (genreMap[g] || 0) + 1;
  }
  return Object.entries(genreMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([genre, count]) => ({ genre, count }));
}

/** Collection breakdown — every collection by title count. */
export function buildCollectionData(books) {
  const colMap = {};
  for (const b of books) {
    const raw =
      (typeof b.collection === "object" ? b.collection?.collection_name : b.collection) ||
      b.collection_name || b.program || b.department || "";
    const c = (typeof raw === "string" ? raw.trim() : String(raw).trim()) || "General";
    colMap[c] = (colMap[c] || 0) + 1;
  }
  return Object.entries(colMap)
    .sort((a, b) => b[1] - a[1])
    .map(([collection, count]) => ({ collection, count }));
}

/**
 * New arrivals grouped by the selected period.
 * Returns { arrivalsData, dataKey } where dataKey is the x-axis field name
 * ("date" | "week" | "month") the chart must bind to.
 */
export function buildArrivals(books, period) {
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const arrivalsMap = {};
  let dataKey = "month";

  for (const b of books) {
    if (!b.created_at) continue;
    const d = new Date(b.created_at);
    let key;
    if (period === "Daily") {
      key = d.toISOString().split("T")[0];
      dataKey = "date";
    } else if (period === "Weekly") {
      const week = getISOWeek(d);
      key = `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
      dataKey = "week";
    } else {
      key = monthNames[d.getMonth()];
      dataKey = "month";
    }
    arrivalsMap[key] = (arrivalsMap[key] || 0) + 1;
  }

  let arrivalsData;
  if (period === "Daily") {
    arrivalsData = Object.entries(arrivalsMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, arrivals]) => ({ date, arrivals }));
  } else if (period === "Weekly") {
    arrivalsData = Object.entries(arrivalsMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, arrivals]) => ({ week, arrivals }));
  } else {
    arrivalsData = monthNames.map(month => ({ month, arrivals: arrivalsMap[month] || 0 }));
  }

  return { arrivalsData, dataKey };
}

/**
 * Low-stock books (at most one available copy). Single owner of the
 * low-stock threshold for the whole feature.
 *
 * FIX 3: use || 0 not ?? 0 — Number(undefined) is NaN, and NaN ?? 0
 * is NaN (nullish coalescing only fires on null/undefined, not NaN),
 * so (NaN ?? 0) <= 1 is false and genuinely missing books were excluded.
 */
export function getLowStockBooks(books) {
  return books
    .filter(b => (Number(b.available_copies) || 0) <= 1)
    .map(b => ({
      title:           b.title,
      author:          b.author,
      genre:           b.genre || "—",
      totalCopies:     Number(b.total_copies)     || 0,
      availableCopies: Number(b.available_copies) || 0,
      status:          normalizeStatus(b.display_status || b.status || "Available"),
    }));
}
