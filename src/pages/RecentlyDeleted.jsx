import { useState, useEffect } from "react";
import { 
  Trash2, RotateCcw, Search, Trash, 
  BookOpen, ClipboardList, AlertCircle, Clock
} from "lucide-react";
import ConfirmationModal from "../components/ConfirmationModal";
import Toast from "../components/Toast";

export default function RecentlyDeleted() {
  const [deletedItems, setDeletedItems] = useState([]);
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null });
  const [toast, setToast] = useState({ visible: false, message: "", type: "info" });

  useEffect(() => {
    const saved = localStorage.getItem("LEXORA_DELETED");
    if (saved) {
      setDeletedItems(JSON.parse(saved));
    }
  }, []);

  const saveToStorage = (items) => {
    setDeletedItems(items);
    localStorage.setItem("LEXORA_DELETED", JSON.stringify(items));
  };

  const showToast = (message, type = "info") => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  const handleRestore = (item) => {
    // 1. Remove from deleted items
    const newDeleted = deletedItems.filter(i => i.deletedAt !== item.deletedAt);
    saveToStorage(newDeleted);

    // 2. Add back to original storage
    const storageKey = item.type === "book" ? "LEXORA_BOOKS" : "LEXORA_BORROWED";
    const initialData = item.type === "book" ? [] : []; // We assume the storage exists or we initialize it
    
    const saved = localStorage.getItem(storageKey);
    const items = saved ? JSON.parse(saved) : [];
    
    // Add the item data back (excluding the deleted metadata)
    const { type, deletedAt, ...originalData } = item;
    localStorage.setItem(storageKey, JSON.stringify([...items, originalData]));

    showToast(`Successfully restored ${item.type === "book" ? "book" : "transaction"}.`, "success");
  };

  const confirmPermanentDelete = () => {
    if (deleteModal.item) {
      const newDeleted = deletedItems.filter(i => i.deletedAt !== deleteModal.item.deletedAt);
      saveToStorage(newDeleted);
      showToast("Item permanently deleted.", "success");
    }
    setDeleteModal({ open: false, item: null });
  };

  const filteredItems = deletedItems.filter(item => {
    const matchesQuery = (item.title || item.bookTitle || "").toLowerCase().includes(query.toLowerCase()) ||
                         (item.author || item.studentName || "").toLowerCase().includes(query.toLowerCase());
    const matchesType = filterType === "All" || 
                        (filterType === "Books" && item.type === "book") ||
                        (filterType === "Transactions" && item.type === "transaction");
    return matchesQuery && matchesType;
  });

  const formatDate = (iso) => {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Recently Deleted</h1>
        <p className="text-[12px] sm:text-[13px]" style={{ color: "var(--text-secondary)" }}>
          Manage items that were recently removed from the system. Restored items will appear back in their respective pages.
        </p>
      </div>

{/* Toolbar */}
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
        {/* Search */}
        <div 
          className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-lg flex-1 min-w-[120px] sm:min-w-[180px] max-w-full"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
        >
          <Search size={14} style={{ color: "var(--text-secondary)" }} className="shrink-0" />
          <input 
            className="border-none outline-none text-[12px] sm:text-[13px] bg-transparent w-full min-w-0"
            style={{ color: "var(--text-primary)" }}
            placeholder="Search deleted items..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        {/* Filter */}
        <div className="flex gap-1 sm:gap-1.5 flex-wrap">
          {["All", "Books", "Transactions"].map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className="px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-[12px] font-semibold transition-colors duration-150 border-[1.5px] whitespace-nowrap"
              style={filterType === t
                ? { background: "var(--accent-amber)", borderColor: "var(--accent-amber)", color: "#132F45" }
                : { background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-secondary)" }
              }
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Grid/Table */}
      <div 
        className="rounded-xl overflow-hidden min-h-[400px]"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[560px]">
            <thead>
              <tr style={{ background: "var(--bg-hover)" }}>
{["Type", "Item Details", "Deleted At", "Actions"].map(h => (
                  <th key={h} className="text-left px-3 sm:px-5 py-3 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap"
                      style={{ color: "var(--text-secondary)", borderBottom: "1px solid var(--border-light)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="flex flex-col items-center justify-center gap-3 py-20" style={{ color: "var(--text-muted)" }}>
                      <Trash2 size={40} strokeWidth={1.5} />
                      <div className="text-center">
                        <p className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>No deleted items found</p>
                        <p className="text-[13px]">Items you delete will show up here for 30 days.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
filteredItems.map((item, idx) => (
                  <tr key={idx}
                    className="transition-colors duration-100"
                    onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <td className="px-3 sm:px-5 py-3 sm:py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {item.type === "book" ? (
                          <div className="p-1.5 rounded-lg" style={{ background: "rgba(50,102,127,0.1)", color: "#32667F" }}>
                            <BookOpen size={16} />
                          </div>
                        ) : (
                          <div className="p-1.5 rounded-lg" style={{ background: "rgba(238,162,58,0.1)", color: "#b87a1a" }}>
                            <ClipboardList size={16} />
                          </div>
                        )}
                        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                          {item.type}
                        </span>
                      </div>
                    </td>
<td className="px-3 sm:px-5 py-3 sm:py-4" style={{ maxWidth: 260 }}>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[13px] font-semibold truncate block" style={{ color: "var(--text-primary)" }}>
                          {item.title || item.bookTitle}
                        </span>
                        <span className="text-[11px] truncate block" style={{ color: "var(--text-secondary)" }}>
                          {item.author || `Student: ${item.studentName}`}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-5 py-3 sm:py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-[11px] sm:text-[12px]" style={{ color: "var(--text-secondary)" }}>
                        <Clock size={14} className="shrink-0" />
                        {formatDate(item.deletedAt)}
                      </div>
                    </td>
                    <td className="px-3 sm:px-5 py-3 sm:py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleRestore(item)}
                          title="Restore Item"
                          className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-150"
                          style={{ background: "rgba(50,102,127,0.1)", color: "#32667F" }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(50,102,127,0.2)"}
                          onMouseLeave={e => e.currentTarget.style.background = "rgba(50,102,127,0.1)"}
                        >
                          <RotateCcw size={14} className="shrink-0" />
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
                          <Trash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmationModal 
        isOpen={deleteModal.open}
        title="Permanent Delete"
        message={`Are you sure you want to permanently delete "${deleteModal.item?.title || deleteModal.item?.bookTitle}"? This action cannot be undone.`}
        confirmText="Delete Permanently"
        cancelText="Cancel"
        type="danger"
        onConfirm={confirmPermanentDelete}
        onCancel={() => setDeleteModal({ open: false, item: null })}
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