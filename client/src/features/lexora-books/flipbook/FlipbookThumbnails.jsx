import { useRef, useEffect } from "react"

export default function FlipbookThumbnails({ state, actions, viewMode, onClose }) {
  const scrollRef  = useRef(null)
  const activeRef  = useRef(null)

  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      activeRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      })
    }
  }, [state.currentPage])

  const total       = state.totalPages
  const currentPage = state.currentPage

  return (
    <div className="absolute inset-x-0 bottom-20 z-40 mx-auto w-[90%] max-w-2xl rounded-xl border border-white/10 bg-black/80 p-3 backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: "var(--flipbook-text-muted)" }}>Pages</span>
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-lg transition-colors"
          style={{ color: "rgba(255,255,255,0.5)" }}
          onMouseEnter={(e) => { e.target.style.background = "rgba(255,255,255,0.1)"; e.target.style.color = "#fff" }}
          onMouseLeave={(e) => { e.target.style.background = "transparent"; e.target.style.color = "rgba(255,255,255,0.5)" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto styled-scroll"
        style={{ maxHeight: "160px" }}
      >
        {Array.from({ length: total }, (_, i) => {
          const thumb = state.pageThumbs.get(i)
          const isActive = i === currentPage
          const displayNum = viewMode === "double" ? Math.floor(i / 2) + 1 : i + 1

          return (
            <button
              key={i}
              ref={isActive ? activeRef : undefined}
              onClick={() => { actions.goToPage(i); onClose() }}
              className={`shrink-0 rounded-lg border-2 transition-all ${
                isActive ? "border-white/80 shadow-lg scale-105" : "border-transparent hover:border-white/30 opacity-60 hover:opacity-90"
              }`}
              style={{ width: "70px", aspectRatio: "3/4" }}
            >
              <div className="relative h-full w-full overflow-hidden rounded-md" style={{ background: "rgba(255,255,255,0.05)" }}>
                {thumb ? (
                  <img src={thumb} alt={`Page ${displayNum}`}
                    className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
                  </div>
                )}
                <span className="absolute bottom-0.5 right-0.5 rounded bg-black/60 px-1 py-px text-[8px] text-white/70">
                  {displayNum}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
