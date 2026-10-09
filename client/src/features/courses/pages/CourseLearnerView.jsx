import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, SkipBack, SkipForward, BookOpen, CheckCircle, Loader2 } from "lucide-react";
import { useCourseDetails } from "../hooks/useCourseDetails";
import { useModules } from "../hooks/useModules";
import { useLessonProgress } from "../hooks/useLessonProgress";
import coursesApi from "../api/coursesApi";
import { normalizeVideoUrl } from "../utils/courseHelpers";
import RichTextContent from "../components/RichTextContent";
import LessonProgressBar from "../components/LessonProgressBar";

const VIDEO_ICON = "🎥";
const READING_ICON = "📖";
const DOCUMENT_ICON = "📄";
const QUIZ_ICON = "❓";

const lessonTypeIcon = (type) => {
  switch (type) {
    case "video": return VIDEO_ICON;
    case "quiz": return QUIZ_ICON;
    case "document": return DOCUMENT_ICON;
    default: return READING_ICON;
  }
};

function groupLessonsByModule(lessons) {
  const map = new Map();
  (lessons || []).forEach((l) => {
    const mid = l.moduleId || l.module_id || l.moduleId;
    if (!map.has(mid)) map.set(mid, { id: mid, title: l.moduleTitle || "Module", lessons: [] });
    map.get(mid).lessons.push(l);
  });
  return Array.from(map.values());
}

