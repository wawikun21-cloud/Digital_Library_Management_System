// ─────────────────────────────────────────────────────────
//  features/organization/index.js
//
//  Public API of the organization feature. Other features import
//  ONLY from here (never deep paths): the pages for routing, the
//  hooks for school/department/category selectors, and the
//  assignment API for the book forms' category controls.
// ─────────────────────────────────────────────────────────

export { default as OrganizationOverviewPage } from "./pages/OrganizationOverviewPage";
export { default as SchoolsPage } from "./pages/SchoolsPage";
export { default as DepartmentsPage } from "./pages/DepartmentsPage";
export { default as CategoriesPage } from "./pages/CategoriesPage";

export { useHierarchy } from "./hooks/useHierarchy";
export { useSchools } from "./hooks/useSchools";
export { useDepartments } from "./hooks/useDepartments";
export { useCategories } from "./hooks/useCategories";

export { default as SchoolSelect } from "./components/SchoolSelect";
export { default as DepartmentSelect } from "./components/DepartmentSelect";
export { default as BookCategoryAssignment } from "./components/BookCategoryAssignment";

export {
  fetchBookCategories,
  fetchLexoraBookCategories,
  setBookCategories,
  setLexoraBookCategories,
} from "./api/organizationApi";
