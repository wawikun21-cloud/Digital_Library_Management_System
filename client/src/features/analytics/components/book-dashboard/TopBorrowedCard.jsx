/**
 * features/analytics/components/book-dashboard/TopBorrowedCard.jsx
 *
 * In-page top-5 borrowed books card with a "View All" action.
 * Extracted from the former pages/BookDashboard.jsx.
 */

import { AlertCircle, ChevronDown } from "lucide-react";
import SectionCard from "../../../../components/ui/SectionCard";
import { C } from "../../constants/bookDashboardPalette";

export default function TopBorrowedCard({ topBorrowed, loading, error, onViewAll }) {
  return (
    <SectionCard title="Top Borrowed Books" action={
      <button onClick={onViewAll} style={{
        display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 9px",
        fontSize: 11, fontWeight: 500, borderRadius: 5, cursor: "pointer",
        background: "var(--bg-surface)", border: "1px solid var(--border)", color: C.teal,
      }}>
        View All <ChevronDown size={10} style={{ color: "var(--text-muted)" }} />
      </button>
    } info>
      {loading ? (
        <div style={{ padding: "30px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>Loading…</div>
      ) : error && topBorrowed.length === 0 ? (
        <div style={{ padding: "20px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <AlertCircle size={18} color={C.rose} />
          <span style={{ fontSize: 11, color: C.rose }}>Failed to load top borrowed books</span>
        </div>
      ) : topBorrowed.length === 0 ? (
        <div style={{ padding: "30px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>No borrow data available</div>
      ) : (
        <div style={{ height: 210, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr>
                {["Rank", "Book", "Borrows", "Avail"].map(h => (
                  <th key={h} style={{
                    textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--text-muted)",
                    textTransform: "uppercase", letterSpacing: ".3px",
                    padding: "6px 6px 6px 0", borderBottom: "1px solid var(--border-light)",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topBorrowed.slice(0, 5).map((b, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border-light)" }}>
                  <td style={{ padding: "8px 6px 8px 0" }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      width: 20, height: 20, borderRadius: "50%", fontSize: 10, fontWeight: 700,
                      background: b.rank <= 3 ? C.amber : "var(--bg-subtle)",
                      color: b.rank <= 3 ? "#fff" : "var(--text-muted)",
                    }}>
                      {b.rank}
                    </span>
                  </td>
                  <td style={{ padding: "8px 6px 8px 0", fontWeight: 600, color: "var(--text-primary)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {b.title}
                  </td>
                  <td style={{ padding: "8px 6px 8px 0", fontWeight: 700, color: C.amber, textAlign: "center" }}>{b.borrowCount}</td>
                  <td style={{ padding: "8px 0", textAlign: "center", fontWeight: 700, color: b.availableCopies === 0 ? C.rose : C.green }}>{b.availableCopies}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
