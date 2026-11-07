import { useState } from 'react';
import { ChevronDown, ChevronRight, History, Trash2 } from 'lucide-react';
import type { Insight, Kpi } from '../engine/types.ts';
import { listDatasets } from '../services/datasetService';
import { deleteAnalysis, listAnalyses } from '../services/historyService';
import { friendlyError } from '../services/errors';
import { useLoad } from '../hooks/useLoad';
import { useFeedback } from '../contexts/FeedbackContext';
import RequireAccount from '../components/auth/RequireAccount';
import EmptyState from '../components/EmptyState';
import InsightList from '../components/InsightList';
import KpiCard from '../components/KpiCard';
import PageHeader from '../components/PageHeader';
import { TableSkeleton } from '../components/Skeleton';
import { alertError, btnGhost, card } from '../components/ui';

function Content() {
  const { data, loading, error, reload } = useLoad(async () => {
    const [analyses, datasets] = await Promise.all([listAnalyses(), listDatasets()]);
    return { analyses, names: new Map(datasets.map((d) => [d.id, d.dataset_name])) };
  });
  const { confirm, toast } = useFeedback();
  const [openId, setOpenId] = useState<string | null>(null);

  const remove = async (id: string, name: string) => {
    if (!(await confirm({ title: 'Delete this analysis?', message: `"${name}" will be removed from your history.`, confirmLabel: 'Delete', danger: true }))) return;
    try { await deleteAnalysis(id); toast('success', 'Analysis deleted.'); await reload(); } catch (e) { toast('error', friendlyError(e)); }
  };

  return (
    <>
      <PageHeader title="Analysis history" subtitle="Snapshots you saved from the Analytics page." />
      {error && <p role="alert" className={alertError}>{error}</p>}
      {loading ? <TableSkeleton /> : data && data.analyses.length === 0 ? (
        <EmptyState icon={History} title="No saved analyses yet" text="Open a saved dataset, go to Analytics and choose “Save analysis”." />
      ) : data && (
        <div className="space-y-3">
          {data.analyses.map((a) => {
            const r = a.analysis_results as { kpis?: Kpi[]; insights?: Insight[]; cleaning?: string[]; filters?: string[] };
            const open = openId === a.id;
            return (
              <section key={a.id} className={card}>
                <div className="flex items-center gap-3">
                  <button className="flex flex-1 items-center gap-2 text-left" onClick={() => setOpenId(open ? null : a.id)} aria-expanded={open}>
                    {open ? <ChevronDown className="h-4 w-4" aria-hidden /> : <ChevronRight className="h-4 w-4" aria-hidden />}
                    <span><span className="font-medium">{a.analysis_name}</span><span className="block text-xs text-gray-500">{data.names.get(a.dataset_id) ?? 'Deleted dataset'} · {new Date(a.created_at).toLocaleString()}</span></span>
                  </button>
                  <button className={btnGhost} onClick={() => void remove(a.id, a.analysis_name)} aria-label={`Delete ${a.analysis_name}`}><Trash2 className="h-4 w-4 text-red-600" aria-hidden /></button>
                </div>
                {open && (
                  <div className="mt-4 space-y-4 border-t border-gray-200 pt-4 dark:border-gray-800">
                    {r.kpis && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{r.kpis.slice(0, 8).map((k) => <KpiCard key={k.label} kpi={k} />)}</div>}
                    {r.insights && <InsightList insights={r.insights} />}
                    {r.filters && r.filters.length > 0 && <p className="text-sm text-gray-500">Filters: {r.filters.join('; ')}</p>}
                    {r.cleaning && r.cleaning.length > 0 && <p className="text-sm text-gray-500">Cleaning: {r.cleaning.join('; ')}</p>}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

export default function HistoryPage() {
  return <RequireAccount><Content /></RequireAccount>;
}
