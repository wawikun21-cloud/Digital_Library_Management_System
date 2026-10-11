/**
 * features/transactions/utils/transactionDates.js
 *
 * Date + fine helpers for transactions. Extracted from the module scope of
 * the former pages/Borrowed.jsx. All comparisons use plain YYYY-MM-DD
 * strings so no timezone shift can move a date by a day.
 */

import { FINE_PER_DAY, STATUS_STYLE } from "../constants/transactionRules";

export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export function isOverdue(dueDate, status) {
  if (status === "Returned" || !dueDate) return false;
  // Compare as plain strings (YYYY-MM-DD) — no Date parsing needed, avoids timezone shift
  return toDateStr(dueDate) < today();
}

// Extract YYYY-MM-DD safely without timezone conversion.
// Using new Date() on a date string converts to UTC then local time,
// which shifts the date by ±1 day depending on the user's timezone.
export function toDateStr(val) {
  if (!val) return null;
  // Already a plain date string like "2025-03-15"
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  // ISO string like "2025-03-15T00:00:00.000Z" — just slice the date part
  if (typeof val === "string") return val.slice(0, 10);
  // Date object — use local date parts to avoid UTC offset shift
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return null;
}

/** Add `days` to a YYYY-MM-DD string, returning YYYY-MM-DD. */
export function addDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Display-only fine for a transaction. The server's `computed_fine` is the
 * authoritative value and is preferred whenever present; the client-side
 * `days × FINE_PER_DAY` fallback is an instant preview, never the source
 * of truth (see constants/transactionRules.js for the owner).
 */
export function previewFine(t) {
  if (!t || !t.due_date) return 0;
  // Prefer server-computed value (already a number after sanitizeTxns)
  if (t.computed_fine !== null && t.computed_fine !== undefined) return t.computed_fine;
  // Client-side fallback: compare due_date to today (Borrowed) or return_date (Returned)
  const refStr = t.status === "Returned" && t.return_date ? t.return_date : today();
  const ref    = new Date(refStr    + "T00:00:00");
  const due    = new Date(t.due_date + "T00:00:00");
  const days   = Math.max(0, Math.floor((ref - due) / 86400000));
  return days * FINE_PER_DAY;
}

/** Normalise API/WS transaction rows once, at the boundary. */
export function sanitizeTxns(rows) {
  return rows.map(t => ({
    ...t,
    borrow_date:   toDateStr(t.borrow_date),
    due_date:      toDateStr(t.due_date),
    return_date:   toDateStr(t.return_date),
    // MySQL returns computed_fine as string; cast to number.
    computed_fine: t.computed_fine != null ? Number(t.computed_fine) : null,
    fine_paid:     t.fine_paid != null     ? Number(t.fine_paid)     : 0,
    fine_amount:   t.fine_amount != null   ? Number(t.fine_amount)   : 0,
  }));
}

/** "Mar 15, 2025" style date for the detail modal grid. */
export function formatShortDate(value) {
  const [y, m, d] = value.split("-");
  return new Date(+y, +m - 1, +d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Detail-modal status: label + pill style (consumes STATUS_STYLE). */
export function displayStatus(txn) {
  const label = txn.status === "Returned" ? "Returned" : isOverdue(txn.due_date, txn.status) ? "Overdue" : "Borrowed";
  return { label, style: STATUS_STYLE[label] };
}
