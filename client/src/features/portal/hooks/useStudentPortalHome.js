import { useCallback, useEffect, useState } from "react";
import { getPortalHome } from "../api/portalApi";

const EMPTY = { slides: [], books: [], courses: [] };

/** Loads hero slides + the latest 6 published e-books and courses in one request. */
export function useStudentPortalHome() {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getPortalHome()
      .then((result) => { if (!cancelled) setData({ ...EMPTY, ...result }); })
      .catch((err) => { if (!cancelled) setError(err.message || "Could not load the portal."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  // `attempt` doubles as a reload key: consumers key animated/revealed
  // sections on it so a retry replays their entrance instead of leaving
  // stale content in its final state.
  return { ...data, loading, error, retry, attempt };
}
