import { CalendarClock } from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────
const FINE_PER_DAY = 5; // ₱5 per day overdue

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns today's date as "YYYY-MM-DD" in LOCAL time.
 * Critical: avoids the UTC-shift bug from new Date().toISOString().
 */
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Safely normalise any date value to a plain "YYYY-MM-DD" string.
 */
function toDateStr(val) {
  if (!val) return null;
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  if (typeof val === "string") return val.slice(0, 10);
  if (val instanceof Date) {
    return `${val.getFullYear()}-${String(val.getMonth() + 1).padStart(2, "0")}-${String(val.getDate()).padStart(2, "0")}`;
  }
  return null;
}

/**
 * Dynamically compute the display status.
 * NEVER trusts the stored "Borrowed" — always rechecks today vs due_date.
 *
 *   DB status = "Returned"  → "Returned"  (final — can't become overdue)
 *   today > due_date        → "Overdue"   (computed from current date)
 *   today <= due_date       → "Borrowed"  (still within period)
 */
function getStatus(dueDate, dbStatus) {
  if (dbStatus === "Returned") return "Returned";
  if (!dueDate) return "Borrowed";
  return todayStr() > toDateStr(dueDate) ? "Overdue" : "Borrowed";
}

/**
 * Compute overdue fine: ₱5 × days past due_date.
 * Uses return_date as reference for Returned books, today otherwise.
 * Falls back to server-computed_fine when available (more accurate).
 */
function calcFine(t) {
  if (!t.due_date) return 0;

  // Server-computed value wins when present (already accounts for exact return time)
  if (t.computed_fine !== null && t.computed_fine !== undefined) {
    return Number(t.computed_fine);
  }

  // Client-side fallback
  const refStr = t.status === "Returned" && t.return_date
    ? toDateStr(t.return_date)
    : todayStr();

  const ref  = new Date(refStr              + "T00:00:00");
  const due  = new Date(toDateStr(t.due_date) + "T00:00:00");
  const days = Math.max(0, Math.floor((ref - due) / 86400000));
  return days * FINE_PER_DAY;
}

/**
 * Format a date for table display: "Mar 31, 2026"
 */
function formatDate(iso) {
  if (!iso) return "—";
  const d = toDateStr(iso);
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
    year:  "numeric",
  });
}

// Status badge visual styles
const STATUS_STYLE = {
  Borrowed: { bg: "rgba(50,102,127,0.12)",  color: "#32667F" },
  Returned: { bg: "rgba(50,127,79,0.12)",   color: "#2d7a4f" },
  Overdue:  { bg: "rgba(234,139,51,0.12)",  color: "#c72f1b" },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function BorrowedTable({ transactions, onRowClick }) {
  // NOTE: isOverdue prop removed — status is now computed internally per row.

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b" style={{ borderColor: "var(--border-light)" }}>
            {["#","Book","Borrower","Contact","Borrow Date","Due Date","Return Date","Status","Fines"].map(h => (
              <th key={h}
                className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {transactions.map((t, idx) => {
            // ✅ Always compute display status dynamically — never use t.status for display
            const displayStatus = getStatus(t.due_date, t.status);
            const isReturned    = displayStatus === "Returned";
            const isOverdue     = displayStatus === "Overdue";
            const statusStyle   = STATUS_STYLE[displayStatus];
            const fine          = calcFine(t);
            const finePaid      = !!t.fine_paid;

            return (
              <tr
                key={t.id}
                className="border-b transition-colors duration-150"
                style={{
                  borderColor: "var(--border-light)",
                  // ✅ Highlight overdue rows with a subtle amber tint + left border
                  background:  isOverdue
                    ? "rgba(234,139,51,0.04)"
                    : "var(--bg-surface)",
                  borderLeft:  isOverdue ? "3px solid #c72f1b" : undefined,
                  opacity:     isReturned ? 0.65 : 1,
                  cursor:      "pointer",
                }}
                onClick={() => onRowClick && onRowClick(t)}
                onMouseEnter={e => {
                  e.currentTarget.style.background = isOverdue
                    ? "rgba(234,139,51,0.08)"
                    : "var(--bg-hover)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = isOverdue
                    ? "rgba(234,139,51,0.04)"
                    : "var(--bg-surface)";
                }}
              >
                {/* # */}
                <td className="px-3 py-3 text-[12px]" style={{ color: "var(--text-muted)" }}>
                  {idx + 1}
                </td>

                {/* Book */}
                <td className="px-3 py-3">
                  <p className="text-[13px] font-semibold truncate max-w-[180px]" style={{ color: "var(--text-primary)" }}>
                    {t.book_title}
                  </p>
                  <p className="text-[11px] truncate max-w-[180px]" style={{ color: "var(--text-secondary)" }}>
                    {t.book_author}
                  </p>
                </td>

                {/* Borrower */}
                <td className="px-3 py-3">
                  <p className="text-[12px] font-medium truncate max-w-[120px]" style={{ color: "var(--text-primary)" }}>
                    {t.borrower_name}
                  </p>
                  <p className="text-[10px] truncate max-w-[120px]" style={{ color: "var(--text-secondary)" }}>
                    {t.borrower_type === "faculty"
                      ? `${t.borrower_course ? `${t.borrower_course} — ` : ""}Faculty`
                      : [t.borrower_course, t.borrower_yr_level].filter(Boolean).join(" ")}
                  </p>
                </td>

                {/* Contact */}
                <td className="px-3 py-3 text-[11px]" style={{ color: "var(--text-secondary)" }}>
                  {t.borrower_contact || "—"}
                </td>

                {/* Borrow Date */}
                <td className="px-3 py-3 text-[12px]" style={{ color: "var(--text-primary)" }}>
                  {formatDate(t.borrow_date)}
                </td>

                {/* Due Date — amber when overdue */}
                <td className="px-3 py-3">
                  <div
                    className="flex items-center gap-1.5 text-[12px]"
                    style={{ color: isOverdue ? "#c72f1b" : "var(--text-primary)" }}
                  >
                    {isOverdue && <CalendarClock size={12} />}
                    <span className="font-medium">{formatDate(t.due_date)}</span>
                  </div>
                </td>

                {/* Return Date */}
                <td className="px-3 py-3 text-[12px]"
                  style={{ color: isReturned ? "#2d7a4f" : "var(--text-muted)" }}>
                  {isReturned ? formatDate(t.return_date) : "—"}
                </td>

                {/* ✅ Status — shows computed "Overdue" not the stale DB "Borrowed" */}
                <td className="px-3 py-3">
                  <span
                    className="text-[10px] font-semibold px-2 py-1 rounded"
                    style={{ background: statusStyle.bg, color: statusStyle.color }}
                  >
                    {displayStatus}
                  </span>
                </td>

                {/* Fines */}
                <td className="px-3 py-3">
                  {fine > 0 ? (
                    <span
                      className="text-[11px] font-bold px-2 py-1 rounded"
                      style={{
                        background: finePaid ? "rgba(50,127,79,0.1)"   : "rgba(234,139,51,0.12)",
                        color:      finePaid ? "#2d7a4f"                : "#c72f1b",
                      }}
                    >
                      {finePaid ? "✓ Paid" : `₱${fine}`}
                    </span>
                  ) : (
                    <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}