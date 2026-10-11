import { useState, useEffect } from "react";
import {
  BookOpen, Hash, Calendar, Package, Ruler,
  Layers, User, Building2, MapPin, Info,
  Copy, Archive, FileText, BookMarked, Fingerprint, List
} from "lucide-react";

// Keep relative so Vite proxy handles routing correctly.
// Never use the full "http://localhost:3001" here — that bypasses the proxy
// and causes double /api/api/ prefixing.
const API_BASE = import.meta.env.VITE_API_URL || "/api";

/* ── status pill ─────────────────────────────────────── */
function StatusPill({ status }) {
  const cfg = {
    Available: { bg:"rgba(34,197,94,0.12)",  color:"#15803d", dot:"#22c55e" },
    Borrowed:  { bg:"rgba(239,68,68,0.12)",  color:"#b91c1c", dot:"#ef4444" },
    Reserved:  { bg:"rgba(234,179,8,0.12)",  color:"#92400e", dot:"#f59e0b" },
    Lost:      { bg:"rgba(107,114,128,0.12)",color:"#374151", dot:"#6b7280" },
    Damaged:   { bg:"rgba(239,68,68,0.12)",  color:"#b91c1c", dot:"#ef4444" },
  };
  const c = cfg[status] || cfg.Available;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
          style={{ background:c.bg, color:c.color, border:`1px solid ${c.dot}40` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background:c.dot }} />
      {status || "Available"}
    </span>
  );
}

/* ── field cell ──────────────────────────────────────── */
function Cell({ icon: Icon, label, value, mono, accent, span2 }) {
  return (
    <div className={`flex flex-col gap-0.5 min-w-0 ${span2 ? "col-span-2" : ""}`}>
      <div className="flex items-center gap-1">
        {Icon && <Icon size={9} style={{ color: accent ? "var(--accent-amber)" : "var(--text-muted)", opacity:0.7, flexShrink:0 }} />}
        <span className="text-[9px] font-black uppercase tracking-[0.12em] truncate" style={{ color:"var(--text-muted)" }}>
          {label}
        </span>
      </div>
      <span className={`text-[12px] font-semibold leading-snug truncate ${mono?"font-mono text-[11px]":""}`}
            style={{ color: value ? (accent ? "#b86f00" : "var(--text-primary)") : "var(--text-muted)" }}>
        {value || "—"}
      </span>
    </div>
  );
}

/* ── section block ───────────────────────────────────── */
function Block({ icon: Icon, title, cols=2, children }) {
  return (
    <div className="flex flex-col gap-2.5 p-3 rounded-xl border"
         style={{ background:"var(--bg-surface)", borderColor:"var(--border-light)" }}>
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
             style={{ background:"rgba(184,122,0,0.12)" }}>
          <Icon size={11} style={{ color:"var(--accent-amber)" }} />
        </div>
        <span className="text-[9px] font-black uppercase tracking-[0.15em]" style={{ color:"var(--text-secondary)" }}>
          {title}
        </span>
        <div className="flex-1 h-px" style={{ background:"var(--border-light)" }} />
      </div>
      <div className="grid gap-x-4 gap-y-2.5" style={{ gridTemplateColumns:`repeat(${cols},1fr)` }}>
        {children}
      </div>
    </div>
  );
}

