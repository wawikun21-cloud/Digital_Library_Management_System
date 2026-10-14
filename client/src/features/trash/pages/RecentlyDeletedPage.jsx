import { useMemo, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import {
  Trash2, RotateCcw, Search, Trash, ShieldAlert, ChevronDown, AlertCircle, Clock,
} from "lucide-react";
import ConfirmationModal from "../../../components/ConfirmationModal";
import Toast from "../../../components/Toast";
import useTrash from "../hooks/useTrash";
import ExpiryBadge from "../components/ExpiryBadge";
import { TYPE_CONFIG, FILTER_TABS, SORT_OPTIONS, SORT_LABELS } from "../utils/trashConstants";
import { filterAndSort, formatDate } from "../utils/trashHelpers";

export default function RecentlyDeletedPage() {
  const { items, loading, setItems, restoreItem, permanentlyDeleteItem, permanentlyDeleteAll } = useTrash();
  const { hasPermissionAction } = useAuth();

  // ── Per-action permission gates (server enforces the same) ──
  const canRestore  = hasPermissionAction("manage_trash", "restore");
  const canDelete   = hasPermissionAction("manage_trash", "delete");
  const canDeleteAll = canDelete;

  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [sortOpen, setSortOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null });
  const [deleteAllModal, setDeleteAllModal] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", type: "info" });

  const showToast = (message, type = "info") => setToast({ visible: true, message, type });
  const hideToast = () => setToast(p => ({ ...p, visible: false }));

  const filtered = useMemo(
    () => filterAndSort(items, query, filterType, sortBy),
    [items, query, filterType, sortBy]
  );

  const counts = useMemo(() => {
    const c = { all: items.length };
    Object.keys(TYPE_CONFIG).forEach(t => {
      c[t] = items.filter(i => i.entity_type === t).length;
    });
    return c;
  }, [items]);

  const handleRestore = async (item) => {
    const res = await restoreItem(item);
    if (res.success) showToast(`Restored "${item.entity_title}" successfully.`, "success");
    else showToast(res.error || "Failed to restore item", "error");
  };

  const confirmPermanentDelete = async () => {
    if (!deleteModal.item) return;
    const res = await permanentlyDeleteItem(deleteModal.item);
    if (res.success) showToast("Item permanently deleted.", "success");
    else showToast(res.error || "Failed to delete item", "error");
    setDeleteModal({ open: false, item: null });
  };

  const confirmDeleteAll = async () => {
    const res = await permanentlyDeleteAll(filterType);
    if (res.success) {
      showToast(`${res.data?.count || 0} item(s) permanently deleted.`, "success");
    } else showToast(res.error || "Failed to empty trash", "error");
    setDeleteAllModal(false);
  };

  const filterLabel = FILTER_TABS.find(t => t.key === filterType)?.label;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            
          </h1>
          <p className="text-[12px] sm:text-[13px]" style={{ color: "var(--text-secondary)" }}>
            
          </p>
        </div>
        {canDeleteAll && items.length > 0 && (
          <button
            onClick={() => setDeleteAllModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] sm:text-[13px] font-semibold transition-all self-start sm:self-auto"
            style={{ background: "rgba(220,38,38,0.1)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.2)" }}
          >
            <ShieldAlert size={14} />
            Delete {filterType !== "all" ? "Filtered" : "All"} Permanently
          </button>
        )}
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterType(tab.key)}
            className="px-2.5 py-1.5 rounded-full text-[11px] sm:text-[12px] font-semibold transition-colors duration-150 border-[1.5px] whitespace-nowrap"
            style={filterType === tab.key
              ? { background: "#fffd17", color: "#2a3e82" }
              : { background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-secondary)" }
            }
          >
            {tab.label}
            {counts[tab.key] > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={filterType === tab.key
                  ? { background: "rgba(255,255,255,0.25)", color: "#ffffff" }
                  : { background: "var(--bg-hover)", color: "var(--text-muted)" }
                }>
                {counts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
        >
          <Search size={14} style={{ color: "var(--text-secondary)" }} className="shrink-0" />
          <input
            className="border-none outline-none text-[12px] sm:text-[13px] bg-transparent w-full"
            style={{ color: "var(--text-primary)" }}
            placeholder="Search deleted items..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{ color: "var(--text-muted)" }}>×</button>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setSortOpen(o => !o)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] sm:text-[13px] font-medium whitespace-nowrap"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
          >
            Sort: {SORT_LABELS[sortBy]}
            <ChevronDown size={14} />
          </button>
          {sortOpen && (
            <div
              className="absolute right-0 top-full mt-1 z-50 rounded-lg overflow-hidden min-w-[160px]"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)" }}
            >
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setSortBy(opt.value); setSortOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-[12px] transition-colors"
                  style={{
                    color: sortBy === opt.value ? "var(--accent-amber)" : "var(--text-primary)",
                    background: sortBy === opt.value ? "rgba(238,162,58,0.08)" : "transparent",
                    fontWeight: sortBy === opt.value ? "600" : "400",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[600px]">
            <thead>
              <tr style={{ background: "var(--bg-hover)" }}>
                {["Type", "Item Details", "Deleted At", "Expires", "Actions"].map(h => (
                  <th key={h}
                    className="text-left px-4 sm:px-5 py-3 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: "var(--text-secondary)", borderBottom: "1px solid var(--border-light)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5}>
                    <div className="flex items-center justify-center gap-3 py-16" style={{ color: "var(--text-muted)" }}>
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin opacity-60" />
                      <span className="text-[13px]">Loading deleted items...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="flex flex-col items-center justify-center gap-3 py-20" style={{ color: "var(--text-muted)" }}>
                      <Trash2 size={40} strokeWidth={1.5} />
                      <div className="text-center">
                        <p className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
                          {query || filterType !== "all" ? "No matching items found" : "Trash is empty"}
                        </p>
                        <p className="text-[13px] mt-0.5">
                          {query || filterType !== "all"
                            ? "Try adjusting your search or filter."
                            : "Items you delete will appear here for 30 days."}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(item => {
                  const cfg  = TYPE_CONFIG[item.entity_type] || TYPE_CONFIG.book;
                  const Icon = cfg.Icon;
                  const meta = item.entity_meta || {};

                  return (
                    <tr key={item.id} className="transition-colors duration-100">
                      <td className="px-4 sm:px-5 py-3 sm:py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg" style={{ background: cfg.bg, color: cfg.color }}>
                            <Icon size={15} />
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline"
                            style={{ color: "var(--text-secondary)" }}>
                            {cfg.label}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 sm:px-5 py-3 sm:py-4" style={{ maxWidth: 280 }}>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[13px] font-semibold truncate block"
                            style={{ color: "var(--text-primary)" }}>
                            {item.entity_title}
                          </span>
                          {(meta.subtitle || meta.author || meta.course) && (
                            <span className="text-[11px] truncate block" style={{ color: "var(--text-secondary)" }}>
                              {meta.subtitle || meta.author || meta.course}
                            </span>
                          )}
                          {meta.status && (
                            <span className="text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>
                              Status: {meta.status}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 sm:px-5 py-3 sm:py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-[11px] sm:text-[12px]"
                          style={{ color: "var(--text-secondary)" }}>
                          <Clock size={13} className="shrink-0" />
                          {formatDate(item.deleted_at)}
                        </div>
                        {item.deleted_by && (
                          <span className="text-[10px] mt-0.5 block" style={{ color: "var(--text-muted)" }}>
                            by {item.deleted_by}
                          </span>
                        )}
                      </td>

                      <td className="px-4 sm:px-5 py-3 sm:py-4 whitespace-nowrap">
                        <ExpiryBadge secondsLeft={item.seconds_until_expiry} />
                      </td>

                      <td className="px-4 sm:px-5 py-3 sm:py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {canRestore && (
                            <button
                              onClick={() => handleRestore(item)}
                              title="Restore"
                              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-150"
                              style={{ background: "rgba(50,102,127,0.1)", color: "#32667F" }}
                            >
                              <RotateCcw size={13} className="shrink-0" />
                              <span className="hidden sm:inline">Restore</span>
                            </button>
                          )}
                          {canDelete && (
                          <button
                            onClick={() => setDeleteModal({ open: true, item })}
                            title="Delete Permanently"
                            className="p-1.5 rounded-lg transition-all duration-150"
                            style={{ background: "rgba(220,38,38,0.1)", color: "#dc2626" }}
                          >
                            <Trash size={15} />
                          </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 && (
          <div
            className="px-5 py-2.5 text-[11px] flex items-center justify-between"
            style={{ borderTop: "1px solid var(--border)", color: "var(--text-muted)" }}
          >
            <span>Showing {filtered.length} of {items.length} deleted item{items.length !== 1 ? "s" : ""}</span>
            <span className="flex items-center gap-1">
              <AlertCircle size={11} />
              Items auto-purge after 30 days
            </span>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={deleteModal.open}
        title="Permanently Delete Item"
        message={`Are you sure you want to permanently delete "${deleteModal.item?.entity_title}"? This cannot be undone.`}
        confirmText="Delete Permanently"
        cancelText="Cancel"
        type="danger"
        onConfirm={confirmPermanentDelete}
        onCancel={() => setDeleteModal({ open: false, item: null })}
      />

      <ConfirmationModal
        isOpen={deleteAllModal}
        title={filterType !== "all" ? `Delete All ${filterLabel}` : "Empty Entire Trash"}
        message={
          filterType !== "all"
            ? `This will permanently delete all ${counts[filterType]} ${filterLabel?.toLowerCase()} items in the trash. This action cannot be undone.`
            : `This will permanently delete all ${items.length} item(s) in the trash across all categories. This action cannot be undone.`
        }
        confirmText="Yes, Delete All"
        cancelText="Cancel"
        type="danger"
        onConfirm={confirmDeleteAll}
        onCancel={() => setDeleteAllModal(false)}
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
