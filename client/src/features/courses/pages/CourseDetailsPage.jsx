import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, Plus, Trash2 } from "lucide-react";
import { useCourseDetails } from "../hooks/useCourseDetails";
import { useModules } from "../hooks/useModules";
import { useEnrollmentList } from "../hooks/useEnrollmentList";
import { useCourseActions } from "../hooks/useCourseActions";
import { useDeleteCourse } from "../hooks/useDeleteCourse";
import { useUpdateCourse } from "../hooks/useUpdateCourse";
import { useDeleteModule } from "../hooks/useDeleteModule";
import ConfirmationModal from "../../../components/ConfirmationModal";
import Toast from "../../../components/Toast";
import EditCourseModal from "../components/modals/EditCourseModal";
import EnrollStudentsModal from "../components/modals/EnrollStudentsModal";
import { formatDate } from "../utils/courseHelpers";
import RichTextContent from "../components/RichTextContent";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "modules", label: "Modules" },
  { key: "students", label: "Students" },
];

export default function CourseDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: course, loading, error, refetch } = useCourseDetails(id);
  const { data: modules } = useModules(id);
  const { data: enrollments } = useEnrollmentList({ courseId: id });
  const { archive, publish, loading: acting } = useCourseActions();
  const { remove: removeCourse, loading: deleting } = useDeleteCourse();
  const { update: updateCourseSettings, loading: updatingSettings } = useUpdateCourse();
  const { remove: deleteModule, loading: deletingModule } = useDeleteModule();
  const [tab, setTab] = useState("overview");
  const [modals, setModals] = useState({});
  const [pendingArchive, setPendingArchive] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", type: "info" });

  const showToast = (message, type = "info") => {
    setToast({ visible: true, message, type });
  };

  const isEditMode = searchParams.get("edit") === "1";

  useEffect(() => {
    if (isEditMode) {
      setModals((p) => ({ ...p, edit: true }));
    }
  }, [isEditMode]);

  const confirmArchive = async () => {
    if (!id) return;
    try {
      if (course.status === "archived") await publish(id);
      else await archive(id);
      showToast(course.status === "archived" ? "Course unarchived" : "Course archived", "success");
      refetch?.();
    } catch (err) {
      showToast(err.message || "Action failed", "error");
    } finally {
      setPendingArchive(false);
    }
  };

  const confirmDelete = async () => {
    if (!id) return;
    try {
      await removeCourse(id);
      showToast("Course deleted", "success");
      navigate("/dashboard/courses");
    } catch (err) {
      showToast(err.message || "Failed to delete course", "error");
      setPendingDelete(false);
    }
  };

  const toggleModal = (key) => setModals((p) => ({ ...p, [key]: !p[key] }));

  const handleSettingsSave = async (payload) => {
    if (!id) return;
    await updateCourseSettings(id, payload);
    await refetch?.();
  };

  if (loading) return <p className="text-sm text-neutral-500">Loading course...</p>;
  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Course Details</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm dark:border-red-900 dark:bg-red-950/30">
          <p className="font-medium text-red-800 dark:text-red-200">Failed to load course</p>
          <p className="mt-1 text-red-600 dark:text-red-300">{error}</p>
          <button onClick={refetch} className="mt-2 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none space-y-5 sm:space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 bg-gradient-to-br from-white via-neutral-50/80 to-neutral-100/80 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-700 p-5 sm:p-6 shadow-sm dark:shadow-none">
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard/courses")}
              aria-label="Back to courses"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              <ChevronLeft size={16} />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">{course?.title ?? "Course Details"}</h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                {course?.status || "—"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1">
            <button
              onClick={() => navigate(`/dashboard/courses/${course?.id}/builder`)}
              className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              Manage Course
            </button>
            <button
              onClick={() => toggleModal("edit")}
              className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              Edit
            </button>
            <button
              onClick={() => setPendingArchive(true)}
              className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              {course?.status === "archived" ? "Unarchive" : "Archive"}
            </button>
            <button
              onClick={() => setPendingDelete(true)}
              className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-neutral-200 dark:border-neutral-700 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t.key
                ? "border-[var(--color-primary)] text-[var(--color-primary)] dark:border-[var(--color-primary)] dark:text-[var(--color-primary)]"
                : "border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === "overview" && (
          <div className="rounded-xl border border-[var(--border)] bg-white dark:bg-neutral-900 p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-neutral-500">Category</p>
                <p className="text-sm text-neutral-900 dark:text-neutral-100">{course?.category || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-500">Difficulty</p>
                <p className="text-sm text-neutral-900 dark:text-neutral-100 capitalize">{course?.difficulty?.replace(/_/g, " ") || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-500">Start Date</p>
                <p className="text-sm text-neutral-900 dark:text-neutral-100">{formatDate(course?.start_date)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-500">End Date</p>
                <p className="text-sm text-neutral-900 dark:text-neutral-100">{formatDate(course?.end_date)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-500">Max Enrollments</p>
                <p className="text-sm text-neutral-900 dark:text-neutral-100">{course?.max_enrollments ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-500">Instructor</p>
                <p className="text-sm text-neutral-900 dark:text-neutral-100">{course?.instructor_name || "—"}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-500 mb-1">Description</p>
              <RichTextContent value={course?.description} className="text-sm text-neutral-900 dark:text-neutral-100" />
            </div>
            {course?.prerequisites && (
              <div>
                <p className="text-xs font-medium text-neutral-500 mb-1">Prerequisites</p>
                <ul className="list-disc list-inside text-sm text-neutral-900 dark:text-neutral-100">
                  {JSON.parse(course.prerequisites).map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {course?.learning_outcomes && (
              <div>
                <p className="text-xs font-medium text-neutral-500 mb-1">Learning Outcomes</p>
                <ul className="list-disc list-inside text-sm text-neutral-900 dark:text-neutral-100">
                  {JSON.parse(course.learning_outcomes).map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {tab === "modules" && (
          <div className="rounded-xl border border-[var(--border)] bg-white dark:bg-neutral-900 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Modules</h3>
              <button
                onClick={() => toggleModal("module")}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
              >
                <Plus size={14} /> Add Module
              </button>
            </div>
            <div className="space-y-2">
              {(modules || []).map((mod) => (
                <div key={mod.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3">
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{mod.title}</p>
                    <p className="text-xs text-neutral-500 capitalize">{mod.type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleModal(`content-${mod.id}`)}
                      className="rounded px-2 py-1 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--bg-hover)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                    >
                      Manage Content
                    </button>
                    <button
                      onClick={async () => {
                        await deleteModule(id, mod.id);
                        refetch?.();
                      }}
                      disabled={deletingModule}
                      aria-label={`Delete module ${mod.title}`}
                      className="rounded p-2 text-red-600 transition-colors hover:bg-red-50 hover:text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {(!modules || modules.length === 0) && (
                <p className="text-xs text-neutral-500 text-center py-4">No modules yet.</p>
              )}
            </div>
          </div>
        )}

        {tab === "students" && (
          <div className="rounded-xl border border-[var(--border)] bg-white dark:bg-neutral-900 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Enrollments</h3>
              <button
                onClick={() => toggleModal("enroll")}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
              >
                <Plus size={14} /> Enroll Student
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-neutral-50/60 dark:bg-neutral-800/40">
                    <th className="text-left px-3 py-2 font-medium text-neutral-500">User</th>
                    <th className="text-left px-3 py-2 font-medium text-neutral-500">Role</th>
                    <th className="text-left px-3 py-2 font-medium text-neutral-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(enrollments || []).map((enrollment) => (
                    <tr key={enrollment.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="px-3 py-2 text-neutral-900 dark:text-neutral-100">{enrollment.username || enrollment.user_id}</td>
                      <td className="px-3 py-2 text-neutral-600 dark:text-neutral-300 capitalize">{enrollment.role}</td>
                      <td className="px-3 py-2 text-neutral-600 dark:text-neutral-300 capitalize">{enrollment.status}</td>
                    </tr>
                  ))}
                  {(!enrollments || enrollments.length === 0) && (
                    <tr>
                      <td colSpan={3} className="px-3 py-6 text-center text-xs text-neutral-500">
                        No enrollments yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <EditCourseModal open={modals.edit} onClose={() => toggleModal("edit")} course={course} onSuccess={refetch} />
      <EnrollStudentsModal open={modals.enroll} onClose={() => toggleModal("enroll")} courseId={id} onSuccess={refetch} />
      <ConfirmationModal
        isOpen={pendingArchive}
        title={course?.status === "archived" ? "Unarchive Course" : "Archive Course"}
        message={course ? `Are you sure you want to ${course.status === "archived" ? "unarchive" : "archive"} "${course.title}"?` : ""}
        confirmText={course?.status === "archived" ? "Unarchive" : "Archive"}
        type="warning"
        onConfirm={confirmArchive}
        onCancel={() => setPendingArchive(false)}
      />
      <ConfirmationModal
        isOpen={pendingDelete}
        title="Delete Course"
        message={course ? `Are you sure you want to delete "${course.title}"? This cannot be undone.` : ""}
        confirmText="Delete"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(false)}
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
