import { CalendarClock } from "lucide-react";

const FINE_PER_DAY = 5;

function calcFine(t) {
  if (!t.due_date) return 0;
  // Prefer server-computed value
  if (t.computed_fine !== null && t.computed_fine !== undefined) return Number(t.computed_fine);
  // Client-side fallback: use today for Borrowed, return_date for Returned
  const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })();
  const refStr   = t.status === "Returned" && t.return_date ? t.return_date : todayStr;
  const late     = Math.max(0, Math.floor((new Date(refStr + "T00:00:00") - new Date(t.due_date + "T00:00:00")) / 86400000));
  return late * FINE_PER_DAY;
}

export default function BorrowedTable({ 
  transactions, 
  onRowClick,
  isOverdue 
}) {
  // Format date for display
  const formatDate = (iso) => {
    if (!iso) return "—";
    const [y, m, d] = iso.slice(0, 10).split("-");
    return new Date(+y, +m - 1, +d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  // Get status badge styles
  const getStatusStyle = (displayStatus) => {
    if (displayStatus === "Returned") return { bg: "rgba(50,127,79,0.12)",  color: "#2d7a4f" };
    if (displayStatus === "Overdue")  return { bg: "rgba(234,139,51,0.12)", color: "#c05a0a" };
    return { bg: "rgba(50,102,127,0.12)", color: "#32667F" }; // Borrowed
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b" style={{ borderColor: "var(--border-light)" }}>
            <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>#</th>
            <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Book</th>
            <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Borrower</th>
            <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Contact</th>
            <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Borrow Date</th>
            <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Due Date</th>
            <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Return Date</th>
            <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Status</th>
            <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Fines</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t, idx) => {
            const isReturned    = t.status === "Returned";
            const overdue      = isOverdue && isOverdue(t.due_date, t.status);
            const displayStatus = isReturned ? "Returned" : overdue ? "Overdue" : "Borrowed";
            const statusStyle  = getStatusStyle(displayStatus);
            const fine         = calcFine(t);
            const finePaid     = !!t.fine_paid;

            return (
              <tr
                key={t.id}
                className="border-b transition-colors duration-150"
                style={{
                  borderColor: "var(--border-light)",
                  background: "var(--bg-surface)",
                  opacity: isReturned ? 0.65 : 1,
                  cursor: "pointer",
                }}
                onClick={() => onRowClick && onRowClick(t)}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "var(--bg-surface)"}
              >
                {/* Index */}
                <td className="px-3 py-3 text-[12px]" style={{ color: "var(--text-muted)" }}>
                  {idx + 1}
                </td>

                {/* Book Info */}
                <td className="px-3 py-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold truncate max-w-[180px]" style={{ color: "var(--text-primary)" }}>
                      {t.book_title}
                    </p>
                    <p className="text-[11px] truncate max-w-[180px]" style={{ color: "var(--text-secondary)" }}>
                      {t.book_author}
                    </p>
                  </div>
                </td>

                {/* Borrower Name */}
                <td className="px-3 py-3">
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium truncate max-w-[120px]" style={{ color: "var(--text-primary)" }}>
                      {t.borrower_name}
                    </p>
                    <p className="text-[10px] truncate max-w-[120px]" style={{ color: "var(--text-secondary)" }}>
                      {t.borrower_course} {t.borrower_yr_level}
                    </p>
                  </div>
                </td>

                {/* Contact */}
                <td className="px-3 py-3 text-[11px]" style={{ color: "var(--text-secondary)" }}>
                  {t.borrower_contact || "—"}
                </td>

                {/* Borrow Date */}
                <td className="px-3 py-3 text-[12px]" style={{ color: "var(--text-primary)" }}>
                  {formatDate(t.borrow_date)}
                </td>

                {/* Due Date */}
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1.5 text-[12px]" style={{ color: overdue ? "#EA8B33" : "var(--text-primary)" }}>
                    {overdue && <CalendarClock size={12} />}
                    <span className="font-medium">{formatDate(t.due_date)}</span>
                  </div>
                </td>

                {/* Return Date */}
                <td className="px-3 py-3 text-[12px]" style={{ color: isReturned ? "#2d7a4f" : "var(--text-muted)" }}>
                  {isReturned ? formatDate(t.return_date) : "—"}
                </td>

                {/* Status */}
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
                        background: finePaid ? "rgba(50,127,79,0.1)"  : "rgba(234,139,51,0.12)",
                        color:      finePaid ? "#2d7a4f"               : "#c05a0a",
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