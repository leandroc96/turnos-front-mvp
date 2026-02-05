import { useEffect, useState } from "react";
import { useDoctors } from "../hooks";
import type { Doctor } from "../types";

type FormDoctor = {
  name: string;
  specialty: string;
  active: boolean;
};

const INITIAL_FORM: FormDoctor = {
  name: "",
  specialty: "",
  active: true,
};

export function DoctorsPage() {
  const { doctors, loading, fetchDoctors, createDoctor, updateDoctor, deleteDoctor } = useDoctors();
  const [form, setForm] = useState<FormDoctor>(INITIAL_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchDoctors(false); // Traer todos, incluso inactivos
  }, [fetchDoctors]);

  function resetForm() {
    setForm(INITIAL_FORM);
    setEditingId(null);
  }

  function startEdit(doctor: Doctor) {
    setForm({
      name: doctor.name,
      specialty: doctor.specialty,
      active: doctor.active,
    });
    setEditingId(doctor.doctorId);
    setMessage(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!form.name.trim() || !form.specialty.trim()) {
      setMessage({ type: "error", text: "Completá nombre y especialidad." });
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        const res = await updateDoctor(editingId, form);
        if (res.ok) {
          setMessage({ type: "success", text: "✅ Médico actualizado." });
          resetForm();
        } else {
          const text = await res.text().catch(() => "");
          setMessage({ type: "error", text: `❌ Error al actualizar: ${text || res.statusText}` });
        }
      } else {
        const res = await createDoctor(form);
        if (res.ok) {
          setMessage({ type: "success", text: "✅ Médico creado." });
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

  async function handleDelete(doctorId: string) {
    if (!confirm("¿Seguro que querés eliminar este médico?")) return;

    setSubmitting(true);
    try {
      const res = await deleteDoctor(doctorId);
      if (res.ok) {
        setMessage({ type: "success", text: "✅ Médico eliminado." });
        if (editingId === doctorId) resetForm();
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
        <h1>{editingId ? "Editar médico" : "Nuevo médico"}</h1>

        <form onSubmit={handleSubmit} className="form">
          <div className="grid">
            <label>
              Nombre
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Dra. García"
              />
            </label>

            <label>
              Especialidad
              <input
                value={form.specialty}
                onChange={(e) => setForm((p) => ({ ...p, specialty: e.target.value }))}
                placeholder="Cardiología"
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
              {submitting ? "Guardando..." : editingId ? "Actualizar" : "Crear médico"}
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
          <h2>Lista de médicos</h2>
          <button onClick={() => fetchDoctors(false)} disabled={loading} className="btn btn-small">
            {loading ? "Cargando..." : "🔄 Actualizar"}
          </button>
        </div>

        {loading && doctors.length === 0 ? (
          <p className="muted">Cargando médicos...</p>
        ) : doctors.length === 0 ? (
          <p className="muted">No hay médicos registrados.</p>
        ) : (
          <div className="table-container">
            <table className="appointments-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Especialidad</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {doctors.map((doctor) => (
                  <tr key={doctor.doctorId}>
                    <td>{doctor.name}</td>
                    <td>{doctor.specialty}</td>
                    <td>
                      <span className={`status-badge ${doctor.active ? "status-confirmed" : "status-cancelled"}`}>
                        {doctor.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button onClick={() => startEdit(doctor)} className="btn btn-small">
                          ✏️ Editar
                        </button>
                        <button onClick={() => handleDelete(doctor.doctorId)} className="btn btn-small btn-danger" disabled={submitting}>
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
