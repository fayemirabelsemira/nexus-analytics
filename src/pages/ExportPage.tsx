import { useState } from 'react';
import { FileDown, FileSpreadsheet } from 'lucide-react';
import { datasetRows, datasetToCsv } from '../engine/export.ts';
import { downloadText, downloadXlsx, todayStamp } from '../utils/spreadsheet.ts';
import { friendlyError } from '../services/errors';
import { useFeedback } from '../contexts/FeedbackContext';
import { useSession } from '../contexts/SessionContext';
import FilterSummary from '../components/data/FilterSummary';
import PageHeader from '../components/PageHeader';
import { NoDataset } from '../components/EmptyState';
import { btnPrimary, card, label } from '../components/ui';

export default function ExportPage() {
  const { dataset, view, log } = useSession();
  const { toast } = useFeedback();
  const [scope, setScope] = useState<'view' | 'all'>('view');
  const [busy, setBusy] = useState(false);

  if (!dataset || !view) return (<><PageHeader title="Export" /><NoDataset /></>);

  const ds = scope === 'view' ? view : dataset;
  const base = `${dataset.name.replace(/[^\w.-]+/g, '_')}-${log.length ? 'cleaned' : 'export'}-${todayStamp()}`;

  const csv = () => {
    downloadText(datasetToCsv(ds), `${base}.csv`);
    toast('success', `Exported ${ds.rows.length.toLocaleString()} rows as CSV.`);
  };
  const xlsx = async () => {
    setBusy(true);
    try {
      await downloadXlsx([{ name: 'Data', rows: datasetRows(ds) }], `${base}.xlsx`);
      toast('success', `Exported ${ds.rows.length.toLocaleString()} rows as Excel.`);
    } catch (e) {
      toast('error', friendlyError(e, 'Excel export failed.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Export" subtitle="Download your cleaned data. The original file is never changed." />
      <FilterSummary />
      <section className={`${card} space-y-5`}>
        <fieldset>
          <legend className={label}>What to export</legend>
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2"><input type="radio" name="scope" checked={scope === 'view'} onChange={() => setScope('view')} />Current view (filters and sorting applied): <strong>{view.rows.length.toLocaleString()}</strong> rows</label>
            <label className="flex items-center gap-2"><input type="radio" name="scope" checked={scope === 'all'} onChange={() => setScope('all')} />Everything after cleaning: <strong>{dataset.rows.length.toLocaleString()}</strong> rows</label>
          </div>
        </fieldset>
        <div className="flex flex-wrap gap-3">
          <button className={btnPrimary} onClick={csv} disabled={ds.rows.length === 0}><FileDown className="h-4 w-4" aria-hidden />Download CSV</button>
          <button className={btnPrimary} onClick={() => void xlsx()} disabled={busy || ds.rows.length === 0}><FileSpreadsheet className="h-4 w-4" aria-hidden />{busy ? 'Creating…' : 'Download Excel'}</button>
        </div>
        {ds.rows.length === 0 && <p className="text-sm text-amber-700">There are no rows to export. Clear the filters first.</p>}
        <p className="text-xs text-gray-500">CSV files open correctly in Excel (UTF-8). Text that starts with = + or @ is escaped so it cannot run as a formula.</p>
      </section>
    </>
  );
}
