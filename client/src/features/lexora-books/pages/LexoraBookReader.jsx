import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react"
import FlipbookReader, { FlipbookBookmark } from "../flipbook"
import {
  fetchLexoraBookReader,
  addBookmark,
  removeBookmark,
  saveReadingProgress,
} from "../../../services/api/lexoraBooksApi"
import { useAuth } from "../../../hooks/useAuth"

const MODE_3D = "3d"
const MODE_CSS   = "css"

// Fast flipping must not write one row per page: the latest page is held
// and flushed after a short idle, on tab hide, and on unmount.
const PROGRESS_SAVE_DEBOUNCE_MS = 1500

function parseTableOfContents(value) {
  if (typeof value === "string") {
    try {
      value = JSON.parse(value)
    } catch {
      console.error("Could not parse saved book table of contents")
      return []
    }
  }
  if (!Array.isArray(value)) return []
  return value.filter((entry) =>
    entry && typeof entry.title === "string" && Number.isSafeInteger(Number(entry.page_number)) &&
    Number(entry.page_number) > 0)
}

export default function LexoraBookReader() {
  const { bookId } = useParams()
  const navigate  = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, hasPermissionAction } = useAuth()
  const canRead = hasPermissionAction("view_lexora_books", "read")
  const requestedPage = Number(searchParams.get("page"))
  const startAtBeginning = searchParams.get("start") === "beginning"

  const [book, setBook]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [mode, setMode]             = useState(MODE_3D)
  const [currentPage, setCurrentPage] = useState(0)
  const [bookmarks, setBookmarks]   = useState([])
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [savingProgress, setSavingProgress] = useState(false)
  const [readerActionError, setReaderActionError] = useState("")

  const isAuthenticated = !!user

  // ── Reading progress (debounced, flushed on idle/unmount/tab hide) ──
  const pendingPageRef = useRef(null)
  const saveTimerRef   = useRef(null)
  const savingRef      = useRef(false)

  const flushProgress = useCallback(async () => {
    const page = pendingPageRef.current;
    if (page == null || savingRef.current) return;
    pendingPageRef.current = null;
    savingRef.current = true;
    setSavingProgress(true);
    try {
      const result = await saveReadingProgress(bookId, page);
      if (!result.success) throw new Error(result.error || "Could not save reading progress");
      setReaderActionError("");
    } catch (saveError) {
      setReaderActionError(saveError.message);
    } finally {
      savingRef.current = false;
      setSavingProgress(false);
    }
  }, [bookId]);

  const scheduleProgressSave = useCallback((pageNumber) => {
    pendingPageRef.current = pageNumber;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { void flushProgress(); }, PROGRESS_SAVE_DEBOUNCE_MS);
  }, [flushProgress]);

  // Never lose the last page: flush on unmount and when the tab is hidden.
  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (pendingPageRef.current != null) void flushProgress();
  }, [flushProgress]);

  useEffect(() => {
    const onHide = () => { if (pendingPageRef.current != null) void flushProgress(); };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [flushProgress]);

  useEffect(() => {
    if (!bookId) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const data = await fetchLexoraBookReader(bookId)

        if (cancelled) return

        if (!data.success) {
          setError(data.error || "Failed to load book")
          return
        }

        const bookData = data.data
        setBook(bookData)
        setBookmarks(bookData.bookmarks || [])
        if (Number.isSafeInteger(requestedPage) && requestedPage > 0) {
          setCurrentPage(requestedPage - 1)
        } else if (!startAtBeginning && bookData.reading_progress?.page_number != null) {
          setCurrentPage(Math.max(0, bookData.reading_progress.page_number - 1))
        }
      } catch {
        if (!cancelled) {
          setError("Could not connect to server")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [bookId, isAuthenticated, canRead, requestedPage, startAtBeginning])

  // The server enforces view_lexora_books:read on the reader payload; this
  // keeps the UI from rendering a book the user may not open.
  if (!loading && !canRead) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3"
        style={{ background: "var(--bg-main)", color: "var(--text-secondary)" }}>
        <AlertCircle size={28} />
        <p className="text-sm">You do not have access to this book.</p>
        <button
          onClick={() => navigate("/lexora-books")}
          className="rounded-lg border px-3 py-2 text-xs font-medium"
          style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
        >
          Back to catalog
        </button>
      </div>
    )
  }

  const sourcePages = useMemo(() => {
    if (!book) return []
    if (book.source_type === "images" && book.pages?.length) {
      return book.pages.map((p) => ({ src: p.image_url, thumb: p.image_url, pageId: p.id }))
    }
    return []
  }, [book])

  const pdfUrl = book?.source_type === "pdf" ? book.pdf_url : null

  const tableOfContent = useMemo(() => {
    if (!book) return []
    const entries = parseTableOfContents(book.table_of_contents)
    if (entries.length) {
      return entries.map((entry) => ({
        title: entry.title,
        page: Number(entry.page_number) - 1,
      }))
    }
    if (book.source_type !== "images") return []
    return book.pages?.map((p, i) => ({ title: `Page ${i + 1}`, page: i })) || []
  }, [book])

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page)
    if (isAuthenticated && bookId) scheduleProgressSave(page + 1)
  }, [isAuthenticated, bookId, scheduleProgressSave])

  const handleReady = useCallback(() => {
    // Flipbook ready
  }, [])

  const handleBookmarkToggle = useCallback(async () => {
    if (!isAuthenticated || !bookId) return
    const targetPage = currentPage + 1
    const exists = bookmarks.some((bm) => bm.page_number === targetPage)

    try {
      setReaderActionError("")
      if (exists) {
        const result = await removeBookmark(bookId, targetPage)
        if (!result.success) throw new Error(result.error || "Could not remove bookmark")
        setBookmarks((prev) => prev.filter((bm) => bm.page_number !== targetPage))
        setIsBookmarked(false)
      } else {
        const result = await addBookmark(bookId, targetPage)
        if (!result.success) throw new Error(result.error || "Could not save bookmark")
        setBookmarks((prev) => [...prev, result.data].filter(Boolean))
        setIsBookmarked(true)
      }
    } catch (bookmarkError) {
      setReaderActionError(bookmarkError.message)
    }
  }, [isAuthenticated, bookId, currentPage, bookmarks])

  useEffect(() => {
    const exists = bookmarks.some((bm) => bm.page_number === currentPage + 1)
    setIsBookmarked(exists)
  }, [currentPage, bookmarks])

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
          onClick={() => navigate("/lexora-books")}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
          style={{ background: "var(--accent-amber)", color: "#fff" }}
        >
          <ArrowLeft size={14} /> Back to Books
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* Reader header */}
      <div
        className="flex items-center justify-between gap-3 border-b px-4 py-3"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border)", flexShrink: 0 }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/lexora-books/${bookId}`)}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) => e.target.style.background = "var(--bg-hover)"}
            onMouseLeave={(e) => e.target.style.background = "transparent"}
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {book.title}
            </h2>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {book.source_type === "pdf" ? "PDF" : "Image"} book
              {savingProgress && " · Saving…"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated && bookmarks.length > 0 && (
            <select
              aria-label="Open a saved bookmark"
              value=""
              onChange={(event) => {
                const page = Number(event.target.value)
                if (page > 0) setCurrentPage(page - 1)
              }}
              className="max-w-36 rounded-lg border px-2 py-1.5 text-[11px]"
              style={{
                background: "var(--bg-surface)",
                borderColor: "var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              <option value="">Bookmarks ({bookmarks.length})</option>
              {bookmarks.map((bookmark) => (
                <option key={bookmark.id} value={bookmark.page_number}>
                  Page {bookmark.page_number}
                </option>
              ))}
            </select>
          )}
          {isAuthenticated && (
            <FlipbookBookmark
              isBookmarked={isBookmarked}
              onToggle={handleBookmarkToggle}
            />
          )}
          <button
            onClick={() => setMode((m) => m === MODE_3D ? MODE_CSS : MODE_3D)}
            className="rounded-lg px-3 py-1.5 text-[11px] font-medium border"
            style={{
              background: "var(--bg-surface)",
              borderColor: "var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            {mode === MODE_3D ? "CSS Mode" : "3D Mode"}
          </button>
        </div>
      </div>

      {readerActionError && (
        <p role="alert" className="border-b px-4 py-2 text-xs text-red-500"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
          {readerActionError}
        </p>
      )}

      {/* Flipbook */}
      <div className="min-h-0 flex-1" style={{ background: "var(--bg-primary)" }}>
        <FlipbookReader
          pdfUrl={pdfUrl}
          pages={sourcePages}
          mode={mode}
          viewMode="double"
          sound
          tableOfContent={tableOfContent}
          onPageChange={handlePageChange}
          currentPage={currentPage}
          onReady={handleReady}
          flipSpeed={0.6}
          showToolbar
          defaultZoom={1}
          maxZoom={3}
          minZoom={0.5}
          className="h-full"
        />
      </div>
    </div>
  )
}
