/**
 * features/students/hooks/useStudentFilters.js
 *
 * Search / course / year-level / school-year filters plus pagination.
 * Extracted from the render body of the former pages/Students.jsx.
 */

import { useState, useEffect, useMemo } from "react";
import {
  deriveSchoolYears, filterStudents, paginate, totalPageCount,
} from "../utils/studentFilters";

const DEFAULT_FILTERS = { course: "All", yearLevel: "All" };

export function useStudentFilters(students) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters]       = useState(DEFAULT_FILTERS);
  const [selectedSY, setSelectedSY] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Derived, sorted school years (declared before the filter that uses them)
  const schoolYears = useMemo(() => deriveSchoolYears(students), [students]);

  // Default to "All School Years" when students load
  useEffect(() => {
    if (schoolYears.length > 0) {
      setSelectedSY(prev => prev && (prev === "" || schoolYears.includes(prev)) ? prev : "");
    } else {
      setSelectedSY("");
    }
  }, [schoolYears]); // eslint-disable-line

  const filteredStudents = useMemo(
    () => filterStudents(students, { searchTerm, filters, selectedSY, schoolYears }),
    [students, searchTerm, filters, selectedSY, schoolYears]
  );

  const paginatedStudents = useMemo(
    () => paginate(filteredStudents, currentPage),
    [filteredStudents, currentPage]
  );

  const totalPages = totalPageCount(filteredStudents);

  // Reset to page 1 when filters/search/SY change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters, selectedSY]);

  return {
    searchTerm, setSearchTerm,
    filters, setFilters,
    selectedSY, setSelectedSY,
    schoolYears,
    filteredStudents, paginatedStudents,
    currentPage, setCurrentPage, totalPages,
  };
}
