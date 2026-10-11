/**
 * features/analytics/components/dashboard/MostBorrowedBooks.jsx
 *
 * Top-10 most borrowed books ranking widget. Extracted from the former
 * pages/Dashboard.jsx (was `MostBorrowedBooks`).
 */

import { memo } from "react";
import { Crown } from "lucide-react";
import { MEDAL, RANK_COLORS } from "../../constants/dashboardPalette";
import ChartError from "../chart/ChartError";

// FIX F: default data=[] so .reduce() never fires on undefined/null
const MostBorrowedBooks = memo(function MostBorrowedBooks({ data = [], loading, error }) {
  const safeData   = Array.isArray(data) ? data : [];
  const total      = safeData.reduce((s, r) => s + (r.borrows ?? 0), 0);
  const maxBorrows = safeData.length > 0 ? safeData[0].borrows : 1;

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col h-full"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
    >
      <div className="px-4 py-3 flex items-center justify-between gap-2 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border-light)" }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(238,162,58,0.15)" }}>
            <Crown size={13} style={{ color: "#EEA23A" }} />
          </div>
          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
              Top 10 Most Borrowed Books
            </h2>
          </div>
        </div>
        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: "rgba(238,162,58,0.12)", color: "#b87a1a" }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "#EEA23A" }} />
          {loading ? "…" : `Top ${safeData.length}`}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 px-4 py-2.5 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border-light)", background: "var(--bg-subtle)" }}>
        <div className="flex flex-col items-center py-1.5 rounded-xl" style={{ background: "rgba(238,162,58,0.1)" }}>
          <span className="text-[14px] font-bold tabular-nums leading-none" style={{ color: "#EEA23A" }}>
            {loading ? "—" : total.toLocaleString()}
          </span>
          <span className="text-[9px] font-semibold mt-0.5" style={{ color: "#EEA23A" }}>Total Borrows</span>
        </div>
        <div className="flex flex-col items-center py-1.5 rounded-xl" style={{ background: "rgba(50,102,127,0.1)" }}>
          <span className="text-[14px] font-bold tabular-nums leading-none" style={{ color: "#32667F" }}>
            {loading ? "—" : safeData.length}
          </span>
          <span className="text-[9px] font-semibold mt-0.5" style={{ color: "#32667F" }}>Titles Tracked</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse"
                style={{ borderBottom: "1px solid var(--border-light)" }}>
                <div className="w-6 h-6 rounded-lg flex-shrink-0" style={{ background: "var(--border)" }} />
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="h-2.5 rounded-full w-3/4" style={{ background: "var(--border)" }} />
                  <div className="h-2 rounded-full w-1/2" style={{ background: "var(--border-light)" }} />
                </div>
                <div className="w-10 h-5 rounded-lg flex-shrink-0" style={{ background: "var(--border)" }} />
              </div>
            ))}
          </div>
        ) : error ? (
          <ChartError message={error} />
        ) : safeData.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>No borrow data available</span>
          </div>
        ) : (
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-subtle)" }}>
                <th className="px-4 py-2 text-left text-[9px] font-bold uppercase tracking-widest"
                  style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border-light)", width: 36 }}>
                  Rank
                </th>
                <th className="px-2 py-2 text-left text-[9px] font-bold uppercase tracking-widest"
                  style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border-light)" }}>
                  Title / Author
                </th>
                <th className="px-4 py-2 text-right text-[9px] font-bold uppercase tracking-widest"
                  style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border-light)", width: 64 }}>
                  Borrows
                </th>
              </tr>
            </thead>
            <tbody>
              {safeData.map((book, idx) => {
                const isTop3    = idx < 3;
                const medal     = MEDAL[idx];
                const rankColor = RANK_COLORS[idx % RANK_COLORS.length];
                const barPct    = maxBorrows > 0 ? ((book.borrows ?? 0) / maxBorrows) * 100 : 0;
                const isEven    = idx % 2 === 0;

                return (
                  <tr key={book.id ?? idx}
                    style={{ background: isEven ? "var(--bg-surface)" : "var(--bg-subtle)", transition: "background 0.12s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                    onMouseLeave={e => (e.currentTarget.style.background = isEven ? "var(--bg-surface)" : "var(--bg-subtle)")}>
                    <td className="px-4 py-2.5"
                      style={{ borderBottom: "1px solid var(--border-light)", verticalAlign: "middle" }}>
                      {isTop3 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-[11px] font-extrabold"
                          style={{ background: medal.bg, border: `1px solid ${medal.border}`, color: medal.text }}>
                          {medal.label}
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-[10px] font-bold"
                          style={{ background: `${rankColor}15`, color: rankColor }}>
                          {idx + 1}
                        </span>
                      )}
                    </td>

                    <td className="px-2 py-2.5"
                      style={{ borderBottom: "1px solid var(--border-light)", verticalAlign: "middle" }}>
                      <p className="text-[11px] font-semibold leading-tight truncate"
                        style={{ color: "var(--text-primary)", maxWidth: 160 }} title={book.title}>
                        {book.title}
                      </p>
                      {book.author && (
                        <p className="text-[10px] mt-0.5 truncate"
                          style={{ color: "var(--text-muted)", maxWidth: 160 }} title={book.author}>
                          {book.author}
                        </p>
                      )}
                      <div className="mt-1.5 rounded-full overflow-hidden" style={{ height: 3, background: "var(--bg-subtle)" }}>
                        <div style={{ width: `${barPct}%`, height: "100%", background: rankColor, borderRadius: 9999, transition: "width 0.5s ease" }} />
                      </div>
                    </td>

                    <td className="px-4 py-2.5 text-right"
                      style={{ borderBottom: "1px solid var(--border-light)", verticalAlign: "middle" }}>
                      <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-extrabold tabular-nums"
                        style={{ background: `${rankColor}18`, color: rankColor }}>
                        {book.borrows ?? 0}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
});

export default MostBorrowedBooks;
