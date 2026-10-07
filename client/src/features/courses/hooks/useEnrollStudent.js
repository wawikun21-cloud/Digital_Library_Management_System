import { useCallback, useState } from "react";
import coursesApi from "../api/coursesApi";

export function useEnrollStudent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const enroll = useCallback(async (courseId, userId, role = "learner") => {
    setLoading(true);
    setError(null);
    try {
      return await coursesApi.enrollStudent(courseId, userId, role);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { enroll, loading, error };
}
