import { useState, useEffect } from "react";
import { Save, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import RichTextEditor from "../RichTextEditor";

export default function ModuleEditor({ module, onSave, onDelete, saving, courseId, onMoveUp, onMoveDown, canMoveUp, canMoveDown }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("chapter");

  useEffect(() => {
    if (module) {
      setTitle(module.title || "");
      setDescription(module.description || "");
      setType(module.type || "chapter");
    }
  }, [module]);

  if (!module) return null;

  const handleSave = () => {
    onSave?.(module.id, { title, description, type });
  };

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Edit Module</h2>
          <div className="flex items-center gap-1">
            <button aria-label="Move module up" onClick={onMoveUp} disabled={!canMoveUp} className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-30">
              <ChevronUp size={16} />
            </button>
            <button aria-label="Move module down" onClick={onMoveDown} disabled={!canMoveDown} className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-30">
              <ChevronDown size={16} />
            </button>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-white dark:bg-neutral-900 p-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Module Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 dark:bg-neutral-800 dark:text-neutral-100"
              placeholder="Module title"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-white dark:bg-neutral-800 px-3 py-2 text-sm">
              <option value="chapter">Chapter</option>
              <option value="unit">Unit</option>
              <option value="lesson">Lesson</option>
              <option value="section">Section</option>
              <option value="topic">Topic</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Description</label>
            <RichTextEditor value={description} onChange={setDescription} placeholder="Module description" />
          </div>
          <div className="flex items-center justify-between pt-2">
            <button onClick={() => onDelete?.(module.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40">
              <Trash2 size={14} /> Delete Module
            </button>
            <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900 disabled:cursor-not-allowed disabled:opacity-50">
              <Save size={14} /> {saving ? "Saving..." : "Save Module"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
