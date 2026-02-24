  import { useState, useRef, useEffect } from "react";
  import {
    Plus, Search, X, Pencil, Trash2,
    CalendarClock, RotateCcw, ChevronDown, BookOpen, CheckCircle2,
    ChevronLeft, ChevronRight,
  } from "lucide-react";
  import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
  } from "../components/DropdownMenu";

  /* ─── Static catalogues ─────────────────────── */
  const CATALOGUE = [
    { id:1, title:"Clean Code",                author:"Robert C. Martin", genre:"Programming"      },
    { id:2, title:"The Pragmatic Programmer",  author:"Hunt & Thomas",    genre:"Programming"      },
    { id:3, title:"Design Patterns",           author:"Gang of Four",     genre:"Architecture"     },
    { id:4, title:"Refactoring",               author:"Martin Fowler",    genre:"Programming"      },
    { id:5, title:"You Don't Know JS",         author:"Kyle Simpson",     genre:"JavaScript"       },
    { id:6, title:"The Mythical Man-Month",    author:"Frederick Brooks", genre:"Management"       },
    { id:7, title:"Introduction to Algorithms",author:"CLRS",             genre:"Computer Science" },
    { id:8, title:"Structure & Interpretation",author:"Abelson & Sussman",genre:"Computer Science" },
  ];
  const ALL_GENRES = ["All", ...new Set(CATALOGUE.map(b => b.genre))];

  /* ─── Initial transactions ──────────────────── */
  const INIT = [
    { id:1, bookId:2, bookTitle:"The Pragmatic Programmer", studentName:"Bob Kowalski",  idNo:"2021-00123", course:"BSCS", year:"3rd", contact:"09171234567", email:"bob@school.edu",   borrowed:"2025-02-10", due:"2025-02-24", status:"Borrowed", deleted:false },
    { id:2, bookId:6, bookTitle:"The Mythical Man-Month",   studentName:"Carol Tanner",  idNo:"2020-00456", course:"BSIT", year:"4th", contact:"09281234567", email:"carol@school.edu", borrowed:"2025-02-12", due:"2025-02-26", status:"Borrowed", deleted:false },
    { id:3, bookId:4, bookTitle:"Refactoring",              studentName:"David Lim",     idNo:"2022-00789", course:"BSCS", year:"2nd", contact:"09391234567", email:"david@school.edu", borrowed:"2025-02-01", due:"2025-02-15", status:"Overdue",  deleted:false },
    { id:4, bookId:1, bookTitle:"Clean Code",               studentName:"Eve Reyes",     idNo:"2023-01011", course:"BSIT", year:"1st", contact:"09451234567", email:"eve@school.edu",   borrowed:"2025-02-18", due:"2025-03-04", status:"Borrowed", deleted:false },
    { id:5, bookId:3, bookTitle:"Design Patterns",          studentName:"Frank Lee",     idNo:"2021-00112", course:"BSCS", year:"3rd", contact:"09561234567", email:"frank@school.edu", borrowed:"2025-02-19", due:"2025-03-05", status:"Borrowed", deleted:false },
    { id:6, bookId:5, bookTitle:"You Don't Know JS",        studentName:"Grace Wong",    idNo:"2022-00345", course:"BSIT", year:"2nd", contact:"09671234567", email:"grace@school.edu", borrowed:"2025-02-08", due:"2025-02-22", status:"Returned", deleted:false },
    { id:7, bookId:7, bookTitle:"Introduction to Algorithms",studentName:"Henry Adams",  idNo:"2020-00678", course:"BSCS", year:"4th", contact:"09781234567", email:"henry@school.edu", borrowed:"2025-02-14", due:"2025-02-28", status:"Borrowed", deleted:false },
    { id:8, bookId:8, bookTitle:"Structure & Interpretation",studentName:"Iris Brown",   idNo:"2023-00901", course:"BSIT", year:"1st", contact:"09891234567", email:"iris@school.edu",  borrowed:"2025-02-17", due:"2025-03-03", status:"Borrowed", deleted:false },
  ];

  const EMPTY_FORM = { bookId:"", bookTitle:"", studentName:"", idNo:"", course:"", year:"", contact:"", email:"", borrowed:"", due:"" };
  const YEAR_OPTS  = ["1st","2nd","3rd","4th","5th"];

  /* ─── Helpers ───────────────────────────────── */
  const fmt = iso =>
    iso
      ? new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })
      : "—";
  const isOverdue = due => due && new Date(due + "T00:00:00") < new Date();

  const BADGE = {
    Borrowed: { bg:"rgba(238,162,58,0.15)", color:"#b87a1a" },
    Overdue:  { bg:"rgba(234,139,51,0.15)", color:"#c05a0a" },
    Returned: { bg:"rgba(50,102,127,0.12)", color:"#32667F" },
  };

  /* ─── Shared input helpers ──────────────────── */
  const inpCls = "w-full px-3 py-2 rounded-lg text-[13px] border-[1.5px] outline-none transition-colors duration-150";
  const inpStyle = (err = false) => ({
    background:  "var(--bg-input)",
    color:       "var(--text-primary)",
    borderColor: err ? "#EA8B33" : "var(--border)",
    fontFamily:  "inherit",
  });
  const onFocus = e => {
    e.target.style.borderColor = "#EEA23A";
    e.target.style.boxShadow   = "0 0 0 3px rgba(238,162,58,0.13)";
  };
  const onBlur = err => e => {
    e.target.style.borderColor = err ? "#EA8B33" : "var(--border)";
    e.target.style.boxShadow   = "none";
  };

  /* ══════════════════════════════════════════════ */
  export default function Borrowed() {
    const [txns,        setTxns]        = useState(INIT);
    const [search,      setSearch]      = useState("");
    const [filter,      setFilter]      = useState("All");
    const [modal,       setModal]       = useState(null);
    const [editId,      setEditId]      = useState(null);
    const [form,        setForm]        = useState(EMPTY_FORM);
    const [errors,      setErrors]      = useState({});
    const [bookSearch,  setBookSearch]  = useState("");
    const [genreFilter, setGenreFilter] = useState("All");
    const [pickerOpen,  setPickerOpen]  = useState(false);
    const [extendDate,  setExtendDate]  = useState("");
    const [snackbar,    setSnackbar]    = useState(null);
    const [returnToast, setReturnToast] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const pickerRef = useRef(null);

    useEffect(() => {
      document.body.style.overflow = modal ? "hidden" : "";
      return () => { document.body.style.overflow = ""; };
    }, [modal]);

    useEffect(() => {
      const h = e => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false); };
      document.addEventListener("mousedown", h);
      return () => document.removeEventListener("mousedown", h);
    }, []);

    /* ── Derived stats ── */
    const statActive  = txns.filter(t => !t.deleted && t.status !== "Returned").length;
    const statOverdue = txns.filter(t => !t.deleted && t.status === "Overdue").length;
    const statDueWeek = txns.filter(t => {
      if (t.deleted || t.status === "Returned") return false;
      const d = new Date(t.due + "T00:00:00"), now = new Date(), wk = new Date();
      wk.setDate(now.getDate() + 7);
      return d >= now && d <= wk;
    }).length;

    /* ── Filtered rows ── */
    const filteredRows = txns.filter(t => {
      if (t.deleted) return false;
      const q = search.toLowerCase();
      const mq = !q || t.studentName.toLowerCase().includes(q) || t.bookTitle.toLowerCase().includes(q) || t.idNo.includes(q);
      return mq && (filter === "All" || t.status === filter);
    });

    /* ── Pagination ── */
    const totalPages = Math.ceil(filteredRows.length / itemsPerPage);
    const startIdx = (currentPage - 1) * itemsPerPage;
    const paginatedRows = filteredRows.slice(startIdx, startIdx + itemsPerPage);

    /* ── Book picker filter ── */
    const pickerBooks = CATALOGUE.filter(b => {
      const q = bookSearch.toLowerCase();
      return (
        (!q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)) &&
        (genreFilter === "All" || b.genre === genreFilter)
      );
    });

    /* ── Modal open/close ── */
    function openAdd() {
      setForm(EMPTY_FORM); setErrors({}); setBookSearch(""); setGenreFilter("All");
      setModal("add");
    }
    function openEdit(t) {
      setForm({ bookId:t.bookId, bookTitle:t.bookTitle, studentName:t.studentName, idNo:t.idNo, course:t.course, year:t.year, contact:t.contact, email:t.email, borrowed:t.borrowed, due:t.due });
      setErrors({}); setBookSearch(""); setGenreFilter("All");
      setEditId(t.id); setModal("edit");
    }
    function openExtend(t) { setExtendDate(t.due); setEditId(t.id); setModal("extend"); }
    function closeModal()  { setModal(null); setEditId(null); setPickerOpen(false); }

    function pickBook(b) {
      setForm(f => ({ ...f, bookId:b.id, bookTitle:b.title }));
      if (errors.bookId) setErrors(e => { const n = { ...e }; delete n.bookId; return n; });
      setPickerOpen(false);
    }

    function validate(f) {
      const e = {};
      if (!f.bookId)             e.bookId      = "Please select a book";
      if (!f.studentName.trim()) e.studentName = "Full name is required";
      if (!f.idNo.trim())        e.idNo        = "ID No. is required";
      if (!f.course.trim())      e.course      = "Course is required";
      if (!f.year)               e.year        = "Year level is required";
      if (!f.contact.trim())     e.contact     = "Contact No. is required";
      if (!f.email.trim())       e.email       = "Email is required";
      if (!f.borrowed)           e.borrowed    = "Borrow date is required";
      if (!f.due)                e.due         = "Due date is required";
      return e;
    }

    function handleSave() {
      const e = validate(form);
      if (Object.keys(e).length) { setErrors(e); return; }
      const status = isOverdue(form.due) ? "Overdue" : "Borrowed";
      if (modal === "add")
        setTxns(p => [...p, { ...form, id:Date.now(), status, deleted:false }]);
      else
        setTxns(p => p.map(t => t.id === editId ? { ...t, ...form, status } : t));
      closeModal();
      setCurrentPage(1);
    }

    function handleExtend() {
      if (!extendDate) return;
      setTxns(p => p.map(t => {
        if (t.id !== editId) return t;
        return { ...t, due:extendDate, status: isOverdue(extendDate) ? "Overdue" : "Borrowed" };
      }));
      closeModal();
    }

    function handleDelete(id) {
      setTxns(p => p.map(t => t.id === id ? { ...t, deleted:true } : t));
      const timer = setTimeout(() => { setTxns(p => p.filter(t => t.id !== id)); setSnackbar(null); }, 5000);
      setSnackbar({ id, timer });
    }

    function handleUndo() {
      if (!snackbar) return;
      clearTimeout(snackbar.timer);
      setTxns(p => p.map(t => t.id === snackbar.id ? { ...t, deleted:false } : t));
      setSnackbar(null);
    }

    function handleReturn(id) {
      setTxns(p => p.map(t => t.id === id ? { ...t, status:"Returned" } : t));
      const timer = setTimeout(() => setReturnToast(null), 3500);
      setReturnToast({ id, timer });
    }

    function handleUndoReturn() {
      if (!returnToast) return;
      clearTimeout(returnToast.timer);
      setTxns(p => p.map(t => {
        if (t.id !== returnToast.id) return t;
        return { ...t, status: isOverdue(t.due) ? "Overdue" : "Borrowed" };
      }));
      setReturnToast(null);
    }

    function FormField({ label, fkey, type="text", placeholder="" }) {
      const err = errors[fkey];
      return (
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color:"var(--text-secondary)" }}>
            {label}
          </label>
          <input
            className={inpCls}
            style={inpStyle(!!err)}
            onFocus={onFocus}
            onBlur={onBlur(!!err)}
            type={type}
            placeholder={placeholder || label}
            value={form[fkey]}
            onChange={e => {
              setForm(f => ({ ...f, [fkey]:e.target.value }));
              if (err) setErrors(v => { const n = { ...v }; delete n[fkey]; return n; });
            }}
          />
          {err && <span className="text-[11px] font-medium text-orange-500">{err}</span>}
        </div>
      );
    }

    const SectionLabel = ({ text }) => (
      <div
        className="text-[11px] font-bold uppercase tracking-wider pb-1"
        style={{ color:"var(--text-muted)", borderBottom:"1px solid var(--border-light)" }}
      >
        {text}
      </div>
    );

    function ModalShell({ title, size="max-w-3xl", children, footer }) {
      return (
        <div
          className="anim-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background:"rgba(10,22,34,0.6)", backdropFilter:"blur(3px)" }}
          onClick={e => e.target === e.currentTarget && closeModal()}
        >
          <div
            className={`anim-modal w-full ${size} max-h-[90vh] flex flex-col rounded-2xl overflow-hidden`}
            style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", boxShadow:"var(--shadow-xl)" }}
          >
            <div className="flex items-center justify-between px-6 py-5 shrink-0"
                style={{ borderBottom:"1px solid var(--border-light)" }}>
              <h2 className="text-base font-bold" style={{ color:"var(--text-primary)" }}>{title}</h2>
              <button
                onClick={closeModal}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors duration-150"
                style={{ background:"var(--bg-hover)", color:"var(--text-secondary)" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(238,162,58,0.15)"; e.currentTarget.style.color = "#EEA23A"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">{children}</div>

            <div className="flex justify-end gap-2.5 px-6 py-4 shrink-0"
                style={{ borderTop:"1px solid var(--border-light)" }}>
              {footer}
            </div>
          </div>
        </div>
      );
    }

    function MBtn({ children, onClick, secondary }) {
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

    /* ════════════════ RENDER ════════════════ */
    return (
      <div className="flex flex-col gap-6">

        {/* ── Stats Grid - Mobile-First Responsive ── */}
        {/* Mobile: 1 col, sm: 2 cols, lg: 3 cols, 2xl: 4 cols */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          {[
            { label:"Currently Borrowed", value:statActive,  accent:"#EEA23A" },
            { label:"Overdue",            value:statOverdue, accent:"#EA8B33" },
            { label:"Due This Week",      value:statDueWeek, accent:"#32667F" },
          ].map(s => (
            <div
              key={s.label}
              className="relative rounded-xl p-4 sm:p-5 overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
              style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", boxShadow:"var(--shadow-sm)" }}
            >
              <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background:s.accent }} />
              <p className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider mt-2 mb-1.5" style={{ color:"var(--text-secondary)" }}>
                {s.label}
              </p>
              <p className="text-2xl sm:text-3xl font-bold leading-none mb-1" style={{ color:"var(--text-primary)" }}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Toolbar ── */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 justify-between">
          {/* Search - Full width on mobile */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1 min-w-[180px]"
            style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", boxShadow:"var(--shadow-sm)" }}
          >
            <Search size={15} style={{ color:"var(--text-secondary)" }} className="shrink-0" />
            <input
              className="border-none outline-none text-[13px] bg-transparent w-full"
              style={{ color:"var(--text-primary)" }}
              placeholder="Search student, book, ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Filter pills - Scrollable on mobile */}
          <div className="flex gap-1.5 flex-wrap">
            {["All","Borrowed","Overdue","Returned"].map(s => (
              <button
                key={s}
                onClick={() => { setFilter(s); setCurrentPage(1); }}
                className="px-3 py-1.5 rounded-full text-[12px] font-semibold border-[1.5px] whitespace-nowrap transition-colors duration-150"
                style={filter === s
                  ? { background:"var(--accent-amber)", borderColor:"var(--accent-amber)", color:"#fff" }
                  : { background:"var(--bg-surface)",   borderColor:"var(--border)",       color:"var(--text-secondary)" }
                }
              >
                {s}
              </button>
            ))}
          </div>

          {/* Add Transaction Button */}
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold text-white whitespace-nowrap transition-colors duration-150 shrink-0 w-full sm:w-auto"
            style={{ background:"var(--accent-amber)", boxShadow:"0 2px 6px rgba(238,162,58,0.3)" }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--accent-orange)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--accent-amber)"}
          >
            <Plus size={15} /> Add Transaction
          </button>
        </div>

        {/* ── Transactions Table ── */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background:"var(--bg-surface)",
            border:"1px solid var(--border)",
            boxShadow:"var(--shadow-sm)",
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ background:"var(--bg-hover)" }}>
                  {["Book Title", "Student", "ID No.", "Course", "Due Date", "Status", "Actions"].map(h => (
                    <th
                      key={h}
                      className="text-left px-3 sm:px-4 py-3 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap"
                      style={{
                        color: "var(--text-secondary)",
                        borderBottom: "1px solid var(--border-light)",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-sm" style={{ color:"var(--text-muted)" }}>
                      No transactions found.
                    </td>
                  </tr>
                ) : paginatedRows.map((t, idx) => {
                  const bd = BADGE[t.status] ?? BADGE.Borrowed;
                  const isRet = t.status === "Returned";
                  const isOvr = t.status === "Overdue";
                  return (
                    <tr
                      key={t.id}
                      className="transition-colors duration-100 hover:bg-opacity-50"
                      onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      style={{ opacity: isRet ? 0.6 : 1 }}
                    >
                      <td
                        className="px-3 sm:px-4 py-3 text-[11px] sm:text-[12px]"
                        style={{ color:"var(--text-primary)", borderBottom:"1px solid var(--border-light)" }}
                      >
                        <span className="line-clamp-1">{t.bookTitle}</span>
                      </td>
                      <td
                        className="px-3 sm:px-4 py-3 text-[11px] sm:text-[12px]"
                        style={{ color:"var(--text-primary)", borderBottom:"1px solid var(--border-light)" }}
                      >
                        <span className="line-clamp-1">{t.studentName}</span>
                      </td>
                      <td
                        className="px-3 sm:px-4 py-3 text-[11px] sm:text-[12px]"
                        style={{ color:"var(--text-secondary)", borderBottom:"1px solid var(--border-light)" }}
                      >
                        {t.idNo}
                      </td>
                      <td
                        className="px-3 sm:px-4 py-3 text-[11px] sm:text-[12px]"
                        style={{ color:"var(--text-secondary)", borderBottom:"1px solid var(--border-light)" }}
                      >
                        {t.course}/{t.year}
                      </td>
                      <td
                        className="px-3 sm:px-4 py-3 text-[11px] sm:text-[12px]"
                        style={{ color: isOvr ? "#EA8B33" : "var(--text-secondary)", borderBottom:"1px solid var(--border-light)", fontWeight: isOvr ? 600 : 400 }}
                      >
                        {fmt(t.due)}
                      </td>
                      <td
                        className="px-3 sm:px-4 py-3"
                        style={{ borderBottom:"1px solid var(--border-light)" }}
                      >
                        <span
                          className="inline-block text-[10px] sm:text-[11px] font-semibold px-2 sm:px-2.5 py-0.5 rounded-full"
                          style={bd}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td
                        className="px-3 sm:px-4 py-3 text-center whitespace-nowrap"
                        style={{ borderBottom:"1px solid var(--border-light)" }}
                      >
                        <div className="flex gap-1 sm:gap-1.5 justify-center">
                          {!isRet && (
                            <button
                              onClick={() => handleReturn(t.id)}
                              className="p-1.5 rounded-md transition-colors duration-150 hover:bg-opacity-80"
                              style={{ background:"rgba(50,102,127,0.1)", color:"#32667F" }}
                              title="Mark as returned"
                            >
                              <CheckCircle2 size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => openEdit(t)}
                            className="p-1.5 rounded-md transition-colors duration-150 hover:bg-opacity-80"
                            style={{ background:"rgba(50,102,127,0.1)", color:"#32667F" }}
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="p-1.5 rounded-md transition-colors duration-150 hover:bg-opacity-80"
                            style={{ background:"rgba(234,139,51,0.1)", color:"#c05a0a" }}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Pagination ── */}
        <div className="flex items-center justify-between">
          <p className="text-[12px]" style={{ color:"var(--text-secondary)" }}>
            Showing {paginatedRows.length === 0 ? 0 : startIdx + 1} to {Math.min(startIdx + itemsPerPage, filteredRows.length)} of {filteredRows.length} results
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", color:"var(--text-secondary)" }}
              onMouseEnter={e => { if (!e.currentTarget.disabled) { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-surface)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className="w-8 h-8 rounded-lg text-[12px] font-semibold transition-colors duration-150"
                  style={currentPage === page
                    ? { background:"var(--accent-amber)", color:"#fff", border:"1px solid var(--accent-amber)" }
                    : { background:"var(--bg-surface)", border:"1px solid var(--border)", color:"var(--text-secondary)" }
                  }
                  onMouseEnter={e => { if (currentPage !== page) { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}}
                  onMouseLeave={e => { if (currentPage !== page) { e.currentTarget.style.background = "var(--bg-surface)"; e.currentTarget.style.color = "var(--text-secondary)"; }}}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", color:"var(--text-secondary)" }}
              onMouseEnter={e => { if (!e.currentTarget.disabled) { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-surface)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* ════════ ADD / EDIT MODAL ════════ */}
        {(modal === "add" || modal === "edit") && (
          <ModalShell
            title={modal === "add" ? "Add Transaction" : "Edit Transaction"}
            footer={
              <>
                <MBtn secondary onClick={closeModal}>Cancel</MBtn>
                <MBtn onClick={handleSave}>{modal === "add" ? "Save Transaction" : "Update Transaction"}</MBtn>
              </>
            }
          >
            {/* Book Picker */}
            <div className="flex flex-col gap-1.5 relative" ref={pickerRef}>
              <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color:"var(--text-secondary)" }}>
                Book <span style={{ color:"var(--accent-orange)" }}>*</span>
              </label>

              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg border-[1.5px] cursor-pointer transition-colors duration-150"
                style={{ background:"var(--bg-input)", borderColor: errors.bookId ? "#EA8B33" : "var(--border)" }}
                onClick={() => setPickerOpen(o => !o)}
              >
                {form.bookTitle
                  ? <>
                      <BookOpen size={14} style={{ color:"var(--accent-amber)", flexShrink:0 }} />
                      <span className="text-[13px] font-semibold flex-1 truncate" style={{ color:"var(--text-primary)" }}>
                        {form.bookTitle}
                      </span>
                    </>
                  : <span className="text-[13px] flex-1" style={{ color:"var(--text-muted)" }}>Select a book…</span>
                }
                <ChevronDown
                  size={14}
                  className="shrink-0 transition-transform duration-200"
                  style={{ color:"var(--text-muted)", transform: pickerOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                />
              </div>

              {errors.bookId && <span className="text-[11px] font-medium text-orange-500">{errors.bookId}</span>}

              {/* Picker dropdown */}
              {pickerOpen && (
                <div
                  className="anim-drop absolute top-[calc(100%+4px)] left-0 right-0 rounded-xl overflow-hidden z-30"
                  style={{ background:"var(--bg-surface)", border:"1.5px solid var(--border)", boxShadow:"var(--shadow-lg)" }}
                >
                  {/* Search */}
                  <div
                    className="p-2.5 flex flex-col gap-2"
                    style={{ background:"var(--bg-subtle)", borderBottom:"1px solid var(--border-light)" }}
                  >
                    <div
                      className="flex items-center gap-2 px-2.5 py-2 rounded-lg"
                      style={{ background:"var(--bg-surface)", border:"1.5px solid var(--border)" }}
                    >
                      <Search size={13} style={{ color:"var(--text-secondary)" }} />
                      <input
                        autoFocus
                        className="border-none outline-none text-[12.5px] bg-transparent w-full"
                        style={{ color:"var(--text-primary)" }}
                        placeholder="Search title or author…"
                        value={bookSearch}
                        onChange={e => setBookSearch(e.target.value)}
                        onClick={e => e.stopPropagation()}
                      />
                    </div>

                    <div className="flex gap-1.5 flex-wrap">
                      {ALL_GENRES.map(g => (
                        <button
                          key={g}
                          onClick={e => { e.stopPropagation(); setGenreFilter(g); }}
                          className="px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors duration-100"
                          style={genreFilter === g
                            ? { background:"var(--accent-amber)", borderColor:"var(--accent-amber)", color:"#fff" }
                            : { background:"transparent", borderColor:"var(--border)", color:"var(--text-secondary)" }
                          }
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Book list */}
                  <div className="max-h-[200px] overflow-y-auto p-1.5">
                    {pickerBooks.length === 0
                      ? <p className="text-center text-[13px] py-5" style={{ color:"var(--text-muted)" }}>No books match.</p>
                      : pickerBooks.map(b => (
                        <button
                          key={b.id}
                          onClick={e => { e.stopPropagation(); pickBook(b); }}
                          className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-left transition-colors duration-100"
                          style={{ background: form.bookId === b.id ? "rgba(238,162,58,0.12)" : "transparent" }}
                          onMouseEnter={e => { if (form.bookId !== b.id) e.currentTarget.style.background = "var(--bg-hover)"; }}
                          onMouseLeave={e => { if (form.bookId !== b.id) e.currentTarget.style.background = "transparent"; }}
                        >
                          <div
                            className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
                            style={{
                              background: form.bookId === b.id
                                ? "linear-gradient(135deg,#EEA23A,#EA8B33)"
                                : "linear-gradient(135deg,#132F45,#32667F)",
                              color: "rgba(255,255,255,0.75)",
                            }}
                          >
                            <BookOpen size={14} />
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-[13px] font-semibold truncate" style={{ color:"var(--text-primary)" }}>{b.title}</span>
                            <span className="text-[11px]" style={{ color:"var(--text-muted)" }}>{b.author}</span>
                          </div>
                          <span
                            className="text-[10.5px] font-semibold px-2 py-0.5 rounded shrink-0"
                            style={{ background:"rgba(238,162,58,0.1)", color:"var(--accent-amber)" }}
                          >
                            {b.genre}
                          </span>
                        </button>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>

            {/* Student Info */}
            <SectionLabel text="Student Information" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField label="Full Name"   fkey="studentName" />
              <FormField label="ID No."      fkey="idNo"      placeholder="e.g. 2024-00123"  />
              <FormField label="Contact No." fkey="contact"   type="tel" placeholder="e.g. 09171234567" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField label="Course" fkey="course" placeholder="e.g. BSCS" />
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color:"var(--text-secondary)" }}>
                  Year Level <span style={{ color:"var(--accent-orange)" }}>*</span>
                </label>
                <select
                  className={inpCls}
                  style={inpStyle(!!errors.year)}
                  onFocus={onFocus}
                  onBlur={onBlur(!!errors.year)}
                  value={form.year}
                  onChange={e => {
                    setForm(f => ({ ...f, year:e.target.value }));
                    if (errors.year) setErrors(v => { const n = { ...v }; delete n.year; return n; });
                  }}
                >
                  <option value="">Select year…</option>
                  {YEAR_OPTS.map(y => <option key={y} value={y}>{y} Year</option>)}
                </select>
                {errors.year && <span className="text-[11px] font-medium text-orange-500">{errors.year}</span>}
              </div>
              <FormField label="Email Address" fkey="email" type="email" placeholder="student@school.edu" />
            </div>

            {/* Borrowing Details */}
            <SectionLabel text="Borrowing Details" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Date Borrowed" fkey="borrowed" type="date" />
              <FormField label="Due Date"      fkey="due"      type="date" />
            </div>
          </ModalShell>
        )}

        {/* ════════ DELETE SNACKBAR ════════ */}
        {snackbar && (
          <div
            className="anim-snack fixed bottom-6 left-1/2 flex items-center gap-4 px-5 py-3 rounded-xl z-[60] whitespace-nowrap"
            style={{ background:"#132F45", color:"#fff", boxShadow:"var(--shadow-xl)" }}
          >
            <span className="text-[13.5px] font-medium">Transaction deleted.</span>
            <button
              onClick={handleUndo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-bold transition-colors duration-150"
              style={{ background:"rgba(238,162,58,0.2)", border:"1px solid rgba(238,162,58,0.4)", color:"var(--accent-amber)" }}
            >
              <RotateCcw size={13} /> Undo
            </button>
          </div>
        )}

        {/* ════════ RETURNED TOAST ════════ */}
        {returnToast && (
          <div
            className="anim-snack fixed bottom-6 left-1/2 flex items-center gap-2.5 px-5 py-3 rounded-xl z-[60] whitespace-nowrap"
            style={{ background:"#1a4a35", color:"#fff", boxShadow:"var(--shadow-xl)" }}
          >
            <CheckCircle2 size={16} className="text-green-400 shrink-0" />
            <span className="text-[13.5px] font-medium">
              Book marked as <strong>Returned</strong>.
            </span>
            <button
              onClick={handleUndoReturn}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-bold transition-colors duration-150"
              style={{ background:"rgba(52,211,153,0.15)", border:"1px solid rgba(52,211,153,0.35)", color:"#34d399" }}
            >
              <RotateCcw size={13} /> Undo
            </button>
          </div>
        )}
      </div>
    );
  }