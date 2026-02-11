import { useState, useRef, useEffect, useCallback } from "react";
import XLSX from "xlsx-js-style";
import { processDocument, type ParsedDocument } from "../services/documentParser";
import { useStudies, useObrasSociales, useTarifas } from "../hooks";
import "./BillingPage.css";

type DocumentEntry = ParsedDocument & {
  id: string;
  fileName: string;
  studyId: string;         // Estudio seleccionado del ABM
  obraSocialId: string;    // Obra social seleccionada del ABM
  precio: number | null;   // Precio auto-calculado
};

export function BillingPage() {
  const { studies, loading: loadingStudies, fetchStudies } = useStudies();
  const { obrasSociales, loading: loadingOS, fetchObrasSociales } = useObrasSociales();
  const { fetchTarifas, getPrecio } = useTarifas();
  const [entries, setEntries] = useState<DocumentEntry[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [showRawText, setShowRawText] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStudies();
    fetchObrasSociales();
    fetchTarifas();
  }, [fetchStudies, fetchObrasSociales, fetchTarifas]);

  // Intentar auto-matchear el estudio extraído con los del ABM
  function autoMatchStudy(practiceText: string): string {
    if (!practiceText || studies.length === 0) return "";

    const normalized = practiceText.toUpperCase();
    const match = studies.find((s) =>
      normalized.includes(s.name.toUpperCase()) || s.name.toUpperCase().includes(normalized.slice(0, 20))
    );
    return match?.studyId || "";
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

        const matchedStudyId = autoMatchStudy(parsed.practice);
        const matchedObraSocialId = autoMatchObraSocial(parsed.insurance);

        const entry: DocumentEntry = {
          ...parsed,
          id: crypto.randomUUID(),
          fileName: file.name,
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

  // Exportar a Excel
  function exportToExcel() {
    if (entries.length === 0) return;

    const headers = ["Paciente", "Obra Social", "Edad", "Cirujano", "Estudio", "Precio", "Fecha", "Archivo"];

    const worksheet: XLSX.WorkSheet = {};

    const border = {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } },
    };

    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "2563EB" } },
      alignment: { horizontal: "center", vertical: "center" },
      border,
    };

    headers.forEach((header, colIndex) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: colIndex });
      worksheet[cellRef] = { v: header, t: "s", s: headerStyle };
    });

    entries.forEach((entry, rowIndex) => {
      const rowData: (string | number)[] = [
        entry.patientName || "",
        getNombreObraSocial(entry.obraSocialId) || entry.insurance || "",
        entry.age || "",
        entry.surgeon || "",
        getNombreEstudio(entry.studyId) || entry.practice || "(sin asignar)",
        entry.precio ?? 0,
        entry.date || "",
        entry.fileName || "",
      ];

      rowData.forEach((cell, colIndex) => {
        const cellRef = XLSX.utils.encode_cell({ r: rowIndex + 1, c: colIndex });
        const esPrecio = colIndex === 5;
        worksheet[cellRef] = {
          v: cell,
          t: esPrecio ? "n" : "s",
          s: {
            border,
            alignment: { vertical: "center", horizontal: esPrecio ? "right" : "left" },
            numFmt: esPrecio ? "#,##0.00" : undefined,
            font: esPrecio && cell === 0 ? { color: { rgb: "999999" } } : undefined,
          },
        };
      });
    });

    // Fila de total
    const totalRow = entries.length + 1;
    const totalLabelRef = XLSX.utils.encode_cell({ r: totalRow, c: 4 });
    worksheet[totalLabelRef] = {
      v: "TOTAL",
      t: "s",
      s: { border, font: { bold: true }, alignment: { horizontal: "right", vertical: "center" } },
    };

    const totalValueRef = XLSX.utils.encode_cell({ r: totalRow, c: 5 });
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
    [0, 1, 2, 3, 6, 7].forEach((c) => {
      const ref = XLSX.utils.encode_cell({ r: totalRow, c });
      worksheet[ref] = { v: "", t: "s", s: { border } };
    });

    worksheet["!ref"] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: totalRow, c: headers.length - 1 },
    });

    worksheet["!cols"] = [
      { wch: 30 },  // Paciente
      { wch: 22 },  // Obra Social
      { wch: 8 },   // Edad
      { wch: 35 },  // Cirujano
      { wch: 25 },  // Estudio
      { wch: 14 },  // Precio
      { wch: 14 },  // Fecha
      { wch: 25 },  // Archivo
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
                    <td>{entry.age || "—"}</td>
                    <td>{entry.surgeon || "—"}</td>
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
                  <td colSpan={5} style={{ textAlign: "right", fontWeight: 700 }}>
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
