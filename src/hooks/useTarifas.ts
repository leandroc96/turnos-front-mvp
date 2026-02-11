import { useState, useCallback } from "react";
import type { Tarifa } from "../types";
import {
  fetchTarifas as apiFetchTarifas,
  createTarifa as apiCreateTarifa,
  updateTarifa as apiUpdateTarifa,
  deleteTarifa as apiDeleteTarifa,
  isApiConfigured,
} from "../services/api";

export function useTarifas() {
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTarifas = useCallback(async () => {
    if (!isApiConfigured()) return;

    setLoading(true);
    setError(null);

    try {
      const data = await apiFetchTarifas();
      setTarifas(data.tarifas);
    } catch (err) {
      console.error("[useTarifas] Error:", err);
      setError(err instanceof Error ? err.message : "Error al obtener tarifas");
    } finally {
      setLoading(false);
    }
  }, []);

  const createTarifa = useCallback(async (data: Omit<Tarifa, "tarifaId" | "nombreEstudio" | "nombreObraSocial">) => {
    const res = await apiCreateTarifa(data);
    if (res.ok) {
      await fetchTarifas();
    }
    return res;
  }, [fetchTarifas]);

  const updateTarifa = useCallback(async (tarifaId: string, data: Partial<Tarifa>) => {
    const res = await apiUpdateTarifa(tarifaId, data);
    if (res.ok) {
      await fetchTarifas();
    }
    return res;
  }, [fetchTarifas]);

  const deleteTarifa = useCallback(async (tarifaId: string) => {
    const res = await apiDeleteTarifa(tarifaId);
    if (res.ok) {
      await fetchTarifas();
    }
    return res;
  }, [fetchTarifas]);

  // Helper: buscar precio por estudioId + obraSocialId
  const getPrecio = useCallback((estudioId: string, obraSocialId: string): number | null => {
    const match = tarifas.find(
      (t) => t.estudioId === estudioId && t.obraSocialId === obraSocialId
    );
    return match ? match.precio : null;
  }, [tarifas]);

  return {
    tarifas,
    loading,
    error,
    fetchTarifas,
    createTarifa,
    updateTarifa,
    deleteTarifa,
    getPrecio,
  };
}
