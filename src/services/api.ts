import type {
  AppointmentsResponse,
  DoctorsResponse,
  StudiesResponse,
  ObrasSocialesResponse,
  TarifasResponse,
  Doctor,
  Study,
  ObraSocial,
  Tarifa,
} from "../types";

const API_BASE_URL = `${(import.meta.env.VITE_URL_BASE_BACKEND as string).replace(/\/+$/, "")}/v1`;

export const getApiBaseUrl = () => API_BASE_URL;

export const isApiConfigured = () => Boolean(API_BASE_URL);

// ─────────────────────────────────────────────────────────────
// Helper: fetch con logging detallado de errores
// ─────────────────────────────────────────────────────────────

async function apiFetch(url: string, options: RequestInit): Promise<Response> {
  const method = options.method || "GET";
  console.log(`[API] ${method} ${url}`, options.body ? JSON.parse(options.body as string) : "");

  let res: Response;
  try {
    res = await fetch(url, options);
  } catch (err) {
    // Error de red (sin conexión, DNS, CORS, etc.)
    console.error(`[API] ❌ NETWORK ERROR en ${method} ${url}`);
    console.error(`[API]    Tipo: ${err instanceof Error ? err.name : "Unknown"}`);
    console.error(`[API]    Mensaje: ${err instanceof Error ? err.message : String(err)}`);
    if (err instanceof Error && err.stack) {
      console.error(`[API]    Stack:`, err.stack);
    }
    throw err;
  }

  if (!res.ok) {
    // Intentar leer el body de la respuesta de error
    let responseBody = "";
    try {
      responseBody = await res.clone().text();
    } catch { /* no se pudo leer el body */ }

    console.error(`[API] ❌ HTTP ERROR en ${method} ${url}`);
    console.error(`[API]    Status: ${res.status} ${res.statusText}`);
    console.error(`[API]    Headers:`, Object.fromEntries(res.headers.entries()));
    if (responseBody) {
      console.error(`[API]    Response Body:`, responseBody);
    }
  } else {
    console.log(`[API] ✅ ${method} ${url} → ${res.status}`);
  }

  return res;
}

/** apiFetch que además parsea JSON y tira error si !res.ok */
async function apiFetchJson<T>(url: string, options: RequestInit): Promise<T> {
  const res = await apiFetch(url, options);

  if (!res.ok) {
    throw new Error(`Error ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

// ─────────────────────────────────────────────────────────────
// Appointments
// ─────────────────────────────────────────────────────────────

type FetchAppointmentsParams = {
  from: string;
  to: string;
  doctorId?: string;
};

export async function fetchAppointments({ from, to, doctorId }: FetchAppointmentsParams): Promise<AppointmentsResponse> {
  const params = new URLSearchParams({ from, to });
  if (doctorId) {
    params.append("doctorId", doctorId);
  }

  const url = `${API_BASE_URL}/appointments?${params.toString()}`;
  return apiFetchJson<AppointmentsResponse>(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
}

export async function createAppointment(payload: Record<string, unknown>): Promise<Response> {
  const url = `${API_BASE_URL}/appointments`;
  return apiFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// ─────────────────────────────────────────────────────────────
// Doctors
// ─────────────────────────────────────────────────────────────

export async function fetchDoctors(): Promise<DoctorsResponse> {
  const url = `${API_BASE_URL}/doctors`;
  return apiFetchJson<DoctorsResponse>(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
}

export async function createDoctor(data: Omit<Doctor, "doctorId">): Promise<Response> {
  const url = `${API_BASE_URL}/doctors`;
  return apiFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateDoctor(doctorId: string, data: Partial<Doctor>): Promise<Response> {
  const url = `${API_BASE_URL}/doctors/${doctorId}`;
  return apiFetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteDoctor(doctorId: string): Promise<Response> {
  const url = `${API_BASE_URL}/doctors/${doctorId}`;
  return apiFetch(url, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
}

// ─────────────────────────────────────────────────────────────
// Studies
// ─────────────────────────────────────────────────────────────

export async function fetchStudies(): Promise<StudiesResponse> {
  const url = `${API_BASE_URL}/studies`;
  return apiFetchJson<StudiesResponse>(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
}

export async function createStudy(data: Omit<Study, "studyId">): Promise<Response> {
  const url = `${API_BASE_URL}/studies`;
  return apiFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateStudy(studyId: string, data: Partial<Study>): Promise<Response> {
  const url = `${API_BASE_URL}/studies/${studyId}`;
  return apiFetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteStudy(studyId: string): Promise<Response> {
  const url = `${API_BASE_URL}/studies/${studyId}`;
  return apiFetch(url, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
}

// ─────────────────────────────────────────────────────────────
// Obras Sociales
// ─────────────────────────────────────────────────────────────

export async function fetchObrasSociales(): Promise<ObrasSocialesResponse> {
  const url = `${API_BASE_URL}/obras-sociales`;
  return apiFetchJson<ObrasSocialesResponse>(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
}

export async function createObraSocial(data: Omit<ObraSocial, "obraSocialId">): Promise<Response> {
  const url = `${API_BASE_URL}/obras-sociales`;
  return apiFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateObraSocial(obraSocialId: string, data: Partial<ObraSocial>): Promise<Response> {
  const url = `${API_BASE_URL}/obras-sociales/${obraSocialId}`;
  return apiFetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteObraSocial(obraSocialId: string): Promise<Response> {
  const url = `${API_BASE_URL}/obras-sociales/${obraSocialId}`;
  return apiFetch(url, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
}

// ─────────────────────────────────────────────────────────────
// Tarifas (Estudio × Obra Social → Precio)
// ─────────────────────────────────────────────────────────────

export async function fetchTarifas(): Promise<TarifasResponse> {
  const url = `${API_BASE_URL}/tarifas`;
  return apiFetchJson<TarifasResponse>(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
}

export async function createTarifa(data: Omit<Tarifa, "tarifaId" | "nombreEstudio" | "nombreObraSocial">): Promise<Response> {
  const url = `${API_BASE_URL}/tarifas`;
  return apiFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateTarifa(tarifaId: string, data: Partial<Tarifa>): Promise<Response> {
  const url = `${API_BASE_URL}/tarifas/${tarifaId}`;
  return apiFetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteTarifa(tarifaId: string): Promise<Response> {
  const url = `${API_BASE_URL}/tarifas/${tarifaId}`;
  return apiFetch(url, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
}
