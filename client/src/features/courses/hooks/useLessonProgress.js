import { useState, useCallback } from "react";
import coursesApi from "../api/coursesApi";

export function useLessonProgress(courseId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProgress = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await coursesApi.getCourseProgress(courseId);
      setData(res?.data || res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  const refresh = useCallback(() => {
    return fetchProgress();
  }, [fetchProgress]);

  const markComplete = useCallback(async (lessonId) => {
    if (!courseId || !lessonId) return null;
    try {
      const res = await coursesApi.markLessonComplete(courseId, lessonId);
      if (res.success !== false) {
        setData((prev) => {
          if (!prev) return prev;
          const lessons = prev.lessons.map((l) =>
            String(l.id) === String(lessonId)
              ? { ...l, status: "completed", completedAt: new Date().toISOString() }
              : l
          );
          const total = lessons.length;
          const completed = lessons.filter((l) => l.status === "completed").length;
          const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;
          return {
            ...prev,
            lessons,
            summary: { total, completed, completionPct },
          };
        });
      }
      return res;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [courseId]);

  const getLessonStatus = useCallback((lessonId) => {
    if (!data?.lessons) return "unlocked";
    const lesson = data.lessons.find((l) => String(l.id) === String(lessonId));
    return lesson?.status || "unlocked";
  }, [data]);

  const isLessonCompleted = useCallback((lessonId) => {
    return getLessonStatus(lessonId) === "completed";
  }, [getLessonStatus]);

  return {
    data,
    loading,
    error,
    fetchProgress,
    refresh,
    markComplete,
    getLessonStatus,
    isLessonCompleted,
  };
}
