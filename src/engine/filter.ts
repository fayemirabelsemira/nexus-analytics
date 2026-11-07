import type { Dataset, Value } from './types.ts';

export type Filter =
  | { id: string; kind: 'search'; text: string }
  | { id: string; kind: 'range'; column: number; min?: number; max?: number }
  | { id: string; kind: 'dates'; column: number; from?: string; to?: string }
  | { id: string; kind: 'text'; column: number; contains: string }
  | { id: string; kind: 'in'; column: number; values: string[] };

export interface Sort {
  column: number;
  dir: 'asc' | 'desc';
}

export function describeFilter(ds: Dataset, f: Filter): string {
  if (f.kind === 'search') return `Any column contains "${f.text}"`;
  const name = ds.columns[f.column]?.name ?? '?';
  if (f.kind === 'range') return `${name}: ${f.min ?? '…'} to ${f.max ?? '…'}`;
  if (f.kind === 'dates') return `${name}: ${f.from ?? '…'} to ${f.to ?? '…'}`;
  if (f.kind === 'text') return `${name} contains "${f.contains}"`;
  return `${name} is ${f.values.length > 2 ? `${f.values.length} selected values` : f.values.join(' or ')}`;
}

function matcher(f: Filter): (row: Value[]) => boolean {
  switch (f.kind) {
    case 'search': {
      const q = f.text.toLowerCase();
      return (row) => row.some((v) => v !== null && String(v).toLowerCase().includes(q));
    }
    case 'range':
      return (row) => {
        const v = row[f.column];
        return typeof v === 'number' && (f.min === undefined || v >= f.min) && (f.max === undefined || v <= f.max);
      };
    case 'dates':
      return (row) => {
        const v = row[f.column];
        return typeof v === 'string' && (!f.from || v >= f.from) && (!f.to || v <= f.to);
      };
    case 'text': {
      const q = f.contains.toLowerCase();
      return (row) => {
        const v = row[f.column];
        return v !== null && String(v).toLowerCase().includes(q);
      };
    }
    case 'in': {
      const set = new Set(f.values);
      return (row) => {
        const v = row[f.column];
        return set.has(v === null ? '(missing)' : String(v));
      };
    }
  }
}

/** Indexes of rows that satisfy ALL filters. */
export function applyFilters(ds: Dataset, filters: Filter[]): number[] {
  const tests = filters.map(matcher);
  const out: number[] = [];
  ds.rows.forEach((r, i) => {
    if (tests.every((t) => t(r))) out.push(i);
  });
  return out;
}

/** Sorts row indexes; missing values always go last. */
export function sortIndexes(ds: Dataset, indexes: number[], sort: Sort | null): number[] {
  if (!sort) return indexes;
  const { column, dir } = sort;
  const sign = dir === 'asc' ? 1 : -1;
  return [...indexes].sort((a, b) => {
    const x = ds.rows[a][column];
    const y = ds.rows[b][column];
    if (x === null && y === null) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * sign;
    return String(x).localeCompare(String(y), undefined, { numeric: true }) * sign;
  });
}

export const subset = (ds: Dataset, indexes: number[]): Dataset => ({ ...ds, rows: indexes.map((i) => ds.rows[i]) });
