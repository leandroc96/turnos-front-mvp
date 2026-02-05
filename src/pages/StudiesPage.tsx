import { useEffect, useState } from "react";
import { useStudies } from "../hooks";
import type { Study } from "../types";

type FormStudy = {
  name: string;
  durationMinutes: number;
  active: boolean;
};

const INITIAL_FORM: FormStudy = {
  name: "",
  durationMinutes: 30,
  active: true,
};

export function StudiesPage() {
  const { studies, loading, fetchStudies, createStudy, updateStudy, deleteStudy } = useStudies();
  const [form, setForm] = useState<FormStudy>(INITIAL_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchStudies(false); // Traer todos, incluso inactivos
  }, [fetchStudies]);

  function resetForm() {
    setForm(INITIAL_FORM);
    setEditingId(null);
  }

  function startEdit(study: Study) {
    setForm({
      name: study.name,
      durationMinutes: study.durationMinutes,
      active: study.active,
    });
    setEditingId(study.studyId);
    setMessage(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!form.name.trim()) {
      setMessage({ type: "error", text: "Completá el nombre del estudio." });
      return;
    }

    if (form.durationMinutes < 5) {
      setMessage({ type: "error", text: "La duración mínima es 5 minutos." });
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        const res = await updateStudy(editingId, form);
        if (res.ok) {
          setMessage({ type: "success", text: "✅ Estudio actualizado." });
          resetForm();
        } else {
          const text = await res.text().catch(() => "");
          setMessage({ type: "error", text: `❌ Error al actualizar: ${text || res.statusText}` });
        }
      } else {
        const res = await createStudy(form);
        if (res.ok) {
          setMessage({ type: "success", text: "✅ Estudio creado." });
          resetForm();
        } else {
          const text = await res.text().catch(() => "");
          setMessage({ type: "error", text: `❌ Error al crear: ${text || res.statusText}` });
        }
      }
    } catch (err) {
      setMessage({ type: "error", text: `❌ Error: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(studyId: string) {
    if (!confirm("¿Seguro que querés eliminar este estudio?")) return;

    setSubmitting(true);
    try {
      const res = await deleteStudy(studyId);
      if (res.ok) {
        setMessage({ type: "success", text: "✅ Estudio eliminado." });
        if (editingId === studyId) resetForm();
      } else {
        const text = await res.text().catch(() => "");
        setMessage({ type: "error", text: `❌ Error al eliminar: ${text || res.statusText}` });
      }
    } catch (err) {
      setMessage({ type: "error", text: `❌ Error: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-content">
      <div className="card">
        <h1>{editingId ? "Editar estudio" : "Nuevo estudio"}</h1>

        <form onSubmit={handleSubmit} className="form">
          <div className="grid">
            <label>
              Nombre del estudio
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Eco Doppler"
              />
            </label>

            <label>
              Duración (minutos)
              <input
                type="number"
                min={5}
                step={5}
                value={form.durationMinutes}
                onChange={(e) => setForm((p) => ({ ...p, durationMinutes: parseInt(e.target.value) || 30 }))}
              />
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
              />
              Activo
            </label>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={submitting} className="btn">
              {submitting ? "Guardando..." : editingId ? "Actualizar" : "Crear estudio"}
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
          <h2>Lista de estudios</h2>
          <button onClick={() => fetchStudies(false)} disabled={loading} className="btn btn-small">
            {loading ? "Cargando..." : "🔄 Actualizar"}
          </button>
        </div>

        {loading && studies.length === 0 ? (
          <p className="muted">Cargando estudios...</p>
        ) : studies.length === 0 ? (
          <p className="muted">No hay estudios registrados.</p>
        ) : (
          <div className="table-container">
            <table className="appointments-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Duración</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {studies.map((study) => (
                  <tr key={study.studyId}>
                    <td>{study.name}</td>
                    <td>{study.durationMinutes} min</td>
                    <td>
                      <span className={`status-badge ${study.active ? "status-confirmed" : "status-cancelled"}`}>
                        {study.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button onClick={() => startEdit(study)} className="btn btn-small">
                          ✏️ Editar
                        </button>
                        <button onClick={() => handleDelete(study.studyId)} className="btn btn-small btn-danger" disabled={submitting}>
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
      </div>
    </div>
  );
}
