import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import {
  PackageX, BookOpen, X,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from "lucide-react";
import { fetchLexoraBooks } from "../services/api/booksApi";
import LexoraBookTable from "../components/LexoraBookTable";
import BookToolbar from "../components/books/BookToolbar";
import BookModal from "../components/books/BookModal";
import LexoraBookDetailModal from "../components/books/Lexorabookdetailmodal";
import Toast from "../components/Toast";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const EMPTY_FORM = {
  title: "", subtitle: "", authors: "", author: "", edition: "",
  lccn: "", isbn: "", issn: "",
  materialType: "Book", subtype: "Hardcover",
  authorName: "", authorDates: "",
  place: "", publisher: "", date: "", year: "",
  extent: "", otherDetails: "", size: "",
  genre: "", description: "", status: "Available",
  cover: null, quantity: 1,
  accessionNumber: "", callNumber: "", volume: "",
  shelf: "", pages: "", collection: "Lexora",
  _mode: "lexora",
};

export default function LexoraBooks() {
  const [loading, setLoading]             = useState(true);
  const [books, setBooks]                 = useState([]);
  const [programs, setPrograms]           = useState([]);
  const [resourceTypes, setResourceTypes] = useState([]);

  // Filters
  const [query,               setQuery]               = useState("");
  const [programFilter,       setProgramFilter]       = useState("");
  const [resourceTypeFilter,  setResourceTypeFilter]  = useState("");
  const [sortBy,              setSortBy]              = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(25);

  // BookModal (Excel import)
  const [ddOpen,    setDdOpen]    = useState(false);
  const [modal,     setModal]     = useState(false);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [errors,    setErrors]    = useState({});
  const [modalMode, setModalMode] = useState("add");

  // Detail / CRUD modal
  const [selectedBook, setSelectedBook] = useState(null);
  const [detailOpen,   setDetailOpen]   = useState(false);
  const [detailAddMode,setDetailAddMode]= useState(false); // open in "add" mode

  // Toast
  const [toast, setToast] = useState({ visible: false, message: "", type: "info" });

  const location = useLocation();

  // ── Fetch ────────────────────────────────────────────────
  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchLexoraBooks();
      if (data.success) {
        setBooks(data.data || []);
        setPrograms(data.programs || []);
        setResourceTypes(data.resourceTypes || []);
      } else {
        showToast("Failed to load Lexora books", "error");
      }
    } catch (err) {
      console.error("Failed to fetch Lexora books:", err);
      showToast("Could not connect to server", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  // ── Apply URL filter params on mount ─────────────────────
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const program      = params.get("program");
    const resourceType = params.get("resourceType");
    if (program)      setProgramFilter(program);
    if (resourceType) setResourceTypeFilter(resourceType);
  }, [location.search]);

  // ── Client-side filter + sort ────────────────────────────
  const filteredBooks = useMemo(() => {
    const q = query.toLowerCase().trim();
    let result = books.filter(b => {
      if (q && !["title", "author", "source", "subject_course"]
        .some(k => b[k]?.toString().toLowerCase().includes(q))) return false;
      if (programFilter && b.program !== programFilter) return false;
      if (resourceTypeFilter && b.resource_type !== resourceTypeFilter) return false;
      return true;
    });
    if (sortBy === "title")  result.sort((a, b) => a.title.localeCompare(b.title));
    if (sortBy === "author") result.sort((a, b) => (a.author || "").localeCompare(b.author || ""));
    if (sortBy === "year")   result.sort((a, b) => (b.year || 0) - (a.year || 0));
    return result;
  }, [books, query, programFilter, resourceTypeFilter, sortBy]);

  const hasActiveFilters = query || programFilter || resourceTypeFilter;

  useEffect(() => { setCurrentPage(1); }, [query, programFilter, resourceTypeFilter, sortBy, pageSize]);

  // ── Pagination slice ─────────────────────────────────────
  const totalPages     = Math.max(1, Math.ceil(filteredBooks.length / pageSize));
  const safePage       = Math.min(currentPage, totalPages);
  const paginatedBooks = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredBooks.slice(start, start + pageSize);
  }, [filteredBooks, safePage, pageSize]);

  // ── Toast helpers ────────────────────────────────────────
