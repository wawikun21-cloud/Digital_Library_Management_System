import { useState } from "react";

export function useCourseFilters(initial = {}) {
  const [filters, setFilters] = useState({
    search: initial.search || "",
    category: initial.category || "",
    difficulty: initial.difficulty || "",
    status: initial.status || "",
  });

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({ search: "", category: "", difficulty: "", status: "" });
  };

  return { filters, updateFilter, resetFilters };
}
