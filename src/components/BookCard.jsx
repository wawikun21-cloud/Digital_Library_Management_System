import { Trash2, Edit2 } from "lucide-react";

export default function BookCard({ book, idx, onViewDetails, onEdit, onDelete, gradients, statusStyle }) {
  const [a, b] = gradients[idx % gradients.length];
  const initials = book.title.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

  return (
    <div 
      className="group flex flex-col rounded-lg overflow-hidden transition-all duration-200"
      style={{ 
        background: "var(--bg-surface)", 
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Cover Image - 2:3 Aspect Ratio */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "2/3" }}>
        {book.cover ? (
          <img 
            src={book.cover} 
            alt={book.title} 
            className="w-full h-full object-cover transition-transform duration-300"
            style={{ transform: "scale(1)" }}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.15)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-2 transition-transform duration-300"
            style={{ background: `linear-gradient(145deg, ${a}, ${b})` }}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.15)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          >
            <span className="text-3xl font-black tracking-wider" style={{ color: "rgba(255,255,255,0.75)", fontFamily: "Georgia,serif" }}>
              {initials}
            </span>
          </div>
        )}

        {/* Status Badge - Top Right */}
        <div
          className="absolute top-2 right-2 px-2 py-1 rounded-md text-[10px] font-bold"
          style={statusStyle[book.status]}
        >
          {book.status}
        </div>

        {/* Hover Actions - Mobile: Hidden, Desktop: Visible */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          <button
            onClick={() => onEdit(book)}
            className="p-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors duration-150"
            title="Edit"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => onDelete(book.id)}
            className="p-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors duration-150"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Book Info */}
      <div className="flex flex-col gap-1.5 p-2.5 flex-1">
        <div>
          <h4 className="text-[12px] font-bold line-clamp-2 leading-tight" style={{ color: "var(--text-primary)" }}>
            {book.title}
          </h4>
          <p className="text-[10px] mt-0.5 line-clamp-1" style={{ color: "var(--text-secondary)" }}>
            {book.author}
          </p>
        </div>

        {/* Year */}
        <div className="flex items-center gap-1 text-[10px]" style={{ color: "var(--text-secondary)" }}>
          <span>📅</span> {book.year}
        </div>

        {/* View Details Button */}
        <button
          onClick={() => onViewDetails(book)}
          className="mt-auto text-[11px] font-semibold px-2.5 py-1.5 rounded-md border-[1.5px] transition-colors duration-150 w-full"
          style={{ 
            background: "rgba(238,162,58,0.1)", 
            borderColor: "rgba(238,162,58,0.3)", 
            color: "#b87a1a" 
          }}
          onMouseEnter={e => { 
            e.currentTarget.style.background = "rgba(238,162,58,0.25)"; 
            e.currentTarget.style.borderColor = "rgba(238,162,58,0.5)"; 
          }}
          onMouseLeave={e => { 
            e.currentTarget.style.background = "rgba(238,162,58,0.1)"; 
            e.currentTarget.style.borderColor = "rgba(238,162,58,0.3)"; 
          }}
        >
          View Details
        </button>

        {/* Mobile Action Buttons */}
        <div className="flex gap-2 lg:hidden mt-2">
          <button
            onClick={() => onEdit(book)}
            className="flex-1 text-[10px] font-semibold px-2 py-1.5 rounded-md border-[1.5px] transition-colors duration-150"
            style={{ 
              background: "rgba(50,102,127,0.1)", 
              borderColor: "rgba(50,102,127,0.3)", 
              color: "#32667F" 
            }}
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(book.id)}
            className="flex-1 text-[10px] font-semibold px-2 py-1.5 rounded-md border-[1.5px] transition-colors duration-150"
            style={{ 
              background: "rgba(234,139,51,0.1)", 
              borderColor: "rgba(234,139,51,0.3)", 
              color: "#c05a0a" 
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}