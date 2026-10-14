// ─────────────────────────────────────────────────────────
//  features/organization/pages/OrganizationOverviewPage.jsx
//
//  The organization section's landing page: the whole
//  School → Department → Category tree in one view.
//
//   • search → filters the (already-authorized) tree
//   • + on a school      → inline create department (code auto-generated)
//   • + on a department  → inline create category
//   • expand a category  → the shared AssignedBooksPanel (search +
//     assign/unassign physical & digital books)
//   • rows link into the Schools / Departments / Categories pages
//
//  Composition only: data from useHierarchy, create state from
//  useOrganizationTreeActions, presentation from the tree
//  components. Creation stays here or in the existing modals —
//  the management pages keep edit/delete.
// ─────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { useToast } from "../../../hooks/useToast";
import Toast from "../../../components/Toast";
import { useHierarchy } from "../hooks/useHierarchy";
import { useOrganizationMutations } from "../hooks/useOrganizationMutations";
import { useOrganizationTreeActions } from "../hooks/useOrganizationTreeActions";
import { findSchoolById, findDepartmentById } from "../utils/hierarchyFilter";
import OrganizationTree, { OrganizationSearch } from "../components/OrganizationTree";
import OrgListError from "../components/OrgListError";
import DepartmentFormModal from "../components/DepartmentFormModal";
import CategoryFormModal from "../components/CategoryFormModal";

export default function OrganizationOverviewPage() {
  const { isSuperAdmin, hasPermissionAction } = useAuth();
  const { toast, success, hideToast } = useToast();
  const { schools, loading, error, loadHierarchy } = useHierarchy();
  const { createDepartmentWithDetails, createCategoryWithDetails } = useOrganizationMutations();

  const [query, setQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  // A scoped caller's tree is exactly their own school — open it so
  // the overview shows departments immediately. Super admins start
  // collapsed and expand what they need.
  const initiallyExpanded = !isSuperAdmin;
  const seededRef = useRef(false);

  useEffect(() => {
    loadHierarchy();
  }, [loadHierarchy]);

  useEffect(() => {
    if (!initiallyExpanded || seededRef.current || schools.length === 0) return;
    seededRef.current = true;
    setExpandedIds(new Set(schools.map((school) => school.id)));
  }, [initiallyExpanded, schools]);

  const toggleExpand = useCallback((id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Refresh + reveal the new row: expand its parent and reload.
  const finishCreate = useCallback(
    (parentId, message) => {
      success(message);
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.add(parentId);
        return next;
      });
      loadHierarchy();
    },
    [success, loadHierarchy]
  );

  const onCreated = useCallback(
    (parentId, kind) => {
      finishCreate(parentId, kind === "department" ? "Department created" : "Category created");
    },
    [finishCreate]
  );

  const canCreate = hasPermissionAction("manage_organization", "create");
  const actions = useOrganizationTreeActions({ canCreate, onCreated });

  // ── Modal path ("More options" on an inline row) ──────────
  const modal = actions.modal;
  const modalDepartment = modal?.kind === "category" ? findDepartmentById(schools, modal.parentId) : null;
  const modalSchool = modal?.kind === "category" ? findSchoolById(schools, modalDepartment?.school_id) : null;

  const handleModalSubmit = async (formData) => {
    if (!modal) return { success: false, error: "No parent selected" };
    const result =
      modal.kind === "department"
        ? await createDepartmentWithDetails(modal.parentId, formData)
        : await createCategoryWithDetails(modal.parentId, formData);
    if (result.success) {
      actions.closeModal();
      finishCreate(modal.parentId, modal.kind === "department" ? "Department created" : "Category created");
    }
    return result;
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold" style={{ color: "var(--text-primary)" }}>
            Organization Overview
          </h1>
          <p className="mt-0.5 text-[13px]" style={{ color: "var(--text-secondary)" }}>
            Schools, their departments and the categories that control book access.
          </p>
        </div>
        <button onClick={loadHierarchy} disabled={loading} className="rp-btn rp-btn--secondary">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden="true" /> Refresh
        </button>
      </div>

      {error && <OrgListError message={error} onRetry={loadHierarchy} />}

      <OrganizationSearch value={query} onChange={setQuery} />

      <OrganizationTree
        schools={schools}
        loading={loading}
        query={query}
        expandedIds={expandedIds}
        onToggle={toggleExpand}
        actions={actions}
      />

      {/* Full-details creation, parent pinned by the row that opened it */}
      {modal?.kind === "department" && (
        <DepartmentFormModal
          open
          department={null}
          schools={schools}
          fixedSchoolId={modal.parentId}
          onClose={actions.closeModal}
          onSubmit={handleModalSubmit}
        />
      )}

      {modal?.kind === "category" && (
        <CategoryFormModal
          open
          category={null}
          departments={modalSchool?.departments || []}
          fixedDepartmentId={modal.parentId}
          fixedDepartmentName={modalDepartment?.name || ""}
          onClose={actions.closeModal}
          onSubmit={handleModalSubmit}
        />
      )}

      <Toast message={toast.message} type={toast.type} isVisible={toast.visible} onClose={hideToast} />
    </div>
  );
}
