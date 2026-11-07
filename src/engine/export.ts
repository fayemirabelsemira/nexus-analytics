import type { CleanLogEntry, Dataset, DatasetProfile, Insight, Kpi, Sheet } from './types.ts';
import { toCSV } from '../utils/csv.ts';

export const datasetRows = (ds: Dataset): (string | number | null)[][] => [ds.columns.map((c) => c.name), ...ds.rows];
export const datasetToCsv = (ds: Dataset): string => toCSV(datasetRows(ds));

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export interface ReportInput {
  dataset: Dataset;
  profile: DatasetProfile;
  kpis: Kpi[];
  insights: Insight[];
  log: CleanLogEntry[];
  filterNotes: string[];
}

const fmt = (n: number, f: Kpi['format']) =>
  f === 'percent' ? `${Math.round(n * 10) / 10}%` : new Intl.NumberFormat('en', { maximumFractionDigits: f === 'int' ? 0 : 2 }).format(n);

export function buildReportSheets(r: ReportInput): Sheet[] {
  const cols: Sheet['rows'] = [['Column', 'Type', 'Missing', 'Unique', 'Invalid', 'Sum', 'Mean', 'Median', 'Min', 'Max', 'Std dev']];
  for (const c of r.profile.columns) {
    const s = c.stats;
    cols.push([c.name, c.type, c.missing, c.unique, c.invalid, s?.sum ?? null, s?.mean ?? null, s?.median ?? null, s?.min ?? null, s?.max ?? null, s?.std ?? null]);
  }
  return [
    { name: 'Summary', rows: [['Metric', 'Value'], ['Dataset', r.dataset.name], ['Source file', r.dataset.fileName], ...r.kpis.map((k): (string | number)[] => [k.label, k.value]), ...r.filterNotes.map((f): (string | number)[] => ['Filter', f])] },
    { name: 'Columns', rows: cols },
    { name: 'Insights', rows: [['Severity', 'Insight', 'Detail'], ...r.insights.map((i) => [i.severity, i.title, i.detail])] },
    { name: 'Cleaning log', rows: [['When', 'Action'], ...r.log.map((l) => [l.at, l.action])] },
    { name: 'Data', rows: datasetRows(r.dataset) },
  ];
}

/** Self-contained HTML report (no scripts, everything escaped). */
export function buildHtmlReport(r: ReportInput, generatedAt = new Date()): string {
  const e = escapeHtml;
  const kpis = r.kpis.map((k) => `<div class="k"><div class="l">${e(k.label)}</div><div class="v">${e(fmt(k.value, k.format))}</div></div>`).join('');
  const cols = r.profile.columns
    .map((c) => `<tr><td>${e(c.name)}</td><td>${c.type}</td><td>${c.missing}</td><td>${c.unique}</td><td>${c.stats ? e(fmt(c.stats.mean, 'decimal')) : ''}</td><td>${c.stats ? e(fmt(c.stats.min, 'decimal')) : ''}</td><td>${c.stats ? e(fmt(c.stats.max, 'decimal')) : ''}</td></tr>`)
    .join('');
  const insights = r.insights.map((i) => `<li class="${i.severity}"><strong>${e(i.title)}</strong><br>${e(i.detail)}</li>`).join('');
  const log = r.log.length ? r.log.map((l) => `<li>${e(l.action)}</li>`).join('') : '<li>No cleaning applied.</li>';
  const head = `<tr>${r.dataset.columns.map((c) => `<th>${e(c.name)}</th>`).join('')}</tr>`;
  const body = r.dataset.rows.slice(0, 25).map((row) => `<tr>${row.map((v) => `<td>${v === null ? '' : e(String(v))}</td>`).join('')}</tr>`).join('');
  const filters = r.filterNotes.length ? `<p>Filters applied: ${r.filterNotes.map(e).join('; ')}</p>` : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(r.dataset.name)} – Analysis report</title><style>
body{font:15px/1.5 system-ui,sans-serif;max-width:960px;margin:2rem auto;padding:0 1rem;color:#111827}h1{margin-bottom:0}h2{margin-top:2rem;border-bottom:1px solid #e5e7eb;padding-bottom:.25rem}
.sub{color:#6b7280}.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:.75rem}.k{border:1px solid #e5e7eb;border-radius:8px;padding:.75rem}.l{color:#6b7280;font-size:.8rem}.v{font-size:1.4rem;font-weight:700}
table{border-collapse:collapse;width:100%;font-size:.85rem;display:block;overflow-x:auto}th,td{border:1px solid #e5e7eb;padding:.35rem .6rem;text-align:left;white-space:nowrap}th{background:#f9fafb}
li.warning{color:#92400e}li.good{color:#166534}li{margin:.4rem 0}</style></head><body>
<h1>${e(r.dataset.name)}</h1><p class="sub">Analysis report · generated ${e(generatedAt.toISOString().slice(0, 10))} · source ${e(r.dataset.fileName)}</p>${filters}
<h2>Key figures</h2><div class="kpis">${kpis}</div>
<h2>Insights</h2><ul>${insights}</ul>
<h2>Columns</h2><table><tr><th>Column</th><th>Type</th><th>Missing</th><th>Unique</th><th>Mean</th><th>Min</th><th>Max</th></tr>${cols}</table>
<h2>Cleaning applied</h2><ul>${log}</ul>
<h2>Data preview (first ${Math.min(25, r.dataset.rows.length)} of ${r.dataset.rows.length.toLocaleString()} rows)</h2><table>${head}${body}</table>
</body></html>`;
}
