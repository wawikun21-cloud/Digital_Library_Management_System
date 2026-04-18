import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Search, X, BookOpen, User, Calendar, Users,
  Loader2, AlertCircle, CheckCircle2, ChevronDown,
  Edit2, Trash2, Plus, Filter, CalendarClock,
  UserCheck, RefreshCw, Clock, DollarSign,
} from "lucide-react";
import BorrowedTable from "../components/BorrowedTable";
import ConfirmationModal from "../components/ConfirmationModal";
import Toast from "../components/Toast";
import useDebounce from "../hooks/useDebounce";
import CopiesList from "../components/books/CopiesList";

// ── Constants ─────────────────────────────────────────────
const MAX_BOOKS   = 2;
const FINE_PER_DAY = 5; // ₱5 per day overdue

const STATUS_STYLE = {
  Borrowed: { bg: "rgba(50,102,127,0.12)",  color: "#32667F" },
  Returned: { bg: "rgba(50,127,79,0.12)",   color: "#2d7a4f" },
  Overdue:  { bg: "rgba(234,139,51,0.12)",  color: "#c05a0a" },
};

const GRADIENTS = [
  ["#132F45","#32667F"], ["#EEA23A","#EA8B33"], ["#32667F","#1a4a63"],
  ["#EA8B33","#F3B940"], ["#1d3f57","#32667F"], ["#b87a1a","#EEA23A"],
];

// ── Helpers ───────────────────────────────────────────────
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function isOverdue(dueDate, status) {
  if (status === "Returned" || !dueDate) return false;
  // Compare as plain strings (YYYY-MM-DD) — no Date parsing needed, avoids timezone shift
  return toDateStr(dueDate) < today();
}
// Extract YYYY-MM-DD safely without timezone conversion.
// Using new Date() on a date string converts to UTC then local time,
// which shifts the date by ±1 day depending on the user's timezone.
// Compute fine from a transaction object.
// Uses server-computed_fine when available, otherwise calculates client-side.
function calcFine(t) {
  if (!t || !t.due_date) return 0;
  // Prefer server-computed value (already a number after sanitizeTxns)
  if (t.computed_fine !== null && t.computed_fine !== undefined) return t.computed_fine;
  // Client-side fallback: compare due_date to today (Borrowed) or return_date (Returned)
  const refStr = t.status === "Returned" && t.return_date ? t.return_date : today();
  const ref    = new Date(refStr    + "T00:00:00");
  const due    = new Date(t.due_date + "T00:00:00");
  const days   = Math.max(0, Math.floor((ref - due) / 86400000));
  return days * FINE_PER_DAY;
}

function toDateStr(val) {
  if (!val) return null;
  // Already a plain date string like "2025-03-15"
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  // ISO string like "2025-03-15T00:00:00.000Z" — just slice the date part
  if (typeof val === "string") return val.slice(0, 10);
  // Date object — use local date parts to avoid UTC offset shift
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return null;
}

function sanitizeTxns(rows) {
  return rows.map(t => ({
    ...t,
    borrow_date:   toDateStr(t.borrow_date),
    due_date:      toDateStr(t.due_date),
    return_date:   toDateStr(t.return_date),
    // MySQL returns computed_fine as string; cast to number.
    computed_fine: t.computed_fine != null ? Number(t.computed_fine) : null,
    fine_paid:     t.fine_paid != null     ? Number(t.fine_paid)     : 0,
    fine_amount:   t.fine_amount != null   ? Number(t.fine_amount)   : 0,
  }));
}

const EMPTY_FORM = {
  borrower_type:    "student",  // "student" | "faculty"
  borrower_name:    "",
  borrower_id_number: "",
  borrower_contact: "",
  borrower_email:   "",
  borrower_course:  "",
  borrower_yr_level:"",
  borrow_date:      today(),
  due_date:         tomorrow(),
  // books: array of { id, title, author, accessionNumber }
  books: [],
};

