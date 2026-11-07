import { useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { Dataset } from '../../engine/types.ts';
import type { Sort } from '../../engine/filter.ts';
import { btnSecondary } from '../ui';

const PAGE = 50;
const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 });

export default function DataTable({ ds, sort, onSort }: { ds: Dataset; sort: Sort | null; onSort: (s: Sort | null) => void }) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(ds.rows.length / PAGE));
  const current = Math.min(page, pages - 1);
  const rows = ds.rows.slice(current * PAGE, (current + 1) * PAGE);

  const toggle = (col: number) => {
    if (!sort || sort.column !== col) onSort({ column: col, dir: 'asc' });
    else if (sort.dir === 'asc') onSort({ column: col, dir: 'desc' });
    else onSort(null);
  };

  if (ds.rows.length === 0) return <p className="py-10 text-center text-sm text-gray-500">No rows match the current filters.</p>;

  return (
    <div>
      <div className="max-h-[60vh] overflow-auto rounded-lg border border-gray-200 dark:border-gray-800">
        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
          <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900">
            <tr>
              {ds.columns.map((c, i) => (
                <th key={i} scope="col" aria-sort={sort?.column === i ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'} className="whitespace-nowrap px-3 py-2 text-left">
                  <button onClick={() => toggle(i)} className="inline-flex items-center gap-1 font-semibold text-gray-700 hover:text-brand-600 dark:text-gray-200">
                    {c.name}
                    {sort?.column === i && (sort.dir === 'asc' ? <ArrowUp className="h-3.5 w-3.5" aria-hidden /> : <ArrowDown className="h-3.5 w-3.5" aria-hidden />)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((r, ri) => (
              <tr key={ri} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                {r.map((v, ci) => (
                  <td key={ci} className={`whitespace-nowrap px-3 py-1.5 ${typeof v === 'number' ? 'text-right tabular-nums' : ''}`}>
                    {v === null ? <span className="text-gray-300 dark:text-gray-600">—</span> : typeof v === 'number' ? nf.format(v) : v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
        <span>{ds.rows.length.toLocaleString()} rows · page {current + 1} of {pages}</span>
        <div className="flex gap-2">
          <button className={btnSecondary} disabled={current === 0} onClick={() => setPage(current - 1)}>Previous</button>
          <button className={btnSecondary} disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>Next</button>
        </div>
      </div>
    </div>
  );
}
