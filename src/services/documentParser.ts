import Tesseract from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";

// Configurar worker de pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

// Campos que extraemos del parte quirúrgico
export type ParsedDocument = {
  patientName: string;
  insurance: string;
  age: string;
  surgeon: string;
  practice: string;
  date: string;
  operationDescription: string;
  rawText: string;
};

// ─────────────────────────────────────────────────────────────
// Extraer texto de PDF
// ─────────────────────────────────────────────────────────────

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: unknown) => (item as { str: string }).str)
      .join(" ");
    fullText += pageText + "\n";
  }

  return fullText;
}

// ─────────────────────────────────────────────────────────────
// Extraer texto de imagen con OCR
// ─────────────────────────────────────────────────────────────

export async function extractTextFromImage(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const result = await Tesseract.recognize(file, "spa", {
    logger: (info) => {
      if (info.status === "recognizing text" && onProgress) {
        onProgress(Math.round(info.progress * 100));
      }
    },
  });

  return result.data.text;
}

// ─────────────────────────────────────────────────────────────
// Parsear texto del parte quirúrgico
// ─────────────────────────────────────────────────────────────

function extractField(text: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return "";
}

export function parseDocument(text: string): ParsedDocument {
  // Normalizar texto: quitar saltos de línea excesivos
  const normalized = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n");

  const patientName = extractField(normalized, [
    /Apellido\s*y\s*Nombre\/?s?\s*[:\s]+([A-ZÁÉÍÓÚÑa-záéíóúñ\s,.]+?)(?:\n|[O0]\s*\.?\s*[Ss]ocial|Edad|$)/i,
    /Nombre\/?s?\s*[:\s]+([A-ZÁÉÍÓÚÑa-záéíóúñ\s,.]+?)(?:\n|[O0]\s*\.?\s*[Ss]ocial|$)/i,
  ]);

  const insurance = extractField(normalized, [
    // "O. Social", "O Social", "0. Social", "0 Social", "O.Social"
    // Delimitadores: Edad, Carnet/Camet/Caret (OCR puede fallar), números largos, saltos
    /[O0]\s*\.?\s*[Ss]ocial\s*[:\s]+([A-ZÁÉÍÓÚÑa-záéíóúñ\s,.\-/]+?)(?:\n|Edad|C[ao]r?[nm]et|Fecha|\d{5,}|$)/i,
    /[Oo]bra\s*[Ss]ocial\s*[:\s]+([A-ZÁÉÍÓÚÑa-záéíóúñ\s,.\-/]+?)(?:\n|Edad|C[ao]r?[nm]et|Fecha|\d{5,}|$)/i,
    // Fallback más amplio
    /[O0]\s*\.?\s*[Ss]oc\w*\s*[:\s]+(.+?)(?:\n|Edad|C[ao]r?[nm]et|Fecha|\d{5,}|$)/i,
  ]);

  const age = extractField(normalized, [
    /Edad\s*[:\s]+(\d{1,3})/i,
    /Edad\s+(\d{1,3})/i,
  ]);

  const surgeon = extractField(normalized, [
    /[Cc]irujano\s*[:\s]+([A-ZÁÉÍÓÚÑa-záéíóúñ\s,.]+?)(?:\n|1\s*[°º]|Anestes|Ayudante|$)/i,
    /[Cc]irujano\s+([A-ZÁÉÍÓÚÑa-záéíóúñ\s,.]+?)(?:\n|1|Anestes|$)/i,
  ]);

  const practice = extractField(normalized, [
    /PRACTICA\s*[:\s]+(.+?)(?:\n\n|\n(?=[A-Z]{3,})|$)/i,
    /Pr[aá]ctica\s*[:\s]+(.+?)(?:\n\n|\n(?=[A-Z]{3,})|$)/i,
  ]);

  const date = extractField(normalized, [
    /Fecha\s*[:\s]*(\d{1,2}\s*\/\s*\d{1,2}\s*\/\s*\d{2,4})/i,
    /Fecha\s*[:\s]*(\d{4}-\d{2}-\d{2})/i,
    /(\d{1,2}\/\d{1,2}\/\d{4})/,
  ]);

  // Extraer sección "DESCRIPCION DE LA OPERACION" hasta el final o hasta la firma
  let operationDescription = "";
  const descMatch = normalized.match(
    /DESCRIPCI[OÓ]N\s+DE\s+LA\s+OPERACI[OÓ]N\s*\n([\s\S]+?)(?:M\.?\s*N\.?\s*[:\s]*\d|ALVARRACIN|firma|$)/i
  );
  if (descMatch && descMatch[1]) {
    operationDescription = descMatch[1].trim();
  }

  return {
    patientName,
    insurance,
    age,
    surgeon,
    practice,
    date,
    operationDescription,
    rawText: normalized,
  };
}

// ─────────────────────────────────────────────────────────────
// Procesar archivo completo
// ─────────────────────────────────────────────────────────────

export async function processDocument(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<ParsedDocument> {
  let text: string;

  const isPDF = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isImage = file.type.startsWith("image/");

  if (isPDF) {
    onProgress?.(10);
    text = await extractTextFromPDF(file);
    onProgress?.(100);
  } else if (isImage) {
    text = await extractTextFromImage(file, onProgress);
  } else {
    throw new Error(`Tipo de archivo no soportado: ${file.type}. Usá PDF o imagen (JPG, PNG).`);
  }

  return parseDocument(text);
}
