import { useState, useEffect, useCallback, useRef } from "react";
import coursesApi from "../api/coursesApi";

export function useModules(courseId) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cancelRef = useRef(false);

  const fetchModules = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setError(null);
    cancelRef.current = false;
    try {
      const result = await coursesApi.getCourseModules(courseId);
      if (!cancelRef.current) setData(result.data || result || []);
    } catch (err) {
      if (!cancelRef.current) setError(err.message);
    } finally {
      if (!cancelRef.current) setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchModules();
    return () => { cancelRef.current = true; };
  }, [fetchModules]);

  return { data, loading, error, refetch: fetchModules };
}
