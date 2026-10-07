import { useNavigate } from "react-router-dom"
import { BookOpen, Bookmark, Loader2 } from "lucide-react"

export default function LexoraBookCard({
  book,
  showBookmark = false,
  isBookmarked = false,
  isBookmarking = false,
  onBookmarkToggle,
}) {
  const navigate = useNavigate()

  const coverUrl = book.cover_url || book.thumbnail_url || null
  const displayTitle = book.title || "Untitled"
  const displayAuthor = book.author || ""

  return (
    <article
      className="group relative overflow-hidden rounded-xl border transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent-amber)" }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)" }}
    >
      <button
        type="button"
        onClick={() => navigate(`/lexora-books/${book.id}`)}
        aria-label={`View ${displayTitle}`}
        className="flex w-full flex-col gap-2 text-left"
      >
        <div
          className="relative aspect-[3/4] w-full overflow-hidden rounded-t-xl"
          style={{ background: "var(--bg-primary)" }}
        >
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={displayTitle}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <BookOpen size={36} style={{ color: "var(--text-muted)", opacity: 0.3 }} />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
            <span
              className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold"
              style={{
                background: book.status === "published" ? "rgba(34,197,94,0.9)" : "rgba(255,255,255,0.2)",
                color: "#fff",
              }}
            >
              {book.status === "published" ? "Published" : book.status}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-0.5 px-3 pb-3">
          <h3 className="line-clamp-2 text-[13px] font-semibold leading-tight"
            style={{ color: "var(--text-primary)" }}>
            {displayTitle}
          </h3>
          {displayAuthor && (
            <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
              {displayAuthor}
            </p>
          )}
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ background: "rgba(238,162,58,0.12)", color: "var(--accent-amber)" }}>
              {book.source_type === "pdf" ? "PDF" : "Images"}
            </span>
            {book.total_pages && (
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                {book.total_pages} pages
              </span>
            )}
          </div>
        </div>
      </button>
      {showBookmark && (
        <button
          type="button"
          onClick={() => onBookmarkToggle?.(book.id)}
          disabled={isBookmarking}
          aria-label={isBookmarked ? `Remove ${displayTitle} from bookmarks` : `Bookmark ${displayTitle}`}
          aria-pressed={isBookmarked}
          title={isBookmarked ? "Saved to bookmarks" : "Add to bookmarks"}
          className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full border shadow-md transition-colors disabled:opacity-60"
          style={{
            color: isBookmarked ? "#fff" : "var(--text-primary)",
            background: isBookmarked ? "var(--accent-amber)" : "rgba(255,255,255,0.94)",
            borderColor: isBookmarked ? "var(--accent-amber)" : "rgba(15,23,42,0.12)",
          }}
        >
          {isBookmarking
            ? <Loader2 size={16} className="animate-spin" />
            : <Bookmark size={16} fill={isBookmarked ? "currentColor" : "none"} />
          }
        </button>
      )}
    </article>
  )
}
