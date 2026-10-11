/**
 * features/faculty/hooks/useFacultyFilters.js
 *
 * Debounced search + department filter + derived stats and pagination.
 * Extracted from the render body of the former pages/Faculty.jsx.
 */

import { useState, useEffect, useMemo } from "react";
import useDebounce from "../../../hooks/useDebounce";
import { filterFaculty, departmentStats, paginate, totalPageCount } from "../utils/facultyFilters";

export function useFacultyFilters(faculty) {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch             = useDebounce(searchTerm, 300);
  const [activeDept, setActiveDept] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  // True from keystroke until the debounce lands (drives the search spinner).
  const isSearching = searchTerm !== debouncedSearch;

  // Reset page on search / dept filter change
  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, activeDept]);

  const filtered = useMemo(
    () => filterFaculty(faculty, { search: debouncedSearch, activeDept }),
    [faculty, debouncedSearch, activeDept]
  );

  const stats = useMemo(() => departmentStats(faculty), [faculty]);

  const paginated = useMemo(() => paginate(filtered, currentPage), [filtered, currentPage]);

  const totalPages = totalPageCount(filtered);

  return {
    searchTerm, setSearchTerm, debouncedSearch, isSearching,
    activeDept, setActiveDept,
    currentPage, setCurrentPage,
    filtered, paginated, totalPages, stats,
  };
}
