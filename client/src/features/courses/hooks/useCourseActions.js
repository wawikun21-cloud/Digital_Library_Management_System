import { useState, useCallback } from "react";
import coursesApi from "../api/coursesApi";

export function useCourseActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(async (fn, id) => {
    setLoading(true);
    setError(null);
    try {
      return await fn(id);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const archive = useCallback((id) => run(coursesApi.archiveCourse, id), [run]);
  const publish = useCallback((id) => run(coursesApi.publishCourse, id), [run]);
  const unarchive = publish;

  return { archive, publish, unarchive, loading, error, setError };
}
