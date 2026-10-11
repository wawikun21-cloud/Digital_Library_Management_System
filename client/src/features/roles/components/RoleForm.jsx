import { Loader2 } from "lucide-react";
import "./rolesUi.css";

/**
 * Metadata form for Add / Edit Role. Permissions are edited in the drawer,
 * not here — this only covers name, display name and description.
 */
export default function RoleForm({
  formData,
  setFormData,
  onSave,
  saving,
  onCancel,
  submitLabel,
  showName = false,
}) {
  const set = (field) => (e) => setFormData({ ...formData, [field]: e.target.value });

  const labelClass = "mb-1.5 block text-[13px] font-semibold";
  const hintClass = "mt-1.5 text-[11px] leading-snug";

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSave(); }}
      className="space-y-4"
    >
      {showName && (
        <div>
          <label htmlFor="role-name" className={labelClass} style={{ color: "var(--text-primary)" }}>
            Role name
          </label>
          <input
            id="role-name"
            value={formData.name || ""}
            onChange={set("name")}
            placeholder="e.g. research_assistant"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
            aria-describedby="role-name-hint"
            className="rp-field px-3 py-2.5 font-mono text-xs"
          />
          <p id="role-name-hint" className={hintClass} style={{ color: "var(--text-secondary)" }}>
            Lowercase letters, digits and underscores. Used internally — not shown to users.
          </p>
        </div>
      )}

      <div>
        <label htmlFor="role-display-name" className={labelClass} style={{ color: "var(--text-primary)" }}>
          Display name
        </label>
        <input
          id="role-display-name"
          value={formData.display_name || ""}
          onChange={set("display_name")}
          placeholder="e.g. Research Assistant"
          autoFocus={!showName}
          aria-describedby="role-display-hint"
          className="rp-field px-3 py-2.5 text-sm"
        />
        <p id="role-display-hint" className={hintClass} style={{ color: "var(--text-secondary)" }}>
          The name people see in lists and menus.
        </p>
      </div>

      <div>
        <label htmlFor="role-description" className={labelClass} style={{ color: "var(--text-primary)" }}>
          Description <span className="font-normal" style={{ color: "var(--text-secondary)" }}>(optional)</span>
        </label>
        <textarea
          id="role-description"
          value={formData.description || ""}
          onChange={set("description")}
          rows={3}
          placeholder="What this role is for."
          className="rp-field resize-none px-3 py-2.5 text-sm"
        />
      </div>

      <div
        className="flex flex-col-reverse gap-2 pt-3 sm:flex-row sm:justify-end"
        style={{ borderTop: "1px solid var(--border-light)" }}
      >
        <button type="button" onClick={onCancel} className="rp-btn rp-btn--ghost">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="rp-btn rp-btn--primary" style={{ minWidth: 112 }}>
          {saving ? (
            <>
              <Loader2 size={14} className="animate-spin" aria-hidden="true" /> Saving…
            </>
          ) : (
            submitLabel
          )}
        </button>
      </div>
    </form>
  );
}
