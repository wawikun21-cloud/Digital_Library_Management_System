import { ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";

function IconButton({ label, onClick, disabled, danger, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-40"
      style={{ background: "var(--bg-hover)", color: danger ? "#dc2626" : "var(--text-secondary)" }}
    >
      {children}
    </button>
  );
}

export default function HeroSlideRow({ slide, index, total, busy, onMove, onToggle, onEdit, onDelete }) {
  return (
    <li
      className="flex flex-wrap items-center gap-3 rounded-xl border p-3"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border)", opacity: slide.is_active ? 1 : 0.7 }}
    >
       <img
         src={slide.image_url}
         alt=""
         className="h-14 w-28 shrink-0 rounded-lg object-cover"
         style={{ background: "var(--bg-primary)" }}
       />
       <div className="min-w-0 flex-1">
         <p className="truncate text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
           Slide #{slide.id}
         </p>
       </div>

       <label className="flex items-center gap-2 text-[12px]" style={{ color: "var(--text-secondary)" }}>
         <input
           type="checkbox"
           checked={Boolean(slide.is_active)}
           disabled={busy || !onToggle}
           onChange={() => onToggle?.(slide)}
         />
         {slide.is_active ? "Visible" : "Hidden"}
       </label>

       <div className="flex items-center gap-1">
         {onMove && (
           <>
             <IconButton label="Move slide up" onClick={() => onMove(slide.id, -1)} disabled={busy || index === 0}>
               <ChevronUp size={16} />
             </IconButton>
             <IconButton label="Move slide down" onClick={() => onMove(slide.id, 1)} disabled={busy || index === total - 1}>
               <ChevronDown size={16} />
             </IconButton>
           </>
         )}
         {onEdit && <IconButton label="Edit slide" onClick={() => onEdit(slide)} disabled={busy}><Pencil size={15} /></IconButton>}
         {onDelete && (
           <IconButton label="Delete slide" onClick={() => onDelete(slide)} disabled={busy} danger>
             <Trash2 size={15} />
           </IconButton>
         )}
       </div>
    </li>
  );
}
