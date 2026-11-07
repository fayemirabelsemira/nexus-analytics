import { useState } from 'react';
import { ClipboardList, Download, Trash2 } from 'lucide-react';
import { listDatasets } from '../services/datasetService';
import { deleteReport, downloadReport, listReports, type SavedReport } from '../services/reportService';
import { friendlyError } from '../services/errors';
import { useLoad } from '../hooks/useLoad';
import { useFeedback } from '../contexts/FeedbackContext';
import RequireAccount from '../components/auth/RequireAccount';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import { TableSkeleton } from '../components/Skeleton';
import { alertError, btnGhost, card, td, th } from '../components/ui';

function Content() {
  const { data, loading, error, reload } = useLoad(async () => {
    const [reports, datasets] = await Promise.all([listReports(), listDatasets()]);
    return { reports, names: new Map(datasets.map((d) => [d.id, d.dataset_name])) };
  });
  const { confirm, toast } = useFeedback();
  const [busy, setBusy] = useState<string | null>(null);

  const get = async (r: SavedReport) => {
    setBusy(r.id);
    try { await downloadReport(r); } catch (e) { toast('error', friendlyError(e)); } finally { setBusy(null); }
  };
  const remove = async (r: SavedReport) => {
    if (!(await confirm({ title: 'Delete this report?', message: `"${r.report_name}" will be permanently deleted.`, confirmLabel: 'Delete', danger: true }))) return;
    setBusy(r.id);
    try { await deleteReport(r); toast('success', 'Report deleted.'); await reload(); } catch (e) { toast('error', friendlyError(e)); } finally { setBusy(null); }
  };

  return (
    <>
      <PageHeader title="Saved reports" subtitle="Reports you saved from the Reports page." />
      {error && <p role="alert" className={alertError}>{error}</p>}
      {loading ? <TableSkeleton /> : data && data.reports.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No saved reports yet" text="Open a saved dataset, go to Reports and choose Save HTML or Save Excel." />
      ) : data && (
        <section className={`${card} overflow-x-auto p-0`}>
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead><tr><th className={th}>Report</th><th className={th}>Dataset</th><th className={th}>Format</th><th className={th}>Saved</th><th className={th}><span className="sr-only">Actions</span></th></tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {data.reports.map((r) => (
                <tr key={r.id}>
                  <td className={`${td} font-medium`}>{r.report_name}</td>
                  <td className={td}>{data.names.get(r.dataset_id) ?? '—'}</td>
                  <td className={`${td} uppercase`}>{r.report_format}</td>
                  <td className={`${td} whitespace-nowrap`}>{new Date(r.created_at).toLocaleString()}</td>
                  <td className={`${td} whitespace-nowrap text-right`}>
                    <button className={btnGhost} disabled={busy === r.id} onClick={() => void get(r)}><Download className="h-4 w-4" aria-hidden />Download</button>
                    <button className={btnGhost} disabled={busy === r.id} onClick={() => void remove(r)} aria-label={`Delete ${r.report_name}`}><Trash2 className="h-4 w-4 text-red-600" aria-hidden /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}

export default function SavedReportsPage() {
  return <RequireAccount><Content /></RequireAccount>;
}
