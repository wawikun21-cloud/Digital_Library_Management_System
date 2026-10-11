import { useState, useEffect } from "react";
import { Info, Loader2 } from "lucide-react";
import { ROLES, ROLE_LABELS, ROLE_HIERARCHY, DEFAULT_SEED_PASSWORD } from "../../../constants/roles";
import { validateUserForm } from "../validation/userValidation";
import { toUserFormValues } from "../utils/userFormValues";

const labelClass = "mb-1.5 block text-[13px] font-semibold";
const errorClass = "mt-1 text-[11px]";

export default function UserForm({ initialData, currentUserRole, onSubmit, onCancel, submitLabel = "Create User" }) {
  const [formData, setFormData] = useState(() => toUserFormValues(initialData));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const isEditMode = Boolean(initialData);

  useEffect(() => {
    setFormData(toUserFormValues(initialData));
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { errors: validationErrors, isValid } = validateUserForm(formData, initialData);
    setErrors(validationErrors);
    if (!isValid) return;
    setSaving(true);
    try {
      await onSubmit(formData);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFormData(toUserFormValues(initialData));
    setErrors({});
  };

  const roleOptions = ROLE_HIERARCHY[currentUserRole] || [];

  const fieldClass = (name) => `rp-field px-3 py-2.5 text-sm${errors[name] ? " us-field--error" : ""}`;

  const renderField = (label, name, type = "text", options = {}) => {
    const hasError = errors[name];
    return (
      <div className="mb-4">
        <label className={labelClass} style={{ color: "var(--text-primary)" }}>
          {label} {options.required && <span style={{ color: "var(--accent-danger)" }}>*</span>}
        </label>
        <input
          type={type}
          name={name}
          value={formData[name] ?? ""}
          onChange={handleChange}
          className={fieldClass(name)}
          aria-invalid={hasError ? true : undefined}
          {...options}
        />
        {hasError && <p className={errorClass} style={{ color: "var(--accent-danger)" }}>{hasError}</p>}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!isEditMode && (
        <div className="rp-callout" role="note">
          <Info size={14} aria-hidden="true" />
          <span>Default password for new users: <strong>{DEFAULT_SEED_PASSWORD}</strong></span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
        {renderField("Username / ID No", "username", "text", { required: true })}
        {renderField("Password", "password", "password", { required: !isEditMode })}
        {renderField("Confirm Password", "confirmPassword", "password", { required: !isEditMode })}
        {!isEditMode && roleOptions.length > 0 && (
          <div className="mb-4">
            <label className={labelClass} style={{ color: "var(--text-primary)" }}>
              Role <span style={{ color: "var(--accent-danger)" }}>*</span>
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className={`rp-field px-3 py-2.5 text-sm${errors.role ? " us-field--error" : ""}`}
            >
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
            {errors.role && <p className={errorClass} style={{ color: "var(--accent-danger)" }}>{errors.role}</p>}
          </div>
        )}

        {renderField("Full Name", "full_name")}
        {renderField("Email", "email", "email")}
        {renderField("Position Title", "position_title")}
        {renderField("Employee ID", "employee_id")}
        {renderField("Contact Number", "contact_number")}
        {renderField("Date Hired", "date_hired", "date")}
        {renderField("Birthdate", "birthdate", "date")}
      </div>

      {renderField("Address", "address")}

      <div className="mb-4">
        <label className={labelClass} style={{ color: "var(--text-primary)" }}>
          Employment Status
        </label>
        <select
          name="employment_status"
          value={formData.employment_status}
          onChange={handleChange}
          className="rp-field px-3 py-2.5 text-sm"
        >
          <option value="">Select status</option>
          <option value="Regular">Regular</option>
          <option value="Probationary">Probationary</option>
          <option value="Part-time">Part-time</option>
          <option value="Contract">Contract</option>
        </select>
      </div>

      {formData.role === ROLES.STUDENT && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Student Information
          </h3>
          <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
            {renderField("Student ID Number", "student_id_number")}
            {renderField("Student Course", "student_course")}
            {renderField("Student Year Level", "student_yr_level")}
            {renderField("Student Email", "student_email", "email")}
            {renderField("Student Contact", "student_contact")}
          </div>
        </div>
      )}

      <div
        className="flex flex-col-reverse gap-2 pt-3 sm:flex-row sm:justify-end"
        style={{ borderTop: "1px solid var(--border-light)" }}
      >
        <button type="button" onClick={handleReset} className="rp-btn rp-btn--ghost" disabled={saving}>
          Reset
        </button>
        <button type="button" onClick={onCancel} className="rp-btn rp-btn--ghost" disabled={saving}>
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
