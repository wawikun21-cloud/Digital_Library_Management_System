import { useState, useEffect } from "react";
import { Save, Trash2, ChevronUp, ChevronDown, FileText, PlayCircle, HelpCircle, Link2 } from "lucide-react";

const TYPE_OPTIONS = [
  { value: "reading", label: "Reading", icon: FileText },
  { value: "video", label: "Video", icon: PlayCircle },
  { value: "quiz", label: "Quiz", icon: HelpCircle },
  { value: "link", label: "Link", icon: Link2 },
  { value: "document", label: "Document", icon: FileText },
];

export default function LessonEditor({ lesson, moduleId, courseTitle, onSave, onDelete, saving, onNavigatePrev, onNavigateNext, canNavigatePrev, canNavigateNext, onMoveUp, onMoveDown, canMoveUp, canMoveDown }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("reading");
  const [url, setUrl] = useState("");
  const [duration, setDuration] = useState("");

  useEffect(() => {
    if (lesson) {
      setTitle(lesson.title || "");
      setDescription(lesson.description || "");
      setType(lesson.type || "reading");
      setUrl(lesson.url || "");
      setDuration(lesson.duration ? String(lesson.duration) : "");
    }
  }, [lesson]);

  if (!lesson) return null;

  const handleSave = () => {
    onSave?.(moduleId, lesson.id, {
      title,
      description,
      type,
      url: url || null,
      duration: duration ? Number(duration) : null,
    });
  };

  const TypeIcon = TYPE_OPTIONS.find((t) => t.value === type)?.icon || FileText;

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={onNavigatePrev} disabled={!canNavigatePrev} className="p-2 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-30">
              ← Prev
            </button>
            <button onClick={onNavigateNext} disabled={!canNavigateNext} className="p-2 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-30">
              Next →
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={onMoveUp} disabled={!canMoveUp} className="p-2 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-30" title="Move up">
              <ChevronUp size={16} />
            </button>
            <button onClick={onMoveDown} disabled={!canMoveDown} className="p-2 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-30" title="Move down">
              <ChevronDown size={16} />
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-white dark:bg-neutral-900 p-5 space-y-4">
          <div className="flex items-center gap-2 pb-4 border-b border-[var(--border)]">
            <span className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
              <TypeIcon size={18} />
            </span>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">Edit Lesson</h2>
              <p className="text-xs text-neutral-500">{courseTitle || "Course"}</p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Lesson Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-white dark:bg-neutral-800 px-3 py-2 text-sm" placeholder="Lesson title" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-white dark:bg-neutral-800 px-3 py-2 text-sm">
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Description / Content</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="w-full rounded-lg border border-[var(--border)] bg-white dark:bg-neutral-800 px-3 py-2 text-sm" placeholder="Lesson content or instructions" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">URL (optional)</label>
              <input value={url} onChange={(e) => setUrl(e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-white dark:bg-neutral-800 px-3 py-2 text-sm" placeholder="https://..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">Duration (min)</label>
              <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-white dark:bg-neutral-800 px-3 py-2 text-sm" placeholder="0" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <button onClick={() => onDelete?.(moduleId, lesson.id)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-red-700 border border-red-200 hover:bg-red-50">
              <Trash2 size={14} /> Delete Lesson
            </button>
            <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              <Save size={14} /> {saving ? "Saving..." : "Save Lesson"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
