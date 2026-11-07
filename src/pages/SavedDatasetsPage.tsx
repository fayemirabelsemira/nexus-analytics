import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download, FolderOpen, Trash2, Upload } from 'lucide-react';
import { deleteDataset, exportSavedDataset, listDatasets, openDataset, type SavedDataset } from '../services/datasetService';
import { friendlyError } from '../services/errors';
import { useLoad } from '../hooks/useLoad';
import { useFeedback } from '../contexts/FeedbackContext';
import { useSession } from '../contexts/SessionContext';
import RequireAccount from '../components/auth/RequireAccount';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import { TableSkeleton } from '../components/Skeleton';
import { alertError, btnGhost, btnPrimary, card, td, th } from '../components/ui';

const size = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

function Content() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useLoad(listDatasets);
  const { dataset, unsaved, load } = useSession();
  const { confirm, toast } = useFeedback();
  const [busy, setBusy] = useState<string | null>(null);

  const open = async (row: SavedDataset) => {
    if (dataset && unsaved && !(await confirm({ title: 'Replace the current dataset?', message: 'Your current dataset has unsaved work that will be discarded.', confirmLabel: 'Open anyway', danger: true }))) return;
    setBusy(row.id);
    try {
      load(await openDataset(row), { kind: 'saved', id: row.id });
      navigate('/preview');
    } catch (e) {
      toast('error', friendlyError(e));
    } finally {
      setBusy(null);
    }
  };

  const exportIt = async (row: SavedDataset) => {
    setBusy(row.id);
    try { await exportSavedDataset(row); } catch (e) { toast('error', friendlyError(e)); } finally { setBusy(null); }
  };

  const remove = async (row: SavedDataset) => {
    if (!(await confirm({ title: `Delete "${row.dataset_name}"?`, message: 'The file, its analysis history and its saved reports will be permanently deleted.', confirmLabel: 'Delete', danger: true }))) return;
    setBusy(row.id);
    try {
      await deleteDataset(row);
      toast('success', 'Dataset deleted.');
      await reload();
    } catch (e) {
      toast('error', friendlyError(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader title="Saved datasets" subtitle="Datasets you saved to your account. Only you can see them." actions={<Link to="/upload" className={btnPrimary}><Upload className="h-4 w-4" aria-hidden />Upload new</Link>} />
      {error && <p role="alert" className={alertError}>{error}</p>}
      {loading ? <TableSkeleton /> : data && data.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No saved datasets yet" text="Upload a file, then use the Save option to keep it in your account." action={<Link to="/upload" className={btnPrimary}>Upload a dataset</Link>} />
      ) : data && (
        <section className={`${card} overflow-x-auto p-0`}>
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead><tr><th className={th}>Name</th><th className={th}>Category</th><th className={`${th} text-right`}>Rows × cols</th><th className={`${th} text-right`}>Size</th><th className={th}>Saved</th><th className={th}><span className="sr-only">Actions</span></th></tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {data.map((r) => (
                <tr key={r.id}>
                  <td className={td}><p className="font-medium">{r.dataset_name}</p><p className="text-xs text-gray-500">{r.original_filename}</p></td>
                  <td className={td}>{r.category ?? '—'}</td>
                  <td className={`${td} text-right tabular-nums`}>{r.row_count.toLocaleString()} × {r.column_count}</td>
                  <td className={`${td} text-right`}>{size(r.file_size)}</td>
                  <td className={`${td} whitespace-nowrap`}>{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className={`${td} whitespace-nowrap text-right`}>
                    <button className={btnGhost} disabled={busy === r.id} onClick={() => void open(r)}><FolderOpen className="h-4 w-4" aria-hidden />Open</button>
                    <button className={btnGhost} disabled={busy === r.id} onClick={() => void exportIt(r)} aria-label={`Export ${r.dataset_name}`}><Download className="h-4 w-4" aria-hidden /></button>
                    <button className={btnGhost} disabled={busy === r.id} onClick={() => void remove(r)} aria-label={`Delete ${r.dataset_name}`}><Trash2 className="h-4 w-4 text-red-600" aria-hidden /></button>
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

export default function SavedDatasetsPage() {
  return <RequireAccount><Content /></RequireAccount>;
}
