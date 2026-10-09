import { useState } from "react";
import { Users, BarChart3, Award, Plus, Layers } from "lucide-react";
import { useDeleteModule } from "../hooks/useDeleteModule";
import RichTextContent from "./RichTextContent";
import CourseContentSection from "./CourseContentSection";
import OverviewSection from "./OverviewSection";
import EnrollStudentsModal from "./modals/EnrollStudentsModal";
import ConfirmationModal from "../../../components/ConfirmationModal";
import Toast from "../../../components/Toast";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "content", label: "Content" },
  { key: "enrollments", label: "Students" },
  { key: "analytics", label: "Analytics" },
  { key: "actions", label: "Actions" },
];

export default function CourseAdminTabs({ course, id, activeTab, onTabChange, onLessonView, enrollments, refetch, onAction, onDelete, onArchive }) {
  return (
    <>
      <div className="flex gap-1 border-b border-neutral-200 dark:border-neutral-700 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => onTabChange(t.key)}
            className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === t.key
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === "overview" && <OverviewTab course={course} />}
        {activeTab === "content" && (
          <CourseContentSection
            courseId={id}
            onLessonView={onLessonView}
            headerAction={
              <button
                onClick={() => onAction("module")}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] focus-visible:outline-none"
              >
                <Plus size={14} /> Add Module
              </button>
            }
          />
        )}
        {activeTab === "enrollments" && <EnrollmentTab enrollments={enrollments} onEnroll={() => onAction("enroll")} />}
        {activeTab === "analytics" && <AnalyticsTab course={course} enrollments={enrollments} />}
        {activeTab === "actions" && (
          <OverviewSection title="Quick Actions" icon={Award}>
            <ActionButtons course={course} onAction={onAction} onArchive={() => onArchive()} onDelete={() => onDelete()} />
          </OverviewSection>
        )}
      </div>
    </>
  );
}

function OverviewTab({ course }) {
  const parseJSON = (field) => {
    if (!field) return [];
    try {
      const parsed = typeof field === "string" ? JSON.parse(field) : field;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const learningOutcomes = parseJSON(course?.learning_outcomes);
  const prerequisites = parseJSON(course?.prerequisites);

  return (
    <OverviewSection title="Course Information" icon={Layers}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div><p className="text-xs font-medium text-neutral-500">Category</p><p className="text-sm text-neutral-900 dark:text-neutral-100">{course?.category || "—"}</p></div>
        <div><p className="text-xs font-medium text-neutral-500">Difficulty</p><p className="text-sm text-neutral-900 dark:text-neutral-100">{course?.difficulty?.replace(/_/g, " ") || "—"}</p></div>
        <div><p className="text-xs font-medium text-neutral-500">Status</p><p className="text-sm text-neutral-900 dark:text-neutral-100 capitalize">{course?.status || "—"}</p></div>
        <div><p className="text-xs font-medium text-neutral-500">Start Date</p><p className="text-sm text-neutral-900 dark:text-neutral-100">{course?.start_date || "—"}</p></div>
        <div><p className="text-xs font-medium text-neutral-500">End Date</p><p className="text-sm text-neutral-900 dark:text-neutral-100">{course?.end_date || "—"}</p></div>
        <div><p className="text-xs font-medium text-neutral-500">Max Enrollments</p><p className="text-sm text-neutral-900 dark:text-neutral-100">{course?.max_enrollments ?? "—"}</p></div>
        <div><p className="text-xs font-medium text-neutral-500">Instructor</p><p className="text-sm text-neutral-900 dark:text-neutral-100">{course?.instructor_name || "—"}</p></div>
      </div>

      {course?.description && (
        <div className="mt-4">
          <p className="text-xs font-medium text-neutral-500 mb-1">Description</p>
          <RichTextContent value={course.description} className="text-sm text-neutral-700 dark:text-neutral-300" />
        </div>
      )}

      {prerequisites.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-neutral-500 mb-1">Prerequisites</p>
          <ul className="list-disc list-inside text-sm text-neutral-900 dark:text-neutral-100">
            {prerequisites.map((item, idx) => <li key={idx}>{item}</li>)}
          </ul>
        </div>
      )}

      {learningOutcomes.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-neutral-500 mb-1">Learning Outcomes</p>
          <ul className="list-disc list-inside text-sm text-neutral-900 dark:text-neutral-100">
            {learningOutcomes.map((item, idx) => <li key={idx}>{item}</li>)}
          </ul>
        </div>
      )}
    </OverviewSection>
  );
}

function EnrollmentTab({ enrollments, onEnroll }) {
  return (
    <OverviewSection title="Enrolled Students" icon={Users} className="pb-0">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-neutral-500 dark:text-neutral-400">{enrollments?.length || 0} total</span>
        <button
          onClick={onEnroll}
          className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] focus-visible:outline-none"
        >
          <Plus size={14} /> Enroll Student
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50/60 dark:bg-neutral-800/40">
              <th className="text-left px-3 py-2 font-medium text-neutral-500">User</th>
              <th className="text-left px-3 py-2 font-medium text-neutral-500">Role</th>
              <th className="text-left px-3 py-2 font-medium text-neutral-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {(enrollments || []).map((e) => (
              <tr key={e.id} className="border-b border-neutral-200 dark:border-neutral-700 last:border-0">
                <td className="px-3 py-2 text-neutral-900 dark:text-neutral-100">{e.username || e.user_id}</td>
                <td className="px-3 py-2 text-neutral-600 dark:text-neutral-300 capitalize">{e.role}</td>
                <td className="px-3 py-2 text-neutral-600 dark:text-neutral-300 capitalize">{e.status}</td>
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
    </OverviewSection>
  );
}

function AnalyticsTab({ course, enrollments }) {
  return (
    <OverviewSection title="Analytics Overview" icon={BarChart3}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Enrolled", value: enrollments?.length || 0 },
          { label: "Lessons", value: course?.lesson_count || 0 },
          { label: "Duration", value: `${course?.duration_hours || 0}h` },
          { label: "Status", value: course?.status || "—" },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-neutral-200/80 dark:border-neutral-700/80 bg-neutral-50/60 dark:bg-neutral-800/40 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{item.label}</p>
            <p className="mt-1 text-lg font-bold text-neutral-900 dark:text-neutral-100">{item.value}</p>
          </div>
        ))}
      </div>
    </OverviewSection>
  );
}

function ActionButtons({ course, onAction, onArchive, onDelete }) {
  return (
    <div className="space-y-2">
      <button
        onClick={() => onAction("builder")}
        className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-left text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
      >
        Edit Course Content
      </button>
      <button
        onClick={() => onAction("edit")}
        className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-left text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
      >
        Edit Course Settings
      </button>
      <button
        onClick={() => onAction("enroll")}
        className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-left text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
      >
        Assign Students
      </button>
      <button
        onClick={onArchive}
        className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-left text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
      >
        {course?.status === "archived" ? "Unarchive Course" : "Archive Course"}
      </button>
      <button
        onClick={onDelete}
        className="w-full rounded-lg border border-red-200 px-3 py-2 text-left text-xs text-red-600 dark:hover:bg-red-950/40 transition-colors"
      >
        Delete Course
      </button>
    </div>
  );
}
