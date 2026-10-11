import { useCallback, useEffect, useMemo, useState } from "react"

const PANELS = {
  THUMBNAILS: "thumbnails",
  TOC: "toc",
  SEARCH: "search",
  CAPTURE: "capture",
}

/**
 * Overlay panel visibility for the flipbook.
 *
 * Extracted from useFlipbookEngine so the engine stays within its review
 * threshold and every panel gets the same behavior for free:
 *   • only one panel is open at a time (opening one closes the others)
 *   • Escape closes whichever panel is open
 *
 * New panels are added by extending PANELS and the two maps below.
 */
export function useFlipbookPanels() {
  const [openPanel, setOpenPanel] = useState(null)

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") setOpenPanel(null)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  const toggle = useCallback((panel) => {
    setOpenPanel((current) => (current === panel ? null : panel))
  }, [])

  const toggleThumbnails = useCallback(() => toggle(PANELS.THUMBNAILS), [toggle])
  const toggleTOC         = useCallback(() => toggle(PANELS.TOC), [toggle])
  const toggleSearch      = useCallback(() => toggle(PANELS.SEARCH), [toggle])
  const toggleCapture     = useCallback(() => toggle(PANELS.CAPTURE), [toggle])

  const visibility = useMemo(() => ({
    showThumbnails: openPanel === PANELS.THUMBNAILS,
    showTOC:         openPanel === PANELS.TOC,
    showSearch:      openPanel === PANELS.SEARCH,
    showCapture:     openPanel === PANELS.CAPTURE,
  }), [openPanel])

  const actions = useMemo(() => ({
    toggleThumbnails,
    toggleTOC,
    toggleSearch,
    toggleCapture,
  }), [toggleThumbnails, toggleTOC, toggleSearch, toggleCapture])

  return { visibility, actions }
}
