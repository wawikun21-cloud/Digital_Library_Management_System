import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import useDebounce from "../hooks/useDebounce";
import { PackageX } from "lucide-react";
import BookTable from "../components/BookTable";
import ConfirmationModal from "../components/ConfirmationModal";
import Toast from "../components/Toast";

import BookToolbar      from "../components/books/BookToolbar";
import BookStatusFilter from "../components/books/BookStatusFilter";
import Pagination       from "../components/books/Pagination";
import BookModal        from "../components/books/BookModal";
import FilterBadge      from "../components/FilterBadge";
import booksApi         from "../services/api/booksApi";

function isOutOfStock(book) {
  const effectiveStatus = book.display_status || book.status;
  const availCopies = book.available_copies;
  if (effectiveStatus === "OutOfStock") return true;
  if (availCopies !== undefined && availCopies !== null) return Number(availCopies) === 0;
  return book.quantity === 0;
}

// Fields that only exist in the form state and must never be sent to the server.
const FORM_ONLY_FIELDS = ["_mode", "cover"];

const EMPTY_FORM = {
  title:"", subtitle:"", authors:"", author:"", edition:"",
  lccn:"", isbn:"", issn:"",
  materialType:"Book", subtype:"Hardcover",
  authorName:"", authorDates:"",
  place:"", publisher:"", date:"", year:"",
  extent:"", otherDetails:"", size:"",
  genre:"", description:"", status:"Available",
  cover:null, quantity:1,
  accessionNumber:"", callNumber:"", volume:"",
  shelf:"", pages:"", collection:"",
  sublocation:"",
  copies: [],
  _mode:"manual",
};

/** Strip form-only keys before sending to the API */
function toApiPayload(form) {
  const payload = { ...form };
  FORM_ONLY_FIELDS.forEach(k => delete payload[k]);
  return payload;
}

export default function Books() {
  const [loading, setLoading]           = useState(true);
  const [books, setBooks]               = useState([]);
  const [query, setQuery]               = useState("");
  const debouncedQuery                  = useDebounce(query, 300);
  const [statusFilter, setStatusFilter] = useState("All");
  const [collectionFilter, setCollectionFilter] = useState("");
  const [genreFilter, setGenreFilter]   = useState("");
  const [sortBy, setSortBy]             = useState("");
  const [ddOpen, setDdOpen]             = useState(false);
  const collections = useMemo(
    () => [...new Set(books.map(b => b.collection).filter(Boolean))].sort(),
    [books]
  );
  const [modal, setModal]               = useState(false);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [errors, setErrors]             = useState({});
  const [selectedBook, setSelectedBook] = useState(null);
  const [modalMode, setModalMode]       = useState("add");
  const [deleteModal, setDeleteModal]   = useState({ open:false, bookId:null, bookTitle:"" });
  const [toast, setToast]               = useState({ visible:false, message:"", type:"info" });
  const [currentPage, setCurrentPage]   = useState(1);
  const itemsPerPage = 10;

  const location = useLocation();

  useEffect(() => { fetchBooks(); }, []);

  // ── Apply URL filter param on mount (e.g. ?status=OutOfStock) ──
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const s = params.get("status");
    if (s) setStatusFilter(s);
  }, [location.search]);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const data = await booksApi.fetchBooks();
      if (data.success) setBooks(data.data || []);
      else showToast("Failed to load books from database", "error");
    } catch {
      showToast("Could not connect to server", "error");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = debouncedQuery.toLowerCase().trim();
    const result = books.filter(b => {
      if (q && !["title","author","genre","isbn","publisher","accessionNumber","accession_list","collection"]
          .some(k => b[k]?.toString().toLowerCase().includes(q))) return false;
      if (statusFilter !== "All" && statusFilter === "OutOfStock" && !isOutOfStock(b)) return false;
      if (statusFilter !== "All" && statusFilter !== "OutOfStock" && (b.display_status || b.status) !== statusFilter) return false;
    if (genreFilter && b.genre !== genreFilter) return false;
    if (collectionFilter === "__NULL__") {
      return !b.collection || b.collection.trim() === "";
    } else if (collectionFilter && b.collection !== collectionFilter) {
      return false;
    }
    return true;
  });
    if (sortBy === "title")  result.sort((a,b) => a.title.localeCompare(b.title));
    if (sortBy === "author") result.sort((a,b) => (a.author||"").localeCompare(b.author||""));
    if (sortBy === "year")   result.sort((a,b) => (b.year || 0) - (a.year || 0));
    return result;
}, [books, debouncedQuery, statusFilter, genreFilter, collectionFilter, sortBy]);

  const paginatedBooks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [debouncedQuery, statusFilter, genreFilter, collectionFilter, sortBy]);

  useEffect(() => {
    document.body.style.overflow = modal ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modal]);

  useEffect(() => {
    if (form.quantity === 0 && form.status === "Available") {
      setForm(f => ({ ...f, status:"OutOfStock" }));
    }
  }, [form.quantity]);

  const genres = useMemo(
    () => [...new Set(books.map(b => b.genre).filter(Boolean))].sort(),
    [books]
  );

  const openModal = useCallback(async (mode = "manual") => {
    setDdOpen(false);
    if (modalMode === "edit" && selectedBook) {
      try {
        const copyResult = await booksApi.fetchBookCopies(selectedBook.id);
        if (copyResult.success) {
          const bookData = { ...EMPTY_FORM, ...selectedBook, _mode: mode, copies: copyResult.data || [] };
          setForm(bookData);
        } else {
          setForm({ ...EMPTY_FORM, ...selectedBook, _mode: mode, copies: [] });
        }
      } catch {
        setForm({ ...EMPTY_FORM, ...selectedBook, _mode: mode, copies: [] });
      }
    } else {
      setForm({ ...EMPTY_FORM, _mode: mode });
    }
    setErrors({});
    setModal(true);
    setModalMode(modalMode === "edit" ? "edit" : "add");
  }, [selectedBook, modalMode]);

