import { useState, useCallback } from "react";
import coursesApi from "../api/coursesApi";

export function useDeleteCourse() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const remove = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      return await coursesApi.deleteCourse(id);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { remove, loading, error, setError };
}
