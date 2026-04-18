import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Trash2, RotateCcw, Search, Trash, BookOpen,
  ClipboardList, AlertCircle, Clock, Users, UserCheck,
  CalendarCheck, BookMarked, ChevronDown, ShieldAlert,
} from "lucide-react";
import ConfirmationModal from "../components/ConfirmationModal";
import Toast from "../components/Toast";
import {
  fetchTrash,
  restoreTrashItem,
  permanentDeleteTrashItem,
  permanentDeleteAllTrash,
} from "../services/api/trashApi";

// ── Entity type config ────────────────────────────────────
const TYPE_CONFIG = {
  book:        { label: "NEMCO Book",   Icon: BookOpen,      color: "#32667F",  bg: "rgba(50,102,127,0.1)"  },
  lexora_book: { label: "Lexora Book",  Icon: BookMarked,    color: "#7c3aed",  bg: "rgba(124,58,237,0.1)"  },
  student:     { label: "Student",      Icon: Users,         color: "#0e7490",  bg: "rgba(14,116,144,0.1)"  },
  faculty:     { label: "Faculty",      Icon: UserCheck,     color: "#b45309",  bg: "rgba(180,83,9,0.1)"    },
  transaction: { label: "Transaction",  Icon: ClipboardList, color: "#b87a1a",  bg: "rgba(238,162,58,0.1)"  },
  attendance:  { label: "Attendance",   Icon: CalendarCheck, color: "#15803d",  bg: "rgba(21,128,61,0.1)"   },
};

const FILTER_TABS = [
  { key: "all",        label: "All"          },
  { key: "book",       label: "NEMCO Books"  },
  { key: "lexora_book",label: "Lexora Books" },
  { key: "student",    label: "Students"     },
  { key: "faculty",    label: "Faculty"      },
  { key: "transaction",label: "Transactions" },
  { key: "attendance", label: "Attendance"   },
];

// ── Helpers ───────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function ExpiryBadge({ secondsLeft }) {
  const days = Math.floor(secondsLeft / 86400);
  if (days > 7) return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
      style={{ background: "rgba(21,128,61,0.1)", color: "#15803d" }}>
      {days}d left
    </span>
  );
  if (days > 2) return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
      style={{ background: "rgba(234,139,51,0.1)", color: "#c05a0a" }}>
      {days}d left
    </span>
  );
  const hours = Math.floor(secondsLeft / 3600);
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
      style={{ background: "rgba(220,38,38,0.1)", color: "#dc2626" }}>
      {days > 0 ? `${days}d` : `${hours}h`} left
    </span>
  );
}

