import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import {
  Search, ChevronDown, QrCode, PenLine,
  Star, X, BookOpen, ImagePlus, Trash2, Loader2,
  CheckCircle2, AlertCircle, SlidersHorizontal,
  Edit2, PackageX,
} from "lucide-react";
import BookCard from "../components/BookCard";
import ConfirmationModal from "../components/ConfirmationModal";
import Toast from "../components/Toast";

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
  { id:2, title:"The Pragmatic Programmer", author:"Hunt & Thomas",    genre:"Programming",  isbn:"978-0135957059", year:2019, publisher:"Addison-Wesley", description:"Your journey to mastery in software development.",     status:"Available", cover:null, quantity:3 },
  { id:3, title:"Design Patterns",          author:"Gang of Four",     genre:"Architecture", isbn:"978-0201633610", year:1994, publisher:"Addison-Wesley", description:"Elements of reusable object-oriented software.",      status:"Available", cover:null, quantity:8 },
  { id:4, title:"Refactoring",              author:"Martin Fowler",    genre:"Programming",  isbn:"978-0134757599", year:2018, publisher:"Addison-Wesley", description:"Improving the design of existing code.",              status:"OutOfStock", cover:null, quantity:0 },
  { id:5, title:"You Don't Know JS",        author:"Kyle Simpson",     genre:"JavaScript",   isbn:"978-1491924464", year:2015, publisher:"O'Reilly Media", description:"A deep dive into the core mechanisms of JavaScript.", status:"Available", cover:null, quantity:4 },
  { id:6, title:"The Mythical Man-Month",   author:"Frederick Brooks", genre:"Management",   isbn:"978-0201835953", year:1995, publisher:"Addison-Wesley", description:"Essays on software engineering and project management.", status:"Available", cover:null, quantity:2 },
];

const EMPTY_FORM = {
  title:"", author:"", genre:"", isbn:"", year:"",
  publisher:"", description:"", status:"Available",
  cover:null, quantity:1, _mode:"manual",
};

const STATUS_STYLE = {
  Available: { bg:"rgba(50,102,127,0.12)",  color:"#32667F" },
  OutOfStock: { bg:"rgba(220,38,38,0.18)",  color:"#dc2626" },
};

