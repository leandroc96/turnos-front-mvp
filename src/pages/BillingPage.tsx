import { useState, useRef, useEffect, useCallback } from "react";
import XLSX from "xlsx-js-style";
import { processDocument, type ParsedDocument } from "../services/documentParser";
import { useDoctors, useStudies, useObrasSociales, useTarifas } from "../hooks";
import "./BillingPage.css";

type DocumentEntry = ParsedDocument & {
  id: string;
  fileName: string;
  doctorId: string;        // Doctor seleccionado del ABM
  studyId: string;         // Estudio seleccionado del ABM
  obraSocialId: string;    // Obra social seleccionada del ABM
  precio: number | null;   // Precio auto-calculado
};

export function BillingPage() {
  const { doctors, loading: loadingDoctors, fetchDoctors } = useDoctors();
  const { studies, loading: loadingStudies, fetchStudies } = useStudies();
  const { obrasSociales, loading: loadingOS, fetchObrasSociales } = useObrasSociales();
  const { fetchTarifas, getPrecio } = useTarifas();
  const [entries, setEntries] = useState<DocumentEntry[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [showRawText, setShowRawText] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    patientName: "",
    obraSocialId: "",
    carnet: "",
    age: "",
    doctorId: "",
    studyId: "",
    date: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDoctors();
    fetchStudies();
    fetchObrasSociales();
    fetchTarifas();
  }, [fetchDoctors, fetchStudies, fetchObrasSociales, fetchTarifas]);

  // Intentar auto-matchear el estudio extraído con los del ABM
  function autoMatchStudy(practiceText: string): string {
    if (!practiceText || studies.length === 0) return "";

    const normalized = practiceText.toUpperCase();
    const match = studies.find((s) =>
      normalized.includes(s.name.toUpperCase()) || s.name.toUpperCase().includes(normalized.slice(0, 20))
    );
    return match?.studyId || "";
  }

  // Intentar auto-matchear el cirujano extraído con los doctores del ABM
  function autoMatchDoctor(surgeonText: string): string {
    if (!surgeonText || doctors.length === 0) return "";

    const normalized = surgeonText.toUpperCase().trim();
    const exact = doctors.find((d) => d.name.toUpperCase() === normalized);
    if (exact) return exact.doctorId;

    const partial = doctors.find((d) =>
      normalized.includes(d.name.toUpperCase()) || d.name.toUpperCase().includes(normalized.split(" ")[0])
    );
    return partial?.doctorId || "";
  }

  // Intentar auto-matchear la obra social extraída con las del ABM
  function autoMatchObraSocial(obraSocialText: string): string {
    if (!obraSocialText || obrasSociales.length === 0) return "";

    const normalized = obraSocialText.toUpperCase().trim();
    // Buscar coincidencia exacta o parcial
    const exact = obrasSociales.find((os) => os.nombre.toUpperCase() === normalized);
    if (exact) return exact.obraSocialId;

    const partial = obrasSociales.find((os) =>
      normalized.includes(os.nombre.toUpperCase()) || os.nombre.toUpperCase().includes(normalized.split(" ")[0])
    );
    return partial?.obraSocialId || "";
  }

  // Calcular precio cuando cambian studyId o obraSocialId
  const calcPrecio = useCallback((studyId: string, obraSocialId: string): number | null => {
    if (!studyId || !obraSocialId) return null;
    return getPrecio(studyId, obraSocialId);
  }, [getPrecio]);

  function updateEntry(id: string, field: keyof DocumentEntry, value: string) {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const updated = { ...e, [field]: value };
        // Recalcular precio cuando cambian studyId o obraSocialId
        if (field === "studyId" || field === "obraSocialId") {
          updated.precio = calcPrecio(
            field === "studyId" ? value : e.studyId,
            field === "obraSocialId" ? value : e.obraSocialId,
          );
        }
        return updated;
      })
    );
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    setError(null);
    setProcessing(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setCurrentFile(file.name);
      setProgress(0);

      try {
        const parsed = await processDocument(file, (p) => setProgress(p));

        const matchedDoctorId = autoMatchDoctor(parsed.surgeon);
        const matchedStudyId = autoMatchStudy(parsed.practice);
        const matchedObraSocialId = autoMatchObraSocial(parsed.insurance);

        const entry: DocumentEntry = {
          ...parsed,
          id: crypto.randomUUID(),
          fileName: file.name,
          doctorId: matchedDoctorId,
          studyId: matchedStudyId,
          obraSocialId: matchedObraSocialId,
          precio: calcPrecio(matchedStudyId, matchedObraSocialId),
        };

        setEntries((prev) => [...prev, entry]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Error al procesar "${file.name}": ${msg}`);
      }
    }

    setProcessing(false);
    setCurrentFile("");
    setProgress(0);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    handleFiles(e.dataTransfer.files);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function removeEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function clearAll() {
    setEntries([]);
    setError(null);
  }

  function resetManualForm() {
    setManualForm({ patientName: "", obraSocialId: "", carnet: "", age: "", doctorId: "", studyId: "", date: "" });
  }

  function handleManualAdd() {
    if (!manualForm.patientName.trim()) return;

    const selectedDoctor = doctors.find((d) => d.doctorId === manualForm.doctorId);

    const entry: DocumentEntry = {
      id: crypto.randomUUID(),
      fileName: "(manual)",
      patientName: manualForm.patientName.trim(),
      insurance: "",
      carnet: manualForm.carnet.trim(),
      age: manualForm.age.trim(),
      surgeon: selectedDoctor?.name || "",
      practice: "",
      operationDescription: "",
      date: manualForm.date,
      rawText: "",
      doctorId: manualForm.doctorId,
      studyId: manualForm.studyId,
      obraSocialId: manualForm.obraSocialId,
      precio: calcPrecio(manualForm.studyId, manualForm.obraSocialId),
    };

    setEntries((prev) => [...prev, entry]);
    resetManualForm();
  }

  // Obtener nombre del doctor seleccionado
  function getNombreDoctor(doctorId: string): string {
    const doctor = doctors.find((d) => d.doctorId === doctorId);
    return doctor?.name || "";
  }

  // Obtener nombre del estudio seleccionado
  function getNombreEstudio(studyId: string): string {
    const study = studies.find((s) => s.studyId === studyId);
    return study?.name || "";
  }

  // Obtener nombre de obra social seleccionada
  function getNombreObraSocial(obraSocialId: string): string {
    const os = obrasSociales.find((o) => o.obraSocialId === obraSocialId);
    return os?.nombre || "";
  }

  // Exportar a Excel (formato plantilla)
  function exportToExcel() {
    if (entries.length === 0) return;

    // Columnas según plantilla: FECHA | MEDICO/A | PACIENTE | EDAD | OBRA SOCIAL | NRO AFILIADO | ESTUDIO REALIZADO | ARANCEL
    const headers = ["FECHA", "MEDICO/A", "PACIENTE", "EDAD", "OBRA SOCIAL", "NRO AFILIADO", "ESTUDIO REALIZADO", "ARANCEL"];

    const worksheet: XLSX.WorkSheet = {};

    const border = {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } },
    };

    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" }, sz: 10 },
      fill: { fgColor: { rgb: "38761D" } },
      alignment: { horizontal: "center", vertical: "center" },
      border,
    };

    headers.forEach((header, colIndex) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: colIndex });
      worksheet[cellRef] = { v: header, t: "s", s: headerStyle };
    });

    const COL_ARANCEL = 7; // índice de la columna ARANCEL

    entries.forEach((entry, rowIndex) => {
      const rowData: (string | number)[] = [
        entry.date || "",
        getNombreDoctor(entry.doctorId) || entry.surgeon || "",
        entry.patientName || "",
        entry.age || "",
        getNombreObraSocial(entry.obraSocialId) || entry.insurance || "",
        entry.carnet || "",
        getNombreEstudio(entry.studyId) || entry.practice || "(sin asignar)",
        entry.precio ?? 0,
      ];

      rowData.forEach((cell, colIndex) => {
        const cellRef = XLSX.utils.encode_cell({ r: rowIndex + 1, c: colIndex });
        const esArancel = colIndex === COL_ARANCEL;
        worksheet[cellRef] = {
          v: cell,
          t: esArancel ? "n" : "s",
          s: {
            border,
            alignment: { vertical: "center", horizontal: esArancel ? "right" : "left" },
            numFmt: esArancel ? "#,##0.00" : undefined,
            font: esArancel && cell === 0 ? { color: { rgb: "999999" } } : undefined,
          },
        };
      });
    });

    // Fila de total
    const totalRow = entries.length + 1;
    const totalLabelRef = XLSX.utils.encode_cell({ r: totalRow, c: COL_ARANCEL - 1 });
    worksheet[totalLabelRef] = {
      v: "TOTAL",
      t: "s",
      s: { border, font: { bold: true }, alignment: { horizontal: "right", vertical: "center" } },
    };

    const totalValueRef = XLSX.utils.encode_cell({ r: totalRow, c: COL_ARANCEL });
    const montoTotal = entries.reduce((sum, e) => sum + (e.precio || 0), 0);
    worksheet[totalValueRef] = {
      v: montoTotal,
      t: "n",
      s: {
        border,
        font: { bold: true, color: { rgb: "16A34A" } },
        alignment: { horizontal: "right", vertical: "center" },
        numFmt: "#,##0.00",
      },
    };

    // Bordes en celdas vacías del total
    for (let c = 0; c < headers.length; c++) {
      if (c === COL_ARANCEL - 1 || c === COL_ARANCEL) continue;
      const ref = XLSX.utils.encode_cell({ r: totalRow, c });
      worksheet[ref] = { v: "", t: "s", s: { border } };
    }

    worksheet["!ref"] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: totalRow, c: headers.length - 1 },
    });

    worksheet["!cols"] = [
      { wch: 14 },  // FECHA
      { wch: 30 },  // MEDICO/A
      { wch: 30 },  // PACIENTE
      { wch: 8 },   // EDAD
      { wch: 22 },  // OBRA SOCIAL
      { wch: 18 },  // NRO AFILIADO
      { wch: 28 },  // ESTUDIO REALIZADO
      { wch: 14 },  // ARANCEL
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Facturación");

    const today = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `facturacion_${today}.xlsx`);
  }

  return (
    <div className="page-content">
      <div className="card">
        <h1>📄 Facturación - Partes Quirúrgicos</h1>
        <p className="muted">
          Subí PDFs o imágenes de partes quirúrgicos y se extraen los datos automáticamente.
        </p>

        {/* Zona de upload */}
        <div
          className={`dropzone ${processing ? "dropzone-disabled" : ""}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => !processing && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            style={{ display: "none" }}
          />

          {processing ? (
            <div className="dropzone-processing">
              <div className="spinner" />
              <p>Procesando: <strong>{currentFile}</strong></p>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <p className="muted">{progress}%</p>
            </div>
          ) : (
            <div className="dropzone-idle">
              <span className="dropzone-icon">📁</span>
              <p><strong>Arrastrá archivos acá</strong> o hacé clic para seleccionar</p>
              <p className="muted small">PDF o imágenes (JPG, PNG). Podés subir varios a la vez.</p>
            </div>
          )}
        </div>

        {error && (
          <div className="alert error" style={{ marginTop: "12px" }}>
            {error}
          </div>
        )}
      </div>

      {/* Ingreso manual colapsable */}
      <div className="card">
        <button
          type="button"
          className="collapsible-header"
          onClick={() => setManualOpen((prev) => !prev)}
        >
          <span>✍️ Ingreso manual</span>
          <span className={`collapse-arrow ${manualOpen ? "open" : ""}`}>▸</span>
        </button>

        {manualOpen && (
          <div className="collapsible-body">
            <div className="grid manual-grid">
              <label>
                Paciente *
                <input
                  value={manualForm.patientName}
                  onChange={(e) => setManualForm((p) => ({ ...p, patientName: e.target.value }))}
                  placeholder="Nombre del paciente"
                />
              </label>

              <label>
                Obra Social
                <select
                  value={manualForm.obraSocialId}
                  onChange={(e) => setManualForm((p) => ({ ...p, obraSocialId: e.target.value }))}
                  disabled={loadingOS}
                >
                  <option value="">{loadingOS ? "Cargando..." : "Seleccionar O.S."}</option>
                  {obrasSociales.map((os) => (
                    <option key={os.obraSocialId} value={os.obraSocialId}>
                      {os.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Nro de Afiliado
                <input
                  value={manualForm.carnet}
                  onChange={(e) => setManualForm((p) => ({ ...p, carnet: e.target.value }))}
                  placeholder="N° de afiliado"
                />
              </label>

              <label>
                Edad
                <input
                  value={manualForm.age}
                  onChange={(e) => setManualForm((p) => ({ ...p, age: e.target.value }))}
                  placeholder="Ej: 45"
                />
              </label>

              <label>
                Cirujano
                <select
                  value={manualForm.doctorId}
                  onChange={(e) => setManualForm((p) => ({ ...p, doctorId: e.target.value }))}
                  disabled={loadingDoctors}
                >
                  <option value="">{loadingDoctors ? "Cargando..." : "Seleccionar doctor"}</option>
                  {doctors.map((doc) => (
                    <option key={doc.doctorId} value={doc.doctorId}>
                      {doc.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Estudio
                <select
                  value={manualForm.studyId}
                  onChange={(e) => setManualForm((p) => ({ ...p, studyId: e.target.value }))}
                  disabled={loadingStudies}
                >
                  <option value="">{loadingStudies ? "Cargando..." : "Seleccionar estudio"}</option>
                  {studies.map((study) => (
                    <option key={study.studyId} value={study.studyId}>
                      {study.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Fecha
                <input
                  type="date"
                  value={manualForm.date}
                  onChange={(e) => setManualForm((p) => ({ ...p, date: e.target.value }))}
                />
              </label>
            </div>

            <div className="form-actions" style={{ marginTop: "14px" }}>
              <button
                type="button"
                className="btn"
                onClick={handleManualAdd}
                disabled={!manualForm.patientName.trim()}
              >
                ➕ Agregar a la tabla
              </button>
              <button type="button" className="btn btn-secondary" onClick={resetManualForm}>
                Limpiar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabla de resultados */}
      {entries.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2>Datos extraídos ({entries.length})</h2>
            <div className="header-actions">
              <button onClick={exportToExcel} className="btn btn-small btn-export">
                📥 Exportar Excel
              </button>
              <button onClick={clearAll} className="btn btn-small btn-danger">
                🗑️ Limpiar todo
              </button>
            </div>
          </div>

          <div className="table-container">
            <table className="appointments-table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Obra Social</th>
                  <th>Nro Afiliado</th>
                  <th>Edad</th>
                  <th>Cirujano</th>
                  <th>Estudio</th>
                  <th>Precio</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <strong>{entry.patientName || "—"}</strong>
                    </td>
                    <td>
                      <select
                        className="table-select"
                        value={entry.obraSocialId}
                        onChange={(e) => updateEntry(entry.id, "obraSocialId", e.target.value)}
                        disabled={loadingOS}
                      >
                        <option value="">
                          {loadingOS ? "Cargando..." : "Seleccionar O.S."}
                        </option>
                        {obrasSociales.map((os) => (
                          <option key={os.obraSocialId} value={os.obraSocialId}>
                            {os.nombre}
                          </option>
                        ))}
                      </select>
                      {entry.insurance && (
                        <div className="practice-hint" title={entry.insurance}>
                          OCR: {entry.insurance}
                        </div>
                      )}
                    </td>
                    <td>
                      <input
                        className="table-input"
                        value={entry.carnet || ""}
                        onChange={(e) => updateEntry(entry.id, "carnet", e.target.value)}
                        placeholder="N° afiliado"
                      />
                    </td>
                    <td>{entry.age || "—"}</td>
                    <td>
                      <select
                        className="table-select"
                        value={entry.doctorId}
                        onChange={(e) => updateEntry(entry.id, "doctorId", e.target.value)}
                        disabled={loadingDoctors}
                      >
                        <option value="">
                          {loadingDoctors ? "Cargando..." : "Seleccionar doctor"}
                        </option>
                        {doctors.map((doc) => (
                          <option key={doc.doctorId} value={doc.doctorId}>
                            {doc.name}
                          </option>
                        ))}
                      </select>
                      {entry.surgeon && !entry.doctorId && (
                        <div className="practice-hint" title={entry.surgeon}>
                          OCR: {entry.surgeon}
                        </div>
                      )}
                    </td>
                    <td>
                      <select
                        className="table-select"
                        value={entry.studyId}
                        onChange={(e) => updateEntry(entry.id, "studyId", e.target.value)}
                        disabled={loadingStudies}
                      >
                        <option value="">
                          {loadingStudies ? "Cargando..." : "Seleccionar estudio"}
                        </option>
                        {studies.map((study) => (
                          <option key={study.studyId} value={study.studyId}>
                            {study.name}
                          </option>
                        ))}
                      </select>
                      {entry.practice && (
                        <div className="practice-hint" title={entry.practice}>
                          OCR: {entry.practice.slice(0, 40)}...
                        </div>
                      )}
                    </td>
                    <td className="price-cell">
                      {entry.precio !== null ? (
                        <span className="price-value">
                          ${entry.precio.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      ) : entry.studyId && entry.obraSocialId ? (
                        <span className="price-missing" title="No hay tarifa configurada para esta combinación">
                          ⚠️ Sin tarifa
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>{entry.date || "—"}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          onClick={() => setShowRawText(showRawText === entry.id ? null : entry.id)}
                          className="btn btn-small btn-secondary"
                          title="Ver descripción operación"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => removeEntry(entry.id)}
                          className="btn btn-small btn-danger"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Fila de total */}
              <tfoot>
                <tr className="total-row">
                  <td colSpan={6} style={{ textAlign: "right", fontWeight: 700 }}>
                    TOTAL
                  </td>
                  <td className="price-cell">
                    <strong className="price-value total-price">
                      ${entries
                        .reduce((sum, e) => sum + (e.precio || 0), 0)
                        .toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Descripción de la operación */}
          {showRawText && (
            <div className="raw-text-panel">
              <h3>Descripción de la operación</h3>
              <pre className="raw-text-content">
                {entries.find((e) => e.id === showRawText)?.operationDescription || "No se encontró descripción de la operación"}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
