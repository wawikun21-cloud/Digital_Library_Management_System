import { useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, BookOpen } from "lucide-react"
import { useLexoraBooks } from "../hooks/useLexoraBooks"
import LexoraBookAdminTable from "../components/LexoraBookAdminTable"
import LexoraBookFormModal from "../components/LexoraBookFormModal"
import Pagination from "../../../components/books/Pagination"
import Toast from "../../../components/Toast"
import {
  archiveLexoraBook,
  deleteLexoraBook,
  publishLexoraBook,
  restoreLexoraBook,
  unpublishLexoraBook,
} from "../../../services/api/lexoraBooksApi"
import { useAuth } from "../../../hooks/useAuth"

export default function ManageLexoraBooks() {
  const { user, hasPermissionAction } = useAuth()

  // ── Per-action permission gates (server enforces the same) ──
  const canCreate  = hasPermissionAction("manage_lexora_books", "create")
  const canEdit    = hasPermissionAction("manage_lexora_books", "edit")
  const canDelete  = hasPermissionAction("manage_lexora_books", "delete")
  const canPublish = hasPermissionAction("manage_lexora_books", "publish")
  const canArchive = hasPermissionAction("manage_lexora_books", "archive")

  const {
    books, loading, error,
    query, setQuery,
    categories, tags,
    categoryFilter, setCategoryFilter,
    tagFilter, setTagFilter,
    statusFilter, setStatusFilter,
    visibilityFilter, setVisibilityFilter,
    sourceTypeFilter, setSourceTypeFilter,
    sortBy, setSortBy,
    currentPage, totalPages, totalItems, pageSize, setPageSize, setCurrentPage,
    refreshBook, addBook, removeBook,
  } = useLexoraBooks()

  const [formOpen, setFormOpen] = useState(false)
  const [editingBook, setEditingBook] = useState(null)
  const [toast, setToast] = useState({ visible: false, message: "", type: "info" })

  const showToast = useCallback((message, type = "info") => {
    setToast({ visible: true, message, type })
  }, [])

  const handleAdd = () => {
    setEditingBook(null)
    setFormOpen(true)
  }

  const handleEdit = (book) => {
    setEditingBook(book)
    setFormOpen(true)
  }

  const handleSaved = (saved) => {
    if (editingBook) refreshBook(saved)
    else addBook(saved)
    setFormOpen(false)
    setEditingBook(null)
    showToast(editingBook ? "Book updated!" : "Book created!", "success")
  }

  const handleDeleted = (id) => {
    removeBook(id)
    showToast("Book deleted", "success")
  }

  const handleStatusChange = async (book, action, message) => {
    try {
      const result = await action(book.id)
      refreshBook(result.data)
      showToast(message, "success")
    } catch (actionError) {
      showToast(actionError.message, "error")
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this Lexora book?")) return
    try {
      await deleteLexoraBook(id)
      handleDeleted(id)
    } catch (deleteError) {
      showToast(deleteError.message, "error")
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold flex items-center gap-2.5"
            style={{ color: "var(--text-primary)" }}>
            <BookOpen size={22} style={{ color: "var(--accent-amber)" }} />
            Manage Lexora Books
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Create, edit, and publish digital books
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canCreate && (
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-opacity"
              style={{ background: "var(--accent-amber)", color: "#fff" }}
            >
              <Plus size={16} /> Add Book
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search books…"
          className="flex-1 min-w-[200px] max-w-sm rounded-lg px-3 py-2 text-sm border outline-none"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm border outline-none cursor-pointer"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-secondary)" }}
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm border outline-none cursor-pointer"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-secondary)" }}
        >
          <option value="">All Categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm border outline-none cursor-pointer"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-secondary)" }}
        >
          <option value="">All Tags</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>{tag.name}</option>
          ))}
        </select>
        <select
          value={visibilityFilter}
          onChange={(e) => setVisibilityFilter(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm border outline-none cursor-pointer"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-secondary)" }}
        >
          <option value="">All Visibility</option>
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>
        <select
          value={sourceTypeFilter}
          onChange={(e) => setSourceTypeFilter(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm border outline-none cursor-pointer"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-secondary)" }}
        >
          <option value="">All Source Types</option>
          <option value="pdf">PDF</option>
          <option value="images">Images</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm border outline-none cursor-pointer"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-secondary)" }}
        >
          <option value="">Sort: Newest</option>
          <option value="title">Title A–Z</option>
          <option value="author">Author A–Z</option>
          <option value="year">Publish year</option>
        </select>
        <span className="ml-auto text-[12px]" style={{ color: "var(--text-muted)" }}>
          {totalItems} books
        </span>
      </div>

      {/* Content */}
      {error ? (
        <div className="rounded-xl border p-4 text-sm text-red-400"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
          {error}
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Loading…</span>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-end gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
            <label htmlFor="lexora-page-size">Rows per page</label>
            <select
              id="lexora-page-size"
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              className="rounded-lg border px-2 py-1.5"
              style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-secondary)" }}
            >
              {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </div>
          <LexoraBookAdminTable
            books={books}
            onEdit={canEdit ? handleEdit : undefined}
            onDelete={canDelete ? handleDelete : undefined}
            canDelete={canDelete}
            onView={(book) => navigate(`/lexora-books/${book.id}?preview=1`)}
            onPublish={canPublish ? (book) => handleStatusChange(book, publishLexoraBook, "Book published") : undefined}
            onUnpublish={canPublish ? (book) => handleStatusChange(book, unpublishLexoraBook, "Book returned to draft") : undefined}
            onArchive={canArchive ? (book) => handleStatusChange(book, archiveLexoraBook, "Book archived") : undefined}
            onRestore={canArchive ? (book) => handleStatusChange(book, restoreLexoraBook, "Book restored to draft") : undefined}
          />
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              setCurrentPage={setCurrentPage}
            />
          )}
        </>
      )}

      {/* Form Modal */}
      <LexoraBookFormModal
        isOpen={formOpen}
        onClose={() => { setFormOpen(false); setEditingBook(null) }}
        book={editingBook}
        onSaved={handleSaved}
      />

      <Toast
        message={toast.message} type={toast.type}
        isVisible={toast.visible} onClose={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </div>
  )
}
