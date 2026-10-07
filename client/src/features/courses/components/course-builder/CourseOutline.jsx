import { useState } from "react";
import { ChevronRight, ChevronDown, Plus, Trash2, Edit3, FileText, PlayCircle, HelpCircle, Link2, BookOpen } from "lucide-react";

const TYPE_CONFIG = {
  video: { icon: PlayCircle, label: "Video" },
  reading: { icon: FileText, label: "Text" },
  quiz: { icon: HelpCircle, label: "Quiz" },
  link: { icon: Link2, label: "Link" },
  document: { icon: FileText, label: "File" },
};

function LessonItem({ lesson, moduleId, isSelected, onSelect, onRemove, onUpdateTitle, onMoveUp, onMoveDown, isFirst, isLast }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(lesson.title || "");
  const cfg = TYPE_CONFIG[lesson.type] || TYPE_CONFIG.reading;
  const Icon = cfg.icon;

  const save = () => {
    onUpdateTitle?.(title.trim() || "Untitled lesson");
    setEditing(false);
  };

  return (
    <div
      className={`flex items-center gap-1 rounded-md px-2 py-1.5 cursor-pointer transition-colors ${
        isSelected ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]" : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
      }`}
      onClick={() => onSelect?.(lesson.id)}
    >
      <span className="shrink-0 text-neutral-400">
        <Icon size={14} />
      </span>
      {editing ? (
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); save(); }
            if (e.key === "Escape") { setEditing(false); setTitle(lesson.title || ""); }
          }}
          className="flex-1 min-w-0 rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-xs"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="flex-1 min-w-0 truncate text-xs">{lesson.title || "Untitled lesson"}</span>
      )}
      <div className="flex items-center gap-0.5 shrink-0">
        <button onClick={(e) => { e.stopPropagation(); onMoveUp?.(); }} disabled={isFirst} className="p-0.5 text-neutral-400 hover:text-neutral-700 disabled:opacity-30">
          ↑
        </button>
        <button onClick={(e) => { e.stopPropagation(); onMoveDown?.(); }} disabled={isLast} className="p-0.5 text-neutral-400 hover:text-neutral-700 disabled:opacity-30">
          ↓
        </button>
        <button onClick={(e) => { e.stopPropagation(); setEditing(true); }} className="p-0.5 text-neutral-400 hover:text-neutral-700">
          <Edit3 size={12} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onRemove?.(); }} className="p-0.5 text-neutral-400 hover:text-red-600">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

