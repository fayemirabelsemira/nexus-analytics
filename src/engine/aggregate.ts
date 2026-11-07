import type { Dataset } from './types.ts';

export type Agg = 'sum' | 'avg' | 'count' | 'min' | 'max';
export interface Point { label: string; value: number; count: number }

function reduce(vals: number[], count: number, agg: Agg): number {
  if (agg === 'count') return count;
  if (vals.length === 0) return 0;
  if (agg === 'sum') return vals.reduce((a, b) => a + b, 0);
  if (agg === 'avg') return vals.reduce((a, b) => a + b, 0) / vals.length;
  return agg === 'min' ? Math.min(...vals) : Math.max(...vals);
}
const round = (n: number) => Math.round(n * 100) / 100;

interface Bucket { vals: number[]; count: number }
function addTo(map: Map<string, Bucket>, key: string, v: number | string | null | undefined) {
  const b = map.get(key) ?? { vals: [], count: 0 };
  b.count++;
  if (typeof v === 'number') b.vals.push(v);
  map.set(key, b);
}

/** Group by a column and aggregate a number column (valueCol = null -> count rows). */
export function groupAggregate(ds: Dataset, groupCol: number, valueCol: number | null, agg: Agg, limit = 10): Point[] {
  const map = new Map<string, Bucket>();
  for (const r of ds.rows) addTo(map, r[groupCol] === null ? '(missing)' : String(r[groupCol]), valueCol === null ? null : r[valueCol]);
  return [...map.entries()]
    .map(([label, b]) => ({ label, value: round(reduce(b.vals, b.count, valueCol === null ? 'count' : agg)), count: b.count }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export type Bucketing = 'day' | 'month' | 'year';

/** Aggregate over time. Rows whose date is missing/invalid are skipped. */
export function timeSeries(ds: Dataset, dateCol: number, valueCol: number | null, agg: Agg, bucket: Bucketing): Point[] {
  const len = bucket === 'day' ? 10 : bucket === 'month' ? 7 : 4;
  const map = new Map<string, Bucket>();
  for (const r of ds.rows) {
    const d = r[dateCol];
    if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
    addTo(map, d.slice(0, len), valueCol === null ? null : r[valueCol]);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, b]) => ({ label, value: round(reduce(b.vals, b.count, valueCol === null ? 'count' : agg)), count: b.count }));
}

const fmt = (n: number) => String(Math.round(n * 100) / 100);

export function histogram(ds: Dataset, col: number, bins = 10): Point[] {
  const nums = ds.rows.map((r) => r[col]).filter((v): v is number => typeof v === 'number');
  if (nums.length === 0) return [];
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  if (min === max) return [{ label: fmt(min), value: nums.length, count: nums.length }];
  const width = (max - min) / bins;
  const counts = new Array<number>(bins).fill(0);
  for (const n of nums) counts[Math.min(bins - 1, Math.floor((n - min) / width))]++;
  return counts.map((c, i) => ({ label: `${fmt(min + i * width)}–${fmt(min + (i + 1) * width)}`, value: c, count: c }));
}

export function scatterPoints(ds: Dataset, xCol: number, yCol: number, limit = 1000): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (const r of ds.rows) if (typeof r[xCol] === 'number' && typeof r[yCol] === 'number') pts.push({ x: r[xCol] as number, y: r[yCol] as number });
  if (pts.length <= limit) return pts;
  const step = pts.length / limit;
  return Array.from({ length: limit }, (_, i) => pts[Math.floor(i * step)]);
}
