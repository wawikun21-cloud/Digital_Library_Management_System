import { useState } from "react"

/**
 * Page indicator / jump-to-page control, extracted from FlipbookToolbar
 * (it owns its own input state). Computes the flipbook page index for the
 * display page number the user typed.
 */
export default function FlipbookPageJump({
  displayPage,
  totalPages,
  hasCover = false,
  viewMode = "double",
  onNavigate,
  vertical = false,
}) {
  const [showInput, setShowInput] = useState(false)
  const [jumpValue, setJumpValue] = useState("")

  function handleJump() {
    const page = parseInt(jumpValue, 10)
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      const targetPage = hasCover && viewMode === "double"
        ? page <= 2 ? page - 1 : 2 + (page - 3) * 2
        : viewMode === "double" ? (page - 1) * 2 : page - 1
      onNavigate(targetPage)
    }
    setShowInput(false)
    setJumpValue("")
  }

  if (showInput) {
    return (
      <form
        onSubmit={(e) => { e.preventDefault(); handleJump() }}
        className="flex items-center gap-1"
      >
        <input
          type="number"
          min={1}
          max={totalPages}
          value={jumpValue}
          onChange={(e) => setJumpValue(e.target.value)}
          className={`h-7 rounded-lg bg-white/10 text-center text-xs text-white outline-none ${vertical ? "w-11 px-1" : "w-14 px-2"}`}
          autoFocus
          onBlur={handleJump}
          aria-label="Jump to page"
        />
      </form>
    )
  }

  return (
    <button
      className={vertical
        ? "flex w-9 flex-col items-center rounded-lg py-1 text-[11px] leading-tight transition-colors hover:bg-white/10"
        : "flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-white/10"}
      onClick={() => { setShowInput(true); setJumpValue(String(displayPage)) }}
      title="Jump to page"
      aria-label={`Page ${displayPage} of ${totalPages}. Jump to page`}
    >
      <span className="font-semibold">{displayPage}</span>
      {vertical
        ? <span className="my-0.5 h-px w-4" style={{ background: "rgba(255,255,255,0.3)" }} />
        : <span className="opacity-50">/</span>}
      <span className="opacity-70">{totalPages}</span>
    </button>
  )
}
