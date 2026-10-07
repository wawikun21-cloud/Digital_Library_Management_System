import { useState, useEffect } from "react";
import { BookOpen, Layers, Users } from "lucide-react";
import { ActionButton } from "../../../../components/ui/actionIcons";

const STATUS_META = {
  published: "bg-green-100 text-green-700 border-green-200",
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  archived: "bg-amber-100 text-amber-700 border-amber-200",
  under_review: "bg-blue-100 text-blue-700 border-blue-200",
};

const DIFFICULTY_META = {
  beginner: "bg-green-100 text-green-700 border-green-200",
  intermediate: "bg-amber-100 text-amber-700 border-amber-200",
  advanced: "bg-red-100 text-red-700 border-red-200",
  all_levels: "bg-sky-100 text-sky-700 border-sky-200",
};

function StatusBadge({ status }) {
  const key = (status || "draft").toLowerCase();
  const cls = STATUS_META[key] || STATUS_META.draft;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${cls}`}>
      {status || "draft"}
    </span>
  );
}

function DifficultyBadge({ difficulty }) {
  const key = difficulty || "all_levels";
  const cls = DIFFICULTY_META[key] || DIFFICULTY_META.all_levels;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${cls}`}>
      {difficulty?.replace(/_/g, " ") || "all levels"}
    </span>
  );
}

export default function CourseTable({
  courses,
  onEdit,
  onArchive,
  onDelete,
  onView,
  sortField,
  sortDirection,
  onSort,
}) {
  if (!courses || courses.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-white dark:bg-neutral-900 p-10 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
          <BookOpen size={24} className="text-neutral-400" />
        </div>
        <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">No courses found</p>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Try adjusting your filters or create a new course.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-white dark:bg-neutral-900 shadow-sm dark:shadow-none">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-neutral-50/60 dark:bg-neutral-800/40">
            <th className="text-left px-3 py-2.5 font-medium text-neutral-500 w-10"></th>
            <th className="text-left px-3 py-2.5 font-medium text-neutral-500">Title</th>
            <th className="text-left px-3 py-2.5 font-medium text-neutral-500 hidden md:table-cell">Category</th>
            <th className="text-left px-3 py-2.5 font-medium text-neutral-500">Difficulty</th>
            <th className="text-left px-3 py-2.5 font-medium text-neutral-500">Status</th>
            <th className="text-left px-3 py-2.5 font-medium text-neutral-500 hidden lg:table-cell">Modules</th>
            <th className="text-left px-3 py-2.5 font-medium text-neutral-500 hidden lg:table-cell">Enrollments</th>
            <th className="text-right px-3 py-2.5 font-medium text-neutral-500 w-10" aria-label="Actions"></th>
          </tr>
        </thead>
        <tbody>
          {courses.map((c) => (
            <tr
              key={c.id}
              role="button"
              tabIndex={0}
              onClick={() => onView?.(c)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onView?.(c);
                }
              }}
              aria-label={`Open course ${c.title}`}
              className="group border-b border-[var(--border)] last:border-0 outline-none transition-all duration-150 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 focus-visible:bg-[rgba(242,92,5,0.08)] dark:focus-visible:bg-blue-900/20 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
            >
              <td className="px-3 py-3">
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800">
                  {c.thumbnail_url ? (
                    <img src={c.thumbnail_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <BookOpen size={16} className="text-neutral-400" />
                    </div>
                  )}
                </div>
              </td>
              <td className="px-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-neutral-900 dark:text-neutral-100 group-hover:text-[var(--color-primary-hover)] dark:group-hover:text-[var(--color-primary)] transition-colors">
                    {c.title}
                  </p>
                  <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                    {c.instructor_name || c.category || "—"}
                  </p>
                </div>
              </td>
              <td className="px-3 py-3 text-neutral-500 hidden md:table-cell">{c.category || "—"}</td>
              <td className="px-3 py-3"><DifficultyBadge difficulty={c.difficulty} /></td>
              <td className="px-3 py-3"><StatusBadge status={c.status} /></td>
              <td className="px-3 py-3 hidden lg:table-cell">
                <span className="inline-flex items-center gap-1 text-neutral-600 dark:text-neutral-300">
                  <Layers size={13} className="text-neutral-400" />
                  {c.module_count ?? 0}
                </span>
              </td>
              <td className="px-3 py-3 hidden lg:table-cell">
                <span className="inline-flex items-center gap-1 text-neutral-600 dark:text-neutral-300">
                  <Users size={13} className="text-neutral-400" />
                  {c.enrollment_count ?? 0}
                </span>
              </td>
              <td className="px-3 py-3">
                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                  <ActionButton action="View" label={`Open ${c.title}`} onClick={() => onView?.(c)} />
                  <ActionButton action="Edit" label={`Edit ${c.title}`} onClick={() => onEdit?.(c)} />
                  <ActionButton
                    action={c.status === "archived" ? "Unarchive" : "Archive"}
                    label={c.status === "archived" ? `Unarchive ${c.title}` : `Archive ${c.title}`}
                    onClick={() => onArchive?.(c)}
                  />
                  <ActionButton action="Delete" label={`Delete ${c.title}`} onClick={() => onDelete?.(c.id)} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
