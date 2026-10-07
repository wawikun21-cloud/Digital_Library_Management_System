import { useState } from "react"
import { Archive, Eye, Edit, Globe, RotateCcw, Send, Trash2 } from "lucide-react"

export default function LexoraBookAdminTable({
  books,
  onEdit,
  onDelete,
  onView,
  onPublish,
  onUnpublish,
  onArchive,
  onRestore,
  canDelete = false,
}) {
  const [openMenu, setOpenMenu] = useState(null)

  return (
    <div className="overflow-x-auto rounded-xl border"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
      <table className="w-full text-left text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}>Book</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}>Type</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}>Categories / Tags</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}>Status</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}>Visibility</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}>Pages</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-right"
              style={{ color: "var(--text-muted)" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {books.map((book) => {
            const coverUrl = book.cover_url || book.thumbnail_url
            return (
              <tr key={book.id}
                className="transition-colors"
                style={{ borderBottom: "1px solid var(--border)" }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-7 rounded overflow-hidden shrink-0"
                      style={{ background: "var(--bg-primary)" }}>
                      {coverUrl ? (
                        <img src={coverUrl} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate max-w-[200px]"
                        style={{ color: "var(--text-primary)" }}>
                        {book.title}
                      </p>
                      {book.author && (
                        <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                          {book.author}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-lg text-[11px] font-medium"
                    style={{ background: "rgba(238,162,58,0.12)", color: "var(--accent-amber)" }}>
                    {book.source_type === "pdf" ? "PDF" : book.source_type === "images" ? "Images" : "—"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                  {[book.category_names, book.tag_names].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={book.status} />
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs capitalize"
                    style={{ color: book.visibility === "public" ? "#22c55e" : "var(--text-muted)" }}>
                    {book.visibility}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                  {book.total_pages || "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onView?.(book)}
                      title="Preview"
                      className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                      style={{ color: "var(--text-muted)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-primary)" }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)" }}
                    >
                      <Eye size={14} />
                    </button>
                    {book.status === "draft" && (
                      <ActionButton title="Publish" onClick={() => onPublish?.(book)} color="#22c55e">
                        <Send size={14} />
                      </ActionButton>
                    )}
                    {book.status === "published" && (
                      <>
                        <ActionButton title="Unpublish" onClick={() => onUnpublish?.(book)} color="var(--accent-amber)">
                          <Globe size={14} />
                        </ActionButton>
                        <ActionButton title="Archive" onClick={() => onArchive?.(book)} color="#ef4444">
                          <Archive size={14} />
                        </ActionButton>
                      </>
                    )}
                    {book.status === "archived" && (
                      <ActionButton title="Restore to draft" onClick={() => onRestore?.(book)} color="var(--accent-amber)">
                        <RotateCcw size={14} />
                      </ActionButton>
                    )}
                    <button
                      onClick={() => onEdit(book)}
                      title="Edit"
                      className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                      style={{ color: "var(--text-muted)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--accent-amber)" }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)" }}
                    >
                      <Edit size={14} />
                    </button>
                    {canDelete && (
                      <ActionButton title="Delete" onClick={() => onDelete?.(book.id)} color="#ef4444">
                        <Trash2 size={14} />
                      </ActionButton>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
          {books.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-12 text-center text-sm"
                style={{ color: "var(--text-muted)" }}>
                No books found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function ActionButton({ title, onClick, color, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
      style={{ color }}
      onMouseEnter={(event) => { event.currentTarget.style.background = "var(--bg-hover)" }}
      onMouseLeave={(event) => { event.currentTarget.style.background = "transparent" }}
    >
      {children}
    </button>
  )
}

function StatusBadge({ status }) {
  const colors = {
    draft:     { bg: "rgba(255,255,255,0.08)", color: "var(--text-muted)" },
    published: { bg: "rgba(34,197,94,0.15)",   color: "#22c55e" },
    archived:  { bg: "rgba(239,68,68,0.12)",   color: "#ef4444" },
  }
  const c = colors[status] || colors.draft
  return (
    <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold capitalize"
      style={{ background: c.bg, color: c.color }}>
      {status}
    </span>
  )
}
