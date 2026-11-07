import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { updatePassword } from '../services/authService';
import { friendlyError } from '../services/errors';
import { useAuth } from '../contexts/AuthContext';
import { useAuthUI } from '../contexts/AuthUIContext';
import { useFeedback } from '../contexts/FeedbackContext';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';
import { alertError, btnPrimary, card, input, label } from '../components/ui';

/** The reset email link signs the user in with a short-lived recovery session; here they pick a new password. */
export default function ResetPasswordPage() {
  const { user, loading } = useAuth();
  const { openAuth } = useAuthUI();
  const { toast } = useFeedback();
  const navigate = useNavigate();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <Spinner />;
  if (!user) {
    return <EmptyState title="This reset link is invalid or has expired" text="Request a new link from the log in window (“Forgot password?”)." action={<button className={btnPrimary} onClick={() => openAuth('login')}>Open log in</button>} />;
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pw !== pw2) return setError('The two passwords do not match.');
    setBusy(true);
    setError(null);
    try {
      await updatePassword(pw);
      toast('success', 'Password updated.');
      navigate('/');
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Choose a new password" />
      <form onSubmit={submit} className={`${card} max-w-md space-y-4`}>
        {error && <p role="alert" className={alertError}>{error}</p>}
        <div><label htmlFor="pw1" className={label}>New password (min. 6 characters)</label><input id="pw1" type="password" className={input} required minLength={6} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
        <div><label htmlFor="pw2" className={label}>Repeat password</label><input id="pw2" type="password" className={input} required minLength={6} autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
        <button type="submit" className={btnPrimary} disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button>
      </form>
    </>
  );
}