const GRADIENTS = [
  ["#132F45","#32667F"], ["#EEA23A","#EA8B33"], ["#32667F","#1a4a63"],
  ["#EA8B33","#F3B940"], ["#1d3f57","#32667F"], ["#b87a1a","#EEA23A"],
];

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
  const [books, setBooks] = useState(() => {
    const saved = localStorage.getItem("LEXORA_BOOKS");
    return saved ? JSON.parse(saved) : INITIAL_BOOKS;
  });

  useEffect(() => {
    localStorage.setItem("LEXORA_BOOKS", JSON.stringify(books));
  }, [books]);

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

  // ── Delete confirmation modal state ──
  const [deleteModal, setDeleteModal] = useState({ open: false, bookId: null, bookTitle: "" });

  // ── Toast state ──
  const [toast, setToast] = useState({ visible: false, message: "", type: "info" });

  // ── Title/Author lookup state ──
  const [lookupTitle,   setLookupTitle]   = useState("");
  const [lookupAuthor,  setLookupAuthor]  = useState("");
  const [lookupResults, setLookupResults] = useState([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError,   setLookupError]   = useState("");
  const [lookupDone,    setLookupDone]    = useState(false);

  // ── Barcode scanner state ──
  const [scanActive,    setScanActive]    = useState(false);  // camera is live
  const [scanStatus,    setScanStatus]    = useState("idle"); // idle | scanning | found | error | fetching
  const [scanFeedback,  setScanFeedback]  = useState("");
  const [manualIsbn,    setManualIsbn]    = useState("");
  const [cameras,       setCameras]       = useState([]);     // available video devices
  const [activeCamIdx,  setActiveCamIdx]  = useState(0);
  const videoRef  = useRef(null);
  const readerRef = useRef(null);   // BrowserMultiFormatReader instance

  const ddRef     = useRef(null);
  const fileRef   = useRef(null);

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

  /* Reset lookup + barcode state when modal is closed */
  useEffect(() => {
    if (!modal) {
      setLookupTitle("");
      setLookupAuthor("");
      setLookupResults([]);
      setLookupLoading(false);
      setLookupError("");
      setLookupDone(false);
      stopScanner();
      setScanActive(false);
      setScanStatus("idle");
      setScanFeedback("");
      setManualIsbn("");
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
      if (statusFilter !== "All" && statusFilter === "OutOfStock" && !isOutOfStock(b)) return false;
      if (statusFilter !== "All" && statusFilter !== "OutOfStock" && b.status !== statusFilter) return false;
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
    showToast("Book added successfully!", "success");
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

  function handleDeleteClick(book) {
    setDeleteModal({ open: true, bookId: book.id, bookTitle: book.title });
  }

  function confirmDelete() {
    if (deleteModal.bookId) {
      const bookToDelete = books.find(b => b.id === deleteModal.bookId);
      if (bookToDelete) {
        // Save to Recently Deleted
        const deletedItems = JSON.parse(localStorage.getItem("LEXORA_DELETED") || "[]");
        const newItem = {
          ...bookToDelete,
          type: "book",
          deletedAt: new Date().toISOString()
        };
        localStorage.setItem("LEXORA_DELETED", JSON.stringify([newItem, ...deletedItems]));
      }

      setBooks(books.filter(b => b.id !== deleteModal.bookId));
      showToast("Book deleted successfully!", "success");
    }
    setDeleteModal({ open: false, bookId: null, bookTitle: "" });
  }

  function cancelDelete() {
    setDeleteModal({ open: false, bookId: null, bookTitle: "" });
  }

  function showToast(message, type = "info") {
    setToast({ visible: true, message, type });
  }

  function hideToast() {
    setToast((prev) => ({ ...prev, visible: false }));
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
    showToast("Book updated successfully!", "success");
  }

  function handleCloseModal() {
    setModal(false);
    setForm(EMPTY_FORM);
    setSelectedBook(null);
    setModalMode("add");
  }

  /* ── Barcode / ISBN Scanner ──────────────────────────────
     Uses @zxing/browser to decode barcodes from the webcam.
     On a successful scan, looks up the ISBN via Open Library + Google Books.
  ─────────────────────────────────────────────────────── */
  function stopScanner() {
    if (readerRef.current) {
      try { readerRef.current.reset(); } catch (_) {}
      readerRef.current = null;
    }
  }

  async function startScanner() {
    setScanActive(true);
    setScanStatus("scanning");
    setScanFeedback("Point the camera at a book's barcode…");

    try {
      // Enumerate cameras on first open
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      setCameras(devices);

      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      const deviceId = devices[activeCamIdx]?.deviceId || undefined;

      await reader.decodeFromVideoDevice(deviceId, videoRef.current, (result, err) => {
        if (result) {
          const code = result.getText();
          // Only act on ISBN-like codes (EAN-13 starting with 978/979, or EAN-10)
          const clean = code.replace(/[^0-9X]/gi, "");
          if (/^97[89]\d{10}$/.test(clean) || /^\d{9}[\dX]$/i.test(clean)) {
            stopScanner();
            handleIsbnFound(clean);
          }
          // Non-ISBN barcode — keep scanning silently
        }
        // NotFoundException fires every frame with no barcode — ignore it
      });
    } catch (err) {
      setScanStatus("error");
      setScanActive(false);
      if (err.name === "NotAllowedError") {
        setScanFeedback("Camera access denied. Please allow camera permission and try again.");
      } else if (err.name === "NotFoundError") {
        setScanFeedback("No camera found. Enter the ISBN manually below.");
      } else {
        setScanFeedback(`Camera error: ${err.message}`);
      }
    }
  }

  async function handleIsbnFound(isbn) {
    setScanStatus("fetching");
    setScanFeedback(`ISBN ${isbn} detected — looking up book…`);
    setScanActive(false);
    await fetchByIsbn(isbn);
  }

  async function fetchByIsbn(isbn) {
    if (!isbn.trim()) { setScanFeedback("Please enter an ISBN."); return; }
    const clean = isbn.replace(/[^0-9X]/gi, "");
    setScanStatus("fetching");
    setScanFeedback(`Looking up ISBN ${clean}…`);
    try {
      // Try Open Library first
      const olRes  = await fetch(`https://openlibrary.org/isbn/${clean}.json`);
      if (olRes.ok) {
        const olData = await olRes.json();
        // Fetch works for description + author
        const workUrl  = (olData.works?.[0]?.key) ? `https://openlibrary.org${olData.works[0].key}.json` : null;
        const workData = workUrl ? await (await fetch(workUrl)).json() : {};
        const authorKeys = workData.authors?.map(a => a.author?.key).filter(Boolean) || [];
        let authorNames = [];
        for (const key of authorKeys.slice(0, 3)) {
          const aRes = await fetch(`https://openlibrary.org${key}.json`);
          if (aRes.ok) { const a = await aRes.json(); authorNames.push(a.name || ""); }
        }
        const description = typeof workData.description === "string"
          ? workData.description
          : workData.description?.value || "";
        const coverId = olData.covers?.[0];
        const thumbnail = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : "";

        applyScannedBook({
          title:       olData.title || "",
          author:      authorNames.join(", "),
          isbn:        clean,
          publisher:   (olData.publishers || [])[0] || "",
          year:        olData.publish_date ? olData.publish_date.slice(-4) : "",
          description,
          thumbnail,
        });
        return;
      }

      // Fallback to Google Books
      const gbRes  = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${clean}&maxResults=1`);
      const gbData = await gbRes.json();
      const info   = gbData.items?.[0]?.volumeInfo;
      if (info) {
        const ids  = info.industryIdentifiers || [];
        const gbIsbn = ids.find(i => i.type === "ISBN_13")?.identifier
                     || ids.find(i => i.type === "ISBN_10")?.identifier || clean;
        applyScannedBook({
          title:       info.title || "",
          author:      (info.authors || []).join(", "),
          isbn:        gbIsbn,
          publisher:   info.publisher || "",
          year:        (info.publishedDate || "").slice(0, 4),
          description: info.description || "",
          thumbnail:   (info.imageLinks?.thumbnail || "").replace("http://", "https://"),
        });
        return;
      }

      // Nothing found
      setScanStatus("error");
      setScanFeedback(`ISBN ${clean} not found in any database. Fill in fields manually.`);
      setForm(f => ({ ...f, isbn: clean }));
    } catch {
      setScanStatus("error");
      setScanFeedback("Network error during lookup. Check your connection.");
    }
  }

  function applyScannedBook(b) {
    setForm(f => ({
      ...f,
      title:       b.title       || f.title,
      author:      b.author      || f.author,
      publisher:   b.publisher   || f.publisher,
      year:        b.year        || f.year,
      description: b.description || f.description,
      isbn:        b.isbn        || f.isbn,
      cover:       b.thumbnail   || f.cover,
    }));
    setErrors({});
    setScanStatus("found");
    setScanFeedback(`"${b.title || b.isbn}" found — fields filled. Review and save.`);
    showToast(`"${b.title || b.isbn}" fields filled from ISBN lookup.`, "success");
  }

  /* ── Title/Author Lookup ─────────────────────────────────
     Calls GET /api/search-books?title=...&author=...
     Shows a pick-list; clicking a result auto-fills the form.
  ──────────────────────────────────────────────────────── */
  async function handleLookup() {
    if (!lookupTitle.trim()) {
      setLookupError("Please enter a book title.");
      return;
    }
    setLookupLoading(true);
    setLookupError("");
    setLookupResults([]);
    setLookupDone(false);
    try {
      const params = new URLSearchParams({ title: lookupTitle.trim() });
      if (lookupAuthor.trim()) params.set("author", lookupAuthor.trim());
      const res  = await fetch(`${API_BASE}/api/search-books?${params}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setLookupError(data.error || "Search failed. Try again.");
        return;
      }
      setLookupResults(data.results || []);
      setLookupDone(true);
      if (!data.results?.length) setLookupError("No results found. Try a different title or spelling.");
    } catch {
      setLookupError("Could not reach the server. Make sure the backend is running on port 3001.");
    } finally {
      setLookupLoading(false);
    }
  }

  function applyLookupResult(r) {
    setForm(f => ({
      ...f,
      _mode:       "manual",
      title:       r.title       || f.title,
      author:      r.author      || f.author,
      publisher:   r.publisher   || f.publisher,
      year:        r.year        || f.year,
      description: r.description || f.description,
      isbn:        r.isbn        || f.isbn,
      cover:       r.thumbnail   || f.cover,
    }));
    setErrors({});
    setLookupResults([]);
    setLookupDone(false);
    showToast(`"${r.title}" fields filled — review and save.`, "success");
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
              <label htmlFor="genre-filter" className="sr-only">Filter by Genre</label>
              <SlidersHorizontal
                size={13}
                className="absolute left-2.5 pointer-events-none"
                style={{ color:"var(--text-secondary)" }}
              />
              <select
                id="genre-filter"
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
            <div className="relative flex items-center">
              <label htmlFor="sort-by" className="sr-only">Sort Books</label>
              <select
                id="sort-by"
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
                  { mode:"lookup",  Icon: Search,  label:"Search by Title" },
                  { mode:"scan",    Icon: QrCode,      label:"Scan Barcode" },
                  { mode:"manual",     Icon: PenLine,      label:"Add Manually" },
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
            {["All","Available","OutOfStock"].map(s => {
              const active = statusFilter === s;
              const chipColor = s === "Available" ? "#32667F" : s === "OutOfStock" ? "#dc2626" : null;
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
          {filtered.map((b, idx) => (
            <BookCard
              key={b.id}
              book={b}
              idx={idx}
              onViewDetails={handleViewDetails}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              gradients={GRADIENTS}
            />
          ))}
        </div>
      )}

      {/* ════════ ADD BOOK MODAL ════════ */}
      {modal && (
        <div
          className="anim-overlay fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
          style={{ background:"rgba(10,22,34,0.6)", backdropFilter:"blur(3px)" }}
          onClick={e => e.target === e.currentTarget && setModal(false)}
        >
          <div
            className="anim-modal w-full max-w-[95vw] sm:max-w-[640px] max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
            style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", boxShadow:"var(--shadow-xl)" }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 shrink-0"
              style={{ borderBottom:"1px solid var(--border-light)" }}
            >
              <div className="flex items-center gap-2.5">
                {modalMode === "view" && <BookOpen size={18} style={{ color:"var(--accent-amber)" }} />}
                {modalMode === "edit" && <PenLine size={18} style={{ color:"var(--accent-amber)" }} />}
                {modalMode === "add" && form._mode === "lookup" && <Search size={18} style={{ color:"var(--accent-amber)" }} />}
                {modalMode === "add" && form._mode === "scan"   && <QrCode size={18} style={{ color:"var(--accent-amber)" }} />}
                {modalMode === "add" && form._mode === "manual"     && <PenLine size={18} style={{ color:"var(--accent-amber)" }} />}
                <h2 className="text-base font-bold" style={{ color:"var(--text-primary)" }}>
                  {modalMode === "view" ? "Book Details"
                   : modalMode === "edit" ? "Edit Book"
                   : form._mode === "lookup" ? "Search by Title / Author"
                   : form._mode === "scan"   ? "Scan Barcode"
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
              {/* ══ LOOKUP MODE — Search by Title/Author ══ */}
              {form._mode === "lookup" && (
                <div className="flex flex-col gap-3">

                  {/* Instruction banner */}
                  <div
                    className="flex items-start gap-3 p-4 rounded-xl"
                    style={{ background:"rgba(238,162,58,0.08)", border:"1.5px solid rgba(238,162,58,0.2)" }}
                  >
                    <BookOpen size={18} style={{ color:"var(--accent-amber)", flexShrink:0, marginTop:1 }} />
                    <div>
                      <p className="text-[13px] font-semibold mb-0.5" style={{ color:"var(--text-primary)" }}>
                        Search by Title / Author
                      </p>
                      <p className="text-[12px]" style={{ color:"var(--text-secondary)" }}>
                        Enter a title and optional author name. Pick a result to auto-fill all fields instantly.
                      </p>
                    </div>
                  </div>

                  {/* Inputs + button */}
                  <div className="flex flex-col gap-2">
                    <input
                      className={inputCls}
                      style={inputStyle(!!lookupError && !lookupTitle.trim())}
                      onFocus={focusRing}
                      onBlur={blurRing(false)}
                      placeholder="Book title  (e.g. Computing Essentials)"
                      value={lookupTitle}
                      onChange={e => { setLookupTitle(e.target.value); setLookupError(""); setLookupDone(false); }}
                      onKeyDown={e => e.key === "Enter" && handleLookup()}
                    />
                    <input
                      className={inputCls}
                      style={inputStyle()}
                      onFocus={focusRing}
                      onBlur={blurRing(false)}
                      placeholder="Author name  (optional)"
                      value={lookupAuthor}
                      onChange={e => { setLookupAuthor(e.target.value); setLookupError(""); setLookupDone(false); }}
                      onKeyDown={e => e.key === "Enter" && handleLookup()}
                    />
                    <button
                      onClick={handleLookup}
                      disabled={lookupLoading}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-colors duration-150"
                      style={{
                        background: lookupLoading ? "var(--bg-subtle)" : "var(--accent-amber)",
                        color:      lookupLoading ? "var(--text-muted)" : "#fff",
                        cursor:     lookupLoading ? "not-allowed" : "pointer",
                      }}
                      onMouseEnter={e => { if (!lookupLoading) e.currentTarget.style.background = "var(--accent-orange)"; }}
                      onMouseLeave={e => { if (!lookupLoading) e.currentTarget.style.background = lookupLoading ? "var(--bg-subtle)" : "var(--accent-amber)"; }}
                    >
                      {lookupLoading
                        ? <><Loader2 size={15} className="animate-spin" /> Searching…</>
                        : <><Search size={15} /> Search Books</>}
                    </button>
                  </div>

                  {/* Error */}
                  {lookupError && (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[12px]"
                      style={{ background:"rgba(234,139,51,0.08)", border:"1px solid rgba(234,139,51,0.25)", color:"#c05a0a" }}>
                      <AlertCircle size={14} style={{ flexShrink:0 }} />
                      {lookupError}
                    </div>
                  )}

                  {/* Results pick-list */}
                  {lookupDone && lookupResults.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color:"var(--text-secondary)" }}>
                        {lookupResults.length} result{lookupResults.length !== 1 ? "s" : ""} — click one to auto-fill
                      </p>
                      <div className="flex flex-col gap-1.5 max-h-[320px] overflow-y-auto pr-0.5" style={{ scrollbarWidth:"thin" }}>
                        {lookupResults.map((r, i) => (
                          <button
                            key={i}
                            onClick={() => applyLookupResult(r)}
                            className="flex items-start gap-3 p-3 rounded-xl text-left w-full transition-all duration-150"
                            style={{ background:"var(--bg-subtle)", border:"1.5px solid var(--border)" }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor="#EEA23A"; e.currentTarget.style.background="rgba(238,162,58,0.06)"; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor="var(--border)"; e.currentTarget.style.background="var(--bg-subtle)"; }}
                          >
                            {/* Thumbnail */}
                            <div className="w-9 h-13 rounded shrink-0 overflow-hidden flex items-center justify-center"
                              style={{ background:"var(--bg-input)", border:"1px solid var(--border)", minHeight:48, minWidth:36 }}>
                              {r.thumbnail
                                ? <img src={r.thumbnail} alt="" className="w-full h-full object-cover" />
                                : <BookOpen size={13} style={{ color:"var(--text-muted)" }} />}
                            </div>
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold leading-snug truncate" style={{ color:"var(--text-primary)" }}>{r.title}</p>
                              {r.author    && <p className="text-[11.5px] truncate mt-0.5" style={{ color:"var(--text-secondary)" }}>{r.author}</p>}
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {r.year      && <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded" style={{ background:"rgba(50,102,127,0.1)", color:"#32667F" }}>{r.year}</span>}
                                {r.publisher && <span className="text-[10.5px] truncate" style={{ color:"var(--text-muted)", maxWidth:130 }}>{r.publisher}</span>}
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded ml-auto" style={{ background:"rgba(238,162,58,0.1)", color:"var(--accent-amber)" }}>{r.source}</span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ══ BARCODE MODE ══ */}
              {form._mode === "scan" && (
                <div className="flex flex-col gap-3">

                  {/* Info banner */}
                  <div className="flex items-start gap-3 p-4 rounded-xl"
                    style={{ background:"rgba(238,162,58,0.08)", border:"1.5px solid rgba(238,162,58,0.2)" }}>
                    <QrCode size={18} style={{ color:"var(--accent-amber)", flexShrink:0, marginTop:1 }} />
                    <div>
                      <p className="text-[13px] font-semibold mb-0.5" style={{ color:"var(--text-primary)" }}>
                        Barcode / ISBN Scanner
                      </p>
                      <p className="text-[12px]" style={{ color:"var(--text-secondary)" }}>
                        Point your camera at the book's barcode (back cover). Fields fill automatically on detection.
                      </p>
                    </div>
                  </div>

                  {/* Camera viewfinder */}
                  <div className="relative w-full rounded-xl overflow-hidden"
                    style={{ aspectRatio:"4/3", background:"#0a1622", border:"1.5px solid var(--border)" }}>

                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      style={{ display: scanActive ? "block" : "none" }}
                      muted
                      playsInline
                    />

                    {/* Overlay when not scanning */}
                    {!scanActive && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                        <QrCode size={48} style={{ color:"rgba(238,162,58,0.4)" }} />
                        <p className="text-[13px]" style={{ color:"rgba(255,255,255,0.4)" }}>
                          {scanStatus === "found" ? "Scan complete" : "Camera inactive"}
                        </p>
                      </div>
                    )}

                    {/* Scan-line animation while active */}
                    {scanActive && (
                      <div className="absolute inset-0 pointer-events-none">
                        {/* Corner brackets */}
                        {[["top-4 left-4","border-t-2 border-l-2"],
                          ["top-4 right-4","border-t-2 border-r-2"],
                          ["bottom-4 left-4","border-b-2 border-l-2"],
                          ["bottom-4 right-4","border-b-2 border-r-2"]
                        ].map(([pos, bdr], i) => (
                          <div key={i} className={`absolute ${pos} ${bdr} w-6 h-6 rounded-sm`}
                            style={{ borderColor:"#EEA23A" }} />
                        ))}
                        {/* Animated scan line */}
                        <div className="absolute left-6 right-6"
                          style={{
                            height: 2,
                            background: "linear-gradient(90deg, transparent, #EEA23A, transparent)",
                            animation: "scanline 2s ease-in-out infinite",
                            top: "50%",
                          }} />
                      </div>
                    )}

                    {/* Camera switch button (if multiple cameras) */}
                    {scanActive && cameras.length > 1 && (
                      <button
                        onClick={() => {
                          const next = (activeCamIdx + 1) % cameras.length;
                          setActiveCamIdx(next);
                          stopScanner();
                          setTimeout(() => startScanner(), 100);
                        }}
                        className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold"
                        style={{ background:"rgba(0,0,0,0.6)", color:"#fff", backdropFilter:"blur(4px)" }}
                      >
                        <QrCode size={12} /> Flip
                      </button>
                    )}
                  </div>

                  {/* Scan line CSS */}
                  <style>{`
                    @keyframes scanline {
                      0%   { top: 20%; opacity: 0; }
                      10%  { opacity: 1; }
                      90%  { opacity: 1; }
                      100% { top: 80%; opacity: 0; }
                    }
                  `}</style>

                  {/* Status feedback */}
                  {scanStatus !== "idle" && (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[12.5px]"
                      style={{
                        background: scanStatus === "found"    ? "rgba(50,127,79,0.08)"
                                  : scanStatus === "error"    ? "rgba(234,139,51,0.08)"
                                  : "rgba(50,102,127,0.08)",
                        border: `1px solid ${
                                  scanStatus === "found"    ? "rgba(50,127,79,0.2)"
                                  : scanStatus === "error"  ? "rgba(234,139,51,0.25)"
                                  : "rgba(50,102,127,0.2)"}`,
                        color:    scanStatus === "found"    ? "#2d7a47"
                                : scanStatus === "error"    ? "#c05a0a"
                                : "#32667F",
                      }}>
                      {scanStatus === "found"    && <CheckCircle2 size={14} style={{ flexShrink:0 }} />}
                      {scanStatus === "error"    && <AlertCircle  size={14} style={{ flexShrink:0 }} />}
                      {scanStatus === "fetching" && <Loader2      size={14} className="animate-spin" style={{ flexShrink:0 }} />}
                      {scanStatus === "scanning" && <Loader2      size={14} className="animate-spin" style={{ flexShrink:0 }} />}
                      <span>{scanFeedback}</span>
                    </div>
                  )}

                  {/* Start / Stop button */}
                  <div className="flex gap-2">
                    {!scanActive ? (
                      <button
                        onClick={startScanner}
                        disabled={scanStatus === "fetching"}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-colors duration-150"
                        style={{
                          background: scanStatus === "fetching" ? "var(--bg-subtle)" : "var(--accent-amber)",
                          color:      scanStatus === "fetching" ? "var(--text-muted)" : "#fff",
                          cursor:     scanStatus === "fetching" ? "not-allowed" : "pointer",
                        }}
                        onMouseEnter={e => { if (scanStatus !== "fetching") e.currentTarget.style.background = "var(--accent-orange)"; }}
                        onMouseLeave={e => { if (scanStatus !== "fetching") e.currentTarget.style.background = "var(--accent-amber)"; }}
                      >
                        {scanStatus === "fetching"
                          ? <><Loader2 size={15} className="animate-spin" /> Looking up…</>
                          : <><QrCode  size={15} /> {scanStatus === "found" ? "Scan Another" : "Start Camera"}</>}
                      </button>
                    ) : (
                      <button
                        onClick={() => { stopScanner(); setScanActive(false); setScanStatus("idle"); setScanFeedback(""); }}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold border transition-colors duration-150"
                        style={{ background:"var(--bg-subtle)", color:"var(--text-secondary)", borderColor:"var(--border)" }}
                      >
                        <X size={15} /> Stop Camera
                      </button>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px" style={{ background:"var(--border-light)" }} />
                    <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color:"var(--text-muted)" }}>
                      or enter ISBN manually
                    </span>
                    <div className="flex-1 h-px" style={{ background:"var(--border-light)" }} />
                  </div>

                  {/* Manual ISBN input */}
                  <div className="flex gap-2">
                    <input
                      className={`${inputCls} flex-1`}
                      style={inputStyle()}
                      onFocus={focusRing}
                      onBlur={blurRing(false)}
                      placeholder="e.g. 978-0132350884"
                      value={manualIsbn}
                      onChange={e => setManualIsbn(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && fetchByIsbn(manualIsbn)}
                    />
                    <button
                      onClick={() => fetchByIsbn(manualIsbn)}
                      disabled={scanStatus === "fetching" || !manualIsbn.trim()}
                      className="px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-colors duration-150"
                      style={{
                        background: (!manualIsbn.trim() || scanStatus === "fetching") ? "var(--bg-subtle)" : "var(--accent-amber)",
                        color:      (!manualIsbn.trim() || scanStatus === "fetching") ? "var(--text-muted)" : "#fff",
                        cursor:     (!manualIsbn.trim() || scanStatus === "fetching") ? "not-allowed" : "pointer",
                      }}
                      onMouseEnter={e => { if (manualIsbn.trim() && scanStatus !== "fetching") e.currentTarget.style.background = "var(--accent-orange)"; }}
                      onMouseLeave={e => { if (manualIsbn.trim() && scanStatus !== "fetching") e.currentTarget.style.background = "var(--accent-amber)"; }}
                    >
                      {scanStatus === "fetching" ? <Loader2 size={15} className="animate-spin" /> : "Look up"}
                    </button>
                  </div>
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
                    onClick={() => handleDeleteClick(selectedBook)}
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
      {/* ════════ DELETE CONFIRMATION MODAL ════════ */}
      <ConfirmationModal
        isOpen={deleteModal.open}
        title="Delete Book"
        message={`Are you sure you want to delete "${deleteModal.bookTitle}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      {/* ════════ TOAST NOTIFICATION ════════ */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.visible}
        onClose={hideToast}
      />
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