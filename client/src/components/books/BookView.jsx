import {
  BookOpen, Hash, Calendar, Package, Ruler,
  Layers, User, Building2, MapPin, Info,
  Copy, Archive, FileText, BookMarked, Fingerprint
} from "lucide-react";

/* ── status pill ── */
function StatusPill({ available }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
      style={{
        background: available ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
        color: available ? "#15803d" : "#b91c1c",
        border: `1px solid ${available ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: available ? "#22c55e" : "#ef4444" }} />
      {available ? "Available" : "Out of Stock"}
    </span>
  );
}

/* ── single field cell ── */
function Cell({ icon: Icon, label, value, mono, accent, span2 }) {
  return (
    <div className={`flex flex-col gap-0.5 min-w-0 ${span2 ? "col-span-2" : ""}`}>
      <div className="flex items-center gap-1">
        {Icon && (
          <Icon
            size={9}
            style={{ color: accent ? "var(--accent-amber)" : "var(--text-muted)", opacity: 0.7, flexShrink: 0 }}
          />
        )}
        <span className="text-[9px] font-black uppercase tracking-[0.12em] truncate" style={{ color: "var(--text-muted)" }}>
          {label}
        </span>
      </div>
      <span
        className={`text-[12px] font-semibold leading-snug truncate ${mono ? "font-mono text-[11px]" : ""}`}
        style={{ color: value ? (accent ? "#b86f00" : "var(--text-primary)") : "var(--text-muted)" }}
      >
        {value || "—"}
      </span>
    </div>
  );
}

/* ── section block ── */
function Block({ icon: Icon, title, cols = 2, children }) {
  return (
    <div
      className="flex flex-col gap-2.5 p-3 rounded-xl border"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border-light)" }}
    >
      <div className="flex items-center gap-1.5">
        <div
          className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
          style={{ background: "rgba(184,122,0,0.12)" }}
        >
          <Icon size={11} style={{ color: "var(--accent-amber)" }} />
        </div>
        <span className="text-[9px] font-black uppercase tracking-[0.15em]" style={{ color: "var(--text-secondary)" }}>
          {title}
        </span>
        <div className="flex-1 h-px" style={{ background: "var(--border-light)" }} />
      </div>
      <div className="grid gap-x-4 gap-y-2.5" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {children}
      </div>
    </div>
  );
}

export default function BookView({ book }) {
  const isAvailable = book?.quantity > 0 && book?.status !== "OutOfStock";

  return (
    <div className="flex flex-col gap-3">

      {/* ── Hero ── */}
      <div
        className="flex items-center gap-4 px-4 py-3 rounded-xl"
        style={{
          background: "linear-gradient(135deg, rgba(184,122,0,0.08) 0%, rgba(184,122,0,0.03) 100%)",
          border: "1.5px solid rgba(184,122,0,0.18)",
        }}
      >
        {/* Book icon */}
        <div
          className="w-14 h-[72px] shrink-0 rounded-lg flex items-center justify-center shadow-md"
          style={{
            background: "linear-gradient(145deg, var(--accent-amber), #c87800)",
            boxShadow: "3px 3px 10px rgba(184,122,0,0.28), inset -2px 0 4px rgba(0,0,0,0.12)",
          }}
        >
          <BookOpen size={26} className="text-white" />
        </div>

        {/* Title block */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider"
              style={{ background: "rgba(184,122,0,0.12)", color: "var(--accent-amber)", border: "1px solid rgba(184,122,0,0.2)" }}
            >
              {book?.materialType || "Book"}
            </span>
            <StatusPill available={isAvailable} />
          </div>

          <h1 className="text-base font-black leading-tight truncate" style={{ color: "var(--text-primary)" }}>
            {book?.title || "Untitled"}
          </h1>
          {book?.subtitle && (
            <p className="text-[11px] font-medium truncate" style={{ color: "var(--text-secondary)" }}>
              {book.subtitle}
            </p>
          )}

          {/* Quick strip */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
            {(book?.authors || book?.author) && (
              <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>
                <User size={10} className="opacity-60" /> {book.authors || book.author}
              </span>
            )}
            {(book?.date || book?.year) && (
              <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>
                <Calendar size={10} className="opacity-60" /> {book.date || book.year}
              </span>
            )}
            {book?.edition && (
              <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>
                <Copy size={10} className="opacity-60" /> {book.edition} Ed.
              </span>
            )}
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-black"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-light)", color: "var(--text-primary)" }}
            >
              <Package size={10} style={{ color: "var(--accent-amber)" }} />
              {book?.quantity ?? "—"} {book?.quantity === 1 ? "copy" : "copies"}
            </span>
          </div>
        </div>
      </div>

      {/* ── 2-column grid of 4 section blocks ── */}
      <div className="grid grid-cols-2 gap-3">

        {/* Title Information */}
        <Block icon={BookMarked} title="Title Information" cols={2}>
          <Cell icon={Hash}   label="Call No."      value={book?.callNumber}              accent />
          <Cell icon={Hash}   label="Accession No." value={book?.accessionNumber}         accent />
          <Cell icon={User}   label="Authors"       value={book?.authors || book?.author} span2 />
          <Cell icon={Copy}   label="Edition"       value={book?.edition} />
          <Cell icon={Layers} label="Volume"        value={book?.volume} />
        </Block>

        {/* Standard Numbers */}
        <Block icon={Fingerprint} title="Standard Numbers" cols={1}>
          <Cell icon={Hash} label="ISBN" value={book?.isbn} mono />
          <Cell icon={Hash} label="ISSN" value={book?.issn} mono />
          <Cell icon={Hash} label="LCCN" value={book?.lccn} mono />
        </Block>

        {/* Publication Information */}
        <Block icon={Building2} title="Publication Information" cols={2}>
          <Cell icon={MapPin}    label="Place"     value={book?.place} />
          <Cell icon={Calendar}  label="Date"      value={book?.date || book?.year} />
          <Cell icon={Building2} label="Publisher" value={book?.publisher} span2 />
        </Block>

        {/* Physical Description */}
        <Block icon={Ruler} title="Physical Description" cols={2}>
          <Cell icon={FileText} label="Extent"        value={book?.extent} />
          <Cell icon={Ruler}    label="Size"          value={book?.size} />
          <Cell icon={FileText} label="Pages"         value={book?.pages} />
          <Cell icon={Archive}  label="Shelf"         value={book?.shelf} />
          {book?.otherDetails && (
            <Cell icon={Info} label="Other Details" value={book.otherDetails} span2 />
          )}
        </Block>
      </div>

      {/* ── Description (clamped to 3 lines) ── */}
      {book?.description && (
        <div
          className="flex flex-col gap-1.5 px-3 py-2.5 rounded-xl border"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border-light)" }}
        >
          <div className="flex items-center gap-1.5">
            <div
              className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
              style={{ background: "rgba(184,122,0,0.12)" }}
            >
              <Info size={11} style={{ color: "var(--accent-amber)" }} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.15em]" style={{ color: "var(--text-secondary)" }}>
              Description
            </span>
          </div>
          <p className="text-[12px] leading-relaxed line-clamp-3" style={{ color: "var(--text-secondary)" }}>
            {book.description}
          </p>
        </div>
      )}
    </div>
  );
}