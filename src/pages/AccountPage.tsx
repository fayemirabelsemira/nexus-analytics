import { useState, type FormEvent } from 'react';
import { deleteDataset, listDatasets } from '../services/datasetService';
import { updateFullName } from '../services/authService';
import { friendlyError } from '../services/errors';
import { useAuth } from '../contexts/AuthContext';
import { useFeedback } from '../contexts/FeedbackContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { useSession } from '../contexts/SessionContext';
import RequireAccount from '../components/auth/RequireAccount';
import PageHeader from '../components/PageHeader';
import { btnDanger, btnPrimary, btnSecondary, card, input, label } from '../components/ui';

function Content() {
  const { user } = useAuth();
  const { theme, toggleTheme } = usePreferences();
  const { confirm, toast } = useFeedback();
  const { source, clear } = useSession();
  const [name, setName] = useState(user?.fullName ?? '');
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const saveName = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try { await updateFullName(user.id, name.trim()); toast('success', 'Profile updated.'); } catch (err) { toast('error', friendlyError(err)); } finally { setBusy(false); }
  };

  const wipe = async () => {
    if (!(await confirm({ title: 'Delete ALL your saved data?', message: 'Every saved dataset, analysis and report (including the files) is permanently deleted. Your account stays.', confirmLabel: 'Delete everything', danger: true }))) return;
    setBusy(true);
    try {
      const all = await listDatasets();
      for (const d of all) await deleteDataset(d);
      if (source.kind === 'saved') clear();
      toast('success', `Deleted ${all.length} dataset${all.length === 1 ? '' : 's'} and everything attached to them.`);
    } catch (err) {
      toast('error', friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Account" />
      <section className={`${card} max-w-xl`}>
        <h2 className="mb-4 font-semibold">Profile</h2>
        <form onSubmit={saveName} className="space-y-4">
          <div><label htmlFor="acc-email" className={label}>Email</label><input id="acc-email" className={input} value={user.email} readOnly disabled /></div>
          <div><label htmlFor="acc-name" className={label}>Full name</label><input id="acc-name" className={input} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} /></div>
          <button className={btnPrimary} type="submit" disabled={busy}>Save profile</button>
        </form>
      </section>
      <section className={`${card} flex max-w-xl items-center justify-between`}>
        <div><h2 className="font-semibold">Appearance</h2><p className="text-sm text-gray-500">Currently {theme} theme.</p></div>
        <button className={btnSecondary} onClick={toggleTheme}>Switch to {theme === 'dark' ? 'light' : 'dark'}</button>
      </section>
      <section className={`${card} max-w-xl border-red-200 dark:border-red-900`}>
        <h2 className="mb-2 font-semibold text-red-700 dark:text-red-400">Data management</h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">Delete everything you saved. Export anything you want to keep first from Saved Datasets.</p>
        <button className={btnDanger} onClick={() => void wipe()} disabled={busy}>Delete all my saved data</button>
      </section>
    </>
  );
}

export default function AccountPage() {
  return <RequireAccount><Content /></RequireAccount>;
}
