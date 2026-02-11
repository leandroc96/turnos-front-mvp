import { useEffect, useState, useMemo } from "react";
import { useStudies, useObrasSociales, useTarifas } from "../hooks";
import type { Tarifa } from "../types";

export function TarifasPage() {
  const { studies, fetchStudies, loading: loadingStudies } = useStudies();
  const { obrasSociales, fetchObrasSociales, loading: loadingOS } = useObrasSociales();
  const { tarifas, fetchTarifas, createTarifa, updateTarifa, deleteTarifa, loading: loadingTarifas } = useTarifas();

  const [formEstudioId, setFormEstudioId] = useState("");
  const [formObraSocialId, setFormObraSocialId] = useState("");
  const [formPrecio, setFormPrecio] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filtros
  const [filtroEstudio, setFiltroEstudio] = useState("");
  const [filtroOS, setFiltroOS] = useState("");

  useEffect(() => {
    fetchStudies();
    fetchObrasSociales();
    fetchTarifas();
  }, [fetchStudies, fetchObrasSociales, fetchTarifas]);

  // Maps para nombres
  const studyMap = useMemo(() => {
    const map = new Map<string, string>();
    studies.forEach((s) => map.set(s.studyId, s.name));
    return map;
  }, [studies]);

  const osMap = useMemo(() => {
    const map = new Map<string, string>();
    obrasSociales.forEach((os) => map.set(os.obraSocialId, os.nombre));
    return map;
  }, [obrasSociales]);

  // Filtrado
  const tarifasFiltradas = useMemo(() => {
    return tarifas.filter((t) => {
      if (filtroEstudio && t.estudioId !== filtroEstudio) return false;
      if (filtroOS && t.obraSocialId !== filtroOS) return false;
      return true;
    });
  }, [tarifas, filtroEstudio, filtroOS]);

  function resetForm() {
    setFormEstudioId("");
    setFormObraSocialId("");
    setFormPrecio("");
    setEditingId(null);
  }

  function startEdit(t: Tarifa) {
    setFormEstudioId(t.estudioId);
    setFormObraSocialId(t.obraSocialId);
    setFormPrecio(t.precio.toString());
    setEditingId(t.tarifaId);
    setMessage(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!formEstudioId || !formObraSocialId || !formPrecio) {
      setMessage({ type: "error", text: "Completá todos los campos." });
      return;
    }

    const precio = parseFloat(formPrecio);
    if (isNaN(precio) || precio < 0) {
      setMessage({ type: "error", text: "Ingresá un precio válido." });
      return;
    }

    // Verificar duplicados (solo al crear)
    if (!editingId) {
      const existe = tarifas.find(
        (t) => t.estudioId === formEstudioId && t.obraSocialId === formObraSocialId
      );
      if (existe) {
        setMessage({
          type: "error",
          text: `Ya existe una tarifa para "${studyMap.get(formEstudioId)}" con "${osMap.get(formObraSocialId)}". Editala en la tabla.`,
        });
        return;
      }
    }

    setSubmitting(true);
    try {
      if (editingId) {
        const res = await updateTarifa(editingId, {
          estudioId: formEstudioId,
          obraSocialId: formObraSocialId,
          precio,
        });
        if (res.ok) {
          setMessage({ type: "success", text: "✅ Tarifa actualizada." });
          resetForm();
        } else {
          const text = await res.text().catch(() => "");
          setMessage({ type: "error", text: `❌ Error: ${text || res.statusText}` });
        }
      } else {
        const res = await createTarifa({
          estudioId: formEstudioId,
          obraSocialId: formObraSocialId,
          precio,
        });
        if (res.ok) {
          setMessage({ type: "success", text: "✅ Tarifa creada." });
          resetForm();
        } else {
          const text = await res.text().catch(() => "");
          setMessage({ type: "error", text: `❌ Error: ${text || res.statusText}` });
        }
      }
    } catch (err) {
      setMessage({ type: "error", text: `❌ Error: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(tarifaId: string) {
    if (!confirm("¿Seguro que querés eliminar esta tarifa?")) return;

    setSubmitting(true);
    try {
      const res = await deleteTarifa(tarifaId);
      if (res.ok) {
        setMessage({ type: "success", text: "✅ Tarifa eliminada." });
        if (editingId === tarifaId) resetForm();
      } else {
        const text = await res.text().catch(() => "");
        setMessage({ type: "error", text: `❌ Error: ${text || res.statusText}` });
      }
    } catch (err) {
      setMessage({ type: "error", text: `❌ Error: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setSubmitting(false);
    }
  }

  const isLoading = loadingStudies || loadingOS || loadingTarifas;

  return (
    <div className="page-content">
      <div className="card">
        <h1>{editingId ? "Editar tarifa" : "Nueva tarifa"}</h1>

        <form onSubmit={handleSubmit} className="form">
          <div className="grid">
            <label>
              Estudio
              <select
                value={formEstudioId}
                onChange={(e) => setFormEstudioId(e.target.value)}
              >
                <option value="">Seleccionar estudio</option>
                {studies.map((s) => (
                  <option key={s.studyId} value={s.studyId}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Obra social
              <select
                value={formObraSocialId}
                onChange={(e) => setFormObraSocialId(e.target.value)}
              >
                <option value="">Seleccionar obra social</option>
                {obrasSociales.map((os) => (
                  <option key={os.obraSocialId} value={os.obraSocialId}>
                    {os.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Precio ($)
              <input
                type="number"
                step="0.01"
                min="0"
                value={formPrecio}
                onChange={(e) => setFormPrecio(e.target.value)}
                placeholder="0.00"
              />
            </label>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={submitting} className="btn">
              {submitting ? "Guardando..." : editingId ? "Actualizar" : "Crear tarifa"}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="btn btn-secondary">
                Cancelar
              </button>
            )}
          </div>

          {message && (
            <div className={`alert ${message.type}`}>
              {message.text}
            </div>
          )}
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Tabla de tarifas</h2>
          <button onClick={() => fetchTarifas()} disabled={isLoading} className="btn btn-small">
            {isLoading ? "Cargando..." : "🔄 Actualizar"}
          </button>
        </div>

        {/* Filtros */}
        <div className="filter-row" style={{ marginBottom: "1rem" }}>
          <label>
            Filtrar estudio
            <select value={filtroEstudio} onChange={(e) => setFiltroEstudio(e.target.value)}>
              <option value="">Todos</option>
              {studies.map((s) => (
                <option key={s.studyId} value={s.studyId}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Filtrar obra social
            <select value={filtroOS} onChange={(e) => setFiltroOS(e.target.value)}>
              <option value="">Todas</option>
              {obrasSociales.map((os) => (
                <option key={os.obraSocialId} value={os.obraSocialId}>
                  {os.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isLoading && tarifas.length === 0 ? (
          <p className="muted">Cargando tarifas...</p>
        ) : tarifasFiltradas.length === 0 ? (
          <p className="muted">No hay tarifas registradas{(filtroEstudio || filtroOS) ? " con esos filtros" : ""}.</p>
        ) : (
          <div className="table-container">
            <table className="appointments-table">
              <thead>
                <tr>
                  <th>Estudio</th>
                  <th>Obra Social</th>
                  <th style={{ textAlign: "right" }}>Precio</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tarifasFiltradas.map((t) => (
                  <tr key={t.tarifaId}>
                    <td>{t.nombreEstudio || studyMap.get(t.estudioId) || t.estudioId}</td>
                    <td>{t.nombreObraSocial || osMap.get(t.obraSocialId) || t.obraSocialId}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>
                      ${t.precio.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td>
                      <div className="table-actions">
                        <button onClick={() => startEdit(t)} className="btn btn-small">
                          ✏️ Editar
                        </button>
                        <button onClick={() => handleDelete(t.tarifaId)} className="btn btn-small btn-danger" disabled={submitting}>
                          🗑️ Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Resumen */}
        {tarifas.length > 0 && (
          <div style={{ marginTop: "1rem", fontSize: "0.85rem", color: "#6b7280" }}>
            {tarifasFiltradas.length} de {tarifas.length} tarifas
            {" · "}
            {studies.length} estudios
            {" · "}
            {obrasSociales.length} obras sociales
          </div>
        )}
      </div>
    </div>
  );
}
