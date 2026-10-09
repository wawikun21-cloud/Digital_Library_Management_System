import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ChevronLeft, BookOpen, Clock, Users, PlayCircle,
  GraduationCap, Globe, Layers,
} from "lucide-react";
import { useCourseDetails } from "../hooks/useCourseDetails";
import { useEnrollmentList } from "../hooks/useEnrollmentList";
import { useCourseActions } from "../hooks/useCourseActions";
import { useDeleteCourse } from "../hooks/useDeleteCourse";
import { useUpdateCourse } from "../hooks/useUpdateCourse";
import { useAuth } from "../../../hooks/useAuth";
import ConfirmationModal from "../../../components/ConfirmationModal";
import Toast from "../../../components/Toast";
import EditCourseModal from "../components/modals/EditCourseModal";
import EnrollStudentsModal from "../components/modals/EnrollStudentsModal";
import RichTextContent from "../components/RichTextContent";
import CourseContentSection from "../components/CourseContentSection";
import OverviewSection from "../components/OverviewSection";
import CourseAdminTabs from "../components/CourseAdminTabs";

const DIFFICULTY_META = {
  beginner: { label: "Beginner" },
  intermediate: { label: "Intermediate" },
  advanced: { label: "Advanced" },
  all_levels: { label: "All Levels" },
};

function MetaStat({ icon: Icon, value, label }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
      <Icon size={13} className="text-neutral-400 dark:text-neutral-500" />
      <span>{value}</span>
    </div>
  );
}

