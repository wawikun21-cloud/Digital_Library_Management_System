// ─────────────────────────────────────────────────────────
//  features/organization/pages/SchoolsPage.jsx
//
//  Super-admin-only school management. Composes the schools hook,
//  the table, the form modal and the toast — no data logic, no
//  JSX sections of its own beyond composition.
// ─────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { useToast } from "../../../hooks/useToast";
import Toast from "../../../components/Toast";
import { useSchools } from "../hooks/useSchools";
import SchoolTable from "../components/SchoolTable";
import SchoolFormModal from "../components/SchoolFormModal";
import OrgListError from "../components/OrgListError";
import OrgDeleteConfirm from "../components/OrgDeleteConfirm";

export default function SchoolsPage() {
  const { isSuperAdmin } = useAuth();
  const { toast, success, error: showError, hideToast } = useToast();
  const { schools, loading, error, loadSchools, addSchool, editSchool, removeSchool } = useSchools();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!isSuperAdmin) return;
    loadSchools();
  }, [loadSchools, isSuperAdmin, reloadToken]);

  // Schools are created only by a super admin — the server enforces
  // the same rule inside the service, this is the mirror.
  if (!isSuperAdmin) {
    return <Navigate to="/dashboard/organization/departments" replace />;
  }

  const reload = () => setReloadToken((token) => token + 1);

  const handleSubmit = async (formData) => {
    const result = editing
      ? await editSchool(editing.id, formData)
      : await addSchool(formData);
    if (result?.success) {
      success(editing ? "School updated" : "School created");
      setModalOpen(false);
      setEditing(null);
      reload();
    }
    return result;
  };

  const handleConfirmDelete = async () => {
    if (!deleting) return;
    setDeleteError("");
    const result = await removeSchool(deleting.id);
    if (result?.success) {
      success("School deleted");
      setDeleting(null);
      reload();
    } else {
      setDeleteError(result?.error || "Failed to delete school");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold" style={{ color: "var(--text-primary)" }}>
            Schools
          </h1>
          <p className="mt-0.5 text-[13px]" style={{ color: "var(--text-secondary)" }}>
            Each school owns its departments, categories, users and books.
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="rp-btn rp-btn--primary"
        >
          <Plus size={16} aria-hidden="true" /> New School
        </button>
      </div>

      {error && <OrgListError message={error} onRetry={reload} />}

      <SchoolTable
        schools={schools}
        loading={loading}
        onEdit={(school) => { setEditing(school); setModalOpen(true); }}
        onDelete={(school) => { setDeleteError(""); setDeleting(school); }}
      />

      <SchoolFormModal
        open={modalOpen}
        school={editing}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
      />

      <OrgDeleteConfirm
        deleting={deleting}
        title="Delete school"
        message={`Delete "${deleting?.name}"? Schools still referenced by departments, users or faculty cannot be deleted.`}
        error={deleteError}
        onConfirm={handleConfirmDelete}
        onCancel={() => { setDeleting(null); setDeleteError(""); }}
      />

      <Toast message={toast.message} type={toast.type} isVisible={toast.visible} onClose={hideToast} />
    </div>
  );
}
