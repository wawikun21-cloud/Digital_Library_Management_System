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

  // When the school is fixed (scoped caller), skip the API call — the
  // select is disabled anyway and the value is already set by the parent.
  // This avoids unnecessary round-trips and prevents 403 errors for any
  // role that lacks manage_organization:view permission.
  const shouldFetch = fixedSchoolId == null;

  useEffect(() => {
    if (shouldFetch) loadSchools();
  }, [loadSchools, shouldFetch]);

  const effectiveLoading = shouldFetch && loading;

  // Scoped callers only ever receive their own school from the API;
  // the fixed id is a belt-and-braces filter for the display value.
  // If the API failed or was skipped, fall back to a synthetic option
  // so the select always shows the fixed school as selected.
  const options = useMemo(() => {
    if (fixedSchoolId != null) {
      const match = schools.find((s) => Number(s.id) === Number(fixedSchoolId));
      if (match) return [match];
      return [{ id: fixedSchoolId, name: "Your school", status: "active" }];
    }
    return schools;
  }, [schools, fixedSchoolId]);

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
        disabled={locked || effectiveLoading}
        className="rp-field px-3 py-2.5 text-sm"
      >
        <option value="">
          {effectiveLoading ? "Loading schools…" : "Select school"}
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
