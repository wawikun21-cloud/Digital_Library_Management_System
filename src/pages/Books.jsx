import { useState, useRef, useEffect, useMemo } from "react";
import {
  Search, ChevronDown, QrCode, PenLine, Camera,
  Star, X, BookOpen, ImagePlus, Trash2, Loader2,
  CheckCircle2, AlertCircle, Sparkles, SlidersHorizontal,
  Edit2, PackageX,
} from "lucide-react";

/* ─── Helper ───────────────────────────────────── */
function isOutOfStock(book) {
  return book.quantity === 0 || book.status === "OutOfStock";
}

function getAutoStatus(quantity) {
  return quantity === 0 ? "OutOfStock" : "Available";
}

/* ─── API base ──────────────────────────────────── */
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

/* ─── Data ─────────────────────────────────────── */
const INITIAL_BOOKS = [
  { id:1, title:"Clean Code",               author:"Robert C. Martin", genre:"Programming",  isbn:"978-0132350884", year:2008, publisher:"Prentice Hall",  description:"A handbook of agile software craftsmanship.",           status:"Available", cover:null, quantity:5 },
  { id:2, title:"The Pragmatic Programmer", author:"Hunt & Thomas",    genre:"Programming",  isbn:"978-0135957059", year:2019, publisher:"Addison-Wesley", description:"Your journey to mastery in software development.",     status:"Borrowed",  cover:null, quantity:3 },
  { id:3, title:"Design Patterns",          author:"Gang of Four",     genre:"Architecture", isbn:"978-0201633610", year:1994, publisher:"Addison-Wesley", description:"Elements of reusable object-oriented software.",      status:"Available", cover:null, quantity:8 },
  { id:4, title:"Refactoring",              author:"Martin Fowler",    genre:"Programming",  isbn:"978-0134757599", year:2018, publisher:"Addison-Wesley", description:"Improving the design of existing code.",              status:"Overdue",   cover:null, quantity:0 },
  { id:5, title:"You Don't Know JS",        author:"Kyle Simpson",     genre:"JavaScript",   isbn:"978-1491924464", year:2015, publisher:"O'Reilly Media", description:"A deep dive into the core mechanisms of JavaScript.", status:"Available", cover:null, quantity:4 },
  { id:6, title:"The Mythical Man-Month",   author:"Frederick Brooks", genre:"Management",   isbn:"978-0201835953", year:1995, publisher:"Addison-Wesley", description:"Essays on software engineering and project management.", status:"Borrowed", cover:null, quantity:2 },
];

const EMPTY_FORM = {
  title:"", author:"", genre:"", isbn:"", year:"",
  publisher:"", description:"", status:"Available",
  cover:null, quantity:1, _mode:"manual",
};

const STATUS_STYLE = {
  Available: { bg:"rgba(50,102,127,0.12)",  color:"#32667F" },
  Borrowed:  { bg:"rgba(238,162,58,0.18)",  color:"#b87a1a" },
  Overdue:   { bg:"rgba(234,139,51,0.18)",  color:"#c05a0a" },
  OutOfStock: { bg:"rgba(220,38,38,0.18)",  color:"#dc2626" },
};

const GRADIENTS = [
  ["#132F45","#32667F"], ["#EEA23A","#EA8B33"], ["#32667F","#1a4a63"],
  ["#EA8B33","#F3B940"], ["#1d3f57","#32667F"], ["#b87a1a","#EEA23A"],
];

/* ─── Scan states ─────────────────────────────── */
const SCAN_STATE = {
  IDLE:     "idle",      // waiting for user to pick image
  SCANNING: "scanning",  // OCR request in-flight
  SUCCESS:  "success",   // metadata returned and applied
  ERROR:    "error",     // something went wrong
};

/* ─── Cover placeholder ──────────────────────── */
function CoverPlaceholder({ title, idx }) {
  const [a, b] = GRADIENTS[idx % GRADIENTS.length];
  const initials = title.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center gap-2"
      style={{ background: `linear-gradient(145deg,${a},${b})` }}
    >
      <BookOpen size={28} color="rgba(255,255,255,0.35)" />
      <span className="text-xl font-black tracking-wider" style={{ color:"rgba(255,255,255,0.75)", fontFamily:"Georgia,serif" }}>
        {initials}
      </span>
    </div>
  );
}

/* ─── Shared input style helpers ─────────────── */
const inputCls = "w-full px-3 py-2.5 rounded-lg text-[13px] border-[1.5px] outline-none transition-colors duration-150";
const inputStyle = (err = false) => ({
  background:  "var(--bg-input)",
  color:       "var(--text-primary)",
  borderColor: err ? "#EA8B33" : "var(--border)",
  fontFamily:  "inherit",
});
const focusRing = e => {
  e.target.style.borderColor = "#EEA23A";
  e.target.style.boxShadow   = "0 0 0 3px rgba(238,162,58,0.13)";
};
const blurRing = (err) => e => {
  e.target.style.borderColor = err ? "#EA8B33" : "var(--border)";
  e.target.style.boxShadow   = "none";
};

