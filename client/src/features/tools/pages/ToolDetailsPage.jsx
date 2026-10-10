import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Package, AlertCircle, Loader2, Calendar, User } from "lucide-react";
import { fetchTool } from "../api/toolsApi";
import { getCategoryConfig, getFileTypeLabel, formatFileSize } from "../utils/toolsHelpers";

export default function ToolDetailsPage() {
  const { toolId } = useParams();
  const navigate = useNavigate();
  const [tool, setTool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!toolId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchTool(toolId);
        if (!cancelled) {
          if (res.success) {
            setTool(res.data);
          } else {
            setError(res.error || "Tool not found");
          }
        }
      } catch {
        if (!cancelled) setError("Could not connect to server");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [toolId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--accent-amber)" }} />
      </div>
    );
  }

  if (error || !tool) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <AlertCircle className="h-10 w-10" style={{ color: "var(--text-muted)" }} />
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{error || "Tool not found"}</p>
        <button
          onClick={() => navigate("/dashboard/student-tools")}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
          style={{ background: "var(--accent-amber)", color: "#fff" }}
        >
          <ArrowLeft size={14} /> Back to Tools
        </button>
      </div>
    );
  }

  const catCfg = getCategoryConfig(tool.category);
  const fileTypeLabel = getFileTypeLabel(tool.file_type);
  const createdDate = tool.created_at ? new Date(tool.created_at).toLocaleDateString() : null;
  const updatedDate = tool.updated_at ? new Date(tool.updated_at).toLocaleDateString() : null;

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={() => navigate("/dashboard/student-tools")}
        className="flex items-center gap-2 text-sm font-medium transition-colors w-fit"
        style={{ color: "var(--text-secondary)" }}
        onMouseEnter={(e) => { e.target.style.color = "var(--accent-amber)"; }}
        onMouseLeave={(e) => { e.target.style.color = "var(--text-secondary)"; }}
      >
        <ArrowLeft size={14} /> Back to Tools
      </button>

      <div
        className="flex flex-col items-center gap-6 rounded-2xl border p-4 sm:p-6 md:flex-row md:items-start lg:gap-10 lg:p-8"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
      >
        {/* Thumbnail */}
        <div className="shrink-0">
          <div
            className="mx-auto aspect-[3/4] w-56 overflow-hidden rounded-xl border shadow-xl sm:w-64"
            style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
          >
            {tool.thumbnail_url ? (
              <img
                src={tool.thumbnail_url}
                alt={tool.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Package size={48} style={{ color: "var(--text-muted)", opacity: 0.3 }} />
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="flex flex-col gap-3 flex-1 min-w-0">
          <span
            className="w-fit rounded-md px-2 py-1 text-[11px] font-semibold uppercase"
            style={{ background: catCfg.bg, color: catCfg.color }}
          >
            {catCfg.label}
          </span>

          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            {tool.title}
          </h1>

          {tool.description && (
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {tool.description}
            </p>
          )}

          <div className="flex flex-wrap gap-2 mt-2">
            <span
              className="px-2 py-1 rounded-lg text-[11px] font-semibold"
              style={{ background: "rgba(238,162,58,0.12)", color: "var(--accent-amber)" }}
            >
              {fileTypeLabel}
            </span>
            <span
              className="px-2 py-1 rounded-lg text-[11px] font-medium border"
              style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-secondary)" }}
            >
              {formatFileSize(tool.file_size)}
            </span>
            {tool.is_active !== false && (
              <span
                className="px-2 py-1 rounded-lg text-[11px] font-semibold border"
                style={{ background: "rgba(34,197,94,0.12)", borderColor: "rgba(34,197,94,0.3)", color: "#22c55e" }}
              >
                Active
              </span>
            )}
          </div>

          {/* Bibliographic info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
            {createdDate && (
              <InfoRow icon={Calendar} label="Created On" value={createdDate} />
            )}
            {updatedDate && updatedDate !== createdDate && (
              <InfoRow icon={Calendar} label="Updated On" value={updatedDate} />
            )}
            {tool.creator_name && (
              <InfoRow icon={User} label="Created By" value={tool.creator_name} />
            )}
          </div>

          {/* Download */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => window.open(`/api/tools/${tool.id}/download`, "_blank")}
              className="flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-opacity"
              style={{ background: "var(--accent-amber)" }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              <Download size={16} /> Download Tool
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon size={13} style={{ color: "var(--text-muted)" }} />
      <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      <span className="text-sm" style={{ color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}
