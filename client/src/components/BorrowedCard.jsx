import { Trash2, Edit2, CheckCircle2, CalendarClock } from "lucide-react";

// ── Helpers (self-contained so BorrowedCard has no external deps) ─────────────

/**
 * Returns today's date as "YYYY-MM-DD" using LOCAL time.
 * Avoids the UTC-shift bug that new Date().toISOString() causes.
 */
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Safely extracts a plain "YYYY-MM-DD" string from any date value.
 * Handles ISO strings, partial strings, and JS Date objects.
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
 * Dynamically compute the display status from the due date and DB status.
 * NEVER trusts the stored "Borrowed" value — checks today vs due_date.
 *
 * Rules:
 *   - Returned                          → "Returned"  (DB status is final)
 *   - today > due_date (still borrowed) → "Overdue"   (computed)
 *   - today <= due_date                 → "Borrowed"  (computed)
 */
function getStatus(dueDate, dbStatus) {
  if (dbStatus === "Returned") return "Returned";
  if (!dueDate) return "Borrowed";
  // String comparison works for YYYY-MM-DD — lexicographically correct
  return todayStr() > toDateStr(dueDate) ? "Overdue" : "Borrowed";
}

/**
 * Compute overdue fine: ₱5 per day past due_date.
 * Uses return_date as reference for Returned books, today otherwise.
 */
function getFine(dueDate, dbStatus, returnDate) {
  if (!dueDate) return 0;
  const refStr = dbStatus === "Returned" && returnDate
    ? toDateStr(returnDate)
    : todayStr();
  const ref  = new Date(refStr      + "T00:00:00");
  const due  = new Date(toDateStr(dueDate) + "T00:00:00");
  const days = Math.max(0, Math.floor((ref - due) / 86400000));
  return days * 5; // ₱5 per day
}

/**
 * Format a date string for display: "Mar 31"
 */
function formatDate(iso) {
  if (!iso) return "—";
  const d = toDateStr(iso);
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
  });
}

// Status badge styles — keyed by computed display status
const BADGE_STYLE = {
  Borrowed: { background: "rgba(50,102,127,0.15)",  color: "#32667F" },
  Returned: { background: "rgba(50,127,79,0.15)",   color: "#2d7a4f" },
  Overdue:  { background: "rgba(234,139,51,0.18)",  color: "#c05a0a" },
};

// Overdue row highlight — subtle left border + tinted background
const OVERDUE_ROW_STYLE = {
  borderLeft: "3px solid #EA8B33",
  background: "rgba(234,139,51,0.04)",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function BorrowedCard({
  transaction,
  idx,
  onEdit,
  onDelete,
  onReturn,
  gradients,
}) {
  const [a, b] = gradients[idx % gradients.length];

  // ── Compute display values dynamically ──────────────────
  const displayStatus = getStatus(transaction.due_date, transaction.status);
  const isReturned    = displayStatus === "Returned";
  const isOverdue     = displayStatus === "Overdue";
  const fine          = getFine(transaction.due_date, transaction.status, transaction.return_date);

  // Book cover initials
  const bookTitle = transaction.book_title || "";
  const initials  = bookTitle
    .split(" ")
    .filter(w => w.length > 0)
    .slice(0, 2)
    .map(w => w[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className="flex flex-col rounded-lg overflow-hidden transition-all duration-200"
      style={{
        background:  "var(--bg-surface)",
        border:      "1px solid var(--border)",
        boxShadow:   "var(--shadow-sm)",
        opacity:      isReturned ? 0.6 : 1,
        // ✅ Highlight overdue cards with a left accent border
        ...(isOverdue ? OVERDUE_ROW_STYLE : {}),
      }}
    >
      {/* Book Cover — 2:3 aspect ratio */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "2/3" }}>
        <div
          className="w-full h-full flex flex-col items-center justify-center gap-2"
          style={{ background: `linear-gradient(145deg, ${a}, ${b})` }}
        >
          <span
            className="text-3xl font-black tracking-wider"
            style={{ color: "rgba(255,255,255,0.75)" }}
          >
            {initials}
          </span>
        </div>

        {/* ✅ Status badge — uses COMPUTED status, not DB value */}
        <div
          className="absolute top-2 right-2 px-2 py-1 rounded-md text-[10px] font-bold"
          style={BADGE_STYLE[displayStatus]}
        >
          {displayStatus}
        </div>

        {/* Fine badge — shown on overdue cards */}
        {isOverdue && fine > 0 && (
          <div
            className="absolute bottom-2 left-2 px-2 py-1 rounded-md text-[10px] font-bold"
            style={{ background: "rgba(234,139,51,0.9)", color: "#fff" }}
          >
            ₱{fine} fine
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-2 p-2.5 flex-1">
        {/* Book title + borrower */}
        <div>
          <h4
            className="text-[12px] font-bold line-clamp-2 leading-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {transaction.book_title}
          </h4>
          <p className="text-[10px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {transaction.borrower_name}
          </p>
        </div>

        {/* Due date — orange when overdue */}
        <div
          className="flex items-center gap-1 text-[10px]"
          style={{ color: isOverdue ? "#EA8B33" : "var(--text-secondary)" }}
        >
          <CalendarClock size={12} />
          <span className="font-medium">
            {isOverdue ? "Overdue · " : "Due · "}
            {formatDate(transaction.due_date)}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-1.5 mt-auto">
          {!isReturned && (
            <button
              onClick={() => onReturn(transaction.id)}
              className="flex-1 text-[10px] font-semibold px-1.5 py-1 rounded-md border-[1.5px] transition-colors duration-150"
              style={{
                background:   "rgba(50,102,127,0.1)",
                borderColor:  "rgba(50,102,127,0.3)",
                color:        "#32667F",
              }}
              title="Mark as returned"
            >
              <CheckCircle2 size={12} className="inline mr-1" />
              Return
            </button>
          )}
          <button
            onClick={() => onEdit(transaction)}
            className="flex-1 text-[10px] font-semibold px-1.5 py-1 rounded-md border-[1.5px] transition-colors duration-150"
            style={{
              background:   "rgba(50,102,127,0.1)",
              borderColor:  "rgba(50,102,127,0.3)",
              color:        "#32667F",
            }}
            title="Edit"
          >
            <Edit2 size={12} className="inline mr-1" />
            Edit
          </button>
          <button
            onClick={() => onDelete(transaction.id)}
            className="flex-1 text-[10px] font-semibold px-1.5 py-1 rounded-md border-[1.5px] transition-colors duration-150"
            style={{
              background:   "rgba(234,139,51,0.1)",
              borderColor:  "rgba(234,139,51,0.3)",
              color:        "#c05a0a",
            }}
            title="Delete"
          >
            <Trash2 size={12} className="inline mr-1" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}