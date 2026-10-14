import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

/**
 * Titled section with a "Browse all" button. Handles loading, error and empty states
 * so each section stays readable in the page.
 */
export default function PortalSection({
  title, description, browseLabel, browseTo,
  loading, error, onRetry, isEmpty, emptyMessage, skeleton, children,
}) {
  const headingId = `portal-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <div className="relative flex flex-col items-center gap-4 text-center lg:min-h-[76px] lg:justify-center">
        <div>
          <h2 id={headingId} className="text-[28px] font-extrabold leading-tight sm:text-[34px]" style={{ color: "var(--text-primary)" }}>
            {title}
          </h2>
          <p className="mt-1 text-[15px] font-semibold sm:text-[17px]" style={{ color: "var(--text-secondary)" }}>{description}</p>
        </div>
        <Link
          to={browseTo}
          className="flex items-center gap-1.5 lg:absolute lg:bottom-0 lg:right-0 rounded-lg border px-3.5 py-2 text-[13px] font-semibold transition-colors hover:border-[var(--accent-amber)] hover:text-[var(--accent-amber)]"
          style={{ borderColor: "var(--border)", color: "var(--text-primary)", background: "var(--bg-surface)" }}
        >
          {browseLabel}
          <ArrowRight size={14} />
        </Link>
      </div>

      {loading && skeleton}

      {!loading && error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border p-4 text-[13px]"
          style={{ borderColor: "var(--border)", background: "var(--bg-surface)", color: "var(--text-secondary)" }}>
          <span>{error}</span>
          <button type="button" onClick={onRetry} className="font-semibold" style={{ color: "var(--accent-amber)" }}>
            Try again
          </button>
        </div>
      )}

      {!loading && !error && isEmpty && (
        <p className="rounded-xl border border-dashed px-4 py-8 text-center text-[13px]"
          style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
          {emptyMessage}
        </p>
      )}

      {!loading && !error && !isEmpty && children}
    </section>
  );
}