// ══════════════════════════════════════════════════════════
export default function RecentlyDeleted() {
  const [items,       setItems]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [query,       setQuery]       = useState("");
  const [filterType,  setFilterType]  = useState("all");
  const [sortBy,      setSortBy]      = useState("newest");
  const [sortOpen,    setSortOpen]    = useState(false);

  // Modals
  const [deleteModal,    setDeleteModal]    = useState({ open: false, item: null });
  const [deleteAllModal, setDeleteAllModal] = useState(false);
  const [toast,          setToast]          = useState({ visible: false, message: "", type: "info" });

  // ── Fetch ────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchTrash();
      if (res.success) setItems(res.data || []);
      else showToast(res.error || "Failed to load trash", "error");
    } catch {
      showToast("Could not connect to server", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Toast ────────────────────────────────────────────────
  const showToast = (message, type = "info") =>
    setToast({ visible: true, message, type });
  const hideToast = () =>
    setToast(p => ({ ...p, visible: false }));

  // ── Filtered + sorted ────────────────────────────────────
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    let result = items.filter(item => {
      const meta  = item.entity_meta || {};
      const title = (item.entity_title || "").toLowerCase();
      const sub   = (meta.subtitle || meta.author || "").toLowerCase();
      const matchQ = !q || title.includes(q) || sub.includes(q);
      const matchT = filterType === "all" || item.entity_type === filterType;
      return matchQ && matchT;
    });

    if (sortBy === "newest")   result = [...result].sort((a, b) => new Date(b.deleted_at) - new Date(a.deleted_at));
    if (sortBy === "oldest")   result = [...result].sort((a, b) => new Date(a.deleted_at) - new Date(b.deleted_at));
    if (sortBy === "expiring") result = [...result].sort((a, b) => a.seconds_until_expiry - b.seconds_until_expiry);
    if (sortBy === "type")     result = [...result].sort((a, b) => a.entity_type.localeCompare(b.entity_type));

    return result;
  }, [items, query, filterType, sortBy]);

  // ── Counts per type ──────────────────────────────────────
  const counts = useMemo(() => {
    const c = { all: items.length };
    Object.keys(TYPE_CONFIG).forEach(t => {
      c[t] = items.filter(i => i.entity_type === t).length;
    });
    return c;
  }, [items]);

  // ── Restore ──────────────────────────────────────────────
  const handleRestore = async (item) => {
    try {
      const res = await restoreTrashItem(item.id);
      if (res.success) {
        setItems(prev => prev.filter(i => i.id !== item.id));
        showToast(`Restored "${item.entity_title}" successfully.`, "success");
      } else {
        showToast(res.error || "Failed to restore item", "error");
      }
    } catch {
      showToast("Failed to connect to server", "error");
    }
  };

  // ── Permanent delete one ─────────────────────────────────
  const confirmPermanentDelete = async () => {
    if (!deleteModal.item) return;
    try {
      const res = await permanentDeleteTrashItem(deleteModal.item.id);
      if (res.success) {
        setItems(prev => prev.filter(i => i.id !== deleteModal.item.id));
        showToast("Item permanently deleted.", "success");
      } else {
        showToast(res.error || "Failed to delete item", "error");
      }
    } catch {
      showToast("Failed to connect to server", "error");
    }
    setDeleteModal({ open: false, item: null });
  };

  // ── Permanent delete all ─────────────────────────────────
  const confirmDeleteAll = async () => {
    try {
      const typeParam = filterType !== "all" ? filterType : null;
      const res = await permanentDeleteAllTrash(typeParam);
      if (res.success) {
        if (filterType === "all") {
          setItems([]);
        } else {
          setItems(prev => prev.filter(i => i.entity_type !== filterType));
        }
        showToast(`${res.data?.count || 0} item(s) permanently deleted.`, "success");
      } else {
        showToast(res.error || "Failed to empty trash", "error");
      }
    } catch {
      showToast("Failed to connect to server", "error");
    }
    setDeleteAllModal(false);
  };

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Recently Deleted
          </h1>
          <p className="text-[12px] sm:text-[13px]" style={{ color: "var(--text-secondary)" }}>
            Items are automatically purged after 30 days. Restore or permanently delete them below.
          </p>
        </div>

        {items.length > 0 && (
          <button
            onClick={() => setDeleteAllModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] sm:text-[13px] font-semibold transition-all self-start sm:self-auto"
            style={{ background: "rgba(220,38,38,0.1)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.2)" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(220,38,38,0.18)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(220,38,38,0.1)"}
          >
            <ShieldAlert size={14} />
            Delete {filterType !== "all" ? "Filtered" : "All"} Permanently
          </button>
        )}
      </div>

      {/* ── Type filter tabs ────────────────────────────────── */}
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

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        {/* Search */}
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
            <button onClick={() => setQuery("")} style={{ color: "var(--text-muted)" }}>
              ×
            </button>
          )}
        </div>

        {/* Sort dropdown */}
        <div className="relative">
          <button
            onClick={() => setSortOpen(o => !o)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] sm:text-[13px] font-medium whitespace-nowrap"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
          >
            Sort: {sortBy === "newest" ? "Newest First" : sortBy === "oldest" ? "Oldest First" : sortBy === "expiring" ? "Expiring Soon" : "By Type"}
            <ChevronDown size={14} />
          </button>
          {sortOpen && (
            <div
              className="absolute right-0 top-full mt-1 z-50 rounded-lg overflow-hidden min-w-[160px]"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)" }}
            >
              {[
                { val: "newest",   label: "Newest First"   },
                { val: "oldest",   label: "Oldest First"   },
                { val: "expiring", label: "Expiring Soon"  },
                { val: "type",     label: "By Type"        },
              ].map(opt => (
                <button
                  key={opt.val}
                  onClick={() => { setSortBy(opt.val); setSortOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-[12px] transition-colors"
                  style={{
                    color: sortBy === opt.val ? "var(--accent-amber)" : "var(--text-primary)",
                    background: sortBy === opt.val ? "rgba(238,162,58,0.08)" : "transparent",
                    fontWeight: sortBy === opt.val ? "600" : "400",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────── */}
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
                    <tr key={item.id}
                      className="transition-colors duration-100"
                      onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      {/* Type */}
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

                      {/* Item Details */}
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

                      {/* Deleted At */}
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

                      {/* Expires */}
                      <td className="px-4 sm:px-5 py-3 sm:py-4 whitespace-nowrap">
                        <ExpiryBadge secondsLeft={item.seconds_until_expiry} />
                      </td>

                      {/* Actions */}
                      <td className="px-4 sm:px-5 py-3 sm:py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRestore(item)}
                            title="Restore"
                            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-150"
                            style={{ background: "rgba(50,102,127,0.1)", color: "#32667F" }}
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(50,102,127,0.2)"}
                            onMouseLeave={e => e.currentTarget.style.background = "rgba(50,102,127,0.1)"}
                          >
                            <RotateCcw size={13} className="shrink-0" />
                            <span className="hidden sm:inline">Restore</span>
                          </button>
                          <button
                            onClick={() => setDeleteModal({ open: true, item })}
                            title="Delete Permanently"
                            className="p-1.5 rounded-lg transition-all duration-150"
                            style={{ background: "rgba(220,38,38,0.1)", color: "#dc2626" }}
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(220,38,38,0.2)"}
                            onMouseLeave={e => e.currentTarget.style.background = "rgba(220,38,38,0.1)"}
                          >
                            <Trash size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
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

      {/* ── Modals ──────────────────────────────────────────── */}
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
        title={filterType !== "all" ? `Delete All ${FILTER_TABS.find(t => t.key === filterType)?.label}` : "Empty Entire Trash"}
        message={
          filterType !== "all"
            ? `This will permanently delete all ${counts[filterType]} ${FILTER_TABS.find(t => t.key === filterType)?.label.toLowerCase()} items in the trash. This action cannot be undone.`
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