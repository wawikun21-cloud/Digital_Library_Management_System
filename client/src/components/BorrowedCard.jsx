import { Trash2, Edit2, CheckCircle2, CalendarClock } from "lucide-react";

export default function BorrowedCard({ 
  transaction, 
  idx, 
  badgeStyle, 
  onEdit, 
  onDelete, 
  onReturn,
  gradients,
  isOverdue 
}) {
  const [a, b] = gradients[idx % gradients.length];
  const bookTitle = transaction.book_title || "";
  const initials = bookTitle.split(" ").filter(w => w.length > 0).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  const isReturned = transaction.status === "Returned";

  return (
    <div
      className="flex flex-col rounded-lg overflow-hidden transition-all duration-200"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
        opacity: isReturned ? 0.6 : 1,
      }}
    >
      {/* Book Cover - 2:3 Aspect Ratio */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "2/3" }}>
        <div
          className="w-full h-full flex flex-col items-center justify-center gap-2"
          style={{ background: `linear-gradient(145deg, ${a}, ${b})` }}
        >
          <span className="text-3xl font-black tracking-wider" style={{ color: "rgba(255,255,255,0.75)" }}>
            {initials}
          </span>
        </div>

        {/* Status Badge */}
        <div
          className="absolute top-2 right-2 px-2 py-1 rounded-md text-[10px] font-bold"
          style={badgeStyle[transaction.status]}
        >
          {transaction.status}
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col gap-2 p-2.5 flex-1">
        {/* Book Title */}
        <div>
          <h4 className="text-[12px] font-bold line-clamp-2 leading-tight" style={{ color: "var(--text-primary)" }}>
            {transaction.book_title}
          </h4>
          <p className="text-[10px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {transaction.borrower_name}
          </p>
        </div>

        {/* Due Date */}
        <div className="flex items-center gap-1 text-[10px]" style={{ color: isOverdue(transaction.due_date) ? "#EA8B33" : "var(--text-secondary)" }}>
          <CalendarClock size={12} />
          <span className="font-medium">{formatDate(transaction.due_date)}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-1.5 mt-auto">
          {!isReturned && (
            <button
              onClick={() => onReturn(transaction.id)}
              className="flex-1 text-[10px] font-semibold px-1.5 py-1 rounded-md border-[1.5px] transition-colors duration-150"
              style={{
                background: "rgba(50,102,127,0.1)",
                borderColor: "rgba(50,102,127,0.3)",
                color: "#32667F"
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
              background: "rgba(50,102,127,0.1)",
              borderColor: "rgba(50,102,127,0.3)",
              color: "#32667F"
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
              background: "rgba(234,139,51,0.1)",
              borderColor: "rgba(234,139,51,0.3)",
              color: "#c05a0a"
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

function formatDate(iso) {
  return iso
    ? new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "—";
}