function ModuleItem({ module, index, selectedModuleId, selectedLessonId, onSelectModule, onSelectLesson, onUpdateModule, onRemoveModule, onAddLesson, onUpdateLesson, onRemoveLesson, onMoveModuleUp, onMoveModuleDown, isFirst, isLast, onMoveLessonUp, onMoveLessonDown }) {
  const [expanded, setExpanded] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(module.title || "");
  const lessons = module.lessons || [];

  const saveTitle = () => {
    onUpdateModule?.({ title: title.trim() || `Module ${index + 1}` });
    setEditingTitle(false);
  };

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
      <div className="flex items-center gap-1 px-2 py-2 bg-neutral-50 dark:bg-neutral-800/50">
        <button onClick={() => setExpanded(!expanded)} className="p-0.5 text-neutral-500 hover:text-neutral-700">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {editingTitle ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); saveTitle(); }
              if (e.key === "Escape") { setEditingTitle(false); setTitle(module.title || ""); }
            }}
            className="flex-1 min-w-0 rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-xs"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <button onClick={() => onSelectModule?.(module.id)} className="flex-1 min-w-0 text-left text-xs font-medium truncate">
            {module.title || `Module ${index + 1}`}
          </button>
        )}
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={() => onMoveModuleUp?.()} disabled={isFirst} className="p-0.5 text-neutral-400 hover:text-neutral-700 disabled:opacity-30">↑</button>
          <button onClick={() => onMoveModuleDown?.()} disabled={isLast} className="p-0.5 text-neutral-400 hover:text-neutral-700 disabled:opacity-30">↓</button>
          <button onClick={() => setEditingTitle(true)} className="p-0.5 text-neutral-400 hover:text-neutral-700"><Edit3 size={12} /></button>
          <button onClick={() => onRemoveModule?.(module.id)} className="p-0.5 text-neutral-400 hover:text-red-600"><Trash2 size={12} /></button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-neutral-100 dark:border-neutral-800 px-2 py-1.5 space-y-0.5">
          {lessons.map((lesson, lIdx) => (
            <LessonItem
              key={lesson.id || lIdx}
              lesson={lesson}
              moduleId={module.id}
              isSelected={selectedLessonId === lesson.id}
              onSelect={(lessonId) => onSelectLesson?.(module.id, lessonId)}
              onRemove={() => onRemoveLesson?.(module.id, lIdx)}
              onUpdateTitle={(newTitle) => onUpdateLesson?.(module.id, lIdx, { title: newTitle })}
              onMoveUp={() => onMoveLessonUp?.(module.id, lIdx)}
              onMoveDown={() => onMoveLessonDown?.(module.id, lIdx)}
              isFirst={lIdx === 0}
              isLast={lIdx === lessons.length - 1}
            />
          ))}
          <button
            onClick={() => onAddLesson?.(module.id)}
            className="flex items-center gap-1 w-full px-2 py-1 text-xs text-neutral-500 hover:text-[var(--color-primary)] transition-colors"
          >
            <Plus size={12} /> Add lesson
          </button>
        </div>
      )}
    </div>
  );
}

export default function CourseOutline({ modules, selectedModuleId, selectedLessonId, onSelectModule, onSelectLesson, onAddModule, onUpdateModule, onRemoveModule, onAddLesson, onUpdateLesson, onRemoveLesson, onMoveModuleUp, onMoveModuleDown, onMoveLessonUp, onMoveLessonDown, outlineFilter }) {
  const [search, setSearch] = useState(outlineFilter || "");

  const filtered = modules.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (m.title || "").toLowerCase().includes(q) || (m.lessons || []).some((l) => (l.title || "").toLowerCase().includes(q));
  });

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 py-3 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Course Structure</span>
          <button type="button" onClick={onAddModule} className="inline-flex items-center gap-1 rounded-md bg-[var(--color-primary)] px-2.5 py-1.5 text-xs font-medium text-white hover-brand transition-colors">
            <Plus size={14} /> Add
          </button>
        </div>
        <div className="relative">
          <BookOpen size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-7 pr-2 py-1 text-xs"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {filtered.map((mod, idx) => (
          <ModuleItem
            key={mod.id || idx}
            module={mod}
            index={idx}
            selectedModuleId={selectedModuleId}
            selectedLessonId={selectedLessonId}
            onSelectModule={onSelectModule}
            onSelectLesson={onSelectLesson}
            onUpdateModule={(patch) => onUpdateModule?.(mod.id, patch)}
            onRemoveModule={() => onRemoveModule?.(mod.id)}
            onAddLesson={() => onAddLesson?.(mod.id)}
            onUpdateLesson={onUpdateLesson}
            onRemoveLesson={onRemoveLesson}
            onMoveModuleUp={() => onMoveModuleUp?.(mod.id)}
            onMoveModuleDown={() => onMoveModuleDown?.(mod.id)}
            isFirst={idx === 0}
            isLast={idx === filtered.length - 1}
            onMoveLessonUp={onMoveLessonUp}
            onMoveLessonDown={onMoveLessonDown}
          />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-6">
            <p className="text-xs text-neutral-500 mb-2">No modules yet</p>
            <button type="button" onClick={onAddModule} className="inline-flex items-center gap-1 rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white">
              <Plus size={14} /> Add your first module
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
