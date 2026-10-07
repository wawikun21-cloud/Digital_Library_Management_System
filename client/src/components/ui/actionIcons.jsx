import { Archive, ArchiveRestore, Eye, Pencil, Trash2 } from "lucide-react";

const ACTION_STYLES = {
  View: Eye,
  Edit: Pencil,
  Archive,
  Delete: Trash2,
  Unarchive: ArchiveRestore,
};

export function ActionButton({ action, label, onClick }) {
  const Icon = ACTION_STYLES[action] || ACTION_STYLES.View;
  const isDelete = action === "Delete";

  return (
    <button
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] transition-colors duration-150 hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
        isDelete
          ? "text-red-600 hover:border-red-300 hover:bg-red-50 dark:text-red-400 dark:hover:border-red-900 dark:hover:bg-red-950/40"
          : "text-[var(--text-secondary)] hover:text-[var(--color-primary)]"
      }`}
    >
      <Icon size={15} aria-hidden="true" />
    </button>
  );
}
