/**
 * features/analytics/components/book-dashboard/TopBorrowedModal.jsx
 *
 * Full top-borrowed list with genre/collection filters, sorting and PDF
 * export. Extracted from the former pages/BookDashboard.jsx (was
 * `TopBorrowedModal`).
 */

import { useState, useEffect, useMemo } from "react";
import { X, BookMarked, FileDown } from "lucide-react";
import { C } from "../../constants/bookDashboardPalette";
import { exportRowsPdf } from "../../utils/pdfExport";

export default function TopBorrowedModal({ onClose, data = [], loading = false }) {
  const [books, setBooks] = useState(data);
  const [filterGenre, setFilterGenre] = useState("All");
  const [filterCollection, setFilterCollection] = useState("All");
  const [sortBy, setSortBy] = useState("Borrow Count");

  // Update books when data prop changes
  useEffect(() => {
    setBooks(data);
  }, [data]);

  const genres = useMemo(() => ["All", ...Array.from(new Set(books.map(b => b.genre))).sort()], [books]);
  const collections = useMemo(() => ["All", ...Array.from(new Set(books.map(b => b.collection || "General"))).sort()], [books]);

  const filtered = useMemo(() => books.filter(b => {
    if (filterGenre !== "All" && b.genre !== filterGenre) return false;
    if (filterCollection !== "All" && (b.collection || "General") !== filterCollection) return false;
    return true;
  }), [books, filterGenre, filterCollection]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    if (sortBy === "Title")  return a.title.localeCompare(b.title);
    if (sortBy === "Author") return a.author.localeCompare(b.author);
    return b.borrowCount - a.borrowCount;
  }), [filtered, sortBy]);

  const selStyle = {
    fontSize: 11, fontWeight: 500, padding: "4px 8px", borderRadius: 6, cursor: "pointer",
    background: "var(--bg-subtle)", border: "1px solid var(--border)",
    color: "var(--text-primary)", outline: "none",
  };

  const downloadPDF = () => {
    if (sorted.length === 0) { alert("No data to download."); return; }
    exportRowsPdf({
      title: "Top Borrowed Books",
      fileName: "top-borrowed-books.pdf",
      rows: sorted.map(book => [
        `${book.rank}. ${book.title}`,
        `Author: ${book.author}`,
        `Genre: ${book.genre}, Borrows: ${book.borrowCount}, Total: ${book.totalCopies}, Available: ${book.availableCopies}`,
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
        width: "100%", maxWidth: 850, maxHeight: "85vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: "1px solid var(--border-light)", flexShrink: 0,
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>Top Borrowed Books</p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-muted)" }}>
              {sorted.length} book{sorted.length !== 1 ? "s" : ""} matching filters
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={downloadPDF} disabled={loading || sorted.length === 0}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 7,
                cursor: loading || sorted.length === 0 ? "not-allowed" : "pointer",
                background: loading || sorted.length === 0 ? "rgba(238,162,58,.35)" : "#17006b",
                border: "none", color: "#fff",
                opacity: loading || sorted.length === 0 ? 0.6 : 1,
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
          {[
            { label: "Genre",      value: filterGenre,      onChange: setFilterGenre,      options: genres },
            { label: "Collection", value: filterCollection, onChange: setFilterCollection, options: collections },
            { label: "Sort By",    value: sortBy,           onChange: setSortBy,           options: ["Borrow Count", "Title", "Author"] },
          ].map(({ label, value, onChange, options }) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".4px" }}>{label}</span>
              <select value={value} onChange={e => onChange(e.target.value)} style={selStyle}>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
          {(filterGenre !== "All" || filterCollection !== "All" || sortBy !== "Borrow Count") && (
            <button onClick={() => { setFilterGenre("All"); setFilterCollection("All"); setSortBy("Borrow Count"); }}
              style={{
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
          ) : sorted.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No books match the selected filters.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead style={{ position: "sticky", top: 0, background: "var(--bg-surface)", zIndex: 1 }}>
                <tr>
                  {["Rank", "Book Title", "Author", "Genre", "Total Copies", "Available", "Borrow Count"].map(h => (
                    <th key={h} style={{
                      textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--text-muted)",
                      textTransform: "uppercase", letterSpacing: ".4px",
                      padding: "10px 10px 10px 0", paddingLeft: h === "Rank" ? 20 : 0,
                      borderBottom: "1px solid var(--border-light)",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((b, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border-light)" }}>
                    <td style={{ padding: "9px 10px 9px 20px" }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        width: 24, height: 24, borderRadius: "50%", fontSize: 11, fontWeight: 800,
                        background: b.rank <= 3 ? C.amber : "var(--bg-subtle)",
                        color: b.rank <= 3 ? "#fff" : "var(--text-muted)",
                      }}>
                        {b.rank <= 3 ? <BookMarked size={12} /> : b.rank}
                      </span>
                    </td>
                    <td style={{ padding: "9px 10px 9px 0", fontWeight: 600, color: "var(--text-primary)" }}>{b.title}</td>
                    <td style={{ padding: "9px 10px 9px 0", color: "var(--text-secondary)", fontSize: 12 }}>{b.author}</td>
                    <td style={{ padding: "9px 10px 9px 0", color: "var(--text-secondary)", fontSize: 12 }}>{b.genre}</td>
                    <td style={{ padding: "9px 10px 9px 0", color: "var(--text-secondary)", fontWeight: 600, textAlign: "center" }}>{b.totalCopies}</td>
                    <td style={{ padding: "9px 10px 9px 0", fontWeight: 700, color: b.availableCopies === 0 ? C.rose : C.green, textAlign: "center" }}>{b.availableCopies}</td>
                    <td style={{ padding: "9px 0", color: "var(--text-primary)", fontWeight: 600 }}>{b.borrowCount}</td>
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
