import { useMemo } from "react";
import Toggle from "../../../components/ui/Toggle";
import { groupByCategory, CATEGORY_LABELS } from "../utils/rolesPermissionHelpers";

/**
 * Permission grid with a toggle per ACTION, grouped by category.
 * This is the LMS-SOP action-granular surface: a permission is granted when
 * at least one of its actions is on, and its actions can be narrowed.
 */
export default function PermissionGrid({ permStates, onToggleAction, links = [] }) {
  const grouped = useMemo(() => groupByCategory(permStates), [permStates]);
  const categories = Object.keys(grouped).sort();

  return (
    <div className="space-y-4">
      {links.length > 0 && (
        <div className="flex flex-wrap gap-4 text-xs">
          {links.map((link) => (
            <button
              key={link.label}
              onClick={link.onClick}
              className="font-medium transition-colors"
              style={{ color: "var(--text-secondary)" }}
            >
              {link.label}
            </button>
          ))}
        </div>
      )}

      {categories.map((category) => (
        <div key={category} className="space-y-0.5">
          <h4 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
            {CATEGORY_LABELS[category] || category}
          </h4>

          {grouped[category].map((perm) => (
            <div
              key={perm.name}
              className="flex flex-wrap items-center justify-between gap-2 py-1.5"
              style={{ borderBottom: "1px solid var(--border-light)" }}
            >
              <span
                className="max-w-[210px] truncate text-xs"
                style={{ color: perm.granted ? "var(--text-primary)" : "var(--text-muted)" }}
                title={`${perm.display_name} — ${perm.definedActions.join(", ")}`}
              >
                {perm.display_name}
              </span>

              <div className="flex flex-wrap items-center justify-end gap-1.5">
                {perm.definedActions.map((action) => (
                  <span key={action} className="flex items-center gap-1.5">
                    <span
                      className="min-w-[42px] text-right text-[10px] capitalize"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {action.replace(/_/g, " ")}
                    </span>
                    <Toggle
                      checked={perm.selectedActions.includes(action)}
                      onCheckedChange={() => onToggleAction(perm, action)}
                      size="sm"
                      aria-label={`${action} for ${perm.display_name}`}
                    />
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
