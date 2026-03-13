import { useState, useEffect, useMemo } from "react";
import {
  Search, X, BookOpen, User, Calendar, Phone,
  Loader2, AlertCircle, CheckCircle2, ChevronDown,
  Edit2, Trash2, RotateCcw, Plus, Filter,
} from "lucide-react";
import BorrowedTable from "../components/BorrowedTable";
import ConfirmationModal from "../components/ConfirmationModal";
import Toast from "../components/Toast";

/* ─── API base ──────────────────────────────────── */
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

/* ─── Initial sample data ───────────────────────── */
const INITIAL_TXNS = [
  { id:1, book_id:1, book_title:"Clean Code", book_author:"Robert C. Martin", borrower_name:"John Smith", borrower_contact:"555-0101", borrow_date:"2024-01-15", due_date:"2024-02-15", return_date:null, status:"Borrowed" },
  { id:2, book_id:2, book_title:"The Pragmatic Programmer", book_author:"Hunt & Thomas", borrower_name:"Jane Doe", borrower_contact:"555-0102", borrow_date:"2024-01-20", due_date:"2024-02-20", return_date:null, status:"Borrowed" },
  { id:3, book_id:3, book_title:"Design Patterns", book_author:"Gang of Four", borrower_name:"Bob Wilson", borrower_contact:"555-0103", borrow_date:"2024-01-10", due_date:"2024-02-10", return_date:"2024-02-08", status:"Returned" },
];

