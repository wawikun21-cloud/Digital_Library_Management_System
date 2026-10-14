import { Pencil, Trash2, Building2 } from "lucide-react";

function ActiveBadge({ isActive }) {
  return (
    <span className={`rp-badge ${isActive ? "rp-badge--ok" : "rp-badge--off"}`}>
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

/**
 * Departments table. `showSchool` renders the school column for
 * the super_admin view that spans schools; the scoped view passes
 * one school and hides it.
 */
export default function DepartmentTable({
  departments,
  loading,
  showSchool = false,
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
        <span className="sr-only">Loading departments…</span>
      </div>
    );
  }

  if (!departments?.length) {
    return (
      <div className="rp-empty">
        <Building2 size={40} className="mx-auto mb-3 opacity-20" />
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          No departments yet
        </p>
        <p className="mt-1 text-[13px]" style={{ color: "var(--text-muted)" }}>
          Departments group the categories that books are assigned to.
        </p>
      </div>
    );
  }

  const headings = showSchool
    ? ["Department", "School", "Categories", "Status", "Actions"]
    : ["Department", "Categories", "Status", "Actions"];

  return (
    <div
      className="overflow-x-auto rounded-xl border shadow-sm"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
    >
      <table className="min-w-full text-sm">
        <thead>
          <tr style={{ background: "var(--bg-subtle, var(--bg-hover))", borderBottom: "1px solid var(--border)" }}>
            {headings.map((heading, i) => (
              <th
                key={heading}
                scope="col"
                className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${i === headings.length - 1 ? "text-right" : "text-left"}`}
                style={{ color: "var(--text-muted)" }}
              >
                {i === headings.length - 1 ? <span className="sr-only">{heading}</span> : heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {departments.map((dept) => (
            <tr key={dept.id} className="rp-tr">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}
                  >
                    <Building2 size={16} aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium" style={{ color: "var(--text-primary)" }}>
                      {dept.name}
                    </p>
                    <p className="truncate font-mono text-[12px]" style={{ color: "var(--text-muted)" }}>
                      {dept.code}
                    </p>
                  </div>
                </div>
              </td>
              {showSchool && (
                <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>
                  {dept.school_name || "—"}
                </td>
              )}
              <td className="px-4 py-3 tabular-nums" style={{ color: "var(--text-secondary)" }}>
                {dept.category_count ?? 0}
              </td>
              <td className="px-4 py-3">
                <ActiveBadge isActive={dept.is_active} />
              </td>
              <td className="px-3 py-3">
                <div className="flex items-center justify-end gap-1">
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(dept)}
                      title="Edit department"
                      aria-label={`Edit ${dept.name}`}
                      className="rp-icon-btn"
                    >
                      <Pencil size={14} aria-hidden="true" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(dept)}
                      title="Delete department"
                      aria-label={`Delete ${dept.name}`}
                      className="rp-icon-btn rp-icon-btn--danger"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
