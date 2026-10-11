/**
 * features/analytics/utils/isoWeek.js
 *
 * ISO-8601 week number. Extracted from the former pages/BookDashboard.jsx
 * module scope.
 */

// FIX 8: Correct ISO-8601 week number — handles year-boundary edge cases
// where Jan 1–3 may belong to week 52/53 of the previous year.
export function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}
