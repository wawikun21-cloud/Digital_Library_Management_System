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

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSave(); }}
      className="space-y-4"
    >
      {showName && (
        <div>
          <label htmlFor="role-name" className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
            Role name
          </label>
          <input
            id="role-name"
            value={formData.name || ""}
            onChange={set("name")}
            placeholder="e.g. research_assistant"
            autoComplete="off"
            className="w-full rounded-lg px-3 py-2 font-mono text-xs outline-none"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
          <p className="mt-1 text-[11px]" style={{ color: "var(--text-secondary)" }}>
            Lowercase letters, digits and underscores. Used internally — not shown to users.
          </p>
        </div>
      )}

      <div>
        <label htmlFor="role-display-name" className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
          Display name
        </label>
        <input
          id="role-display-name"
          value={formData.display_name || ""}
          onChange={set("display_name")}
          placeholder="e.g. Research Assistant"
          className="w-full rounded-lg px-3 py-2 text-sm outline-none"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        />
      </div>

      <div>
        <label htmlFor="role-description" className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
          Description
        </label>
        <textarea
          id="role-description"
          value={formData.description || ""}
          onChange={set("description")}
          rows={3}
          placeholder="What this role is for."
          className="w-full resize-none rounded-lg px-3 py-2 text-sm outline-none"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-2 text-xs font-medium transition-colors duration-150"
          style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg px-4 py-2 text-xs font-semibold text-white transition-opacity duration-150 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: "#EEA23A" }}
        >
          {saving ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
