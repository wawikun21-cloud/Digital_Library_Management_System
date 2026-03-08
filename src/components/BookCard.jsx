import { Trash2, Edit2, BookOpen, Star } from "lucide-react";

export default function BookCard({ book, idx, onViewDetails, onEdit, onDelete, gradients }) {
  const [a, b] = gradients[idx % gradients.length];
  const initials = book.title.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

  return (
    <div 
      className="group flex flex-col rounded-xl overflow-hidden transition-all duration-300"
      style={{ 
        background: "var(--bg-surface)", 
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Cover Section - The book is "smaller" and "tilts" */}
      <div className="perspective-1000 relative w-full p-4 pb-2 flex justify-center items-center" style={{ aspectRatio: "1/1.2" }}>
        <div className="relative w-full h-full tilt-on-hover cursor-pointer" onClick={() => onViewDetails(book)}>
          {book.cover ? (
            <img 
              src={book.cover} 
              alt={book.title} 
              className="w-full h-full object-cover rounded-lg shadow-md group-hover:shadow-hover"
            />
          ) : (
            <div
              className="w-full h-full flex flex-col items-center justify-center gap-2 rounded-lg shadow-md group-hover:shadow-hover"
              style={{ background: `linear-gradient(145deg, ${a}, ${b})` }}
            >
              <BookOpen size={28} color="rgba(255,255,255,0.35)" />
              <span className="text-xl font-black tracking-wider" style={{ color: "rgba(255,255,255,0.75)", fontFamily: "Georgia,serif" }}>
                {initials}
              </span>
            </div>
          )}

          {/* Status Badge - Floating on cover */}
          <div
            className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-bold"
            style={{ 
              background: book.status === "Available" ? "rgba(50,102,127,0.85)" : "rgba(220,38,38,0.85)", 
              color: "#fff",
              backdropFilter: "blur(4px)"
            }}
          >
            {book.status}
          </div>
        </div>
      </div>

      {/* Meta Row */}
      <div className="px-3 pt-1 pb-1 flex items-center gap-1.5 flex-wrap">
        <div className="flex items-center gap-0.5">
          <Star size={10} fill="#EEA23A" color="#EEA23A" />
          <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>N/A</span>
        </div>
        <span className="text-[10px]" style={{ color: "var(--border)" }}>·</span>
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
          style={{ background: "rgba(238,162,58,0.1)", color: "var(--accent-amber)" }}
        >
          {book.genre}
        </span>
        <span className="text-[10px]" style={{ color: "var(--border)" }}>·</span>
        <span 
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
          style={{ 
            background: book.quantity === 0 ? "rgba(220,38,38,0.1)" : "rgba(50,127,79,0.1)", 
            color: book.quantity === 0 ? "#dc2626" : "#2d7a47" 
          }}
        >
          {book.quantity} in stock
        </span>
      </div>

      {/* Title + Author */}
      <div className="px-3 pb-2 flex-1">
        <h4 className="text-[13px] font-bold leading-tight line-clamp-2" style={{ color: "var(--text-primary)" }}>
          {book.title}
        </h4>
        <p className="text-[11px] mt-0.5 line-clamp-1" style={{ color: "var(--text-secondary)" }}>
          {book.author}
        </p>
      </div>

      {/* Actions */}
      <div className="flex border-t" style={{ borderColor: "var(--border-light)" }}>
        <button
          onClick={() => onViewDetails(book)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold transition-colors duration-200"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--accent-amber)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
          aria-label={`View details for ${book.title}`}
        >
          <BookOpen size={12} /> View
        </button>
        <button
          onClick={() => onEdit(book)}
          className="px-3 py-2 text-[11px] font-semibold border-l transition-colors duration-200"
          style={{ color: "var(--text-secondary)", borderColor: "var(--border-light)" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(50,102,127,0.08)"; e.currentTarget.style.color = "#32667F"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
          aria-label={`Edit ${book.title}`}
        >
          <Edit2 size={12} />
        </button>
        <button
          onClick={() => onDelete(book)}
          className="px-3 py-2 text-[11px] font-semibold border-l transition-colors duration-200"
          style={{ color: "var(--text-secondary)", borderColor: "var(--border-light)" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(234,139,51,0.08)"; e.currentTarget.style.color = "#c05a0a"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
          aria-label={`Delete ${book.title}`}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
