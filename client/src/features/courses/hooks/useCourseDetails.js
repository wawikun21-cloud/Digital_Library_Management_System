import { useState, useEffect, useCallback, useRef } from "react";
import coursesApi from "../api/coursesApi";

export function useCourseDetails(id) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cancelRef = useRef(false);

  const fetchDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    cancelRef.current = false;
    try {
      const result = await coursesApi.getCourseById(id);
      if (!cancelRef.current) setData(result.data || result);
    } catch (err) {
      if (!cancelRef.current) setError(err.message);
    } finally {
      if (!cancelRef.current) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetails();
    return () => { cancelRef.current = true; };
  }, [fetchDetails]);

  return { data, loading, error, refetch: fetchDetails };
}
