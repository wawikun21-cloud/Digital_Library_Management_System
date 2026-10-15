import { Search, Ban, Globe2 } from "lucide-react";
import Toggle from "../../../components/ui/Toggle";
import { ENTITY_TYPE_CONFIG, ENTITY_TYPES } from "../utils/rolesPermissionHelpers";
import "./rolesUi.css";

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
  featureSet = "both",
  onScopeToggle,
  onRecordToggle,
  onSearch,
}) {
  const shownTypes = ENTITY_TYPES.filter((t) => visibleTypes.includes(t) && entityStates?.[t]);
  // An entity type is license-bound to the disabled surface of the user's
  // school (e.g. lexora_books for a library-only school). Restrictions for
  // that surface are meaningless, so the toggle is disabled with a hint.
  const licenseDisabled = (entityType) => {
    if (featureSet === "both") return false;
    if (featureSet === "library" && entityType === "lexora_books") return true;
    if (featureSet === "lexora" && entityType === "books") return true;
    return false;
  };

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        By default a user can reach every record their permissions allow. Turn a type off to block it, or
        narrow it to specific records.
      </p>

      {shownTypes.length === 0 && (
        <div className="rp-card px-4 py-10 text-center">
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            Nothing to restrict
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
            Grant this user a permission first, and its records will appear here.
          </p>
        </div>
      )}

      {shownTypes.map((entityType) => {
        const config = ENTITY_TYPE_CONFIG[entityType];
        const state = entityStates[entityType];

        const isDenied = state.scope === "denied";
        const isSelected = state.scope === "selected";

        const filteredEntities = (state.entities || []).filter((e) => {
          const q = (state.search || "").toLowerCase();
          if (!q) return true;
          return String(e.label || "").toLowerCase().includes(q);
        });

          return (
            <section key={entityType} className="rp-card overflow-hidden">
              <div
                className="flex items-center justify-between gap-3 px-3 py-2.5"
                style={{ background: "var(--bg-hover)" }}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <h4 className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {config.label}
                  </h4>
                  {licenseDisabled(entityType) && (
                    <span
                      className="rp-badge rp-badge--muted"
                      title="Unavailable for this school's license"
                    >
                      Licensed off
                    </span>
                  )}
                  <span
                    className={`rp-badge ${isDenied ? "rp-badge--off" : isSelected ? "rp-badge--accent" : "rp-badge--ok"}`}
                  >
                    {isDenied ? "Denied" : isSelected ? "Only selected" : "All"}
                  </span>
                </div>
                <Toggle
                  checked={!isDenied}
                  onCheckedChange={() => onScopeToggle(entityType)}
                  size="sm"
                  disabled={licenseDisabled(entityType)}
                  aria-label={`Toggle access to all ${config.label}`}
                />
              </div>

            <div className="space-y-2 p-3">
              {isDenied ? (
                <div className="rp-callout rp-callout--danger" role="status">
                  <Ban size={14} aria-hidden="true" />
                  <span>Access to all {config.label.toLowerCase()} is denied for this user.</span>
                </div>
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
                      className="rp-field py-2 pl-8 pr-2 text-xs"
                    />
                  </div>

                  <div className="max-h-60 overflow-y-auto rounded-lg" style={{ border: "1px solid var(--border-light)" }}>
                    {filteredEntities.map((entity) => {
                      const checked = state.selectedIds.has(entity.id);
                      return (
                        <div
                          key={entity.id}
                          className="flex items-center justify-between gap-3 px-3 py-2"
                          style={{
                            borderTop: "1px solid var(--border-light)",
                            background: checked ? "rgba(238, 162, 58, 0.1)" : "transparent",
                          }}
                        >
                          <span
                            className="min-w-0 truncate text-xs"
                            style={{ color: "var(--text-primary)" }}
                            title={entity.label}
                          >
                            {entity.label || `#${entity.id}`}
                          </span>
                          <Toggle
                            checked={checked}
                            onCheckedChange={() => onRecordToggle(entityType, entity.id)}
                            size="sm"
                            aria-label={`Access to ${entity.label || entity.id}`}
                          />
                        </div>
                      );
                    })}
                    {filteredEntities.length === 0 && (
                      <p className="px-3 py-5 text-center text-xs" style={{ color: "var(--text-secondary)" }}>
                        No {config.label.toLowerCase()} found
                      </p>
                    )}
                  </div>

                  <p className="text-[11px] tabular-nums" style={{ color: "var(--text-secondary)" }} aria-live="polite">
                    {state.selectedIds.size} of {state.entities.length} selected
                  </p>
                </>
              ) : (
                <div className="rp-callout" role="status">
                  <Globe2 size={14} aria-hidden="true" />
                  <span>This user has access to all {config.label.toLowerCase()}.</span>
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
