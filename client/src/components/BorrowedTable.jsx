import { Trash2, Edit2, CheckCircle2, CalendarClock, RotateCcw } from "lucide-react";

export default function BorrowedTable({ 
  transactions, 
  onEdit, 
  onDelete, 
  onReturn,
  isOverdue 
}) {
  // Format date for display
  const formatDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric",
      year: "numeric"
    });
  };

  // Get status badge styles
  const getStatusStyle = (status) => {
    if (status === "Borrowed") {
      return { bg: "rgba(50,102,127,0.12)", color: "#32667F" };
    }
    if (status === "Returned") {
      return { bg: "rgba(50,127,79,0.12)", color: "#2d7a4f" };
    }
    return { bg: "rgba(234,139,51,0.12)", color: "#c05a0a" };
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
            <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t, idx) => {
            const isReturned = t.status === "Returned";
            const overdue = isOverdue && isOverdue(t.due_date, t.status);
            const statusStyle = getStatusStyle(t.status);
            
            return (
              <tr 
                key={t.id} 
                className="border-b transition-colors duration-150 hover:bg-opacity-50"
                style={{ 
                  borderColor: "var(--border-light)",
                  background: "var(--bg-surface)",
                  opacity: isReturned ? 0.65 : 1,
                }}
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
                <td className="px-3 py-3 text-[11px] truncate max-w-[100px]" style={{ color: "var(--text-secondary)" }}>
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
                    style={{ 
                      background: statusStyle.bg, 
                      color: statusStyle.color 
                    }}
                  >
                    {t.status}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1">
                    {!isReturned && (
                      <button
                        onClick={() => onReturn(t.id)}
                        className="p-1.5 rounded-md transition-colors duration-150"
                        style={{ color: "var(--text-secondary)" }}
                        title="Mark as Returned"
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(50,127,79,0.1)"; e.currentTarget.style.color = "#2d7a4f"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                      >
                        <CheckCircle2 size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => onEdit(t)}
                      className="p-1.5 rounded-md transition-colors duration-150"
                      style={{ color: "var(--text-secondary)" }}
                      title="Edit Transaction"
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(50,102,127,0.1)"; e.currentTarget.style.color = "#32667F"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => onDelete(t.id)}
                      className="p-1.5 rounded-md transition-colors duration-150"
                      style={{ color: "var(--text-secondary)" }}
                      title="Delete Transaction"
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(234,139,51,0.1)"; e.currentTarget.style.color = "#c05a0a"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

