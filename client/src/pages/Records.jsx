import { useState, useMemo } from "react";
import { Library, Search, FileDown, ChevronUp, ChevronDown as ChevronDownIcon, X, BookOpen, CheckCircle, XCircle, AlertCircle } from "lucide-react";

// ══════════════════════════════════════════════════════════════════════════════
// SAMPLE DATA
// ══════════════════════════════════════════════════════════════════════════════
const SAMPLE_BOOKS = [
  { accessionNumber: "B001", title: "Clean Code",                author: "Robert C. Martin",  category: "Programming",  total: 12, available: 8,  status: "Available"    },
  { accessionNumber: "B002", title: "The Pragmatic Programmer",  author: "David Thomas",      category: "Programming",  total: 8,  available: 0,  status: "Out of Stock" },
  { accessionNumber: "B003", title: "Design Patterns",           author: "Gang of Four",      category: "Programming",  total: 6,  available: 3,  status: "Available"    },
  { accessionNumber: "B004", title: "Atomic Habits",             author: "James Clear",       category: "Self-Help",    total: 15, available: 11, status: "Available"    },
  { accessionNumber: "B005", title: "Sapiens",                   author: "Yuval Noah Harari", category: "History",      total: 10, available: 2,  status: "Low Stock"    },
  { accessionNumber: "B006", title: "Rich Dad Poor Dad",         author: "Robert Kiyosaki",   category: "Finance",      total: 9,  available: 5,  status: "Available"    },
  { accessionNumber: "B007", title: "The Alchemist",             author: "Paulo Coelho",      category: "Fiction",      total: 11, available: 0,  status: "Out of Stock" },
  { accessionNumber: "B008", title: "Deep Work",                 author: "Cal Newport",       category: "Self-Help",    total: 7,  available: 4,  status: "Available"    },
  { accessionNumber: "B009", title: "Zero to One",               author: "Peter Thiel",       category: "Business",     total: 5,  available: 1,  status: "Low Stock"    },
  { accessionNumber: "B010", title: "Thinking, Fast and Slow",   author: "Daniel Kahneman",   category: "Psychology",   total: 8,  available: 6,  status: "Available"    },
  { accessionNumber: "B011", title: "Ikigai",                    author: "Héctor García",     category: "Self-Help",    total: 6,  available: 3,  status: "Available"    },
  { accessionNumber: "B012", title: "The Power of Now",          author: "Eckhart Tolle",     category: "Self-Help",    total: 4,  available: 0,  status: "Out of Stock" },
  { accessionNumber: "B013", title: "Refactoring",               author: "Martin Fowler",     category: "Programming",  total: 5,  available: 2,  status: "Low Stock"    },
  { accessionNumber: "B014", title: "The Subtle Art",            author: "Mark Manson",       category: "Self-Help",    total: 9,  available: 7,  status: "Available"    },
  { accessionNumber: "B015", title: "Eloquent JavaScript",       author: "Marijn Haverbeke",  category: "Programming",  total: 6,  available: 4,  status: "Available"    },
];

const CATEGORIES = ["All", ...new Set(SAMPLE_BOOKS.map(b => b.category))];
const STATUSES   = ["All", "Available", "Low Stock", "Out of Stock"];

