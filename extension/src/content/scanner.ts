/**
 * Safe Medical Identifier Scanner for Content Scripts
 * Recognizes patient MRN / sample barcode formats without storing or sending arbitrary webpage text.
 */

// Patterns matching MediFlow LIS identifiers:
// e.g. SMP-2026-0001, ORD-2026-0001, PID-2026-0001, or standard 8-12 alphanumeric barcode
const PATIENT_CODE_REGEX = /\b(PID-[0-9]{4}-[0-9]{4,6}|PT-[0-9]{5,8})\b/i;
const SAMPLE_BARCODE_REGEX = /\b(SMP-[0-9]{4}-[0-9]{4,6}|BC-[0-9]{6,10})\b/i;
const ORDER_NUMBER_REGEX = /\b(ORD-[0-9]{4}-[0-9]{4,6})\b/i;

export interface DetectedContext {
  type: 'patient' | 'sample' | 'order' | 'generic';
  value: string;
}

export function detectMedicalIdentifiers(text: string): DetectedContext | null {
  if (!text || text.length > 500) return null; // Avoid processing large chunks of page text

  const ptMatch = text.match(PATIENT_CODE_REGEX);
  if (ptMatch) {
    return { type: 'patient', value: ptMatch[0] };
  }

  const smpMatch = text.match(SAMPLE_BARCODE_REGEX);
  if (smpMatch) {
    return { type: 'sample', value: smpMatch[0] };
  }

  const ordMatch = text.match(ORDER_NUMBER_REGEX);
  if (ordMatch) {
    return { type: 'order', value: ordMatch[0] };
  }

  return null;
}
