import { useCallback, useState } from "react";
import coursesApi from "../api/coursesApi";

export function useUnenrollStudent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const unenroll = useCallback(async (courseId, userId) => {
    setLoading(true);
    setError(null);
    try {
      return await coursesApi.unenrollStudent(courseId, userId);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { unenroll, loading, error };
}
