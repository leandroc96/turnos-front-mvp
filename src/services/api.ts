import type {
  AppointmentsResponse,
  DoctorsResponse,
  StudiesResponse,
  Doctor,
  Study,
} from "../types";

const API_BASE_URL = import.meta.env.VITE_URL_BASE_BACKEND as string;

export const getApiBaseUrl = () => API_BASE_URL;

export const isApiConfigured = () => Boolean(API_BASE_URL);

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
  console.log("[API] GET", url);

  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Error ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

export async function createAppointment(payload: Record<string, unknown>): Promise<Response> {
  const url = `${API_BASE_URL}/appointments`;
  console.log("[API] POST", url, payload);

  return fetch(url, {
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
  console.log("[API] GET", url);

  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Error ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

export async function createDoctor(data: Omit<Doctor, "doctorId">): Promise<Response> {
  const url = `${API_BASE_URL}/doctors`;
  console.log("[API] POST", url, data);

  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateDoctor(doctorId: string, data: Partial<Doctor>): Promise<Response> {
  const url = `${API_BASE_URL}/doctors/${doctorId}`;
  console.log("[API] PUT", url, data);

  return fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteDoctor(doctorId: string): Promise<Response> {
  const url = `${API_BASE_URL}/doctors/${doctorId}`;
  console.log("[API] DELETE", url);

  return fetch(url, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
}

// ─────────────────────────────────────────────────────────────
// Studies
// ─────────────────────────────────────────────────────────────

export async function fetchStudies(): Promise<StudiesResponse> {
  const url = `${API_BASE_URL}/studies`;
  console.log("[API] GET", url);

  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Error ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

export async function createStudy(data: Omit<Study, "studyId">): Promise<Response> {
  const url = `${API_BASE_URL}/studies`;
  console.log("[API] POST", url, data);

  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateStudy(studyId: string, data: Partial<Study>): Promise<Response> {
  const url = `${API_BASE_URL}/studies/${studyId}`;
  console.log("[API] PUT", url, data);

  return fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteStudy(studyId: string): Promise<Response> {
  const url = `${API_BASE_URL}/studies/${studyId}`;
  console.log("[API] DELETE", url);

  return fetch(url, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
}