/* ── copies section ──────────────────────────────────── */
function CopiesBlock({ bookId, initialCopies }) {
  const [copies, setCopies]   = useState(initialCopies || []);
  const [loading, setLoading] = useState(!initialCopies?.length && !!bookId);

  useEffect(() => {
    if (!bookId || initialCopies?.length) return;
    setLoading(true);
    // API_BASE is already "/api", so the full path becomes /api/books/:id/copies
    fetch(`${API_BASE}/books/${bookId}/copies`)
      .then(r => r.json())
      .then(d => { if (d.success) setCopies(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [bookId]);

  const statusOrder = { Available:0, Reserved:1, Borrowed:2, Damaged:3, Lost:4 };
  const sorted = [...copies].sort((a,b) =>
    (statusOrder[a.status]??5) - (statusOrder[b.status]??5) ||
    (a.accession_number||"").localeCompare(b.accession_number||"")
  );

  return (
    <div className="flex flex-col gap-2.5 p-3 rounded-xl border col-span-2"
         style={{ background:"var(--bg-surface)", borderColor:"var(--border-light)" }}>
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
             style={{ background:"rgba(184,122,0,0.12)" }}>
          <List size={11} style={{ color:"var(--accent-amber)" }} />
        </div>
        <span className="text-[9px] font-black uppercase tracking-[0.15em]" style={{ color:"var(--text-secondary)" }}>
          Physical Copies
        </span>
        <span className="px-1.5 py-0.5 rounded text-[9px] font-black"
              style={{ background:"rgba(184,122,0,0.1)", color:"var(--accent-amber)" }}>
          {copies.length}
        </span>
        <div className="flex-1 h-px" style={{ background:"var(--border-light)" }} />
      </div>

      {loading ? (
        <p className="text-[11px] text-center py-2" style={{ color:"var(--text-muted)" }}>Loading copies…</p>
      ) : sorted.length === 0 ? (
        <p className="text-[11px] text-center py-2" style={{ color:"var(--text-muted)" }}>No copies recorded</p>
      ) : (
        <div className="grid grid-cols-1 gap-1.5">
          {sorted.map((copy) => (
            <div key={copy.id}
                 className="flex items-center justify-between px-2.5 py-1.5 rounded-lg"
                 style={{ background:"var(--bg-subtle)", border:"1px solid var(--border-light)" }}>
              <div className="flex items-center gap-2">
                <Hash size={10} style={{ color:"var(--accent-amber)", opacity:0.7 }} />
                <span className="text-[11px] font-mono font-bold" style={{ color:"var(--text-primary)" }}>
                  {copy.accession_number}
                </span>
                {copy.date_acquired && (
                  <span className="text-[10px]" style={{ color:"var(--text-muted)" }}>
                    · {new Date(copy.date_acquired).getFullYear()}
                  </span>
                )}
              </div>
              <StatusPill status={copy.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── main component ──────────────────────────────────── */
export default function BookView({ book }) {
  // Use display_status (derived from book_copies) when available.
  // Falls back to raw status + quantity check for books without copies.
  const effectiveStatus = book?.display_status || book?.status;
  const availCopies = book?.available_copies;
  const isAvailable = effectiveStatus !== "OutOfStock" && (
    availCopies !== undefined ? Number(availCopies) > 0 : (book?.quantity ?? 0) > 0
  );

  // copies may come from getById (book.copies) or be fetched via CopiesBlock
  const initialCopies = book?.copies || [];

  return (
    <div className="flex flex-col gap-3">

      {/* ── Hero ── */}
      <div className="flex items-center gap-4 px-4 py-3 rounded-xl"
           style={{
             background:"linear-gradient(135deg,rgba(184,122,0,0.08) 0%,rgba(184,122,0,0.03) 100%)",
             border:"1.5px solid rgba(184,122,0,0.18)",
           }}>
        <div className="w-14 h-[72px] shrink-0 rounded-lg flex items-center justify-center shadow-md"
             style={{
               background:"linear-gradient(145deg,var(--accent-amber),#c87800)",
               boxShadow:"3px 3px 10px rgba(184,122,0,0.28),inset -2px 0 4px rgba(0,0,0,0.12)",
             }}>
          <BookOpen size={26} className="text-white" />
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider"
                  style={{ background:"rgba(184,122,0,0.12)", color:"var(--accent-amber)", border:"1px solid rgba(184,122,0,0.2)" }}>
              {book?.materialType || "Book"}
            </span>
            <StatusPill status={isAvailable ? "Available" : "Borrowed"} />
          </div>

          <h1 className="text-base font-black leading-tight truncate" style={{ color:"var(--text-primary)" }}>
            {book?.title || "Untitled"}
          </h1>
          {book?.subtitle && (
            <p className="text-[11px] font-medium truncate" style={{ color:"var(--text-secondary)" }}>
              {book.subtitle}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
            {(book?.authors||book?.author) && (
              <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color:"var(--text-muted)" }}>
                <User size={10} className="opacity-60" /> {book.authors||book.author}
              </span>
            )}
            {(book?.date||book?.year) && (
              <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color:"var(--text-muted)" }}>
                <Calendar size={10} className="opacity-60" /> {book.date||book.year}
              </span>
            )}
            {book?.edition && (
              <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color:"var(--text-muted)" }}>
                <Copy size={10} className="opacity-60" /> {book.edition} Ed.
              </span>
            )}
            {/* Copy count chip */}
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-black"
                  style={{ background:"var(--bg-subtle)", border:"1px solid var(--border-light)", color:"var(--text-primary)" }}>
              <Package size={10} style={{ color:"var(--accent-amber)" }} />
              {book?.quantity ?? "—"} {book?.quantity === 1 ? "copy" : "copies"}
            </span>
          </div>
        </div>
      </div>

      {/* ── 2-col grid ── */}
      <div className="grid grid-cols-2 gap-3">

        <Block icon={BookMarked} title="Title Information" cols={2}>
          <Cell icon={Hash}   label="Call No."      value={book?.callNumber}               accent />
          <Cell icon={Hash}   label="Accession No." value={book?.accessionNumber}          accent />
          <Cell icon={User}   label="Authors"       value={book?.authors||book?.author}    span2 />
          <Cell icon={Copy}   label="Edition"       value={book?.edition} />
          <Cell icon={Layers} label="Volume"        value={book?.volume} />
        </Block>

        <Block icon={Fingerprint} title="Standard Numbers" cols={1}>
          <Cell icon={Hash} label="ISBN" value={book?.isbn} mono />
          <Cell icon={Hash} label="ISSN" value={book?.issn} mono />
          <Cell icon={Hash} label="LCCN" value={book?.lccn} mono />
        </Block>

        <Block icon={Building2} title="Publication Information" cols={2}>
          <Cell icon={MapPin}    label="Place"     value={book?.place} />
          <Cell icon={Calendar}  label="Date"      value={book?.date||book?.year} />
          <Cell icon={Tag}       label="Collection" value={book?.collection} />
          <Cell icon={Building2} label="Publisher" value={book?.publisher} span2 />
        </Block>

        <Block icon={Ruler} title="Physical Description" cols={2}>
          <Cell icon={FileText} label="Extent"  value={book?.extent} />
          <Cell icon={Ruler}    label="Size"    value={book?.size} />
          <Cell icon={FileText} label="Pages"   value={book?.pages} />
          <Cell icon={Archive}  label="Shelf"   value={book?.shelf} />
          {book?.otherDetails && (
            <Cell icon={Info} label="Other Details" value={book.otherDetails} span2 />
          )}
        </Block>

        {/* Copies — full width */}
        <CopiesBlock bookId={book?.id} initialCopies={initialCopies} />
      </div>

      {/* Description */}
      {book?.description && (
        <div className="flex flex-col gap-1.5 px-3 py-2.5 rounded-xl border"
             style={{ background:"var(--bg-surface)", borderColor:"var(--border-light)" }}>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                 style={{ background:"rgba(184,122,0,0.12)" }}>
              <Info size={11} style={{ color:"var(--accent-amber)" }} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.15em]" style={{ color:"var(--text-secondary)" }}>
              Description
            </span>
          </div>
          <p className="text-[12px] leading-relaxed line-clamp-3" style={{ color:"var(--text-secondary)" }}>
            {book.description}
          </p>
        </div>
      )}
    </div>
  );
}