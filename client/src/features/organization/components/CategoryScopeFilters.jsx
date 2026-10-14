// ─────────────────────────────────────────────────────────
//  features/organization/components/CategoryScopeFilters.jsx
//
//  School (super admin) + department filter row above the
//  categories table. Purely presentational — the page owns the
//  selected ids because its data hook depends on them.
// ─────────────────────────────────────────────────────────

export default function CategoryScopeFilters({
  isSuperAdmin,
  schools,
  selectedSchoolId,
  onSchoolChange,
  departments,
  departmentFilter,
  onDepartmentChange,
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      {isSuperAdmin && (
        <label className="min-w-[200px]">
          <span className="mb-1.5 block text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
            School
          </span>
          <select
            value={selectedSchoolId ?? ""}
            onChange={(e) => onSchoolChange(e.target.value ? Number(e.target.value) : null)}
            className="rp-field px-3 py-2.5 text-sm"
          >
            <option value="">Select school</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="min-w-[200px]">
        <span className="mb-1.5 block text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
          Department
        </span>
        <select
          value={departmentFilter}
          onChange={(e) => onDepartmentChange(e.target.value)}
          className="rp-field px-3 py-2.5 text-sm"
        >
          <option value="">All departments</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
