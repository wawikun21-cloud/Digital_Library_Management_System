// ─────────────────────────────────────────────────────────
//  features/organization/components/DepartmentSelect.jsx
//
//  Dependent department picker: options come from the selected
//  school, and the selection is cleared whenever the school
//  changes so a department from the previous school can never be
//  submitted. Disabled without a school.
// ─────────────────────────────────────────────────────────

import { useEffect } from "react";
import { useDepartments } from "../hooks/useDepartments";

export default function DepartmentSelect({
  schoolId,
  value,
  onChange,
  disabled = false,
  label = "Department",
  required = false,
  name = "department_id",
}) {
  const { departments, loading, loadDepartments } = useDepartments(schoolId);

  useEffect(() => {
    if (schoolId) loadDepartments();
  }, [loadDepartments, schoolId]);

  const stale = value != null && !loading && departments.length > 0
    && !departments.some((d) => Number(d.id) === Number(value));

  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
        {label} {required && <span style={{ color: "var(--accent-danger)" }}>*</span>}
      </label>
      <select
        name={name}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        disabled={disabled || !schoolId || loading}
        className="rp-field px-3 py-2.5 text-sm"
      >
        <option value="">
          {!schoolId
            ? "Select a school first"
            : loading
            ? "Loading departments…"
            : "School-wide (no department)"}
        </option>
        {departments.map((dept) => (
          <option key={dept.id} value={dept.id}>
            {dept.name}
            {dept.is_active === 0 ? " (inactive)" : ""}
          </option>
        ))}
      </select>
      {stale && (
        <p className="mt-1 text-[11px]" style={{ color: "var(--accent-danger)" }}>
          This department no longer belongs to the selected school.
        </p>
      )}
    </div>
  );
}
