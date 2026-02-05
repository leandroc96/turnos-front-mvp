import { useState, useMemo } from "react";
import type { FormState, Doctor, Study, ResultState, ApiErrorBody } from "../../types";
import { createAppointment, isApiConfigured } from "../../services/api";

type Props = {
  doctors: Doctor[];
  studies: Study[];
  loadingDoctors: boolean;
  loadingStudies: boolean;
  onSuccess: () => void;
};

const INITIAL_FORM: FormState = {
  patientName: "",
  doctorId: "",
  contactPhone: "",
  contactEmail: "",
  studyId: "",
  insurance: "",
  date: "",
  time: "",
};

export function AppointmentForm({
  doctors,
  studies,
  loadingDoctors,
  loadingStudies,
  onSuccess,
}: Props) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResultState>(null);

  const canSubmit = useMemo(() => {
    if (!isApiConfigured()) return false;
    return (
      form.patientName.trim() &&
      form.doctorId &&
      form.contactPhone.trim() &&
      form.contactEmail.trim() &&
      form.studyId &&
      form.insurance.trim() &&
      form.date &&
      form.time
    );
  }, [form]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);

    if (!canSubmit) {
      setResult({ type: "error", text: "Completá todos los campos." });
      return;
    }

    const selectedDoctor = doctors.find((d) => d.doctorId === form.doctorId);
    const selectedStudy = studies.find((s) => s.studyId === form.studyId);

    const payload = {
      patientName: form.patientName.trim(),
      doctorId: form.doctorId,
      doctorName: selectedDoctor?.name || "",
      phone: form.contactPhone.trim(),
      email: form.contactEmail.trim(),
      studyId: form.studyId,
      study: selectedStudy?.name || "",
      insurance: form.insurance.trim(),
      date: form.date,
      time: form.time,
      source: "react_form",
    };

    setLoading(true);
    try {
      const res = await createAppointment(payload);

      console.log("[AppointmentForm] Response", res.status, res.statusText);

      if (res.ok) {
        setResult({ type: "success", text: "✅ Turno creado correctamente." });
        setForm((p) => ({ ...p, patientName: "", contactPhone: "", contactEmail: "" }));
        onSuccess();
        return;
      }

      // Manejo 409
      if (res.status === 409) {
        let body: ApiErrorBody | null = null;
        try {
          body = (await res.json()) as ApiErrorBody;
        } catch { /* empty */ }
        const code = body?.code || body?.reason || "SLOT_TAKEN";
        setResult({
          type: "warning",
          text: `⚠️ Ese horario ya está ocupado (${code}). Probá otro.`,
          detail: body ? JSON.stringify(body, null, 2) : undefined,
        });
        return;
      }

      // Otros errores HTTP
      const text = await res.text().catch(() => "");
      const errorDetail = `Status: ${res.status} ${res.statusText}\nURL: ${res.url}${text ? `\nBody: ${text}` : ""}`;
      setResult({
        type: "error",
        text: `❌ Error ${res.status}. ${text ? text.slice(0, 200) : "Sin detalle"}`,
        detail: errorDetail,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const detail = err instanceof Error ? `${err.name}: ${err.message}\n${err.stack ?? ""}` : String(err);

      const isFailedFetch = message === "Failed to fetch";
      const hint = isFailedFetch
        ? "\n\nSuele ser CORS o red: el backend debe permitir tu origen o revisá que la API esté arriba."
        : "";

      setResult({
        type: "error",
        text: `❌ No pude conectar con la API. ${message}${hint}`,
        detail,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h1>Nuevo turno</h1>
      <p className="muted">Cargá un turno. Si está ocupado, te avisa.</p>

      {!isApiConfigured() && (
        <div className="alert error">
          ❌ Error de configuración: VITE_URL_BASE_BACKEND no está configurada.
        </div>
      )}

      <form onSubmit={onSubmit} className="form">
        <div className="grid">
          <label>
            Nombre completo del paciente
            <input
              value={form.patientName}
              onChange={(e) => update("patientName", e.target.value)}
              placeholder="Juan Pérez"
            />
          </label>

          <label>
            Médico
            <select
              value={form.doctorId}
              onChange={(e) => update("doctorId", e.target.value)}
              disabled={loadingDoctors}
            >
              <option value="">
                {loadingDoctors ? "Cargando..." : "Seleccionar médico"}
              </option>
              {doctors.map((doctor) => (
                <option key={doctor.doctorId} value={doctor.doctorId}>
                  {doctor.name} - {doctor.specialty}
                </option>
              ))}
            </select>
          </label>

          <label>
            Celular
            <input
              value={form.contactPhone}
              onChange={(e) => update("contactPhone", e.target.value)}
              placeholder="341 555-5555"
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={form.contactEmail}
              onChange={(e) => update("contactEmail", e.target.value)}
              placeholder="paciente@mail.com"
            />
          </label>

          <label>
            Estudio
            <select
              value={form.studyId}
              onChange={(e) => update("studyId", e.target.value)}
              disabled={loadingStudies}
            >
              <option value="">
                {loadingStudies ? "Cargando..." : "Seleccionar estudio"}
              </option>
              {studies.map((study) => (
                <option key={study.studyId} value={study.studyId}>
                  {study.name} ({study.durationMinutes} min)
                </option>
              ))}
            </select>
          </label>

          <label>
            Obra social
            <input
              value={form.insurance}
              onChange={(e) => update("insurance", e.target.value)}
              placeholder="OSDE / Swiss / Particular"
            />
          </label>

          <label>
            Fecha
            <input
              type="date"
              value={form.date}
              onChange={(e) => update("date", e.target.value)}
            />
          </label>

          <label>
            Hora
            <input
              type="time"
              value={form.time}
              onChange={(e) => update("time", e.target.value)}
              step={60 * 30}
            />
            <small className="muted">Sugerencia: cada 30 min</small>
          </label>
        </div>

        <button disabled={!canSubmit || loading} className="btn">
          {loading ? "Creando..." : "Crear turno"}
        </button>

        {result && (
          <div className={`alert ${result.type}`}>
            <div>{result.text}</div>
            {result.detail && (
              <pre className="alert-detail" title="Detalle del error">
                {result.detail}
              </pre>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