export default function CourseDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: course, loading, error, refetch } = useCourseDetails(id);
  const { isStudent } = useAuth();
  const { data: enrollments } = useEnrollmentList({ courseId: id });
  const { archive, publish, loading: acting } = useCourseActions();
  const { remove: removeCourse, loading: deleting } = useDeleteCourse();
  const { update: updateCourseSettings, loading: updatingSettings } = useUpdateCourse();
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

  const handleLessonClick = (lesson) => {
    navigate(`/dashboard/courses/${id}/learn/${lesson.id}`);
  };

  const handleStartLearning = () => {
    navigate(`/dashboard/courses/${id}/learn`);
  };

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

  const handleAction = (key) => {
    if (key === "module") toggleModal("module");
    else if (key === "enroll") toggleModal("enroll");
    else if (key === "edit") toggleModal("edit");
    else if (key === "builder") navigate(`/dashboard/courses/${course?.id}/builder`);
  };

  const parseJSONField = (field) => {
    if (!field) return [];
    try {
      const parsed = typeof field === "string" ? JSON.parse(field) : field;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const learningOutcomes = parseJSONField(course?.learning_outcomes);
  const prerequisites = parseJSONField(course?.prerequisites);
  const difficulty = DIFFICULTY_META[course?.difficulty] || DIFFICULTY_META.all_levels;

  if (loading) {
    return (
      <div className="w-full max-w-none space-y-5 sm:space-y-6">
        <div className="h-56 rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-900 animate-pulse" />
        <div className="space-y-4">
          <div className="h-4 w-24 rounded bg-neutral-200 dark:bg-neutral-700" />
          <div className="h-6 w-2/3 rounded bg-neutral-200 dark:bg-neutral-700" />
          <div className="h-4 w-1/2 rounded bg-neutral-200 dark:bg-neutral-700" />
        </div>
      </div>
    );
  }

  if (error && !course) {
    return (
      <div className="w-full max-w-3xl mx-auto space-y-4">
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Course Details</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm dark:border-red-900 dark:bg-red-950/30">
          <p className="font-medium text-red-800 dark:text-red-200">Failed to load course</p>
          <p className="mt-1 text-red-600 dark:text-red-300">{error}</p>
          <button onClick={refetch} className="mt-2 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none space-y-5 sm:space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <ChevronLeft size={16} />
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
          {course?.title ?? "Course Details"}
        </h1>
      </div>

      <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 bg-gradient-to-br from-white via-neutral-50/80 to-neutral-100/80 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-700 p-5 sm:p-6 shadow-sm dark:shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-end gap-5 sm:gap-6">
          <div className="relative h-40 w-full sm:h-44 sm:w-40 md:h-48 md:w-64 shrink-0 rounded-xl overflow-hidden border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-800 shadow-sm">
            {course?.thumbnail_url ? (
              <img
                src={course.thumbnail_url}
                alt={course.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                <BookOpen size={36} className="text-blue-400 dark:text-blue-500" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-3.5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                  {difficulty.label}
                </span>
                {course?.category && (
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                    {course.category}
                  </span>
                )}
              </div>
              <h2 className="mt-1.5 text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight leading-tight">
                {course?.title || "Course Details"}
              </h2>
              {course?.instructor_name && (
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                  by {course.instructor_name}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-neutral-500 dark:text-neutral-400">
              <MetaStat icon={Clock} value={`${course?.duration_hours || 0}h`} label="Duration" />
              <span className="hidden sm:block h-3 w-px bg-neutral-200 dark:bg-neutral-700" />
              <MetaStat icon={BookOpen} value={`${course?.lesson_count || 0} lessons`} label="Lessons" />
              <span className="hidden sm:block h-3 w-px bg-neutral-200 dark:bg-neutral-700" />
              <MetaStat icon={Users} value={`${course?.enrollment_count || enrollments?.length || 0} students`} label="Students" />
              <span className="hidden sm:block h-3 w-px bg-neutral-200 dark:bg-neutral-700" />
              <MetaStat icon={Globe} value="English" label="Language" />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              {isStudent ? (
                <button
                  onClick={handleStartLearning}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
                >
                  <PlayCircle size={14} />
                  Start Learning
                </button>
              ) : (
                <button
                  onClick={() => navigate(`/dashboard/courses/${course?.id}/builder`)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                >
                  Manage Course
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {isStudent ? (
        <StudentCourseView
          course={course}
          id={id}
          learningOutcomes={learningOutcomes}
          prerequisites={prerequisites}
          handleLessonClick={handleLessonClick}
        />
      ) : (
        <CourseAdminTabs
          course={course}
          id={id}
          activeTab={tab}
          onTabChange={setTab}
          onLessonView={handleLessonClick}
          enrollments={enrollments}
          onAction={handleAction}
          onArchive={() => setPendingArchive(true)}
          onDelete={() => setPendingDelete(true)}
        />
      )}

      <EditCourseModal
        open={modals.edit}
        onClose={() => toggleModal("edit")}
        course={course}
        onSuccess={refetch}
      />
      <EnrollStudentsModal
        open={modals.enroll}
        onClose={() => toggleModal("enroll")}
        courseId={id}
        onSuccess={refetch}
      />
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

function StudentCourseView({ course, id, learningOutcomes, prerequisites, handleLessonClick }) {
  return (
    <div className="space-y-6">
      <OverviewSection title="About this course" icon={BookOpen}>
        {learningOutcomes.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2 flex items-center gap-2">
              <GraduationCap size={14} /> What you'll learn
            </h3>
            <ul className="space-y-1.5">
              {learningOutcomes.map((outcome, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                  <span className="text-[var(--color-primary)] mt-0.5">✓</span>
                  <span>{outcome}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {course?.description && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">Description</h3>
            <RichTextContent value={course.description} className="text-sm text-neutral-700 dark:text-neutral-300" />
          </div>
        )}

        {prerequisites.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">Prerequisites</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-neutral-600 dark:text-neutral-300">
              {prerequisites.map((pre, i) => (
                <li key={i}>{pre}</li>
              ))}
            </ul>
          </div>
        )}
      </OverviewSection>

      <OverviewSection title="Course Content" icon={Layers}>
        <CourseContentSection
          courseId={id}
          onLessonView={handleLessonClick}
        />
      </OverviewSection>
    </div>
  );
}
