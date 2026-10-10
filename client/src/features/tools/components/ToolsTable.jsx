import { Edit, Trash2, Download } from "lucide-react";
import { formatFileSize, getCategoryConfig } from "../utils/toolsHelpers";

export default function ToolsTable({ tools, loading, onEdit, onDelete, onDownload }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-16" style={{ color: "var(--text-muted)" }}>
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin opacity-60" />
        <span className="text-sm">Loading tools...</span>
      </div>
    );
  }

  if (!tools.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20" style={{ color: "var(--text-muted)" }}>
        <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>No tools found</p>
        <p className="text-sm">Tools you add will appear here.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr style={{ background: "var(--bg-hover)", borderBottom: "1px solid var(--border-light)" }}>
            {["Thumbnail", "Title", "Category", "File", "Size", "Status", "Actions"].map(h => (
              <th key={h} className="text-left px-4 sm:px-5 py-3 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tools.map(tool => {
            const catCfg = getCategoryConfig(tool.category);
            return (
              <tr
                key={tool.id}
                className="transition-colors duration-100"
                onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <td className="px-4 sm:px-5 py-3">
                  {tool.thumbnail_url ? (
                    <img src={tool.thumbnail_url} alt={tool.title} className="w-10 h-10 object-cover rounded-lg" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: catCfg.bg, color: catCfg.color }}>
                      <catCfg.Icon size={16} />
                    </div>
                  )}
                </td>
                <td className="px-4 sm:px-5 py-3" style={{ maxWidth: 280 }}>
                  <span className="text-[13px] font-semibold truncate block" style={{ color: "var(--text-primary)" }}>{tool.title}</span>
                  {tool.description && (
                    <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--text-secondary)" }}>{tool.description}</p>
                  )}
                </td>
                <td className="px-4 sm:px-5 py-3 text-[12px] whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>{catCfg.label}</td>
                <td className="px-4 sm:px-5 py-3 text-[12px] whitespace-nowrap" style={{ color: "var(--text-muted)" }}>{tool.file_type}</td>
                <td className="px-4 sm:px-5 py-3 text-[12px] whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>{formatFileSize(tool.file_size)}</td>
                <td className="px-4 sm:px-5 py-3 whitespace-nowrap">
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                    style={tool.is_active
                      ? { background: "rgba(21,128,61,0.12)", color: "#15803d" }
                      : { background: "rgba(220,38,38,0.12)", color: "#dc2626" }}
                  >
                    {tool.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 sm:px-5 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onDownload(tool.id)}
                      title="Download"
                      className="p-1.5 rounded-lg transition-colors duration-150"
                      style={{ background: "rgba(50,102,127,0.1)", color: "#32667F" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(50,102,127,0.2)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(50,102,127,0.1)"}
                    >
                      <Download size={13} />
                    </button>
                    <button
                      onClick={() => onEdit(tool)}
                      title="Edit"
                      className="p-1.5 rounded-lg transition-colors duration-150"
                      style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(238,162,58,0.15)"}
                      onMouseLeave={e => e.currentTarget.style.background = "var(--bg-hover)"}
                    >
                      <Edit size={13} />
                    </button>
                    <button
                      onClick={() => onDelete(tool)}
                      title="Delete"
                      className="p-1.5 rounded-lg transition-colors duration-150"
                      style={{ background: "rgba(220,38,38,0.1)", color: "#dc2626" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(220,38,38,0.2)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(220,38,38,0.1)"}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
