import { useState, useEffect, useCallback, useRef } from "react"
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Maximize2, Minimize2, Volume2, VolumeX,
  LayoutGrid, List, Search, BookOpen, Columns, X, Camera,
} from "lucide-react"
import FlipbookPageJump from "./FlipbookPageJump"

export default function FlipbookToolbar({
  state, actions, theme, viewMode,
  hasPdf = false, hasTOC = false, hasCover = false,
  canCapture = true,
}) {
  const [isVisible, setIsVisible] = useState(true)
  const idleTimerRef = useRef(null)

  const resetIdleTimer = useCallback(() => {
    setIsVisible(true)
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => {
      if (!state.isDragging) setIsVisible(false)
    }, 3000)
  }, [state.isDragging])

  useEffect(() => {
    resetIdleTimer()
    return () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current) }
  }, [resetIdleTimer])

  useEffect(() => {
    if (state.isDragging) setIsVisible(true)
  }, [state.isDragging])

  const toolbarStyle = {
    backgroundColor: theme?.toolbarBg || "rgba(26, 26, 46, 0.85)",
    color: theme?.btnColor || "#ffffff",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    borderColor: theme?.panelBorder || "rgba(255,255,255,0.1)",
    opacity: isVisible ? 1 : 0,
    transition: "opacity 0.3s ease",
  }

  const btnStyle = {
    color: theme?.btnColor || "#ffffff",
    backgroundColor: "transparent",
  }

  const btnHoverClass = "hover:bg-[var(--flipbook-btn-hover-bg,rgba(255,255,255,0.12))]"

  const displayPage = hasCover && state.currentPage > 0
    ? viewMode === "double"
      ? state.currentPage <= 1
        ? 2
        : Math.floor((state.currentPage - 2) / 2) + 3
      : state.currentPage + 1
    : viewMode === "double"
      ? Math.floor(state.currentPage / 2) + 1
      : state.currentPage + 1
  const totalDisplayPages = hasCover && viewMode === "double"
    ? state.totalPages <= 1
      ? 1
      : 2 + Math.ceil((state.totalPages - 2) / 2)
    : viewMode === "double"
      ? Math.ceil(state.totalPages / 2)
      : state.totalPages
  const canGoNext = hasCover && viewMode === "double"
    ? state.currentPage === 0
      ? state.totalPages > 1
      : state.currentPage === 1
        ? state.totalPages > 2
        : state.currentPage + 2 < state.totalPages
    : state.currentPage < state.totalPages - 1

  return (
    <div
      className="absolute bottom-4 left-1/2 z-50 flex items-center gap-1 rounded-2xl border px-3 py-2 shadow-xl"
      style={toolbarStyle}
      onMouseMove={resetIdleTimer}
      onMouseEnter={() => setIsVisible(true)}
    >
      <button
        className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${btnHoverClass}`}
        style={btnStyle}
        onClick={actions.goPrev}
        disabled={state.currentPage <= 0 || state.isFlipping}
        title="Previous page"
      >
        <ChevronLeft size={18} />
      </button>

      <FlipbookPageJump
        displayPage={displayPage}
        totalPages={totalDisplayPages}
        hasCover={hasCover}
        viewMode={viewMode}
        onNavigate={actions.goToPage}
      />

      <button
        className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${btnHoverClass}`}
        style={btnStyle}
        onClick={actions.goNext}
        disabled={!canGoNext || state.isFlipping}
        title="Next page"
      >
        <ChevronRight size={18} />
      </button>

      <div className="mx-1 h-5 w-px" style={{ background: "rgba(255,255,255,0.15)" }} />

      <button
        className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${btnHoverClass} ${state.showThumbnails ? "bg-white/15" : ""}`}
        style={btnStyle}
        onClick={actions.toggleThumbnails}
        title="Thumbnails"
      >
        <LayoutGrid size={16} />
      </button>

      {hasTOC && (
        <button
          className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${btnHoverClass} ${state.showTOC ? "bg-white/15" : ""}`}
          style={btnStyle}
          onClick={actions.toggleTOC}
          title="Table of Contents"
        >
          <List size={16} />
        </button>
      )}

      {hasPdf && (
        <button
          className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${btnHoverClass} ${state.showSearch ? "bg-white/15" : ""}`}
          style={btnStyle}
          onClick={actions.toggleSearch}
          title="Search"
        >
          <Search size={16} />
        </button>
      )}

      {/* Hidden entirely when the book's creator disabled both copy and
          screenshot — there is no panel to open. */}
      {canCapture && (
        <button
          className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${btnHoverClass} ${state.showCapture ? "bg-white/15" : ""}`}
          style={btnStyle}
          onClick={actions.toggleCapture}
          title="Copy text & screenshot"
        >
          <Camera size={16} />
        </button>
      )}

      <div className="mx-1 h-5 w-px" style={{ background: "rgba(255,255,255,0.15)" }} />

      <button
        className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${btnHoverClass}`}
        style={btnStyle}
        onClick={actions.zoomOut}
        disabled={state.zoom <= 0.5}
        title="Zoom out"
      >
        <ZoomOut size={16} />
      </button>

      <button
        className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${btnHoverClass}`}
        style={btnStyle}
        onClick={actions.zoomIn}
        disabled={state.zoom >= 3}
        title="Zoom in"
      >
        <ZoomIn size={16} />
      </button>

      <button
        className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${btnHoverClass}`}
        style={btnStyle}
        onClick={actions.toggleViewMode}
        title={state.viewMode === "double" ? "Single page" : "Double page"}
      >
        {state.viewMode === "double" ? <Columns size={16} /> : <BookOpen size={16} />}
      </button>

      <button
        className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${btnHoverClass}`}
        style={btnStyle}
        onClick={actions.toggleSound}
        title={state.sound ? "Mute" : "Sound on"}
      >
        {state.sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
      </button>

      <button
        className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${btnHoverClass}`}
        style={btnStyle}
        onClick={actions.toggleFullscreen}
        title={state.isFullscreen ? "Exit fullscreen" : "Fullscreen"}
      >
        {state.isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </button>
    </div>
  )
}
