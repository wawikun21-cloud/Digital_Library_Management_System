import { useMemo } from "react";
import Toggle from "../../../components/ui/Toggle";
import { groupByCategory, CATEGORY_LABELS } from "../utils/rolesPermissionHelpers";
import "./rolesUi.css";

/**
 * Permission grid with a toggle per ACTION, grouped by category.
 * This is the LMS-SOP action-granular surface: a permission is granted when
 * at least one of its actions is on, and its actions can be narrowed.
 */
export default function PermissionGrid({ permStates, onToggleAction, links = [] }) {
  const grouped = useMemo(() => groupByCategory(permStates), [permStates]);
  const categories = Object.keys(grouped).sort();

  return (
    <div className="space-y-5">
      {links.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {links.map((link) => (
            <button key={link.label} type="button" onClick={link.onClick} className="rp-link-btn">
              {link.label}
            </button>
          ))}
        </div>
      )}

      {categories.length === 0 && (
        <p className="py-6 text-center text-xs" style={{ color: "var(--text-secondary)" }}>
          No permissions to show.
        </p>
      )}

      {categories.map((category) => {
        const perms = grouped[category];
        const grantedCount = perms.filter((p) => p.granted).length;
        const headingId = `perm-cat-${category}`;

        return (
          <section key={category} aria-labelledby={headingId}>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h4 id={headingId} className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                {CATEGORY_LABELS[category] || category}
              </h4>
              <span className="text-[11px] tabular-nums" style={{ color: "var(--text-secondary)" }}>
                {grantedCount} of {perms.length} granted
              </span>
            </div>

            <div className="rp-card overflow-hidden">
              {perms.map((perm) => (
                <div key={perm.name} className="rp-perm-row" data-granted={perm.granted ? "true" : "false"}>
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className="min-w-0 truncate text-[13px] font-medium"
                      style={{ color: perm.granted ? "var(--text-primary)" : "var(--text-muted)" }}
                      title={`${perm.display_name} — ${perm.definedActions.join(", ")}`}
                    >
                      {perm.display_name}
                    </span>
                    <span className="shrink-0 text-[11px] tabular-nums" style={{ color: "var(--text-secondary)" }}>
                      {perm.selectedActions.length}/{perm.definedActions.length}
                    </span>
                  </div>

                  <div className="rp-actions-grid" role="group" aria-label={`${perm.display_name} actions`}>
                    {perm.definedActions.map((action) => {
                      const on = perm.selectedActions.includes(action);
                      return (
                        <div key={action} className="rp-action-cell" data-on={on ? "true" : "false"}>
                          <span
                            className="truncate text-[11px] font-medium capitalize"
                            style={{ color: on ? "var(--text-primary)" : "var(--text-secondary)" }}
                          >
                            {action.replace(/_/g, " ")}
                          </span>
                          <Toggle
                            checked={on}
                            onCheckedChange={() => onToggleAction(perm, action)}
                            size="sm"
                            aria-label={`${action} for ${perm.display_name}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
