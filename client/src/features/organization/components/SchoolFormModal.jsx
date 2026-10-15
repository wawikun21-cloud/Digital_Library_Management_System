import { useState, useEffect } from "react";
import Modal from "../../../components/ui/Modal";
import { validateSchoolPayload } from "../validation/organizationValidation";

const EMPTY = { name: "", code: "", description: "", status: "active", feature_set: "both" };

/**
 * Create / edit a school. Owns its own form state (page stays
 * composition-only). The server restricts writes to super_admin;
 * a refusal surfaces inline so the modal stays open.
 */
export default function SchoolFormModal({ open, school, onClose, onSubmit }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSubmitError("");
    setForm(
      school
        ? {
            name: school.name || "",
            code: school.code || "",
            description: school.description || "",
            status: school.status || "active",
            feature_set: school.feature_set || "both",
          }
        : EMPTY
    );
  }, [open, school]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { errors: validationErrors, isValid } = validateSchoolPayload(form);
    setErrors(validationErrors);
    if (!isValid) return;

    setSaving(true);
    setSubmitError("");
    try {
      const result = await onSubmit(form);
      if (!result?.success) {
        setSubmitError(result?.error || "Failed to save school");
      }
    } catch (err) {
      setSubmitError(err.message || "Failed to save school");
    } finally {
      setSaving(false);
    }
  };

  const fieldClass = (name) => `rp-field px-3 py-2.5 text-sm${errors[name] ? " us-field--error" : ""}`;

  return (
    <Modal isOpen={open} onClose={onClose} title={school ? "Edit School" : "New School"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {submitError && (
          <div className="rp-callout rp-callout--danger" role="alert">
            {submitError}
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
            School Name <span style={{ color: "var(--accent-danger)" }}>*</span>
          </label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. North Campus"
            className={fieldClass("name")}
          />
          {errors.name && <p className="mt-1 text-[11px]" style={{ color: "var(--accent-danger)" }}>{errors.name}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
            Code <span style={{ color: "var(--accent-danger)" }}>*</span>
          </label>
          <input
            name="code"
            value={form.code}
            onChange={handleChange}
            placeholder="e.g. NC"
            className={fieldClass("code")}
          />
          {errors.code && <p className="mt-1 text-[11px]" style={{ color: "var(--accent-danger)" }}>{errors.code}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
            Description
          </label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={3}
            placeholder="Optional description"
            className="rp-field px-3 py-2.5 text-sm"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
            Status
          </label>
          <select name="status" value={form.status} onChange={handleChange} className="rp-field px-3 py-2.5 text-sm">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
            Licensed Features
          </label>
          <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-secondary)" }}>
            Controls which surfaces this school's users can access. Existing schools default to "Both".
          </p>
          <div className="mt-2 flex gap-3" role="radiogroup">
            {[
              { value: "library", label: "Library Only", desc: "Physical library; Lexora hidden" },
              { value: "lexora",  label: "Lexora Only",   desc: "Digital books; physical library hidden" },
              { value: "both",    label: "Both",          desc: "Physical library and digital books" },
            ].map((opt) => {
              const checked = form.feature_set === opt.value;
              return (
                <label key={opt.value} className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="feature_set"
                    value={opt.value}
                    checked={checked}
                    onChange={handleChange}
                    className="mt-0.5 h-4 w-4 cursor-pointer"
                  />
                  <span className="block">
                    <span className="block text-sm font-medium" style={{ color: "var(--text-primary)" }}>{opt.label}</span>
                    <span className="block text-[11px]" style={{ color: "var(--text-secondary)" }}>{opt.desc}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rp-btn rp-btn--ghost" disabled={saving}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className="rp-btn rp-btn--primary">
            {saving ? "Saving…" : school ? "Save Changes" : "Create School"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
