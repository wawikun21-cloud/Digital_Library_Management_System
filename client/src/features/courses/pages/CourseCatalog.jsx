import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCourseList } from "../hooks/useCourseList";
import { useCourseFilters } from "../hooks/useCourseFilters";
import { useDeleteCourse } from "../hooks/useDeleteCourse";
import { useCourseActions } from "../hooks/useCourseActions";
import { useCreateCourse } from "../hooks/useCreateCourse";
import { Search } from "lucide-react";
import CourseTable from "../components/tables/CourseTable";
import CreateCourseModal from "../components/modals/CreateCourseModal";
import ConfirmationModal from "../../../components/ConfirmationModal";
import Toast from "../../../components/Toast";

export default function CourseCatalog() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useCourseList({});
  const { filters, updateFilter } = useCourseFilters();
  const { create } = useCreateCourse();
  const { remove: removeCourse, loading: deleting } = useDeleteCourse();
  const { archive, publish, loading: acting } = useCourseActions();
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [pendingArchive, setPendingArchive] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: "", type: "info" });

  const showToast = (message, type = "info") => {
    setToast({ visible: true, message, type });
  };

  const handleView = (course) => navigate(`/dashboard/courses/${course.id}`);
  const handleEdit = (course) => navigate(`/dashboard/courses/${course.id}?edit=1`);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await removeCourse(pendingDelete.id);
      showToast("Course deleted", "success");
      refetch();
    } catch (err) {
      showToast(err.message || "Failed to delete course", "error");
    } finally {
      setPendingDelete(null);
    }
  };

  const confirmArchive = async () => {
    if (!pendingArchive) return;
    const isUnarchive = pendingArchive.status === "archived";
    try {
      if (isUnarchive) await publish(pendingArchive.id);
      else await archive(pendingArchive.id);
      showToast(isUnarchive ? "Course unarchived" : "Course archived", "success");
      refetch();
    } catch (err) {
      showToast(err.message || "Action failed", "error");
    } finally {
      setPendingArchive(null);
    }
  };

  const handleCreate = async (createdCourse) => {
    refetch();
    setOpen(false);
  };

  const filtered = (data ?? []).filter((c) => {
    if (filters.search && !c.title?.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.category && c.category !== filters.category) return false;
    if (filters.difficulty && c.difficulty !== filters.difficulty) return false;
    return true;
  });

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 bg-gradient-to-br from-white via-neutral-50/80 to-neutral-100/80 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-700 p-5 sm:p-6 shadow-sm dark:shadow-none">
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">Course Catalog</h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">Browse and manage published courses</p>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:shadow-md transition-all"
            >
              Create Course
            </button>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          placeholder="Search courses..."
          value={filters.search}
          onChange={(e) => updateFilter("search", e.target.value)}
          className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-9 sm:pl-10 px-2.5 py-1.5 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-[var(--color-primary)] dark:focus:border-[var(--color-primary)] focus:ring-[rgba(242,92,5,0.20)] transition-all"
        />
      </div>

      {loading && <p className="text-sm text-neutral-500">Loading courses...</p>}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm">
          <p className="font-medium text-red-800">Failed to load courses</p>
          <p className="text-red-600 mt-1">{error}</p>
          <button onClick={refetch} className="mt-2 rounded-lg px-3 py-1.5 text-sm bg-red-600 text-white">Retry</button>
        </div>
      )}
      {!loading && !error && (
        <CourseTable
          courses={filtered}
          onView={handleView}
          onEdit={handleEdit}
          onArchive={setPendingArchive}
          onDelete={(id) => setPendingDelete({ id })}
        />
      )}
      <CreateCourseModal open={open} onClose={() => setOpen(false)} onSuccess={handleCreate} />
      <ConfirmationModal
        isOpen={!!pendingDelete}
        title="Delete Course"
        message={pendingDelete ? `Are you sure you want to delete course #${pendingDelete.id || "this course"}? This cannot be undone.` : ""}
        confirmText="Delete"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
      <ConfirmationModal
        isOpen={!!pendingArchive}
        title={pendingArchive?.status === "archived" ? "Unarchive Course" : "Archive Course"}
        message={pendingArchive ? `Are you sure you want to ${pendingArchive.status === "archived" ? "unarchive" : "archive"} "${pendingArchive.title}"?` : ""}
        confirmText={pendingArchive?.status === "archived" ? "Unarchive" : "Archive"}
        type="warning"
        onConfirm={confirmArchive}
        onCancel={() => setPendingArchive(null)}
      />
      <Toast
        isVisible={toast.visible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </div>
  );
}
