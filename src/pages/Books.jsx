import { useState, useRef, useEffect } from "react";
import {
  Search, ChevronDown, QrCode, PenLine,
  Star, X, BookOpen, ImagePlus, Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../components/DropdownMenu";

/* ─── Data ─────────────────────────────────────── */
const INITIAL_BOOKS = [
  { id:1, title:"Clean Code",               author:"Robert C. Martin", genre:"Programming",  isbn:"978-0132350884", year:2008, publisher:"Prentice Hall",  description:"A handbook of agile software craftsmanship.",           status:"Available", cover:null },
  { id:2, title:"The Pragmatic Programmer", author:"Hunt & Thomas",    genre:"Programming",  isbn:"978-0135957059", year:2019, publisher:"Addison-Wesley", description:"Your journey to mastery in software development.",     status:"Borrowed",  cover:null },
  { id:3, title:"Design Patterns",          author:"Gang of Four",     genre:"Architecture", isbn:"978-0201633610", year:1994, publisher:"Addison-Wesley", description:"Elements of reusable object-oriented software.",      status:"Available", cover:null },
  { id:4, title:"Refactoring",              author:"Martin Fowler",    genre:"Programming",  isbn:"978-0134757599", year:2018, publisher:"Addison-Wesley", description:"Improving the design of existing code.",              status:"Overdue",   cover:null },
  { id:5, title:"You Don't Know JS",        author:"Kyle Simpson",     genre:"JavaScript",   isbn:"978-1491924464", year:2015, publisher:"O'Reilly Media", description:"A deep dive into the core mechanisms of JavaScript.", status:"Available", cover:null },
  { id:6, title:"The Mythical Man-Month",   author:"Frederick Brooks", genre:"Management",   isbn:"978-0201835953", year:1995, publisher:"Addison-Wesley", description:"Essays on software engineering and project management.", status:"Borrowed", cover:null },
];

const EMPTY_FORM = {
  title:"", author:"", genre:"", isbn:"", year:"",
  publisher:"", description:"", status:"Available",
  cover:null, _mode:"manual",
};

const STATUS_STYLE = {
  Available: { bg:"rgba(50,102,127,0.12)",  color:"#32667F" },
  Borrowed:  { bg:"rgba(238,162,58,0.18)",  color:"#b87a1a" },
  Overdue:   { bg:"rgba(234,139,51,0.18)",  color:"#c05a0a" },
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

/* ─── Shared input style helper ─────────────── */
const inputCls = "w-full px-3 py-2.5 rounded-lg text-[13px] border-[1.5px] outline-none transition-colors duration-150";
const inputStyle = (err = false) => ({
  background:  "var(--bg-input)",
  color:       "var(--text-primary)",
  borderColor: err ? "#EA8B33" : "var(--border)",
  fontFamily:  "inherit",
});
const focusRing = e => {
  e.target.style.borderColor = "#EEA23A";
  e.target.style.boxShadow  = "0 0 0 3px rgba(238,162,58,0.13)";
};
const blurRing = (err) => e => {
  e.target.style.borderColor = err ? "#EA8B33" : "var(--border)";
  e.target.style.boxShadow  = "none";
};

/* ══════════════════════════════════════════════ */
export default function Books() {
  const [books,    setBooks]    = useState(INITIAL_BOOKS);
  const [query,    setQuery]    = useState("");
  const [ddOpen,   setDdOpen]   = useState(false);
  const [modal,    setModal]    = useState(false);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [errors,   setErrors]   = useState({});
  const [dragOver, setDragOver] = useState(false);
  const [isDark,   setIsDark]   = useState(document.documentElement.getAttribute("data-theme") === "dark");

  const ddRef   = useRef(null);
  const fileRef = useRef(null);

  /* Track theme changes */
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.getAttribute("data-theme") === "dark");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

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

  const filtered = books.filter(b =>
    b.title.toLowerCase().includes(query.toLowerCase()) ||
    b.author.toLowerCase().includes(query.toLowerCase())
  );

  /* ── Handlers ── */
  function openModal(mode) {
    setDdOpen(false);
    setForm({ ...EMPTY_FORM, _mode: mode });
    setErrors({});
    setModal(true);
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
    
    if (form._mode === "edit") {
      // Edit existing book
      setBooks(p => p.map(book => 
        book.id === form.id 
          ? { ...form, year: Number(form.year) } 
          : book
      ));
    } else {
      // Add new book
      setBooks(p => [...p, { ...form, id: Date.now(), year: Number(form.year) }]);
    }
    
    setModal(false);
    setForm(EMPTY_FORM);
  }

  function handleDelete(bookId) {
    setBooks(p => p.filter(book => book.id !== bookId));
  }

  /* ── Reusable form field ── */
  function Field({ label, fkey, type = "text", placeholder = "" }) {
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

  /* ════════════════ RENDER ════════════════ */
  return (
    <div className="flex flex-col gap-5">

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 justify-between">

        {/* Search - Full width on mobile, auto on desktop */}
        <div
          className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-lg flex-1 min-w-[120px] sm:min-w-[180px]"
          style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", boxShadow:"var(--shadow-sm)" }}
        >
          <Search size={14} style={{ color:"var(--text-secondary)" }} className="shrink-0" />
          <input
            className="border-none outline-none text-[12px] sm:text-[13px] bg-transparent w-full"
            style={{ color:"var(--text-primary)" }}
            placeholder="Search…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        {/* Action buttons - Flex row on mobile, collapse menu on desktop */}
        <DropdownMenu open={ddOpen} onOpenChange={setDdOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-1 px-2 sm:px-3 py-2 rounded-lg text-[12px] sm:text-[13px] font-semibold transition-colors duration-150"
              style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", color:"var(--text-secondary)" }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-surface)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            >
              ＋ Add
              <ChevronDown size={12} style={{ transition:"transform 150ms" }} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openModal("manual")}>
              <PenLine size={14} className="mr-2" />
              <span>Add Manually</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openModal("scan")}>
              <QrCode size={14} className="mr-2" />
              <span>Scan Barcode</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Books Grid - Mobile-First Responsive */}
      {/* Mobile: 3 cols, sm: 3 cols, md: 4 cols, lg: 5 cols, xl: 6 cols, 2xl: 7 cols */}
      <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-1 sm:gap-2 md:gap-3">
        {filtered.length > 0 ? (
          filtered.map((book, idx) => (
            <div key={book.id} className="group flex flex-col rounded-lg overflow-hidden" style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", boxShadow:"var(--shadow-sm)", transition:"all 200ms ease-out" }}>
              {/* Cover - 2:3 Aspect Ratio with zoom on hover */}
              <div className="relative w-full bg-gray-300 overflow-hidden group/cover" style={{ aspectRatio:"2/3" }}>
                {book.cover ? (
                  <img src={book.cover} alt={book.title} className="w-full h-full object-cover transition-transform duration-300 group-hover/cover:scale-110" />
                ) : (
                  <div 
                    className="transition-transform duration-300 group-hover/cover:scale-110"
                  >
                    <CoverPlaceholder title={book.title} idx={idx} />
                  </div>
                )}
                
                {/* Status Badge */}
                <div
                  className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] font-bold"
                  style={STATUS_STYLE[book.status]}
                >
                  {book.status}
                </div>

                {/* Hover Actions - Desktop Only with theme-aware background */}
                <div 
                  className="hidden lg:flex absolute inset-0 transition-colors duration-200 items-center justify-center gap-2 opacity-0 group-hover:opacity-100"
                  style={{ background: "var(--bg-cover-overlay)" }}
                >
                  <button
                    onClick={() => {
                      setForm({ ...book, _mode: "edit" });
                      setModal(true);
                    }}
                    className="p-2 rounded-lg text-white hover:bg-opacity-90 transition-colors duration-150"
                    style={{ background: "var(--accent-amber)" }}
                    title="Edit"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(book.id)}
                    className="p-2 rounded-lg text-white hover:bg-opacity-90 transition-colors duration-150"
                    style={{ background: "var(--accent-danger)" }}
                    title="Delete"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Book Info - Compact for mobile */}
              <div className="flex flex-col gap-0.5 p-1.5 sm:p-2 flex-1">
                <div>
                  <h4 className="text-[10px] sm:text-[12px] font-bold line-clamp-2 leading-tight" style={{ color:"var(--text-primary)" }}>
                    {book.title}
                  </h4>
                  <p className="text-[8px] sm:text-[10px] mt-0.5 line-clamp-1" style={{ color:"var(--text-secondary)" }}>
                    {book.author}
                  </p>
                </div>
                
                <div className="flex items-center gap-0.5 text-[8px] sm:text-[10px]" style={{ color:"var(--text-secondary)" }}>
                  <span>📅</span> {book.year}
                </div>

                {/* View Details Button - Hidden on mobile, visible on tablet+ */}
                <button
                  onClick={() => {
                    setForm({ ...book, _mode: "edit" });
                    setModal(true);
                  }}
                  className="hidden sm:block mt-auto text-[10px] font-semibold px-2 py-1 rounded border-[1px] transition-colors duration-150 w-full"
                  style={{ background:"rgba(238,162,58,0.1)", borderColor:"rgba(238,162,58,0.3)", color:"#b87a1a" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(238,162,58,0.25)"; e.currentTarget.style.borderColor = "rgba(238,162,58,0.5)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(238,162,58,0.1)"; e.currentTarget.style.borderColor = "rgba(238,162,58,0.3)"; }}
                >
                  View
                </button>

                {/* Mobile Action Buttons - Show on mobile, hide on lg+ */}
                <div className="flex gap-1 sm:hidden mt-1">
                  <button
                    onClick={() => {
                      setForm({ ...book, _mode: "edit" });
                      setModal(true);
                    }}
                    className="flex-1 text-[8px] font-semibold px-1 py-0.5 rounded border-[1px] transition-colors duration-150"
                    style={{ background:"rgba(50,102,127,0.1)", borderColor:"rgba(50,102,127,0.3)", color:"#32667F" }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(book.id)}
                    className="flex-1 text-[8px] font-semibold px-1 py-0.5 rounded border-[1px] transition-colors duration-150"
                    style={{ background:"rgba(234,139,51,0.1)", borderColor:"rgba(234,139,51,0.3)", color:"#c05a0a" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center gap-2 py-12" style={{ color:"var(--text-secondary)" }}>
            <BookOpen size={32} />
            <p className="text-[13px]">No books found</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background:"rgba(0,0,0,0.6)" }} onClick={() => setModal(false)}>
          <div
            className="flex flex-col rounded-2xl w-11/12 max-w-md max-h-[90vh] overflow-hidden"
            style={{ 
              background: isDark ? "#1a2332" : "#ffffff",
              boxShadow:"var(--shadow-xl)", 
              border: isDark ? "1px solid #2a3f57" : "1px solid #e5e7eb",
              transition: "background 0.3s, border-color 0.3s"
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 shrink-0"
              style={{ borderBottom: isDark ? "1px solid #2a3f57" : "1px solid #e5e7eb" }}
            >
              <h3 className="text-[15px] font-bold" style={{ color: isDark ? "#ffffff" : "#000000" }}>
                {form._mode === "scan" ? "Scan Barcode" : form._mode === "edit" ? "Edit Book" : "Add Book Manually"}
              </h3>
              <button
                onClick={() => setModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors duration-150"
                style={{ background:"var(--bg-hover)", color:"var(--text-secondary)" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(238,162,58,0.15)"; e.currentTarget.style.color = "#EEA23A"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4" style={{ background: isDark ? "#0f1823" : "#ffffff" }}>

              {/* Barcode hint */}
              {form._mode === "scan" && (
                <div
                  className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-dashed text-[13px] text-center"
                  style={{ background:"var(--bg-subtle)", borderColor:"var(--border)", color:"var(--text-secondary)" }}
                >
                  <QrCode size={40} style={{ color:"var(--text-secondary)" }} />
                  <p>Point camera at barcode or enter ISBN manually below</p>
                </div>
              )}

              {/* ── Cover Upload ── */}
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
                  /* Preview */
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
                        onClick={e => {
                          e.stopPropagation();
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
                  /* Drop zone */
                  <div
                    className="flex flex-col items-center justify-center gap-2 py-7 rounded-xl border-2 border-dashed cursor-pointer text-center select-none transition-colors duration-150"
                    style={{
                      background:  dragOver ? "rgba(238,162,58,0.05)" : "var(--bg-subtle)",
                      borderColor: dragOver ? "var(--accent-amber)"   : "var(--border)",
                    }}
                    onClick={() => fileRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
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
                <Field label="Title"          fkey="title" />
                <Field label="Author"         fkey="author" />
                <Field label="Genre"          fkey="genre" />
                <Field label="ISBN Number"    fkey="isbn"  placeholder="e.g. 978-0000000000" />
                <Field label="Year Published" fkey="year"  type="number" placeholder="e.g. 2024" />
                <Field label="Publisher"      fkey="publisher" />
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

              {/* Status */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color:"var(--text-secondary)" }}>
                  Status
                </label>
                <select
                  className={inputCls}
                  style={inputStyle()}
                  onFocus={focusRing}
                  onBlur={blurRing(false)}
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                >
                  <option>Available</option>
                  <option>Borrowed</option>
                  <option>Overdue</option>
                </select>
              </div>
            </div>

            {/* Footer */}
            <div
              className="flex justify-end gap-2.5 px-6 py-4 shrink-0"
              style={{ borderTop: isDark ? "1px solid #2a3f57" : "1px solid #e5e7eb" }}
            >
              <ModalBtn secondary onClick={() => setModal(false)}>Cancel</ModalBtn>
              <ModalBtn onClick={handleSubmit}>{form._mode === "edit" ? "Update Book" : "Save Book"}</ModalBtn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Reusable modal button ── */
function ModalBtn({ children, onClick, secondary }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-colors duration-150"
      style={secondary
        ? { background:"var(--bg-surface)", color:"var(--text-secondary)", border:"1.5px solid var(--border)" }
        : { background:"var(--accent-amber)", color:"#fff", border:"none" }
      }
      onMouseEnter={e => e.currentTarget.style.background = secondary ? "var(--bg-hover)" : "var(--accent-orange)"}
      onMouseLeave={e => e.currentTarget.style.background = secondary ? "var(--bg-surface)" : "var(--accent-amber)"}
    >
      {children}
    </button>
  );
}