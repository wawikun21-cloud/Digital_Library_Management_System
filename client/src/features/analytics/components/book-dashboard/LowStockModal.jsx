/**
 * features/analytics/components/book-dashboard/LowStockModal.jsx
 *
 * Full low-stock book list with a status filter and PDF export. Loads its
 * own data via the shared books API. Extracted from the former
 * pages/BookDashboard.jsx (was `LowStockModal`).
 */

import { useState, useEffect, useMemo } from "react";
import { X, FileDown } from "lucide-react";
import { fetchBooks } from "../../../../services/api/booksApi";
import { C } from "../../constants/bookDashboardPalette";
import { getLowStockBooks } from "../../utils/bookChartData";
import { exportRowsPdf } from "../../utils/pdfExport";

export default function LowStockModal({ onClose }) {
  const [books, setBooks]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filterStatus, setFilterStatus] = useState("All");

  useEffect(() => {
    fetchBooks().then(result => {
      if (result.success) {
        setBooks(getLowStockBooks(result.data || []));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const statuses = useMemo(() => ["All", ...Array.from(new Set(books.map(b => b.status))).sort()], [books]);
  const filtered = filterStatus === "All" ? books : books.filter(b => b.status === filterStatus);

  const selStyle = {
    fontSize: 11, fontWeight: 500, padding: "4px 8px", borderRadius: 6, cursor: "pointer",
    background: "var(--bg-subtle)", border: "1px solid var(--border)",
    color: "var(--text-primary)", outline: "none",
  };

  const downloadPDF = () => {
    if (filtered.length === 0) { alert("No data to download."); return; }
    exportRowsPdf({
      title: "Low Stock Books",
      fileName: "low-stock-books.pdf",
      rows: filtered.map((book, i) => [
        `${i + 1}. ${book.title}`,
        `Author: ${book.author}`,
        `Genre: ${book.genre}, Total: ${book.totalCopies}, Available: ${book.availableCopies}, Status: ${book.status}`,
      ]),
    });
  };

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,.45)", backdropFilter: "blur(2px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}>
      <div style={{
        background: "var(--bg-surface)", borderRadius: 14,
        border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)",
        width: "100%", maxWidth: 820, maxHeight: "85vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: "1px solid var(--border-light)", flexShrink: 0,
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>Low Stock Books</p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-muted)" }}>
              {filtered.length} book{filtered.length !== 1 ? "s" : ""} matching filters
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={downloadPDF} disabled={loading || filtered.length === 0}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 7,
                cursor: loading || filtered.length === 0 ? "not-allowed" : "pointer",
                background: loading || filtered.length === 0 ? "rgba(238,162,58,.35)" : "#17006b",
                border: "none", color: "#fff",
                opacity: loading || filtered.length === 0 ? 0.6 : 1,
              }}>
              <FileDown size={13} /> Download PDF
            </button>
            <button onClick={onClose} style={{
              background: "var(--bg-subtle)", border: "1px solid var(--border)",
              borderRadius: 8, padding: "5px 7px", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <X size={14} color="var(--text-secondary)" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "12px 20px",
          borderBottom: "1px solid var(--border-light)", flexShrink: 0, flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".4px" }}>Status</span>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selStyle}>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {filterStatus !== "All" && (
            <button onClick={() => setFilterStatus("All")} style={{
              alignSelf: "flex-end", fontSize: 11, fontWeight: 600, padding: "4px 10px",
              borderRadius: 6, cursor: "pointer", border: "1px solid rgba(239,68,68,.25)",
              background: "rgba(239,68,68,.06)", color: "#ef4444",
            }}>
              Reset
            </button>
          )}
        </div>

        {/* Table */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No books match the selected filters.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead style={{ position: "sticky", top: 0, background: "var(--bg-surface)", zIndex: 1 }}>
                <tr>
                  {["#", "Book Title", "Author", "Genre", "Total Copies", "Available", "Status"].map(h => (
                    <th key={h} style={{
                      textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--text-muted)",
                      textTransform: "uppercase", letterSpacing: ".4px",
                      padding: "10px 10px 10px 0", paddingLeft: h === "#" || h === "Status" ? 20 : 0,
                      borderBottom: "1px solid var(--border-light)",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((b, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border-light)" }}>
                    <td style={{ padding: "9px 10px 9px 20px", color: "var(--text-muted)", fontSize: 11 }}>{i + 1}</td>
                    <td style={{ padding: "9px 10px 9px 0", fontWeight: 600, color: "var(--text-primary)" }}>{b.title}</td>
                    <td style={{ padding: "9px 10px 9px 0", color: "var(--text-secondary)", fontSize: 12 }}>{b.author}</td>
                    <td style={{ padding: "9px 10px 9px 0", color: "var(--text-secondary)", fontSize: 12 }}>{b.genre}</td>
                    <td style={{ padding: "9px 10px 9px 0", textAlign: "center", color: "var(--text-secondary)" }}>{b.totalCopies}</td>
                    <td style={{ padding: "9px 10px 9px 0", textAlign: "center", fontWeight: 700, color: b.availableCopies === 0 ? C.rose : C.green }}>{b.availableCopies}</td>
                    {/* FIX 4: compare to normalised "Out of Stock", not raw "OutOfStock" */}
                    <td style={{
                      padding: "9px 0", fontSize: 11, fontWeight: 700,
                      color: b.status === "Out of Stock" ? C.rose : "var(--text-secondary)",
                      textTransform: "capitalize",
                    }}>
                      {b.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
