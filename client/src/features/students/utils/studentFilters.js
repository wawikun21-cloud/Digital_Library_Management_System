/**
 * features/students/utils/studentFilters.js
 *
 * School-year derivation, filtering and pagination for the students list.
 * Extracted from the render body of the former pages/Students.jsx.
 */

import { STUDENTS_PER_PAGE } from "../constants/studentsUi";

/**
 * Current school year for this page.
 *
 * NOTE: this page's rule is "June onward starts the new S.Y." (`month >= 5`,
 * 0-indexed). The shared `utils/schoolYearUtils.js` uses an August rule
 * instead — the two disagree, and this page's behaviour is preserved
 * verbatim here rather than silently switching rules. Confirm the correct
 * rule with the backend before unifying.
 */
export function currentSchoolYear() {
  const now = new Date();
  const syStart = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  return `${syStart}-${syStart + 1}`;
}

/** The school-year dropdown window for the import modal (current + N-1 prior). */
export function schoolYearOptions(count) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const syStartYear = now.getMonth() >= 5 ? currentYear : currentYear - 1;
  return Array.from({ length: count }, (_, i) => {
    const start = syStartYear - i;
    return `${start}-${start + 1}`;
  });
}

/** Distinct school years across students, newest first. */
export function deriveSchoolYears(students) {
  return [...new Set(
    students.map(s => s.student_school_year).filter(Boolean)
  )].sort((a, b) => {
    const aYear = parseInt((a || "").split("-")[1] || a || 0);
    const bYear = parseInt((b || "").split("-")[1] || b || 0);
    return bYear - aYear;
  });
}

/** Search + course + year-level + school-year filtering. */
export function filterStudents(students, { searchTerm, filters, selectedSY, schoolYears }) {
  return students.filter(student => {
    const matchesSearch = !searchTerm ||
      student.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_id_number.includes(searchTerm) ||
      (student.student_course && student.student_course.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCourse = filters.course === "All" || student.student_course === filters.course;
    const matchesYearLevel = filters.yearLevel === "All" || student.student_yr_level === filters.yearLevel;
    const matchesSY = schoolYears.length === 0 || !selectedSY || student.student_school_year === selectedSY || !student.student_school_year;
    return matchesSearch && matchesCourse && matchesYearLevel && matchesSY;
  });
}

/** Page slice for the current page. */
export function paginate(items, currentPage, perPage = STUDENTS_PER_PAGE) {
  return items.slice((currentPage - 1) * perPage, currentPage * perPage);
}

export const totalPageCount = (items, perPage = STUDENTS_PER_PAGE) =>
  Math.ceil(items.length / perPage);
