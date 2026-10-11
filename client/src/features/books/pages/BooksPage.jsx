/**
 * features/books/pages/BooksPage.jsx
 *
 * Books catalog — composition only.
 *
 * Data lives in useBooksCatalog (fetch + mutations), useBookFilters
 * (query/status/collection/genre/sort + pagination) and useBookForm
 * (modal lifecycle + create/update); real-time sync lives in
 * useBookRealtime. This page holds only the toolbar dropdown state, the
 * toast, and the URL-param effect. Replaces the former pages/Books.jsx.
 */

import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import { PackageX } from "lucide-react";
import Pagination from "../../../components/books/Pagination";
import ConfirmationModal from "../../../components/ConfirmationModal";
import Toast from "../../../components/Toast";
import { useBooksCatalog } from "../hooks/useBooksCatalog";
import { useBookFilters } from "../hooks/useBookFilters";
import { useBookForm } from "../hooks/useBookForm";
import { useBookRealtime } from "../hooks/useBookRealtime";
import BooksEmptyState from "../components/BooksEmptyState";
import BookToolbar from "../components/books/BookToolbar";
import BookStatusFilter from "../components/books/BookStatusFilter";
import BookTable from "../components/BookTable";
import FilterBadge from "../components/FilterBadge";
import BookModal from "../components/books/BookModal";

export default function BooksPage() {
  const location = useLocation();

  const [ddOpen, setDdOpen] = useState(false);
  const [toast, setToast]   = useState({ visible: false, message: "", type: "info" });
  const showToast = useCallback((message, type = "info") => {
    setToast({ visible: true, message, type });
  }, []);
  const hideToast = useCallback(() => setToast(p => ({ ...p, visible: false })), []);

  // ── Per-action permission gates (server enforces the same) ──
  const { hasPermissionAction } = useAuth();
  const canCreate        = hasPermissionAction("manage_books", "create");
  const canEdit          = hasPermissionAction("manage_books", "edit");
  const canDelete        = hasPermissionAction("manage_books", "delete");
  const canImport        = hasPermissionAction("manage_books", "import");
  const canImportLexora  = hasPermissionAction("manage_lexora_books", "import");

  const catalog = useBooksCatalog({ showToast });
  const filters = useBookFilters(catalog.books);
  const bookForm = useBookForm({
    showToast,
    onCreated: catalog.prependBook,
    onUpdated: catalog.replaceBook,
    onSaved:   catalog.fetchBooks,
  });

  useBookRealtime({ fetchBooks: catalog.fetchBooks, removeBookById: catalog.removeBookById });

  useEffect(() => { catalog.fetchBooks(); }, [catalog.fetchBooks]);

  // ── Apply URL filter param on mount (e.g. ?status=OutOfStock) ──
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const s = params.get("status");
    if (s) filters.setStatusFilter(s);
  }, [location.search]); // eslint-disable-line react-hooks/exhaustive-deps

  const openFromToolbar = useCallback((mode = "manual") => {
    setDdOpen(false);
    bookForm.openAdd(mode);
  }, [bookForm]);

  const importProps = { onImportComplete: bookForm.handleImportComplete };

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
        query={filters.query}                 setQuery={filters.setQuery}
        genreFilter={filters.collectionFilter} setGenreFilter={filters.setCollectionFilter}
        genres={filters.collections}
        sortBy={filters.sortBy}               setSortBy={filters.setSortBy}
        ddOpen={ddOpen}                       setDdOpen={setDdOpen}
        openModal={openFromToolbar}
        // "manual" = create a book, "import" = Excel import, "lexora" = Lexora import.
        // The server enforces the same permission on each endpoint.
        importModes={[
          ...(canCreate ? ["manual"] : []),
          ...(canImport ? ["import"] : []),
          ...(canImportLexora ? ["lexora"] : []),
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <BookStatusFilter
          statusFilter={filters.statusFilter} setStatusFilter={filters.setStatusFilter}
          booksCount={catalog.books.length}   filteredCount={filters.filtered.length}
        />
        {filters.collectionFilter && filters.collectionFilter !== "__NULL__" && (
          <FilterBadge label={filters.collectionFilter} onClear={() => filters.setCollectionFilter("")} />
        )}
        {filters.collectionFilter === "__NULL__" && (
          <FilterBadge label="Uncategorized" onClear={() => filters.setCollectionFilter("")} />
        )}
        {filters.genreFilter && (
          <FilterBadge label={filters.genreFilter} onClear={() => filters.setGenreFilter("")} placeholder="Genre" />
        )}
        <span className="ml-auto text-[12px]" style={{ color: "var(--text-muted)" }}>
          {filters.filtered.length} {filters.filtered.length === 1 ? "book" : "books"}
          {filters.hasActiveFilters ? " found" : " total"}
        </span>
      </div>

      {filters.filtered.length === 0 ? (
        <BooksEmptyState onClearFilters={filters.clearFilters} />
      ) : (
        <BookTable books={filters.paginatedBooks} onView={bookForm.openView} />
      )}

      <Pagination
        currentPage={filters.currentPage} totalPages={filters.totalPages}
        setCurrentPage={filters.setCurrentPage}
      />

      <BookModal
        isOpen={bookForm.modal}       onClose={bookForm.closeModal}
        mode={bookForm.modalMode}     addMode={bookForm.form._mode}
        book={bookForm.selectedBook}
        bookId={bookForm.selectedBook?.id ?? null}
        form={bookForm.form}          setForm={bookForm.setForm}
        errors={bookForm.errors}      setErrors={bookForm.setErrors}
        onSave={bookForm.submit}      onUpdate={canEdit ? bookForm.update : undefined}
        onDelete={canDelete ? catalog.requestDelete : undefined} onEdit={canEdit ? bookForm.openEdit : undefined}
        importProps={importProps}
      />

      {/* ── Soft-delete confirmation ── */}
      <ConfirmationModal
        isOpen={catalog.deleteModal.open}
        title="Move to Trash"
        message={`Move "${catalog.deleteModal.bookTitle}" to Recently Deleted? It can be restored within 30 days.`}
        confirmText="Move to Trash"
        cancelText="Cancel"
        type="danger"
        onConfirm={() => catalog.confirmDelete(bookForm.closeModal)}
        onCancel={catalog.cancelDelete}
      />

      <Toast
        message={toast.message} type={toast.type}
        isVisible={toast.visible} onClose={hideToast}
      />
    </div>
  );
}
