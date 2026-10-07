import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, PanelLeftOpen, PanelLeftClose, PanelRightOpen, PanelRightClose, X, Save, Rocket, Send, Clock, CheckCircle, AlertCircle, Search, Plus, Layers, FileText } from "lucide-react";
import CourseOutline from "../components/course-builder/CourseOutline";
import LessonEditor from "../components/course-builder/LessonEditor";
import ModuleEditor from "../components/course-builder/ModuleEditor";
import PublishReadiness from "../components/course-builder/PublishReadiness";
import ConfirmationModal from "../../../components/ConfirmationModal";
import Toast from "../../../components/Toast";
import coursesApi from "../api/coursesApi";

const STATUS_CONFIG = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-700" },
  published: { label: "Published", color: "bg-green-100 text-green-700" },
  archived: { label: "Archived", color: "bg-amber-100 text-amber-700" },
  under_review: { label: "Under Review", color: "bg-blue-100 text-blue-700" },
};

export default function CourseBuilderPage() {
  const { id: courseId } = useParams();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [loadingError, setLoadingError] = useState(null);
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [outlineFilter, setOutlineFilter] = useState("");
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const pendingNavigation = useRef(null);
  const autoSaveTimerRef = useRef(null);

  const [selectedModuleId, setSelectedModuleId] = useState(null);
  const [selectedLessonId, setSelectedLessonId] = useState(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    thumbnail_url: "",
    status: "draft",
  });

  const [toast, setToast] = useState({ visible: false, message: "", type: "info" });
  const showToast = useCallback((message, type = "info") => setToast({ visible: true, message, type }), []);

  const selectedModule = modules.find((m) => m.id === selectedModuleId) || null;
  const selectedLesson = selectedModule?.lessons?.find((l) => l.id === selectedLessonId) || null;

  const updateForm = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const refreshCourse = useCallback(async () => {
    if (!courseId) return;
    try {
      const result = await coursesApi.getBuilderData(courseId);
      const c = result.data || {};
      const mods = result.modules || [];
      setCourse(c);
      setForm({
        title: c.title || "",
        description: c.description || "",
        category: c.category || "",
        thumbnail_url: c.thumbnail_url || "",
        status: c.status || "draft",
      });
      const enriched = mods.map((m) => ({ ...m, lessons: m.lessons || [] }));
      setModules(enriched);
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
    } catch (err) {
      showToast(err.message || "Failed to refresh course", "error");
    }
  }, [courseId, showToast]);

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    coursesApi.getBuilderData(courseId)
      .then((res) => {
        if (cancelled) return;
        const c = res.data || {};
        const mods = res.modules || [];
        setCourse(c);
        setForm({
          title: c.title || "",
          description: c.description || "",
          category: c.category || "",
          thumbnail_url: c.thumbnail_url || "",
          status: c.status || "draft",
        });
        setModules(mods.map((m) => ({ ...m, lessons: m.lessons || [] })));
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadingError(err.message || "Failed to load course");
          showToast(err.message || "Failed to load course", "error");
        }
      });
    return () => { cancelled = true; };
  }, [courseId, showToast]);

  useEffect(() => {
    const handler = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      handleSaveDraft(true);
    }, 30000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [hasUnsavedChanges]);

  const buildPayload = useCallback(() => ({
    ...form,
    modules: modules.map((m, idx) => ({
      id: m.isNew ? undefined : m.id,
      title: m.title || "",
      description: m.description || "",
      type: m.type || "chapter",
      order_index: idx + 1,
      is_visible: m.is_visible ?? true,
      lessons: (m.lessons || []).map((l, lIdx) => ({
        id: l.isNew ? undefined : l.id,
        title: l.title || "",
        description: l.description || "",
        type: l.type || "reading",
        order_index: lIdx + 1,
        url: l.url || null,
        duration: l.duration || null,
        is_required: l.is_required ?? true,
      })),
    })),
  }), [form, modules]);

  const handleSaveDraft = useCallback(async (silent = false) => {
    if (!courseId || saving) return;
    setSaving(true);
    setIsSavingDraft(true);
    try {
      const payload = buildPayload();
      if (payload.status !== "draft") payload.status = "draft";
      const result = await coursesApi.updateBuilder(courseId, payload);
      if (result?.success || result?.data?.success) {
        setHasUnsavedChanges(false);
        setLastSaved(new Date());
        await refreshCourse();
        if (!silent) showToast("Draft saved", "success");
      } else {
        throw new Error(result?.message || result?.data?.message || "Save failed");
      }
    } catch (err) {
      if (!silent) showToast(err.message || "Save failed", "error");
    } finally {
      setSaving(false);
      setIsSavingDraft(false);
    }
  }, [courseId, saving, buildPayload, refreshCourse, showToast]);

  const handleSaveNow = useCallback(async () => {
    if (!courseId) return;
    setSaving(true);
    setIsSavingDraft(true);
    try {
      const payload = buildPayload();
      const result = await coursesApi.updateBuilder(courseId, payload);
      if (result?.success || result?.data?.success) {
        setHasUnsavedChanges(false);
        setLastSaved(new Date());
        await refreshCourse();
        showToast("Saved", "success");
      } else {
        throw new Error(result?.message || result?.data?.message || "Save failed");
      }
    } catch (err) {
      showToast(err.message || "Save failed", "error");
      throw err;
    } finally {
      setSaving(false);
      setIsSavingDraft(false);
    }
  }, [courseId, buildPayload, refreshCourse, showToast]);

  const confirmExit = useCallback((navFn) => {
    pendingNavigation.current = navFn;
    setShowExitModal(true);
  }, []);

  const handleExitSave = useCallback(async () => {
    try {
      await handleSaveNow();
      pendingNavigation.current?.();
      pendingNavigation.current = null;
      setShowExitModal(false);
    } catch {
      // error already shown
    }
  }, [handleSaveNow]);

  const handleExitDiscard = useCallback(() => {
    pendingNavigation.current?.();
    pendingNavigation.current = null;
    setShowExitModal(false);
    setHasUnsavedChanges(false);
  }, []);

  const handlePublish = useCallback(async () => {
    if (!courseId) return;
    if (!modules.length) {
      showToast("Add at least one module before publishing", "error");
      return;
    }
    const emptyModule = modules.find((m) => !(m.lessons || []).length);
    if (emptyModule) {
      showToast(`Module "${emptyModule.title || "Untitled"}" has no lessons`, "error");
      return;
    }
    try {
      await handleSaveNow();
      await coursesApi.publishCourse(courseId);
      showToast("Course published", "success");
      setHasUnsavedChanges(false);
      navigate("/dashboard/courses");
    } catch {
      // error already shown
    }
  }, [courseId, modules, handleSaveNow, showToast, navigate]);

  const handleSubmitForReview = useCallback(async () => {
    if (!courseId) return;
    if (!modules.length) {
      showToast("Add at least one module before submitting", "error");
      return;
    }
    try {
      const payload = buildPayload();
      payload.status = "under_review";
      await coursesApi.updateBuilder(courseId, payload);
      await coursesApi.submitForReview(courseId);
      showToast("Course submitted for review", "success");
      setHasUnsavedChanges(false);
      await refreshCourse();
    } catch {
      // error already shown
    }
  }, [courseId, modules, buildPayload, refreshCourse, showToast]);

  const addModule = useCallback(() => {
    const newModule = { id: "new-" + Date.now(), title: "", type: "chapter", order_index: modules.length + 1, lessons: [], isNew: true };
    setModules((prev) => {
      const next = [...prev, newModule];
      return next;
    });
    setSelectedModuleId(newModule.id);
    setSelectedLessonId(null);
    setHasUnsavedChanges(true);
  }, [modules.length]);

  const updateModule = useCallback((moduleId, patch) => {
    setModules((prev) => prev.map((m) => (m.id === moduleId ? { ...m, ...patch } : m)));
    setHasUnsavedChanges(true);
  }, []);

  const removeModule = useCallback((moduleId) => {
    setModules((prev) => prev.filter((m) => m.id !== moduleId).map((m, i) => ({ ...m, order_index: i + 1 })));
    if (selectedModuleId === moduleId) {
      setSelectedModuleId(null);
      setSelectedLessonId(null);
    }
    setHasUnsavedChanges(true);
  }, [selectedModuleId]);

  const moveModule = useCallback((moduleId, dir) => {
    setModules((prev) => {
      const idx = prev.findIndex((m) => m.id === moduleId);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next.map((m, i) => ({ ...m, order_index: i + 1 }));
    });
    setHasUnsavedChanges(true);
  }, []);

  const addLesson = useCallback((moduleId) => {
    const newLessonId = "new-" + Date.now();
    setModules((prev) => prev.map((m) => {
      if (m.id !== moduleId) return m;
      return {
        ...m,
        lessons: [...(m.lessons || []), { id: newLessonId, title: "", type: "reading", description: "", order_index: (m.lessons || []).length + 1, isNew: true }],
      };
    }));
    setSelectedModuleId(moduleId);
    setSelectedLessonId(newLessonId);
    setShowRightSidebar(true);
    setHasUnsavedChanges(true);
  }, []);

  const updateLesson = useCallback((moduleId, lessonIndex, patch) => {
    setModules((prev) => prev.map((m) => {
      if (m.id !== moduleId) return m;
      const lessons = [...(m.lessons || [])];
      lessons[lessonIndex] = { ...lessons[lessonIndex], ...patch };
      return { ...m, lessons };
    }));
    setHasUnsavedChanges(true);
  }, []);

  const removeLesson = useCallback((moduleId, lessonIndex) => {
    setModules((prev) => prev.map((m) => {
      if (m.id !== moduleId) return m;
      return { ...m, lessons: (m.lessons || []).filter((_, i) => i !== lessonIndex).map((l, i) => ({ ...l, order_index: i + 1 })) };
    }));
    if (selectedLessonId) setSelectedLessonId(null);
    setHasUnsavedChanges(true);
  }, [selectedLessonId]);

  const moveLessonUp = useCallback((moduleId, lessonIndex) => {
    if (lessonIndex <= 0) return;
    setModules((prev) => prev.map((m) => {
      if (m.id !== moduleId) return m;
      const lessons = [...(m.lessons || [])];
      [lessons[lessonIndex - 1], lessons[lessonIndex]] = [lessons[lessonIndex], lessons[lessonIndex - 1]];
      return { ...m, lessons: lessons.map((l, i) => ({ ...l, order_index: i + 1 })) };
    }));
    setHasUnsavedChanges(true);
  }, []);

  const moveLessonDown = useCallback((moduleId, lessonIndex) => {
    setModules((prev) => {
      const mod = prev.find((m) => m.id === moduleId);
      if (!mod || lessonIndex >= (mod.lessons || []).length - 1) return prev;
      return prev.map((m) => {
        if (m.id !== moduleId) return m;
        const lessons = [...(m.lessons || [])];
        [lessons[lessonIndex + 1], lessons[lessonIndex]] = [lessons[lessonIndex], lessons[lessonIndex + 1]];
        return { ...m, lessons: lessons.map((l, i) => ({ ...l, order_index: i + 1 })) };
      });
    });
    setHasUnsavedChanges(true);
  }, []);

  const handleSelectModule = useCallback((moduleId) => {
    setSelectedModuleId(moduleId);
    setSelectedLessonId(null);
    setShowRightSidebar(false);
  }, []);

  const handleSelectLesson = useCallback((moduleId, lessonId) => {
    setSelectedModuleId(moduleId);
    setSelectedLessonId(lessonId);
    setShowRightSidebar(true);
  }, []);

  const statusConfig = STATUS_CONFIG[course?.status] || STATUS_CONFIG.draft;

  if (!course && !loadingError) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
        <p className="text-sm text-neutral-500">Loading course...</p>
      </div>
    );
  }

  if (loadingError) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Course Builder</h1>
          <button onClick={() => navigate("/dashboard/courses")} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:border-neutral-300">Back to Courses</button>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{loadingError}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (hasUnsavedChanges) {
                confirmExit(() => navigate("/dashboard/courses"));
              } else {
                navigate("/dashboard/courses");
              }
            }}
            title="Back to courses"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{form.title || "Course Builder"}</h1>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.color}`}>{statusConfig.label}</span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">Design modules, lessons, and content</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className="text-xs text-neutral-400 hidden sm:inline-flex items-center gap-1">
              <Save size={12} /> Saved {lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          {isSavingDraft && (
            <span className="text-xs text-[var(--color-primary)] hidden sm:inline-flex items-center gap-1">
              <Clock size={12} /> Saving...
            </span>
          )}
          <div className="hidden md:flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-1">
            <button onClick={() => { setShowLeftSidebar(!showLeftSidebar); if (!showLeftSidebar) setShowRightSidebar(false); }} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${showLeftSidebar ? "bg-[var(--color-primary)] text-white" : "text-neutral-700 hover:bg-white"}`}>
              {showLeftSidebar ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />} Outline
            </button>
            <div className="w-px h-4 bg-neutral-300 mx-0.5" />
            <button onClick={() => { setShowRightSidebar(!showRightSidebar); if (!showRightSidebar) setShowLeftSidebar(false); }} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${showRightSidebar ? "bg-[var(--color-primary)] text-white" : "text-neutral-700 hover:bg-white"}`}>
              {showRightSidebar ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />} Details
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        <aside className={`${showLeftSidebar ? "block" : "hidden"} lg:block lg:w-72 shrink-0`}>
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-sm overflow-hidden h-full">
            <CourseOutline
              modules={modules}
              selectedModuleId={selectedModuleId}
              selectedLessonId={selectedLessonId}
              onSelectModule={handleSelectModule}
              onSelectLesson={handleSelectLesson}
              onAddModule={addModule}
              onUpdateModule={updateModule}
              onRemoveModule={removeModule}
              onAddLesson={addLesson}
              onUpdateLesson={updateLesson}
              onRemoveLesson={removeLesson}
              onMoveModuleUp={(id) => moveModule(id, -1)}
              onMoveModuleDown={(id) => moveModule(id, 1)}
              onMoveLessonUp={moveLessonUp}
              onMoveLessonDown={moveLessonDown}
              outlineFilter={outlineFilter}
            />
          </div>
        </aside>

        <main className="flex-1 min-w-0 overflow-hidden">
          {selectedLesson ? (
            <LessonEditor
              lesson={selectedLesson}
              courseTitle={course?.title}
              moduleId={selectedModuleId}
              onSave={(modId, lessonId, patch) => {
                const mod = modules.find((m) => m.id === modId);
                const idx = mod?.lessons?.findIndex((l) => l.id === lessonId) ?? -1;
                if (idx >= 0) updateLesson(modId, idx, patch);
              }}
              onDelete={(modId, lessonId) => {
                const mod = modules.find((m) => m.id === modId);
                const idx = mod?.lessons?.findIndex((l) => l.id === lessonId) ?? -1;
                if (idx >= 0) removeLesson(modId, idx);
              }}
              saving={saving}
              onNavigatePrev={() => {
                const flat = modules.flatMap((m) => (m.lessons || []).map((l) => ({ lesson: l, moduleId: m.id })));
                const idx = flat.findIndex((item) => item.lesson.id === selectedLessonId);
                if (idx > 0) handleSelectLesson(flat[idx - 1].moduleId, flat[idx - 1].lesson.id);
              }}
              onNavigateNext={() => {
                const flat = modules.flatMap((m) => (m.lessons || []).map((l) => ({ lesson: l, moduleId: m.id })));
                const idx = flat.findIndex((item) => item.lesson.id === selectedLessonId);
                if (idx < flat.length - 1) handleSelectLesson(flat[idx + 1].moduleId, flat[idx + 1].lesson.id);
              }}
              canNavigatePrev={modules.flatMap((m) => (m.lessons || []).map((l) => l.id)).indexOf(selectedLessonId) > 0}
              canNavigateNext={modules.flatMap((m) => (m.lessons || []).map((l) => l.id)).indexOf(selectedLessonId) < modules.flatMap((m) => (m.lessons || []).length) - 1}
              onMoveUp={() => {
                const mod = modules.find((m) => m.id === selectedModuleId);
                const idx = mod?.lessons?.findIndex((l) => l.id === selectedLessonId) ?? -1;
                if (idx > 0) moveLessonUp(selectedModuleId, idx);
              }}
              onMoveDown={() => {
                const mod = modules.find((m) => m.id === selectedModuleId);
                const idx = mod?.lessons?.findIndex((l) => l.id === selectedLessonId) ?? -1;
                if (idx >= 0 && idx < (mod?.lessons?.length || 0) - 1) moveLessonDown(selectedModuleId, idx);
              }}
              canMoveUp={(() => { const mod = modules.find((m) => m.id === selectedModuleId); const idx = mod?.lessons?.findIndex((l) => l.id === selectedLessonId) ?? -1; return idx > 0; })()}
              canMoveDown={(() => { const mod = modules.find((m) => m.id === selectedModuleId); const idx = mod?.lessons?.findIndex((l) => l.id === selectedLessonId) ?? -1; return idx >= 0 && idx < (mod?.lessons?.length || 0) - 1; })()}
            />
          ) : selectedModule ? (
            <ModuleEditor
              module={selectedModule}
              onSave={(moduleId, patch) => updateModule(moduleId, patch)}
              onDelete={() => removeModule(selectedModuleId)}
              saving={saving}
              courseId={courseId}
              onMoveUp={() => moveModule(selectedModuleId, -1)}
              onMoveDown={() => moveModule(selectedModuleId, 1)}
              canMoveUp={modules.findIndex((m) => m.id === selectedModuleId) > 0}
              canMoveDown={(() => { const idx = modules.findIndex((m) => m.id === selectedModuleId); return idx >= 0 && idx < modules.length - 1; })()}
            />
          ) : (
            <div className="h-full overflow-y-auto p-6">
              <div className="mx-auto w-full max-w-3xl space-y-5">
                <div className="rounded-2xl border border-[var(--border)] bg-white dark:bg-neutral-900 p-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-white">
                    <Rocket size={28} />
                  </div>
                  <h3 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                    {modules.length === 0 ? "Start Building Your Course" : modules.some((m) => !(m.lessons || []).length) ? "Add Lessons to Your Modules" : "Your Course Is Taking Shape"}
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">
                    {modules.length === 0 ? "Organize your content into modules and lessons. Create your first module to get going." : "Keep refining the content, or open any module from the outline to continue editing."}
                  </p>
                  <button type="button" onClick={addModule} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white">
                    <Plus size={16} /> {modules.length === 0 ? "Add your first module" : "Add module"}
                  </button>
                </div>
                <div className="grid grid-cols-3 divide-x divide-[var(--border)]">
                  <div className="flex items-center justify-center gap-3 px-6 py-5">
                    <Layers size={18} className="text-neutral-400" />
                    <div><p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{modules.length}</p><p className="text-xs text-neutral-500">Modules</p></div>
                  </div>
                  <div className="flex items-center justify-center gap-3 px-6 py-5">
                    <FileText size={18} className="text-neutral-400" />
                    <div><p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{modules.reduce((s, m) => s + (m.lessons || []).length, 0)}</p><p className="text-xs text-neutral-500">Lessons</p></div>
                  </div>
                  <div className="flex items-center justify-center gap-3 px-6 py-5">
                    <AlertCircle size={18} className="text-neutral-400" />
                    <div><p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{modules.filter((m) => !(m.lessons || []).length).length}</p><p className="text-xs text-neutral-500">Empty modules</p></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        <aside className={`${showRightSidebar ? "block" : "hidden"} lg:block lg:w-72 shrink-0`}>
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-sm overflow-hidden h-full flex flex-col">
            <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50">
              <h2 className="font-semibold text-neutral-900 dark:text-neutral-100 text-base">Publish Readiness</h2>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <PublishReadiness course={course} modules={modules} />
            </div>
            <div className="p-4 border-t border-[var(--border)] space-y-2">
              <button onClick={() => handleSaveDraft(false)} disabled={saving} className="w-full rounded-md border border-neutral-200 px-2.5 py-2 text-sm hover:border-neutral-300 disabled:opacity-50 flex items-center justify-center gap-1.5">
                <Save size={14} /> {saving ? "Saving..." : "Save Draft"}
              </button>
              <button onClick={handlePublish} disabled={saving} className="w-full rounded-md bg-[var(--color-primary)] px-2.5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5">
                <Rocket size={14} /> {saving ? "Publishing..." : "Publish"}
              </button>
              <button onClick={handleSubmitForReview} disabled={saving} className="w-full rounded-md border border-neutral-200 px-2.5 py-2 text-sm hover:border-neutral-300 disabled:opacity-50 flex items-center justify-center gap-1.5">
                <Send size={14} /> Submit for Review
              </button>
            </div>
          </div>
        </aside>
      </div>

      <ConfirmationModal
        isOpen={showExitModal}
        onClose={handleExitDiscard}
        onConfirm={handleExitSave}
        title="Unsaved changes"
        message="You have unsaved changes. Save before leaving?"
        confirmText="Save"
        cancelText="Discard"
      >
        <button type="button" onClick={() => { handleSaveDraft(false); pendingNavigation.current?.(); pendingNavigation.current = null; setShowExitModal(false); }} disabled={saving} className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">
          Save as Draft
        </button>
      </ConfirmationModal>

      <Toast isVisible={toast.visible} message={toast.message} type={toast.type} onClose={() => setToast((t) => ({ ...t, visible: false }))} />
    </div>
  );
}
