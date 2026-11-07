import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Hash, Tag, Type } from 'lucide-react';
import { profileDataset } from '../engine/profile.ts';
import type { ColumnType } from '../engine/types.ts';
import { useSession } from '../contexts/SessionContext';
import DataTable from '../components/data/DataTable';
import FilterBar from '../components/data/FilterBar';
import PageHeader from '../components/PageHeader';
import { NoDataset } from '../components/EmptyState';
import { card } from '../components/ui';

const ICON = { number: Hash, date: Calendar, category: Tag, text: Type } as const;
const LABEL: Record<ColumnType, string> = { number: 'Number', date: 'Date', category: 'Category', text: 'Text' };

export default function PreviewPage() {
  const { dataset, view, sort, setSort } = useSession();
  const profile = useMemo(() => (dataset ? profileDataset(dataset) : null), [dataset]);
  if (!dataset || !view || !profile) return (<><PageHeader title="Data preview" /><NoDataset /></>);

  return (
    <>
      <PageHeader title="Data preview" subtitle={`${dataset.name} · ${view.rows.length.toLocaleString()} of ${dataset.rows.length.toLocaleString()} rows shown. Click a column header to sort.`} />

      <section className={card}>
        <h2 className="mb-3 text-sm font-semibold">Detected columns</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {profile.columns.map((c) => {
            const Icon = ICON[c.type];
            return (
              <div key={c.name} className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-800">
                <Icon className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                <div className="min-w-0 flex-1"><p className="truncate font-medium" title={c.name}>{c.name}</p><p className="text-xs text-gray-500">{LABEL[c.type]} · {c.missing.toLocaleString()} missing{c.invalid > 0 ? ` · ${c.invalid} invalid` : ''}</p></div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-gray-500">Types look wrong? Fix values on the <Link to="/cleaning" className="text-brand-600 underline">Cleaning</Link> page.</p>
      </section>

      <section className={`${card} space-y-4`}>
        <FilterBar ds={dataset} />
        <DataTable ds={view} sort={sort} onSort={setSort} />
      </section>
    </>
  );
}
