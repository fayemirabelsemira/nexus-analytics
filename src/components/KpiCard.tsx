import type { Kpi } from '../engine/types.ts';
import { card } from './ui';

export function formatKpi(k: Kpi): string {
  if (k.format === 'percent') return `${Math.round(k.value * 10) / 10}%`;
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: k.format === 'int' ? 0 : 2 }).format(k.value);
}

export default function KpiCard({ kpi }: { kpi: Kpi }) {
  return (
    <div className={card}>
      <h3 className="truncate text-sm font-medium text-gray-500 dark:text-gray-400" title={kpi.label}>{kpi.label}</h3>
      <p className="mt-2 truncate text-2xl font-bold tracking-tight" title={formatKpi(kpi)}>{formatKpi(kpi)}</p>
      {kpi.hint && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{kpi.hint}</p>}
    </div>
  );
}
