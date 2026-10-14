import { useCallback, useEffect, useMemo, useState } from "react"
import "./styles/flipbook.css"
import { useFlipbookEngine } from "./hooks/useFlipbookEngine"
import FlipbookToolbar   from "./FlipbookToolbar"
import FlipbookThumbnails from "./FlipbookThumbnails"
import FlipbookTOC       from "./FlipbookTOC"
import FlipbookSearch     from "./FlipbookSearch"
import FlipbookPageFlipMode from "./FlipbookPageFlipMode"
import FlipbookCSSMode    from "./FlipbookCSSMode"
import FlipbookLoading    from "./FlipbookLoading"
import FlipbookError      from "./FlipbookError"
import FlipbookCapturePanel from "./FlipbookCapturePanel"
import { searchPdf, loadPdf, getPdfTableOfContents } from "./utils/pdfRenderer"

function createPageList(totalPages) {
  return Array.from({ length: totalPages }, (_, page) => ({
    title: `Page ${page + 1}`,
    page,
    depth: 0,
  }))
}

export default function FlipbookReader({
  pdfUrl,
  pages,
  mode = "3d",
  viewMode: initialViewMode = "double",
  sound = true,
  tableOfContent,
  theme,
  className = "",
  onPageChange,
  currentPage,
  onReady,
  singlePageBreakpoint = 768,
  flipSpeed = 0.6,
  showToolbar = true,
  defaultZoom = 1,
  maxZoom = 3,
  minZoom = 0.5,
  onBookmark,
  bookId,
  isBookmarked,
}) {
  const [pdfTableOfContent, setPdfTableOfContent] = useState([])
  const { state, actions, effectiveViewMode, pdfDocRef } = useFlipbookEngine({
    pdfUrl, pages, mode, viewMode: initialViewMode, sound,
    onPageChange, onReady, singlePageBreakpoint, flipSpeed,
    defaultZoom, maxZoom, minZoom,
  })

  useEffect(() => {
    let cancelled = false
    setPdfTableOfContent([])
    if (!state.bookReady || !pdfUrl || !pdfDocRef.current) return undefined

    const doc = pdfDocRef.current
    async function loadTableOfContents() {
      try {
        const outlineItems = await getPdfTableOfContents(doc)
        if (cancelled || pdfDocRef.current !== doc) return
        setPdfTableOfContent(outlineItems.length > 0 ? outlineItems : createPageList(doc.numPages))
      } catch (error) {
        if (cancelled || pdfDocRef.current !== doc) return
        console.warn("[Flipbook] could not read PDF outline; using page list:", error)
        setPdfTableOfContent(createPageList(doc.numPages))
      }
    }

    loadTableOfContents()
    return () => { cancelled = true }
  }, [pdfDocRef, pdfUrl, state.bookReady, state.totalPages])

  const tocItems = useMemo(
    () => tableOfContent?.length ? tableOfContent : pdfTableOfContent,
    [pdfTableOfContent, tableOfContent]
  )

  useEffect(() => {
    if (Number.isInteger(currentPage) && state.bookReady && currentPage !== state.currentPage) {
      actions.goToPage(currentPage)
    }
  }, [actions.goToPage, currentPage, state.bookReady, state.currentPage])

  const actualMode = useMemo(() => {
    if (mode === "css") return "css"
    return "pageflip"
  }, [mode])

  const handleSearch = useCallback(async (query) => {
    if (!pdfUrl) return []
    try {
      const doc = pdfDocRef.current ?? (await loadPdf(pdfUrl))
      return searchPdf(doc, query)
    } catch {
      return []
    }
  }, [pdfUrl, pdfDocRef])

  const handleTOCNavigate = useCallback((page) => {
    if (!Number.isInteger(page) || page < 0 || page >= state.totalPages) return
    actions.goToPage(page)
    actions.toggleTOC()
  }, [actions.goToPage, actions.toggleTOC, state.totalPages])

  const hasPdf = !!pdfUrl
  const hasTOC = tocItems.length > 0

  // Pages the user actually sees right now — the capture target for both
  // text copy and screenshots. Double view shows the spread [current, +1].
  const capturePages = useMemo(() => {
    const visible = effectiveViewMode === "double"
      ? [state.currentPage, state.currentPage + 1]
      : [state.currentPage]
    return visible.filter((index) => index >= 0 && index < state.totalPages)
  }, [effectiveViewMode, state.currentPage, state.totalPages])

  const cssVars = {}
  if (theme?.toolbarBg)    cssVars["--flipbook-toolbar-bg"]    = theme.toolbarBg
  if (theme?.btnColor)     cssVars["--flipbook-btn-color"]     = theme.btnColor
  if (theme?.btnHoverBg)  cssVars["--flipbook-btn-hover-bg"]  = theme.btnHoverBg
  if (theme?.accentColor) cssVars["--flipbook-accent"]        = theme.accentColor
  if (theme?.panelBg)      cssVars["--flipbook-panel-bg"]      = theme.panelBg
  if (theme?.panelBorder)  cssVars["--flipbook-panel-border"]  = theme.panelBorder
  if (theme?.textPrimary)  cssVars["--flipbook-text-primary"]  = theme.textPrimary
  if (theme?.textMuted)    cssVars["--flipbook-text-muted"]    = theme.textMuted

  if (!state.bookReady) {
    return (
      <div className={`flipbook-root relative flex h-full min-h-0 flex-col items-center justify-center overflow-hidden rounded-xl ${className}`}
        style={{ ...cssVars, background: "var(--flipbook-bg, #0a1724)", minHeight: "400px" }}>
        <FlipbookLoading />
      </div>
    )
  }

  if (state.totalPages === 0) {
    return (
      <div className={`flipbook-root relative flex h-full min-h-0 flex-col items-center justify-center overflow-hidden rounded-xl ${className}`}
        style={{ ...cssVars, background: "var(--flipbook-bg, #0a1724)", minHeight: "400px" }}>
        <FlipbookError message={state.error || "No pages to display."} />
      </div>
    )
  }

  return (
    <div
      className={`flipbook-root relative flex h-full min-h-0 flex-col overflow-hidden rounded-xl ${className}`}
      style={{
        ...cssVars,
        background: "var(--flipbook-bg, #0a1724)",
        minHeight: 0,
      }}
    >
      <div className="relative flex min-h-0 flex-1 w-full items-center justify-center">
        {actualMode === "pageflip" ? (
          <FlipbookPageFlipMode
            state={state} actions={actions}
            viewMode={effectiveViewMode} flipSpeed={flipSpeed}
          />
        ) : (
          <FlipbookCSSMode
            state={state} actions={actions}
            viewMode={effectiveViewMode} flipSpeed={flipSpeed}
          />
        )}
      </div>

      {showToolbar && state.bookReady && state.totalPages > 0 && (
        <FlipbookToolbar
          state={state} actions={actions}
          theme={theme} viewMode={effectiveViewMode}
          hasPdf={hasPdf} hasTOC={hasTOC} hasCover={actualMode === "pageflip"}
        />
      )}

      {state.showThumbnails && (
        <FlipbookThumbnails
          state={state} actions={actions}
          viewMode={effectiveViewMode} onClose={actions.toggleThumbnails}
        />
      )}

      {state.showTOC && hasTOC && (
        <FlipbookTOC
          items={tocItems}
          currentPage={state.currentPage}
          onNavigate={handleTOCNavigate}
          onClose={actions.toggleTOC}
        />
      )}

      {state.showSearch && hasPdf && (
        <FlipbookSearch
          onSearch={handleSearch}
          onNavigate={actions.goToPage}
          onClose={actions.toggleSearch}
        />
      )}

      {state.showCapture && state.totalPages > 0 && (
        <FlipbookCapturePanel
          hasPdf={hasPdf}
          pdfDocRef={pdfDocRef}
          pages={pages}
          pageNumbers={capturePages}
          viewMode={effectiveViewMode}
          onClose={actions.toggleCapture}
        />
      )}

      {state.bookReady && state.totalPages > 0 && (
        <p className="reader-hint" aria-hidden="true">
          Click edges or drag to flip · Arrow keys to navigate
        </p>
      )}
    </div>
  )
}
