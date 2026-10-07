import { useState, useEffect, useCallback, useMemo } from "react"
import { fetchLexoraBooks } from "../../../services/api/lexoraBooksApi"

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

export function useLexoraBooks(initialFilters = {}) {
  const [books, setBooks]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [categories, setCategories] = useState([])
  const [tags, setTags]             = useState([])
  const [resourceTypes, setResourceTypes] = useState([])

  const [query, setQuery] = useState(initialFilters.search || "")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [tagFilter, setTagFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [visibilityFilter, setVisibilityFilter] = useState("")
  const [sourceTypeFilter, setSourceTypeFilter] = useState("")
  const [sortBy, setSortBy]             = useState("")
  const [currentPage, setCurrentPage]   = useState(1)
  const [pageSize, setPageSize]         = useState(25)

  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await fetchLexoraBooks({
        search: query,
        category_id: categoryFilter,
        tag_id: tagFilter,
        status: statusFilter,
        visibility: visibilityFilter,
        source_type: sourceTypeFilter,
      })
      if (result.success) {
        setBooks(result.data || [])
        setCategories(result.categories || [])
        setTags(result.tags || [])
        setResourceTypes(result.resourceTypes || [])
      } else {
        setError(result.error)
      }
    } catch {
      setError("Could not connect to server")
    } finally {
      setLoading(false)
    }
  }, [query, categoryFilter, tagFilter, statusFilter, visibilityFilter, sourceTypeFilter])

  useEffect(() => { fetchBooks() }, [fetchBooks])

  useEffect(() => {
    setCurrentPage(1)
  }, [query, categoryFilter, tagFilter, statusFilter, visibilityFilter, sourceTypeFilter, sortBy, pageSize])

  const filteredBooks = useMemo(() => {
    let result = books
    if (query) {
      const q = query.toLowerCase()
      result = result.filter((b) =>
        ["title", "author", "short_description", "subject_course"]
          .some((k) => b[k]?.toString().toLowerCase().includes(q))
      )
    }
    if (sortBy === "title") result = [...result].sort((a, b) => a.title.localeCompare(b.title))
    if (sortBy === "author") result = [...result].sort((a, b) => (a.author || "").localeCompare(b.author || ""))
    if (sortBy === "year") result = [...result].sort((a, b) => (b.year || 0) - (a.year || 0))
    return result
  }, [books, query, sortBy])

  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / pageSize))
  const safePage   = Math.min(currentPage, totalPages)
  const paginatedBooks = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filteredBooks.slice(start, start + pageSize)
  }, [filteredBooks, safePage, pageSize])

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
    totalItems: filteredBooks.length,
    pageSize, setPageSize,
    setCurrentPage,
    refreshBook,
    addBook,
    removeBook,
    refetch: fetchBooks,
  }
}
