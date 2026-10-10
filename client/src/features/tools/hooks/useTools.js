import { useState, useEffect, useCallback } from "react";
import {
  fetchTools, fetchTool, createTool, updateTool, deleteTool, downloadTool,
} from "../api/toolsApi";

export default function useTools() {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // NOTE: filters default inside the body, not as a parameter default.
  // A `params = {}` parameter default creates a new object identity on every
  // render, which invalidates the useCallback dep and makes this effect
  // re-fire endlessly (an infinite request loop).
  const loadTools = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchTools(filters);
      if (res.success) {
        setTools(res.data || []);
      } else {
        setError(res.error || "Failed to load tools");
      }
    } catch (err) {
      setError("Could not connect to server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTools(); }, [loadTools]);

  const getSingleTool = async (id) => {
    const res = await fetchTool(id);
    return res;
  };

  const addTool = async (toolData) => {
    const res = await createTool(toolData);
    if (res.success) setTools(prev => [res.data, ...prev]);
    return res;
  };

  const editTool = async (id, updates) => {
    const res = await updateTool(id, updates);
    if (res.success) {
      setTools(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    }
    return res;
  };

  const removeTool = async (id) => {
    const res = await deleteTool(id);
    if (res.success) setTools(prev => prev.filter(t => t.id !== id));
    return res;
  };

  const downloadSingleTool = async (id) => {
    const res = await downloadTool(id);
    return res;
  };

  return {
    tools, loading, error, loadTools,
    getSingleTool, addTool, editTool, removeTool, downloadSingleTool,
  };
}
