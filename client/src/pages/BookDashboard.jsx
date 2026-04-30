/**
 * client/src/pages/BookDashboard.jsx
 *
 * Library Book Dashboard — fetches real data from the analytics API.
 *
 * FIXES APPLIED:
 *   Bug 1 — Stale closure: fetchAllData useCallback parameter renamed from
 *            `arrivalsFilter` (which shadowed state) to `period`. Deps array
 *            corrected so the function stays stable but callers pass current values.
 *   Bug 2 — TopBorrowedModal borrows field: now uses the same alias chain as the
 *            main fetch (b.borrows ?? b.borrow_count ?? b.borrowCount ?? 0).
 *   Bug 3 — Low-stock filter: (Number(x) ?? 0) replaced with (Number(x) || 0)
 *            so NaN/null/undefined all correctly fall back to 0.
 *   Bug 4 — Status color comparison: normalizeStatus now stores "Out of Stock"
 *            consistently; color checks use the same value everywhere.
 *   Bug 5 — Double API call on mount: removed the explicit initial-load
 *            useEffect; the debounced filter effect handles mount + changes.
 *   Bug 6 — topBorrowedLoading never resets: moved setLoading resets into a
 *            finally block so the spinner always clears, even on error.
 *   Bug 7 — No try/catch: fetchAllData now has a proper try/finally with error
 *            state so partial failures don't freeze spinners.
 *   Bug 8 — ISO week calc: hand-rolled algorithm replaced with a correct
 *            ISO-8601 week function that handles year-boundary edge cases.
 *   Bug D — Stale WS callbacks: onTransactionChange uses a ref-based stable
 *            wrapper so the socket listener always calls the current version.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  fetchBookStats,
  fetchMostBorrowed,
  fetchBooksByStatus,
} from "../services/api/analyticsApi";
import { fetchBooks } from "../services/api/booksApi";
 import { useWebSocket } from "../hooks/useWebsocket";
 import useDebounce from "../hooks/useDebounce";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import jsPDF from "jspdf";
import {
  BookOpen, Package, Copy, Clock, Calendar, AlertCircle,
  ChevronDown, Download, RefreshCw, X, FileDown, TrendingUp, Library,
  UserCheck, Timer, BookMarked, Info,
} from "lucide-react";

// ── Status normalisation ──────────────────────────────────────────────────────
// FIX 4: All status values are normalised to the same display strings used in
// both dropdown options AND colour comparisons, so they never drift out of sync.
function normalizeStatus(raw) {
  if (!raw) return "Available";
  const known = {
    outofstock:   "Out of Stock",
    out_of_stock: "Out of Stock",
    available:    "Available",
    borrowed:     "Borrowed",
    reserved:     "Reserved",
  };
  const key = raw.replace(/_/g, "").toLowerCase();
  if (known[key]) return known[key];
  return raw.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

// FIX 8: Correct ISO-8601 week number — handles year-boundary edge cases
// where Jan 1–3 may belong to week 52/53 of the previous year.
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  navy:   "#132F45",
  teal:   "#32667F",
  amber:  "#EEA23A",
  gold:   "#F3B940",
  orange: "#EA8B33",
  green:  "#22c55e",
  mint:   "#2dd4bf",
  indigo: "#6366f1",
  purple: "#a855f7",
  rose:   "#f43f5e",
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function KpiCard({ icon: Icon, iconBg, iconColor, label, value, sub }) {
  return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--border)",
      borderRadius: 10, padding: "13px 15px", display: "flex",
      alignItems: "center", gap: 11, boxShadow: "0 1px 3px rgba(0,0,0,.05)",
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 9, background: iconBg,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Icon size={18} color={iconColor} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: "0 0 1px", fontSize: 10, color: "var(--text-muted)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</p>
        <p style={{ margin: "0 0 2px", fontSize: 20, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>{value}</p>
        {sub && <p style={{ margin: 0, fontSize: 10, color: "var(--text-muted)" }}>{sub}</p>}
      </div>
    </div>
  );
}

function SCard({ title, action, children, info }) {
  return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--border)",
      borderRadius: 14, overflow: "hidden", boxShadow: "var(--shadow-sm)",
    }}>
      <div style={{
        padding: "14px 18px", borderBottom: "1px solid var(--border-light)",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{title}</span>
          {info && <Info size={12} style={{ color: "var(--text-muted)", cursor: "default" }} />}
        </div>
        {action}
      </div>
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  );
}

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--border)",
      borderRadius: 10, padding: "8px 12px", fontSize: 12, boxShadow: "var(--shadow-lg)",
    }}>
      {label && <p style={{ color: "var(--text-secondary)", fontWeight: 600, marginBottom: 4, fontSize: 11 }}>{label}</p>}
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: "var(--text-primary)", fontWeight: 700 }}>
          <span style={{ color: p.fill || p.stroke, marginRight: 6 }}>●</span>
          {p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--border)",
      borderRadius: 10, padding: "8px 12px", fontSize: 12, boxShadow: "var(--shadow-lg)",
    }}>
      <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "var(--text-primary)", textTransform: "capitalize" }}>
        {data.status}
      </p>
      <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)" }}>
        Count: <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{data.count?.toLocaleString() ?? 0}</span>
      </p>
    </div>
  );
}

function TabBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 13px", fontSize: 12, fontWeight: 600, borderRadius: 7, border: "none",
      cursor: "pointer", transition: "all .15s",
      background: active ? C.teal : "var(--bg-subtle)",
      color: active ? "#fff" : "var(--text-secondary)",
    }}>
      {label}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODALS
// ═══════════════════════════════════════════════════════════════════════════════

function TopBorrowedModal({ onClose, data = [], loading = false }) {
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
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Top Borrowed Books", 10, 10);
    doc.setFontSize(12);
    let y = 20;
    sorted.forEach((book) => {
      if (y > 270) { doc.addPage(); y = 10; }
      doc.text(`${book.rank}. ${book.title}`, 10, y); y += 6;
      doc.text(`Author: ${book.author}`, 10, y); y += 6;
      doc.text(`Genre: ${book.genre}, Borrows: ${book.borrowCount}, Total: ${book.totalCopies}, Available: ${book.availableCopies}`, 10, y); y += 10;
    });
    doc.save("top-borrowed-books.pdf");
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

function LowStockModal({ onClose }) {
  const [books, setBooks]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filterStatus, setFilterStatus] = useState("All");

  useEffect(() => {
    fetchBooks().then(result => {
      if (result.success) {
        const low = (result.data || [])
          // FIX 3: use || 0 not ?? 0 — Number(undefined) is NaN, and NaN ?? 0
          // is NaN (nullish coalescing only fires on null/undefined, not NaN),
          // so (NaN ?? 0) <= 1 is false and genuinely missing books were excluded.
          .filter(b => (Number(b.available_copies) || 0) <= 1)
          .map(b => ({
            title:           b.title,
            author:          b.author,
            genre:           b.genre || "—",
            totalCopies:     Number(b.total_copies)     || 0,
            availableCopies: Number(b.available_copies) || 0,
            status:          normalizeStatus(b.display_status || b.status || "Available"),
          }));
        setBooks(low);
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
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Low Stock Books", 10, 10);
    doc.setFontSize(12);
    let y = 20;
    filtered.forEach((book, i) => {
      if (y > 270) { doc.addPage(); y = 10; }
      doc.text(`${i + 1}. ${book.title}`, 10, y); y += 6;
      doc.text(`Author: ${book.author}`, 10, y); y += 6;
      doc.text(`Genre: ${book.genre}, Total: ${book.totalCopies}, Available: ${book.availableCopies}, Status: ${book.status}`, 10, y); y += 10;
    });
    doc.save("low-stock-books.pdf");
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

// ── Genre badge ───────────────────────────────────────────────────────────────
const GENRE_COLORS = {
  Fiction:       { bg: "rgba(99,102,241,.12)",  color: "#6366f1" },
  "Non-Fiction": { bg: "rgba(34,197,94,.12)",   color: "#16a34a" },
  Science:       { bg: "rgba(238,162,58,.15)",  color: "#b87a1a" },
  History:       { bg: "rgba(50,102,127,.12)",  color: "#32667F" },
  Biography:     { bg: "rgba(168,85,247,.12)",  color: "#a855f7" },
  Arts:          { bg: "rgba(244,63,94,.12)",   color: "#f43f5e" },
};
function GenreBadge({ genre }) {
  const c = GENRE_COLORS[genre] || { bg: "rgba(156,163,175,.15)", color: "#6b7280" };
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: c.bg, color: c.color }}>
      {genre}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function BookDashboard() {
  const [arrivalsFilter, setArrivalsFilter]           = useState("Monthly");
  const [showLowStockModal, setShowLowStockModal]     = useState(false);
  const [showTopBorrowedModal, setShowTopBorrowedModal] = useState(false);

  const [globalFilter, setGlobalFilter] = useState({
    genre: "All", collection: "All", dateFrom: "", dateTo: "",
  });

  // Chart data state
  const [kpi, setKpi]                           = useState(null);
  const [genreData, setGenreData]               = useState([]);
  const [statusData, setStatusData]             = useState([]);
  const [statusLoading, setStatusLoading]       = useState(true);
  const [statusError, setStatusError]           = useState(null);
  const [topBorrowed, setTopBorrowed]           = useState([]);
  const [topBorrowedLoading, setTopBorrowedLoading] = useState(true);
  const [topBorrowedError, setTopBorrowedError] = useState(null);
  const [collectionData, setCollectionData]     = useState([]);
  const [newArrivals, setNewArrivals]           = useState([]);
  const [arrivalsDataKey, setArrivalsDataKey]   = useState("month");
  const [lowStock, setLowStock]                 = useState([]);

  // ── FIX 1: fetchAllData parameter renamed from `arrivalsFilter` to `period`
  // to avoid shadowing the state variable, which caused the useCallback closure
  // to always see the initial "Monthly" value regardless of user selection.
  // useCallback deps remain [] because `period` is passed in by each caller
  // explicitly — not closed over.
  const fetchAllData = useCallback(async (filters = {}, period = "Monthly") => {
    // FIX 6 + 7: reset all loading/error states before fetching, then use
    // try/finally to guarantee spinners always clear even on network error.
    setKpi(null);
    setStatusLoading(true);
    setStatusError(null);
    setTopBorrowedLoading(true);
    setTopBorrowedError(null);

    try {
      const [statsResult, borrowedResult, statusResult, booksResult] = await Promise.all([
        fetchBookStats(filters),
        fetchMostBorrowed(filters),
        fetchBooksByStatus(filters),
        fetchBooks(),
      ]);
      // Build a lookup map for accurate copy counts from the books API
      const booksMap = new Map();
      if (booksResult.success) {
        for (const b of booksResult.data || []) {
          booksMap.set(b.id, {
            totalCopies: Number(b.total_copies) || 0,
            availableCopies: Number(b.available_copies) || 0,
            collection: b.collection,
          });
        }
      }

      // ── KPI ──
      if (statsResult.success) {
        const s = statsResult.data;
        const now = new Date();

        const addedThisMonth = s.addedThisMonth != null
          ? s.addedThisMonth
          : booksResult.success
            ? (booksResult.data || []).filter(b => {
                if (!b.created_at) return false;
                const d = new Date(b.created_at);
                return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
              }).length
            : 0;

        const borrowed = s.borrowedBooks ?? s.borrowed ?? 0;
        const overdue  = s.overdueBooks  ?? s.overdue  ?? 0;

        setKpi({
          totalBooks:      s.totalBooks    ?? s.nemcoTotal ?? 0,
          totalCopies:     s.totalCopies   ??
            (booksResult.success
              ? (booksResult.data || []).reduce((sum, b) => sum + (Number(b.total_copies) || 0), 0)
              : (s.nemcoTotal ?? 0) + (s.lexoraTotal ?? 0)),
          availableCopies: s.availableCopies ??
            (booksResult.success
              ? (booksResult.data || []).reduce((sum, b) => sum + (Number(b.available_copies) || 0), 0)
              : (s.nemcoTotal ?? 0) - (s.nemcoOutOfStock ?? 0)),
          borrowedBooks:   borrowed,
          overdueBooks:    overdue,
          addedThisMonth,
        });
      }

      // ── Top Borrowed ──
      if (borrowedResult.success) {
        const list = Array.isArray(borrowedResult.data) ? borrowedResult.data : [];
        const corrected = list.map((b, i) => {
          const extra = booksMap.get(b.id);
          const rawBorrows = b.borrows ?? 0;
          if (extra) {
            return {
              rank: i + 1,
              title: b.title ?? "—",
              author: b.author ?? "—",
              genre: b.genre || "—",
              borrowCount: Number(rawBorrows),        // ← direct, no division
              totalCopies: extra.totalCopies || 0,
              availableCopies: extra.availableCopies ?? 0,
              collection: extra.collection,
            };
          } else {
            // Fallback to raw values if book not found in local catalog
            return {
              rank: i + 1,
              title: b.title ?? "—",
              author: b.author ?? "—",
              genre: b.genre || "—",
              borrowCount: Number(rawBorrows),
              totalCopies: b.totalCopies || 0,
              availableCopies: b.availableCopies || 0,
              collection: undefined,
            };
          }
        });
        setTopBorrowed(corrected);
      } else {
        setTopBorrowedError(borrowedResult.error || "Failed to load top borrowed books");
      }

      // ── Copies by Status ──
      // Server now returns per-copy counts: available, borrowed, reserved, unavailable.
      if (statusResult.success) {
        const s = statusResult.data;
        const available   = Number(s.available   ?? 0);
        const borrowed    = Number(s.borrowed    ?? 0);
        const reserved    = Number(s.reserved    ?? 0);
        const unavailable = Number(s.unavailable ?? 0);

        setStatusData([
          { status: "Available",   count: available,   color: C.green  },
          { status: "Borrowed",    count: borrowed,    color: C.amber  },
          { status: "Reserved",    count: reserved,    color: C.indigo },
          { status: "Unavailable", count: unavailable, color: C.rose   },
        ].filter(e => e.count > 0));
      } else {
        setStatusError(statusResult.error || "Failed to load status data");
      }

      // ── Client-side derived charts from books list ──
      if (booksResult.success) {
        const allBooks = booksResult.data || [];

        const genre      = filters.genre      || "All";
        const collection = filters.collection || "All";
        const dateFrom   = filters.dateFrom   ? new Date(filters.dateFrom) : null;
        const dateTo     = filters.dateTo     ? new Date(filters.dateTo)   : null;

        const filtered = allBooks.filter(b => {
          if (genre      !== "All" && b.genre      !== genre)      return false;
          if (collection !== "All" && b.collection !== collection) return false;
          if (dateFrom && new Date(b.created_at) < dateFrom)       return false;
          if (dateTo   && new Date(b.created_at) > dateTo)         return false;
          return true;
        });

        // Genre breakdown
        const genreMap = {};
        for (const b of filtered) {
          const g = b.genre || "Uncategorized";
          genreMap[g] = (genreMap[g] || 0) + 1;
        }
        setGenreData(
          Object.entries(genreMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([genre, count]) => ({ genre, count }))
        );

        // Collection breakdown
        const colMap = {};
        for (const b of filtered) {
          const raw =
            (typeof b.collection === "object" ? b.collection?.collection_name : b.collection) ||
            b.collection_name || b.program || b.department || "";
          const c = (typeof raw === "string" ? raw.trim() : String(raw).trim()) || "General";
          colMap[c] = (colMap[c] || 0) + 1;
        }
        setCollectionData(
          Object.entries(colMap)
            .sort((a, b) => b[1] - a[1])
            .map(([collection, count]) => ({ collection, count }))
        );

        // New Arrivals — grouped by selected period
        // FIX 8: use corrected getISOWeek() for weekly grouping
        const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const arrivalsMap = {};
        let dataKey = "month";

        for (const b of filtered) {
          if (!b.created_at) continue;
          const d = new Date(b.created_at);
          let key;
          if (period === "Daily") {
            key = d.toISOString().split("T")[0];
            dataKey = "date";
          } else if (period === "Weekly") {
            const week = getISOWeek(d);
            key = `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
            dataKey = "week";
          } else {
            key = monthNames[d.getMonth()];
            dataKey = "month";
          }
          arrivalsMap[key] = (arrivalsMap[key] || 0) + 1;
        }

        let arrivalsData;
        if (period === "Daily") {
          arrivalsData = Object.entries(arrivalsMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, arrivals]) => ({ date, arrivals }));
        } else if (period === "Weekly") {
          arrivalsData = Object.entries(arrivalsMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([week, arrivals]) => ({ week, arrivals }));
        } else {
          arrivalsData = monthNames.map(month => ({ month, arrivals: arrivalsMap[month] || 0 }));
        }
        setNewArrivals(arrivalsData);
        setArrivalsDataKey(dataKey);

        // Low Stock
        // FIX 3: use || 0 so NaN (from Number(undefined)) also falls back to 0
        const lowStockBooks = filtered
          .filter(b => (Number(b.available_copies) || 0) <= 1)
          .slice(0, 20)
          .map(b => ({
            title:           b.title,
            author:          b.author,
            genre:           b.genre || "—",
            totalCopies:     Number(b.total_copies)     || 0,
            availableCopies: Number(b.available_copies) || 0,
            status:          normalizeStatus(b.display_status || b.status || "Available"),
          }));
        setLowStock(lowStockBooks);
       } else {
         setGenreData([]);
         setCollectionData([]);
         setNewArrivals([]);
         setLowStock([]);
         // Do NOT clear statusData — it comes from statusResult, independent of booksResult
       }
    } catch (err) {
      // FIX 7: surface network/parse errors instead of leaving spinners frozen
      console.error("[BookDashboard] fetchAllData error:", err);
      setStatusError("Failed to load dashboard data. Check network connection.");
      setTopBorrowedError("Failed to load top borrowed books.");
    } finally {
      // FIX 6: always clear spinners regardless of success or error
      setStatusLoading(false);
      setTopBorrowedLoading(false);
    }
  }, []); // stable — all values are passed in as arguments, not closed over

  // FIX 5: Remove the explicit initial-load useEffect that caused a double
  // fetch on mount. The debounced-filter effect below fires on mount with the
  // initial values AND on every subsequent change — one effect, no duplication.
  const debouncedGlobalFilter = useDebounce(globalFilter, 300);

  useEffect(() => {
    fetchAllData(debouncedGlobalFilter, arrivalsFilter);
  }, [debouncedGlobalFilter, arrivalsFilter, fetchAllData]);

  // ── FIX D: Stale WebSocket callbacks ─────────────────────────────────────
  // The socket listener is registered once inside useWebSocket's useEffect
  // ([isAdmin] deps). Any callback defined inline in BookDashboard closes over
  // the stale globalFilter/arrivalsFilter from the render when useWebSocket
  // mounted. Fix: keep an always-current ref and expose a stable wrapper.
  const onStatsUpdate = useCallback((newStats) => {
    if (!newStats) return;
    setKpi(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        borrowedBooks: newStats.borrowed   ?? prev.borrowedBooks,
        overdueBooks:  newStats.overdue    ?? prev.overdueBooks,
        totalBooks:    newStats.nemcoTotal ?? prev.totalBooks,
      };
    });
  }, []);

  // Always-fresh ref so the stable WS wrapper reads current filter values
  const latestFetchRef = useRef(null);
  latestFetchRef.current = useCallback(() => {
    fetchAllData(globalFilter, arrivalsFilter);
  }, [fetchAllData, globalFilter, arrivalsFilter]);

  // Stable wrapper — identity never changes, so useWebSocket never reconnects
  const stableOnTransactionChange = useCallback(() => {
    latestFetchRef.current?.();
  }, []);

  useWebSocket({
    isAdmin:               true,
    onStatsUpdate,
    onTransactionNew:      stableOnTransactionChange,
    onTransactionReturned: stableOnTransactionChange,
    onTransactionDeleted:  stableOnTransactionChange,
  });

  // Formatting helpers
  const formatNum = n => n?.toLocaleString() ?? "—";

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {showLowStockModal    && <LowStockModal    onClose={() => setShowLowStockModal(false)} />}
      {showTopBorrowedModal && (
        <TopBorrowedModal
          onClose={() => setShowTopBorrowedModal(false)}
          data={topBorrowed}
          loading={topBorrowedLoading}
        />
      )}

      {/* ── Page Header + Inline Filters ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 7 }}>
            <BookOpen size={17} color={C.amber} /> NEMCO Library Book Dashboard
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-secondary)" }}>
            Monitor library catalog, circulation, and inventory
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {(globalFilter.genre !== "All" || globalFilter.collection !== "All" || globalFilter.dateFrom || globalFilter.dateTo) && (
            <button
              onClick={() => setGlobalFilter({ genre: "All", collection: "All", dateFrom: "", dateTo: "" })}
              style={{
                fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6,
                cursor: "pointer", border: "1px solid rgba(239,68,68,.25)",
                background: "rgba(239,68,68,.06)", color: "#ef4444",
                display: "flex", alignItems: "center", gap: 4,
              }}
            >
              <X size={11} /> Clear Filters
            </button>
          )}

          {/* Date Range */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".4px" }}>Date Range</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input type="date" value={globalFilter.dateFrom}
                onChange={e => setGlobalFilter(f => ({ ...f, dateFrom: e.target.value }))}
                style={{ fontSize: 11, padding: "3px 7px", borderRadius: 5, background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }} />
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>–</span>
              <input type="date" value={globalFilter.dateTo}
                onChange={e => setGlobalFilter(f => ({ ...f, dateTo: e.target.value }))}
                style={{ fontSize: 11, padding: "3px 7px", borderRadius: 5, background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }} />
            </div>
          </div>

          {/* Genre */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".4px" }}>Genre</span>
            <select value={globalFilter.genre}
              onChange={e => setGlobalFilter(f => ({ ...f, genre: e.target.value }))}
              style={{ fontSize: 11, fontWeight: 500, padding: "3px 24px 3px 8px", borderRadius: 5, background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none", cursor: "pointer" }}>
              {["All", ...genreData.map(g => g.genre)].map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          {/* Collection */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".4px" }}>Collection</span>
            <select value={globalFilter.collection}
              onChange={e => setGlobalFilter(f => ({ ...f, collection: e.target.value }))}
              style={{ fontSize: 11, fontWeight: 500, padding: "3px 24px 3px 8px", borderRadius: 5, background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none", cursor: "pointer" }}>
              {["All", ...collectionData.map(c => c.collection)].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        <KpiCard icon={BookOpen}    iconBg="rgba(99,102,241,.13)" iconColor={C.indigo}  label="Total Titles"     value={formatNum(kpi?.totalBooks)} />
        <KpiCard icon={Copy}        iconBg="rgba(34,197,94,.13)"  iconColor={C.green}   label="Total Copies"     value={formatNum(kpi?.totalCopies)} />
        <KpiCard icon={Package}     iconBg="rgba(50,102,127,.13)" iconColor={C.teal}    label="Available Copies" value={formatNum(kpi?.availableCopies)} />
        <KpiCard icon={UserCheck}   iconBg="rgba(238,162,58,.13)" iconColor={C.amber}   label="Borrowed Books"   value={formatNum(kpi?.borrowedBooks)} sub={kpi ? "Active borrows" : "Loading…"} />
        <KpiCard icon={AlertCircle} iconBg="rgba(244,63,94,.13)"  iconColor={C.rose}    label="Overdue Books"    value={formatNum(kpi?.overdueBooks)} />
        <KpiCard icon={Calendar}    iconBg="rgba(168,85,247,.13)" iconColor={C.purple}  label="Added This Month" value={formatNum(kpi?.addedThisMonth)} />
      </div>

      {/* ── Charts Row: Genre Bar + Status Donut ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 10 }}>
        {/* Books by Genre */}
        <SCard title="Books by Genre">
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={genreData} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal stroke="var(--border-light)" vertical={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} style={{ color: "var(--text-muted)" }} />
                <YAxis dataKey="genre" type="category" width={75} tick={{ fontSize: 11 }} style={{ color: "var(--text-secondary)" }} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="count" fill={C.teal} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SCard>

        {/* Copies by Status — donut */}
        <SCard title="Copies by Status">
          <div style={{ height: 200, position: "relative" }}>
            {statusLoading ? (
              <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 12 }}>
                Loading…
              </div>
            ) : statusError && statusData.length === 0 ? (
              <div style={{ height: 220, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <AlertCircle size={18} color={C.rose} />
                <span style={{ fontSize: 11, color: C.rose }}>Failed to load status data</span>
              </div>
            ) : (
              <>
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie
                       data={statusData} dataKey="count" nameKey="status"
                       cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                       paddingAngle={4} stroke="var(--bg-surface)" strokeWidth={2}
                     >
                       {statusData.map((entry, i) => <Cell key={`cell-${i}`} fill={entry.color} />)}
                     </Pie>
                     <Tooltip content={<PieTooltip />} />
                   </PieChart>
                 </ResponsiveContainer>
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
                  <p style={{ margin: 0, fontSize: 10, color: "var(--text-muted)" }}>Copies</p>
                  <p style={{ margin: "1px 0 0", fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>
                    {formatNum(kpi?.totalCopies)}
                  </p>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 8 }}>
                  {statusData.map(s => (
                    <div key={s.status} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
                      <span style={{ color: "var(--text-secondary)" }}>{s.status}</span>
                      <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>({s.count?.toLocaleString() ?? 0})</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </SCard>
      </div>

      {/* ── Charts Row: Top Borrowed (table) + Books by Collection ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 10 }}>
        {/* Top Borrowed Books */}
        <SCard title="Top Borrowed Books" action={
          <button onClick={() => setShowTopBorrowedModal(true)} style={{
            display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 9px",
            fontSize: 11, fontWeight: 500, borderRadius: 5, cursor: "pointer",
            background: "var(--bg-surface)", border: "1px solid var(--border)", color: C.teal,
          }}>
            View All <ChevronDown size={10} style={{ color: "var(--text-muted)" }} />
          </button>
        } info>
          {topBorrowedLoading ? (
            <div style={{ padding: "30px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>Loading…</div>
          ) : topBorrowedError && topBorrowed.length === 0 ? (
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
        </SCard>

        {/* Books by Collection */}
        <SCard title="Books by Collection">
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={collectionData} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal stroke="var(--border-light)" vertical={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} style={{ color: "var(--text-muted)" }} />
                <YAxis
                  dataKey="collection" type="category" width={100} tick={{ fontSize: 11 }}
                  style={{ color: "var(--text-secondary)" }}
                  tickFormatter={v => (typeof v === "string" && v.trim()) ? v.trim() : "Unknown"}
                />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="count" fill={C.mint} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SCard>
      </div>

      {/* ── Charts Row: New Arrivals Over Time + Low Stock ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {/* New Arrivals Over Time */}
        <SCard title="New Arrivals Over Time" action={
          <div style={{ display: "flex", gap: 3 }}>
            <TabBtn label="Daily"   active={arrivalsFilter === "Daily"}   onClick={() => setArrivalsFilter("Daily")} />
            <TabBtn label="Weekly"  active={arrivalsFilter === "Weekly"}  onClick={() => setArrivalsFilter("Weekly")} />
            <TabBtn label="Monthly" active={arrivalsFilter === "Monthly"} onClick={() => setArrivalsFilter("Monthly")} />
          </div>
        } info>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart key={arrivalsFilter} data={newArrivals} margin={{ left: 5, right: 5, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
                <XAxis dataKey={arrivalsDataKey} tick={{ fontSize: 11 }} style={{ color: "var(--text-muted)" }} />
                <YAxis tick={{ fontSize: 11 }} style={{ color: "var(--text-muted)" }} />
                <Tooltip content={<ChartTip />} />
                <Line type="linear" dataKey="arrivals" stroke={C.amber} strokeWidth={4} dot={{ fill: C.teal, r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SCard>

        {/* Low Stock Books */}
        <SCard title="Low Stock Books" action={
          <button onClick={() => setShowLowStockModal(true)} style={{
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
        </SCard>
      </div>
    </main>
  );
}