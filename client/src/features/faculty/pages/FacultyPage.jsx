/**
 * features/faculty/pages/FacultyPage.jsx
 *
 * Faculty Management — composition only.
 *
 * Data lives in useFaculty (list + CRUD) and useFacultyFilters
 * (debounced search, department filter, pagination); each modal owns its
 * own state. This page holds only permission gates, which modal is open,
 * and the toast. Replaces the former pages/Faculty.jsx.
 */

import { useState, useCallback } from "react";
import { useAuth } from "../../../hooks/useAuth";
import Toast from "../../../components/Toast";
import { useFaculty } from "../hooks/useFaculty";
import { useFacultyFilters } from "../hooks/useFacultyFilters";
import FacultyPageHeader from "../components/FacultyPageHeader";
import FacultyStatsCards from "../components/FacultyStatsCards";
import FacultyDeptTabs from "../components/FacultyDeptTabs";
import FacultySearchBar from "../components/FacultySearchBar";
import FacultyTable from "../components/FacultyTable";
import FacultyFormModal from "../components/FacultyFormModal";
import FacultyImportModal from "../components/FacultyImportModal";

export default function FacultyPage() {
  const { hasPermissionAction } = useAuth();

  // ── Per-action permission gates (server enforces the same) ──
  const canCreate = hasPermissionAction("manage_faculty", "create");
  const canEdit   = hasPermissionAction("manage_faculty", "edit");
  const canDelete = hasPermissionAction("manage_faculty", "delete");
  const canImport = hasPermissionAction("manage_faculty", "import");

  // ── Toast ─────────────────────────────────────────────
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const showToast = useCallback((message, type = "success") => setToast({ show: true, message, type }), []);
  const hideToast = useCallback(() => setToast(p => ({ ...p, show: false })), []);

  const { faculty, isLoading, fetchFaculty, createMember, updateMember, deleteMember } = useFaculty({ showToast });
  const {
    searchTerm, setSearchTerm, debouncedSearch, isSearching,
    activeDept, setActiveDept,
    currentPage, setCurrentPage,
    filtered, paginated, totalPages, stats,
  } = useFacultyFilters(faculty);

  // ── Modal state ───────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMember,  setEditMember]  = useState(null);   // null = add mode
  const [isImportOpen, setIsImportOpen] = useState(false);

  const openAddModal  = () => { setEditMember(null); setIsModalOpen(true); };
  const openEditModal = (member) => { setEditMember(member); setIsModalOpen(true); };
  const closeModal    = () => { setIsModalOpen(false); setEditMember(null); };

  const handleSave = async (formData) =>
    editMember ? updateMember(editMember.id, formData) : createMember(formData);

  return (
    <div className="flex flex-col gap-5">

      <FacultyPageHeader
        canImport={canImport}
        canCreate={canCreate}
        onImportClick={() => setIsImportOpen(true)}
        onAddClick={openAddModal}
      />

      {/* ── Statistics Cards ── */}
      <FacultyStatsCards stats={stats} isLoading={isLoading} onSelectDept={setActiveDept} />

      {/* ── Department Filter Tabs ── */}
      <FacultyDeptTabs faculty={faculty} activeDept={activeDept} onSelectDept={setActiveDept} />

      {/* ── Search & Results Bar ── */}
      <FacultySearchBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        debouncedSearch={debouncedSearch}
        isSearching={isSearching}
        activeDept={activeDept}
        onClearDept={() => setActiveDept("All")}
        paginatedCount={paginated.length}
        filteredCount={filtered.length}
        isLoading={isLoading}
      />

      {/* ── Faculty Table ── */}
      <FacultyTable
        paginated={paginated}
        filteredCount={filtered.length}
        isLoading={isLoading}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onEdit={openEditModal}
        onDelete={deleteMember}
        canEdit={canEdit}
        canDelete={canDelete}
        debouncedSearch={debouncedSearch}
        activeDept={activeDept}
      />

      {/* ── Add / Edit Modal ── */}
      {isModalOpen && (
        <FacultyFormModal
          mode={editMember ? "edit" : "add"}
          member={editMember}
          onClose={closeModal}
          onSave={handleSave}
        />
      )}

      {/* ── Bulk Import Modal ── */}
      {isImportOpen && (
        <FacultyImportModal
          onClose={() => setIsImportOpen(false)}
          showToast={showToast}
          onImported={fetchFaculty}
        />
      )}

      {/* ── Toast ────────────────────────────────────────── */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.show}
          onClose={hideToast}
        />
      )}
    </div>
  );
}
