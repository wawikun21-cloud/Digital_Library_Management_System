import { Pencil, Trash2, School } from "lucide-react";

function StatusBadge({ status }) {
  const active = status !== "inactive";
  return (
    <span className={`rp-badge ${active ? "rp-badge--ok" : "rp-badge--off"}`}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

/**
 * Schools table (desktop pattern). Actions arrive as undefined when
 * the signed-in user may not run them — render nothing, same rule
 * as UserTable. Only super_admin reaches this table's writes (the
 * server enforces it too).
 */
export default function SchoolTable({ schools, loading, onEdit, onDelete }) {
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
        <span className="sr-only">Loading schools…</span>
      </div>
    );
  }

  if (!schools?.length) {
    return (
      <div className="rp-empty">
        <School size={40} className="mx-auto mb-3 opacity-20" />
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          No schools yet
        </p>
        <p className="mt-1 text-[13px]" style={{ color: "var(--text-muted)" }}>
          Create the first school to organize departments, categories and books.
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
            {["School", "Code", "Status", "Created by", "Actions"].map((heading, i) => (
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
          {schools.map((school) => (
            <tr key={school.id} className="rp-tr">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}
                  >
                    <School size={16} aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium" style={{ color: "var(--text-primary)" }}>
                      {school.name}
                      {school.is_default === 1 && (
                        <span className="rp-badge rp-badge--accent ml-2">Default</span>
                      )}
                    </p>
                    {school.description && (
                      <p className="truncate text-[13px]" style={{ color: "var(--text-secondary)" }}>
                        {school.description}
                      </p>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 font-mono text-[13px]" style={{ color: "var(--text-secondary)" }}>
                {school.code}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={school.status} />
              </td>
              <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>
                {school.created_by_name || "—"}
              </td>
              <td className="px-3 py-3">
                <div className="flex items-center justify-end gap-1">
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(school)}
                      title="Edit school"
                      aria-label={`Edit ${school.name}`}
                      className="rp-icon-btn"
                    >
                      <Pencil size={14} aria-hidden="true" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(school)}
                      title="Delete school"
                      aria-label={`Delete ${school.name}`}
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
