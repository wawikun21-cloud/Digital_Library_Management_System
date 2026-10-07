import { useRef, useCallback, useEffect, useState } from "react"

export default function FlipbookCSSMode({ state, actions, viewMode, flipSpeed = 0.6 }) {
  const containerRef  = useRef(null)
  const touchStartRef = useRef(null)
  const [dragOffset, setDragOffset]     = useState(0)
  const [isDragging, setIsDragging]     = useState(false)

  const totalPages  = state.totalPages
  const currentPage = state.currentPage
  const isDouble    = viewMode === "double"

  const leftPage  = isDouble && currentPage > 0 ? currentPage - 1 : currentPage
  const rightPage = isDouble ? currentPage + 1 : currentPage
  const leftImage  = state.pageImages.get(leftPage)
  const rightImage = state.pageImages.get(rightPage)

  const handlePointerDown = useCallback((e) => {
    if (state.isFlipping) return
    const rect = (e.currentTarget).getBoundingClientRect()
    const x    = e.clientX - rect.left
    const relX = x / rect.width
    if (relX > 0.15 && relX < 0.85) return

    touchStartRef.current = { x: e.clientX, y: e.clientY }
    setIsDragging(true)
    setDragOffset(0)
    ;(e.currentTarget).setPointerCapture(e.pointerId)
  }, [state.isFlipping])

  const handlePointerMove = useCallback((e) => {
    if (!touchStartRef.current || !isDragging) return
    const delta    = e.clientX - touchStartRef.current.x
    const rect     = (e.currentTarget).getBoundingClientRect()
    const progress = Math.max(-1, Math.min(1, delta / (rect.width * 0.5)))
    setDragOffset(progress)
  }, [isDragging])

  const handlePointerUp = useCallback((e) => {
    if (!touchStartRef.current || !isDragging) return
    ;(e.currentTarget).releasePointerCapture(e.pointerId)

    if (dragOffset > 0.3) actions.goPrev()
    else if (dragOffset < -0.3) actions.goNext()

    touchStartRef.current = null
    setIsDragging(false)
    setDragOffset(0)
  }, [isDragging, dragOffset, actions])

  const handleClick = useCallback((e) => {
    if (isDragging) return
    const rect = (e.currentTarget).getBoundingClientRect()
    const x    = e.clientX - rect.left
    const relX = x / rect.width
    if (relX < 0.2) actions.goPrev()
    else if (relX > 0.8) actions.goNext()
  }, [isDragging, actions])

  const handleTouchStart = useCallback((e) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }, [])

  const handleTouchEnd = useCallback((e) => {
    if (!touchStartRef.current) return
    const delta = e.changedTouches[0].clientX - touchStartRef.current.x
    if (Math.abs(delta) > 50) {
      if (delta < 0) actions.goNext()
      else actions.goPrev()
    }
    touchStartRef.current = null
  }, [actions])

  if (totalPages === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed"
        style={{ borderColor: "rgba(255,255,255,0.2)" }}>
        <p className="text-sm" style={{ color: "var(--flipbook-text-muted)" }}>No pages to display</p>
      </div>
    )
  }

  const pageStyle = {
    transformStyle: "preserve-3d",
    transformOrigin: "left center",
    transition: state.isFlipping
      ? `transform ${flipSpeed}s cubic-bezier(0.645, 0.045, 0.355, 1)`
      : isDragging ? "none" : "none",
    transform: isDragging && dragOffset < 0
      ? `rotateY(${dragOffset * 30}deg)`
      : state.isFlipping && state.flipDirection === "next"
        ? "rotateY(-180deg)"
        : "rotateY(0deg)",
  }

  const backPageStyle = {
    ...pageStyle,
    transformOrigin: "right center",
    transform: isDragging && dragOffset > 0
      ? `rotateY(${dragOffset * 30}deg)`
      : state.isFlipping && state.flipDirection === "prev"
        ? "rotateY(180deg)"
        : "rotateY(180deg)",
  }

  return (
    <div
      ref={containerRef}
      className="relative mx-auto w-full flipbook-enter"
      style={{
        perspective: "2500px",
        perspectiveOrigin: "50% 50%",
        transform: `scale(${state.zoom})`,
        transformOrigin: "center center",
        transition: "transform 0.2s ease-out",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="relative mx-auto"
        style={{
          transformStyle: "preserve-3d",
          aspectRatio: isDouble ? "16/9" : "3/4",
          maxWidth: "100%",
        }}
      >
        <div
          className="absolute inset-0 rounded-lg"
          style={{
            transform: "translateZ(-2px)",
            boxShadow: "0 0 20px rgba(0,0,0,0.15)",
            background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
          }}
        />

        <div
          className="absolute left-0 top-0 h-full rounded-l-sm"
          style={{
            width: "10px",
            transform: "translateX(-50%)",
            zIndex: 100,
            background: "linear-gradient(90deg, #374151 0%, #4b5563 30%, #6b7280 50%, #4b5563 70%, #374151 100%)",
            boxShadow: "inset -2px 0 6px rgba(0,0,0,0.4), -3px 0 10px rgba(0,0,0,0.25)",
          }}
        />

        <div
          className="absolute inset-0 overflow-hidden rounded-r-sm bg-white"
          style={{
            boxShadow: "2px 0 10px rgba(0,0,0,0.08), inset -3px 0 6px rgba(0,0,0,0.04)",
          }}
        >
          {rightImage ? (
            <img src={rightImage} alt={`Page ${rightPage + 1}`}
              className="h-full w-full object-contain" draggable={false} />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-50">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-500" />
            </div>
          )}
          <span className="absolute bottom-2 right-2 rounded bg-black/40 px-1.5 py-0.5 text-[9px] text-white/80">
            {rightPage + 1}
          </span>
        </div>

        <div className="absolute inset-0 overflow-hidden rounded-l-sm bg-white" style={pageStyle}>
          <div
            className="absolute inset-0 bg-white"
            style={{
              backfaceVisibility: "hidden",
              boxShadow: "2px 0 10px rgba(0,0,0,0.08), inset -3px 0 6px rgba(0,0,0,0.04)",
            }}
          >
            {leftImage ? (
              <img src={leftImage} alt={`Page ${leftPage + 1}`}
                className="h-full w-full object-contain" draggable={false} />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gray-50">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-500" />
              </div>
            )}
            <span className="absolute bottom-2 left-2 rounded bg-black/40 px-1.5 py-0.5 text-[9px] text-white/80">
              {leftPage + 1}
            </span>
          </div>
          <div
            className="absolute inset-0 bg-white"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              boxShadow: "-2px 0 10px rgba(0,0,0,0.08), inset 3px 0 6px rgba(0,0,0,0.04)",
            }}
          >
            {currentPage > 0 && state.pageImages.has(leftPage - 1) ? (
              <img src={state.pageImages.get(leftPage - 1)} alt={`Page ${leftPage}`}
                className="h-full w-full object-contain" draggable={false} />
            ) : (
              <div className="h-full w-full bg-gray-50" />
            )}
          </div>
        </div>

        {isDragging && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `linear-gradient(90deg, rgba(0,0,0,${Math.abs(dragOffset) * 0.15}) 0%, transparent 40%)`,
              mixBlendMode: "multiply",
            }}
          />
        )}
      </div>
    </div>
  )
}
