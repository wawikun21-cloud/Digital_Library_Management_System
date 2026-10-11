import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { capturePdfPages, captureImagePages, downloadBlob, screenshotFilename } from "../utils/pageCapture"

/**
 * Build a PNG screenshot of the open page(s) and download it.
 *
 * PDF books are re-rendered from the document at 2× (true source quality);
 * image-source books composite their page images. `pageNumbers` is the list
 * of visible pages (zero-based). status: "idle" | "working" | "done" | "error".
 */
export function usePageScreenshot({ pdfDocRef, pages, pageNumbers }) {
  const [status, setStatus] = useState("idle")
  const [error, setError] = useState(null)
  const busyRef = useRef(false)

  // Derive from the joined key so an equal array with a new identity does
  // not re-create the callback or reset the status.
  const indices = useMemo(
    () => (pageNumbers?.length ? [...pageNumbers] : []),
    [pageNumbers?.join(",")]
  )

  // A new page invalidates the previous result's message.
  useEffect(() => {
    setStatus("idle")
    setError(null)
  }, [indices])

  const capture = useCallback(async () => {
    if (busyRef.current || indices.length === 0) return
    busyRef.current = true
    setStatus("working")
    setError(null)

    try {
      const doc = pdfDocRef?.current
      let blob
      if (doc) {
        blob = await capturePdfPages(doc, indices.map((index) => index + 1))
      } else {
        const urls = indices.map((index) => pages?.[index]?.src).filter(Boolean)
        blob = await captureImagePages(urls)
      }
      downloadBlob(blob, screenshotFilename(indices))
      setStatus("done")
    } catch (err) {
      setError(err?.message || "Could not create the screenshot.")
      setStatus("error")
    } finally {
      busyRef.current = false
    }
  }, [pdfDocRef, indices, pages])

  return { capture, status, error, busy: status === "working" }
}
