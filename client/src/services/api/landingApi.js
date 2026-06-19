// landingApi.js
const API_BASE = import.meta.env.VITE_API_URL || "/api";

export async function searchBooks(query, signal) {
  const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`, {
    signal,
  });
  if (!res.ok) {
    throw new Error(`Search failed: ${res.status}`);
  }
  const data = await res.json();
  return data.data || [];
}

export async function fetchSuggestions(query) {
  const res = await fetch(`${API_BASE}/search/suggestions?q=${encodeURIComponent(query)}`);
  if (!res.ok) {
    throw new Error(`Suggestions fetch failed: ${res.status}`);
  }
  const data = await res.json();
  return data.success ? data.data : [];
}

export async function fetchBookCopies(bookId) {
  const res = await fetch(`${API_BASE}/books/${bookId}/copies/public`);
  if (!res.ok) {
    throw new Error(`Copies fetch failed: ${res.status}`);
  }
  const data = await res.json();
  return data.success ? data.data : [];
}
