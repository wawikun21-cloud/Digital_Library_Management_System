/**
 * Form primitives shared by the lexora-books admin surfaces.
 *
 * Extracted from LexoraBookFormModal when the table-of-contents editor was
 * split out: the modal and BookTocEditor both need a labelled field and an
 * icon button, and these are feature-generic (no book-specific logic), so
 * they live in the feature's components folder rather than in global ui/.
 */

import { AlertCircle } from "lucide-react"

export const inputCls = (err) =>
  `w-full rounded-lg border bg-[color:var(--bg-primary)] px-3 py-2.5 text-sm text-[color:var(--text-primary)] outline-none transition placeholder:text-[color:var(--text-muted)] focus:ring-2 focus:ring-[rgba(238,162,58,0.3)] ${
    err ? "border-red-400" : "border-[color:var(--border)] focus:border-[color:var(--accent-amber)]"}`

export function Field({ label, id, required, hint, error, className = "", children }) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-xs font-medium text-[color:var(--text-secondary)]">
        {label}{required && <span className="ml-0.5 text-red-400" aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[11px] text-[color:var(--text-muted)]">{hint}</p>}
      {error && (
        <p role="alert" data-field-error className="flex items-center gap-1 text-[11px] text-red-400">
          <AlertCircle size={12} className="shrink-0" /> {error}
        </p>
      )}
    </div>
  )
}

export function IconBtn({ label, danger, children, ...props }) {
  return (
    <button type="button" aria-label={label} title={label} {...props}
      className={`rounded-md p-2 transition hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-40 ${danger ? "text-red-400" : "text-[color:var(--text-secondary)]"}`}>
      {children}
    </button>
  )
}
