/**
 * features/analytics/utils/bookStatus.js
 *
 * Book status normalisation. Extracted from the former pages/BookDashboard.jsx
 * module scope.
 */

// FIX 4: All status values are normalised to the same display strings used in
// both dropdown options AND colour comparisons, so they never drift out of sync.
export function normalizeStatus(raw) {
  if (!raw) return "Available";
  const known = {
    outofstock:   "Out of Stock",
    out_of_stock: "Out of Stock",
    available:    "Available",
    borrowed:     "Borrowed",
    reserved:     "Reserved",
  };
  const key = raw.replace(/_/g, "").toLowerCase();
  if (known[key]) return known[key];
  return raw.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}