/* ══════════════════════════════════════════════ */
export default function Books() {
  const [books,        setBooks]        = useState(INITIAL_BOOKS);
  const [query,        setQuery]        = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [genreFilter,  setGenreFilter]  = useState("");
  const [sortBy,       setSortBy]       = useState("");
  const [ddOpen,       setDdOpen]       = useState(false);
  const [modal,        setModal]        = useState(false);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [errors,       setErrors]       = useState({});
  const [dragOver,     setDragOver]     = useState(false);

  // ── CRUD state ──
  const [selectedBook, setSelectedBook] = useState(null);
  const [modalMode,    setModalMode]    = useState("add"); // "add", "view", "edit"

  // ── OCR scan state ──
  const [scanState,   setScanState]   = useState(SCAN_STATE.IDLE);
  const [scanMessage, setScanMessage] = useState("");
  const [ocrRawText,  setOcrRawText]  = useState("");
  const [showOcrText, setShowOcrText] = useState(false);

  const ddRef     = useRef(null);
  const fileRef   = useRef(null);
  const scanRef   = useRef(null); // hidden input for scan-cover upload

  /* Close dropdown on outside click */
  useEffect(() => {
    const h = e => { if (ddRef.current && !ddRef.current.contains(e.target)) setDdOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  /* Lock scroll when modal open */
  useEffect(() => {
    document.body.style.overflow = modal ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modal]);

  /* Reset scan state when modal is closed */
  useEffect(() => {
    if (!modal) {
      setScanState(SCAN_STATE.IDLE);
      setScanMessage("");
      setOcrRawText("");
      setShowOcrText(false);
    }
  }, [modal]);

  /* Auto-set OutOfStock status when quantity is 0 */
  useEffect(() => {
    if (form.quantity === 0 && form.status === "Available") {
      setForm(f => ({ ...f, status: "OutOfStock" }));
    }
  }, [form.quantity]);

  /* Derived: unique genres for the filter dropdown */
  const genres = useMemo(
    () => [...new Set(books.map(b => b.genre))].sort(),
    [books]
  );

  /* Filtered + sorted book list */
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const result = books.filter(b => {
      if (q && !["title","author","genre","isbn","publisher"]
          .some(k => b[k]?.toLowerCase().includes(q))) return false;
      if (statusFilter !== "All" && b.status !== statusFilter) return false;
      if (genreFilter && b.genre !== genreFilter) return false;
      return true;
    });
    if (sortBy === "title")  result.sort((a, b) => a.title.localeCompare(b.title));
    if (sortBy === "author") result.sort((a, b) => a.author.localeCompare(b.author));
    if (sortBy === "year")   result.sort((a, b) => b.year - a.year);
    return result;
  }, [books, query, statusFilter, genreFilter, sortBy]);

  /* ── Handlers ── */
  function openModal(mode) {
    setDdOpen(false);
    setForm({ ...EMPTY_FORM, _mode: mode });
    setErrors({});
    setModal(true);
    setModalMode("add");
  }

  function readFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = e => setForm(f => ({ ...f, cover: e.target.result }));
    r.readAsDataURL(file);
  }

  function validate() {
    const e = {};
    if (!form.title.trim())     e.title     = "Title is required";
    if (!form.author.trim())    e.author    = "Author is required";
    if (!form.genre.trim())     e.genre     = "Genre is required";
    if (!form.isbn.trim())      e.isbn      = "ISBN is required";
    if (!form.year)             e.year      = "Year is required";
    if (!form.publisher.trim()) e.publisher = "Publisher is required";
    return e;
  }

  function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const quantity = Number(form.quantity) || 0;
    const autoStatus = getAutoStatus(quantity);
    setBooks(p => [...p, { ...form, id: Date.now(), year: Number(form.year), quantity, status: autoStatus }]);
    setModal(false);
    setForm(EMPTY_FORM);
  }

  /* ── CRUD Handlers ── */
  function handleViewDetails(book) {
    setSelectedBook(book);
    setModalMode("view");
    setForm({ ...book, _mode: "manual" });
    setModal(true);
  }

  function handleEdit(book) {
    setSelectedBook(book);
    setModalMode("edit");
    setForm({ ...book, _mode: "manual" });
    setErrors({});
    setModal(true);
  }

  function handleDelete(bookId) {
    if (window.confirm("Are you sure you want to delete this book?")) {
      setBooks(books.filter(b => b.id !== bookId));
    }
  }

  function handleUpdate() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const quantity = Number(form.quantity) || 0;
    const autoStatus = getAutoStatus(quantity);
    setBooks(books.map(b => b.id === selectedBook.id ? { ...form, id: selectedBook.id, year: Number(form.year), quantity, status: autoStatus } : b));
    setModal(false);
    setForm(EMPTY_FORM);
    setSelectedBook(null);
  }

  function handleCloseModal() {
    setModal(false);
    setForm(EMPTY_FORM);
    setSelectedBook(null);
    setModalMode("add");
  }

  /* ── OCR Scan Cover ─────────────────────────────────────
     1. User picks an image file via the hidden scanRef input
     2. We POST it as multipart/form-data to /api/scan-book-cover
     3. Backend runs Vision OCR → Google Books lookup
     4. We auto-fill form fields with returned metadata
     5. User can edit any field before saving
  ──────────────────────────────────────────────────────── */
  async function handleScanFile(file) {
    if (!file) return;

    // Client-side validation (mirrors server-side)
    if (!file.type.startsWith("image/")) {
      setScanState(SCAN_STATE.ERROR);
      setScanMessage("Please select an image file (JPEG, PNG, WEBP, etc.)");
      return;
    }
    if (file.size > 1 * 1024 * 1024) {
      setScanState(SCAN_STATE.ERROR);
      setScanMessage("Image is too large. Maximum size is 1 MB (OCR.space free tier limit).");
      return;
    }

    setScanState(SCAN_STATE.SCANNING);
    setScanMessage("Scanning cover with OCR.space…");
    setOcrRawText("");
    setShowOcrText(false);

    // Also set the image as the cover preview
    const r = new FileReader();
    r.onload = e => setForm(f => ({ ...f, cover: e.target.result }));
    r.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append("cover", file);   // must match upload.single("cover") in backend

      const res = await fetch(`${API_BASE}/api/scan-book-cover`, {
        method: "POST",
        body:   formData,
        // Do NOT set Content-Type header — browser sets it with boundary automatically
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setScanState(SCAN_STATE.ERROR);
        setScanMessage(data.error || "Scan failed. Please try again.");
        return;
      }

      // Store raw OCR text for optional display
      if (data.ocrText) setOcrRawText(data.ocrText);

      // No text detected at all
      if (!data.ocrText) {
        setScanState(SCAN_STATE.ERROR);
        setScanMessage(data.message || "No text detected in image. Try a clearer photo.");
        return;
      }

      // Auto-fill form fields with book metadata (allow manual override)
      if (data.book) {
        const b = data.book;
        setForm(f => ({
          ...f,
          title:       b.title                    || f.title,
          author:      b.author                   || f.author,
          publisher:   b.publisher                || f.publisher,
          year:        b.publishedDate ? b.publishedDate.slice(0, 4) : f.year,
          description: b.description              || f.description,
          isbn:        b.isbn || data.isbn        || f.isbn,
          cover:       b.thumbnail               || f.cover,
        }));
        setErrors({});

        const isbnNote = (b.isbn || data.isbn) ? ` (ISBN: ${b.isbn || data.isbn})` : "";
        const src      = data.strategy === "open-library" ? "Open Library"
                       : data.strategy === "google-books" ? "Google Books"
                       : data.strategy?.includes("isbn") ? "ISBN lookup"
                       : "metadata lookup";
        setScanState(SCAN_STATE.SUCCESS);
        setScanMessage(`Book identified via ${src}${isbnNote}. Fields filled — review and edit as needed.`);

      } else if (data.parsed) {
        // Open Library had no match — use Claude AI extracted metadata directly
        const p = data.parsed;
        setForm(f => ({
          ...f,
          title:     p.title                                       || f.title,
          author:    Array.isArray(p.authors)
                       ? p.authors.join(", ")
                       : p.authors                                 || f.author,
          publisher: p.publisher                                   || f.publisher,
          year:      p.published_date ? String(p.published_date).slice(0, 4) : f.year,
          isbn:      data.isbn || p.isbn                           || f.isbn,
        }));
        setErrors({});
        setScanState(SCAN_STATE.SUCCESS);
        setScanMessage("Cover scanned — fields filled from AI extraction. Review and edit as needed.");

      } else {
        // OCR ran but nothing useful found — at least fill ISBN if detected
        setForm(f => ({
          ...f,
          isbn: data.isbn || f.isbn,
        }));
        setScanState(SCAN_STATE.ERROR);
        setScanMessage(data.message || "OCR complete but no book metadata found. Fill in fields manually.");
      }
    } catch (networkErr) {
      console.error("[Scan error]", networkErr);
      setScanState(SCAN_STATE.ERROR);
      setScanMessage("Could not reach the server. Make sure the backend is running on port 3001.");
    }
  }

  /* ════════════════ RENDER ════════════════ */
  return (
    <div className="flex flex-col gap-5">

      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-2.5">

        {/* Row 1 — search + selects + add button */}
        <div className="flex flex-wrap items-center gap-2.5 justify-between">

          {/* Left: search + genre + sort */}
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">

            {/* Search input */}
            <div
              className="relative flex items-center gap-2 px-3 py-2 rounded-lg flex-1 min-w-[200px] max-w-sm"
              style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", boxShadow:"var(--shadow-sm)" }}
            >
              <Search size={14} className="shrink-0" style={{ color:"var(--text-secondary)" }} />
              <input
                className="border-none outline-none text-[13px] bg-transparent w-full"
                style={{ color:"var(--text-primary)" }}
                placeholder="Search title, author, genre, ISBN…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="shrink-0 flex items-center justify-center w-4 h-4 rounded-full transition-colors duration-100"
                  style={{ color:"var(--text-muted)" }}
                  onMouseEnter={e => e.currentTarget.style.color = "var(--accent-amber)"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Genre filter */}
            <div className="relative flex items-center">
              <SlidersHorizontal
                size={13}
                className="absolute left-2.5 pointer-events-none"
                style={{ color:"var(--text-secondary)" }}
              />
              <select
                value={genreFilter}
                onChange={e => setGenreFilter(e.target.value)}
                className="pl-7 pr-3 py-2 rounded-lg text-[12.5px] font-medium border outline-none appearance-none cursor-pointer transition-colors duration-150"
                style={{
                  background:  "var(--bg-surface)",
                  border:      "1px solid var(--border)",
                  color:       genreFilter ? "var(--accent-amber)" : "var(--text-secondary)",
                  boxShadow:   "var(--shadow-sm)",
                  fontFamily:  "inherit",
                }}
                onFocus={e => { e.target.style.borderColor="#EEA23A"; e.target.style.boxShadow="0 0 0 3px rgba(238,162,58,0.12)"; }}
                onBlur={e  => { e.target.style.borderColor="var(--border)"; e.target.style.boxShadow="var(--shadow-sm)"; }}
              >
                <option value="">All Genres</option>
                {genres.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-lg text-[12.5px] font-medium border outline-none appearance-none cursor-pointer transition-colors duration-150"
              style={{
                background: "var(--bg-surface)",
                border:     "1px solid var(--border)",
                color:      sortBy ? "var(--accent-amber)" : "var(--text-secondary)",
                boxShadow:  "var(--shadow-sm)",
                fontFamily: "inherit",
              }}
              onFocus={e => { e.target.style.borderColor="#EEA23A"; e.target.style.boxShadow="0 0 0 3px rgba(238,162,58,0.12)"; }}
              onBlur={e  => { e.target.style.borderColor="var(--border)"; e.target.style.boxShadow="var(--shadow-sm)"; }}
            >
              <option value="">Sort: Default</option>
              <option value="title">Title A–Z</option>
              <option value="author">Author A–Z</option>
              <option value="year">Newest First</option>
            </select>
          </div>

          {/* Add Book dropdown */}
          <div className="relative shrink-0" ref={ddRef}>
            <button
              onClick={() => setDdOpen(o => !o)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold text-white transition-colors duration-150"
              style={{ background:"var(--accent-amber)", boxShadow:"0 2px 6px rgba(238,162,58,0.3)" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--accent-orange)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--accent-amber)"}
            >
              + Add Book
              <ChevronDown
                size={14}
                className="transition-transform duration-200"
                style={{ transform: ddOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              />
            </button>

            {ddOpen && (
              <div
                className="anim-drop absolute right-0 top-[calc(100%+6px)] w-48 rounded-xl p-1.5 z-20"
                style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", boxShadow:"var(--shadow-lg)" }}
              >
                {[
                  { mode:"scan-cover", Icon: Camera,  label:"Scan Cover (OCR)" },
                  { mode:"scan",       Icon: QrCode,   label:"Scan Barcode" },
                  { mode:"manual",     Icon: PenLine,  label:"Add Manually" },
                ].map(({ mode, Icon, label }) => (
                  <button
                    key={mode}
                    onClick={() => openModal(mode)}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors duration-100"
                    style={{ color:"var(--text-primary)" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(238,162,58,0.1)"; e.currentTarget.style.color = "#EEA23A"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-primary)"; }}
                  >
                    <Icon size={15} /> {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>{/* /Row 1 */}

        {/* Row 2 — status chips + result count */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          {/* Status filter chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {["All","Available","Borrowed","Overdue","OutOfStock"].map(s => {
              const active = statusFilter === s;
              const chipColor = s === "Available" ? "#32667F" : s === "Borrowed" ? "#b87a1a" : s === "Overdue" ? "#c05a0a" : s === "OutOfStock" ? "#dc2626" : null;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
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
                  {s}
                </button>
              );
            })}
          </div>

          {/* Result count */}
          <p className="text-[12px] tabular-nums" style={{ color:"var(--text-muted)" }}>
            {filtered.length === books.length
              ? `${books.length} book${books.length !== 1 ? "s" : ""}`
              : `${filtered.length} of ${books.length} books`}
          </p>
        </div>
      </div>{/* /Toolbar */}

      {/* ── Book Card Grid ── */}
      {filtered.length === 0 ? (
        <p className="text-center py-10 text-sm" style={{ color:"var(--text-secondary)" }}>
          No books found.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
          {filtered.map((b, idx) => {
            const sc = STATUS_STYLE[b.status] ?? STATUS_STYLE.Available;
            return (
              <div
                key={b.id}
                className="flex flex-col rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1"
                style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", boxShadow:"var(--shadow-sm)" }}
              >
                {/* Cover */}
                <div className="relative w-full shrink-0" style={{ aspectRatio:"2/3", overflow:"hidden" }}>
                  {b.cover
                    ? <img src={b.cover} alt={b.title} className="w-full h-full object-cover" />
                    : <CoverPlaceholder title={b.title} idx={idx} />
                  }
                  {(b.status === "Available" || b.status === "OutOfStock") && (
                    <span
                      className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={sc}
                    >
                      {b.status}
                    </span>
                  )}
                  {isOutOfStock(b) && (
                    <div
                      className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1"
                    >
                      <PackageX size={24} color="#dc2626" />
                      <span className="text-[10px] font-bold text-red-500">OUT OF STOCK</span>
                    </div>
                  )}
                </div>

                {/* Meta row */}
                <div className="px-3 pt-2.5 pb-1 flex items-center gap-1 flex-wrap">
                  <Star size={11} fill="#EEA23A" color="#EEA23A" />
                  <span className="text-[11px]" style={{ color:"var(--text-secondary)" }}>N/A</span>
                  <span className="text-[11px]" style={{ color:"var(--border)" }}>·</span>
                  <span
                    className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded"
                    style={{ background:"rgba(238,162,58,0.1)", color:"var(--accent-amber)" }}
                  >
                    {b.genre}
                  </span>
                  <span className="text-[11px]" style={{ color:"var(--border)" }}>·</span>
                  <span className="text-[11px]" style={{ color:"var(--text-secondary)" }}>{b.year}</span>
                  <span className="text-[11px]" style={{ color:"var(--border)" }}>·</span>
                  <span 
                    className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded"
                    style={{ 
                      background: isOutOfStock(b) ? "rgba(220,38,38,0.15)" : "rgba(50,127,79,0.15)", 
                      color: isOutOfStock(b) ? "#dc2626" : "#2d7a47" 
                    }}
                  >
                    {b.quantity}/{b.quantity + ((b.status === "Borrowed" || b.status === "Overdue") ? 1 : 0) || 1}
                  </span>
                </div>

                {/* Title + author */}
                <div className="px-3 pb-2 flex-1">
                  <p className="text-[13px] font-bold leading-snug mb-0.5 clamp-2" style={{ color:"var(--text-primary)" }}>
                    {b.title}
                  </p>
                  <p className="text-[11.5px] truncate" style={{ color:"var(--text-secondary)" }}>
                    {b.author}
                  </p>
                </div>

                {/* Action */}
                <div className="flex">
                  <button
                    onClick={() => handleViewDetails(b)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold text-white transition-colors duration-150"
                    style={{ background:"var(--bg-sidebar)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#32667F"}
                    onMouseLeave={e => e.currentTarget.style.background = "var(--bg-sidebar)"}
                  >
                    <BookOpen size={12} /> View
                  </button>
                  <button
                    onClick={() => handleEdit(b)}
                    className="flex items-center justify-center px-3 py-2 text-[11px] font-semibold text-white transition-colors duration-150"
                    style={{ background:"rgba(50,102,127,0.8)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#32667F"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(50,102,127,0.8)"}
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="flex items-center justify-center px-3 py-2 text-[11px] font-semibold text-white transition-colors duration-150"
                    style={{ background:"rgba(234,139,51,0.8)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#c05a0a"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(234,139,51,0.8)"}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ════════ ADD BOOK MODAL ════════ */}
      {modal && (
        <div
          className="anim-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background:"rgba(10,22,34,0.6)", backdropFilter:"blur(3px)" }}
          onClick={e => e.target === e.currentTarget && setModal(false)}
        >
          <div
            className="anim-modal w-full max-w-[640px] max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
            style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", boxShadow:"var(--shadow-xl)" }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-5 shrink-0"
              style={{ borderBottom:"1px solid var(--border-light)" }}
            >
              <div className="flex items-center gap-2.5">
                {modalMode === "view" && <BookOpen size={18} style={{ color:"var(--accent-amber)" }} />}
                {modalMode === "edit" && <PenLine size={18} style={{ color:"var(--accent-amber)" }} />}
                {modalMode === "add" && form._mode === "scan-cover" && <Camera size={18} style={{ color:"var(--accent-amber)" }} />}
                {modalMode === "add" && form._mode === "scan" && <QrCode size={18} style={{ color:"var(--accent-amber)" }} />}
                {modalMode === "add" && form._mode === "manual" && <PenLine size={18} style={{ color:"var(--accent-amber)" }} />}
                <h2 className="text-base font-bold" style={{ color:"var(--text-primary)" }}>
                  {modalMode === "view" ? "Book Details"
                   : modalMode === "edit" ? "Edit Book"
                   : form._mode === "scan-cover" ? "Scan Book Cover (OCR)"
                   : form._mode === "scan" ? "Scan Barcode"
                   : "Add Book Manually"}
                </h2>
              </div>
              <button
                onClick={handleCloseModal}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors duration-150"
                style={{ background:"var(--bg-hover)", color:"var(--text-secondary)" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(238,162,58,0.15)"; e.currentTarget.style.color = "#EEA23A"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">

              {/* ══ VIEW MODE — Read-only details ══ */}
              {modalMode === "view" && (
                <div className="flex flex-col gap-5">
                  {/* Cover */}
                  <div className="flex items-start gap-5">
                    {form.cover ? (
                      <img
                        src={form.cover}
                        alt={form.title}
                        className="w-32 h-44 object-cover rounded-lg shrink-0"
                        style={{ boxShadow:"var(--shadow-md)" }}
                      />
                    ) : (
                      <div
                        className="w-32 h-44 rounded-lg shrink-0 flex items-center justify-center"
                        style={{ background:"var(--bg-subtle)", border:"1px solid var(--border)" }}
                      >
                        <BookOpen size={32} style={{ color:"var(--text-muted)" }} />
                      </div>
                    )}
                    <div className="flex flex-col gap-2 flex-1">
                      <div>
                        <h3 className="text-lg font-bold" style={{ color:"var(--text-primary)" }}>{form.title}</h3>
                        <p className="text-sm" style={{ color:"var(--text-secondary)" }}>{form.author}</p>
                      </div>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <DetailItem label="Genre" value={form.genre} />
                    <DetailItem label="ISBN" value={form.isbn} />
                    <DetailItem label="Year" value={form.year} />
                    <DetailItem label="Publisher" value={form.publisher} />
                    <DetailItem label="Quantity" value={form.quantity} />
                    <DetailItem label="Availability" value={isOutOfStock(form) ? "Out of Stock" : "In Stock"} />
                  </div>

                  {/* Description */}
                  {form.description && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color:"var(--text-secondary)" }}>
                        Description
                      </label>
                      <p className="text-sm" style={{ color:"var(--text-primary)" }}>{form.description}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ══ EDIT MODE — Form fields ══ */}
              {modalMode === "edit" && (
                <div className="flex flex-col gap-4">
                  {/* Cover Upload */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color:"var(--text-secondary)" }}>
                      Book Cover
                    </label>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => readFile(e.target.files[0])}
                    />

                    {form.cover ? (
                      <div
                        className="flex items-start gap-4 p-3.5 rounded-xl"
                        style={{ background:"var(--bg-subtle)", border:"1.5px solid var(--border)" }}
                      >
                        <img
                          src={form.cover}
                          alt="Cover preview"
                          className="w-20 h-28 object-cover rounded-lg shrink-0"
                          style={{ boxShadow:"var(--shadow-md)", border:"2px solid var(--bg-surface)" }}
                        />
                        <div className="flex flex-col gap-2 pt-1">
                          <button
                            onClick={() => fileRef.current?.click()}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border-[1.5px] transition-colors duration-150"
                            style={{ background:"rgba(238,162,58,0.1)", borderColor:"rgba(238,162,58,0.3)", color:"#b87a1a" }}
                          >
                            <ImagePlus size={14} /> Change
                          </button>
                          <button
                            onClick={() => {
                              setForm(f => ({ ...f, cover:null }));
                              if (fileRef.current) fileRef.current.value = "";
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border-[1.5px] transition-colors duration-150"
                            style={{ background:"rgba(234,139,51,0.08)", borderColor:"rgba(234,139,51,0.25)", color:"#c05a0a" }}
                          >
                            <Trash2 size={14} /> Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="flex flex-col items-center justify-center gap-2 py-7 rounded-xl border-2 border-dashed cursor-pointer text-center select-none transition-colors duration-150"
                        style={{ background:"var(--bg-subtle)", borderColor:"var(--border)" }}
                        onClick={() => fileRef.current?.click()}
                      >
                        <ImagePlus size={28} style={{ color:"var(--text-secondary)" }} />
                        <p className="text-[13px]" style={{ color:"var(--text-secondary)" }}>Click to upload cover</p>
                      </div>
                    )}
                  </div>

                  {/* Text fields 2-col */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <Field label="Title"          fkey="title"       form={form} setForm={setForm} errors={errors} setErrors={setErrors} />
                    <Field label="Author"         fkey="author"      form={form} setForm={setForm} errors={errors} setErrors={setErrors} />
                    <Field label="Genre"          fkey="genre"       form={form} setForm={setForm} errors={errors} setErrors={setErrors} />
                    <Field label="ISBN Number"    fkey="isbn"        placeholder="e.g. 978-0000000000" form={form} setForm={setForm} errors={errors} setErrors={setErrors} />
                    <Field label="Year Published" fkey="year"        type="number" placeholder="e.g. 2024" form={form} setForm={setForm} errors={errors} setErrors={setErrors} />
                    <Field label="Publisher"      fkey="publisher"   form={form} setForm={setForm} errors={errors} setErrors={setErrors} />
                    <Field label="Quantity"       fkey="quantity"    type="number" placeholder="e.g. 5" form={form} setForm={setForm} errors={errors} setErrors={setErrors} />
                  </div>

                  {/* Description */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color:"var(--text-secondary)" }}>
                      Description
                    </label>
                    <textarea
                      className={`${inputCls} resize-y`}
                      style={inputStyle()}
                      onFocus={focusRing}
                      onBlur={blurRing(false)}
                      rows={3}
                      placeholder="Short description of the book…"
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {/* ══ ADD MODE — Form fields ══ */}
              {(modalMode === "add") && (
                <>
              {/* ══ SCAN COVER MODE — OCR section ══ */}
              {form._mode === "scan-cover" && (
                <div className="flex flex-col gap-3">

                  {/* Hidden file input for scan */}
                  <input
                    ref={scanRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => handleScanFile(e.target.files[0])}
                  />

                  {/* Instruction banner */}
                  <div
                    className="flex items-start gap-3 p-4 rounded-xl"
                    style={{ background:"rgba(238,162,58,0.08)", border:"1.5px solid rgba(238,162,58,0.2)" }}
                  >
                    <Sparkles size={18} style={{ color:"var(--accent-amber)", flexShrink:0, marginTop:1 }} />
                    <div>
                      <p className="text-[13px] font-semibold mb-0.5" style={{ color:"var(--text-primary)" }}>
                        OCR Book Cover Scanner
                      </p>
                      <p className="text-[12px]" style={{ color:"var(--text-secondary)" }}>
                        Upload a photo of a book cover. OCR.space will read the text, then
                        Open Library and Google Books will auto-fill the form fields.
                      </p>
                    </div>
                  </div>

                  {/* Upload trigger */}
                  <button
                    onClick={() => scanRef.current?.click()}
                    disabled={scanState === SCAN_STATE.SCANNING}
                    className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-xl text-[13px] font-semibold border-2 border-dashed transition-colors duration-150"
                    style={{
                      background:   scanState === SCAN_STATE.SCANNING ? "var(--bg-subtle)" : "rgba(238,162,58,0.05)",
                      borderColor:  scanState === SCAN_STATE.SCANNING ? "var(--border)"    : "rgba(238,162,58,0.35)",
                      color:        scanState === SCAN_STATE.SCANNING ? "var(--text-muted)" : "var(--accent-amber)",
                      cursor:       scanState === SCAN_STATE.SCANNING ? "not-allowed" : "pointer",
                    }}
                  >
                    {scanState === SCAN_STATE.SCANNING ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Scanning with OCR.space…                      </>
                    ) : (
                      <>
                        <Camera size={16} />
                        {form.cover ? "Scan a Different Cover" : "Upload Cover Image to Scan"}
                      </>
                    )}
                  </button>

                  {/* Status feedback banner */}
                  {scanState !== SCAN_STATE.IDLE && (
                    <div
                      className="flex items-start gap-2.5 p-3.5 rounded-xl text-[12.5px]"
                      style={{
                        background: scanState === SCAN_STATE.SUCCESS
                          ? "rgba(50,127,79,0.08)"
                          : scanState === SCAN_STATE.ERROR
                          ? "rgba(234,139,51,0.08)"
                          : "rgba(50,102,127,0.08)",
                        border: `1px solid ${
                          scanState === SCAN_STATE.SUCCESS
                            ? "rgba(50,127,79,0.2)"
                            : scanState === SCAN_STATE.ERROR
                            ? "rgba(234,139,51,0.25)"
                            : "rgba(50,102,127,0.2)"
                        }`,
                        color: scanState === SCAN_STATE.SUCCESS
                          ? "#2d7a47"
                          : scanState === SCAN_STATE.ERROR
                          ? "#c05a0a"
                          : "#32667F",
                      }}
                    >
                      {scanState === SCAN_STATE.SUCCESS  && <CheckCircle2 size={15} style={{ flexShrink:0, marginTop:1 }} />}
                      {scanState === SCAN_STATE.ERROR    && <AlertCircle  size={15} style={{ flexShrink:0, marginTop:1 }} />}
                      {scanState === SCAN_STATE.SCANNING && <Loader2      size={15} className="animate-spin" style={{ flexShrink:0, marginTop:1 }} />}
                      <span>{scanMessage}</span>
                    </div>
                  )}

                  {/* OCR raw text collapsible */}
                  {ocrRawText && (
                    <div>
                      <button
                        onClick={() => setShowOcrText(v => !v)}
                        className="text-[11px] font-semibold flex items-center gap-1 mb-1"
                        style={{ color:"var(--text-muted)" }}
                      >
                        <ChevronDown
                          size={12}
                          style={{ transform: showOcrText ? "rotate(180deg)" : "rotate(0deg)", transition:"transform 0.15s" }}
                        />
                        {showOcrText ? "Hide" : "Show"} raw OCR text
                      </button>
                      {showOcrText && (
                        <pre
                          className="text-[11px] p-3 rounded-lg overflow-x-auto whitespace-pre-wrap"
                          style={{
                            background:  "var(--bg-subtle)",
                            border:      "1px solid var(--border-light)",
                            color:       "var(--text-secondary)",
                            maxHeight:   120,
                            overflowY:   "auto",
                            fontFamily:  "monospace",
                          }}
                        >
                          {ocrRawText}
                        </pre>
                      )}
                    </div>
                  )}

                  {/* Divider */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px" style={{ background:"var(--border-light)" }} />
                    <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color:"var(--text-muted)" }}>
                      Review &amp; Edit Fields
                    </span>
                    <div className="flex-1 h-px" style={{ background:"var(--border-light)" }} />
                  </div>
                </div>
              )}

              {/* ══ BARCODE MODE ══ */}
              {form._mode === "scan" && (
                <div
                  className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-dashed text-[13px] text-center"
                  style={{ background:"var(--bg-subtle)", borderColor:"var(--border)", color:"var(--text-secondary)" }}
                >
                  <QrCode size={40} style={{ color:"var(--text-secondary)" }} />
                  <p>Point camera at barcode or enter ISBN manually below</p>
                </div>
              )}

              {/* ── Cover Upload (shared across all modes) ── */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color:"var(--text-secondary)" }}>
                  Book Cover
                </label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => readFile(e.target.files[0])}
                />

                {form.cover ? (
                  <div
                    className="flex items-start gap-4 p-3.5 rounded-xl"
                    style={{ background:"var(--bg-subtle)", border:"1.5px solid var(--border)" }}
                  >
                    <img
                      src={form.cover}
                      alt="Cover preview"
                      className="w-20 h-28 object-cover rounded-lg shrink-0"
                      style={{ boxShadow:"var(--shadow-md)", border:"2px solid var(--bg-surface)" }}
                    />
                    <div className="flex flex-col gap-2 pt-1">
                      <button
                        onClick={() => fileRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border-[1.5px] transition-colors duration-150"
                        style={{ background:"rgba(238,162,58,0.1)", borderColor:"rgba(238,162,58,0.3)", color:"#b87a1a" }}
                      >
                        <ImagePlus size={14} /> Change
                      </button>
                      <button
                        onClick={() => {
                          setForm(f => ({ ...f, cover:null }));
                          if (fileRef.current) fileRef.current.value = "";
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border-[1.5px] transition-colors duration-150"
                        style={{ background:"rgba(234,139,51,0.08)", borderColor:"rgba(234,139,51,0.25)", color:"#c05a0a" }}
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="flex flex-col items-center justify-center gap-2 py-7 rounded-xl border-2 border-dashed cursor-pointer text-center select-none transition-colors duration-150"
                    style={{
                      background:  dragOver ? "rgba(238,162,58,0.05)" : "var(--bg-subtle)",
                      borderColor: dragOver ? "var(--accent-amber)"   : "var(--border)",
                    }}
                    onClick={() => fileRef.current?.click()}
                    onDragOver={e  => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => { e.preventDefault(); setDragOver(false); readFile(e.dataTransfer.files[0]); }}
                  >
                    <ImagePlus size={28} style={{ color: dragOver ? "#EEA23A" : "var(--text-secondary)" }} />
                    <p className="text-[13px]" style={{ color:"var(--text-secondary)" }}>
                      <span className="font-bold underline underline-offset-2" style={{ color:"var(--accent-amber)" }}>
                        Click to upload
                      </span>{" "}
                      or drag &amp; drop
                    </p>
                    <p className="text-[11px]" style={{ color:"var(--text-muted)" }}>
                      PNG, JPG, WEBP — max 5 MB
                    </p>
                  </div>
                )}
              </div>

              {/* ── Text fields 2-col ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Field label="Title"          fkey="title"       form={form} setForm={setForm} errors={errors} setErrors={setErrors} />
                <Field label="Author"         fkey="author"      form={form} setForm={setForm} errors={errors} setErrors={setErrors} />
                <Field label="Genre"          fkey="genre"       form={form} setForm={setForm} errors={errors} setErrors={setErrors} />
                <Field label="ISBN Number"    fkey="isbn"        placeholder="e.g. 978-0000000000" form={form} setForm={setForm} errors={errors} setErrors={setErrors} />
                <Field label="Year Published" fkey="year"        type="number" placeholder="e.g. 2024" form={form} setForm={setForm} errors={errors} setErrors={setErrors} />
                <Field label="Publisher"      fkey="publisher"   form={form} setForm={setForm} errors={errors} setErrors={setErrors} />
                <Field label="Quantity"       fkey="quantity"    type="number" placeholder="e.g. 5" form={form} setForm={setForm} errors={errors} setErrors={setErrors} />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color:"var(--text-secondary)" }}>
                  Description
                </label>
                <textarea
                  className={`${inputCls} resize-y`}
                  style={inputStyle()}
                  onFocus={focusRing}
                  onBlur={blurRing(false)}
                  rows={3}
                  placeholder="Short description of the book…"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div
              className="flex justify-end gap-2.5 px-6 py-4 shrink-0"
              style={{ borderTop:"1px solid var(--border-light)" }}
            >
              {modalMode === "view" && (
                <>
                  <ModalBtn 
                    onClick={() => handleDelete(selectedBook.id)}
                    style={{ background:"rgba(234,139,51,0.1)", color:"#c05a0a", border:"1.5px solid rgba(234,139,51,0.3)" }}
                  >
                    Delete
                  </ModalBtn>
                  <ModalBtn secondary onClick={() => { setModalMode("edit"); setForm({ ...selectedBook, _mode: "manual" }); }}>
                    Edit
                  </ModalBtn>
                  <ModalBtn onClick={handleCloseModal}>Close</ModalBtn>
                </>
              )}
              {modalMode === "edit" && (
                <>
                  <ModalBtn secondary onClick={handleCloseModal}>Cancel</ModalBtn>
                  <ModalBtn onClick={handleUpdate}>Update Book</ModalBtn>
                </>
              )}
              {modalMode === "add" && (
                <>
                  <ModalBtn secondary onClick={handleCloseModal}>Cancel</ModalBtn>
                  <ModalBtn onClick={handleSubmit}>Save Book</ModalBtn>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Reusable form field ── */
function Field({ label, fkey, type = "text", placeholder = "", form, setForm, errors, setErrors }) {
  const err = errors[fkey];
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color:"var(--text-secondary)" }}>
        {label}
      </label>
      <input
        className={inputCls}
        style={inputStyle(!!err)}
        onFocus={focusRing}
        onBlur={blurRing(!!err)}
        type={type}
        placeholder={placeholder || label}
        value={form[fkey]}
        onChange={e => {
          setForm(f => ({ ...f, [fkey]: e.target.value }));
          if (err) setErrors(v => { const n = { ...v }; delete n[fkey]; return n; });
        }}
      />
      {err && <span className="text-[11px] font-medium text-orange-500">{err}</span>}
    </div>
  );
}

/* ── Reusable modal button ── */
function ModalBtn({ children, onClick, secondary, style }) {
  const defaultStyle = secondary
    ? { background:"var(--bg-surface)", color:"var(--text-secondary)", border:"1.5px solid var(--border)" }
    : { background:"var(--accent-amber)", color:"#fff", border:"none" };
  const mergedStyle = style ? { ...defaultStyle, ...style } : defaultStyle;
  
  return (
    <button
      onClick={onClick}
      className="px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-colors duration-150"
      style={mergedStyle}
      onMouseEnter={e => e.currentTarget.style.background = secondary ? "var(--bg-hover)" : "var(--accent-orange)"}
      onMouseLeave={e => e.currentTarget.style.background = mergedStyle.background}
    >
      {children}
    </button>
  );
}

/* ── Detail item for view mode ── */
function DetailItem({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color:"var(--text-muted)" }}>
        {label}
      </label>
      <span className="text-[13px]" style={{ color:"var(--text-primary)" }}>
        {value || "—"}
      </span>
    </div>
  );
}
