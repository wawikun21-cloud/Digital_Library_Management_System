import { useState, useCallback } from "react";
import { ChevronRight, BookOpen, FileText, Video, HelpCircle, Clock, GraduationCap, Lock } from "lucide-react";
import { useModules } from "../hooks/useModules";
import { getModuleContent } from "../api/coursesApi";

const LESSON_TYPE_META = {
  video: { icon: Video, label: "Video" },
  document: { icon: FileText, label: "Document" },
  quiz: { icon: HelpCircle, label: "Quiz" },
  reading: { icon: FileText, label: "Reading" },
  text: { icon: FileText, label: "Reading" },
};

function LessonRow({ moduleId, lesson, onView, disabled }) {
  const meta = LESSON_TYPE_META[lesson.type] || LESSON_TYPE_META.text;
  const Icon = meta.icon;

  if (disabled) {
    return (
      <div className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-neutral-400 dark:text-neutral-500">
        <Icon size={15} className="shrink-0 text-neutral-300 dark:text-neutral-600" />
        <span className="flex-1 min-w-0 truncate">{lesson.title}</span>
        {lesson.duration ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-neutral-300 dark:text-neutral-600">
            <Clock size={11} />
            {lesson.duration}m
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onView({ moduleId, lessonId: lesson.id, title: lesson.title, type: lesson.type })}
      className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
    >
      <Icon size={15} className="shrink-0 text-neutral-400 dark:text-neutral-500" />
      <span className="flex-1 min-w-0 truncate text-neutral-700 dark:text-neutral-200">{lesson.title}</span>
      {lesson.is_required && (
        <span className="hidden sm:inline text-[10px] font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">
          Required
        </span>
      )}
      {lesson.duration ? (
        <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400 dark:text-neutral-500">
          <Clock size={11} />
          {lesson.duration}m
        </span>
      ) : null}
    </button>
  );
}

function ModuleBlock({ courseId, module, index, onLessonView, locked }) {
  const [open, setOpen] = useState(false);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(async () => {
    if (locked) return;
    const next = !open;
    setOpen(next);
    if (next && lessons.length === 0) {
      setLoading(true);
      try {
        const res = await getModuleContent(courseId, module.id);
        setLessons(res.data || res || []);
      } catch {
        setLessons([]);
      } finally {
        setLoading(false);
      }
    }
  }, [open, lessons.length, courseId, module.id, locked]);

  const count = module.content_count ?? lessons.length;

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-900">
      <button
        type="button"
        onClick={toggle}
        disabled={locked}
        aria-disabled={locked || undefined}
        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
          locked
            ? "cursor-not-allowed text-neutral-400 dark:text-neutral-500"
            : "hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40"
        }`}
      >
        <ChevronRight
          size={16}
          className={`shrink-0 text-neutral-400 transition-transform ${locked ? "" : open ? "rotate-90" : ""}`}
        />
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20 text-xs font-bold text-[var(--color-primary-hover)] dark:text-[var(--color-primary)]">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{module.title}</p>
          {module.description && (
            <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{module.description}</p>
          )}
        </div>
        <span className="shrink-0 text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
          {count} {count === 1 ? "lesson" : "lessons"}
        </span>
        {locked && <Lock size={13} className="shrink-0 text-neutral-300 dark:text-neutral-600" />}
      </button>

      {open && !locked && (
        <div className="border-t border-neutral-100 dark:border-neutral-800 px-3 py-2">
          {loading ? (
            <div className="space-y-2 px-2.5 py-2">
              {Array.from({ length: Math.max(1, count) }).map((_, i) => (
                <div key={i} className="h-4 w-2/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
              ))}
            </div>
          ) : lessons.length === 0 ? (
            <p className="px-2.5 py-2 text-xs text-neutral-400">No lessons in this module yet</p>
          ) : (
            <div className="space-y-0.5">
              {lessons.map((lesson) => (
                <LessonRow
                  key={lesson.id}
                  moduleId={module.id}
                  lesson={lesson}
                  onView={onLessonView}
                  disabled={locked}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CourseContentSection({ courseId, onLessonView, headerAction, locked }) {
  const { data: modules, loading, error } = useModules(courseId);

  const totalLessons = modules.reduce(
    (sum, m) => sum + (m.content_count ?? 0),
    0
  );

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-900" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm dark:border-red-500/30 dark:bg-red-500/10">
        <p className="font-medium text-red-800 dark:text-red-200">Could not load course content</p>
        <p className="mt-1 text-red-600 dark:text-red-300">{error}</p>
      </div>
    );
  }

  if (!modules || modules.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-white p-10 text-center dark:bg-neutral-900">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
          <BookOpen size={24} className="text-neutral-400" />
        </div>
        <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">No content yet</p>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          This course doesn't have any modules or lessons published.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 text-xs text-neutral-500 dark:text-neutral-400">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <GraduationCap size={14} className="text-[var(--color-primary)] dark:text-[var(--color-primary)]" />
            {modules.length} {modules.length === 1 ? "module" : "modules"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <BookOpen size={14} className="text-[var(--color-primary)] dark:text-[var(--color-primary)]" />
            {totalLessons} {totalLessons === 1 ? "lesson" : "lessons"}
          </span>
        </div>
        {headerAction}
      </div>

      {locked && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800/40 px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400">
          <Lock size={13} className="shrink-0" />
          Enroll in this course to access its lessons.
        </div>
      )}

      <div className="space-y-3">
        {modules.map((module, i) => (
          <ModuleBlock
            key={module.id}
            courseId={courseId}
            module={module}
            index={i}
            onLessonView={onLessonView}
            locked={locked}
          />
        ))}
      </div>
    </div>
  );
}