// ══════════════════════════════════════════════════════════
export default function Borrowed() {
  const [loading, setLoading] = useState(true);
  const [txns, setTxns]       = useState([]);

  // ── Filter state ──────────────────────────────────────
  const [query,        setQuery]        = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter,   setTypeFilter]   = useState("All");  // All | student | faculty

  // ── Modal state ───────────────────────────────────────
  const [modal,     setModal]     = useState(false);  // "borrow" | "edit" | "extend" | false
  const [editTxn,   setEditTxn]   = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [errors,    setErrors]    = useState({});

  // ── Borrower search state ─────────────────────────────
  const [borrowerQuery,    setBorrowerQuery]    = useState("");
  const [borrowerResults,  setBorrowerResults]  = useState([]);
  const [borrowerLoading,  setBorrowerLoading]  = useState(false);
  const [borrowerSelected, setBorrowerSelected] = useState(false);
  const debouncedBorrower = useDebounce(borrowerQuery, 350);

  // ── Book search state ─────────────────────────────────
  const [bookQuery,   setBookQuery]   = useState("");
  const [bookResults, setBookResults] = useState([]);
  const [bookLoading, setBookLoading] = useState(false);
  const debouncedBook = useDebounce(bookQuery, 350);

  // ── Extend state ──────────────────────────────────────
  const [extendDays, setExtendDays] = useState(1);

  // ── Delete modal ──────────────────────────────────────
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, title: "" });
  // 25002500 Detail modal (row click) 2500250025002500250025002500250025002500250025002500250025002500250025002500250025002500250025002500250025002500250025002500250025002500
  const [detailTxn, setDetailTxn] = useState(null);

  // ── Toast ─────────────────────────────────────────────
  const [toast, setToast] = useState({ visible: false, message: "", type: "info" });
  const showToast = (message, type = "info") => setToast({ visible: true, message, type });
  const hideToast = () => setToast(p => ({ ...p, visible: false }));

  // ── Fetch transactions ────────────────────────────────
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const res  = await fetch("/api/transactions");
      const data = await res.json();
      if (data.success) setTxns(sanitizeTxns(data.data || []));
      else showToast("Failed to load transactions", "error");
    } catch { showToast("Could not connect to server", "error"); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  // ── Borrower lookup ───────────────────────────────────
  // Handles both student (by ID number) and faculty (by name).
  // The student endpoint now returns an array when multiple matches exist.
  useEffect(() => {
    if (!debouncedBorrower.trim() || borrowerSelected) { setBorrowerResults([]); return; }
    const type = form.borrower_type;
    const run = async () => {
      setBorrowerLoading(true);
      try {
        let res, data;
        if (type === "student") {
          res  = await fetch(`/api/transactions/lookup/student/${encodeURIComponent(debouncedBorrower)}`);
          data = await res.json();
          if (data.success) {
            // Backend returns data as array (multiple) or single object (exact match)
            const results = Array.isArray(data.data) ? data.data : [data.data];
            setBorrowerResults(results);
          } else {
            setBorrowerResults([]);
          }
        } else {
          res  = await fetch(`/api/transactions/lookup/faculty?q=${encodeURIComponent(debouncedBorrower)}`);
          data = await res.json();
          setBorrowerResults(data.success ? data.data : []);
        }
      } catch { setBorrowerResults([]); }
      finally  { setBorrowerLoading(false); }
    };
    run();
  }, [debouncedBorrower, form.borrower_type, borrowerSelected]);

  // ── Book search ───────────────────────────────────────
  useEffect(() => {
    if (!debouncedBook.trim()) { setBookResults([]); return; }
    const run = async () => {
      setBookLoading(true);
      try {
        const res  = await fetch(`/api/transactions/search/books?q=${encodeURIComponent(debouncedBook)}`);
        const data = await res.json();
        // Exclude already-selected ACCESSIONS (unique per copy)
        const selectedAccessions = form.books.map(b => b.accessionNumber).filter(Boolean);
        setBookResults(data.success ? data.data.filter(b => {
          const acc = b.first_available_accession || b.accessionNumber;
          return !selectedAccessions.includes(acc);
        }) : []);
      } catch { setBookResults([]); }
      finally  { setBookLoading(false); }
    };
    run();
  }, [debouncedBook, form.books]);

  // ── Lock scroll when modal open ────────────────────────
  useEffect(() => {
    document.body.style.overflow = modal ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modal]);

  // ── Filtered transactions ─────────────────────────────
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return txns.filter(t => {
      if (q && !["book_title","book_author","borrower_name","borrower_id_number","book_accession"]
          .some(k => t[k]?.toString().toLowerCase().includes(q))) return false;
      if (statusFilter === "Overdue"  && !isOverdue(t.due_date, t.status)) return false;
      if (statusFilter === "Borrowed" && t.status !== "Borrowed") return false;
      if (statusFilter === "Returned" && t.status !== "Returned") return false;
      if (typeFilter !== "All" && (t.borrower_type || "student") !== typeFilter) return false;
      return true;
    });
  }, [txns, query, statusFilter, typeFilter]);

  // ── Stats summary ─────────────────────────────────────
  const summary = useMemo(() => ({
    total:    txns.length,
    borrowed: txns.filter(t => t.status === "Borrowed").length,
    returned: txns.filter(t => t.status === "Returned").length,
    overdue:  txns.filter(t => isOverdue(t.due_date, t.status)).length,
  }), [txns]);

  // ── Open borrow modal ─────────────────────────────────
  const openBorrowModal = () => {
    setForm({ ...EMPTY_FORM, borrow_date: today(), due_date: tomorrow() });
    setBorrowerQuery("");
    setBorrowerSelected(false);
    setBorrowerResults([]);
    setBookQuery("");
    setBookResults([]);
    setErrors({});
    setEditTxn(null);
    setModal("borrow");
  };

  // ── Open edit modal ───────────────────────────────────
  const openEditModal = (txn) => {

    setForm({
      borrower_type:     txn.borrower_type     || "student",
      borrower_name:     txn.borrower_name     || "",
      borrower_id_number:txn.borrower_id_number|| "",
      borrower_contact:  txn.borrower_contact  || "",
      borrower_email:    txn.borrower_email    || "",
      borrower_course:   txn.borrower_course   || "",
      borrower_yr_level: txn.borrower_yr_level || "",
      borrow_date:       txn.borrow_date       || today(),
      due_date:          txn.due_date          || tomorrow(),
      books: [],  // edit doesn't change book
    });
    setErrors({});
    setEditTxn(txn);
    setModal("edit");
  }

  // ── Open extend modal ─────────────────────────────────
  const openExtendModal = useCallback((txn) => {
    setEditTxn(txn);
    setExtendDays(1);
    setModal("extend");
  }, []);

  const closeModal = useCallback(() => {
    setModal(false);
    setEditTxn(null);
    setBorrowerQuery("");
    setBorrowerSelected(false);
    setBorrowerResults([]);
    setBookQuery("");
    setBookResults([]);
  }, []);

  const selectBorrower = useCallback((person) => {
    if (form.borrower_type === "student") {
      const fullName = (person.first_name && person.last_name)
        ? `${person.first_name} ${person.last_name}`.trim()
        : (person.student_name || "");
      setForm(f => ({
        ...f,
        borrower_name:      fullName,
        borrower_id_number: person.student_id_number,
        borrower_contact:   person.student_contact  || "",
        borrower_email:     person.student_email    || "",
        borrower_course:    person.student_course   || "",
        borrower_yr_level:  person.student_yr_level || "",
      }));
      setBorrowerQuery(person.student_id_number);
    } else {
      setForm(f => ({
        ...f,
        borrower_name:    person.faculty_name,
        borrower_course:  person.department || "",
        borrower_id_number: "",
      }));
      setBorrowerQuery(person.faculty_name);
    }
    setBorrowerSelected(true);
    setBorrowerResults([]);
    setErrors(e => { const n = {...e}; delete n.borrower; return n; });
  }, [form.borrower_type]);

  // ── Add book to list ──────────────────────────────────
  // accessionNumber starts null — user picks the specific copy via CopiesList below.
