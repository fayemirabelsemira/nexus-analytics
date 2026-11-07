import { useState, type FormEvent } from 'react';
import Modal from '../Modal';
import { alertError, alertInfo, btnPrimary, btnSecondary, input, label } from '../ui';
import { saveDataset } from '../../services/datasetService';
import { friendlyError } from '../../services/errors';
import { useAuth } from '../../contexts/AuthContext';
import { useFeedback } from '../../contexts/FeedbackContext';
import { useSession } from '../../contexts/SessionContext';

export default function SaveDatasetDialog({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { dataset, source, log, markSaved } = useSession();
  const { toast } = useFeedback();
  const [name, setName] = useState(dataset?.name ?? '');
  const [category, setCategory] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!dataset || !user) return null;
  const asCopy = source.kind === 'saved';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const row = await saveDataset(user.id, dataset, { name, category });
      markSaved(row.id, row.dataset_name);
      toast('success', `Saved "${row.dataset_name}" to your account.`);
      onClose();
    } catch (err) {
      setError(friendlyError(err)); // the dataset stays open, nothing is lost
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={asCopy ? 'Save as a new dataset' : 'Save this dataset to your account?'} onClose={onClose} size="sm" dismissible={!busy}>
      <form onSubmit={submit} className="space-y-4">
        <p className={alertInfo}>
          {dataset.rows.length.toLocaleString()} rows × {dataset.columns.length} columns
          {log.length > 0 ? ` · includes ${log.length} cleaning step${log.length === 1 ? '' : 's'}` : ''}. It is stored as a CSV in your private storage; only you can open it.
        </p>
        {error && <p role="alert" className={alertError}>{error}</p>}
        <div>
          <label htmlFor="save-name" className={label}>Dataset name</label>
          <input id="save-name" className={input} required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} disabled={busy} />
        </div>
        <div>
          <label htmlFor="save-cat" className={label}>Category (optional)</label>
          <input id="save-cat" className={input} maxLength={60} placeholder="e.g. Sales, Inventory" value={category} onChange={(e) => setCategory(e.target.value)} disabled={busy} />
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" className={btnSecondary} onClick={onClose} disabled={busy}>Not now</button>
          <button type="submit" className={btnPrimary} disabled={busy}>{busy ? 'Saving…' : 'Save dataset'}</button>
        </div>
      </form>
    </Modal>
  );
}
