import type { Cell, Sheet } from '../engine/types.ts';
import { parseCSV } from './csv.ts';
import { MAX_ROWS } from '../engine/build.ts';

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export interface ParsedSheet {
  name: string;
  rows: Cell[][];
}

/** Read a .csv/.tsv/.txt/.xlsx/.xls file into one or more sheets of raw cells. */
export async function readSpreadsheet(file: File): Promise<ParsedSheet[]> {
  if (file.size > MAX_FILE_BYTES) throw new Error('File is too large (max 25 MB).');
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  let sheets: ParsedSheet[];
  if (['csv', 'tsv', 'txt'].includes(ext)) {
    sheets = [{ name: 'Sheet 1', rows: parseCSV(await file.text()) }];
  } else if (['xlsx', 'xls', 'xlsm'].includes(ext)) {
    const XLSX = await import('xlsx');
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    sheets = wb.SheetNames.map((name) => ({
      name,
      // raw: true keeps numbers (and Excel date serials) as numbers; defval fills empty cells with null
      rows: (XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: null, blankrows: false }) as Cell[][]),
    })).filter((s) => s.rows.length > 0);
  } else {
    throw new Error('Unsupported file type. Please upload a .csv, .xlsx or .xls file.');
  }

  if (sheets.length === 0) throw new Error('The file is empty.');
  for (const s of sheets) {
    if (s.rows.length > MAX_ROWS + 1) throw new Error(`Sheet "${s.name}" has more than ${MAX_ROWS.toLocaleString()} rows. Split the file and import it in parts.`);
  }
  return sheets;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(text: string, filename: string) {
  downloadBlob(new Blob([text], { type: 'text/csv;charset=utf-8' }), filename);
}

/** Build an .xlsx workbook (one tab per sheet). */
export async function buildXlsxBlob(sheets: Sheet[]): Promise<Blob> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(s.rows);
    ws['!cols'] = (s.rows[0] ?? []).map((_, col) => ({
      wch: Math.min(50, Math.max(10, ...s.rows.slice(0, 200).map((r) => String(r[col] ?? '').length + 2))),
    }));
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  }
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return new Blob([out], { type: XLSX_MIME });
}

export async function downloadXlsx(sheets: Sheet[], filename: string) {
  downloadBlob(await buildXlsxBlob(sheets), filename);
}

export const todayStamp = () => new Date().toISOString().slice(0, 10);
