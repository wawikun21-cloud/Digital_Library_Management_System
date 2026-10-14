import { useState, useEffect } from "react";
import Modal from "../../../components/ui/Modal";
import { validateDepartmentPayload } from "../validation/organizationValidation";

const EMPTY = { name: "", code: "", description: "", is_active: true };

/**
 * Create / edit a department. The school selector is fixed (disabled)
 * for scoped callers — the server forces their own school whatever
 * the payload says, so the form never offers a choice it cannot keep.
 */
export default function DepartmentFormModal({
  open,
  department,
  schools,
  fixedSchoolId = null,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState({ ...EMPTY, school_id: "" });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);

  const schoolLocked = fixedSchoolId != null;

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSubmitError("");
    setForm({
      ...EMPTY,
      school_id: department?.school_id ?? fixedSchoolId ?? "",
      name: department?.name || "",
      code: department?.code || "",
      description: department?.description || "",
      is_active: department ? Boolean(department.is_active) : true,
    });
  }, [open, department, fixedSchoolId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { errors: validationErrors, isValid } = validateDepartmentPayload(form);
    setErrors(validationErrors);
    if (!isValid) return;

    setSaving(true);
    setSubmitError("");
    try {
      const result = await onSubmit({
        name: form.name.trim(),
        code: form.code.trim(),
        description: form.description || null,
        is_active: form.is_active,
      });
      if (!result?.success) {
        setSubmitError(result?.error || "Failed to save department");
      }
    } catch (err) {
      setSubmitError(err.message || "Failed to save department");
    } finally {
      setSaving(false);
    }
  };

  const fieldClass = (name) => `rp-field px-3 py-2.5 text-sm${errors[name] ? " us-field--error" : ""}`;

  return (
    <Modal isOpen={open} onClose={onClose} title={department ? "Edit Department" : "New Department"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {submitError && (
          <div className="rp-callout rp-callout--danger" role="alert">
            {submitError}
          </div>
        )}

        {!schoolLocked && (
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
              School <span style={{ color: "var(--accent-danger)" }}>*</span>
            </label>
            <select
              name="school_id"
              value={form.school_id}
              onChange={handleChange}
              className={fieldClass("school_id")}
            >
              <option value="">Select school</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
            {errors.school_id && (
              <p className="mt-1 text-[11px]" style={{ color: "var(--accent-danger)" }}>{errors.school_id}</p>
            )}
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
            Department Name <span style={{ color: "var(--accent-danger)" }}>*</span>
          </label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. College of Information Technology"
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
            placeholder="e.g. CIT"
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

        <label className="flex items-center gap-2 text-[13px]" style={{ color: "var(--text-secondary)" }}>
          <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
          Active department
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rp-btn rp-btn--ghost" disabled={saving}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className="rp-btn rp-btn--primary">
            {saving ? "Saving…" : department ? "Save Changes" : "Create Department"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
