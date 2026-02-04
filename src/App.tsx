import { useMemo, useState } from "react";
import "./App.css";

type ApiErrorBody = {
  code?: string;
  reason?: string;
  message?: string;
};

type FormState = {
  patientName: string;
  doctorName: string;
  contactPhone: string;
  contactEmail: string;
  studyType: string;
  insurance: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
};

const DURATION_MINUTES = 30;

function App() {
  const API_BASE_URL = import.meta.env.VITE_URL_BASE_BACKEND as string;

  if (!API_BASE_URL) {
    console.error("VITE_URL_BASE_BACKEND no está configurada");
  }

  const [form, setForm] = useState<FormState>({
    patientName: "",
    doctorName: "",
    contactPhone: "",
    contactEmail: "",
    studyType: "",
    insurance: "",
    date: "",
    time: "",
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<
    | { type: "success"; text: string; detail?: string }
    | { type: "warning"; text: string; detail?: string }
    | { type: "error"; text: string; detail?: string }
    | null
  >(null);

  const canSubmit = useMemo(() => {
    if (!API_BASE_URL) return false;
    return (
      form.patientName.trim() &&
      form.doctorName.trim() &&
      form.contactPhone.trim() &&
      form.contactEmail.trim() &&
      form.studyType.trim() &&
      form.insurance.trim() &&
      form.date &&
      form.time
    );
  }, [form, API_BASE_URL]);

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

    const payload = {
      patientName: form.patientName.trim(),
      doctorName: form.doctorName.trim(),
      phone: form.contactPhone.trim(),
      email: form.contactEmail.trim(),
      study: form.studyType.trim(),
      insurance: form.insurance.trim(),
      date: form.date,
      time: form.time,
      source: "react_form",
    };

    const url = `${API_BASE_URL}/appointments`;
    console.log("[Turnos] POST", url, payload);

    setLoading(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log("[Turnos] Response", res.status, res.statusText, res.url);

      if (res.ok) {
        console.log("[Turnos] Turno creado OK");
        setResult({
          type: "success",
          text: "✅ Turno creado correctamente.",
        });
        setForm((p) => ({ ...p, patientName: "", contactPhone: "", contactEmail: "" }));
        return;
      }

      // Manejo 409
      if (res.status === 409) {
        let body: ApiErrorBody | null = null;
        try {
          body = (await res.json()) as ApiErrorBody;
        } catch {}
        const code = body?.code || body?.reason || "SLOT_TAKEN";
        console.warn("[Turnos] 409 Slot ocupado", { status: res.status, body });
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
      console.error("[Turnos] Error HTTP", res.status, text);
      setResult({
        type: "error",
        text: `❌ Error ${res.status}. ${text ? text.slice(0, 200) : "Sin detalle"}`,
        detail: errorDetail,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const detail = err instanceof Error ? `${err.name}: ${err.message}\n${err.stack ?? ""}` : String(err);
      console.error("[Turnos] Error de red/excepción", err);

      const isFailedFetch = message === "Failed to fetch";
      const hint = isFailedFetch
        ? "\n\nSuele ser CORS o red: el backend debe permitir tu origen (ej. http://localhost:5173) o revisá que la API esté arriba y la URL sea correcta."
        : "";

      setResult({
        type: "error",
        text: `❌ No pude conectar con la API. ${message}${hint}`,
        detail: detail + (isFailedFetch ? "\n\nURL que se intentó: " + url : ""),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="card">
        <h1>Turnos médicos</h1>
        <p className="muted">Carga un turno de 30 minutos. Si está ocupado, te avisa.</p>

        {!API_BASE_URL && (
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
              <input
                value={form.doctorName}
                onChange={(e) => update("doctorName", e.target.value)}
                placeholder="Dra. García"
              />
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
              <input
                value={form.studyType}
                onChange={(e) => update("studyType", e.target.value)}
                placeholder="Eco Doppler, Rx, etc."
              />
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
                step={60 * DURATION_MINUTES}
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
                <pre className="alert-detail" title="Detalle del error (también en consola del navegador)">
                  {result.detail}
                </pre>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default App;
