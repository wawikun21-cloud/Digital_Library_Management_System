/**
 * features/students/pages/StudentsPage.jsx
 *
 * Student Management — composition only.
 *
 * Data lives in useStudents (list + stats + CRUD), filters/pagination in
 * useStudentFilters; each modal owns its own state (form fields, import
 * machine). This page holds only permission gates, which modal is open, and
 * the toast. Replaces the former pages/Students.jsx.
 */

import { useState, useCallback } from "react";
import { useAuth } from "../../../hooks/useAuth";
import Toast from "../../../components/Toast";
import { useStudents } from "../hooks/useStudents";
import { useStudentFilters } from "../hooks/useStudentFilters";
import StudentsPageHeader from "../components/StudentsPageHeader";
import StudentsStatsCards from "../components/StudentsStatsCards";
import StudentsSchoolYearFilter from "../components/StudentsSchoolYearFilter";
import StudentsFilterBar from "../components/StudentsFilterBar";
import StudentsTable from "../components/StudentsTable";
import StudentFormModal from "../components/StudentFormModal";
import StudentImportModal from "../components/StudentImportModal";

export default function StudentsPage() {
  const { hasPermissionAction, user: currentUser } = useAuth();

  // ── Per-action permission gates (server enforces the same) ──
  const canCreate = hasPermissionAction("manage_students", "create");
  const canEdit   = hasPermissionAction("manage_students", "edit");
  const canDelete = hasPermissionAction("manage_students", "delete");
  const canImport = hasPermissionAction("manage_students", "import");

  // ── Toast state ─────────────────────────────────────
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const showToast = useCallback((message, type = "success") => setToast({ show: true, message, type }), []);
  const hideToast = useCallback(() => setToast(p => ({ ...p, show: false })), []);

  const {
    students, stats, isLoading,
    fetchData, createMember, updateMember, deleteMember, checkIdExists,
  } = useStudents({ showToast });

  const {
    searchTerm, setSearchTerm,
    filters, setFilters,
    selectedSY, setSelectedSY,
    schoolYears,
    filteredStudents, paginatedStudents,
    currentPage, setCurrentPage, totalPages,
  } = useStudentFilters(students);

  // ── Modal state ─────────────────────────────────────
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [editStudent, setEditStudent]   = useState(null);   // null = add mode
  const [isImportOpen, setIsImportOpen] = useState(false);

  const openAddModal  = () => { setEditStudent(null); setIsModalOpen(true); };
  const openEditModal = (student) => { setEditStudent(student); setIsModalOpen(true); };
  const closeModal    = () => { setIsModalOpen(false); setEditStudent(null); };

  const courseOptions = stats?.byCourse.map(c => c.student_course) ?? [];
  const yearLevelOptions = stats?.byYearLevel.map(y => y.student_yr_level) ?? [];

  return (
    <div className="flex flex-col gap-5">
      {/* ── Page Header ────────────────────────────────── */}
      <StudentsPageHeader
        canImport={canImport}
        canCreate={canCreate}
        onRefresh={fetchData}
        onImportClick={() => setIsImportOpen(true)}
        onAddClick={openAddModal}
      />

      {/* ── Statistics Cards ────────────────────────────── */}
      <StudentsStatsCards stats={stats} />

      {/* ── School Year Dropdown ────────────────────────────── */}
      <StudentsSchoolYearFilter
        schoolYears={schoolYears}
        selectedSY={selectedSY}
        onSelectSY={setSelectedSY}
        filteredCount={filteredStudents.length}
      />

      {/* ── Filters and Search ──────────────────────────── */}
      <StudentsFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={filters}
        onFiltersChange={setFilters}
        courses={courseOptions}
        yearLevels={yearLevelOptions}
        paginatedCount={paginatedStudents.length}
        filteredCount={filteredStudents.length}
        isLoading={isLoading}
      />

      {/* ── Students Table ───────────────────────────────── */}
      <StudentsTable
        paginatedStudents={paginatedStudents}
        filteredCount={filteredStudents.length}
        isLoading={isLoading}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onEdit={openEditModal}
        onDelete={deleteMember}
        canEdit={canEdit}
        canDelete={canDelete}
        searchTerm={searchTerm}
      />

      {/* ── Student Form Modal ───────────────────────────── */}
      {isModalOpen && (
        <StudentFormModal
          mode={editStudent ? "edit" : "add"}
          student={editStudent}
          currentUser={currentUser}
          onClose={closeModal}
          onCreate={createMember}
          onUpdate={updateMember}
          onCheckId={checkIdExists}
        />
      )}

      {/* ── Bulk Import Modal ────────────────────────────── */}
      {isImportOpen && (
        <StudentImportModal
          onClose={() => setIsImportOpen(false)}
          showToast={showToast}
          onImported={fetchData}
          currentUser={currentUser}
        />
      )}

      {/* ── Toast Notification ───────────────────────────── */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </div>
  );
}
