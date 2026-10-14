// ─────────────────────────────────────────────────────────
//  features/organization/components/OrganizationTree.jsx
//
//  The whole hierarchy: root schools, the search box's effect and
//  the create/modal controller pass-through. While a query is
//  active every matching branch is force-open; otherwise the
//  page's expandedIds decide. Presentation only.
// ─────────────────────────────────────────────────────────

import { useMemo } from "react";
import { Loader2, Search, FolderTree } from "lucide-react";
import OrganizationTreeNode from "./OrganizationTreeNode";
import { filterHierarchy, collectExpandableIds } from "../utils/hierarchyFilter";

export default function OrganizationTree({ schools, loading, query, expandedIds, onToggle, actions }) {
  const searching = Boolean((query || "").trim());
  const filtered = useMemo(() => filterHierarchy(schools, query), [schools, query]);

  // Search opens every matching branch; otherwise honor the page's
  // expand state (seeded from the roots for scoped callers).
  const openIds = useMemo(() => {
    if (searching) return new Set(collectExpandableIds(filtered));
    return expandedIds;
  }, [searching, filtered, expandedIds]);

  if (loading) {
    return (
      <div className="rp-card flex items-center justify-center gap-2 p-12 text-sm" style={{ color: "var(--text-muted)" }} role="status">
        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        Loading organization hierarchy…
      </div>
    );
  }

  if (!filtered.length) {
    return (
      <div className="rp-empty">
        <FolderTree size={40} className="mx-auto mb-3 opacity-20" />
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          {searching ? "No matches in your organization" : "No schools to show yet"}
        </p>
        {!searching && (
          <p className="mt-1 text-[13px]" style={{ color: "var(--text-muted)" }}>
            Super admins create the first school from the Schools page.
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border p-2 shadow-sm"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
      role="tree"
      aria-label="Organization hierarchy"
    >
      {filtered.map((school) => (
        <OrganizationTreeNode
          key={school.id}
          node={school}
          kind="school"
          expandedIds={openIds}
          onToggle={onToggle}
          actions={actions}
        />
      ))}
    </div>
  );
}

/** Header search box — kept beside the tree so the page stays composition-only. */
export function OrganizationSearch({ value, onChange }) {
  return (
    <div className="relative max-w-md flex-1">
      <Search
        size={14}
        className="absolute left-3 top-1/2 -translate-y-1/2"
        style={{ color: "var(--text-muted)" }}
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search schools, departments, categories…"
        maxLength={100}
        aria-label="Search the organization hierarchy"
        className="rp-field w-full py-2 pl-9 pr-3 text-sm"
      />
    </div>
  );
}
