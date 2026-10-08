import { useState, useEffect } from "react";
import { Save, Trash2, ChevronUp, ChevronDown, FileText, PlayCircle, HelpCircle, Link2 } from "lucide-react";
import RichTextEditor from "../RichTextEditor";

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
            <button onClick={onNavigatePrev} disabled={!canNavigatePrev} className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-30">
              ← Prev
            </button>
            <button onClick={onNavigateNext} disabled={!canNavigateNext} className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-30">
              Next →
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={onMoveUp} disabled={!canMoveUp} className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-30" title="Move up">
              <ChevronUp size={16} />
            </button>
            <button onClick={onMoveDown} disabled={!canMoveDown} className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-30" title="Move down">
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
            <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Lesson Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500" placeholder="Lesson title" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 dark:bg-neutral-800 dark:text-neutral-100">
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Description / Content</label>
            <RichTextEditor value={description} onChange={setDescription} minHeight="10rem" placeholder="Lesson content or instructions" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">URL (optional)</label>
              <input value={url} onChange={(e) => setUrl(e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500" placeholder="https://..." />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Duration (min)</label>
              <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500" placeholder="0" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <button onClick={() => onDelete?.(moduleId, lesson.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40">
              <Trash2 size={14} /> Delete Lesson
            </button>
            <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900 disabled:cursor-not-allowed disabled:opacity-50">
              <Save size={14} /> {saving ? "Saving..." : "Save Lesson"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
