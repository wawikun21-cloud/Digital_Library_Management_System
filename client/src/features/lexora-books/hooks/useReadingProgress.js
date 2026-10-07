import { useState, useEffect, useCallback } from "react"
import {
  fetchReadingProgress as fetchProgressAPI,
  saveReadingProgress as saveProgressAPI,
} from "../../../services/api/lexoraBooksApi"

export function useReadingProgress(bookId) {
  const [progress, setProgress] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const fetchProgress = useCallback(async () => {
    if (!bookId) return
    try {
      setLoading(true)
      const result = await fetchProgressAPI(bookId)
      if (result.success) setProgress(result.data)
      else setError(result.error)
    } catch {
      setError("Failed to load reading progress")
    } finally {
      setLoading(false)
    }
  }, [bookId])

  useEffect(() => { fetchProgress() }, [fetchProgress])

  const saveProgress = useCallback(async (pageNumber) => {
    if (!bookId) return null
    try {
      const result = await saveProgressAPI(bookId, pageNumber)
      if (result.success) {
        setProgress(result.data)
        return result.data
      }
      return null
    } catch {
      return null
    }
  }, [bookId])

  return { progress, loading, error, saveProgress, refetch: fetchProgress }
}
