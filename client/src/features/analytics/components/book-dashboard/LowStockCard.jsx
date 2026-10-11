/**
 * features/analytics/components/book-dashboard/LowStockCard.jsx
 *
 * In-page top-5 low-stock books card with a "View All" action.
 * Extracted from the former pages/BookDashboard.jsx.
 */

import { ChevronDown } from "lucide-react";
import SectionCard from "../../../../components/ui/SectionCard";
import { C } from "../../constants/bookDashboardPalette";

export default function LowStockCard({ lowStock, onViewAll }) {
  return (
    <SectionCard title="Low Stock Books" action={
      <button onClick={onViewAll} style={{
        display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 9px",
        fontSize: 11, fontWeight: 500, borderRadius: 5, cursor: "pointer",
        background: "var(--bg-surface)", border: "1px solid var(--border)", color: C.rose,
      }}>
        View All <ChevronDown size={10} style={{ color: "var(--text-muted)" }} />
      </button>
    } info>
      {lowStock.length === 0 ? (
        <div style={{ padding: "30px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>No low-stock books</div>
      ) : (
        <div style={{ height: 210, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr>
                {["Book", "Copies", "Avail", "Status"].map(h => (
                  <th key={h} style={{
                    textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--text-muted)",
                    textTransform: "uppercase", letterSpacing: ".3px",
                    padding: "6px 6px 6px 0", borderBottom: "1px solid var(--border-light)",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lowStock.slice(0, 5).map((b, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border-light)" }}>
                  <td style={{ padding: "8px 6px 8px 0", fontWeight: 600, color: "var(--text-primary)", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={b.title}>
                    {b.title}
                  </td>
                  <td style={{ padding: "8px 6px 8px 0", textAlign: "center", color: "var(--text-secondary)" }}>{b.totalCopies}</td>
                  <td style={{ padding: "8px 6px 8px 0", textAlign: "center", fontWeight: 700, color: b.availableCopies === 0 ? C.rose : C.green }}>{b.availableCopies}</td>
                  {/* FIX 4: "Out of Stock" (with spaces) matches normalizeStatus output */}
                  <td style={{
                    padding: "8px 0", fontSize: 11, fontWeight: 700,
                    color: b.status === "Out of Stock" ? C.rose : "var(--text-secondary)",
                    textTransform: "capitalize",
                  }}>
                    {b.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
