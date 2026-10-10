import { Search } from "lucide-react";
import Toggle from "../../../components/ui/Toggle";
import { ENTITY_TYPE_CONFIG, ENTITY_TYPES } from "../utils/rolesPermissionHelpers";

/**
 * Access Restrictions panel — per-entity-type scope control.
 *
 * Three scopes per type: all (no restriction), selected (allowlist), and
 * denied (blocklist). Only types whose governing permission is granted are
 * shown, so a restriction can never appear for something the user lacks.
 */
export default function ResourceRestrictionPanel({
  entityStates,
  visibleTypes,
  onScopeToggle,
  onRecordToggle,
  onSearch,
}) {
  return (
    <div className="space-y-6">
      {ENTITY_TYPES.map((entityType) => {
        if (!visibleTypes.includes(entityType)) return null;
        const config = ENTITY_TYPE_CONFIG[entityType];
        const state = entityStates?.[entityType];
        if (!state) return null;

        const isDenied = state.scope === "denied";
        const isSelected = state.scope === "selected";

        const filteredEntities = (state.entities || []).filter((e) => {
          const q = (state.search || "").toLowerCase();
          if (!q) return true;
          return String(e.label || "").toLowerCase().includes(q);
        });

        return (
          <div key={entityType} className="space-y-2">
            <div
              className="flex items-center justify-between pb-2"
              style={{ borderBottom: "1px solid var(--border-light)" }}
            >
              <h4 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {config.label}
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                  {isDenied ? "Denied" : isSelected ? "Only selected" : "All"}
                </span>
                <Toggle
                  checked={!isDenied}
                  onCheckedChange={() => onScopeToggle(entityType)}
                  size="sm"
                  aria-label={`Toggle access to all ${config.label}`}
                />
              </div>
            </div>

            {isDenied ? (
              <p className="py-2 text-xs" style={{ color: "#dc2626" }}>
                Access to all {config.label.toLowerCase()} is denied for this user.
              </p>
            ) : isSelected ? (
              <>
                <div className="relative">
                  <Search
                    size={13}
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--text-secondary)" }}
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    placeholder={`Search ${config.label.toLowerCase()}…`}
                    value={state.search}
                    onChange={(e) => onSearch(entityType, e.target.value)}
                    aria-label={`Search ${config.label}`}
                    className="w-full rounded-lg py-1.5 pl-8 pr-2 text-xs outline-none"
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>

                <div className="max-h-60 space-y-0.5 overflow-y-auto">
                  {filteredEntities.map((entity) => (
                    <div
                      key={entity.id}
                      className="flex items-center justify-between py-1"
                      style={{ borderBottom: "1px solid var(--border-light)" }}
                    >
                      <span
                        className="max-w-[220px] truncate text-xs"
                        style={{ color: "var(--text-primary)" }}
                        title={entity.label}
                      >
                        {entity.label || `#${entity.id}`}
                      </span>
                      <Toggle
                        checked={state.selectedIds.has(entity.id)}
                        onCheckedChange={() => onRecordToggle(entityType, entity.id)}
                        size="sm"
                        aria-label={`Access to ${entity.label || entity.id}`}
                      />
                    </div>
                  ))}
                  {filteredEntities.length === 0 && (
                    <p className="py-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                      No {config.label.toLowerCase()} found
                    </p>
                  )}
                </div>

                <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                  {state.selectedIds.size} of {state.entities.length} selected
                </p>
              </>
            ) : (
              <p className="py-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                This user has access to all {config.label.toLowerCase()}.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
