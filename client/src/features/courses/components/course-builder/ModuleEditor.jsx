import { useState, useEffect } from "react";
import { Save, Trash2, ChevronUp, ChevronDown } from "lucide-react";

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
            <button onClick={onMoveUp} disabled={!canMoveUp} className="p-2 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-30">
              <ChevronUp size={16} />
            </button>
            <button onClick={onMoveDown} disabled={!canMoveDown} className="p-2 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-30">
              <ChevronDown size={16} />
            </button>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-white dark:bg-neutral-900 p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Module Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
              placeholder="Module title"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-white dark:bg-neutral-800 px-3 py-2 text-sm">
              <option value="chapter">Chapter</option>
              <option value="unit">Unit</option>
              <option value="lesson">Lesson</option>
              <option value="section">Section</option>
              <option value="topic">Topic</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full rounded-lg border border-[var(--border)] bg-white dark:bg-neutral-800 px-3 py-2 text-sm" placeholder="Module description" />
          </div>
          <div className="flex items-center justify-between pt-2">
            <button onClick={() => onDelete?.(module.id)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-red-700 border border-red-200 hover:bg-red-50">
              <Trash2 size={14} /> Delete Module
            </button>
            <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              <Save size={14} /> {saving ? "Saving..." : "Save Module"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
