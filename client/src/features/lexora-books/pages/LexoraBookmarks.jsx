import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Bookmark, Loader2 } from "lucide-react"
import { fetchMyBookmarks } from "../../../services/api/lexoraBooksApi"
import { useAuth } from "../../../hooks/useAuth"

export default function LexoraBookmarks() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [bookmarks, setBookmarks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }
    let cancelled = false
    fetchMyBookmarks()
      .then((result) => {
        if (cancelled) return
        if (!result.success) throw new Error(result.error || "Could not load bookmarks")
        setBookmarks(result.data || [])
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Sign in to see your saved pages.</p>
        <button onClick={() => navigate("/login")} className="rounded-lg px-4 py-2 text-sm font-semibold"
          style={{ background: "var(--accent-amber)", color: "#fff" }}>
          Sign in
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <button onClick={() => navigate("/lexora-books")} className="flex w-fit items-center gap-2 text-sm"
        style={{ color: "var(--text-secondary)" }}>
        <ArrowLeft size={14} /> Back to Books
      </button>
      <div>
        <h1 className="flex items-center gap-2 text-[22px] font-bold" style={{ color: "var(--text-primary)" }}>
          <Bookmark size={21} style={{ color: "var(--accent-amber)" }} /> My Bookmarks
        </h1>
        <p className="mt-0.5 text-[13px]" style={{ color: "var(--text-secondary)" }}>
          Open any saved page directly in its book.
        </p>
      </div>
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin" style={{ color: "var(--accent-amber)" }} /></div>
      ) : error ? (
        <p role="alert" className="rounded-xl border p-4 text-sm text-red-400"
          style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>{error}</p>
      ) : bookmarks.length === 0 ? (
        <p className="rounded-xl border p-6 text-sm" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
          You have not saved any pages yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {bookmarks.map((bookmark) => (
            <li key={bookmark.id}>
              <button
                onClick={() => navigate(`/lexora-books/${bookmark.book_id}/read?page=${bookmark.page_number}`)}
                className="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:border-amber-500"
                style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
              >
                {(bookmark.cover_url || bookmark.thumbnail_url) ? (
                  <img src={bookmark.cover_url || bookmark.thumbnail_url} alt=""
                    className="h-14 w-11 rounded object-cover" />
                ) : (
                  <div className="flex h-14 w-11 items-center justify-center rounded"
                    style={{ background: "var(--bg-primary)", color: "var(--text-muted)" }}>
                    <Bookmark size={17} />
                  </div>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {bookmark.book_title}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Page {bookmark.page_number}</span>
                </span>
                <span className="text-xs font-medium" style={{ color: "var(--accent-amber)" }}>Open page</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
