import { useState, useEffect, useCallback, useMemo } from "react"
import { useDebounce } from "../../../hooks/useDebounce"
import { fetchLexoraBooks } from "../../../services/api/lexoraBooksApi"

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]
const SEARCH_DEBOUNCE_MS = 400

export function useLexoraBooks(initialFilters = {}) {
  const [books, setBooks]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [categories, setCategories] = useState([])
  const [tags, setTags]             = useState([])
  const [resourceTypes, setResourceTypes] = useState([])
  const [serverPagination, setServerPagination] = useState(null)

  const [query, setQuery] = useState(initialFilters.search || "")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [tagFilter, setTagFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [visibilityFilter, setVisibilityFilter] = useState("")
  const [sourceTypeFilter, setSourceTypeFilter] = useState("")
  const [sortBy, setSortBy]             = useState("")
  const [currentPage, setCurrentPage]   = useState(1)
  const [pageSize, setPageSize]         = useState(25)

  // Keystrokes must not each trigger a full list request.
  const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS)

  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await fetchLexoraBooks({
        search: debouncedQuery,
        category_id: categoryFilter,
        tag_id: tagFilter,
        status: statusFilter,
        visibility: visibilityFilter,
        source_type: sourceTypeFilter,
        page: currentPage,
        pageSize,
        sortBy,
      })
      if (result.success) {
        setBooks(result.data || [])
        setCategories(result.categories || [])
        setTags(result.tags || [])
        setResourceTypes(result.resourceTypes || [])
        // Absent on older payloads — the local fallback below then applies.
        setServerPagination(result.pagination || null)
      } else {
        setError(result.error)
      }
    } catch {
      setError("Could not connect to server")
    } finally {
      setLoading(false)
    }
  }, [debouncedQuery, categoryFilter, tagFilter, statusFilter, visibilityFilter, sourceTypeFilter, currentPage, pageSize, sortBy])

  useEffect(() => { fetchBooks() }, [fetchBooks])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedQuery, categoryFilter, tagFilter, statusFilter, visibilityFilter, sourceTypeFilter, sortBy, pageSize])

  // With server paging the API has already filtered, sorted and sliced the
  // list; without it we keep the previous local behaviour for compatibility.
  const filteredBooks = useMemo(() => {
    if (serverPagination) return books
    let result = books
    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase()
      result = result.filter((b) =>
        ["title", "author", "short_description", "subject_course"]
          .some((k) => b[k]?.toString().toLowerCase().includes(q))
      )
    }
    if (sortBy === "title") result = [...result].sort((a, b) => a.title.localeCompare(b.title))
    if (sortBy === "author") result = [...result].sort((a, b) => (a.author || "").localeCompare(b.author || ""))
    if (sortBy === "year") result = [...result].sort((a, b) => (b.year || 0) - (a.year || 0))
    return result
  }, [books, serverPagination, debouncedQuery, sortBy])

  const totalPages = serverPagination
    ? serverPagination.totalPages
    : Math.max(1, Math.ceil(filteredBooks.length / pageSize))
  const safePage   = Math.min(currentPage, totalPages)
  const totalItems = serverPagination ? serverPagination.totalItems : filteredBooks.length

  const paginatedBooks = useMemo(() => {
    if (serverPagination) return books
    const start = (safePage - 1) * pageSize
    return filteredBooks.slice(start, start + pageSize)
  }, [serverPagination, books, filteredBooks, safePage, pageSize])

  const refreshBook = useCallback((updated) => {
    setBooks((prev) => prev.map((b) => b.id === updated.id ? updated : b))
  }, [])

  const addBook = useCallback((newBook) => {
    setBooks((prev) => [newBook, ...prev])
  }, [])

  const removeBook = useCallback((bookId) => {
    setBooks((prev) => prev.filter((b) => b.id !== bookId))
  }, [])

  return {
    books: paginatedBooks,
    allBooks: books,
    loading,
    error,
    categories,
    tags,
    resourceTypes,
    query, setQuery,
    categoryFilter, setCategoryFilter,
    tagFilter, setTagFilter,
    statusFilter, setStatusFilter,
    visibilityFilter, setVisibilityFilter,
    sourceTypeFilter, setSourceTypeFilter,
    sortBy, setSortBy,
    currentPage: safePage,
    totalPages,
    totalItems,
    pageSize, setPageSize,
    setCurrentPage,
    refreshBook,
    addBook,
    removeBook,
    refetch: fetchBooks,
  }
}

export { PAGE_SIZE_OPTIONS }
