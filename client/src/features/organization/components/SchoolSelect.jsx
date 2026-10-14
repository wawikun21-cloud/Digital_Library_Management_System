// ─────────────────────────────────────────────────────────
//  features/organization/components/SchoolSelect.jsx
//
//  School picker shared by the user / student / book / course /
//  tool / faculty forms. A scoped caller's school is fixed
//  (disabled select) — the server forces their own school on every
//  write, so the form never offers a choice it cannot keep.
// ─────────────────────────────────────────────────────────

import { useEffect, useMemo } from "react";
import { useSchools } from "../hooks/useSchools";

export default function SchoolSelect({
  value,
  onChange,
  fixedSchoolId = null,
  disabled = false,
  label = "School",
  required = false,
  name = "school_id",
}) {
  const { schools, loading, loadSchools } = useSchools();

  useEffect(() => {
    loadSchools();
  }, [loadSchools]);

  // Scoped callers only ever receive their own school from the API;
  // the fixed id is a belt-and-braces filter for the display value.
  const options = useMemo(
    () => (fixedSchoolId != null ? schools.filter((s) => Number(s.id) === Number(fixedSchoolId)) : schools),
    [schools, fixedSchoolId]
  );

  const locked = fixedSchoolId != null || disabled;

  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
        {label} {required && <span style={{ color: "var(--accent-danger)" }}>*</span>}
      </label>
      <select
        name={name}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        disabled={locked || loading}
        className="rp-field px-3 py-2.5 text-sm"
      >
        <option value="">
          {loading ? "Loading schools…" : "Select school"}
        </option>
        {options.map((school) => (
          <option key={school.id} value={school.id}>
            {school.name}
            {school.status === "inactive" ? " (inactive)" : ""}
          </option>
        ))}
      </select>
      {locked && fixedSchoolId != null && (
        <p className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
          Your school — only a super admin can change it.
        </p>
      )}
    </div>
  );
}
