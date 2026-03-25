import { useState } from "react";
import { ExternalLink, BookMarked, FileText, BookOpen, GraduationCap } from "lucide-react";

/* ── Normalize inconsistent resource_type values from Excel ── */
function normalizeType(raw) {
  if (!raw) return null;
  const t = raw.trim().toLowerCase();
  if (t === "ebook" || t === "ebooks")         return "Ebook";
  if (t === "journal" || t === "journal ")     return "Journal";
  if (t === "module"  || t === "mdule")        return "Module";
  if (t === "reviewer")                        return "Reviewer";
  if (t === "exam")                            return "Exam";
  return raw.trim();
}

/* ── Badge styles per resource type ────────────────────────── */
const TYPE_STYLE = {
  Ebook:    { bg: "rgba(50,102,127,0.12)",  color: "#32667F",  Icon: BookMarked },
  Journal:  { bg: "rgba(36,97,57,0.12)",    color: "#246139",  Icon: FileText   },
  Module:   { bg: "rgba(153,101,0,0.12)",   color: "#996500",  Icon: BookOpen   },
  Reviewer: { bg: "rgba(109,40,217,0.1)",   color: "#6d28d9",  Icon: BookOpen   },
  Exam:     { bg: "rgba(204,31,31,0.1)",    color: "#cc1f1f",  Icon: FileText   },
};

function TypeBadge({ raw }) {
  const label = normalizeType(raw) || "—";
  const s     = TYPE_STYLE[label];
  if (!s) return (
    <span className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>{label}</span>
  );
  const { Icon } = s;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap"
      style={{ background: s.bg, color: s.color }}
    >
      <Icon size={10} />
      {label}
    </span>
  );
}

/* ── Expandable text cell — same truncate pattern as BookTable ── */
function TruncCell({ text, max = 55 }) {
  const [open, setOpen] = useState(false);
  if (!text) return <span style={{ color: "var(--text-muted)" }}>—</span>;
  const clean = text.replace(/\n/g, " ").trim();
  if (clean.length <= max) return <span>{clean}</span>;
  return (
    <span>
      {open ? clean : clean.slice(0, max) + "…"}
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className="ml-1 text-[10px] font-bold"
        style={{ color: "var(--accent-amber)" }}
      >
        {open ? "less" : "more"}
      </button>
    </span>
  );
}

/* ══ Main component ══════════════════════════════════════════ */
export default function LexoraBookTable({ books, onView }) {
  if (!books?.length) return null;

  return (
    <div className="overflow-x-auto rounded-xl border shadow-sm"
         style={{ borderColor: "var(--border)" }}>
      <table className="w-full text-left border-collapse" style={{ minWidth: "860px" }}>
        <caption className="sr-only">
          Lexora Digital Library — list of e-books and journals
        </caption>

        <thead>
          <tr style={{ background: "var(--bg-subtle)", borderBottom: "1.5px solid var(--border)" }}>
            <Th minWidth="40px">#</Th>
            <Th minWidth="140px">Subject / Course</Th>
            <Th minWidth="220px">Title of Book</Th>
            <Th minWidth="140px">Author</Th>
            <Th minWidth="52px">Year</Th>
            <Th minWidth="100px">Resource Type</Th>
            <Th minWidth="70px">Format</Th>
            <Th minWidth="90px">Program</Th>
            <Th minWidth="60px">Source</Th>
          </tr>
        </thead>

        <tbody>
          {books.map((book, idx) => (
            <BookRow
              key={book.id ?? idx}
              book={book}
              idx={idx}
              onView={onView}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Header cell — mirrors BookTable's th style exactly ─────── */
function Th({ children, minWidth }) {
  return (
    <th
      scope="col"
      className="px-3 py-3 text-[11px] font-bold uppercase tracking-wider"
      style={{ color: "var(--text-muted)", minWidth }}
    >
      {children}
    </th>
  );
}

/* ── Single row ─────────────────────────────────────────────── */
function BookRow({ book, idx, onView }) {
  return (
    <tr
      className="border-b transition-colors duration-150 cursor-pointer group hover:bg-[var(--bg-hover)]"
      style={{
        borderColor: "var(--border-light)",
        background: idx % 2 === 0 ? "var(--bg-surface)" : "rgba(0,0,0,0.01)",
      }}
      onClick={() => onView?.(book)}
      tabIndex="0"
      onKeyDown={e => e.key === "Enter" && onView?.(book)}
      aria-label={`View details for ${book.title}`}
    >
      {/* # */}
      <td className="px-3 py-3.5">
        <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
          {idx + 1}
        </span>
      </td>

      {/* Subject / Course */}
      <td className="px-3 py-3.5">
        <span className="text-[11px] block max-w-[140px]" style={{ color: "var(--text-muted)" }}>
          <TruncCell text={book.subject_course} max={38} />
        </span>
      </td>
      
      {/* Title — amber on hover, same as BookTable */}
      <td className="px-3 py-3.5">
        <p
          className="text-[13px] font-semibold max-w-[220px] group-hover:text-[var(--accent-amber)] transition-colors"
          style={{ color: "var(--text-primary)" }}
        >
          <TruncCell text={book.title} max={65} />
        </p>
      </td>

      {/* Author */}
      <td className="px-3 py-3.5">
        <span className="text-[12px] block max-w-[140px]" style={{ color: "var(--text-primary)" }}>
          <TruncCell text={book.author} max={42} />
        </span>
      </td>

      {/* Year */}
      <td className="px-3 py-3.5">
        <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
          {book.year || "—"}
        </span>
      </td>

      {/* Resource Type badge */}
      <td className="px-3 py-3.5">
        <TypeBadge raw={book.resource_type} />
      </td>

      {/* Format */}
      <td className="px-3 py-3.5">
        {book.format ? (
          <span className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>
            {book.format}
          </span>
        ) : (
          <span style={{ color: "var(--text-muted)" }}>—</span>
        )}
      </td>

      {/* Program badge — same amber style as genre in BookTable */}
      <td className="px-3 py-3.5">
        {book.program ? (
          <span
            className="text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap"
            style={{ background: "rgba(153,101,0,0.1)", color: "var(--accent-amber)" }}
          >
            {book.program}
          </span>
        ) : (
          <span style={{ color: "var(--text-muted)" }}>—</span>
        )}
      </td>

      {/* Source link — stop propagation so row click doesn't fire */}
      <td className="px-3 py-3.5" onClick={e => e.stopPropagation()}>
        {book.source ? (
          <a
            href={book.source}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-semibold transition-colors duration-150"
            style={{ color: "#32667F" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--accent-amber)"}
            onMouseLeave={e => e.currentTarget.style.color = "#32667F"}
            title={book.source}
          >
            <ExternalLink size={12} />
            Open
          </a>
        ) : (
          <span style={{ color: "var(--text-muted)" }}>—</span>
        )}
      </td>
    </tr>
  );
}