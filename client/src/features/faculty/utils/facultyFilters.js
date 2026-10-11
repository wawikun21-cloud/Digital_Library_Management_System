/**
 * features/faculty/utils/facultyFilters.js
 *
 * Pure filtering, stats and pagination for the faculty list. Extracted from
 * the render body of the former pages/Faculty.jsx.
 */

import { DEPARTMENTS, FACULTY_PER_PAGE } from "../constants/facultyUi";

/** Search (name OR department, case-insensitive) + department filter. */
export function filterFaculty(faculty, { search, activeDept }) {
  const q = (search || "").toLowerCase();
  return faculty.filter(f => {
    const matchesSearch =
      !q ||
      f.faculty_name.toLowerCase().includes(q) ||
      f.department.toLowerCase().includes(q);
    const matchesDept = activeDept === "All" || f.department === activeDept;
    return matchesSearch && matchesDept;
  });
}

/**
 * Derived stats: total headcount plus per-department counts (DEPARTMENTS
 * order, zero-count departments dropped). Counts always come from the FULL
 * list, not the filtered one.
 */
export function departmentStats(faculty) {
  return {
    total: faculty.length,
    byDept: DEPARTMENTS.map(d => ({
      ...d,
      count: faculty.filter(f => f.department === d.code).length,
    })).filter(d => d.count > 0),
  };
}

/** Live count per tab — also from the full list. */
export function departmentCount(faculty, dept) {
  return dept === "All"
    ? faculty.length
    : faculty.filter(f => f.department === dept).length;
}

/** Page slice for the current page. */
export function paginate(items, currentPage, perPage = FACULTY_PER_PAGE) {
  return items.slice((currentPage - 1) * perPage, currentPage * perPage);
}

export const totalPageCount = (items, perPage = FACULTY_PER_PAGE) =>
  Math.ceil(items.length / perPage);
