import { useState, useEffect } from "react";

/**
 * CopiesList
 *
 * Props:
 *   bookId          – required; fetches copies for this book
 *   selectedAccession – controlled value (accession_number string)
 *   onSelectCopy    – callback(accession_number | null) fired on click
 *                     Pass these two props from your borrow form so the
 *                     selected copy feeds back into the transaction payload.
 */
export default function CopiesList({ bookId, selectedAccession, onSelectCopy }) {
  const [copies, setCopies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookId) {
      setCopies([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/books/${bookId}/copies`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setCopies(d.data || []);
        } else {
          console.warn("Failed to load copies:", d.error);
          setCopies([]);
        }
      })
      .catch(() => setCopies([]))
      .finally(() => setLoading(false));
  }, [bookId]);

  if (loading) {
    return (
      <div className="col-span-2 flex items-center justify-center py-6 text-[13px]" style={{ color: "var(--warm-gray)" }}>
        Loading copies…
      </div>
    );
  }

  if (copies.length === 0) {
    return (
      <div className="col-span-2 flex items-center justify-center py-6 text-[13px]" style={{ color: "var(--warm-gray)" }}>
        No physical copies recorded
      </div>
    );
  }

  // Sort: Available first, then alphabetical
  const statusOrder = { Available: 0, Reserved: 1, Borrowed: 2, Damaged: 3, Lost: 4, OutOfStock: 5 };
  const sortedCopies = [...copies].sort(
    (a, b) =>
      (statusOrder[a.status ?? ""] ?? 5) - (statusOrder[b.status ?? ""] ?? 5) ||
      (a.accession_number || "").localeCompare(b.accession_number || "")
  );

  function StatusPill({ status }) {
    const cfg = {
      Available:  { bg: "rgba(34,197,94,0.12)",   color: "#15803d", dot: "#22c55e" },
      Borrowed:   { bg: "rgba(239,68,68,0.12)",   color: "#b91c1c", dot: "#ef4444" },
      Reserved:   { bg: "rgba(234,179,8,0.12)",   color: "#92400e", dot: "#f59e0b" },
      Lost:       { bg: "rgba(107,114,128,0.12)", color: "#374151", dot: "#6b7280" },
      Damaged:    { bg: "rgba(239,68,68,0.12)",   color: "#b91c1c", dot: "#ef4444" },
      OutOfStock: { bg: "rgba(239,68,68,0.12)",   color: "#dc2626", dot: "#ef4444" },
    };
    const c = cfg[status] || cfg.Available;
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
        style={{ background: c.bg, color: c.color, border: `1px solid ${c.dot}40` }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
        {status || "Available"}
      </span>
    );
  }

  const isSelectable = typeof onSelectCopy === "function";

  return (
    <div
      className="col-span-2 flex flex-col gap-2 p-4 rounded-xl border"
      style={{ background: "var(--white)", borderColor: "#e8e0d5" }}
    >
      <div className="flex items-center gap-2 text-[12px] font-semibold" style={{ color: "var(--navyblue)" }}>
        <span>📚</span> Physical Copies ({copies.length})
        {isSelectable && (
          <span className="ml-auto text-[11px] font-normal" style={{ color: "var(--warm-gray)" }}>
            Click an available copy to select it
          </span>
        )}
      </div>

      <div className="space-y-1.5 max-h-40 overflow-y-auto">
        {sortedCopies.map(copy => {
          const isAvailable = copy.status === "Available";
          const isSelected  = selectedAccession === copy.accession_number;

          return (
            <div
              key={copy.id || copy.accession_number}
              className="flex items-center justify-between px-3 py-2 rounded-lg text-[13px] transition-all duration-150"
              style={{
                background:  isSelected
                  ? "rgba(50,102,127,0.12)"
                  : "rgba(248,250,252,0.7)",
                border: isSelected
                  ? "2px solid #32667F"
                  : "1px solid #e2e8f0",
                cursor: isSelectable && isAvailable ? "pointer" : "default",
                opacity: isSelectable && !isAvailable ? 0.55 : 1,
              }}
              title={
                isSelectable
                  ? isAvailable
                    ? `Select copy ${copy.accession_number}`
                    : `${copy.accession_number} is ${copy.status}`
                  : undefined
              }
              onClick={() => {
                if (!isSelectable || !isAvailable) return;
                // Toggle off if already selected
                onSelectCopy(isSelected ? null : copy.accession_number);
              }}
            >
              <div className="flex items-center gap-2 font-mono font-semibold" style={{ color: "var(--navyblue)" }}>
                {/* Checkmark when selected */}
                {isSelected ? (
                  <span style={{ color: "#32667F", fontSize: "0.9em" }}>✓</span>
                ) : (
                  <span style={{ color: "#d97706", fontSize: "0.85em" }}>🏷️</span>
                )}
                {copy.accession_number}
                {copy.date_acquired && (
                  <span style={{ color: "var(--warm-gray)", fontSize: "0.8em" }}>
                    · {new Date(copy.date_acquired).getFullYear()}
                  </span>
                )}
              </div>
              <StatusPill status={copy.status} />
            </div>
          );
        })}
      </div>
    </div>
  );
}