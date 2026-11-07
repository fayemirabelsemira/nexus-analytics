import { useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { correlations } from '../engine/insights.ts';
import { saveAnalysis } from '../services/historyService';
import { friendlyError } from '../services/errors';
import { useAnalysis } from '../hooks/useAnalysis';
import { useAuth } from '../contexts/AuthContext';
import { useAuthUI } from '../contexts/AuthUIContext';
import { useFeedback } from '../contexts/FeedbackContext';
import { useSession } from '../contexts/SessionContext';
import FilterSummary from '../components/data/FilterSummary';
import InsightList from '../components/InsightList';
import KpiCard from '../components/KpiCard';
import PageHeader from '../components/PageHeader';
import { NoDataset } from '../components/EmptyState';
import { btnSecondary, card, input, label, td, th } from '../components/ui';

const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

export default function AnalyticsPage() {
  const a = useAnalysis();
  const { user } = useAuth();
  const { source } = useSession();
  const { openAuth, openSave } = useAuthUI();
  const { toast } = useFeedback();
  const [topCol, setTopCol] = useState(0);
  const [saving, setSaving] = useState(false);

  const corr = useMemo(() => (a ? correlations(a.view).slice(0, 10) : []), [a]);
  if (!a) return (<><PageHeader title="Analytics" /><NoDataset /></>);

  const numeric = a.profile.columns.filter((c) => c.stats);
  const textual = a.profile.columns.filter((c) => c.type === 'category' || c.type === 'text');
  const top = textual[Math.min(topCol, textual.length - 1)];

  const save = async () => {
    if (!user) return openAuth('login');
    if (source.kind !== 'saved') {
      toast('info', 'Save this dataset to your account first, then save the analysis.');
      return openSave();
    }
    setSaving(true);
    try {
      await saveAnalysis(user.id, source.id, `${a.dataset.name} – ${new Date().toISOString().slice(0, 10)}`, 'summary', {
        rows: a.profile.rowCount,
        columns: a.profile.columnCount,
        completeness: a.profile.completeness,
        filters: a.filterNotes,
        cleaning: a.log.map((l) => l.action),
        kpis: a.kpis,
        insights: a.insights,
        numericColumns: numeric.map((c) => ({ name: c.name, ...c.stats })),
        topCorrelations: corr.slice(0, 5),
      });
      toast('success', 'Analysis saved to your history.');
    } catch (e) {
      toast('error', friendlyError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Analytics" subtitle={`${a.dataset.name} · ${a.view.rows.length.toLocaleString()} rows analyzed`} actions={<button className={btnSecondary} onClick={() => void save()} disabled={saving}><Save className="h-4 w-4" aria-hidden />{saving ? 'Saving…' : 'Save analysis'}</button>} />
      <FilterSummary />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{a.kpis.map((k) => <KpiCard key={k.label} kpi={k} />)}</div>

      <section className={card}><h2 className="mb-3 font-semibold">Insights</h2><InsightList insights={a.insights} /></section>

      {numeric.length > 0 && (
        <section className={card}>
          <h2 className="mb-3 font-semibold">Statistical summary</h2>
          <div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead><tr><th className={th}>Column</th>{['Count', 'Sum', 'Mean', 'Median', 'Min', 'Max', 'Std dev'].map((h) => <th key={h} className={`${th} text-right`}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">{numeric.map((c) => { const s = c.stats!; return (
              <tr key={c.name}><td className={td}>{c.name}</td>{[s.count, s.sum, s.mean, s.median, s.min, s.max, s.std].map((v, i) => <td key={i} className={`${td} text-right tabular-nums`}>{nf.format(v)}</td>)}</tr>
            ); })}</tbody></table></div>
        </section>
      )}

      {top && (
        <section className={card}>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3"><h2 className="font-semibold">Most common values</h2>
            <div className="w-56"><label htmlFor="top-col" className={label}>Column</label><select id="top-col" className={input} value={Math.min(topCol, textual.length - 1)} onChange={(e) => setTopCol(Number(e.target.value))}>{textual.map((c, i) => <option key={c.name} value={i}>{c.name}</option>)}</select></div></div>
          <div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead><tr><th className={th}>Value</th><th className={`${th} text-right`}>Rows</th><th className={`${th} text-right`}>Share</th></tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">{top.top.map((t) => <tr key={t.value}><td className={td}>{t.value}</td><td className={`${td} text-right`}>{t.count.toLocaleString()}</td><td className={`${td} text-right`}>{nf.format((t.count / (a.profile.rowCount - top.missing || 1)) * 100)}%</td></tr>)}</tbody></table></div>
        </section>
      )}

      {corr.length > 0 && (
        <section className={card}>
          <h2 className="mb-1 font-semibold">Correlations</h2><p className="mb-3 text-sm text-gray-500">Between number columns. Closer to 1 or -1 means a stronger linear relationship; this does not prove cause and effect.</p>
          <div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead><tr><th className={th}>Column A</th><th className={th}>Column B</th><th className={`${th} text-right`}>Correlation</th><th className={`${th} text-right`}>Rows</th></tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">{corr.map((c) => <tr key={c.a + c.b}><td className={td}>{c.a}</td><td className={td}>{c.b}</td><td className={`${td} text-right tabular-nums`}>{c.r}</td><td className={`${td} text-right`}>{c.n.toLocaleString()}</td></tr>)}</tbody></table></div>
        </section>
      )}
    </>
  );
}
