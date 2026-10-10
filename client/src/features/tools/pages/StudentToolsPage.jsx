import { useMemo, useState } from "react";
import { Package, Search, X, AlertCircle, RefreshCw } from "lucide-react";
import useTools from "../hooks/useTools";
import ToolCard from "../components/ToolCard";
import { TOOL_CATEGORIES } from "../utils/toolsHelpers";

function downloadTool(toolId) {
  window.open(`/api/tools/${toolId}/download`, "_blank");
}

export default function StudentToolsPage() {
  const { tools, loading, error, loadTools } = useTools();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Categories are derived from what the student can actually see, so the
  // filter never offers a category with no available tools.
  const categories = useMemo(() => {
    const keys = new Set(tools.map(tool => tool.category).filter(Boolean));
    return TOOL_CATEGORIES.filter(c => keys.has(c.key));
  }, [tools]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return tools.filter(tool => {
      const matchQ = !q
        || (tool.title || "").toLowerCase().includes(q)
        || (tool.description || "").toLowerCase().includes(q);
      const matchCat = categoryFilter === "all" || tool.category === categoryFilter;
      return matchQ && matchCat;
    });
  }, [tools, query, categoryFilter]);

  const hasFilters = Boolean(query.trim()) || categoryFilter !== "all";

  function clearFilters() {
    setQuery("");
    setCategoryFilter("all");
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 text-[22px] font-bold" style={{ color: "var(--text-primary)" }}>
            <Package size={22} style={{ color: "var(--accent-amber)" }} />
            Tools
          </h1>
          <p className="mt-0.5 text-[13px]" style={{ color: "var(--text-secondary)" }}>
            Download templates, installers, and resources shared by the library
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] max-w-md flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search tools..."
            className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none"
            style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}
          />
        </div>
        <label className="min-w-[160px]">
          <span className="sr-only">Filter tools by category</span>
          <select
            value={categoryFilter}
            onChange={event => setCategoryFilter(event.target.value)}
            className="w-full cursor-pointer rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            <option value="all">All categories</option>
            {categories.map(c => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
        </label>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium"
            style={{ color: "var(--accent-amber)" }}
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {loading ? (
        <div role="status" className="flex items-center justify-center py-20">
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Loading tools…</span>
        </div>
      ) : error ? (
        <div
          className="rounded-xl border p-4 text-sm"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
        >
          <p role="alert" className="flex items-center gap-2 text-red-400">
            <AlertCircle size={15} />
            {error}
          </p>
          <button
            type="button"
            onClick={() => loadTools()}
            className="mt-3 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white"
            style={{ background: "var(--accent-amber)" }}
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-20"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
        >
          <Package size={48} className="mb-3 opacity-20" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            {hasFilters ? "No tools match your search." : "No tools available yet."}
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-2 text-xs font-medium"
              style={{ color: "var(--accent-amber)" }}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 xl:gap-5">
          {filtered.map(tool => (
            <ToolCard key={tool.id} tool={tool} onDownload={downloadTool} />
          ))}
        </div>
      )}
    </div>
  );
}
