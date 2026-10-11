/**
 * features/landing/utils/bookDisplay.js
 *
 * Display helpers for search results: suggestion highlighting, year
 * formatting, status colours and the copy-pill configuration. Extracted
 * from the component body of the former landing/landingpage.jsx.
 */

/** Highlight the matched substring inside a suggestion. */
export function highlight(text, keyword) {
  if (!keyword) return text;
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <strong style={{ color: "var(--gold)" }}>{text.slice(idx, idx + keyword.length)}</strong>
      {text.slice(idx + keyword.length)}
    </>
  );
}

/** "2023-2024" → "2023"; passes numbers through. */
export function formatYear(val) {
  if (!val) return null;
  if (typeof val === "string" && val.includes("-")) return val.slice(0, 4);
  return String(val);
}

/** Status colour for a result row / detail panel (same rules as BookView). */
export function statusColor(book) {
  const eff  = book.display_status || book.status;
  const avail = book.available_copies;
  if (
    eff === "OutOfStock" ||
    (avail !== undefined && avail !== null && Number(avail) === 0) ||
    (avail === undefined && book.quantity === 0)
  ) return { bg: "#fee2e2", text: "#dc2626", label: "Out of Stock" };
  if (!eff || eff.toLowerCase() === "available")
    return { bg: "#e8f5e9", text: "#2e7d32", label: "Available" };
  if (eff.toLowerCase() === "borrowed")
    return { bg: "#fff3e0", text: "#e65100", label: "Borrowed" };
  return { bg: "#f3e5f5", text: "#6a1b9a", label: eff };
}

/** Copy-status pill config (same as BookView.jsx). */
export const COPY_STATUS_CONFIG = {
  Available: { bg: "rgba(34,197,94,0.12)",  color: "#15803d", dot: "#22c55e" },
  Borrowed:  { bg: "rgba(239,68,68,0.12)",  color: "#b91c1c", dot: "#ef4444" },
  Reserved:  { bg: "rgba(234,179,8,0.12)",  color: "#92400e", dot: "#f59e0b" },
  Lost:      { bg: "rgba(107,114,128,0.12)",color: "#374151", dot: "#6b7280" },
  Damaged:   { bg: "rgba(239,68,68,0.12)",  color: "#b91c1c", dot: "#ef4444" },
  OutOfStock:{ bg: "rgba(239,68,68,0.12)",  color: "#dc2626", dot: "#ef4444" },
};

/** Sort order for the copies list: Available first, then alphabetical. */
export const COPY_STATUS_ORDER = { Available: 0, Reserved: 1, Borrowed: 2, Damaged: 3, Lost: 4, OutOfStock: 5 };

export function sortCopies(copies) {
  return [...copies].sort((a, b) =>
    (COPY_STATUS_ORDER[a.status ?? ""] ?? 5) - (COPY_STATUS_ORDER[b.status ?? ""] ?? 5) ||
    (a.accession_number || "").localeCompare(b.accession_number || "")
  );
}
