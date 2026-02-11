import { useState, useCallback } from "react";
import type { ObraSocial } from "../types";
import {
  fetchObrasSociales as apiFetchObrasSociales,
  createObraSocial as apiCreateObraSocial,
  updateObraSocial as apiUpdateObraSocial,
  deleteObraSocial as apiDeleteObraSocial,
  isApiConfigured,
} from "../services/api";

export function useObrasSociales() {
  const [obrasSociales, setObrasSociales] = useState<ObraSocial[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchObrasSociales = useCallback(async (soloActivas = true) => {
    if (!isApiConfigured()) return;

    setLoading(true);
    setError(null);

    try {
      const data = await apiFetchObrasSociales();
      const lista = soloActivas ? data.obrasSociales.filter((os) => os.activa) : data.obrasSociales;
      setObrasSociales(lista);
    } catch (err) {
      console.error("[useObrasSociales] Error:", err);
      setError(err instanceof Error ? err.message : "Error al obtener obras sociales");
    } finally {
      setLoading(false);
    }
  }, []);

  const createObraSocial = useCallback(async (data: Omit<ObraSocial, "obraSocialId">) => {
    const res = await apiCreateObraSocial(data);
    if (res.ok) {
      await fetchObrasSociales(false);
    }
    return res;
  }, [fetchObrasSociales]);

  const updateObraSocial = useCallback(async (obraSocialId: string, data: Partial<ObraSocial>) => {
    const res = await apiUpdateObraSocial(obraSocialId, data);
    if (res.ok) {
      await fetchObrasSociales(false);
    }
    return res;
  }, [fetchObrasSociales]);

  const deleteObraSocial = useCallback(async (obraSocialId: string) => {
    const res = await apiDeleteObraSocial(obraSocialId);
    if (res.ok) {
      await fetchObrasSociales(false);
    }
    return res;
  }, [fetchObrasSociales]);

  return {
    obrasSociales,
    loading,
    error,
    fetchObrasSociales,
    createObraSocial,
    updateObraSocial,
    deleteObraSocial,
  };
}
