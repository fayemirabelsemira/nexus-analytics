import type { Cell } from './types.ts';

export type DateOrder = 'mdy' | 'dmy';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function validYMD(y: number, m: number, d: number): string | null {
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1) return null;
  if (d > new Date(Date.UTC(y, m, 0)).getUTCDate()) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const fullYear = (y: number) => (y >= 100 ? y : y < 70 ? 2000 + y : 1900 + y);

/** Returns YYYY-MM-DD or null. Accepts Excel serials, Date objects, ISO, 1/5/2024, "Jan 5, 2024"... */
export function parseDate(value: Cell, order: DateOrder = 'mdy'): string | null {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : validYMD(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }
  if (typeof value === 'number') {
    if (value < 20000 || value > 80000) return null; // Excel serial range (~1954-2119)
    return new Date(Date.UTC(1899, 11, 30) + Math.floor(value) * 86400000).toISOString().slice(0, 10);
  }
  const s = value.trim();
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s].*)?$/))) return validYMD(+m[1], +m[2], +m[3]);
  if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})(?:[T\s].*)?$/))) {
    const y = fullYear(+m[3]);
    return order === 'dmy' ? validYMD(y, +m[2], +m[1]) : validYMD(y, +m[1], +m[2]);
  }
  if ((m = s.match(/^([A-Za-z]{3,9})\.?[\s-]+(\d{1,2})(?:st|nd|rd|th)?,?[\s-]+(\d{4})$/))) {
    const mi = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase());
    return mi >= 0 ? validYMD(+m[3], mi + 1, +m[2]) : null;
  }
  if ((m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?[\s-]+([A-Za-z]{3,9})\.?,?[\s-]+(\d{4})$/))) {
    const mi = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase());
    return mi >= 0 ? validYMD(+m[3], mi + 1, +m[1]) : null;
  }
  return null;
}

/** If any slash-date has a first part > 12 it must be day-first; otherwise assume month-first. */
export function guessDateOrder(values: Cell[]): DateOrder {
  for (const v of values) {
    if (typeof v !== 'string') continue;
    const m = v.trim().match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})/);
    if (!m) continue;
    if (+m[1] > 12) return 'dmy';
    if (+m[2] > 12) return 'mdy';
  }
  return 'mdy';
}

const MAX_NUMBER = 1e15;

/** Parses "₱1,234.50", "(500)", "-12", "1.234,50", "PHP 99", 42 -> number (not rounded), else null. */
export function parseNumber(value: Cell): number | null {
  if (value === null || value === undefined || typeof value === 'boolean' || value instanceof Date) return null;
  let n: number;
  if (typeof value === 'number') {
    n = value;
  } else {
    let s = value.trim();
    if (s === '') return null;
    let negative = false;
    if (/^\(.*\)$/.test(s)) {
      negative = true;
      s = s.slice(1, -1);
    }
    s = s.replace(/[₱$€£¥\s]|php|usd|eur|gbp|jpy/gi, '');
    if (s.endsWith('-')) {
      negative = true;
      s = s.slice(0, -1);
    }
    if (s.startsWith('-')) {
      negative = !negative;
      s = s.slice(1);
    } else if (s.startsWith('+')) s = s.slice(1);

    const hasComma = s.includes(',');
    const hasDot = s.includes('.');
    if (hasComma && hasDot) {
      s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    } else if (hasComma) {
      s = /^\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : /^\d+,\d{1,2}$/.test(s) ? s.replace(',', '.') : s;
    }
    if (!/^(\d+\.?\d*|\.\d+)$/.test(s)) return null;
    n = parseFloat(s);
    if (negative) n = -n;
  }
  return Number.isFinite(n) && Math.abs(n) <= MAX_NUMBER ? n : null;
}

/** Like parseNumber but rounded to cents and limited to 999,999,999,999.99 (money columns). */
export function parseAmount(value: Cell): number | null {
  const n = parseNumber(value);
  if (n === null || Math.abs(n) > 999_999_999_999.99) return null;
  return Math.round(n * 100) / 100;
}

/** True when the first row looks like labels rather than data (no cell is a date or number). */
export function looksLikeHeader(row: Cell[] | undefined): boolean {
  if (!row) return false;
  const filled = row.filter((c) => c !== null && c !== undefined && String(c).trim() !== '');
  if (filled.length === 0) return false;
  return filled.every((c) => parseNumber(c) === null && parseDate(c, 'mdy') === null);
}
