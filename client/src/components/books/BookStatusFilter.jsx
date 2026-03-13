export default function BookStatusFilter({ statusFilter, setStatusFilter, booksCount, filteredCount }) {
  const STATUS_STYLE = {
    Available: { bg:"rgba(36,97,57,0.1)",  color:"var(--status-green)" },
    OutOfStock: { bg:"rgba(204,31,31,0.1)",  color:"var(--status-red)" },
  };

  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-1.5 flex-wrap" role="tablist" aria-label="Filter by availability">
        {["All","Available","OutOfStock"].map(s => {
          const active = statusFilter === s;
          const chipColor = s === "Available" ? "var(--status-green)" : s === "OutOfStock" ? "var(--status-red)" : null;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              role="tab"
              aria-selected={active}
              className="px-3 py-1 rounded-full text-[11.5px] font-semibold transition-all duration-150"
              style={{
                background:  active
                  ? (s === "All" ? "var(--accent-amber)" : (STATUS_STYLE[s]?.bg ?? "var(--accent-amber)"))
                  : "var(--bg-surface)",
                color:       active
                  ? (s === "All" ? "#fff" : chipColor)
                  : "var(--text-secondary)",
                border:      active
                  ? `1.5px solid ${s === "All" ? "var(--accent-amber)" : (chipColor ?? "var(--accent-amber)")}`
                  : "1.5px solid var(--border)",
                boxShadow:   active ? "var(--shadow-sm)" : "none",
              }}
            >
              {s === "OutOfStock" ? "Out of Stock" : s}
            </button>
          );
        })}
      </div>

      <p className="text-[12px] tabular-nums" style={{ color:"var(--text-muted)" }}>
        {filteredCount === booksCount
          ? `${booksCount} book${booksCount !== 1 ? "s" : ""}`
          : `${filteredCount} of ${booksCount} books`}
      </p>
    </div>
  );
}
