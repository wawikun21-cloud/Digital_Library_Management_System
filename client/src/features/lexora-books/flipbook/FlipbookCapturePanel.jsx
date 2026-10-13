import { useEffect, useState } from "react"
import { AlertCircle, Camera, Check, Copy, Loader2 } from "lucide-react"
import { usePageText } from "./hooks/usePageText"
import { usePageScreenshot } from "./hooks/usePageScreenshot"
import { copyTextToClipboard } from "./utils/clipboardUtils"

const COPY_STATE = { IDLE: "idle", COPIED: "copied", FAILED: "failed" }

/** Shown in place of an action the book's creator has switched off. */
function DisabledNote({ action }) {
  return (
    <p className="rounded-lg border border-dashed border-[var(--flipbook-capture-border)] px-3 py-2.5 text-[11px] leading-relaxed"
      style={{ color: "var(--flipbook-capture-muted)" }}>
      {action} is turned off for this book by its creator.
    </p>
  )
}

/**
 * Right-hand panel for copying the visible page text and saving a PNG
 * screenshot of the open page(s). Mirrors FlipbookSearch's panel layout.
 *
 * PDF books get both actions; image-source books can only screenshot
 * (nothing to extract text from). The creator can switch each action off
 * per book (allowTextCopy / allowScreenshot) — a disabled action is not
 * rendered and its extraction/capture work never runs.
 */
export default function FlipbookCapturePanel({
  onClose,
  hasPdf = false,
  pdfDocRef,
  pages,
  pageNumbers = [],
  viewMode = "single",
  allowTextCopy = true,
  allowScreenshot = true,
}) {
  // Passing a null document makes the hooks idle: no extraction cost and
  // nothing to copy or capture even if a stale callback ran.
  const { text, loading, error: textError } = usePageText(
    hasPdf && allowTextCopy ? pdfDocRef : null,
    pageNumbers
  )
  const {
    capture, status, error: shotError, busy,
  } = usePageScreenshot({
    pdfDocRef: hasPdf && allowScreenshot ? pdfDocRef : null,
    pages: allowScreenshot ? pages : undefined,
    pageNumbers,
  })
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
    <div
      className="absolute right-0 top-0 z-40 flex h-full w-80 flex-col border-l backdrop-blur-xl"
      style={{ background: "var(--flipbook-capture-bg)", borderColor: "var(--flipbook-capture-border)" }}
    >
      <div
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: "var(--flipbook-capture-border)" }}
      >
        <span className="text-sm font-semibold" style={{ color: "var(--flipbook-capture-title)" }}>
          Copy &amp; capture
        </span>
        <button
          onClick={onClose}
          aria-label="Close copy and capture panel"
          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
          style={{ color: "var(--flipbook-capture-close)" }}
          onMouseEnter={(e) => { e.target.style.background = "var(--flipbook-capture-close-hover-bg)"; e.target.style.color = "var(--flipbook-capture-title)" }}
          onMouseLeave={(e) => { e.target.style.background = "transparent"; e.target.style.color = "var(--flipbook-capture-close)" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="styled-scroll styled-scroll--capture flex-1 space-y-6 overflow-y-auto p-4">
        {/* ── Page text ── */}
        <section>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--flipbook-capture-muted)" }}>
            Page text
          </h3>

          {!allowTextCopy ? (
            <DisabledNote action="Copying text" />
          ) : hasPdf ? (
            <>
              <textarea
                readOnly
                value={loading ? "" : text}
                placeholder={loading ? "Reading page text…" : "This page has no extractable text."}
                className="styled-scroll styled-scroll--capture h-48 w-full resize-none rounded-lg p-2.5 text-[11px] leading-relaxed outline-none"
                style={{
                  background: "var(--flipbook-capture-field-bg)",
                  color: "var(--flipbook-capture-field-text)",
                  userSelect: "text",
                  WebkitUserSelect: "text",
                }}
              />

              <button
                onClick={handleCopy}
                disabled={loading || !text}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--flipbook-capture-btn-bg)] px-3 py-2 text-xs font-medium text-[var(--flipbook-capture-btn-text)] transition-colors hover:bg-[var(--flipbook-capture-btn-bg-hover)] disabled:opacity-40"
              >
                {copyState === COPY_STATE.COPIED ? <Check size={14} /> : <Copy size={14} />}
                {copyState === COPY_STATE.COPIED ? "Copied" : "Copy text"}
              </button>

              {copyState === COPY_STATE.COPIED && (
                <p className="mt-2 text-[11px] text-[var(--flipbook-capture-success)]">Text copied to the clipboard.</p>
              )}
              {copyState === COPY_STATE.FAILED && (
                <p className="mt-2 text-[11px] text-[var(--flipbook-capture-warning)]">
                  Clipboard unavailable — select the text above and press Ctrl/Cmd + C.
                </p>
              )}
              {copyState === COPY_STATE.IDLE && textError && (
                <p className="mt-2 flex items-center gap-1 text-[11px] text-[var(--flipbook-capture-danger)]">
                  <AlertCircle size={12} /> {textError}
                </p>
              )}
            </>
          ) : (
            <p className="text-[11px] leading-relaxed" style={{ color: "var(--flipbook-capture-muted)" }}>
              Text copy is available for PDF books. You can still save a screenshot below.
            </p>
          )}
        </section>

        {/* ── Screenshot ── */}
        <section>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--flipbook-capture-muted)" }}>
            Screenshot
          </h3>

          {!allowScreenshot ? (
            <DisabledNote action="Screenshots" />
          ) : (
            <>
              <p className="mb-2 text-[11px] leading-relaxed" style={{ color: "var(--flipbook-capture-muted)" }}>
                Saves {isSpread ? "the open spread" : "this page"} as a PNG file to your downloads.
              </p>

              <button
                onClick={capture}
                disabled={busy}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--flipbook-capture-btn-bg)] px-3 py-2 text-xs font-medium text-[var(--flipbook-capture-btn-text)] transition-colors hover:bg-[var(--flipbook-capture-btn-bg-hover)] disabled:opacity-40"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                {busy ? "Saving…" : isSpread ? "Save spread" : "Save page"}
              </button>

              {status === "done" && (
                <p className="mt-2 text-[11px] text-[var(--flipbook-capture-success)]">Screenshot saved.</p>
              )}
              {status === "error" && shotError && (
                <p className="mt-2 flex items-center gap-1 text-[11px] text-[var(--flipbook-capture-danger)]">
                  <AlertCircle size={12} /> {shotError}
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
