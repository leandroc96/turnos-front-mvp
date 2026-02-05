import XLSX from "xlsx-js-style";
import type { Appointment, Doctor } from "../../types";

type Props = {
  appointments: Appointment[];
  doctors: Doctor[];
  loading: boolean;
  onRefresh: () => void;
  filterDoctorId: string;
  filterDate: string;
  onFilterChange: (doctorId: string, date: string) => void;
  onClearFilters: () => void;
};

export function AppointmentTable({
  appointments,
  doctors,
  loading,
  onRefresh,
  filterDoctorId,
  filterDate,
  onFilterChange,
  onClearFilters,
}: Props) {

  // Exportar a Excel
  function exportToExcel() {
    if (appointments.length === 0) {
      alert("No hay turnos para exportar");
      return;
    }

    // Headers
    const headers = ["Fecha", "Hora", "Paciente", "Estudio", "Obra Social", "Teléfono", "Email", "Estado"];
    
    // Preparar datos
    const rows = appointments.map((apt) => {
      const startDate = new Date(apt.startTime);
      return [
        startDate.toLocaleDateString("es-AR"),
        startDate.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
        apt.patientName,
        apt.study,
        apt.insurance,
        apt.patientPhone,
        apt.email,
        apt.status,
      ];
    });

    // Crear worksheet manualmente para aplicar estilos
    const worksheet: XLSX.WorkSheet = {};
    
    // Estilo de borde común (negro/gris oscuro, más visible)
    const border = {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } },
    };

    // Estilo de header
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "4F46E5" } }, // Indigo
      alignment: { horizontal: "center", vertical: "center" },
      border,
    };

    // Agregar headers con estilo
    headers.forEach((header, colIndex) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: colIndex });
      worksheet[cellRef] = { v: header, t: "s", s: headerStyle };
    });

    // Colores según estado
    const statusColors: Record<string, string> = {
      "CONFIRMED": "C6EFCE",  // Verde claro
      "TENTATIVE": "FFEB9C",  // Amarillo claro
      "CANCELLED": "FFC7CE",  // Rojo claro
    };

    const statusTextColors: Record<string, string> = {
      "CONFIRMED": "006100",  // Verde oscuro
      "TENTATIVE": "9C5700",  // Amarillo oscuro
      "CANCELLED": "9C0006",  // Rojo oscuro
    };

    // Agregar filas de datos con estilo
    rows.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        const cellRef = XLSX.utils.encode_cell({ r: rowIndex + 1, c: colIndex });
        
        // Estilo base para celdas de datos
        let cellStyle: Record<string, unknown> = {
          border,
          alignment: { vertical: "center" },
        };

        // Si es la columna de estado, aplicar color según valor
        if (colIndex === 7) { // Columna Estado
          const status = String(cell).toUpperCase();
          if (statusColors[status]) {
            cellStyle = {
              ...cellStyle,
              fill: { fgColor: { rgb: statusColors[status] } },
              font: { bold: true, color: { rgb: statusTextColors[status] } },
              alignment: { horizontal: "center", vertical: "center" },
            };
          }
        }

        // Centrar fecha y hora
        if (colIndex === 0 || colIndex === 1) {
          cellStyle.alignment = { horizontal: "center", vertical: "center" };
        }

        worksheet[cellRef] = { v: cell, t: "s", s: cellStyle };
      });
    });

    // Definir rango de la hoja
    worksheet["!ref"] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: rows.length, c: headers.length - 1 },
    });

    // Ajustar ancho de columnas
    worksheet["!cols"] = [
      { wch: 14 },  // Fecha
      { wch: 8 },   // Hora
      { wch: 28 },  // Paciente
      { wch: 22 },  // Estudio
      { wch: 16 },  // Obra Social
      { wch: 15 },  // Teléfono
      { wch: 28 },  // Email
      { wch: 14 },  // Estado
    ];

    // Crear workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Turnos");

    // Crear nombre del archivo
    const dateStr = filterDate || new Date().toISOString().split("T")[0];
    const doctorName = filterDoctorId 
      ? doctors.find(d => d.doctorId === filterDoctorId)?.name.replace(/[^a-zA-Z0-9]/g, "_") || "todos"
      : "todos";
    const fileName = `turnos_${dateStr}_${doctorName}.xlsx`;

    // Descargar
    XLSX.writeFile(workbook, fileName);
  }

  const hasFilters = filterDoctorId || filterDate;

  return (
    <div className="card">
      <div className="card-header">
        <h2>Lista de turnos</h2>
        <div className="header-actions">
          <button onClick={onRefresh} disabled={loading} className="btn btn-small">
            {loading ? "Cargando..." : "🔄"}
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="filters-bar">
        <div className="filters-row">
          <label className="filter-item">
            <span>Médico:</span>
            <select
              value={filterDoctorId}
              onChange={(e) => onFilterChange(e.target.value, filterDate)}
            >
              <option value="">Todos</option>
              {doctors.map((doctor) => (
                <option key={doctor.doctorId} value={doctor.doctorId}>
                  {doctor.name}
                </option>
              ))}
            </select>
          </label>

          <label className="filter-item">
            <span>Fecha:</span>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => onFilterChange(filterDoctorId, e.target.value)}
            />
          </label>

          {hasFilters && (
            <button onClick={onClearFilters} className="btn btn-small btn-secondary">
              ✕ Limpiar
            </button>
          )}

          <button onClick={exportToExcel} className="btn btn-small btn-export" disabled={appointments.length === 0}>
            📥 Exportar Excel
          </button>
        </div>

        {hasFilters && (
          <p className="filter-count">
            {appointments.length} turno{appointments.length !== 1 ? "s" : ""} encontrado{appointments.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {loading && appointments.length === 0 ? (
        <p className="muted">Cargando turnos...</p>
      ) : appointments.length === 0 ? (
        <p className="muted">
          {hasFilters 
            ? "No hay turnos con los filtros seleccionados." 
            : "No hay turnos registrados en este mes."}
        </p>
      ) : (
        <div className="table-container">
          <table className="appointments-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Paciente</th>
                <th>Estudio</th>
                <th>Obra Social</th>
                <th>Contacto</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((apt) => {
                const startDate = new Date(apt.startTime);
                return (
                  <tr key={apt.appointmentId}>
                    <td>
                      {startDate.toLocaleDateString("es-AR", {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td>
                      {startDate.toLocaleTimeString("es-AR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td>{apt.patientName}</td>
                    <td>{apt.study}</td>
                    <td>{apt.insurance}</td>
                    <td>
                      <div className="contact-cell">
                        <div>{apt.patientPhone}</div>
                        <div className="muted small">{apt.email}</div>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge status-${apt.status.toLowerCase()}`}>
                        {apt.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