export default function CourseLearnerView() {
  const { id: courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { data: course, loading: courseLoading } = useCourseDetails(courseId);
  const { data: modules, loading: modulesLoading } = useModules(courseId);
  const { data: progressData, loading: progressLoading, fetchProgress, markComplete, getLessonStatus, isLessonCompleted } = useLessonProgress(courseId);
  const [allLessons, setAllLessons] = useState([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [contentLoading, setContentLoading] = useState(false);

  const loadAllLessons = useCallback(async () => {
    if (!courseId || !modules || modules.length === 0) {
      setAllLessons([]);
      return;
    }

    setLoadingContent(true);
    try {
      const lessons = [];
      for (const mod of modules) {
        try {
          const result = await coursesApi.getModuleContent(courseId, mod.id);
          const contentItems = result.data || result || [];
          if (Array.isArray(contentItems)) {
            for (const item of contentItems) {
              lessons.push({
                id: item.id,
                title: item.title,
                type: item.type || "reading",
                moduleId: mod.id,
                moduleTitle: mod.title,
                content: item.content,
                video_url: item.url || item.video_url,
                duration: item.duration,
                is_required: item.is_required,
              });
            }
          }
        } catch (err) {
          console.error(`[CourseLearnerView] Failed to load content for module ${mod.id}:`, err);
        }
      }
      setAllLessons(lessons);
    } finally {
      setLoadingContent(false);
    }
  }, [courseId, modules]);

  useEffect(() => {
    loadAllLessons();
  }, [loadAllLessons]);

  useEffect(() => {
    if (courseId && !progressData) {
      fetchProgress();
    }
  }, [courseId, progressData, fetchProgress]);

  useEffect(() => {
    if (progressData) {
      setAllLessons((prev) =>
        prev.map((l) => {
          const progLesson = progressData.lessons?.find((p) => String(p.id) === String(l.id));
          return progLesson ? { ...l, status: progLesson.status } : l;
        })
      );
    }
  }, [progressData]);

  const loadLessonContent = useCallback(async () => {
    if (!allLessons.length) return;
    const lesson = allLessons.find((l) => String(l.id) === String(lessonId));
    if (!lesson) return;

    if (lesson.content || lesson.video_url) {
      setCurrentLesson(lesson);
      return;
    }

    setContentLoading(true);
    try {
      const result = await coursesApi.getModuleContent(courseId, lesson.moduleId);
      const contentItems = result.data || [];
      const fullLesson = contentItems.find((c) => String(c.id) === String(lessonId));
      if (fullLesson) {
        setCurrentLesson({ ...lesson, ...fullLesson, video_url: fullLesson.url || fullLesson.video_url });
      } else {
        setCurrentLesson(lesson);
      }
    } catch {
      setCurrentLesson(lesson);
    } finally {
      setContentLoading(false);
    }
  }, [courseId, lessonId, allLessons]);

  useEffect(() => {
    if (!lessonId && allLessons.length > 0) {
      navigate(`/dashboard/courses/${courseId}/learn/${allLessons[0].id}`, { replace: true });
    }
  }, [lessonId, allLessons, courseId, navigate]);

  useEffect(() => {
    loadLessonContent();
  }, [loadLessonContent]);

  const currentIndex = allLessons.findIndex((l) => String(l.id) === String(lessonId));
  const hasNext = currentIndex < allLessons.length - 1;
  const hasPrev = currentIndex > 0;

  const goToLesson = (index) => {
    const target = allLessons[index];
    if (target) {
      navigate(`/dashboard/courses/${courseId}/learn/${target.id}`);
    }
  };

  const handleBack = () => {
    navigate(`/dashboard/courses/${courseId}`);
  };

  const handlePrev = () => {
    if (hasPrev) goToLesson(currentIndex - 1);
  };

  const handleNext = () => {
    if (hasNext) goToLesson(currentIndex + 1);
  };

  const [completeLoading, setCompleteLoading] = useState(false);

  const handleMarkComplete = useCallback(async () => {
    if (!lessonId || completeLoading) return;
    setCompleteLoading(true);
    try {
      await markComplete(lessonId);
    } catch (err) {
      console.error("[CourseLearnerView] Failed to mark lesson complete:", err);
    } finally {
      setCompleteLoading(false);
    }
  }, [lessonId, completeLoading, markComplete]);

  if (courseLoading || modulesLoading || loadingContent || progressLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Loading course...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <button onClick={handleBack} className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700">
          <ChevronLeft size={16} /> Back
        </button>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm">
          <p className="font-medium text-red-800">Course not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none">
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={handleBack}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
          aria-label="Back to course"
        >
          <ChevronLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
            {course.title || "Course"}
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {currentLesson ? currentLesson.title : "Select a lesson"}
          </p>
        </div>
      </div>

      {progressData && progressData.summary && (
        <LessonProgressBar
          completed={progressData.summary.completed}
          total={progressData.summary.total}
          percentage={progressData.summary.completionPct}
          modules={groupLessonsByModule(progressData.lessons || [])}
        />
      )}

      {allLessons.length === 0 ? (
        <div className="rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-900 p-10 text-center">
          <BookOpen size={32} className="mx-auto mb-3 text-neutral-300" />
          <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">No lessons available</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Check back later for new content.
          </p>
        </div>
      ) : currentIndex === -1 ? (
        <div className="rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-900 p-10 text-center">
          <BookOpen size={32} className="mx-auto mb-3 text-neutral-300" />
          <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">Lesson not found</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Select a lesson from the course content to get started.
          </p>
        </div>
      ) : (
        <>
          {currentLesson && (
            <div className="rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-900 p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20 text-lg">
                  {lessonTypeIcon(currentLesson.type)}
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                    {currentLesson.title}
                  </h2>
                  {currentLesson.moduleTitle && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {currentLesson.moduleTitle}
                    </p>
                  )}
                </div>
              </div>

              {contentLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
                </div>
              )}

               {!contentLoading && currentLesson.video_url && (
                 <div className="aspect-video mb-4">
                   <iframe
                     src={normalizeVideoUrl(currentLesson.video_url)}
                     title={currentLesson.title}
                     className="h-full w-full rounded-lg border border-neutral-200 dark:border-neutral-700"
                     allowFullScreen
                   />
                 </div>
               )}

              {!contentLoading && currentLesson.content && (
                <RichTextContent value={currentLesson.content} className="text-sm text-neutral-700 dark:text-neutral-300" />
              )}

               {!contentLoading && !currentLesson.video_url && !currentLesson.content && (
                 <p className="text-sm text-neutral-500 dark:text-neutral-400">
                   No content available for this lesson yet.
                 </p>
               )}

               {!contentLoading && (
                 <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
                   {isLessonCompleted(lessonId) ? (
                     <button
                       type="button"
                       disabled
                       className="inline-flex items-center gap-1.5 rounded-lg bg-green-50 dark:bg-green-500/15 px-3.5 py-2 text-sm font-medium text-green-700 dark:text-green-300"
                     >
                       <CheckCircle size={16} />
                       Completed
                     </button>
                   ) : (
                     <button
                       type="button"
                       onClick={handleMarkComplete}
                       disabled={completeLoading}
                       className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3.5 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-70 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                     >
                       {completeLoading ? (
                         <Loader2 size={16} className="animate-spin" />
                       ) : (
                         <CheckCircle size={16} />
                       )}
                       Mark Complete
                     </button>
                   )}
                 </div>
               )}
             </div>
           )}

          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={!hasPrev}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              <SkipBack size={14} />
              Previous
            </button>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              Lesson {currentIndex + 1} of {allLessons.length}
            </span>
            <button
              onClick={handleNext}
              disabled={!hasNext}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              Next
              <SkipForward size={14} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
