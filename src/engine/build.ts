import type { Cell, Column, ColumnType, Dataset, Value } from './types.ts';
import { guessDateOrder, parseDate, parseNumber, looksLikeHeader } from './parse.ts';
import type { DateOrder } from './parse.ts';

export const MAX_ROWS = 100_000;
export const MAX_COLUMNS = 500;

const MISSING_TOKENS = new Set(['n/a', 'na', 'null', 'none', 'nan', '#n/a', '#null!']);
const ID_HEADER = /(^|[\s_.-])(id|zip|postal|phone|mobile|contact|barcode|sku|code)($|[\s_.-])/i;
const DATE_HEADER = /date|time|day|month|year|period|petsa|created|updated|timestamp/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const isIsoDate = (v: Value): boolean => typeof v === 'string' && ISO_DATE.test(v);

const colLetter = (i: number) => {
  let s = '';
  for (let n = i; n >= 0; n = Math.floor(n / 26) - 1) s = String.fromCharCode(65 + (n % 26)) + s;
  return s;
};

function cellToValue(c: Cell): Value {
  if (c === null || c === undefined) return null;
  if (c instanceof Date) return parseDate(c);
  if (typeof c === 'boolean') return c ? 'TRUE' : 'FALSE';
  if (typeof c === 'number') return Number.isFinite(c) ? c : null;
  const t = c.trim();
  return t === '' || MISSING_TOKENS.has(t.toLowerCase()) ? null : t;
}

function detectType(name: string, values: Value[], order: DateOrder): ColumnType {
  const nn = values.filter((v): v is string | number => v !== null);
  if (nn.length === 0) return 'text';
  const step = Math.ceil(nn.length / 2000);
  const sample = step > 1 ? nn.filter((_, i) => i % step === 0) : nn;

  if (DATE_HEADER.test(name) && sample.every((v) => typeof v === 'number' && parseDate(v) !== null)) return 'date';
  const dates = sample.filter((v) => typeof v === 'string' && parseDate(v, order) !== null).length;
  if (dates / sample.length >= 0.95) return 'date';
  if (!ID_HEADER.test(name) && sample.filter((v) => parseNumber(v) !== null).length / sample.length >= 0.95) return 'number';
  return new Set(nn.map(String)).size <= Math.max(20, nn.length * 0.05) ? 'category' : 'text';
}

export interface BuildOptions {
  name: string;
  fileName: string;
  hasHeader?: boolean;
}

/** Turn raw sheet rows into a typed Dataset (column names, missing values, types). */
export function buildDataset(raw: Cell[][], opts: BuildOptions): Dataset {
  if (raw.length === 0) throw new Error('The file has no rows.');
  const hasHeader = opts.hasHeader ?? looksLikeHeader(raw[0]);
  const width = raw.slice(0, 500).reduce((m, r) => Math.max(m, r.length), 0);
  if (width === 0) throw new Error('The file has no columns.');
  if (width > MAX_COLUMNS) throw new Error(`The file has ${width} columns; the limit is ${MAX_COLUMNS}.`);

  const used = new Set<string>();
  const names = Array.from({ length: width }, (_, i) => {
    let base = hasHeader ? String(raw[0][i] ?? '').trim() : '';
    if (!base) base = `Column ${colLetter(i)}`;
    let name = base;
    for (let n = 2; used.has(name.toLowerCase()); n++) name = `${base} (${n})`;
    used.add(name.toLowerCase());
    return name.slice(0, 100);
  });

  const body = hasHeader ? raw.slice(1) : raw;
  if (body.length > MAX_ROWS) throw new Error(`The file has ${body.length.toLocaleString()} rows; the limit is ${MAX_ROWS.toLocaleString()}.`);

  const rows: Value[][] = [];
  for (const r of body) {
    const row: Value[] = Array.from({ length: width }, (_, i) => cellToValue(r[i]));
    if (row.some((v) => v !== null)) rows.push(row); // drop completely empty rows
  }
  if (rows.length === 0) throw new Error('The file has headers but no data rows.');

  const columns: Column[] = names.map((name, i) => {
    const col = rows.map((r) => r[i]);
    const order = guessDateOrder(col);
    const type = detectType(name, col, order);
    if (type === 'number') for (const r of rows) { const n = parseNumber(r[i]); if (n !== null) r[i] = n; }
    else if (type === 'date') for (const r of rows) { const d = parseDate(r[i], order); if (d !== null) r[i] = d; }
    return { name, type };
  });

  return { name: opts.name, fileName: opts.fileName, columns, rows };
}
