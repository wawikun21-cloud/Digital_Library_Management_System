import { useState, useCallback } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { Plus, Search } from "lucide-react";
import Toast from "../../../components/Toast";
import { useToast } from "../../../hooks/useToast";
import ConfirmationModal from "../../../components/ConfirmationModal";
import useTools from "../hooks/useTools";
import ToolsTable from "../components/ToolsTable";
import ToolFormModal from "../components/ToolFormModal";

const FIELD_INPUT =
  "w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 dark:bg-neutral-800";

export default function ToolsPage() {
  const { tools, loading, loadTools, addTool, editTool, removeTool } = useTools();
  const { hasPermissionAction } = useAuth();

  // ── Per-action permission gates (server enforces the same) ──
  const canCreate = hasPermissionAction("manage_tools", "create");
  const canEdit   = hasPermissionAction("manage_tools", "edit");
  const canDelete = hasPermissionAction("manage_tools", "delete");

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [modal, setModal] = useState({ open: false, mode: "create", tool: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, tool: null });
  const { toast, showToast, hideToast } = useToast();

  const filtered = tools.filter(tool => {
    const q = query.toLowerCase().trim();
    const matchQ = !q || (tool.title || "").toLowerCase().includes(q) || (tool.description || "").toLowerCase().includes(q);
    const matchCat = categoryFilter === "all" || tool.category === categoryFilter;
    return matchQ && matchCat;
  });

  const handleCreate = useCallback(async (toolData) => {
    const res = await addTool(toolData);
    if (res.success) {
      loadTools();
      setModal({ open: false, mode: "create", tool: null });
      showToast("Tool created successfully", "success");
    } else {
      showToast(res.error || "Failed to create tool", "error");
    }
  }, [addTool, loadTools, showToast]);

  const handleEdit = useCallback(async (toolData) => {
    const res = await editTool(modal.tool.id, toolData);
    if (res.success) {
      loadTools();
      setModal({ open: false, mode: "create", tool: null });
      showToast("Tool updated successfully", "success");
    } else {
      showToast(res.error || "Failed to update tool", "error");
    }
  }, [editTool, loadTools, showToast, modal.tool]);

  const handleDelete = useCallback(async () => {
    const res = await removeTool(deleteModal.tool.id);
    if (res.success) {
      loadTools();
      showToast("Tool deleted successfully", "success");
    } else {
      showToast(res.error || "Failed to delete tool", "error");
    }
    setDeleteModal({ open: false, tool: null });
  }, [removeTool, loadTools, showToast, deleteModal.tool]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Tools Management
          </h1>
          <p className="text-[12px] sm:text-[13px]" style={{ color: "var(--text-secondary)" }}>
            Manage downloadable tools for students
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setModal({ open: true, mode: "create", tool: null })}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)]"
          >
            <Plus size={16} />
            Add Tool
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search tools..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className={`${FIELD_INPUT} pl-9`}
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className={`${FIELD_INPUT} sm:w-48`}
        >
          <option value="all">All Categories</option>
          <option value="general">General</option>
          <option value="education">Education</option>
          <option value="design">Design</option>
          <option value="templates">Templates</option>
          <option value="software">Software</option>
          <option value="documents">Documents</option>
        </select>
      </div>

      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
      >
        <ToolsTable
          tools={filtered}
          loading={loading}
          onEdit={canEdit ? tool => setModal({ open: true, mode: "edit", tool }) : undefined}
          onDelete={canDelete ? tool => setDeleteModal({ open: true, tool }) : undefined}
          onDownload={toolId => window.open(`/api/tools/${toolId}/download`, "_blank")}
        />
      </div>

      <ToolFormModal
        open={modal.open}
        mode={modal.mode}
        tool={modal.tool}
        onClose={() => setModal({ open: false, mode: "create", tool: null })}
        onSubmit={modal.mode === "create" ? handleCreate : handleEdit}
      />

      <ConfirmationModal
        isOpen={deleteModal.open}
        title="Delete Tool"
        message={`Are you sure you want to delete "${deleteModal.tool?.title}"? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ open: false, tool: null })}
      />

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.visible}
        onClose={hideToast}
      />
    </div>
  );
}