// sourcery skip: avoid-function-declarations-in-blocks
  function showToast(message, type = "info") {
    setToast({ visible: true, message, type });
  }
  function hideToast() {
    setToast(p => ({ ...p, visible: false }));
  }

  // ── BookModal (Excel import) handlers ────────────────────
  const openImportModal = useCallback((mode = "lexora") => {
    setDdOpen(false);
    setForm({ ...EMPTY_FORM, _mode: mode });
    setErrors({});
    setModal(true);
    setModalMode("add");
  }, []);

  const handleCloseImportModal = useCallback(() => {
    setModal(false);
    setModalMode("add");
  }, []);

  const handleImportComplete = useCallback(async (importedBooks) => {
    setModal(false);
    const total = importedBooks.length;
    showToast(
      `Imported ${total} title${total !== 1 ? "s" : ""} saved`,
      "success"
    );
    await fetchBooks();
  }, [fetchBooks]);

  const importProps = { onImportComplete: handleImportComplete };

  // ── Detail modal handlers ────────────────────────────────

  // Row click → view details
  function handleViewDetails(book) {
    setSelectedBook(book);
    setDetailAddMode(false);
    setDetailOpen(true);
  }

  // "Add Book (Manual)" from dropdown
  function openAddManual() {
    setDdOpen(false);
    setSelectedBook(null);
    setDetailAddMode(true);
    setDetailOpen(true);
  }

  function handleCloseDetail() {
    setDetailOpen(false);
    setSelectedBook(null);
    setDetailAddMode(false);
  }

  // Called by detail modal after successful PUT
  function handleBookEdited(updatedBook) {
    setBooks(prev => prev.map(b => b.id === updatedBook.id ? updatedBook : b));
    setSelectedBook(updatedBook);
    showToast("Book updated successfully!", "success");
  }

  // Called by detail modal after successful DELETE
  function handleBookDeleted(bookId) {
    setBooks(prev => prev.filter(b => b.id !== bookId));
    showToast("Book deleted successfully!", "success");
  }

  // Called by detail modal after successful POST
  function handleBookAdded(newBook) {
    setBooks(prev => [newBook, ...prev]);
    handleCloseDetail();
    showToast("Book added successfully!", "success");
  }

  // ── Misc ─────────────────────────────────────────────────
  function clearFilters() {
    setQuery("");
    setProgramFilter("");
    setResourceTypeFilter("");
  }

  const selectStyle = (active) => ({
    background:  "var(--bg-surface)",
    border:      "1px solid var(--border)",
    color:       active ? "var(--accent-amber)" : "var(--text-secondary)",
    boxShadow:   "var(--shadow-sm)",
    fontFamily:  "inherit",
  });

  return (
    <div className="flex flex-col gap-5">

      {/* ── Toolbar (search + program filter + dropdown) ── */}
      {/* ── Page Header ──────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 text-[22px] font-bold"
            style={{ color: "var(--text-primary)" }}>
            <BookOpen size={22} style={{ color: "var(--accent-amber)" }} />
            Lexora Books
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Manage imported Lexora collection
          </p>
        </div>
      </div>

      <BookToolbar
        query={query} setQuery={setQuery}
        genreFilter={programFilter} setGenreFilter={setProgramFilter}
        genres={programs}
        sortBy={sortBy} setSortBy={setSortBy}
        ddOpen={ddOpen} setDdOpen={setDdOpen}
        openModal={openImportModal}
        importModes={["lexora"]}
        onAddManual={openAddManual}
      />

      {/* ── Lexora filter row ── */}
      <div className="flex flex-wrap items-center gap-2">

        {/* Resource Type filter */}
        <div className="relative flex items-center">
          <BookOpen
            size={13}
            className="absolute left-2.5 pointer-events-none"
            style={{ color: "var(--text-secondary)" }}
            aria-hidden="true"
          />
          <select
            value={resourceTypeFilter}
            onChange={e => setResourceTypeFilter(e.target.value)}
            className="pl-7 pr-3 py-2 rounded-lg text-[12.5px] font-medium border outline-none appearance-none cursor-pointer transition-colors duration-150"
            style={selectStyle(resourceTypeFilter)}
            aria-label="Filter by Resource Type"
          >
            <option value="">All Types</option>
            {resourceTypes.map(rt => (
              <option key={rt} value={rt}>{rt}</option>
            ))}
          </select>
        </div>

        {/* Active filter badges */}
        {programFilter && (
          <FilterBadge label={programFilter} onClear={() => setProgramFilter("")} />
        )}
        {resourceTypeFilter && (
          <FilterBadge label={resourceTypeFilter} onClear={() => setResourceTypeFilter("")} />
        )}

        {/* Result count */}
        {!loading && (
          <span className="ml-auto text-[12px]" style={{ color: "var(--text-muted)" }}>
            {filteredBooks.length} {filteredBooks.length === 1 ? "book" : "books"}
            {hasActiveFilters ? " found" : " total"}
          </span>
        )}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Loading Lexora books…
          </span>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
        >
          <PackageX size={48} className="mb-3 opacity-20" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            No Lexora books found matching your criteria.
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 text-[13px] font-bold hover:underline"
              style={{ color: "var(--accent-amber)" }}
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <>
          <LexoraBookTable books={paginatedBooks} onView={handleViewDetails} />
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={filteredBooks.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
          />
        </>
      )}

      {/* ── Detail / CRUD modal (view → edit → delete, or add) ── */}
      <LexoraBookDetailModal
        isOpen={detailOpen}
        onClose={handleCloseDetail}
        book={selectedBook}
        addMode={detailAddMode}
        onEdit={handleBookEdited}
        onDelete={handleBookDeleted}
        onAdd={handleBookAdded}
      />

      {/* ── Excel import modal (BookModal) ── */}
      <BookModal
        isOpen={modal} onClose={handleCloseImportModal}
        mode={modalMode} addMode={form._mode}
        book={null}
        form={form}   setForm={setForm}
        errors={errors} setErrors={setErrors}
        importProps={importProps}
      />

      <Toast
        message={toast.message} type={toast.type}
        isVisible={toast.visible} onClose={hideToast}
      />
    </div>
  );
}

