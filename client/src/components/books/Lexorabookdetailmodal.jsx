import { useEffect, useCallback } from "react";
import {
  X, ExternalLink, BookMarked, FileText, BookOpen,
  User, Calendar, Tag, Globe, GraduationCap, Layers, BookCopy,
} from "lucide-react";

/* ── Mirror normalizer from LexoraBookTable exactly ────────── */
function normalizeType(raw) {
  if (!raw) return null;
  const t = raw.trim().toLowerCase();
  if (t === "ebook"    || t === "ebooks")   return "Ebook";
  if (t === "journal"  || t === "journal ") return "Journal";
  if (t === "module"   || t === "mdule")    return "Module";
  if (t === "reviewer")                     return "Reviewer";
  if (t === "exam")                         return "Exam";
  return raw.trim();
}

const TYPE_STYLE = {
  Ebook:    { bg: "rgba(50,102,127,0.12)",  color: "#32667F",  Icon: BookMarked },
  Journal:  { bg: "rgba(36,97,57,0.12)",    color: "#246139",  Icon: FileText   },
  Module:   { bg: "rgba(153,101,0,0.12)",   color: "#996500",  Icon: BookOpen   },
  Reviewer: { bg: "rgba(109,40,217,0.1)",   color: "#6d28d9",  Icon: BookOpen   },
  Exam:     { bg: "rgba(204,31,31,0.1)",    color: "#cc1f1f",  Icon: FileText   },
};

/* ── Type badge — identical to LexoraBookTable's TypeBadge ─── */
function TypeBadge({ raw }) {
  const label = normalizeType(raw) || "—";
  const s     = TYPE_STYLE[label];
  if (!s) return (
    <span className="text-[11px] font-bold" style={{ color: "var(--text-muted)" }}>
      {label}
    </span>
  );
  const { Icon } = s;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold"
      style={{ background: s.bg, color: s.color }}
    >
      <Icon size={11} /> {label}
    </span>
  );
}

/* ── Program badge — identical to LexoraBookTable's program cell ── */
function ProgramBadge({ program }) {
  if (!program) return null;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold"
      style={{ background: "rgba(153,101,0,0.1)", color: "var(--accent-amber)" }}
    >
      <GraduationCap size={11} /> {program}
    </span>
  );
}

/* ── Single detail row ──────────────────────────────────────── */
function DetailRow({ icon: Icon, label, value }) {
  if (!value) return null;
  const clean = typeof value === "string"
    ? value.replace(/[\r\n]+/g, " ").trim()
    : value;
  return (
    <div
      className="flex items-start gap-3 py-2.5 border-b last:border-0"
      style={{ borderColor: "var(--border-light)" }}
    >
      <div className="flex items-center gap-1.5 shrink-0 w-[110px]">
        <Icon size={12} style={{ color: "var(--text-muted)" }} />
        <span
          className="text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-muted)" }}
        >
          {label}
        </span>
      </div>
      <span
        className="text-[13px] leading-relaxed flex-1"
        style={{ color: "var(--text-primary)" }}
      >
        {clean}
      </span>
    </div>
  );
}

/* ══ Main Modal ═════════════════════════════════════════════ */
export default function LexoraBookDetailModal({ isOpen, onClose, book }) {
  const handleKey = useCallback((e) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKey]);

  if (!isOpen || !book) return null;

  const type        = normalizeType(book.resource_type);
  const typeStyle   = TYPE_STYLE[type] ?? {};
  const accentColor = typeStyle.color ?? "var(--accent-amber)";
  const IconComp    = typeStyle.Icon ?? BookOpen;

  /* Clean title/author of embedded newlines for display */
  const cleanTitle  = book.title?.replace(/[\r\n]+/g, " ").trim() ?? "Untitled";
  const cleanAuthor = book.author?.replace(/[\r\n]+/g, " ").trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Details for ${cleanTitle}`}
      >
        {/* Accent top bar */}
        <div className="h-1 w-full shrink-0" style={{ background: accentColor }} />

        {/* ── Header ─────────────────────────────────────────── */}
        <div
          className="flex items-start gap-4 px-6 pt-5 pb-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          {/* Icon */}
          <div
            className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0"
            style={{ background: typeStyle.bg ?? "rgba(238,162,58,0.12)" }}
          >
            <IconComp size={22} style={{ color: accentColor }} />
          </div>

          {/* Title + badges */}
          <div className="flex-1 min-w-0">
            <h2
              className="text-[15px] font-bold leading-snug"
              style={{ color: "var(--text-primary)" }}
            >
              {cleanTitle}
            </h2>

            {cleanAuthor && (
              <p className="text-[12px] mt-0.5 italic" style={{ color: "var(--text-secondary)" }}>
                by {cleanAuthor}
              </p>
            )}

            {/* Badges row — type · program · year */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <TypeBadge raw={book.resource_type} />
              <ProgramBadge program={book.program} />
              {book.year && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold"
                  style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }}
                >
                  <Calendar size={10} /> {book.year}
                </span>
              )}
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg transition-colors duration-150"
            style={{ background: "var(--bg-subtle)", color: "var(--text-muted)" }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--bg-subtle)"}
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Body — only real Lexora fields ─────────────────── */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          <DetailRow icon={User}          label="Author"          value={cleanAuthor} />
          <DetailRow icon={Calendar}      label="Year"            value={book.year} />
          <DetailRow icon={Tag}           label="Type"            value={type} />
          <DetailRow icon={Layers}        label="Format"          value={book.format} />
          <DetailRow icon={BookCopy}      label="Subject/Course"  value={book.subject_course} />
          <DetailRow icon={GraduationCap} label="Program"         value={book.program} />
          <DetailRow icon={Globe}         label="Source URL"      value={book.source} />
        </div>

        {/* ── Footer ─────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between gap-3 px-6 py-3 shrink-0"
          style={{ borderTop: "1px solid var(--border)", background: "var(--bg-subtle)" }}
        >
          {book.source ? (
            <a
              href={book.source}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-opacity duration-150"
              style={{
                background: typeStyle.bg ?? "rgba(238,162,58,0.12)",
                color: accentColor,
                border: `1px solid ${accentColor}30`,
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.75"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              <ExternalLink size={12} /> Open Resource
            </a>
          ) : (
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              No external source available
            </span>
          )}

          <button
            onClick={onClose}
            className="text-[12px] font-semibold px-4 py-1.5 rounded-lg transition-colors duration-150"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--bg-surface)"}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}