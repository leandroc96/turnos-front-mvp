import { useState, useCallback } from "react";
import type { Study } from "../types";
import {
  fetchStudies as apiFetchStudies,
  createStudy as apiCreateStudy,
  updateStudy as apiUpdateStudy,
  deleteStudy as apiDeleteStudy,
  isApiConfigured,
} from "../services/api";

export function useStudies() {
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStudies = useCallback(async (onlyActive = true) => {
    if (!isApiConfigured()) return;

    setLoading(true);
    setError(null);

    try {
      const data = await apiFetchStudies();
      const list = onlyActive ? data.studies.filter((s) => s.active) : data.studies;
      setStudies(list);
    } catch (err) {
      console.error("[useStudies] Error:", err);
      setError(err instanceof Error ? err.message : "Error al obtener estudios");
    } finally {
      setLoading(false);
    }
  }, []);

  const createStudy = useCallback(async (data: Omit<Study, "studyId">) => {
    const res = await apiCreateStudy(data);
    if (res.ok) {
      await fetchStudies(false);
    }
    return res;
  }, [fetchStudies]);

  const updateStudy = useCallback(async (studyId: string, data: Partial<Study>) => {
    const res = await apiUpdateStudy(studyId, data);
    if (res.ok) {
      await fetchStudies(false);
    }
    return res;
  }, [fetchStudies]);

  const deleteStudy = useCallback(async (studyId: string) => {
    const res = await apiDeleteStudy(studyId);
    if (res.ok) {
      await fetchStudies(false);
    }
    return res;
  }, [fetchStudies]);

  return {
    studies,
    loading,
    error,
    fetchStudies,
    createStudy,
    updateStudy,
    deleteStudy,
  };
}
