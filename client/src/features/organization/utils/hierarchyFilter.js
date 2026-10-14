// ─────────────────────────────────────────────────────────
//  features/organization/utils/hierarchyFilter.js
//
//  Pure tree helpers for the overview page's search box. The
//  filter is display-only: it narrows the already-authorized tree
//  the server sent (a node matches on name or code, a branch is
//  kept when any descendant matches). No React, no fetching.
// ─────────────────────────────────────────────────────────

function matches(node, query) {
  const q = query.toLowerCase();
  return (
    String(node.name || "").toLowerCase().includes(q) ||
    String(node.code || "").toLowerCase().includes(q)
  );
}

function filterDepartments(departments, query) {
  const kept = [];
  for (const dept of departments || []) {
    const keptCategories = filterCategories(dept.categories, query);
    if (matches(dept, query) || keptCategories.length > 0) {
      kept.push(keptCategories.length > 0 || !matches(dept, query)
        ? { ...dept, categories: keptCategories }
        : dept);
    }
  }
  return kept;
}

function filterCategories(categories, query) {
  return (categories || []).filter((category) => matches(category, query));
}

/**
 * Filtered copy of the school tree. A school is kept when it
 * matches or any of its departments/categories match; a department
 * is kept when it matches or any of its categories match.
 * An empty query returns the tree unchanged.
 */
export function filterHierarchy(schools, query) {
  const q = (query || "").trim();
  if (!q) return schools;
  return (schools || []).filter((school) => {
    const keptDepartments = filterDepartments(school.departments, q);
    return matches(school, q) || keptDepartments.length > 0
      ? { ...school, departments: matches(school, q) ? school.departments : keptDepartments }
      : false;
  });
}

/**
 * Every expandable id in the (filtered) tree — school + department
 * ids. Used to auto-open matching branches while a search is
 * active and to expand the caller's own school by default.
 */
export function collectExpandableIds(schools) {
  const ids = [];
  for (const school of schools || []) {
    ids.push(school.id);
    for (const dept of school.departments || []) ids.push(dept.id);
  }
  return ids;
}

/** Sum of a school's categories — display aggregation only. */
export function countSchoolCategories(school) {
  return (school.departments || []).reduce((sum, dept) => sum + (dept.categories?.length || 0), 0);
}

/** Lookups used by the overview page's modal path (parent pinning). */
export function findSchoolById(schools, id) {
  if (id == null) return null;
  return (schools || []).find((school) => Number(school.id) === Number(id)) || null;
}

export function findDepartmentById(schools, id) {
  if (id == null) return null;
  for (const school of schools || []) {
    const found = (school.departments || []).find((dept) => Number(dept.id) === Number(id));
    if (found) return found;
  }
  return null;
}
