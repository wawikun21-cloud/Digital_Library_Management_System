import { AlertCircle, ListTree, Loader2, Plus, Trash2 } from "lucide-react"
import { Field, IconBtn, inputCls } from "./FormControls"
import { useBookTocDetection } from "../hooks/useBookTocDetection"

/**
 * Editable table-of-contents list for the book form, plus the
 * "detect headings from PDF" action that proposes entries.
 *
 * Entries stay in the form's state (onChange); detection only fills that
 * list — the librarian reviews and saves through the normal submit path.
 */
export default function BookTocEditor({
  entries = [],
  totalPages = "",
  error = "",
  canDetect = false,
  bookId,
  onChange,
  onApply,
}) {
  const { detect, detecting, note } = useBookTocDetection({ bookId, canDetect, onApply })

  function handleDetect() {
    if (entries.length > 0 &&
        !window.confirm(`Replace the current ${entries.length} table of contents entries with the detected ones?`)) {
      return
    }
    detect()
  }

  return (
    <div className="flex flex-col gap-3 md:col-span-2">
      {entries.map((entry, index) => (
        <div key={index} className="grid grid-cols-[minmax(0,1fr)_6rem_auto] items-end gap-2">
          <Field label={`Entry ${index + 1} title`} id={`bf-toc-title-${index}`}>
            <input id={`bf-toc-title-${index}`} value={entry.title}
              onChange={(event) => onChange(entries.map((item, itemIndex) =>
                itemIndex === index ? { ...item, title: event.target.value } : item))}
              placeholder="e.g. Chapter 2: Developing a Content Marketing Strategy"
              className={inputCls(error)} />
          </Field>
          <Field label="Page" id={`bf-toc-page-${index}`}>
            <input id={`bf-toc-page-${index}`} type="number" min="1"
              max={Number(totalPages) > 0 ? totalPages : undefined}
              value={entry.page_number}
              onChange={(event) => onChange(entries.map((item, itemIndex) =>
                itemIndex === index ? { ...item, page_number: event.target.value } : item))}
              placeholder="1" className={inputCls(error)} />
          </Field>
          <IconBtn label={`Remove table of contents entry ${index + 1}`}
            onClick={() => onChange(entries.filter((_, itemIndex) => itemIndex !== index))}>
            <Trash2 size={15} />
          </IconBtn>
        </div>
      ))}

      {error && (
        <p role="alert" data-field-error className="flex items-center gap-1 text-[11px] text-red-400">
          <AlertCircle size={12} className="shrink-0" /> {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {/* Detection needs an already-saved PDF; a new book is uploaded on
            its first save, so it cannot be analysed yet. */}
        {canDetect && (
          <button type="button" onClick={handleDetect} disabled={detecting}
            className="flex w-fit items-center gap-1.5 rounded-lg border border-[color:var(--border)] px-3 py-2 text-xs font-semibold text-[color:var(--accent-amber)] transition hover:bg-[rgba(238,162,58,0.08)] disabled:opacity-60"
            title="Analyse the PDF and propose chapter headings">
            {detecting ? <Loader2 size={14} className="animate-spin" /> : <ListTree size={14} />}
            {detecting ? "Detecting headings…" : "Detect headings from PDF"}
          </button>
        )}
        <button type="button"
          onClick={() => onChange([...entries, { title: "", page_number: "" }])}
          className="flex w-fit items-center gap-1.5 rounded-lg border border-[color:var(--border)] px-3 py-2 text-xs font-semibold text-[color:var(--accent-amber)] transition hover:bg-[rgba(238,162,58,0.08)]">
          <Plus size={14} /> Add TOC entry
        </button>
      </div>

      {note && (
        <p className={`flex items-start gap-1 text-[11px] ${note.startsWith("Detected") ? "text-[color:var(--text-muted)]" : "text-red-400"}`}>
          {!note.startsWith("Detected") && <AlertCircle size={12} className="mt-0.5 shrink-0" />}
          {note}
        </p>
      )}

      {entries.length === 0 && (
        <p className="text-xs text-[color:var(--text-muted)]">No custom entries. The reader will use PDF bookmarks or page numbers when available.</p>
      )}
    </div>
  )
}
