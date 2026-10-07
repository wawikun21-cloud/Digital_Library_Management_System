import { useState, useCallback } from "react";
import coursesApi from "../api/coursesApi";

export function useUpdateCourse() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const update = useCallback(async (id, payload) => {
    setLoading(true);
    setError(null);
    try {
      return await coursesApi.updateCourse(id, payload);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { update, loading, error, setError };
}
