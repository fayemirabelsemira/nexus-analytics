import type { Dataset, Value } from './types.ts';
import { parseNumber } from './parse.ts';
import { numbersOf, numericStats } from './profile.ts';

export interface CleanResult {
  dataset: Dataset;
  message: string;
}

const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`;
const colName = (ds: Dataset, i: number) => ds.columns[i]?.name ?? `column ${i + 1}`;

export function removeDuplicates(ds: Dataset): CleanResult {
  const seen = new Set<string>();
  const rows = ds.rows.filter((r) => {
    const k = JSON.stringify(r);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const removed = ds.rows.length - rows.length;
  return { dataset: { ...ds, rows }, message: `Removed ${plural(removed, 'duplicate row')}` };
}

/** col = null checks every column (a row is removed if ANY cell is missing). */
export function removeRowsWithMissing(ds: Dataset, col: number | null): CleanResult {
  const rows = ds.rows.filter((r) => (col === null ? r.every((v) => v !== null) : r[col] !== null));
  const removed = ds.rows.length - rows.length;
  if (rows.length === 0) throw new Error('This would remove every row. Choose a different column or fill the missing values instead.');
  return { dataset: { ...ds, rows }, message: `Removed ${plural(removed, 'row')} with missing ${col === null ? 'values' : `"${colName(ds, col)}"`}` };
}

export type FillStrategy = 'mean' | 'median' | 'mode' | 'zero' | 'custom';

export function fillMissing(ds: Dataset, col: number, strategy: FillStrategy, custom = ''): CleanResult {
  const column = ds.columns[col];
  if (!column) throw new Error('Choose a column.');
  let fill: Value;

  if (strategy === 'mean' || strategy === 'median') {
    if (column.type !== 'number') throw new Error(`"${column.name}" is not a number column.`);
    const stats = numericStats(numbersOf(ds, col));
    if (!stats) throw new Error(`"${column.name}" has no numbers to calculate from.`);
    fill = strategy === 'mean' ? Math.round(stats.mean * 10000) / 10000 : stats.median;
  } else if (strategy === 'zero') {
    if (column.type !== 'number') throw new Error(`"${column.name}" is not a number column.`);
    fill = 0;
  } else if (strategy === 'mode') {
    const counts = new Map<Value, number>();
    for (const r of ds.rows) if (r[col] !== null) counts.set(r[col], (counts.get(r[col]) ?? 0) + 1);
    const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (!best) throw new Error(`"${column.name}" has no values to pick the most common one from.`);
    fill = best[0];
  } else {
    const text = custom.trim();
    if (!text) throw new Error('Enter the value to fill with.');
    if (column.type === 'number') {
      const n = parseNumber(text);
      if (n === null) throw new Error(`"${text}" is not a valid number.`);
      fill = n;
    } else fill = text;
  }

  let filled = 0;
  const rows = ds.rows.map((r) => {
    if (r[col] !== null) return r;
    filled++;
    const copy = r.slice();
    copy[col] = fill;
    return copy;
  });
  return { dataset: { ...ds, rows }, message: `Filled ${plural(filled, 'missing value')} in "${column.name}" with ${strategy === 'custom' ? `"${fill}"` : strategy === 'zero' ? '0' : `the ${strategy} (${fill})`}` };
}

export function renameColumn(ds: Dataset, col: number, newName: string): CleanResult {
  const name = newName.trim().slice(0, 100);
  if (!name) throw new Error('The column name cannot be empty.');
  if (ds.columns.some((c, i) => i !== col && c.name.toLowerCase() === name.toLowerCase())) throw new Error(`A column named "${name}" already exists.`);
  const old = colName(ds, col);
  const columns = ds.columns.map((c, i) => (i === col ? { ...c, name } : c));
  return { dataset: { ...ds, columns }, message: `Renamed "${old}" to "${name}"` };
}

export function deleteColumn(ds: Dataset, col: number): CleanResult {
  if (ds.columns.length <= 1) throw new Error('A dataset needs at least one column.');
  const old = colName(ds, col);
  return {
    dataset: { ...ds, columns: ds.columns.filter((_, i) => i !== col), rows: ds.rows.map((r) => r.filter((_, i) => i !== col)) },
    message: `Deleted column "${old}"`,
  };
}

export type CaseMode = 'upper' | 'lower' | 'title';

export function changeCase(ds: Dataset, col: number, mode: CaseMode): CleanResult {
  const column = ds.columns[col];
  if (!column || (column.type !== 'text' && column.type !== 'category')) throw new Error('Choose a text or category column.');
  const conv = (s: string) =>
    mode === 'upper' ? s.toUpperCase() : mode === 'lower' ? s.toLowerCase() : s.toLowerCase().replace(/(^|[\s\-/])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase());
  const rows = ds.rows.map((r) => {
    const v = r[col];
    if (typeof v !== 'string') return r;
    const copy = r.slice();
    copy[col] = conv(v);
    return copy;
  });
  return { dataset: { ...ds, rows }, message: `Changed "${column.name}" to ${mode} case` };
}
