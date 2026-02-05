import { useState, useCallback } from "react";
import type { Doctor } from "../types";
import {
  fetchDoctors as apiFetchDoctors,
  createDoctor as apiCreateDoctor,
  updateDoctor as apiUpdateDoctor,
  deleteDoctor as apiDeleteDoctor,
  isApiConfigured,
} from "../services/api";

export function useDoctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDoctors = useCallback(async (onlyActive = true) => {
    if (!isApiConfigured()) return;

    setLoading(true);
    setError(null);

    try {
      const data = await apiFetchDoctors();
      const list = onlyActive ? data.doctors.filter((d) => d.active) : data.doctors;
      setDoctors(list);
    } catch (err) {
      console.error("[useDoctors] Error:", err);
      setError(err instanceof Error ? err.message : "Error al obtener médicos");
    } finally {
      setLoading(false);
    }
  }, []);

  const createDoctor = useCallback(async (data: Omit<Doctor, "doctorId">) => {
    const res = await apiCreateDoctor(data);
    if (res.ok) {
      await fetchDoctors(false); // Recargar lista
    }
    return res;
  }, [fetchDoctors]);

  const updateDoctor = useCallback(async (doctorId: string, data: Partial<Doctor>) => {
    const res = await apiUpdateDoctor(doctorId, data);
    if (res.ok) {
      await fetchDoctors(false);
    }
    return res;
  }, [fetchDoctors]);

  const deleteDoctor = useCallback(async (doctorId: string) => {
    const res = await apiDeleteDoctor(doctorId);
    if (res.ok) {
      await fetchDoctors(false);
    }
    return res;
  }, [fetchDoctors]);

  return {
    doctors,
    loading,
    error,
    fetchDoctors,
    createDoctor,
    updateDoctor,
    deleteDoctor,
  };
}
