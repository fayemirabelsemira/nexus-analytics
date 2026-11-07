import { useState } from 'react';
import { FileSpreadsheet, FileText, Save } from 'lucide-react';
import { buildHtmlReport, buildReportSheets } from '../engine/export.ts';
import { buildXlsxBlob, downloadBlob, todayStamp } from '../utils/spreadsheet.ts';
import { saveReport, type ReportFormat } from '../services/reportService';
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
import { btnPrimary, btnSecondary, card } from '../components/ui';

const safe = (s: string) => s.replace(/[^\w.-]+/g, '_');

export default function ReportsPage() {
  const a = useAnalysis();
  const { user } = useAuth();
  const { source } = useSession();
  const { openAuth, openSave } = useAuthUI();
  const { toast } = useFeedback();
  const [busy, setBusy] = useState<string | null>(null);

  if (!a) return (<><PageHeader title="Reports" /><NoDataset /></>);

  const make = async (format: ReportFormat): Promise<Blob> =>
    format === 'html' ? new Blob([buildHtmlReport(a)], { type: 'text/html;charset=utf-8' }) : buildXlsxBlob(buildReportSheets(a));

  const download = async (format: ReportFormat) => {
    setBusy(`dl-${format}`);
    try {
      downloadBlob(await make(format), `${safe(a.dataset.name)}-report-${todayStamp()}.${format}`);
    } catch (e) {
      toast('error', friendlyError(e, 'Could not create the report.'));
    } finally {
      setBusy(null);
    }
  };

  const save = async (format: ReportFormat) => {
    if (!user) return openAuth('login');
    if (source.kind !== 'saved') {
      toast('info', 'Save this dataset to your account first, then save the report.');
      return openSave();
    }
    setBusy(`save-${format}`);
    try {
      await saveReport(user.id, source.id, `${a.dataset.name} report ${todayStamp()}`, format, await make(format));
      toast('success', 'Report saved to your account.');
    } catch (e) {
      toast('error', friendlyError(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader title="Reports" subtitle="A shareable summary of the current view: key figures, insights, column statistics, cleaning steps and a data preview." />
      <FilterSummary />

      <section className={`${card} space-y-4`}>
        <h2 className="font-semibold">Download report</h2>
        <div className="flex flex-wrap gap-3">
          <button className={btnPrimary} disabled={busy !== null} onClick={() => void download('html')}><FileText className="h-4 w-4" aria-hidden />{busy === 'dl-html' ? 'Creating…' : 'HTML report'}</button>
          <button className={btnPrimary} disabled={busy !== null} onClick={() => void download('xlsx')}><FileSpreadsheet className="h-4 w-4" aria-hidden />{busy === 'dl-xlsx' ? 'Creating…' : 'Excel report'}</button>
        </div>
        <p className="text-xs text-gray-500">The HTML report opens in any browser and prints cleanly. The Excel report has Summary, Columns, Insights, Cleaning log and Data sheets.</p>
        <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 pt-4 dark:border-gray-800">
          <span className="text-sm text-gray-600 dark:text-gray-300">{user ? 'Keep a copy in your account:' : 'Want to keep reports? Log in to save them.'}</span>
          <button className={btnSecondary} disabled={busy !== null} onClick={() => void save('html')}><Save className="h-4 w-4" aria-hidden />{busy === 'save-html' ? 'Saving…' : 'Save HTML'}</button>
          <button className={btnSecondary} disabled={busy !== null} onClick={() => void save('xlsx')}><Save className="h-4 w-4" aria-hidden />{busy === 'save-xlsx' ? 'Saving…' : 'Save Excel'}</button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold">Report contents</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{a.kpis.slice(0, 4).map((k) => <KpiCard key={k.label} kpi={k} />)}</div>
        <div className={card}><InsightList insights={a.insights} limit={5} /></div>
      </section>
    </>
  );
}
