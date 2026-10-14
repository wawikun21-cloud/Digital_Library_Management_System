export { default as StudentsPage } from "./pages/StudentsPage";
export { useStudents } from "./hooks/useStudents";
export { useStudentFilters } from "./hooks/useStudentFilters";

// Student lookup (kiosk / RFID registration) consumed by the
// attendance feature through the students feature's public API.
export * from "./api/studentsApi";
