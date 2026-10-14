import { Pencil, Trash2, Tag } from "lucide-react";

function CountBadge({ count }) {
  return (
    <span className="rp-badge rp-badge--muted tabular-nums">
      {count ?? 0}
    </span>
  );
}

/**
 * Categories table. Row selection (not a modal) opens the assigned
 * books panel — the page owns which row is active, this table only
 * renders and reports clicks.
 */
export default function CategoryTable({
  categories,
  loading,
  selectedId = null,
  onSelect,
  onEdit,
  onDelete,
}) {
  if (loading) {
    return (
      <div className="rp-card p-4" role="status" aria-busy="true">
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="rp-skeleton h-9 w-9 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="rp-skeleton h-3.5 w-1/3" />
                <div className="rp-skeleton h-3 w-1/5" />
              </div>
              <div className="rp-skeleton h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
        <span className="sr-only">Loading categories…</span>
      </div>
    );
  }

  if (!categories?.length) {
    return (
      <div className="rp-empty">
        <Tag size={40} className="mx-auto mb-3 opacity-20" />
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          No categories yet
        </p>
        <p className="mt-1 text-[13px]" style={{ color: "var(--text-muted)" }}>
          Categories decide which books a school's users can see.
        </p>
      </div>
    );
  }

  return (
    <div
      className="overflow-x-auto rounded-xl border shadow-sm"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
    >
      <table className="min-w-full text-sm">
        <thead>
          <tr style={{ background: "var(--bg-subtle, var(--bg-hover))", borderBottom: "1px solid var(--border)" }}>
            {["Category", "Department", "Books", "E-Books", "Actions"].map((heading, i) => (
              <th
                key={heading}
                scope="col"
                className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${i === 4 ? "text-right" : "text-left"}`}
                style={{ color: "var(--text-muted)" }}
              >
                {i === 4 ? <span className="sr-only">{heading}</span> : heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => {
            const selected = Number(selectedId) === Number(category.id);
            return (
              <tr
                key={category.id}
                className="rp-tr"
                style={selected ? { background: "var(--bg-hover)" } : undefined}
              >
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onSelect?.(category)}
                    className="flex items-center gap-3 text-left"
                    aria-pressed={selected}
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}
                    >
                      <Tag size={16} aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium" style={{ color: "var(--text-primary)" }}>
                        {category.name}
                      </p>
                      {category.description && (
                        <p className="truncate text-[12px]" style={{ color: "var(--text-muted)" }}>
                          {category.description}
                        </p>
                      )}
                    </div>
                  </button>
                </td>
                <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>
                  {category.department_name || "—"}
                </td>
                <td className="px-4 py-3">
                  <CountBadge count={category.book_count} />
                </td>
                <td className="px-4 py-3">
                  <CountBadge count={category.lexora_book_count} />
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(category)}
                        title="Edit category"
                        aria-label={`Edit ${category.name}`}
                        className="rp-icon-btn"
                      >
                        <Pencil size={14} aria-hidden="true" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(category)}
                        title="Delete category"
                        aria-label={`Delete ${category.name}`}
                        className="rp-icon-btn rp-icon-btn--danger"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    )}
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