// sourcery skip: avoid-function-declarations-in-blocks
  function addBook(book) {
    if (form.borrower_type !== "faculty" && form.books.length >= MAX_BOOKS) return;
    if (form.books.some(b => b.id === book.id)) return;
    setForm(f => ({ ...f, books: [...f.books, { ...book, accessionNumber: null }] }));
    setBookQuery("");
    setBookResults([]);
    setErrors(e => { const n = { ...e }; delete n.books; return n; });
  }

  // ── Update which copy accession is selected for a book ──
  function setBookAccession(bookId, accession) {
    setForm(f => ({
      ...f,
      books: f.books.map(b => b.id === bookId ? { ...b, accessionNumber: accession } : b),
    }));
    setErrors(e => { const n = { ...e }; delete n.books; return n; });
  }

  function removeBook(id) {
    setForm(f => ({ ...f, books: f.books.filter(b => b.id !== id) }));
  }

  // ── Validate borrow form ──────────────────────────────
  function validate() {
    const e = {};
    if (!form.borrower_name.trim()) e.borrower = "Please select a borrower";
    if (form.books.length === 0)    e.books    = "Please add at least 1 book";
    if (!form.due_date)             e.due_date = "Due date is required";

    // ✅ FIX: every added book must have a copy selected from CopiesList
    const missingAcc = form.books.find(b => !b.accessionNumber);
    if (missingAcc) e.books = `Please select a copy for "${missingAcc.title}"`;

    return e;
  }

  // ── Save borrow (creates one transaction per book) ────
  async function handleBorrow() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    try {
      const results = await Promise.all(form.books.map(book =>
        fetch("/api/transactions", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
body: JSON.stringify({
            book_id:           book.id,
            accession_number:  book.accessionNumber || null,
            borrower_type:     form.borrower_type,
            borrower_name:     form.borrower_name,
            borrower_id_number:form.borrower_id_number || null,
            borrower_contact:  form.borrower_contact   || null,
            borrower_email:    form.borrower_email     || null,
            borrower_course:   form.borrower_course    || null,
            borrower_yr_level: form.borrower_yr_level  || null,
            borrow_date:       form.borrow_date,
            due_date:          form.due_date,
          }),
        }).then(r => r.json())
      ));

      const failed = results.filter(r => !r.success);
      if (failed.length) {
        showToast(failed[0].error || "Some books failed to borrow", "error");
        return;
      }

      const newTxns = sanitizeTxns(results.map(r => r.data));
      setTxns(p => [...newTxns, ...p]);
      closeModal();
      showToast(`${form.books.length} book(s) borrowed successfully!`, "success");
    } catch { showToast("Failed to connect to server", "error"); }
  }

  // ── Save edit ─────────────────────────────────────────
  async function handleEdit() {
    if (!form.borrower_name.trim()) { setErrors({ borrower: "Name is required" }); return; }
    if (!form.due_date)             { setErrors({ due_date: "Due date is required" }); return; }
    try {
      const res  = await fetch(`/api/transactions/${editTxn.id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          borrower_name:      form.borrower_name,
          borrower_id_number: form.borrower_id_number || null,
          borrower_contact:   form.borrower_contact   || null,
          borrower_email:     form.borrower_email     || null,
          borrower_course:    form.borrower_course    || null,
          borrower_yr_level:  form.borrower_yr_level  || null,
          borrow_date:        form.borrow_date,
          due_date:           form.due_date,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setTxns(p => p.map(t => t.id === editTxn.id ? sanitizeTxns([result.data])[0] : t));
        closeModal();
        showToast("Transaction updated", "success");
      } else {
        showToast(result.error || "Failed to update", "error");
      }
    } catch { showToast("Failed to connect to server", "error"); }
  }

  // ── Extend due date ───────────────────────────────────
  async function handleExtend() {
    try {
      const res  = await fetch(`/api/transactions/${editTxn.id}/extend`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: extendDays }),
      });
      const result = await res.json();
      if (result.success) {
        setTxns(p => p.map(t => t.id === editTxn.id ? sanitizeTxns([result.data])[0] : t));
        closeModal();
        showToast(`Due date renewed by ${extendDays} day(s)`, "success");
      } else {
        showToast(result.error || "Failed to renew", "error");
      }
    } catch { showToast("Failed to connect to server", "error"); }
  }

  // ── Return book ───────────────────────────────────────
  async function handleReturn(id) {
    try {
      const res    = await fetch(`/api/transactions/${id}/return`, { method: "PUT" });
      const result = await res.json();
      if (result.success) {
        setTxns(p => p.map(t => t.id === id ? sanitizeTxns([result.data])[0] : t));
        showToast("Book returned successfully!", "success");
      } else { showToast(result.error || "Failed to return", "error"); }
    } catch { showToast("Failed to connect to server", "error"); }
  }

  // ── Delete ────────────────────────────────────────────
  async function handleDelete(id) {
    try {
      const res    = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      const result = await res.json();
      if (result.success) {
        setTxns(p => p.filter(t => t.id !== id));
        showToast("Transaction deleted", "success");
      } else { showToast(result.error || "Failed to delete", "error"); }
    } catch { showToast("Failed to connect to server", "error"); }
    setDeleteModal({ open: false, id: null, title: "" });
  }

  // ── Pay fine ─────────────────────────────────────────
  async function handlePayFine(id) {
    try {
      const res    = await fetch(`/api/transactions/${id}/pay-fine`, { method: "PUT" });
      const result = await res.json();
      if (result.success) {
        setTxns(p => p.map(t => t.id === id ? sanitizeTxns([result.data])[0] : t));
        // Update detailTxn if it's open
        setDetailTxn(prev => prev?.id === id ? sanitizeTxns([result.data])[0] : prev);
        showToast("Fine marked as paid!", "success");
      } else { showToast(result.error || "Failed to mark fine as paid", "error"); }
    } catch { showToast("Failed to connect to server", "error"); }
  }

  // ─────────────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────────────
  return (
<div className="flex flex-col gap-5">

      {/* ── Page Header ──────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 text-[22px] font-bold"
            style={{ color: "var(--text-primary)" }}>
            <BookOpen size={22} style={{ color: "var(--accent-amber)" }} />
            Borrowed Books
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Manage borrowing transactions, returns, renewals, and overdue fines
          </p>
        </div>
      </div>

      {/* ── Summary pills ──────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total",    value: summary.total,    color: "#32667F",  icon: BookOpen    },
          { label: "Borrowed", value: summary.borrowed, color: "#32667F",  icon: Clock       },
          { label: "Returned", value: summary.returned, color: "#2d7a4f",  icon: CheckCircle2},
          { label: "Overdue",  value: summary.overdue,  color: "#c05a0a",  icon: CalendarClock},
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label}
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}18` }}>
              <Icon size={16} style={{ color }} />
            </div>
            <div>
              <p className="text-xl font-bold leading-none" style={{ color: "var(--text-primary)" }}>{value}</p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2.5 justify-between">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">

          {/* Search */}
          <div className="relative flex items-center gap-2 px-3 py-2 rounded-lg flex-1 min-w-[200px] max-w-sm"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <Search size={14} className="shrink-0" style={{ color: "var(--text-secondary)" }} />
            <input
              className="border-none outline-none text-[13px] bg-transparent w-full"
              style={{ color: "var(--text-primary)" }}
              placeholder="Search borrower, book, accession…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && (
              <button onClick={() => setQuery("")} style={{ color: "var(--text-muted)" }}>
                <X size={12} />
              </button>
            )}
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg text-[12.5px] font-medium border outline-none cursor-pointer"
            style={{
              background: "var(--bg-surface)", border: "1px solid var(--border)",
              color: statusFilter !== "All" ? "var(--accent-amber)" : "var(--text-secondary)",
            }}
          >
            <option value="All">All Status</option>
            <option value="Borrowed">Borrowed</option>
            <option value="Returned">Returned</option>
            <option value="Overdue">Overdue</option>
          </select>

          {/* Borrower type filter */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-lg text-[12.5px] font-medium border outline-none cursor-pointer"
            style={{
              background: "var(--bg-surface)", border: "1px solid var(--border)",
              color: typeFilter !== "All" ? "var(--accent-amber)" : "var(--text-secondary)",
            }}
          >
            <option value="All">All Borrowers</option>
            <option value="student">Students</option>
            <option value="faculty">Faculty</option>
          </select>

          {/* Clear filters */}
          {(statusFilter !== "All" || typeFilter !== "All" || query) && (
            <button
              onClick={() => { setStatusFilter("All"); setTypeFilter("All"); setQuery(""); }}
              className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-[12px] font-medium"
              style={{ color: "var(--accent-amber)", border: "1px solid var(--border)" }}
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>

        {/* Borrow button */}
        <button
          onClick={openBorrowModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold text-white flex-shrink-0"
          style={{ background: "var(--accent-amber)" }}
        >
          <Plus size={14} /> Borrow Book
        </button>
      </div>

      {/* Result count */}
      <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
        {filtered.length === txns.length
          ? `${txns.length} transaction${txns.length !== 1 ? "s" : ""}`
          : `${filtered.length} of ${txns.length} shown`}
      </p>

      {/* ── Table ──────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--accent-amber)" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <AlertCircle size={36} className="mb-3 opacity-30" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No transactions found.</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <BorrowedTable
            transactions={filtered}
            onRowClick={t => setDetailTxn(t)}
            isOverdue={isOverdue}
          />
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          BORROW MODAL
      ══════════════════════════════════════════════════ */}
      {modal === "borrow" && (
        <ModalShell title="Borrow Book" onClose={closeModal}>

          {/* ── Borrower type toggle ── */}
          <div className="flex gap-2">
            {["student","faculty"].map(type => (
              <button
                key={type}
                onClick={() => {
                  setForm(f => ({ ...EMPTY_FORM, borrow_date: f.borrow_date, due_date: f.due_date, borrower_type: type }));
                  setBorrowerQuery("");
                  setBorrowerSelected(false);
                  setBorrowerResults([]);
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-semibold border-2 transition-colors"
                style={{
                  background:   form.borrower_type === type ? "rgba(238,162,58,0.12)" : "var(--bg-main)",
                  borderColor:  form.borrower_type === type ? "var(--accent-amber)"   : "var(--border)",
                  color:        form.borrower_type === type ? "var(--accent-amber)"   : "var(--text-secondary)",
                }}
              >
                {type === "student" ? <User size={14} /> : <UserCheck size={14} />}
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          {/* ── Borrower search ── */}
          <div className="flex flex-col gap-1">
            <FieldLabel label={form.borrower_type === "student" ? "Student ID Number" : "Faculty Name"} required />
            <div className="relative">
              <div className="relative flex items-center">
                <Search size={14} className="absolute left-3" style={{ color: "var(--text-muted)" }} />
                <input
                  value={borrowerQuery}
                  onChange={e => { setBorrowerQuery(e.target.value); setBorrowerSelected(false); }}
                  placeholder={form.borrower_type === "student" ? "Type student ID or name…" : "Type faculty name…"}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg text-[13px] border outline-none"
                  style={{
                    background:   "var(--bg-main)",
                    borderColor:  errors.borrower ? "#EA8B33" : "var(--border)",
                    color:        "var(--text-primary)",
                  }}
                />
                {borrowerLoading && <Loader2 size={13} className="absolute right-3 animate-spin" style={{ color: "var(--text-muted)" }} />}
              </div>

              {/* ── Dropdown results ── */}
              {borrowerResults.length > 0 && !borrowerSelected && (
                <div
                  className="absolute z-30 top-full left-0 right-0 mt-1 rounded-lg overflow-hidden shadow-lg"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
                >
                  {/* Header hint */}
                  <div className="px-3 py-1.5 border-b" style={{ borderColor: "var(--border-light)", background: "var(--bg-main)" }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                      {borrowerResults.length} result{borrowerResults.length > 1 ? "s" : ""} — click to select
                    </p>
                  </div>

                  {borrowerResults.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => selectBorrower(p)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
                      style={{ borderBottom: i < borrowerResults.length - 1 ? "1px solid var(--border-light)" : "none" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(238,162,58,0.08)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      {/* Avatar circle */}
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
                        style={{ background: "rgba(50,102,127,0.12)", color: "#32667F" }}
                      >
                        {(() => {
                          const name = form.borrower_type === "student"
                            ? ((p.first_name && p.last_name)
                                ? `${p.first_name} ${p.last_name}`
                                : p.student_name || "?")
                            : (p.faculty_name || "?");
                          return name.charAt(0).toUpperCase();
                        })()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                          {form.borrower_type === "student"
                            ? ((p.first_name && p.last_name)
                                ? `${p.first_name} ${p.last_name}`
                                : p.student_name || "—")
                            : (p.faculty_name || "—")}
                        </p>
                        <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
                          {form.borrower_type === "student"
                            ? [p.student_id_number, p.student_course, p.student_yr_level].filter(Boolean).join(" · ")
                            : p.department}
                        </p>
                      </div>

                      {/* ID badge */}
                      {form.borrower_type === "student" && p.student_id_number && (
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded shrink-0"
                          style={{ background: "rgba(50,102,127,0.1)", color: "#32667F" }}
                        >
                          {p.student_id_number}
                        </span>
                      )}
                      {form.borrower_type === "faculty" && p.department && (
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded shrink-0"
                          style={{ background: "rgba(50,102,127,0.1)", color: "#32667F" }}
                        >
                          {p.department}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* No results hint */}
              {!borrowerLoading && borrowerQuery.trim().length >= 2 && borrowerResults.length === 0 && !borrowerSelected && (
                <div
                  className="absolute z-30 top-full left-0 right-0 mt-1 rounded-lg px-3 py-3 text-center"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
                >
                  <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
                    No {form.borrower_type === "student" ? "student" : "faculty"} found
                  </p>
                </div>
              )}
            </div>
            {errors.borrower && <p className="text-[11px] text-orange-500">{errors.borrower}</p>}
          </div>

          {/* ── Selected borrower card ── */}
          {form.borrower_name && (
            <div className="p-3 rounded-lg flex items-center gap-3"
              style={{ background: "rgba(238,162,58,0.08)", border: "1px solid rgba(238,162,58,0.25)" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(238,162,58,0.2)" }}>
                {form.borrower_type === "student"
                  ? <User size={14} style={{ color: "var(--accent-amber)" }} />
                  : <UserCheck size={14} style={{ color: "var(--accent-amber)" }} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>{form.borrower_name}</p>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  {[
                    form.borrower_id_number && `ID: ${form.borrower_id_number}`,
                    form.borrower_course,
                    form.borrower_yr_level,
                  ].filter(Boolean).join(" · ")}
                </p>
              </div>
              <button
                onClick={() => {
                  setBorrowerQuery("");
                  setBorrowerSelected(false);
                  setForm(f => ({
                    ...f,
                    borrower_name: "", borrower_id_number: "",
                    borrower_contact: "", borrower_email: "",
                    borrower_course: "", borrower_yr_level: "",
                  }));
                }}
                className="ml-auto shrink-0"
                style={{ color: "var(--text-muted)" }}
                title="Clear selection"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* ── Book search ── */}
          <div className="flex items-center justify-between">
            <FieldLabel label="Books to Borrow" required />
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: form.books.length >= MAX_BOOKS ? "rgba(234,139,51,0.15)" : "rgba(50,102,127,0.1)",
                color:      form.books.length >= MAX_BOOKS ? "#c05a0a" : "#32667F",
              }}>
              {form.books.length}/{MAX_BOOKS} books
            </span>
          </div>

          {form.books.length < MAX_BOOKS && (
            <div className="relative">
              <div className="relative flex items-center">
                <BookOpen size={14} className="absolute left-3" style={{ color: "var(--text-muted)" }} />
                <input
                  value={bookQuery}
                  onChange={e => setBookQuery(e.target.value)}
                  placeholder="Search by accession no. or title…"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg text-[13px] border outline-none"
                  style={{
                    background:  "var(--bg-main)",
                    borderColor: errors.books ? "#EA8B33" : "var(--border)",
                    color:       "var(--text-primary)",
                  }}
                />
                {bookLoading && <Loader2 size={13} className="absolute right-3 animate-spin" style={{ color: "var(--text-muted)" }} />}
              </div>

              {bookResults.length > 0 && (
                <div className="absolute z-30 top-full left-0 right-0 mt-1 rounded-lg overflow-hidden shadow-lg"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                  {bookResults.map(b => (
                    <button key={b.id} onClick={() => addBook(b)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-amber-500/10 transition-colors">
                      <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(50,102,127,0.12)" }}>
                        <BookOpen size={12} style={{ color: "#32667F" }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>{b.title}</p>
                        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                          {b.accessionNumber && `Acc: ${b.accessionNumber} · `}{b.author}
                        </p>
                      </div>
                      <span className="ml-auto text-[11px] shrink-0" style={{ color: "#2d7a4f" }}>{b.quantity} avail.</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {errors.books && <p className="text-[11px] text-orange-500 -mt-2">{errors.books}</p>}

          {/* Selected books — with inline copy picker */}
          {form.books.length > 0 && (
            <div className="flex flex-col gap-3">
              {form.books.map(b => (
                <div key={b.id} className="flex flex-col rounded-lg overflow-hidden"
                  style={{ background: "var(--bg-main)", border: "1px solid var(--border)" }}>

                  {/* Book header row */}
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <BookOpen size={14} style={{ color: "#32667F" }} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium truncate" style={{ color: "var(--text-primary)" }}>{b.title}</p>
                      {b.accessionNumber ? (
                        <p className="text-[11px]" style={{ color: "#2d7a4f" }}>
                          ✓ Copy selected: <strong>{b.accessionNumber}</strong>
                        </p>
                      ) : (
                        <p className="text-[11px]" style={{ color: "#c05a0a" }}>
                          ⚠ Select a copy below
                        </p>
                      )}
                    </div>
                    <button onClick={() => removeBook(b.id)} style={{ color: "var(--text-muted)" }} title="Remove book">
                      <X size={14} />
                    </button>
                  </div>

                  {/* ✅ CopiesList — user picks the specific copy here */}
                  <div className="px-3 pb-3">
                    <CopiesList
                      bookId={b.id}
                      selectedAccession={b.accessionNumber}
                      onSelectCopy={(accession) => setBookAccession(b.id, accession)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Dates ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <FieldLabel label="Date Borrowed" />
              <DateInput value={form.borrow_date} onChange={v => setForm(f => ({ ...f, borrow_date: v }))} />
            </div>
            <div className="flex flex-col gap-1">
              <FieldLabel label="Due Date (1 day)" required />
              <DateInput
                value={form.due_date}
                onChange={v => { setForm(f => ({ ...f, due_date: v })); setErrors(e => { const n={...e}; delete n.due_date; return n; }); }}
                error={errors.due_date}
              />
              {errors.due_date && <p className="text-[11px] text-orange-500">{errors.due_date}</p>}
            </div>
          </div>

          <ModalFooter onCancel={closeModal} onConfirm={handleBorrow} confirmLabel="Borrow Book" />
        </ModalShell>
      )}

      {/* ══════════════════════════════════════════════════
          EDIT MODAL
      ══════════════════════════════════════════════════ */}
      {modal === "edit" && editTxn && (
        <ModalShell title="Edit Transaction" onClose={closeModal}>
          <div className="p-3 rounded-lg"
            style={{ background: "var(--bg-main)", border: "1px solid var(--border)" }}>
            <p className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{editTxn.book_title}</p>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {editTxn.book_accession && `Acc: ${editTxn.book_accession} · `}{editTxn.book_author}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <FieldLabel label="Borrower Name" required />
            <input
              value={form.borrower_name}
              onChange={e => setForm(f => ({ ...f, borrower_name: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg text-[13px] border outline-none"
              style={{ background: "var(--bg-main)", borderColor: errors.borrower ? "#EA8B33" : "var(--border)", color: "var(--text-primary)" }}
            />
            {errors.borrower && <p className="text-[11px] text-orange-500">{errors.borrower}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <FieldLabel label="ID Number" />
              <input value={form.borrower_id_number} onChange={e => setForm(f => ({ ...f, borrower_id_number: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg text-[13px] border outline-none"
                style={{ background: "var(--bg-main)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
            </div>
            <div className="flex flex-col gap-1">
              <FieldLabel label="Contact" />
              <input value={form.borrower_contact} onChange={e => setForm(f => ({ ...f, borrower_contact: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg text-[13px] border outline-none"
                style={{ background: "var(--bg-main)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <FieldLabel label="Date Borrowed" />
              <DateInput value={form.borrow_date} onChange={v => setForm(f => ({ ...f, borrow_date: v }))} />
            </div>
            <div className="flex flex-col gap-1">
              <FieldLabel label="Due Date" required />
              <DateInput value={form.due_date} onChange={v => setForm(f => ({ ...f, due_date: v }))} error={errors.due_date} />
              {errors.due_date && <p className="text-[11px] text-orange-500">{errors.due_date}</p>}
            </div>
          </div>

          <ModalFooter onCancel={closeModal} onConfirm={handleEdit} confirmLabel="Save Changes" />
        </ModalShell>
      )}

      {/* ══════════════════════════════════════════════════
          EXTEND MODAL
      ══════════════════════════════════════════════════ */}
      {modal === "extend" && editTxn && (
        <ModalShell title="Renew Due Date" onClose={closeModal}>
          <div className="p-3 rounded-lg"
            style={{ background: "var(--bg-main)", border: "1px solid var(--border)" }}>
            <p className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{editTxn.book_title}</p>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              Current due date: <strong>{editTxn.due_date}</strong>
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <FieldLabel label="Renew by (days)" required />
            <div className="flex items-center gap-3">
              <button onClick={() => setExtendDays(d => Math.max(1, d - 1))}
                className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-lg border"
                style={{ background: "var(--bg-main)", borderColor: "var(--border)", color: "var(--text-primary)" }}>−</button>
              <span className="flex-1 text-center text-xl font-bold" style={{ color: "var(--text-primary)" }}>{extendDays}</span>
              <button onClick={() => setExtendDays(d => d + 1)}
                className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-lg border"
                style={{ background: "var(--bg-main)", borderColor: "var(--border)", color: "var(--text-primary)" }}>+</button>
            </div>
            <p className="text-[11px] text-center mt-1" style={{ color: "var(--text-muted)" }}>
              New due date: <strong>{(() => {
                const d = new Date(editTxn.due_date + "T00:00:00");
                d.setDate(d.getDate() + extendDays);
                return d.toISOString().slice(0, 10);
              })()}</strong>
            </p>
          </div>

          <ModalFooter onCancel={closeModal} onConfirm={handleExtend} confirmLabel={`Renew ${extendDays} Day${extendDays > 1 ? "s" : ""}`} />
        </ModalShell>
      )}

      {/* ══════════════════════════════════════════════════
          DETAIL MODAL (row click)
      ══════════════════════════════════════════════════ */}
      {detailTxn && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
          style={{ background: "rgba(10,22,34,0.6)", backdropFilter: "blur(3px)" }}
          onClick={() => setDetailTxn(null)}
        >
          <div
            className="w-full max-w-[420px] rounded-2xl overflow-hidden flex flex-col"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xl)" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid var(--border-light)" }}>
              <div className="flex items-center gap-2">
                <BookOpen size={18} style={{ color: "var(--accent-amber)" }} />
                <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Transaction Details</h2>
              </div>
              <button
                onClick={() => setDetailTxn(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg"
                style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 flex flex-col gap-4">

              {/* Book info */}
              <div className="p-3 rounded-lg" style={{ background: "var(--bg-main)", border: "1px solid var(--border)" }}>
                <p className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>{detailTxn.book_title}</p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {detailTxn.book_accession && `Acc: ${detailTxn.book_accession} · `}{detailTxn.book_author}
                </p>
              </div>

              {/* Borrower info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Borrower</p>
                  <p className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{detailTxn.borrower_name}</p>
                  {detailTxn.borrower_id_number && (
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>ID: {detailTxn.borrower_id_number}</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Contact</p>
                  <p className="text-[12px]" style={{ color: "var(--text-primary)" }}>{detailTxn.borrower_contact || "—"}</p>
                </div>
                {detailTxn.borrower_course && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                      {detailTxn.borrower_type === "faculty" ? "Department" : "Course"}
                    </p>
                    <p className="text-[12px]" style={{ color: "var(--text-primary)" }}>
                      {detailTxn.borrower_type === "faculty"
                        ? `${detailTxn.borrower_course} — Faculty`
                        : `${detailTxn.borrower_course}${detailTxn.borrower_yr_level ? ` · ${detailTxn.borrower_yr_level}` : ""}`}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Status</p>
                  {(() => {
                    const isOvd = isOverdue(detailTxn.due_date, detailTxn.status);
                    const ds    = detailTxn.status === "Returned" ? "Returned" : isOvd ? "Overdue" : "Borrowed";
                    const style = ds === "Returned" ? { background: "rgba(50,127,79,0.12)",  color: "#2d7a4f" }
                                : ds === "Overdue"  ? { background: "rgba(234,139,51,0.12)", color: "#c05a0a" }
                                :                    { background: "rgba(50,102,127,0.12)", color: "#32667F" };
                    return (
                      <span className="text-[11px] font-semibold px-2 py-1 rounded" style={style}>
                        {ds}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Borrow Date",  value: detailTxn.borrow_date },
                  { label: "Due Date",     value: detailTxn.due_date,    warn: isOverdue(detailTxn.due_date, detailTxn.status) },
                  { label: "Return Date",  value: detailTxn.return_date },
                ].map(({ label, value, warn }) => (
                  <div key={label}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
                    <p className="text-[12px] font-medium" style={{ color: warn ? "#EA8B33" : value ? "var(--text-primary)" : "var(--text-muted)" }}>
                      {value
                        ? (() => { const [y,m,d] = value.split("-"); return new Date(+y,+m-1,+d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); })()
                        : "—"}
                    </p>
                  </div>
                ))}
              </div>

              {/* Fines */}
              {(() => {
                const fine    = calcFine(detailTxn);
                const finePaid = !!detailTxn.fine_paid;
                if (fine === 0) return null;
                return (
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                    style={{ background: finePaid ? "rgba(50,127,79,0.08)" : "rgba(234,139,51,0.08)", border: `1px solid ${finePaid ? "rgba(50,127,79,0.25)" : "rgba(234,139,51,0.25)"}` }}>
                    <div className="flex items-center gap-2">
                      <DollarSign size={14} style={{ color: finePaid ? "#2d7a4f" : "#c05a0a" }} />
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Fine</p>
                        <p className="text-[14px] font-bold" style={{ color: finePaid ? "#2d7a4f" : "#c05a0a" }}>
                          ₱{fine.toFixed(2)}
                          <span className="text-[10px] font-normal ml-1" style={{ color: "var(--text-muted)" }}>
                            ({Math.round(fine / FINE_PER_DAY)} day{Math.round(fine / FINE_PER_DAY) !== 1 ? "s" : ""} overdue)
                          </span>
                        </p>
                      </div>
                    </div>
                    {finePaid ? (
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                        style={{ background: "rgba(50,127,79,0.15)", color: "#2d7a4f" }}>
                        ✓ Paid
                      </span>
                    ) : (
                      <button
                        onClick={() => handlePayFine(detailTxn.id)}
                        className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors"
                        style={{ background: "rgba(50,127,79,0.15)", color: "#2d7a4f", border: "1px solid rgba(50,127,79,0.3)" }}
                      >
                        <CheckCircle2 size={12} /> Mark Paid
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* Actions */}
              <div className="flex gap-2 pt-1" style={{ borderTop: "1px solid var(--border-light)" }}>
                {detailTxn.status !== "Returned" && (
                  <button
                    onClick={() => { handleReturn(detailTxn.id); setDetailTxn(null); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold border-[1.5px] transition-colors"
                    style={{ background: "rgba(50,127,79,0.08)", borderColor: "rgba(50,127,79,0.3)", color: "#2d7a4f" }}
                  >
                    <CheckCircle2 size={13} /> Return
                  </button>
                )}
                {detailTxn.status !== "Returned" && (
                  <button
                    onClick={() => { setDetailTxn(null); openExtendModal(detailTxn); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold border-[1.5px] transition-colors"
                    style={{ background: "rgba(238,162,58,0.08)", borderColor: "rgba(238,162,58,0.3)", color: "#EEA23A" }}
                  >
                    <RefreshCw size={13} /> Renew
                  </button>
                )}
                <button
                  onClick={() => { setDetailTxn(null); openEditModal(detailTxn); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold border-[1.5px] transition-colors"
                  style={{ background: "rgba(50,102,127,0.08)", borderColor: "rgba(50,102,127,0.3)", color: "#32667F" }}
                >
                  <Edit2 size={13} /> Edit
                </button>
                <button
                  onClick={() => { setDetailTxn(null); setDeleteModal({ open: true, id: detailTxn.id, title: detailTxn.book_title || "" }); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold border-[1.5px] transition-colors"
                  style={{ background: "rgba(234,139,51,0.08)", borderColor: "rgba(234,139,51,0.3)", color: "#c05a0a" }}
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ────────────────────────── */}
      <ConfirmationModal
        isOpen={deleteModal.open}
        title="Delete Transaction"
        message={`Are you sure you want to delete the transaction for "${deleteModal.title}"?`}
        confirmText="Delete" cancelText="Cancel" type="danger"
        onConfirm={() => handleDelete(deleteModal.id)}
        onCancel={() => setDeleteModal({ open: false, id: null, title: "" })}
      />

      <Toast message={toast.message} type={toast.type} isVisible={toast.visible} onClose={hideToast} />
    </div>
  );
}

// ── Small reusable sub-components ─────────────────────────

function ModalShell({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      style={{ background: "rgba(10,22,34,0.6)", backdropFilter: "blur(3px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-[520px] max-h-[92vh] rounded-2xl overflow-hidden flex flex-col"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xl)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border-light)" }}>
          <div className="flex items-center gap-2">
            <BookOpen size={18} style={{ color: "var(--accent-amber)" }} />
            <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{title}</h2>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg"
            style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}>
            <X size={18} />
          </button>
        </div>
        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-4 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ label, required }) {
  return (
    <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
      {label}{required && <span className="text-orange-500 ml-0.5">*</span>}
    </label>
  );
}

function DateInput({ value, onChange, error }) {
  return (
    <div className="relative">
      <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-secondary)" }} />
      <input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full pl-9 pr-3 py-2.5 rounded-lg text-[13px] border outline-none"
        style={{ background: "var(--bg-main)", borderColor: error ? "#EA8B33" : "var(--border)", color: "var(--text-primary)" }}
      />
    </div>
  );
}

function ModalFooter({ onCancel, onConfirm, confirmLabel }) {
  return (
    <div className="flex justify-end gap-2 pt-2" style={{ borderTop: "1px solid var(--border-light)" }}>
      <button onClick={onCancel}
        className="px-4 py-2.5 rounded-lg text-[13px] font-semibold"
        style={{ background: "var(--bg-surface)", color: "var(--text-secondary)", border: "1.5px solid var(--border)" }}>
        Cancel
      </button>
      <button onClick={onConfirm}
        className="px-4 py-2.5 rounded-lg text-[13px] font-semibold text-white"
        style={{ background: "var(--accent-amber)" }}>
        {confirmLabel}
      </button>
    </div>
  );
}