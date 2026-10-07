import { useState, useEffect, useCallback, useRef } from "react";
import coursesApi from "../api/coursesApi";

export function useEnrollmentList(params = {}) {
  const { courseId } = params;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cancelRef = useRef(false);

  const fetchEnrollments = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setError(null);
    cancelRef.current = false;
    try {
      const result = await coursesApi.getEnrollments(courseId);
      if (!cancelRef.current) setData(result.data || result || []);
    } catch (err) {
      if (!cancelRef.current) setError(err.message);
    } finally {
      if (!cancelRef.current) setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchEnrollments();
    return () => { cancelRef.current = true; };
  }, [fetchEnrollments]);

  return { data, loading, error, refetch: fetchEnrollments };
}
