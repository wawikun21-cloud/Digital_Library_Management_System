import { useState, useCallback } from "react";
import coursesApi from "../api/coursesApi";

export function useCreateCourse() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const create = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      return await coursesApi.createCourse(payload);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { create, loading, error, setError };
}
