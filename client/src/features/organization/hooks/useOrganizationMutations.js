// ─────────────────────────────────────────────────────────
//  features/organization/hooks/useOrganizationMutations.js
//
//  Create calls for the tree's two paths:
//   • Under*  — inline fast path: name only, department code
//     generated from the name (utils/generateDepartmentCode).
//   • WithDetails* — modal path: the full form payload
//     (code, description, active) with the parent pinned.
//  Thin glue over the feature API module — no rules here.
// ─────────────────────────────────────────────────────────

import { useCallback } from "react";
import { createDepartment, createCategory } from "../api/organizationApi";
import { generateDepartmentCode } from "../utils/generateDepartmentCode";

export function useOrganizationMutations() {
  /** Inline: name only; the code is derived from the name. */
  const createDepartmentUnder = useCallback(
    (schoolId, name) =>
      createDepartment({ school_id: schoolId, name, code: generateDepartmentCode(name) }),
    []
  );

  /** Modal: full form payload (name, code, description, is_active). */
  const createDepartmentWithDetails = useCallback(
    (schoolId, details) => createDepartment({ ...details, school_id: schoolId }),
    []
  );

  const createCategoryUnder = useCallback(
    (departmentId, name) => createCategory({ department_id: departmentId, name }),
    []
  );

  const createCategoryWithDetails = useCallback(
    (departmentId, details) => createCategory({ ...details, department_id: departmentId }),
    []
  );

  return {
    createDepartmentUnder,
    createDepartmentWithDetails,
    createCategoryUnder,
    createCategoryWithDetails,
  };
}
