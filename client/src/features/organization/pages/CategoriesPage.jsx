// ─────────────────────────────────────────────────────────
//  features/organization/pages/CategoriesPage.jsx
//
//  Category management + the assigned-books panel. A super admin
//  picks any school; scoped callers are fixed to their own. The
//  department filter narrows the table and feeds the form modal's
//  dependent department select.
// ─────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { useToast } from "../../../hooks/useToast";
import Toast from "../../../components/Toast";
import { useSchools } from "../hooks/useSchools";
import { useDepartments } from "../hooks/useDepartments";
import { useCategories } from "../hooks/useCategories";
import CategoryTable from "../components/CategoryTable";
import CategoryFormModal from "../components/CategoryFormModal";
import AssignedBooksPanel from "../components/AssignedBooksPanel";
import CategoryScopeFilters from "../components/CategoryScopeFilters";
import OrgListError from "../components/OrgListError";
import OrgDeleteConfirm from "../components/OrgDeleteConfirm";

export default function CategoriesPage() {
  const { user, isSuperAdmin } = useAuth();
  const { toast, success, hideToast } = useToast();

  const { schools, loadSchools } = useSchools();
  const ownSchoolId = user?.school_id ?? null;

  const [selectedSchoolId, setSelectedSchoolId] = useState(isSuperAdmin ? null : ownSchoolId);
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [activeCategory, setActiveCategory] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  // Deep links from the Organization Overview tree:
  //   ?department_id=  → open that department's categories
  //   ?category_id=    → also open its assigned-books panel
  const [searchParams] = useSearchParams();
  const departmentParam = searchParams.get("department_id");
  const categoryParam = searchParams.get("category_id");

  useEffect(() => {
    if (departmentParam) setDepartmentFilter(departmentParam);
  }, [departmentParam]);

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
    departments, loading: loadingDepartments, loadDepartments,
  } = useDepartments(schoolId);

  const {
    categories, loading, error, loadCategories,
    addCategory, editCategory, removeCategory,
  } = useCategories({
    departmentId: departmentFilter || null,
    schoolId: departmentFilter ? null : schoolId,
  });

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories, reloadToken]);

  // Arriving from the tree with ?category_id=: preselect the row so
  // its assigned-books panel opens once the list has loaded.
  useEffect(() => {
    if (!categoryParam || activeCategory) return;
    const found = categories.find((c) => String(c.id) === String(categoryParam));
    if (found) setActiveCategory(found);
  }, [categoryParam, categories, activeCategory]);

  // A delete or edit invalidates the panel's row — drop the selection.
  useEffect(() => {
    if (activeCategory && !categories.some((c) => c.id === activeCategory.id)) {
      setActiveCategory(null);
    }
  }, [categories, activeCategory]);

  const reload = () => setReloadToken((token) => token + 1);

  const handleSubmit = async (formData) => {
    const departmentId = editing
      ? (formData.department_id ?? editing.department_id)
      : formData.department_id;
    const result = editing
      ? await editCategory(editing.id, { ...formData, department_id: departmentId })
      : await addCategory(formData);
    if (result?.success) {
      success(editing ? "Category updated" : "Category created");
      setModalOpen(false);
      setEditing(null);
      reload();
    }
    return result;
  };

  const handleConfirmDelete = async () => {
    if (!deleting) return;
    setDeleteError("");
    const result = await removeCategory(deleting.id);
    if (result?.success) {
      success("Category deleted");
      if (activeCategory?.id === deleting.id) setActiveCategory(null);
      setDeleting(null);
      reload();
    } else {
      setDeleteError(result?.error || "Failed to delete category");
    }
  };

  const canManage = isSuperAdmin || (ownSchoolId != null && schoolId === ownSchoolId);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold" style={{ color: "var(--text-primary)" }}>
            Categories
          </h1>
          <p className="mt-0.5 text-[13px]" style={{ color: "var(--text-secondary)" }}>
            Assign books to categories to control who can see them.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => { setEditing(null); setModalOpen(true); }}
            className="rp-btn rp-btn--primary"
            disabled={!departments.length}
            title={departments.length ? undefined : "Create a department first"}
          >
            <Plus size={16} aria-hidden="true" /> New Category
          </button>
        )}
      </div>

      <CategoryScopeFilters
        isSuperAdmin={isSuperAdmin}
        schools={schools}
        selectedSchoolId={selectedSchoolId}
        onSchoolChange={(id) => { setSelectedSchoolId(id); setDepartmentFilter(""); }}
        departments={departments}
        departmentFilter={departmentFilter}
        onDepartmentChange={setDepartmentFilter}
      />

      {error && <OrgListError message={error} onRetry={reload} />}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
        <CategoryTable
          categories={categories}
          loading={loading}
          selectedId={activeCategory?.id}
          onSelect={setActiveCategory}
          onEdit={canManage ? (category) => { setEditing(category); setModalOpen(true); } : undefined}
          onDelete={canManage ? (category) => { setDeleteError(""); setDeleting(category); } : undefined}
        />
        <AssignedBooksPanel category={activeCategory} />
      </div>

      <CategoryFormModal
        open={modalOpen}
        category={editing}
        departments={departments}
        loadingDepartments={loadingDepartments}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
      />

      <OrgDeleteConfirm
        deleting={deleting}
        title="Delete category"
        message={`Delete "${deleting?.name}"? Books assigned to it keep their other categories.`}
        error={deleteError}
        onConfirm={handleConfirmDelete}
        onCancel={() => { setDeleting(null); setDeleteError(""); }}
      />

      <Toast message={toast.message} type={toast.type} isVisible={toast.visible} onClose={hideToast} />
    </div>
  );
}
