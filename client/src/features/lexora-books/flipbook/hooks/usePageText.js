import { useEffect, useRef, useState } from "react"
import { getPageText } from "../utils/pdfRenderer"

// Per-page extraction is fast but not free; keep a small bounded cache so
// flipping back and forth inside the panel does not re-read the document.
const MAX_CACHED_PAGES = 20

/**
 * Extract plain text for the given page numbers (zero-based, as used by the
 * flipbook engine). Returns text with a "Page N" header per page.
 *
 * Pass a pdfDocRef that currently holds a document; anything else yields an
 * empty result (image-source books have no extractable text).
 */
export function usePageText(pdfDocRef, pageNumbers) {
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const cacheRef = useRef(new Map())

  const pageKey = pageNumbers?.join(",") ?? ""

  useEffect(() => {
    const doc = pdfDocRef?.current
    const indices = pageKey ? pageKey.split(",").map(Number) : []

    if (!doc || indices.length === 0) {
      setText("")
      setError(null)
      setLoading(false)
      return undefined
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const parts = []
        for (const zeroBased of indices) {
          if (cancelled) return
          const pageNum = zeroBased + 1
          let pageText = cacheRef.current.get(pageNum)
          if (pageText === undefined) {
            pageText = await getPageText(doc, pageNum)
            cacheRef.current.set(pageNum, pageText)
            if (cacheRef.current.size > MAX_CACHED_PAGES) {
              const oldestKey = cacheRef.current.keys().next().value
              cacheRef.current.delete(oldestKey)
            }
          }
          if (pageText) parts.push(`Page ${pageNum}\n${pageText}`)
        }
        if (!cancelled) setText(parts.join("\n\n"))
      } catch (err) {
        if (!cancelled) setError(err?.message || "Could not read the page text.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [pageKey, pdfDocRef])

  return { text, loading, error }
}
