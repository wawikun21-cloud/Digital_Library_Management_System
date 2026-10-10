import { useNavigate } from "react-router-dom";
import { Download } from "lucide-react";
import { formatFileSize, getCategoryConfig, getFileTypeLabel } from "../utils/toolsHelpers";

export default function ToolCard({ tool, onDownload }) {
  const navigate = useNavigate();
  const catCfg = getCategoryConfig(tool.category);

  return (
    <article
      className="group relative overflow-hidden rounded-xl border transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent-amber)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
    >
      <button type="button" onClick={() => navigate(`/dashboard/student-tools/${tool.id}`)} className="flex w-full flex-col gap-2 text-left">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-xl" style={{ background: "var(--bg-primary)" }}>
          {tool.thumbnail_url ? (
            <img src={tool.thumbnail_url} alt={tool.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center"><catCfg.Icon size={32} style={{ color: "var(--text-muted)", opacity: 0.3 }} /></div>
          )}
          <span className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
            <span className="inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold text-white" style={{ background: catCfg.color }}>{getFileTypeLabel(tool.file_type)}</span>
          </span>
        </div>
        <div className="flex flex-col gap-0.5 px-3 pb-3">
          <h3 className="line-clamp-1 text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>{tool.title}</h3>
          {tool.description && <p className="line-clamp-1 text-[10px]" style={{ color: "var(--text-secondary)" }}>{tool.description}</p>}
          <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>{formatFileSize(tool.file_size)}</span>
        </div>
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); if (onDownload) onDownload(tool.id); else window.open(`/api/tools/${tool.id}/download`, "_blank"); }}
        title={`Download ${tool.title}`}
        className="absolute right-1 top-1 z-10 flex h-8 w-8 items-center justify-center rounded-full border shadow-md text-[var(--text-primary)]"
        style={{ background: "rgba(255,255,255,0.94)", borderColor: "rgba(15,23,42,0.12)" }}
      >
        <Download size={14} />
      </button>
    </article>
  );
}
