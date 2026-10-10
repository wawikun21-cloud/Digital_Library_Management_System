import { useCallback, useEffect, useState } from "react";
import {
  getHeroSlides, createHeroSlide, updateHeroSlide, setHeroSlideActive,
  deleteHeroSlide, reorderHeroSlides,
} from "../api/portalApi";

export function useHeroSlides() {
  const [slides, setSlides] = useState([]);
  const [maxSlides, setMaxSlides] = useState(8);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getHeroSlides();
      setSlides(result.slides);
      setMaxSlides(result.maxSlides);
    } catch (err) {
      setError(err.message || "Could not load hero slides.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const replaceSlide = (updated) =>
    setSlides((prev) => prev.map((slide) => (slide.id === updated.id ? updated : slide)));

  const create = useCallback(async (formData) => {
    const created = await createHeroSlide(formData);
    setSlides((prev) => [...prev, created]);
  }, []);

  const update = useCallback(async (id, formData) => {
    replaceSlide(await updateHeroSlide(id, formData));
  }, []);

  const toggleActive = useCallback(async (slide) => {
    setBusyId(slide.id);
    try {
      replaceSlide(await setHeroSlideActive(slide.id, !slide.is_active));
    } finally {
      setBusyId(null);
    }
  }, []);

  const remove = useCallback(async (id) => {
    setBusyId(id);
    try {
      await deleteHeroSlide(id);
      setSlides((prev) => prev.filter((slide) => slide.id !== id));
    } finally {
      setBusyId(null);
    }
  }, []);

  const move = useCallback(async (id, direction) => {
    const index = slides.findIndex((slide) => slide.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= slides.length) return;
    const next = [...slides];
    [next[index], next[target]] = [next[target], next[index]];
    setBusyId(id);
    try {
      setSlides(await reorderHeroSlides(next.map((slide) => slide.id)));
    } finally {
      setBusyId(null);
    }
  }, [slides]);

  return {
    slides, maxSlides, loading, error, busyId,
    canAdd: slides.length < maxSlides,
    reload: load, create, update, toggleActive, remove, move,
  };
}
