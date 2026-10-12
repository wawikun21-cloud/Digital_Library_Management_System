import { useCallback, useState } from "react"
import { generateBookToc } from "../../../services/api/lexoraBooksApi"

/**
 * Drives automatic TOC detection for the book form.
 *
 * Owns the request state and the result message; applying the proposal is
 * delegated to `onApply` so the form stays the single owner of its data.
 * Nothing is persisted by this hook — detection only fills the editable
 * list, and the librarian saves through the normal form submit.
 *
 * @param {Object}   options
 * @param {number}   options.bookId     saved book to analyse
 * @param {boolean}  options.canDetect  false disables the action (e.g. no PDF yet)
 * @param {Function} options.onApply    (entries, totalPages) => void
 */
export function useBookTocDetection({ bookId, canDetect, onApply }) {
  const [detecting, setDetecting] = useState(false)
  const [note, setNote] = useState("")

  const detect = useCallback(async () => {
    if (!bookId || !canDetect || detecting) return

    setDetecting(true)
    setNote("")
    try {
      const result = await generateBookToc(bookId)
      if (!result.success) {
        throw new Error(result.error || "Could not detect the table of contents.")
      }

      const { entries = [], total_pages: totalPages = 0, warnings = [] } = result.data || {}
      if (entries.length === 0) {
        setNote(warnings.join(" ") || "No chapter headings were recognised in this PDF.")
        return
      }

      onApply(entries, totalPages)
      setNote(
        warnings.length > 0
          ? warnings.join(" ")
          : `Detected ${entries.length} headings across ${totalPages} pages. Review the entries below, then save.`
      )
    } catch (error) {
      setNote(error.message || "Could not detect the table of contents.")
    } finally {
      setDetecting(false)
    }
  }, [bookId, canDetect, detecting, onApply])

  return { detect, detecting, note }
}
