export type ApiErrorBody = {
  code?: string;
  reason?: string;
  message?: string;
};

export type FormState = {
  patientName: string;
  doctorId: string;
  contactPhone: string;
  contactEmail: string;
  studyId: string;
  insurance: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
};

export type Appointment = {
  appointmentId: string;
  patientName: string;
  patientPhone: string;
  email: string;
  study: string;
  insurance: string;
  startTime: string; // ISO format: 2026-02-05T09:30:00-03:00
  endTime: string;
  status: string;
  description?: string;
  createdAt: string;
  source?: string;
  calendarEventId?: string;
};

export type AppointmentsResponse = {
  appointments: Appointment[];
  count: number;
};

export type Doctor = {
  doctorId: string;
  name: string;
  specialty: string;
  active: boolean;
};

export type Study = {
  studyId: string;
  name: string;
  durationMinutes: number;
  active: boolean;
};

export type DoctorsResponse = {
  doctors: Doctor[];
  count?: number;
};

export type StudiesResponse = {
  studies: Study[];
  count?: number;
};

export type ResultState = {
  type: "success" | "warning" | "error";
  text: string;
  detail?: string;
} | null;
