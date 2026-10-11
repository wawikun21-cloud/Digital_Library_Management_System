/**
 * features/landing/api/publicSearchApi.js
 *
 * Public (unauthenticated) search endpoints for the landing page. Extracted
 * from the raw fetch calls inside the former landing/landingpage.jsx.
 */

const API_BASE = import.meta.env.VITE_API_URL || "/api";

/** Autocomplete suggestions for the typed query. */
export async function fetchSuggestions(q) {
  const res = await fetch(`${API_BASE}/search/suggestions?q=${encodeURIComponent(q)}`);
  return res.json();
}

/** Full catalog search (supports an AbortSignal for request cancellation). */
export async function searchBooks(q, { signal } = {}) {
  const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}`, { signal });
  return res.json();
}

/** Physical copies of a NEMCO book (public endpoint). */
export async function fetchPublicCopies(bookId) {
  const res = await fetch(`${API_BASE}/books/${bookId}/copies/public`);
  return res.json();
}

export default { fetchSuggestions, searchBooks, fetchPublicCopies };
