import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import useDebounce from "../hooks/useDebounce";
import { PackageX } from "lucide-react";
import BookTable from "../components/BookTable";
import ConfirmationModal from "../components/ConfirmationModal";
import Toast from "../components/Toast";

// New modular components
import BookToolbar from "../components/books/BookToolbar";
import BookStatusFilter from "../components/books/BookStatusFilter";
import Pagination from "../components/books/Pagination";
import BookModal from "../components/books/BookModal";

/* ─── Helper ───────────────────────────────────── */
function isOutOfStock(book) {
  return book.quantity === 0 || book.status === "OutOfStock";
}

/* ─── API base ──────────────────────────────────── */
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

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
  _mode:"manual",
};

export default function Books() {
  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState([]);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [statusFilter, setStatusFilter] = useState("All");
  const [genreFilter, setGenreFilter] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [ddOpen, setDdOpen] = useState(false);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const [selectedBook, setSelectedBook] = useState(null);
  const [modalMode, setModalMode] = useState("add"); // "add", "view", "edit"
  const [deleteModal, setDeleteModal] = useState({ open: false, bookId: null, bookTitle: "" });
  const [toast, setToast] = useState({ visible: false, message: "", type: "info" });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/books`);
      const data = await res.json();
      if (data.success) {
        setBooks(data.data || []);
      } else {
        showToast("Failed to load books from database", "error");
      }
    } catch (error) {
      showToast("Could not connect to server", "error");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = debouncedQuery.toLowerCase().trim();
    const result = books.filter(b => {
      if (q && !["title", "author", "genre", "isbn", "publisher"]
          .some(k => b[k]?.toLowerCase().includes(q))) return false;
      if (statusFilter !== "All" && statusFilter === "OutOfStock" && !isOutOfStock(b)) return false;
      if (statusFilter !== "All" && statusFilter !== "OutOfStock" && b.status !== statusFilter) return false;
      if (genreFilter && b.genre !== genreFilter) return false;
      return true;
    });
    if (sortBy === "title") result.sort((a, b) => a.title.localeCompare(b.title));
    if (sortBy === "author") result.sort((a, b) => a.author.localeCompare(b.author));
    if (sortBy === "year") result.sort((a, b) => b.year - a.year);
    return result;
  }, [books, debouncedQuery, statusFilter, genreFilter, sortBy]);

  const paginatedBooks = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [filtered, currentPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedQuery, statusFilter, genreFilter, sortBy]);

  useEffect(() => {
    document.body.style.overflow = modal ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modal]);

  useEffect(() => {
    if (form.quantity === 0 && form.status === "Available") {
      setForm(f => ({ ...f, status: "OutOfStock" }));
    }
  }, [form.quantity]);

  const genres = useMemo(
    () => [...new Set(books.map(b => b.genre))].sort(),
    [books]
  );

  const openModal = useCallback((mode = "manual") => {
    setDdOpen(false);
    setForm({ ...EMPTY_FORM, _mode: mode });
    setErrors({});
    setModal(true);
    setModalMode("add");
  }, []);

  function validate() {
    const e = {};
    if (!form.title?.trim()) e.title = "Title is required";
    if (!(form.authors || form.author)?.trim()) e.author = "Author is required";
    if (!form.genre?.trim()) e.genre = "Genre is required";
    if (!form.isbn?.trim()) e.isbn = "ISBN is required";
    if (!form.date && !form.year) e.year = "Year is required";
    if (!form.publisher?.trim()) e.publisher = "Publisher is required";
    return e;
  }

  const handleSubmit = useCallback(async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    try {
      const quantity = Number(form.quantity) || 0;
      const year = Number(form.date || form.year) || 0;
      const author = form.authors || form.author || "";
      
      const response = await fetch(`${API_BASE}/api/books`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, author, year, quantity }),
      });
      const result = await response.json();
      if (result.success) {
        setBooks(p => [...p, result.data]);
        setModal(false);
        showToast("Book added successfully!", "success");
      } else {
        showToast(result.error || "Failed to add book", "error");
      }
    } catch (error) {
      showToast("Failed to connect to server", "error");
    }
  }, [form]);

  function handleViewDetails(book) {
    setSelectedBook(book);
    setModalMode("view");
    setForm({ ...EMPTY_FORM, ...book, _mode: "manual" });
    setModal(true);
  }

  function handleEdit(book) {
    setSelectedBook(book);
    setModalMode("edit");
    setForm({ ...EMPTY_FORM, ...book, _mode: "manual" });
    setErrors({});
    setModal(true);
  }

  function handleDeleteClick(book) {
    setDeleteModal({ open: true, bookId: book.id, bookTitle: book.title });
  }

  async function confirmDelete() {
    if (deleteModal.bookId) {
      try {
        const response = await fetch(`${API_BASE}/api/books/${deleteModal.bookId}`, {
          method: "DELETE",
        });
        const result = await response.json();
        if (result.success) {
          setBooks(books.filter(b => b.id !== deleteModal.bookId));
          showToast("Book deleted successfully!", "success");
        } else {
          showToast(result.error || "Failed to delete book", "error");
        }
      } catch (error) {
        showToast("Failed to connect to server", "error");
      }
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

  const handleUpdate = useCallback(async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    try {
      const quantity = Number(form.quantity) || 0;
      const year = Number(form.date || form.year) || 0;
      const author = form.authors || form.author || "";

      const response = await fetch(`${API_BASE}/api/books/${selectedBook.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, author, year, quantity }),
      });
      const result = await response.json();
      if (result.success) {
        setBooks(books.map(b => b.id === selectedBook.id ? result.data : b));
        setModal(false);
        showToast("Book updated successfully!", "success");
      } else {
        showToast(result.error || "Failed to update book", "error");
      }
    } catch (error) {
      showToast("Failed to connect to server", "error");
    }
  }, [form, selectedBook, books]);

  function handleCloseModal() {
    setModal(false);
    setSelectedBook(null);
    setModalMode("add");
  }

  const importProps = {
    // Placeholder for import functionality (UI only)
    sampleData: [
      { title: "Sample Book 1", author: "Author A", isbn: "978-1234567890", genre: "Fiction", quantity: 5 },
      { title: "Sample Book 2", author: "Author B", isbn: "978-0987654321", genre: "Non-Fiction", quantity: 3 },
    ],
    onFileSelect: () => {},
    onStartImport: () => {},
    importStatus: "idle",
  };

  return (
    <div className="flex flex-col gap-5">
      <BookToolbar 
        query={query} 
        setQuery={setQuery}
        genreFilter={genreFilter}
        setGenreFilter={setGenreFilter}
        genres={genres}
        sortBy={sortBy}
        setSortBy={setSortBy}
        ddOpen={ddOpen}
        setDdOpen={setDdOpen}
        openModal={openModal}
      />

      <BookStatusFilter 
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        booksCount={books.length}
        filteredCount={filtered.length}
      />

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
        <BookTable 
          books={paginatedBooks} 
          onView={handleViewDetails} 
        />
      )}

      <Pagination 
        currentPage={currentPage}
        totalPages={totalPages}
        setCurrentPage={setCurrentPage}
      />

      <BookModal 
        isOpen={modal}
        onClose={handleCloseModal}
        mode={modalMode}
        addMode={form._mode}
        book={selectedBook}
        form={form}
        setForm={setForm}
        errors={errors}
        setErrors={setErrors}
        onSave={handleSubmit}
        onUpdate={handleUpdate}
        onDelete={handleDeleteClick}
        onEdit={handleEdit}
        importProps={importProps}
      />

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

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.visible}
        onClose={hideToast}
      />
    </div>
  );
}

