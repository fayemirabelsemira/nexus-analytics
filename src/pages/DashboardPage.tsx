import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Download, ShieldCheck, Sparkles, Upload } from 'lucide-react';
import { groupAggregate, timeSeries } from '../engine/aggregate.ts';
import type { Dataset } from '../engine/types.ts';
import { useAnalysis } from '../hooks/useAnalysis';
import InsightList from '../components/InsightList';
import KpiCard from '../components/KpiCard';
import { BarView, LineView } from '../components/charts/Charts';
import FilterSummary from '../components/data/FilterSummary';
import PageHeader from '../components/PageHeader';
import { btnPrimary, btnSecondary, card } from '../components/ui';

function AutoCharts({ ds }: { ds: Dataset }) {
  const date = ds.columns.findIndex((c) => c.type === 'date');
  const num = ds.columns.findIndex((c) => c.type === 'number');
  const cat = ds.columns.findIndex((c) => c.type === 'category');
  const charts: ReactNode[] = [];

  if (date >= 0) {
    const data = timeSeries(ds, date, num >= 0 ? num : null, 'sum', 'month');
    if (data.length > 1) charts.push(<section key="t" className={card}><h2 className="mb-3 font-semibold">{num >= 0 ? `${ds.columns[num].name} by month` : 'Rows by month'}</h2><LineView data={data} name={num >= 0 ? ds.columns[num].name : 'Rows'} /></section>);
  }
  if (cat >= 0) {
    const data = groupAggregate(ds, cat, num >= 0 ? num : null, 'sum', 8);
    charts.push(<section key="c" className={card}><h2 className="mb-3 font-semibold">{num >= 0 ? `${ds.columns[num].name} by ${ds.columns[cat].name}` : `Rows by ${ds.columns[cat].name}`}</h2><BarView data={data} horizontal name={num >= 0 ? ds.columns[num].name : 'Rows'} /></section>);
  }
  if (charts.length === 0) return <p className="text-sm text-gray-500">Add a date, category or number column to see automatic charts. Build your own on the <Link to="/visualizations" className="text-brand-600 underline">Visualizations</Link> page.</p>;
  return <div className="grid gap-6 lg:grid-cols-2">{charts}</div>;
}

export default function DashboardPage() {
  const a = useAnalysis();

  if (!a) {
    return (
      <>
        <PageHeader title="Nexus Analytics" subtitle="Upload a CSV or Excel file and understand your business data in minutes." />
        <section className={`${card} flex flex-col items-center py-14 text-center`}>
          <BarChart3 className="mb-4 h-12 w-12 text-brand-600" aria-hidden />
          <h2 className="text-xl font-semibold">Start with your data</h2>
          <p className="mt-2 max-w-lg text-sm text-gray-500 dark:text-gray-400">No sign-up needed. Your file is analyzed in your browser. Create an account only if you want to save datasets and reports for later.</p>
          <Link to="/upload" className={`${btnPrimary} mt-6`}><Upload className="h-4 w-4" aria-hidden />Upload a dataset</Link>
        </section>
        <div className="grid gap-4 sm:grid-cols-3">
          {[[Sparkles, 'Clean it', 'Find missing values and duplicates, then fix them with a logged, undoable workflow.'], [BarChart3, 'Analyze it', 'KPIs, statistics, correlations and plain-language insights, plus interactive charts.'], [Download, 'Export it', 'Download cleaned CSV or Excel files and shareable reports.']].map(([Icon, t, d]) => {
            const I = Icon as typeof Sparkles;
            return <div key={t as string} className={card}><I className="mb-2 h-6 w-6 text-brand-600" aria-hidden /><h3 className="font-semibold">{t as string}</h3><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{d as string}</p></div>;
          })}
        </div>
        <p className="flex items-center gap-2 text-xs text-gray-500"><ShieldCheck className="h-4 w-4" aria-hidden />Guest data stays in this browser tab and is cleared when you refresh or leave.</p>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`${a.dataset.name} · ${a.dataset.fileName}`} actions={<><Link to="/analytics" className={btnSecondary}>Full analytics</Link><Link to="/export" className={btnPrimary}>Export</Link></>} />
      <FilterSummary />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{a.kpis.slice(0, 8).map((k) => <KpiCard key={k.label} kpi={k} />)}</div>
      <AutoCharts ds={a.view} />
      <section className={card}>
        <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Key insights</h2><Link to="/analytics" className="text-sm text-brand-600 hover:underline">See all</Link></div>
        <InsightList insights={a.insights} limit={4} />
      </section>
    </>
  );
}
