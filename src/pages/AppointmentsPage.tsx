import { useEffect, useState, useCallback } from "react";
import { useAppointments, useDoctors, useStudies } from "../hooks";
import { AppointmentForm, AppointmentTable } from "../components/Appointments";

export function AppointmentsPage() {
  const { appointments, loading: loadingAppointments, fetchAppointments } = useAppointments();
  const { doctors, loading: loadingDoctors, fetchDoctors } = useDoctors();
  const { studies, loading: loadingStudies, fetchStudies } = useStudies();

  // Estado de filtros
  const [filterDoctorId, setFilterDoctorId] = useState<string>("");
  const [filterDate, setFilterDate] = useState<string>("");

  // Cargar datos iniciales
  useEffect(() => {
    fetchDoctors();
    fetchStudies();
  }, [fetchDoctors, fetchStudies]);

  // Cargar turnos cuando cambien los filtros
  const loadAppointments = useCallback(() => {
    fetchAppointments({
      doctorId: filterDoctorId || undefined,
      date: filterDate || undefined,
    });
  }, [fetchAppointments, filterDoctorId, filterDate]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const handleSuccess = () => {
    loadAppointments();
  };

  const handleFilterChange = (doctorId: string, date: string) => {
    setFilterDoctorId(doctorId);
    setFilterDate(date);
  };

  const handleClearFilters = () => {
    setFilterDoctorId("");
    setFilterDate("");
  };

  return (
    <div className="page-content">
      <AppointmentForm
        doctors={doctors}
        studies={studies}
        loadingDoctors={loadingDoctors}
        loadingStudies={loadingStudies}
        onSuccess={handleSuccess}
      />
      <AppointmentTable
        appointments={appointments}
        doctors={doctors}
        loading={loadingAppointments}
        onRefresh={loadAppointments}
        filterDoctorId={filterDoctorId}
        filterDate={filterDate}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />
    </div>
  );
}
