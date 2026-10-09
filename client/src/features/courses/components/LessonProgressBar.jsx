import { CheckCircle, Lock } from "lucide-react";

export default function LessonProgressBar({ completed, total, percentage, modules }) {
  const pct = Math.min(100, Math.max(0, percentage || 0));

  return (
    <div className="mb-6 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Your Progress
        </span>
        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
          {completed || 0} of {total || 0} lessons
        </span>
      </div>

      <div className="h-2.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      {modules && modules.length > 0 && (
        <div className="mt-3 space-y-2.5">
          {modules.map((mod) => {
            const modLessons = mod.lessons || [];
            const modTotal = modLessons.length;
            const modCompleted = modLessons.filter((l) => l.status === "completed").length;
            const isModuleDone = modCompleted >= modTotal && modTotal > 0;

            return (
              <div key={mod.id || mod.moduleId} className="flex items-center gap-2 text-xs">
                <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                <span className="text-neutral-600 dark:text-neutral-400 truncate flex-1">
                  {mod.title || mod.moduleTitle || "Module"}
                </span>
                <span className="text-neutral-500 dark:text-neutral-400">
                  {modCompleted}/{modTotal}
                </span>
                {isModuleDone && modTotal > 0 && (
                  <CheckCircle size={12} className="text-green-500 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
