import type { Dataset, DatasetProfile, Insight, Kpi } from './types.ts';
import { numbersOf } from './profile.ts';
import { timeSeries } from './aggregate.ts';

export function pearson(x: number[], y: number[]): number | null {
  const n = x.length;
  if (n < 3) return null;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
    syy += (y[i] - my) ** 2;
  }
  return sxx === 0 || syy === 0 ? null : sxy / Math.sqrt(sxx * syy);
}

export interface Correlation { a: string; b: string; r: number; n: number }

/** Pearson correlations between number columns (first 12 columns, rows where both are present). */
export function correlations(ds: Dataset, maxColumns = 12): Correlation[] {
  const nums = ds.columns.map((c, i) => ({ c, i })).filter((x) => x.c.type === 'number').slice(0, maxColumns);
  const out: Correlation[] = [];
  for (let a = 0; a < nums.length; a++) {
    for (let b = a + 1; b < nums.length; b++) {
      const xs: number[] = [];
      const ys: number[] = [];
      for (const r of ds.rows) {
        const x = r[nums[a].i];
        const y = r[nums[b].i];
        if (typeof x === 'number' && typeof y === 'number') { xs.push(x); ys.push(y); }
      }
      const r = pearson(xs, ys);
      if (r !== null) out.push({ a: nums[a].c.name, b: nums[b].c.name, r: Math.round(r * 1000) / 1000, n: xs.length });
    }
  }
  return out.sort((p, q) => Math.abs(q.r) - Math.abs(p.r));
}

export function buildKpis(p: DatasetProfile): Kpi[] {
  const kpis: Kpi[] = [
    { label: 'Rows', value: p.rowCount, format: 'int' },
    { label: 'Columns', value: p.columnCount, format: 'int' },
    { label: 'Data completeness', value: p.completeness, format: 'percent', hint: `${p.missingCells.toLocaleString()} missing cells` },
    { label: 'Duplicate rows', value: p.duplicateRows, format: 'int' },
  ];
  for (const c of p.columns.filter((c) => c.stats).slice(0, 2)) {
    kpis.push({ label: `Total ${c.name}`, value: c.stats!.sum, format: 'decimal' });
    kpis.push({ label: `Average ${c.name}`, value: c.stats!.mean, format: 'decimal' });
  }
  return kpis;
}

const pct = (n: number) => `${Math.round(n * 10) / 10}%`;
const num = (n: number) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);

export function generateInsights(ds: Dataset, p: DatasetProfile): Insight[] {
  const out: Insight[] = [];

  if (p.completeness >= 99) out.push({ severity: 'good', title: 'Data is nearly complete', detail: `${pct(p.completeness)} of cells have a value.` });
  else out.push({ severity: p.completeness < 90 ? 'warning' : 'info', title: `${pct(100 - p.completeness)} of cells are missing`, detail: 'Fill or remove missing values on the Cleaning page before relying on totals and averages.' });

  const gappy = p.columns.filter((c) => p.rowCount > 0 && c.missing / p.rowCount > 0.2);
  if (gappy.length) out.push({ severity: 'warning', title: 'Columns with many gaps', detail: gappy.slice(0, 3).map((c) => `${c.name} (${pct((c.missing / p.rowCount) * 100)} missing)`).join(', ') });

  if (p.duplicateRows > 0) out.push({ severity: 'warning', title: `${p.duplicateRows.toLocaleString()} duplicate rows`, detail: 'Identical rows can inflate counts and totals. Review them before removing: repeated sales on the same day can be legitimate.' });

  for (const c of p.columns.filter((c) => c.invalid > 0).slice(0, 3)) {
    out.push({ severity: 'warning', title: `Unexpected values in "${c.name}"`, detail: `${c.invalid.toLocaleString()} values do not look like ${c.type === 'number' ? 'numbers' : 'dates'} and are ignored in calculations.` });
  }

  ds.columns.forEach((c, i) => {
    const s = p.columns[i].stats;
    if (c.type !== 'number' || !s || s.count < 8) return;
    const iqr = s.q3 - s.q1;
    if (iqr === 0) return;
    const lo = s.q1 - 1.5 * iqr;
    const hi = s.q3 + 1.5 * iqr;
    const n = numbersOf(ds, i).filter((v) => v < lo || v > hi).length;
    if (n > 0 && n / s.count <= 0.2) out.push({ severity: 'info', title: `${n.toLocaleString()} unusual values in "${c.name}"`, detail: `Outside ${num(lo)} to ${num(hi)} (1.5 × IQR rule). Check whether they are errors or real peaks.` });
  });

  for (const c of p.columns.filter((c) => c.type === 'category' && c.top.length > 1)) {
    const total = p.rowCount - c.missing;
    const share = total ? (c.top[0].count / total) * 100 : 0;
    if (share >= 50) out.push({ severity: 'info', title: `"${c.top[0].value}" dominates ${c.name}`, detail: `${pct(share)} of rows belong to this value.` });
  }

  const top = correlations(ds)[0];
  if (top && Math.abs(top.r) >= 0.6) out.push({ severity: 'info', title: `${top.a} and ${top.b} are ${top.r > 0 ? 'positively' : 'negatively'} correlated`, detail: `Correlation ${top.r} across ${top.n.toLocaleString()} rows. Correlation does not prove one causes the other.` });

  const dateCol = ds.columns.findIndex((c) => c.type === 'date');
  const valCol = ds.columns.findIndex((c) => c.type === 'number');
  if (dateCol >= 0 && valCol >= 0) {
    const series = timeSeries(ds, dateCol, valCol, 'sum', 'month');
    if (series.length >= 4) {
      const recent = series.slice(-2).reduce((a, b) => a + b.value, 0);
      const before = series.slice(-4, -2).reduce((a, b) => a + b.value, 0);
      if (before !== 0) {
        const change = ((recent - before) / Math.abs(before)) * 100;
        out.push({ severity: 'info', title: `${ds.columns[valCol].name} ${change >= 0 ? 'rose' : 'fell'} ${pct(Math.abs(change))} recently`, detail: `Last 2 months (${series[series.length - 2].label} – ${series[series.length - 1].label}) versus the 2 months before.` });
      }
    }
  }

  const order = { warning: 0, info: 1, good: 2 } as const;
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}
