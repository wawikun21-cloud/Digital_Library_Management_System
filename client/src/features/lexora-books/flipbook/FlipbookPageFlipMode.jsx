import { forwardRef, memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import HTMLFlipBook from "react-pageflip"

const FlipPage = memo(forwardRef(function FlipPage({ image, pageNumber, zoom }, ref) {
  return (
    <div
      ref={ref}
      className="relative flex h-full w-full items-center justify-center overflow-hidden bg-white"
      data-density="soft"
      style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
    >
      {image ? (
        <img src={image} alt={`Book page ${pageNumber}`} className="h-full w-full object-contain" draggable="false" />
      ) : pageNumber != null ? (
        <span className="text-xs text-gray-400" role="status">Loading page {pageNumber}…</span>
      ) : null}
      {pageNumber != null && (
        <span className="pointer-events-none absolute bottom-2 right-3 text-[10px] text-gray-400">
          {pageNumber}
        </span>
      )}
    </div>
  )
}))

function getPageFlipIndex(pageIndex, viewMode) {
  return viewMode === "double" && pageIndex > 0 ? pageIndex + 1 : pageIndex
}

function getBookPageIndex(pageFlipIndex, viewMode) {
  if (viewMode !== "double" || pageFlipIndex === 0) return pageFlipIndex
  return Math.max(1, pageFlipIndex - 1)
}

export default function FlipbookPageFlipMode({ state, actions, viewMode, flipSpeed = 0.6 }) {
  const containerRef = useRef(null)
  const bookRef = useRef(null)
  const [dimensions, setDimensions] = useState({ width: 120, height: 160, minWidth: 121 })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined

    const updateDimensions = () => {
      const bounds = container.getBoundingClientRect()
      const spreadWidth = viewMode === "double" ? 2 : 1
      const availableHeight = Math.max(160, bounds.height - 16)
      const pageWidth = Math.max(
        120,
        Math.floor(Math.min((bounds.width - 32) / spreadWidth, availableHeight * 0.75))
      )
      const pageHeight = Math.round(pageWidth / 0.75)
      const minWidth = Math.ceil(bounds.width / 2) + 1
      setDimensions((current) =>
        current.width === pageWidth && current.height === pageHeight && current.minWidth === minWidth
          ? current
          : { width: pageWidth, height: pageHeight, minWidth }
      )
    }

    updateDimensions()
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateDimensions)
    observer?.observe(container)
    window.addEventListener("resize", updateDimensions)
    return () => {
      observer?.disconnect()
      window.removeEventListener("resize", updateDimensions)
    }
  }, [viewMode])

  const handleFlip = useCallback((event) => {
    const pageFlip = bookRef.current?.pageFlip()
    if (pageFlip) {
      for (let index = 1; index < pageFlip.getPageCount(); index += 1) {
        const page = pageFlip.getPage(index)
        page.setDensity("soft")
        page.setDrawingDensity("soft")
      }
    }
    actions.goToPage(getBookPageIndex(event.data, viewMode))
  }, [actions.goToPage, viewMode])

  useEffect(() => {
    if (!state.bookReady || !bookRef.current) return
    const pageFlip = bookRef.current.pageFlip()
    if (pageFlip && getBookPageIndex(pageFlip.getCurrentPageIndex(), viewMode) !== state.currentPage) {
      pageFlip.flip(getPageFlipIndex(state.currentPage, viewMode))
    }
  }, [dimensions.height, dimensions.minWidth, dimensions.width, state.bookReady, state.currentPage, state.totalPages, viewMode])

  const pages = useMemo(
    () => {
      const bookPages = []
      for (let index = 0; index < state.totalPages; index += 1) {
        if (viewMode === "double" && index === 1) {
          bookPages.push({ index: "inside-cover", image: null, pageNumber: null })
        }
        bookPages.push({
          index,
          image: state.pageImages.get(index),
          pageNumber: index + 1,
        })
      }
      if (bookPages.length > 1 && bookPages.length % 2 === 0) {
        bookPages.push({ index: "back-cover", image: null, pageNumber: null })
      }
      return bookPages
    },
    [state.totalPages, state.pageImages, viewMode]
  )
  const [displayedPages, setDisplayedPages] = useState(pages)

  useEffect(() => {
    if (!state.isFlipping) setDisplayedPages(pages)
  }, [pages, state.isFlipping])

  const pageNodes = useMemo(
    () => displayedPages.map(({ index, image, pageNumber }) => (
      <FlipPage key={index} image={image} pageNumber={pageNumber} zoom={1} />
    )),
    [displayedPages]
  )

  return (
    <div
      ref={containerRef}
      className="flex h-full min-h-0 w-full items-center justify-center overflow-visible"
      style={{ transform: `scale(${state.zoom})`, transformOrigin: "center center" }}
    >
      <HTMLFlipBook
        key={`${state.totalPages}-${viewMode}-${dimensions.width}-${dimensions.height}-${dimensions.minWidth}`}
        ref={bookRef}
        width={dimensions.width}
        height={dimensions.height}
        size="stretch"
        minWidth={viewMode === "single" ? dimensions.minWidth : 120}
        maxWidth={viewMode === "single" ? dimensions.minWidth : dimensions.width}
        minHeight={160}
        maxHeight={dimensions.height}
        showCover
        drawShadow
        maxShadowOpacity={0.5}
        flippingTime={Math.round(flipSpeed * 1000)}
        usePortrait
        startPage={getPageFlipIndex(state.currentPage, viewMode)}
        clickEventForward
        mobileScrollSupport
        useMouseEvents
        showPageCorners
        disableFlipByClick={false}
        swipeDistance={28}
        autoSize
        onFlip={handleFlip}
        className="mx-auto"
        style={{
          maxWidth: "100%",
          transform: state.currentPage === 0 && !state.isFlipping ? "translateX(-25%)" : "translateX(0)",
          transition: `transform ${Math.round(flipSpeed * 1000)}ms ease`,
        }}
      >
        {pageNodes}
      </HTMLFlipBook>
    </div>
  )
}
