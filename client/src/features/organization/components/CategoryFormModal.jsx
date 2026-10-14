import { useState, useEffect } from "react";
import Modal from "../../../components/ui/Modal";
import { validateCategoryPayload } from "../validation/organizationValidation";

/**
 * Create / edit a category. The department list comes from the
 * selected school (dependent select); the scoped caller's school is
 * fixed. The server re-validates department ∈ school on every write.
 *
 * `fixedDepartmentId` pins the parent (used by the overview tree's
 * modal path, where the department is chosen by the row the user
 * clicked) — the select is replaced by a static read-out.
 */
export default function CategoryFormModal({
  open,
  category,
  departments,
  loadingDepartments = false,
  fixedDepartmentId = null,
  fixedDepartmentName = "",
  onClose,
  onSubmit,
}) {
  const departmentLocked = fixedDepartmentId != null;
  const [form, setForm] = useState({ name: "", description: "", is_active: true, department_id: "" });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSubmitError("");
    setForm({
      name: category?.name || "",
      description: category?.description || "",
      is_active: category ? Boolean(category.is_active) : true,
      department_id: category?.department_id ?? fixedDepartmentId ?? "",
    });
  }, [open, category, fixedDepartmentId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { errors: validationErrors, isValid } = validateCategoryPayload(form);
    setErrors(validationErrors);
    if (!isValid) return;

    setSaving(true);
    setSubmitError("");
    try {
      const result = await onSubmit({
        name: form.name.trim(),
        description: form.description || null,
        is_active: form.is_active,
        ...(form.department_id ? { department_id: Number(form.department_id) } : {}),
      });
      if (!result?.success) {
        setSubmitError(result?.error || "Failed to save category");
      }
    } catch (err) {
      setSubmitError(err.message || "Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title={category ? "Edit Category" : "New Category"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {submitError && (
          <div className="rp-callout rp-callout--danger" role="alert">
            {submitError}
          </div>
        )}

        {departmentLocked ? (
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
              Department
            </label>
            <p
              className="rp-field px-3 py-2.5 text-sm"
              style={{ color: "var(--text-secondary)", background: "var(--bg-subtle)" }}
            >
              {fixedDepartmentName || `Department #${fixedDepartmentId}`}
            </p>
          </div>
        ) : (
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
              Department <span style={{ color: "var(--accent-danger)" }}>*</span>
            </label>
            <select
              name="department_id"
              value={form.department_id}
              onChange={handleChange}
              disabled={loadingDepartments}
              className="rp-field px-3 py-2.5 text-sm"
            >
              <option value="">
                {loadingDepartments ? "Loading departments…" : "Select department"}
              </option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            {errors.department_id && (
              <p className="mt-1 text-[11px]" style={{ color: "var(--accent-danger)" }}>{errors.department_id}</p>
            )}
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
            Category Name <span style={{ color: "var(--accent-danger)" }}>*</span>
          </label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. Reference"
            className="rp-field px-3 py-2.5 text-sm"
          />
          {errors.name && <p className="mt-1 text-[11px]" style={{ color: "var(--accent-danger)" }}>{errors.name}</p>}
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
          Active category
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rp-btn rp-btn--ghost" disabled={saving}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className="rp-btn rp-btn--primary">
            {saving ? "Saving…" : category ? "Save Changes" : "Create Category"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
