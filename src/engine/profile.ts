import type { ColumnProfile, Dataset, DatasetProfile, NumericStats } from './types.ts';
import { isIsoDate } from './build.ts';

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function numericStats(values: number[]): NumericStats | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / sorted.length;
  const variance = sorted.length > 1 ? sorted.reduce((a, b) => a + (b - mean) ** 2, 0) / (sorted.length - 1) : 0;
  return {
    count: sorted.length,
    sum,
    mean,
    median: quantile(sorted, 0.5),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    std: Math.sqrt(variance),
    q1: quantile(sorted, 0.25),
    q3: quantile(sorted, 0.75),
  };
}

export const numbersOf = (ds: Dataset, col: number): number[] =>
  ds.rows.map((r) => r[col]).filter((v): v is number => typeof v === 'number');

/** Rows that repeat an earlier row exactly. */
export function countDuplicateRows(ds: Dataset): number {
  const seen = new Set<string>();
  let dup = 0;
  for (const r of ds.rows) {
    const k = JSON.stringify(r);
    if (seen.has(k)) dup++;
    else seen.add(k);
  }
  return dup;
}

export function profileDataset(ds: Dataset): DatasetProfile {
  let missingCells = 0;
  const columns: ColumnProfile[] = ds.columns.map((c, i) => {
    const counts = new Map<string, number>();
    let missing = 0;
    let invalid = 0;
    for (const r of ds.rows) {
      const v = r[i];
      if (v === null) {
        missing++;
        continue;
      }
      if (c.type === 'number' && typeof v !== 'number') invalid++;
      if (c.type === 'date' && !isIsoDate(v)) invalid++;
      if (c.type === 'category' || c.type === 'text') counts.set(String(v), (counts.get(String(v)) ?? 0) + 1);
    }
    missingCells += missing;
    const top = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([value, count]) => ({ value, count }));
    return {
      name: c.name,
      type: c.type,
      missing,
      unique: c.type === 'category' || c.type === 'text' ? counts.size : new Set(ds.rows.map((r) => r[i]).filter((v) => v !== null)).size,
      invalid,
      stats: c.type === 'number' ? numericStats(numbersOf(ds, i)) : null,
      top,
    };
  });
  const cells = ds.rows.length * ds.columns.length;
  return {
    rowCount: ds.rows.length,
    columnCount: ds.columns.length,
    missingCells,
    completeness: cells ? Math.round(((cells - missingCells) / cells) * 1000) / 10 : 100,
    duplicateRows: countDuplicateRows(ds),
    columns,
  };
}