const STATUS_STYLE = {
  "Available":    { color: "#16a34a", bg: "rgba(22,163,74,0.10)",   Icon: CheckCircle  },
  "Low Stock":    { color: "#c05a0a", bg: "rgba(234,139,51,0.10)",  Icon: AlertCircle  },
  "Out of Stock": { color: "#dc2626", bg: "rgba(220,38,38,0.10)",   Icon: XCircle      },
};

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════
function exportCSV(rows) {
  const headers = ["Accession No.", "Title", "Author", "Category", "Total", "Available", "Borrowed", "Status"];
  const lines = [
    headers.join(","),
    ...rows.map(b =>
      [b.accessionNumber, `"${b.title}"`, `"${b.author}"`, b.category,
       b.total, b.available, b.total - b.available, b.status].join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `inventory-report-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function Records() {
  const [search,   setSearch]   = useState("");
  const [category, setCategory] = useState("All");
  const [status,   setStatus]   = useState("All");
  const [sortKey,  setSortKey]  = useState("id");
  const [sortDir,  setSortDir]  = useState("asc");
  const [isExporting, setIsExporting] = useState(false);

  const filtered = useMemo(() => {
    let rows = SAMPLE_BOOKS.filter(b => {
      const q = search.toLowerCase();
      const matchSearch   = !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.id.toLowerCase().includes(q);
      const matchCategory = category === "All" || b.category === category;
      const matchStatus   = status   === "All" || b.status   === status;
      return matchSearch && matchCategory && matchStatus;
    });

    rows = [...rows].sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 :  1;
      if (av > bv) return sortDir === "asc" ?  1 : -1;
      return 0;
    });

    return rows;
  }, [search, category, status, sortKey, sortDir]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  // Summary pills
  const total     = SAMPLE_BOOKS.length;
  const totalCopy = SAMPLE_BOOKS.reduce((s, b) => s + b.total, 0);
  const available = SAMPLE_BOOKS.reduce((s, b) => s + b.available, 0);
  const borrowed  = totalCopy - available;

  return (
    <main className="flex flex-col gap-4 lg:gap-5" aria-label="Records & Inventory">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(238,162,58,0.15)" }}>
            <Library size={16} style={{ color: "#EEA23A" }} />
          </div>
          <div>
            <h1 className="text-[17px] font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
              Records
            </h1>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              Inventory · {total} titles
            </p>
          </div>
        </div>

        {/* Generate report button */}
        <button
          disabled={isExporting}
          onClick={async () => {
            setIsExporting(true);
            await new Promise(r => setTimeout(r, 1200));
            exportCSV(filtered);
            setIsExporting(false);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold transition-all duration-150 hover:opacity-90 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
          style={{ background: "#132F45", color: "#fff", boxShadow: "0 2px 8px rgba(19,47,69,0.25)", minWidth: 148 }}
        >
          {isExporting ? (
            <>
              {/* Spinning circle */}
              <svg
                width="14" height="14"
                viewBox="0 0 14 14"
                style={{ animation: "spin 0.75s linear infinite", flexShrink: 0 }}
              >
                <circle cx="7" cy="7" r="5.5" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                <path d="M7 1.5 A5.5 5.5 0 0 1 12.5 7" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Generating…
            </>
          ) : (
            <>
              <FileDown size={14} />
              Generate Report
            </>
          )}
        </button>
      </div>

      {/* ── Summary pills ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Titles",  value: total,     color: "#132F45", bg: "rgba(19,47,69,0.08)"    },
          { label: "Total Copies",  value: totalCopy, color: "#32667F", bg: "rgba(50,102,127,0.08)"  },
          { label: "Available",     value: available, color: "#16a34a", bg: "rgba(22,163,74,0.08)"   },
          { label: "Borrowed",      value: borrowed,  color: "#c05a0a", bg: "rgba(234,139,51,0.08)"  },
        ].map(p => (
          <div key={p.label}
            className="rounded-2xl px-4 py-3 flex flex-col gap-0.5"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
          >
            <span className="text-[22px] font-bold tabular-nums leading-none" style={{ color: p.color }}>{p.value}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide mt-1" style={{ color: "var(--text-muted)" }}>{p.label}</span>
            {/* Mini bar */}
            <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: "var(--border-light)" }}>
              <div className="h-full rounded-full" style={{ width: `${Math.min((p.value / totalCopy) * 100, 100)}%`, background: p.color, opacity: 0.7 }} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div
        className="rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
      >
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search title, author, ID…"
            className="w-full pl-8 pr-8 py-1.5 rounded-lg text-[12px] outline-none transition-all"
            style={{
              background: "var(--bg-subtle)",
              border: "1px solid var(--border-light)",
              color: "var(--text-primary)",
            }}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100">
              <X size={11} style={{ color: "var(--text-muted)" }} />
            </button>
          )}
        </div>

        <div className="w-px h-5 shrink-0" style={{ background: "var(--border-light)" }} />

        {/* Category */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider shrink-0" style={{ color: "var(--text-muted)" }}>Category</span>
          <div className="flex gap-1 flex-wrap">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all duration-150"
                style={{
                  background: category === c ? "#132F45" : "transparent",
                  color:      category === c ? "#fff" : "var(--text-secondary)",
                  border:     category === c ? "1px solid transparent" : "1px solid var(--border-light)",
                }}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="w-px h-5 shrink-0" style={{ background: "var(--border-light)" }} />

        {/* Status */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider shrink-0" style={{ color: "var(--text-muted)" }}>Status</span>
          <div className="flex gap-1 flex-wrap">
            {STATUSES.map(s => (
              <button key={s} onClick={() => setStatus(s)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all duration-150"
                style={{
                  background: status === s ? "rgba(238,162,58,0.18)" : "transparent",
                  color:      status === s ? "#EEA23A" : "var(--text-secondary)",
                  border:     status === s ? "1px solid rgba(238,162,58,0.35)" : "1px solid var(--border-light)",
                }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <span className="ml-auto text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0"
          style={{ background: "rgba(19,47,69,0.08)", color: "#132F45" }}>
          {filtered.length} of {total} titles
        </span>
      </div>

      {/* ── Table ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
      >
        {/* Table header */}
        <div className="px-4 py-3 flex items-center justify-between gap-2 shrink-0"
          style={{ borderBottom: "1px solid var(--border-light)" }}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(238,162,58,0.12)" }}>
              <BookOpen size={13} style={{ color: "#EEA23A" }} />
            </div>
            <h2 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
              Inventory Table
            </h2>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(238,162,58,0.10)", color: "#EEA23A" }}>
            {filtered.length} records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ background: "var(--bg-subtle)" }}>
                {[
                  { key: "accessionNumber", label: "Accession No." },
                  { key: "title",     label: "Title"     },
                  { key: "author",    label: "Author"    },
                  { key: "category",  label: "Category"  },
                  { key: "total",     label: "Total"     },
                  { key: "available", label: "Available" },
                  { key: "borrowed",  label: "Borrowed"  },
                  { key: "status",    label: "Status"    },
                ].map(col => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap"
                    style={{
                      color: sortKey === col.key ? "#EEA23A" : "var(--text-muted)",
                      borderBottom: "1px solid var(--border-light)",
                    }}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      <span className="opacity-50">
                        {sortKey === col.key
                          ? sortDir === "asc"
                            ? <ChevronUp size={10} />
                            : <ChevronDownIcon size={10} />
                          : <ChevronUp size={10} style={{ opacity: 0.3 }} />
                        }
                      </span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[12px]" style={{ color: "var(--text-muted)" }}>
                    No records match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((b, i) => {
                  const st = STATUS_STYLE[b.status];
                  const borrowed = b.total - b.available;
                  return (
                    <tr
                      key={b.accessionNumber}
                      className="transition-colors duration-100"
                      style={{
                        borderBottom: "1px solid var(--border-light)",
                        background: i % 2 === 0 ? "transparent" : "var(--bg-subtle)",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "var(--bg-subtle)"}
                    >
                      <td className="px-4 py-2.5 text-[11px] font-mono font-semibold" style={{ color: "var(--text-muted)" }}>{b.accessionNumber}</td>
                      <td className="px-4 py-2.5 text-[12px] font-semibold whitespace-nowrap" style={{ color: "var(--text-primary)" }}>{b.title}</td>
                      <td className="px-4 py-2.5 text-[12px] whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>{b.author}</td>
                      <td className="px-4 py-2.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(19,47,69,0.08)", color: "#132F45" }}>
                          {b.category}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[12px] font-bold tabular-nums text-center" style={{ color: "var(--text-primary)" }}>{b.total}</td>
                      <td className="px-4 py-2.5 text-[12px] font-bold tabular-nums text-center" style={{ color: "#16a34a" }}>{b.available}</td>
                      <td className="px-4 py-2.5 text-[12px] font-bold tabular-nums text-center" style={{ color: "#c05a0a" }}>{borrowed}</td>
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full w-fit"
                          style={{ background: st.bg, color: st.color }}>
                          <st.Icon size={10} />
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}