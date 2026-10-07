import { useState, useEffect, useCallback } from "react"
import {
  fetchBookmarks as fetchBookmarksAPI,
  addBookmark as addBookmarkAPI,
  removeBookmark as removeBookmarkAPI,
} from "../../../services/api/lexoraBooksApi"
  const [bookmarks, setBookmarks] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  const fetchBookmarks = useCallback(async () => {
    if (!bookId) return
    try {
      setLoading(true)
      const result = await fetchBookmarksAPI(bookId)
      if (result.success) setBookmarks(result.data || [])
      else setError(result.error)
    } catch {
      setError("Failed to load bookmarks")
    } finally {
      setLoading(false)
    }
  }, [bookId])

  useEffect(() => { fetchBookmarks() }, [fetchBookmarks])

  const addBookmark = useCallback(async (pageNumber) => {
    if (!bookId) return null
    try {
      const result = await addBookmarkAPI(bookId, pageNumber)
      if (result.success) {
        setBookmarks((prev) => [...prev, result.data].filter(Boolean))
        return result.data
      }
      return null
    } catch {
      return null
    }
  }, [bookId])

  const removeBookmark = useCallback(async (pageNumber) => {
    if (!bookId) return
    try {
      await removeBookmarkAPI(bookId, pageNumber)
      setBookmarks((prev) => prev.filter((bm) => bm.page_number !== pageNumber))
    } catch {}
  }, [bookId])

  const isBookmarked = useCallback((pageNumber) => {
    return bookmarks.some((bm) => bm.page_number === pageNumber)
  }, [bookmarks])

  return { bookmarks, loading, error, addBookmark, removeBookmark, isBookmarked, refetch: fetchBookmarks }
}
