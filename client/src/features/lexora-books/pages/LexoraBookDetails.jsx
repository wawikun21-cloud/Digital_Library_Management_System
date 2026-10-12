import { useState, useEffect } from "react"
import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import { ArrowLeft, BookOpen, Bookmark, Loader2, AlertCircle, Tag, FolderOpen } from "lucide-react"
import {
  fetchLexoraBook,
  fetchLexoraBookPublic,
  fetchReadingProgress,
  fetchBookmarks,
  addBookmark,
  removeBookmark,
} from "../../../services/api/lexoraBooksApi"
import { useAuth } from "../../../hooks/useAuth"

export default function LexoraBookDetails() {
  const { bookId } = useParams()
  const navigate  = useNavigate()
  const [searchParams] = useSearchParams()
  const isPreview = searchParams.get("preview") === "1"
  const { isAuthenticated, hasPermissionAction } = useAuth()
  const canRead = hasPermissionAction("view_lexora_books", "read")
  const [book, setBook]         = useState(null)
  const [lastReadPage, setLastReadPage] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [bookmarkLoading, setBookmarkLoading] = useState(false)
  const [bookmarkSaving, setBookmarkSaving] = useState(false)
  const [bookmarkError, setBookmarkError] = useState("")

  useEffect(() => {
    if (!bookId) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = isPreview
          ? await fetchLexoraBook(bookId)
          : await fetchLexoraBookPublic(bookId)
        if (!cancelled) {
          if (res.success) {
            setBook(res.data)
            if (isAuthenticated && !isPreview) {
              const progress = await fetchReadingProgress(bookId)
              if (!cancelled && progress.success && progress.data?.page_number) {
                setLastReadPage(progress.data.page_number)
              }
            }
          } else setError(res.error || "Book not found")
        }
      } catch {
        if (!cancelled) setError("Could not connect to server")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [bookId, isPreview, isAuthenticated])

  useEffect(() => {
    if (!bookId || !isAuthenticated || isPreview) {
      setIsBookmarked(false)
      setBookmarkLoading(false)
      return undefined
    }
    let cancelled = false
    setBookmarkLoading(true)
    fetchBookmarks(bookId)
      .then((result) => {
        if (!result.success) throw new Error(result.error || "Could not load bookmarks")
        if (!cancelled) {
          setIsBookmarked((result.data || []).some((bookmark) => Number(bookmark.page_number) === 1))
          setBookmarkError("")
        }
      })
      .catch((loadError) => {
        if (!cancelled) setBookmarkError(loadError.message || "Could not load bookmark status")
      })
      .finally(() => {
        if (!cancelled) setBookmarkLoading(false)
      })
    return () => { cancelled = true }
  }, [bookId, isAuthenticated, isPreview])

  const handleBookmarkToggle = async () => {
    if (!bookId || bookmarkSaving || bookmarkLoading) return
    setBookmarkSaving(true)
    setBookmarkError("")
    try {
      const result = isBookmarked
        ? await removeBookmark(bookId, 1)
        : await addBookmark(bookId, 1)
      if (!result.success) throw new Error(result.error || "Could not update bookmark")
      setIsBookmarked(!isBookmarked)
    } catch (toggleError) {
      setBookmarkError(toggleError.message || "Could not update bookmark")
    } finally {
      setBookmarkSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--accent-amber)" }} />
      </div>
    )
  }

  if (error || !book) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <AlertCircle className="h-10 w-10" style={{ color: "var(--text-muted)" }} />
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{error || "Book not found"}</p>
        <button
          onClick={() => navigate(isPreview ? "/dashboard/lexora-books" : "/lexora-books")}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
          style={{ background: "var(--accent-amber)", color: "#fff" }}
        >
          <ArrowLeft size={14} /> Back to Books
        </button>
      </div>
    )
  }

  const coverUrl = book.cover_url || book.thumbnail_url || null
  const parsedDate = book.publish_on ? new Date(book.publish_on) : null
  const pubDate  = parsedDate && !Number.isNaN(parsedDate.getTime())
    ? parsedDate.toLocaleDateString()
    : null

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={() => navigate(isPreview ? "/dashboard/lexora-books" : "/lexora-books")}
        className="flex items-center gap-2 text-sm font-medium transition-colors w-fit"
        style={{ color: "var(--text-secondary)" }}
        onMouseEnter={(e) => e.target.style.color = "var(--accent-amber)"}
        onMouseLeave={(e) => e.target.style.color = "var(--text-secondary)"}
      >
        <ArrowLeft size={14} /> Back to Books
      </button>

      <div
        className="flex flex-col items-center gap-6 rounded-2xl border p-4 sm:p-6 md:flex-row md:items-start lg:gap-10 lg:p-8"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
      >
        {/* Cover */}
        <div className="shrink-0">
          <div
            className="mx-auto aspect-[3/4] w-56 overflow-hidden rounded-xl border shadow-xl sm:w-64 md:mx-0 lg:w-72"
            style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
          >
            {coverUrl ? (
              <img src={coverUrl} alt={book.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <BookOpen size={48} style={{ color: "var(--text-muted)", opacity: 0.3 }} />
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="flex flex-col gap-3 flex-1 min-w-0">
          {isPreview && (
            <span className="w-fit rounded-md px-2 py-1 text-[11px] font-semibold uppercase"
              style={{ background: "rgba(238,162,58,0.12)", color: "var(--accent-amber)" }}>
              Admin Preview · {book.status}
            </span>
          )}
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            {book.title}
          </h1>

          {book.author && (
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              by {book.author}
            </p>
          )}

          {book.short_description && (
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {book.short_description}
            </p>
          )}

          <div className="flex flex-wrap gap-2 mt-2">
            <span className="px-2 py-1 rounded-lg text-[11px] font-semibold"
              style={{ background: "rgba(238,162,58,0.12)", color: "var(--accent-amber)" }}>
              {book.source_type === "pdf" ? "PDF" : "Image"} book
            </span>
            {book.total_pages && (
              <span className="px-2 py-1 rounded-lg text-[11px] font-medium border"
                style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                {book.total_pages} pages
              </span>
            )}
          </div>

          {/* Bibliographic info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
            {pubDate && (
              <InfoRow label="Published On" value={pubDate} />
            )}
            {book.isbn13 && (
              <InfoRow label="ISBN 13" value={book.isbn13} />
            )}
            {book.isbn10 && (
              <InfoRow label="ISBN 10" value={book.isbn10} />
            )}
            {book.edition && (
              <InfoRow label="Edition" value={book.edition} />
            )}
            {book.dimensions && (
              <InfoRow label="Dimensions" value={book.dimensions} />
            )}
            {book.publisher && (
              <InfoRow label="Publisher" value={book.publisher} />
            )}
            {book.co_publisher && (
              <InfoRow label="Co-Publisher" value={book.co_publisher} />
            )}
            {book.translator && (
              <InfoRow label="Translator" value={book.translator} />
            )}
          </div>

          {/* Categories */}
          {book.categories?.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <FolderOpen size={13} style={{ color: "var(--text-muted)" }} />
              {book.categories.map((c) => (
                <span key={c.id} className="px-2 py-0.5 rounded-lg text-[11px] font-medium border"
                  style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                  {c.name}
                </span>
              ))}
            </div>
          )}

          {/* Tags */}
          {book.tags?.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <Tag size={13} style={{ color: "var(--text-muted)" }} />
              {book.tags.map((t) => (
                <span key={t.id} className="px-2 py-0.5 rounded-lg text-[11px] font-medium"
                  style={{ background: "rgba(238,162,58,0.08)", color: "var(--accent-amber)" }}>
                  {t.name}
                </span>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {canRead && (
              <button
                onClick={() => navigate(`/lexora-books/${book.id}/read`)}
                className="flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-opacity"
                style={{ background: "var(--accent-amber)", color: "#fff" }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
              >
                <BookOpen size={16} /> {lastReadPage ? `Continue Reading · Page ${lastReadPage}` : "Read Book"}
              </button>
            )}
            {isAuthenticated && !isPreview && (
              <button
                type="button"
                onClick={handleBookmarkToggle}
                disabled={bookmarkLoading || bookmarkSaving}
                aria-pressed={isBookmarked}
                className="flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-wait disabled:opacity-60"
                style={{
                  background: isBookmarked ? "rgba(238,162,58,0.12)" : "var(--bg-surface)",
                  borderColor: isBookmarked ? "var(--accent-amber)" : "var(--border)",
                  color: isBookmarked ? "var(--accent-amber)" : "var(--text-secondary)",
                }}
              >
                {bookmarkSaving
                  ? <Loader2 size={16} className="animate-spin" />
                  : <Bookmark size={16} fill={isBookmarked ? "currentColor" : "none"} />
                }
                {isBookmarked ? "Saved to Bookmarks" : "Add to Bookmarks"}
              </button>
            )}
          </div>
          {bookmarkError && (
            <p role="alert" className="text-xs text-red-500">{bookmarkError}</p>
          )}
          {lastReadPage && (
            <button
              onClick={() => navigate(`/lexora-books/${book.id}/read?start=beginning`)}
              className="w-fit rounded-lg border px-3 py-2 text-xs font-medium"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
            >
              Start from beginning
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium uppercase tracking-wider"
        style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      <span className="text-sm" style={{ color: "var(--text-primary)" }}>{value}</span>
    </div>
  )
}
