import { useState, useEffect, useCallback, useRef } from "react";
import coursesApi from "../api/coursesApi";

export function useCourseList(params = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cancelRef = useRef(false);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    cancelRef.current = false;
    try {
      const result = await coursesApi.getCourseList(paramsRef.current);
      if (!cancelRef.current) setData(Array.isArray(result?.data) ? result.data : []);
    } catch (err) {
      if (!cancelRef.current) {
        setError(err.message);
        setData([]);
      }
    } finally {
      if (!cancelRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
    return () => { cancelRef.current = true; };
  }, [fetchCourses]);

  return { data, loading, error, refetch: fetchCourses, setData };
}
