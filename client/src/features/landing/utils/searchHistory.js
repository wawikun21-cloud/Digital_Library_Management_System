/**
 * features/landing/utils/searchHistory.js
 *
 * Recent-search history in localStorage. Extracted from the module scope of
 * the former landing/landingpage.jsx.
 */

const HISTORY_KEY = "lexora_search_history";
const MAX_HISTORY = 5;

export function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
  catch { return []; }
}

export function addHistory(term) {
  const trimmed = term.trim();
  if (!trimmed) return;
  const prev = getHistory().filter(h => h !== trimmed);
  const next = [trimmed, ...prev].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

export function removeHistory(term) {
  const next = getHistory().filter(h => h !== term);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}