// sourcery skip: avoid-function-declarations-in-blocks
  function validate() {
    const e = {};
    if (!form.title?.trim()) e.title = "Title is required";

    // ── Accession number uniqueness (within this form) ──────────────────────
    const copies = Array.isArray(form.copies) ? form.copies : [];
    const seen = {};
    copies.forEach((c, i) => {
      const val = c.accession_number?.trim().toLowerCase();
      if (!val) return;
      if (seen[val] !== undefined) {
        e[`copies[${seen[val]}].accession_number`] = "Duplicate accession number";
        e[`copies[${i}].accession_number`]         = "Duplicate accession number";
      } else {
        seen[val] = i;
      }
    });

    return e;
  }

const handleSubmit = useCallback(async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    try {
      const result = await booksApi.createBook(form);
      if (result.success) {
        setBooks(p => [result.data, ...p]);
        setModal(false);
        showToast("Book added successfully!", "success");
        fetchBooks();
      } else {
        showToast(result.error || "Failed to add book", "error");
      }
    } catch {
      showToast("Failed to connect to server", "error");
    }
  }, [form]);

  // ── Import complete: do a fresh fetch so copy counts are accurate ──
  const handleImportComplete = useCallback(async (importedBooks) => {
    setModal(false);
    const total = importedBooks.length;
    const totalCopies = importedBooks.reduce((s,b) => s + (b.copies?.length ?? 0), 0);
    showToast(
      `Imported ${total} title${total!==1?"s":""} · ${totalCopies} cop${totalCopies!==1?"ies":"y"} saved`,
      "success"
    );
    await fetchBooks();
  }, []);

  function handleViewDetails(book) {
    setSelectedBook(book);
    setModalMode("view");
    setForm({ ...EMPTY_FORM, ...book, _mode:"manual" });
    setModal(true);
  }

  async function handleEdit(book) {
    setSelectedBook(book);
    setModalMode("edit");
    try {
      const copyResult = await booksApi.fetchBookCopies(book.id);
      if (copyResult.success) {
        setForm({ ...EMPTY_FORM, ...book, _mode:"manual", copies: copyResult.data || [] });
      } else {
        setForm({ ...EMPTY_FORM, ...book, _mode:"manual", copies: [] });
      }
    } catch {
      setForm({ ...EMPTY_FORM, ...book, _mode:"manual", copies: [] });
    }
    setErrors({});
    setModal(true);
  }

  function handleDeleteClick(book) {
    setDeleteModal({ open:true, bookId:book.id, bookTitle:book.title });
  }

  // ── SOFT DELETE: sets deleted_at on the server, logs to trash_log ──
  async function confirmDelete() {
    if (!deleteModal.bookId) return;
    try {
      const result = await booksApi.deleteBook(deleteModal.bookId);
      if (result.success) {
        // Remove from local list — soft-deleted books won't appear in /api/books
        setBooks(prev => prev.filter(b => b.id !== deleteModal.bookId));
        setModal(false);
        setDeleteModal({ open:false, bookId:null, bookTitle:"" });
        showToast("Book moved to Recently Deleted.", "success");
      } else {
        showToast(result.error || "Failed to delete book", "error");
      }
    } catch {
      showToast("Failed to connect to server", "error");
    }
  }

  function cancelDelete() {
    setDeleteModal({ open:false, bookId:null, bookTitle:"" });
  }

  function showToast(message, type="info") {
    setToast({ visible:true, message, type });
  }

  function hideToast() {
    setToast(p => ({ ...p, visible:false }));
  }

  const handleUpdate = useCallback(async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    try {
      const result = await booksApi.updateBook(selectedBook.id, form);
      if (result.success) {
        setBooks(books.map(b => b.id === selectedBook.id ? result.data : b));
        setModal(false);
        showToast("Book updated successfully!", "success");
        fetchBooks();
      } else {
        showToast(result.error || "Failed to update book", "error");
      }
    } catch {
      showToast("Failed to connect to server", "error");
    }
  }, [form, selectedBook, books]);

  function handleCloseModal() {
    setModal(false);
    setSelectedBook(null);
    setModalMode("add");
  }

  const importProps = { onImportComplete: handleImportComplete };

  return (
    <div className="flex flex-col gap-5">
      
      {/* ── Page Header ──────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 text-[22px] font-bold"
            style={{ color: "var(--text-primary)" }}>
            <PackageX size={22} style={{ color: "var(--accent-amber)" }} />
            Books
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Manage library catalog, copies, and availability
          </p>
        </div>


      </div>

      <BookToolbar
        query={query}           setQuery={setQuery}
        genreFilter={collectionFilter} setGenreFilter={setCollectionFilter}
        genres={collections}
        sortBy={sortBy}         setSortBy={setSortBy}
        ddOpen={ddOpen}         setDdOpen={setDdOpen}
        openModal={openModal}
        importModes={["manual", "import"]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <BookStatusFilter
          statusFilter={statusFilter} setStatusFilter={setStatusFilter}
          booksCount={books.length}   filteredCount={filtered.length}
        />
        {collectionFilter && collectionFilter !== "__NULL__" && (
          <FilterBadge label={collectionFilter === "__NULL__" ? "Uncategorized" : collectionFilter} onClear={() => setCollectionFilter("")} />
        )}
        {collectionFilter === "__NULL__" && (
          <FilterBadge label="Uncategorized" onClear={() => setCollectionFilter("")} />
        )}
        {genreFilter && (
          <FilterBadge label={genreFilter} onClear={() => setGenreFilter("")} placeholder="Genre" />
        )}
        <span className="ml-auto text-[12px]" style={{ color: "var(--text-muted)" }}>
          {filtered.length} {filtered.length === 1 ? "book" : "books"}
          { (query || statusFilter !== "All" || collectionFilter || genreFilter) ? " found" : " total"}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-surface rounded-2xl border border-dashed border-border">
          <PackageX size={48} className="text-muted mb-3 opacity-20" />
          <p className="text-sm font-medium text-secondary">No books found matching your criteria.</p>
          <button
            onClick={() => { setQuery(""); setStatusFilter("All"); setGenreFilter(""); }}
            className="mt-4 text-[13px] font-bold text-amber-600 hover:underline"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <BookTable books={paginatedBooks} onView={handleViewDetails} />
      )}

      <Pagination
        currentPage={currentPage} totalPages={totalPages}
        setCurrentPage={setCurrentPage}
      />

      <BookModal
        isOpen={modal}         onClose={handleCloseModal}
        mode={modalMode}       addMode={form._mode}
        book={selectedBook}
        bookId={selectedBook?.id ?? null}
        form={form}            setForm={setForm}
        errors={errors}        setErrors={setErrors}
        onSave={handleSubmit}  onUpdate={handleUpdate}
        onDelete={handleDeleteClick} onEdit={handleEdit}
        importProps={importProps}
      />

      {/* ── Soft-delete confirmation ── */}
      <ConfirmationModal
        isOpen={deleteModal.open}
        title="Move to Trash"
        message={`Move "${deleteModal.bookTitle}" to Recently Deleted? It can be restored within 30 days.`}
        confirmText="Move to Trash"
        cancelText="Cancel"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      <Toast
        message={toast.message} type={toast.type}
        isVisible={toast.visible} onClose={hideToast}
      />
    </div>
  );
}