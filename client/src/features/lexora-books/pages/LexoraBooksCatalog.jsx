import { useState, useEffect, useMemo, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { BookOpen, Bookmark, Search, X } from "lucide-react"
import { useAuth } from "../../../hooks/useAuth"
import {
  fetchPublicLexoraBooks,
  fetchPublicCategories,
  fetchPublicTags,
  fetchMyBookmarks,
  addBookmark,
  removeBookmark,
} from "../../../services/api/lexoraBooksApi"
import LexoraBookCard from "../components/LexoraBookCard"
import Pagination from "../../../components/books/Pagination"

const PAGE_SIZE = 12

export default function LexoraBooksCatalog() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isAuthenticated } = useAuth()
  const [books, setBooks]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState("")
  const [categories, setCategories] = useState([])
  const [tags, setTags]             = useState([])
  const [search, setSearch]         = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [tagFilter, setTagFilter]           = useState("")
  const [currentPage, setCurrentPage]       = useState(1)
  const [bookmarkedBookIds, setBookmarkedBookIds] = useState(() => new Set())
  const [bookmarkingBookIds, setBookmarkingBookIds] = useState(() => new Set())
  const [bookmarkError, setBookmarkError] = useState("")

  useEffect(() => {
    const catParam = searchParams.get("category")
    if (catParam) setCategoryFilter(catParam)
  }, [searchParams])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError("")
      try {
        const [booksRes, catsRes, tagsRes] = await Promise.all([
          fetchPublicLexoraBooks({ search, category: categoryFilter, tag: tagFilter }),
          fetchPublicCategories(),
          fetchPublicTags(),
        ])
        if (!cancelled) {
          if (booksRes.success) setBooks(booksRes.data || [])
          else setError(booksRes.error || "Could not load books")
          if (catsRes.success) setCategories(catsRes.data || [])
          else setError((current) => current || catsRes.error || "Could not load categories")
          if (tagsRes.success) setTags(tagsRes.data || [])
          else setError((current) => current || tagsRes.error || "Could not load tags")
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || "Could not connect to server")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [search, categoryFilter, tagFilter])

  useEffect(() => { setCurrentPage(1) }, [search, categoryFilter, tagFilter])

  useEffect(() => {
    let cancelled = false
    if (!isAuthenticated) {
      setBookmarkedBookIds(new Set())
      return undefined
    }
    fetchMyBookmarks()
      .then((result) => {
        if (!result.success) throw new Error(result.error || "Could not load bookmarks")
        if (!cancelled) {
          setBookmarkedBookIds(new Set(
            (result.data || [])
              .filter((bookmark) => Number(bookmark.page_number) === 1)
              .map((bookmark) => String(bookmark.book_id))
          ))
          setBookmarkError("")
        }
      })
      .catch((loadError) => {
        if (!cancelled) setBookmarkError(loadError.message || "Could not load bookmarks")
      })
    return () => { cancelled = true }
  }, [isAuthenticated])

  const handleBookmarkToggle = useCallback(async (bookId) => {
    const id = String(bookId)
    const isBookmarked = bookmarkedBookIds.has(id)
    setBookmarkingBookIds((current) => new Set(current).add(id))
    setBookmarkError("")
    try {
      const result = isBookmarked
        ? await removeBookmark(bookId, 1)
        : await addBookmark(bookId, 1)
      if (!result.success) throw new Error(result.error || "Could not update bookmark")
      setBookmarkedBookIds((current) => {
        const next = new Set(current)
        if (isBookmarked) next.delete(id)
        else next.add(id)
        return next
      })
    } catch (toggleError) {
      setBookmarkError(toggleError.message || "Could not update bookmark")
    } finally {
      setBookmarkingBookIds((current) => {
        const next = new Set(current)
        next.delete(id)
        return next
      })
    }
  }, [bookmarkedBookIds])

  const totalPages  = Math.max(1, Math.ceil(books.length / PAGE_SIZE))
  const safePage    = Math.min(currentPage, totalPages)
  const paginated   = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return books.slice(start, start + PAGE_SIZE)
  }, [books, safePage])

  const clearFilters = () => {
    setSearch("")
    setCategoryFilter("")
    setTagFilter("")
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold flex items-center gap-2.5"
            style={{ color: "var(--text-primary)" }}>
            <BookOpen size={22} style={{ color: "var(--accent-amber)" }} />
            Lexora Books
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Browse the digital book collection
          </p>
        </div>
        {isAuthenticated && (
          <button onClick={() => navigate("/lexora-books/bookmarks")}
            className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
            <Bookmark size={14} /> My Bookmarks
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search books…"
            className="w-full rounded-lg pl-9 pr-3 py-2 text-sm border outline-none"
            style={{
              background: "var(--bg-surface)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        {bookmarkError && (
          <p role="alert" className="text-xs text-red-500">{bookmarkError}</p>
        )}

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm border outline-none cursor-pointer"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-secondary)" }}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>{c.name}</option>
          ))}
        </select>

        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm border outline-none cursor-pointer"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-secondary)" }}
        >
          <option value="">All Tags</option>
          {tags.map((t) => (
            <option key={t.id} value={t.slug}>{t.name}</option>
          ))}
        </select>

        {(search || categoryFilter || tagFilter) && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium"
            style={{ color: "var(--accent-amber)" }}
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Loading books…</span>
        </div>
      ) : error ? (
        <p role="alert" className="rounded-xl border p-4 text-sm text-red-400"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>{error}</p>
      ) : paginated.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
          <BookOpen size={48} className="mb-3 opacity-20" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            No books available.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {paginated.map((book) => (
              <LexoraBookCard
                key={book.id}
                book={book}
                showBookmark={isAuthenticated}
                isBookmarked={bookmarkedBookIds.has(String(book.id))}
                isBookmarking={bookmarkingBookIds.has(String(book.id))}
                onBookmarkToggle={handleBookmarkToggle}
              />
            ))}
          </div>
          {totalPages > 1 && (
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              setCurrentPage={setCurrentPage}
            />
          )}
        </>
      )}
    </div>
  )
}
