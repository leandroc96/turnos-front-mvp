import { useState, useCallback } from "react";
import type { Appointment } from "../types";
import { fetchAppointments as apiFetchAppointments, isApiConfigured } from "../services/api";

type FetchParams = {
  year?: number;
  month?: number;
  doctorId?: string;
  date?: string; // YYYY-MM-DD para filtrar un día específico
};

export function useAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = useCallback(async (params: FetchParams = {}) => {
    if (!isApiConfigured()) return;

    setLoading(true);
    setError(null);

    try {
      let from: string;
      let to: string;

      // Si se pasa una fecha específica, usar ese día
      if (params.date) {
        from = params.date;
        to = params.date;
      } else {
        // Usar mes actual o el especificado
        const now = new Date();
        const targetYear = params.year ?? now.getFullYear();
        const targetMonth = params.month ?? now.getMonth();

        const firstDay = new Date(targetYear, targetMonth, 1);
        const lastDay = new Date(targetYear, targetMonth + 1, 0);

        from = firstDay.toISOString().split("T")[0];
        to = lastDay.toISOString().split("T")[0];
      }

      const data = await apiFetchAppointments({
        from,
        to,
        doctorId: params.doctorId,
      });

      // Ordenar por startTime (más antiguos primero)
      const sorted = [...data.appointments].sort((a, b) => {
        const dateA = new Date(a.startTime);
        const dateB = new Date(b.startTime);
        return dateA.getTime() - dateB.getTime();
      });

      setAppointments(sorted);
    } catch (err) {
      console.error("[useAppointments] Error:", err);
      setError(err instanceof Error ? err.message : "Error al obtener turnos");
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    appointments,
    loading,
    error,
    fetchAppointments,
  };
}
