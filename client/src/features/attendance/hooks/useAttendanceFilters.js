/**
 * features/attendance/hooks/useAttendanceFilters.js
 *
 * History filters + derived list for the attendance management page:
 * search / course / date / status, pagination and the cleared-results
 * derivation. Extracted from the component body of the former
 * pages/Attendance.jsx, following the same concern split as the
 * dashboard filters hook.
 */

import { useState, useEffect, useMemo } from "react";
import useDebounce from "../../../hooks/useDebounce";

const PAGE_SIZE = 25;

export function useAttendanceFilters(records) {
  const [fSearch, setFSearch] = useState("");
  const [fCourse, setFCourse] = useState("");
  const [fDate,   setFDate]   = useState("");
  const [fStatus, setFStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const debouncedSearch = useDebounce(fSearch, 300);

  const courses = useMemo(
    () => [...new Set(records.map((r) => r.student_course).filter(Boolean))].sort(),
    [records]
  );

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    return records.filter((r) => {
      if (q && !r.student_name.toLowerCase().includes(q) && !r.student_id_number.toLowerCase().includes(q)) return false;
      if (fCourse  && r.student_course !== fCourse)                                         return false;
      if (fDate    && new Date(r.check_in_time).toISOString().slice(0, 10) !== fDate)       return false;
      if (fStatus !== "all" && r.status !== fStatus)                                        return false;
      return true;
    });
  }, [records, debouncedSearch, fCourse, fDate, fStatus]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, fCourse, fDate, fStatus]);

  const paginated = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filtered, currentPage]);

  const hasFilters   = fSearch || fCourse || fDate || fStatus !== "all";
  const clearFilters = () => { setFSearch(""); setFCourse(""); setFDate(""); setFStatus("all"); };

  return {
    pageSize:          PAGE_SIZE,
    search:            fSearch, onSearch:   setFSearch,
    course:            fCourse, onCourse:   setFCourse,
    date:              fDate,   onDate:     setFDate,
    status:            fStatus, onStatus:   setFStatus,
    courses,
    filtered, paginated,
    currentPage, setCurrentPage,
    hasFilters, clearFilters,
  };
}
