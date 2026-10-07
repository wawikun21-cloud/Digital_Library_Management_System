import { Layers, FileText, AlertCircle } from "lucide-react";

export default function PublishReadiness({ course, modules }) {
  const moduleCount = modules?.length || 0;
  const lessonCount = modules?.reduce((sum, m) => sum + (m.lessons?.length || 0), 0) || 0;
  const emptyModules = modules?.filter((m) => !(m.lessons?.length)).length || 0;
  const hasTitle = !!(course?.title && course.title.trim().length > 0);
  const hasDescription = !!(course?.description && course.description.trim().length > 0);

  const checks = [
    { label: "Course title", ok: hasTitle },
    { label: "Course description", ok: hasDescription },
    { label: "At least one module", ok: moduleCount > 0 },
    { label: "At least one lesson", ok: lessonCount > 0 },
    { label: "No empty modules", ok: emptyModules === 0 },
  ];

  const readyCount = checks.filter((c) => c.ok).length;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Publish Readiness</h3>
      <div className="space-y-2">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center gap-2">
            <span className={`flex h-5 w-5 items-center justify-center rounded-full ${check.ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {check.ok ? "✓" : <AlertCircle size={14} />}
            </span>
            <span className="text-xs text-neutral-700 dark:text-neutral-300">{check.label}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
        <Layers size={14} className="text-neutral-400" />
        <span className="text-xs text-neutral-600 dark:text-neutral-400">{moduleCount} modules</span>
        <FileText size={14} className="text-neutral-400 ml-2" />
        <span className="text-xs text-neutral-600 dark:text-neutral-400">{lessonCount} lessons</span>
      </div>
      <p className="text-xs text-neutral-500">
        {readyCount === checks.length ? "Ready to publish" : `${checks.length - readyCount} item(s) need attention`}
      </p>
    </div>
  );
}