/* ─── Helper ────────────────────────────────────── */
function isOverdue(dueDate, status) {
  if (status === "Returned") return false;
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

function getDaysRemaining(dueDate, status) {
  if (status === "Returned") return null;
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const today = new Date();
  const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  return diff;
}

/* ─── Date formatting helper ────────────────────── */
function formatDateForDisplay(dateStr) {
  if (!dateStr) return null;
  // Handle different date formats from MySQL
  // Try to parse as YYYY-MM-DD and create a valid date
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  // Return in YYYY-MM-DD format for consistent parsing in table
  return date.toISOString().slice(0, 10);
}

/* ─── Sanitize transaction dates ────────────────── */
function sanitizeTransaction(txns) {
  return txns.map(t => ({
    ...t,
    borrow_date: formatDateForDisplay(t.borrow_date),
    due_date: formatDateForDisplay(t.due_date),
    return_date: formatDateForDisplay(t.return_date),
  }));
}

/* ─── Empty form ───────────────────────────────── */
const EMPTY_FORM = {
  book_id: "",
  borrower_name: "",
  borrower_id_number: "",
  borrower_contact: "",
  borrower_email: "",
  borrower_course: "",
  borrower_yr_level: "",
  borrow_date: "",
  due_date: "",
};

const EMPTY_BOOK = {
  id: "",
  title: "",
  author: "",
};

/* ─── Status badge colors ──────────────────────── */
const STATUS_STYLE = {
  Borrowed: { bg: "rgba(50,102,127,0.12)", color: "#32667F" },
  Returned: { bg: "rgba(50,127,79,0.12)", color: "#2d7a4f" },
};

/* ─── Gradients for book covers ───────────────── */
const GRADIENTS = [
  ["#132F45","#32667F"], ["#EEA23A","#EA8B33"], ["#32667F","#1a4a63"],
  ["#EA8B33","#F3B940"], ["#1d3f57","#32667F"], ["#b87a1a","#EEA23A"],
];

/* ══════════════════════════════════════════════ */
export default function Borrowed() {
  const [loading, setLoading] = useState(true);
  const [txns, setTxns] = useState([]);
  const [books, setBooks] = useState([]);

  // Fetch from API on mount
  useEffect(() => {
    fetchTransactions();
    fetchBooks();
  }, []);

  // Fetch transactions from MySQL
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/transactions`);
      const data = await res.json();
      if (data.success) {
        // Sanitize dates to ensure they are in valid YYYY-MM-DD format
        setTxns(sanitizeTransaction(data.data || []));
      } else {
        console.error("Failed to fetch transactions:", data.error);
        showToast("Failed to load transactions", "error");
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      showToast("Could not connect to server", "error");
    } finally {
      setLoading(false);
    }
  };

  // Fetch available books
  const fetchBooks = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/books`);
      const data = await res.json();
      if (data.success) {
        // Only show books with quantity > 0
        setBooks((data.data || []).filter(b => b.quantity > 0));
      }
    } catch (error) {
      console.error("Error fetching books:", error);
    }
  };

  /* ── State ──────────────────────────────────── */
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [ddOpen, setDdOpen] = useState(false);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedBook, setSelectedBook] = useState(EMPTY_BOOK);
  const [errors, setErrors] = useState({});

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, title: "" });

  // Toast state
  const [toast, setToast] = useState({ visible: false, message: "", type: "info" });

  const ddRef = useMemo(() => ({ current: null }), []);

  /* Close dropdown on outside click */
  useEffect(() => {
    const h = e => { if (ddRef.current && !ddRef.current.contains(e.target)) setDdOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [ddRef]);

  /* Lock scroll when modal open */
  useEffect(() => {
    document.body.style.overflow = modal ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modal]);

  /* Filtered transactions */
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return txns.filter(t => {
      if (q && !["book_title","book_author","borrower_name","borrower_contact"]
          .some(k => t[k]?.toLowerCase().includes(q))) return false;
      if (filter === "Borrowed" && t.status !== "Borrowed") return false;
      if (filter === "Returned" && t.status !== "Returned") return false;
      if (filter === "Overdue" && !isOverdue(t.due_date, t.status)) return false;
      return true;
    });
  }, [txns, query, filter]);

  /* ── Handlers ───────────────────────────────── */
  function getCurrentDate() {
    return new Date().toISOString().slice(0, 10);
  }

  function openModal(m) {
    setDdOpen(false);
    setForm({ 
      ...EMPTY_FORM, 
      book_id: m?.book_id || "", 
      borrow_date: getCurrentDate(),
      due_date: getDefaultDueDate() 
    });
    if (m?.book_id) {
      const b = books.find(bk => bk.id === m.book_id);
      if (b) setSelectedBook({ id: b.id, title: b.title, author: b.author });
    } else {
      setSelectedBook(EMPTY_BOOK);
    }
    setErrors({});
    setModal(true);
  }

  function getDefaultDueDate() {
    const d = new Date();
    d.setDate(d.getDate() + 14); // 2 weeks default
    return d.toISOString().slice(0, 10);
  }

  function validate() {
    const e = {};
    if (!form.book_id) e.book_id = "Please select a book";
    if (!form.borrower_name.trim()) e.borrower_name = "Borrower name is required";
    if (!form.due_date) e.due_date = "Due date is required";
    return e;
  }

  /* ── Save transaction (borrow book) ───────── */
  async function handleSave() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    
    try {
      const res = await fetch(`${API_BASE}/api/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      
      const result = await res.json();
      
      if (result.success) {
        // Sanitize the returned transaction dates before adding to state
        const sanitizedData = sanitizeTransaction([result.data])[0];
        setTxns(p => [sanitizedData, ...p]);
        setModal(false);
        setForm(EMPTY_FORM);
        setSelectedBook(EMPTY_BOOK);
        showToast("Book borrowed successfully!", "success");
        fetchBooks(); // Refresh available books
      } else {
        showToast(result.error || "Failed to borrow book", "error");
      }
    } catch (error) {
      console.error("Error borrowing book:", error);
      showToast("Failed to connect to server", "error");
    }
  }

  /* ── Delete transaction ─────────────────────── */
  async function handleDelete(id) {
    try {
      const res = await fetch(`${API_BASE}/api/transactions/${id}`, {
        method: "DELETE",
      });
      
      const result = await res.json();
      
      if (result.success) {
        setTxns(txns.filter(t => t.id !== id));
        showToast("Transaction deleted", "success");
        fetchBooks(); // Refresh available books
      } else {
        showToast(result.error || "Failed to delete", "error");
      }
    } catch (error) {
      console.error("Error deleting:", error);
      showToast("Failed to connect to server", "error");
    }
    setDeleteModal({ open: false, id: null, title: "" });
  }

  /* ── Return book ───────────────────────────── */
  async function handleReturn(id) {
    try {
      const res = await fetch(`${API_BASE}/api/transactions/${id}/return`, {
        method: "PUT",
      });
      
      const result = await res.json();
      
      if (result.success) {
        // Sanitize the returned transaction dates before updating state
        const sanitizedData = sanitizeTransaction([result.data])[0];
        setTxns(txns.map(t => t.id === id ? sanitizedData : t));
        showToast("Book returned successfully!", "success");
        fetchBooks(); // Refresh available books
      } else {
        showToast(result.error || "Failed to return", "error");
      }
    } catch (error) {
      console.error("Error returning:", error);
      showToast("Failed to connect to server", "error");
    }
  }

  function showToast(message, type = "info") {
    setToast({ visible: true, message, type });
  }

  function hideToast() {
    setToast(prev => ({ ...prev, visible: false }));
  }

  /* ── Render ─────────────────────────────────── */
  return (
    <div className="flex flex-col gap-5">

      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-2.5">

        {/* Row 1 — search + filter + add */}
        <div className="flex flex-wrap items-center gap-2.5 justify-between">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            {/* Search */}
            <div
              className="relative flex items-center gap-2 px-3 py-2 rounded-lg flex-1 min-w-[200px] max-w-sm"
              style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", boxShadow:"var(--shadow-sm)" }}
            >
              <Search size={14} className="shrink-0" style={{ color:"var(--text-secondary)" }} />
              <input
                className="border-none outline-none text-[13px] bg-transparent w-full"
                style={{ color:"var(--text-primary)" }}
                placeholder="Search borrower, book, contact…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="shrink-0 flex items-center justify-center w-4 h-4 rounded-full"
                  style={{ color:"var(--text-muted)" }}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Filter */}
            <div className="relative flex items-center">
              <Filter size={13} className="absolute left-2.5 pointer-events-none" style={{ color:"var(--text-secondary)" }} />
              <select
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="pl-7 pr-3 py-2 rounded-lg text-[12.5px] font-medium border outline-none appearance-none cursor-pointer"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  color: filter !== "All" ? "var(--accent-amber)" : "var(--text-secondary)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <option value="All">All</option>
                <option value="Borrowed">Borrowed</option>
                <option value="Returned">Returned</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
          </div>

          {/* Add button */}
          <div className="relative shrink-0" ref={ddRef}>
            <button
              onClick={() => setDdOpen(o => !o)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold text-white"
              style={{ background:"var(--accent-amber)", boxShadow:"0 2px 6px rgba(238,162,58,0.3)" }}
            >
              <Plus size={14} /> Borrow Book
              <ChevronDown size={14} className="transition-transform" style={{ transform: ddOpen ? "rotate(180deg)" : "" }} />
            </button>

            {ddOpen && (
              <div
                className="absolute right-0 top-[calc(100%+6px)] w-64 rounded-xl p-1.5 z-20"
                style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", boxShadow:"var(--shadow-lg)" }}
              >
                <button
                  onClick={() => openModal()}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-[13px] font-medium"
                  style={{ color:"var(--text-primary)" }}
                >
                  <Plus size={15} /> New Transaction
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Result count */}
        <p className="text-[12px]" style={{ color:"var(--text-muted)" }}>
          {filtered.length === txns.length
            ? `${txns.length} transaction${txns.length !== 1 ? "s" : ""}`
            : `${filtered.length} of ${txns.length}`}
        </p>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin" style={{ color:"var(--accent-amber)" }} />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center py-10 text-sm" style={{ color:"var(--text-secondary)" }}>
          No transactions found.
        </p>
      ) : (
        <div 
          className="rounded-xl overflow-hidden"
          style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", boxShadow:"var(--shadow-sm)" }}
        >
          <BorrowedTable
            transactions={filtered}
            onEdit={(transaction) => openModal(transaction)}
            onDelete={(id) => setDeleteModal({ open: true, id: id, title: filtered.find(t => t.id === id)?.book_title || "" })}
            onReturn={handleReturn}
            isOverdue={isOverdue}
          />
        </div>
      )}

      {/* ════════ MODAL ════════ */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
          style={{ background:"rgba(10,22,34,0.6)", backdropFilter:"blur(3px)" }}
          onClick={e => e.target === e.currentTarget && setModal(false)}
        >
          <div
            className="w-full max-w-[540px] max-h-[90vh] rounded-2xl overflow-hidden flex flex-col"
            style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", boxShadow:"var(--shadow-xl)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom:"1px solid var(--border-light)" }}>
              <div className="flex items-center gap-2">
                <BookOpen size={18} style={{ color:"var(--accent-amber)" }} />
                <h2 className="text-base font-bold" style={{ color:"var(--text-primary)" }}>Borrow Book</h2>
              </div>
              <button
                onClick={() => setModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg"
                style={{ background:"var(--bg-hover)", color:"var(--text-secondary)" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 flex flex-col gap-4 overflow-y-auto" style={{ maxHeight: "calc(90vh - 140px)" }}>
              {/* Book Select */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color:"var(--text-secondary)" }}>Select Book</label>
                <select
                  value={form.book_id}
                  onChange={e => {
                    const b = books.find(bk => bk.id === Number(e.target.value));
                    setForm(f => ({ ...f, book_id: e.target.value }));
                    setSelectedBook(b ? { id: b.id, title: b.title, author: b.author } : EMPTY_BOOK);
                    if (errors.book_id) setErrors(e => { const n = {...e}; delete n.book_id; return n; });
                  }}
                  className="px-3 py-2.5 rounded-lg text-[13px] border outline-none"
                  style={{
                    background: "var(--bg-input)",
                    borderColor: errors.book_id ? "#EA8B33" : "var(--border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="">— Choose a book —</option>
                  {books.map(b => (
                    <option key={b.id} value={b.id}>{b.title} ({b.quantity} available)</option>
                  ))}
                </select>
                {errors.book_id && <span className="text-[11px] text-orange-500">{errors.book_id}</span>}
              </div>

              {/* Selected book info */}
              {selectedBook.id && (
                <div className="p-3 rounded-lg" style={{ background:"var(--bg-subtle)", border:"1px solid var(--border)" }}>
                  <p className="text-[13px] font-semibold" style={{ color:"var(--text-primary)" }}>{selectedBook.title}</p>
                  <p className="text-[12px]" style={{ color:"var(--text-secondary)" }}>{selectedBook.author}</p>
                </div>
              )}

              {/* Student Name */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color:"var(--text-secondary)" }}>Student Name</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:"var(--text-secondary)" }} />
                  <input
                    value={form.borrower_name}
                    onChange={e => {
                      setForm(f => ({ ...f, borrower_name: e.target.value }));
                      if (errors.borrower_name) setErrors(e => { const n = {...e}; delete n.borrower_name; return n; });
                    }}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg text-[13px] border outline-none"
                    style={{
                      background: "var(--bg-input)",
                      borderColor: errors.borrower_name ? "#EA8B33" : "var(--border)",
                      color: "var(--text-primary)",
                    }}
                    placeholder="Enter student name"
                  />
                </div>
                {errors.borrower_name && <span className="text-[11px] text-orange-500">{errors.borrower_name}</span>}
              </div>

              {/* ID Number */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color:"var(--text-secondary)" }}>ID Number</label>
                <input
                  value={form.borrower_id_number}
                  onChange={e => setForm(f => ({ ...f, borrower_id_number: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg text-[13px] border outline-none"
                  style={{ background:"var(--bg-input)", borderColor:"var(--border)", color:"var(--text-primary)" }}
                  placeholder="Enter student ID number"
                />
              </div>

              {/* Contact No. & Email Row */}
              <div className="grid grid-cols-2 gap-3">
                {/* Contact No. */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color:"var(--text-secondary)" }}>Contact No.</label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:"var(--text-secondary)" }} />
                    <input
                      value={form.borrower_contact}
                      onChange={e => setForm(f => ({ ...f, borrower_contact: e.target.value }))}
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg text-[13px] border outline-none"
                      style={{ background:"var(--bg-input)", borderColor:"var(--border)", color:"var(--text-primary)" }}
                      placeholder="Phone number"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color:"var(--text-secondary)" }}>Email</label>
                  <input
                    type="email"
                    value={form.borrower_email}
                    onChange={e => setForm(f => ({ ...f, borrower_email: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-[13px] border outline-none"
                    style={{ background:"var(--bg-input)", borderColor:"var(--border)", color:"var(--text-primary)" }}
                    placeholder="student@email.com"
                  />
                </div>
              </div>

              {/* Course & Yr Level Row */}
              <div className="grid grid-cols-2 gap-3">
                {/* Course */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color:"var(--text-secondary)" }}>Course</label>
                  <input
                    value={form.borrower_course}
                    onChange={e => setForm(f => ({ ...f, borrower_course: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-[13px] border outline-none"
                    style={{ background:"var(--bg-input)", borderColor:"var(--border)", color:"var(--text-primary)" }}
                    placeholder="e.g. BS Computer Science"
                  />
                </div>

                {/* Yr Level */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color:"var(--text-secondary)" }}>Yr Level</label>
                  <select
                    value={form.borrower_yr_level}
                    onChange={e => setForm(f => ({ ...f, borrower_yr_level: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-[13px] border outline-none"
                    style={{ background:"var(--bg-input)", borderColor:"var(--border)", color:"var(--text-primary)" }}
                  >
                    <option value="">Select Year</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="5th Year">5th Year</option>
                  </select>
                </div>
              </div>

              {/* Date Borrowed (Auto-fill) & Due Date Row */}
              <div className="grid grid-cols-2 gap-3">
                {/* Date Borrowed (Auto-fill) */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color:"var(--text-secondary)" }}>Date Borrowed</label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:"var(--text-secondary)" }} />
                    <input
                      type="date"
                      value={form.borrow_date}
                      onChange={e => setForm(f => ({ ...f, borrow_date: e.target.value }))}
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg text-[13px] border outline-none"
                      style={{ background:"var(--bg-input)", borderColor:"var(--border)", color:"var(--text-primary)" }}
                    />
                  </div>
                </div>

                {/* Due Date */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color:"var(--text-secondary)" }}>Due Date</label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:"var(--text-secondary)" }} />
                    <input
                      type="date"
                      value={form.due_date}
                      onChange={e => {
                        setForm(f => ({ ...f, due_date: e.target.value }));
                        if (errors.due_date) setErrors(e => { const n = {...e}; delete n.due_date; return n; });
                      }}
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg text-[13px] border outline-none"
                      style={{
                        background: "var(--bg-input)",
                        borderColor: errors.due_date ? "#EA8B33" : "var(--border)",
                        color: "var(--text-primary)",
                      }}
                    />
                  </div>
                  {errors.due_date && <span className="text-[11px] text-orange-500">{errors.due_date}</span>}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-5 py-4" style={{ borderTop:"1px solid var(--border-light)" }}>
              <button
                onClick={() => setModal(false)}
                className="px-4 py-2.5 rounded-lg text-[13px] font-semibold"
                style={{ background:"var(--bg-surface)", color:"var(--text-secondary)", border:"1.5px solid var(--border)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2.5 rounded-lg text-[13px] font-semibold text-white"
                style={{ background:"var(--accent-amber)" }}
              >
                Save Transaction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ DELETE MODAL ════════ */}
      <ConfirmationModal
        isOpen={deleteModal.open}
        title="Delete Transaction"
        message={`Are you sure you want to delete this transaction for "${deleteModal.title}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={() => handleDelete(deleteModal.id)}
        onCancel={() => setDeleteModal({ open: false, id: null, title: "" })}
      />

      {/* ════════ TOAST ════════ */}
      <Toast message={toast.message} type={toast.type} isVisible={toast.visible} onClose={hideToast} />
    </div>
  );
}

