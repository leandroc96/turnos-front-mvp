import { useEffect, useState } from "react";
import { useObrasSociales } from "../hooks";
import type { ObraSocial } from "../types";

type FormObraSocial = {
  nombre: string;
  codigo: string;
  activa: boolean;
};

const INITIAL_FORM: FormObraSocial = {
  nombre: "",
  codigo: "",
  activa: true,
};

export function ObrasSocialesPage() {
  const { obrasSociales, loading, fetchObrasSociales, createObraSocial, updateObraSocial, deleteObraSocial } = useObrasSociales();
  const [form, setForm] = useState<FormObraSocial>(INITIAL_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchObrasSociales(false);
  }, [fetchObrasSociales]);

  function resetForm() {
    setForm(INITIAL_FORM);
    setEditingId(null);
  }

  function startEdit(os: ObraSocial) {
    setForm({
      nombre: os.nombre,
      codigo: os.codigo || "",
      activa: os.activa,
    });
    setEditingId(os.obraSocialId);
    setMessage(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!form.nombre.trim()) {
      setMessage({ type: "error", text: "Completá el nombre de la obra social." });
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        const res = await updateObraSocial(editingId, form);
        if (res.ok) {
          setMessage({ type: "success", text: "✅ Obra social actualizada." });
          resetForm();
        } else {
          const text = await res.text().catch(() => "");
          setMessage({ type: "error", text: `❌ Error al actualizar: ${text || res.statusText}` });
        }
      } else {
        const res = await createObraSocial(form);
        if (res.ok) {
          setMessage({ type: "success", text: "✅ Obra social creada." });
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

  async function handleDelete(obraSocialId: string) {
    if (!confirm("¿Seguro que querés eliminar esta obra social?")) return;

    setSubmitting(true);
    try {
      const res = await deleteObraSocial(obraSocialId);
      if (res.ok) {
        setMessage({ type: "success", text: "✅ Obra social eliminada." });
        if (editingId === obraSocialId) resetForm();
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
        <h1>{editingId ? "Editar obra social" : "Nueva obra social"}</h1>

        <form onSubmit={handleSubmit} className="form">
          <div className="grid">
            <label>
              Nombre
              <input
                value={form.nombre}
                onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                placeholder="PAMI"
              />
            </label>

            <label>
              Código (opcional)
              <input
                value={form.codigo}
                onChange={(e) => setForm((p) => ({ ...p, codigo: e.target.value }))}
                placeholder="Ej: PAMI-CAP"
              />
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.activa}
                onChange={(e) => setForm((p) => ({ ...p, activa: e.target.checked }))}
              />
              Activa
            </label>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={submitting} className="btn">
              {submitting ? "Guardando..." : editingId ? "Actualizar" : "Crear obra social"}
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
          <h2>Lista de obras sociales</h2>
          <button onClick={() => fetchObrasSociales(false)} disabled={loading} className="btn btn-small">
            {loading ? "Cargando..." : "🔄 Actualizar"}
          </button>
        </div>

        {loading && obrasSociales.length === 0 ? (
          <p className="muted">Cargando obras sociales...</p>
        ) : obrasSociales.length === 0 ? (
          <p className="muted">No hay obras sociales registradas.</p>
        ) : (
          <div className="table-container">
            <table className="appointments-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Código</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {obrasSociales.map((os) => (
                  <tr key={os.obraSocialId}>
                    <td>{os.nombre}</td>
                    <td>{os.codigo || "—"}</td>
                    <td>
                      <span className={`status-badge ${os.activa ? "status-confirmed" : "status-cancelled"}`}>
                        {os.activa ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button onClick={() => startEdit(os)} className="btn btn-small">
                          ✏️ Editar
                        </button>
                        <button onClick={() => handleDelete(os.obraSocialId)} className="btn btn-small btn-danger" disabled={submitting}>
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
