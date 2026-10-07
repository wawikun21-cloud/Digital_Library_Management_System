import { useState, useCallback } from "react";
import coursesApi from "../api/coursesApi";

export function useDeleteModule() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const remove = useCallback(async (courseId, moduleId) => {
    setLoading(true);
    setError(null);
    try {
      return await coursesApi.deleteModule(courseId, moduleId);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { remove, loading, error };
}