/* ── Pagination ─────────────────────────────────────────── */
function Pagination({ currentPage, totalPages, totalItems, pageSize, onPageChange, onPageSizeChange }) {
  const startItem = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const endItem   = Math.min(currentPage * pageSize, totalItems);

  const pages = useMemo(() => {
    const set = new Set([1, totalPages]);
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) set.add(i);
    return [...set].sort((a, b) => a - b);
  }, [currentPage, totalPages]);

  const iconBtn = "inline-flex items-center justify-center w-7 h-7 rounded-lg text-[12px] font-semibold transition-all duration-150 select-none";

// sourcery skip: avoid-function-declarations-in-blocks
  function NavBtn({ onClick, disabled, title, children }) {
    return (
      <button onClick={onClick} disabled={disabled} title={title} className={iconBtn}
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          color: disabled ? "var(--text-muted)" : "var(--text-secondary)",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.45 : 1,
        }}>
        {children}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-1"
      style={{ color: "var(--text-secondary)" }}>
      <div className="flex items-center gap-3">
        <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
          {totalItems === 0 ? "No results" : `${startItem}–${endItem} of ${totalItems}`}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[11.5px]" style={{ color: "var(--text-muted)" }}>Rows:</span>
          <select value={pageSize} onChange={e => onPageSizeChange(Number(e.target.value))}
            className="rounded-lg px-2 py-1 text-[12px] font-semibold border outline-none cursor-pointer"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontFamily: "inherit" }}>
            {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <NavBtn onClick={() => onPageChange(1)}                disabled={currentPage === 1}          title="First page"><ChevronsLeft  size={13} /></NavBtn>
          <NavBtn onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}          title="Previous page"><ChevronLeft size={13} /></NavBtn>
          {pages.map((p, i) => {
            const prev = pages[i - 1];
            return (
              <div key={p} className="flex items-center gap-1">
                {prev && p - prev > 1 && (
                  <span className="text-[11px] px-0.5" style={{ color: "var(--text-muted)" }}>…</span>
                )}
                <button onClick={() => onPageChange(p)} className={iconBtn}
                  style={{
                    background: p === currentPage ? "var(--accent-amber)" : "var(--bg-surface)",
                    border:     `1px solid ${p === currentPage ? "var(--accent-amber)" : "var(--border)"}`,
                    color:      p === currentPage ? "#fff" : "var(--text-secondary)",
                    cursor:     p === currentPage ? "default" : "pointer",
                  }}>
                  {p}
                </button>
              </div>
            );
          })}
          <NavBtn onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} title="Next page"><ChevronRight  size={13} /></NavBtn>
          <NavBtn onClick={() => onPageChange(totalPages)}      disabled={currentPage === totalPages} title="Last page"><ChevronsRight size={13} /></NavBtn>
        </div>
      )}
    </div>
  );
}

/* ── Filter badge ───────────────────────────────────────── */
function FilterBadge({ label, onClear }) {
  return (
    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] font-semibold"
      style={{ background: "rgba(238,162,58,0.12)", color: "var(--accent-amber)", border: "1px solid rgba(238,162,58,0.3)" }}>
      {label}
      <button onClick={onClear} aria-label={`Clear ${label} filter`}>
        <X size={11} />
      </button>
    </span>
  );
}