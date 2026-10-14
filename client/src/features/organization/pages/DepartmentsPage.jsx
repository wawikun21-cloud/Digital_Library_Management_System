// ─────────────────────────────────────────────────────────
//  features/organization/pages/DepartmentsPage.jsx
//
//  Department management scoped to the caller's school. A super
//  admin picks any school; everyone else is fixed to their own
//  (display-only mirror — the server re-resolves scope per request
//  and forces the payload's school).
// ─────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { useToast } from "../../../hooks/useToast";
import Toast from "../../../components/Toast";
import { useSchools } from "../hooks/useSchools";
import { useDepartments } from "../hooks/useDepartments";
import DepartmentTable from "../components/DepartmentTable";
import DepartmentFormModal from "../components/DepartmentFormModal";
import OrgListError from "../components/OrgListError";
import OrgDeleteConfirm from "../components/OrgDeleteConfirm";

export default function DepartmentsPage() {
  const { user, isSuperAdmin } = useAuth();
  const { toast, success, error: showError, hideToast } = useToast();

  const { schools, loadSchools } = useSchools();
  const ownSchoolId = user?.school_id ?? null;

  const [selectedSchoolId, setSelectedSchoolId] = useState(
    isSuperAdmin ? null : ownSchoolId
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  // Deep link from the Organization Overview tree (?school_id=) —
  // super admins land on that school's departments.
  const [searchParams] = useSearchParams();
  const schoolParam = searchParams.get("school_id");

  useEffect(() => {
    if (isSuperAdmin && schoolParam) setSelectedSchoolId(Number(schoolParam));
  }, [isSuperAdmin, schoolParam]);

  // Super admins get the school list for the selector; scoped callers
  // only need their own entry resolved (also covers the first render
  // before the cached user carries school_id).
  useEffect(() => {
    loadSchools();
  }, [loadSchools]);

  useEffect(() => {
    if (!isSuperAdmin && !selectedSchoolId && ownSchoolId) {
      setSelectedSchoolId(ownSchoolId);
    }
  }, [isSuperAdmin, ownSchoolId, selectedSchoolId]);

  const schoolId = isSuperAdmin ? selectedSchoolId : ownSchoolId;
  const {
    departments, loading, error, loadDepartments,
    addDepartment, editDepartment, removeDepartment,
  } = useDepartments(schoolId);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments, reloadToken]);

  const reload = () => setReloadToken((token) => token + 1);

  const handleSubmit = async (formData) => {
    const result = editing
      ? await editDepartment(editing.id, formData)
      : await addDepartment({ ...formData, school_id: schoolId });
    if (result?.success) {
      success(editing ? "Department updated" : "Department created");
      setModalOpen(false);
      setEditing(null);
      reload();
    }
    return result;
  };

  const handleConfirmDelete = async () => {
    if (!deleting) return;
    setDeleteError("");
    const result = await removeDepartment(deleting.id);
    if (result?.success) {
      success("Department deleted");
      setDeleting(null);
      reload();
    } else {
      setDeleteError(result?.error || "Failed to delete department");
    }
  };

  const canManage = isSuperAdmin || (ownSchoolId != null && schoolId === ownSchoolId);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold" style={{ color: "var(--text-primary)" }}>
            
          </h1>
          <p className="mt-0.5 text-[13px]" style={{ color: "var(--text-secondary)" }}>
            
          </p>
        </div>
        {canManage && schoolId && (
          <button
            onClick={() => { setEditing(null); setModalOpen(true); }}
            className="rp-btn rp-btn--primary"
          >
            <Plus size={16} aria-hidden="true" /> New Department
          </button>
        )}
      </div>

      {isSuperAdmin && (
        <label className="max-w-xs">
          <span className="mb-1.5 block text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
            School
          </span>
          <select
            value={selectedSchoolId ?? ""}
            onChange={(e) => setSelectedSchoolId(e.target.value ? Number(e.target.value) : null)}
            className="rp-field px-3 py-2.5 text-sm"
          >
            <option value="">Select school</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {error && <OrgListError message={error} onRetry={reload} />}

      <DepartmentTable
        departments={departments}
        loading={loading}
        showSchool={false}
        onEdit={canManage ? (dept) => { setEditing(dept); setModalOpen(true); } : undefined}
        onDelete={canManage ? (dept) => { setDeleteError(""); setDeleting(dept); } : undefined}
      />

      <DepartmentFormModal
        open={modalOpen}
        department={editing}
        schools={schools}
        fixedSchoolId={isSuperAdmin ? null : schoolId}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
      />

      <OrgDeleteConfirm
        deleting={deleting}
        title="Delete department"
        message={`Delete "${deleting?.name}"? Departments still referenced by categories, users or faculty cannot be deleted.`}
        error={deleteError}
        onConfirm={handleConfirmDelete}
        onCancel={() => { setDeleting(null); setDeleteError(""); }}
      />

      <Toast message={toast.message} type={toast.type} isVisible={toast.visible} onClose={hideToast} />
    </div>
  );
}
