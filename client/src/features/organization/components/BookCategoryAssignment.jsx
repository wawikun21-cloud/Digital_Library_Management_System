// ─────────────────────────────────────────────────────────
//  features/organization/components/BookCategoryAssignment.jsx
//
//  Category assignment control used by the physical book form.
//  A book may belong to any number of categories across
//  departments; the selected chips show the full selection and the
//  control is hidden without the manage_organization permission.
//
//  Persistence:
//   • edit mode (bookId) — every toggle saves immediately through the
//     organization API (the API replaces the book's whole list, so
//     the control always submits the complete selection);
//   • create mode (no bookId) — the selection is pending and reported
//     through onSelectionChange; the caller saves it after the book
//     exists.
// ─────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from "react";
import { Check, Loader2, Tag } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { fetchHierarchy, fetchBookCategories, fetchLexoraBookCategories, setBookCategories, setLexoraBookCategories } from "../api/organizationApi";

export default function BookCategoryAssignment({
  bookId = null,
  type = "physical",
  onSelectionChange,
}) {
  const { user, hasPermission } = useAuth();
  const isLexora = type === "lexora";
  const canManage = hasPermission("manage_organization");
  const isSuperAdmin = user?.role === "super_admin";
  const ownSchoolId = user?.school_id ?? null;
  const schoolFixed = !isSuperAdmin && ownSchoolId != null;

  const [hierarchy, setHierarchy] = useState([]);
  const [selected, setSelected] = useState([]);
  const [schoolId, setSchoolId] = useState(null);
  const [departmentId, setDepartmentId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState(null);

  // ── Load the org tree + (edit mode) the book's current categories ──
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const tree = await fetchHierarchy();
        if (!active) return;
        const schools = tree.success ? tree.data || [] : [];
        setHierarchy(schools);
        setSchoolId(schoolFixed ? ownSchoolId : schools[0]?.id ?? null);

        if (bookId) {
          const current = isLexora
            ? await fetchLexoraBookCategories(bookId)
            : await fetchBookCategories(bookId);
          if (!active) return;
          if (current.success) {
            const ids = (current.data?.categoryIds || []).map(Number);
            setSelected(ids);
            onSelectionChange?.(ids);
          }
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [bookId, isLexora, schoolFixed, ownSchoolId]); // eslint-disable-line react-hooks/exhaustive-deps

  const school = hierarchy.find((s) => s.id === schoolId) || null;
  const departments = school?.departments || [];

  const categories = (departments.find((d) => d.id === departmentId)?.categories) || [];

  // Names for the selected chips (a selection may span departments).
  const selectedChips = selected.map((id) => {
    for (const s of hierarchy) {
      for (const d of s.departments) {
        const found = d.categories.find((c) => Number(c.id) === Number(id));
        if (found) return { id, name: found.name, department: d.name };
      }
    }
    return { id, name: `Category #${id}`, department: null };
  });

  const persist = useCallback(async (nextIds) => {
    setSaving(true);
    setStatus("");
    setError(null);
    try {
      const result = isLexora
        ? await setLexoraBookCategories(bookId, nextIds)
        : await setBookCategories(bookId, nextIds);
      if (result.success) {
        setStatus("Saved");
      } else {
        setStatus("");
        setError(result.error || "Failed to save assignment");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [bookId, isLexora]);

  const toggle = (categoryId) => {
    const id = Number(categoryId);
    const nextIds = selected.includes(id)
      ? selected.filter((c) => c !== id)
      : [...selected, id];
    setSelected(nextIds);
    onSelectionChange?.(nextIds);
    if (bookId) persist(nextIds);
  };

  if (!canManage) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border-[1.5px] p-4" style={{ borderColor: "var(--border-light)", background: "var(--bg-subtle)" }}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-widest text-amber-600/80">
          <Tag size={12} /> Category Assignment
        </h3>
        {saving && (
          <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
            <Loader2 size={11} className="animate-spin" /> Saving…
          </span>
        )}
        {!saving && status && (
          <span className="text-[11px] font-semibold" style={{ color: "#2d7a47" }}>{status}</span>
        )}
      </div>

      {error && (
        <p className="rounded-lg px-3 py-2 text-[12px]" role="alert" style={{ background: "rgba(220,38,38,0.07)", color: "#dc2626" }}>
          {error}
        </p>
      )}

      {!bookId && (
        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          Assignments are saved when you create the book.
        </p>
      )}

      {loading ? (
        <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>Loading organization…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider pl-0.5" style={{ color: "var(--text-secondary)" }}>
                School
              </label>
              <select
                value={schoolId ?? ""}
                onChange={(e) => {
                  setSchoolId(e.target.value ? Number(e.target.value) : null);
                  setDepartmentId(null);
                }}
                disabled={schoolFixed}
                className="w-full px-3 py-2.5 rounded-lg text-[13px] border-[1.5px] outline-none"
                style={{ background: "var(--bg-input)", borderColor: "var(--border-light)", color: "var(--text-primary)" }}
              >
                <option value="">Select school</option>
                {hierarchy.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {schoolFixed && (
                <p className="mt-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
                  Your school — only a super admin can change it.
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider pl-0.5" style={{ color: "var(--text-secondary)" }}>
                Department
              </label>
              <select
                value={departmentId ?? ""}
                onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : null)}
                disabled={!schoolId}
                className="w-full px-3 py-2.5 rounded-lg text-[13px] border-[1.5px] outline-none disabled:opacity-60"
                style={{ background: "var(--bg-input)", borderColor: "var(--border-light)", color: "var(--text-primary)" }}
              >
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Category checkboxes for the chosen department */}
          {departmentId && (
            <div className="flex flex-wrap gap-2">
              {categories.length === 0 && (
                <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
                  No categories in this department yet.
                </p>
              )}
              {categories.map((category) => {
                const checked = selected.includes(Number(category.id));
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => toggle(category.id)}
                    aria-pressed={checked}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold border-[1.5px] transition-all duration-150"
                    style={{
                      borderColor: checked ? "#2d7a47" : "var(--border)",
                      background: checked ? "rgba(45,122,71,0.1)" : "var(--bg-surface)",
                      color: checked ? "#2d7a47" : "var(--text-secondary)",
                    }}
                  >
                    {checked && <Check size={11} />}
                    {category.name}
                  </button>
                );
              })}
            </div>
          )}

          {/* Selected summary across departments */}
          {selectedChips.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1" style={{ borderTop: "1px solid var(--border-light)" }}>
              <span className="text-[10px] font-bold uppercase tracking-wider mr-1 self-center" style={{ color: "var(--text-muted)" }}>
                Selected
              </span>
              {selectedChips.map((chip) => (
                <span
                  key={chip.id}
                  className="rp-badge rp-badge--accent"
                  title={chip.department || undefined}
                >
                  {chip.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="pt-1 text-[11px]" style={{ borderTop: "1px solid var(--border-light)", color: "var(--text-muted)" }}>
              No categories assigned — the book follows the legacy fallback (visible per role permissions until assigned).
            </p>
          )}
        </>
      )}
    </div>
  );
}
