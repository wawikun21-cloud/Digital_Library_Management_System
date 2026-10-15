import { useEffect, useState } from "react"
import { AlertCircle, Camera, Check, Copy, Loader2 } from "lucide-react"
import { usePageText } from "./hooks/usePageText"
import { usePageScreenshot } from "./hooks/usePageScreenshot"
import { copyTextToClipboard } from "./utils/clipboardUtils"

const COPY_STATE = { IDLE: "idle", COPIED: "copied", FAILED: "failed" }

/**
 * Right-hand panel for copying the visible page text and saving a PNG
 * screenshot of the open page(s). Mirrors FlipbookSearch's panel layout.
 *
 * PDF books get both actions; image-source books can only screenshot
 * (nothing to extract text from).
 */
export default function FlipbookCapturePanel({
  onClose,
  hasPdf = false,
  pdfDocRef,
  pages,
  pageNumbers = [],
  viewMode = "single",
}) {
  const { text, loading, error: textError } = usePageText(hasPdf ? pdfDocRef : null, pageNumbers)
  const {
    capture, status, error: shotError, busy,
  } = usePageScreenshot({ pdfDocRef: hasPdf ? pdfDocRef : null, pages, pageNumbers })
  const [copyState, setCopyState] = useState(COPY_STATE.IDLE)

  useEffect(() => {
    if (copyState === COPY_STATE.IDLE) return undefined
    const timer = setTimeout(() => setCopyState(COPY_STATE.IDLE), 2500)
    return () => clearTimeout(timer)
  }, [copyState])

  // A different page resets the copy feedback so stale messages don't linger.
  useEffect(() => { setCopyState(COPY_STATE.IDLE) }, [text])

  async function handleCopy() {
    const copied = await copyTextToClipboard(text)
    setCopyState(copied ? COPY_STATE.COPIED : COPY_STATE.FAILED)
  }

  const isSpread = viewMode === "double" && pageNumbers.length > 1

  return (
    <div className="absolute right-0 top-0 z-40 flex h-full w-80 flex-col border-l border-white/10 bg-[var(--flipbook-panel-bg,rgba(8,18,29,0.88))] backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <span className="text-sm font-semibold" style={{ color: "var(--flipbook-text-primary)" }}>
          Copy &amp; capture
        </span>
        <button
          onClick={onClose}
          aria-label="Close copy and capture panel"
          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
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

      <div className="flex-1 space-y-6 overflow-y-auto styled-scroll p-4">
        {/* ── Page text ── */}
        <section>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--flipbook-text-muted)" }}>
            Page text
          </h3>

          {hasPdf ? (
            <>
              <textarea
                readOnly
                value={loading ? "" : text}
                placeholder={loading ? "Reading page text…" : "This page has no extractable text."}
                className="styled-scroll h-48 w-full resize-none rounded-lg bg-white/5 p-2.5 text-[11px] leading-relaxed text-white/70 outline-none"
                style={{ userSelect: "text", WebkitUserSelect: "text" }}
              />

              <button
                onClick={handleCopy}
                disabled={loading || !text}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/25 disabled:opacity-40"
              >
                {copyState === COPY_STATE.COPIED ? <Check size={14} /> : <Copy size={14} />}
                {copyState === COPY_STATE.COPIED ? "Copied" : "Copy text"}
              </button>

              {copyState === COPY_STATE.COPIED && (
                <p className="mt-2 text-[11px] text-emerald-300">Text copied to the clipboard.</p>
              )}
              {copyState === COPY_STATE.FAILED && (
                <p className="mt-2 text-[11px] text-amber-300">
                  Clipboard unavailable — select the text above and press Ctrl/Cmd + C.
                </p>
              )}
              {copyState === COPY_STATE.IDLE && textError && (
                <p className="mt-2 flex items-center gap-1 text-[11px] text-red-300">
                  <AlertCircle size={12} /> {textError}
                </p>
              )}
            </>
          ) : (
            <p className="text-[11px] leading-relaxed" style={{ color: "var(--flipbook-text-muted)" }}>
              Text copy is available for PDF books. You can still save a screenshot below.
            </p>
          )}
        </section>

        {/* ── Screenshot ── */}
        <section>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--flipbook-text-muted)" }}>
            Screenshot
          </h3>
          <p className="mb-2 text-[11px] leading-relaxed" style={{ color: "var(--flipbook-text-muted)" }}>
            Saves {isSpread ? "the open spread" : "this page"} as a PNG file to your downloads.
          </p>

          <button
            onClick={capture}
            disabled={busy}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/25 disabled:opacity-40"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
            {busy ? "Saving…" : isSpread ? "Save spread" : "Save page"}
          </button>

          {status === "done" && (
            <p className="mt-2 text-[11px] text-emerald-300">Screenshot saved.</p>
          )}
          {status === "error" && shotError && (
            <p className="mt-2 flex items-center gap-1 text-[11px] text-red-300">
              <AlertCircle size={12} /> {shotError}
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
