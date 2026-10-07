import { X } from "lucide-react"

export default function FlipbookTOC({ items, currentPage, onNavigate, onClose }) {
  return (
    <aside
      aria-label="Table of contents"
      className="absolute left-0 top-0 z-40 flex h-full w-64 max-w-[80vw] flex-col border-r border-[var(--border)] bg-[var(--bg-surface)] shadow-lg"
    >
      <div className="flex min-h-12 items-center justify-between border-b border-[var(--border)] px-4 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
          Table of Contents
        </span>
        <button
          type="button"
          aria-label="Close table of contents"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <nav aria-label="Book sections" className="min-h-0 flex-1 overflow-y-auto styled-scroll py-2">
        {(items || []).map((item, i) => (
          <button
            key={`${item.page}-${item.title}-${i}`}
            type="button"
            aria-current={currentPage === item.page ? "location" : undefined}
            title={`Go to ${item.title}, page ${item.page + 1}`}
            onClick={() => onNavigate(item.page)}
            className={`block w-full border-l-2 py-2.5 pr-3 text-left text-sm font-semibold leading-snug transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)] ${
              currentPage === item.page
                ? "border-[var(--color-primary)] bg-[var(--bg-hover)] text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            }`}
            style={{ paddingLeft: `${14 + Math.min(item.depth || 0, 6) * 14}px` }}
          >
            {item.title}
          </button>
        ))}
      </nav>
    </aside>
  )
}
