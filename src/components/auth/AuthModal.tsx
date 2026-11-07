import { useState, type FormEvent } from 'react';
import Modal from '../Modal';
import { alertError, alertInfo, btnPrimary, input, label } from '../ui';
import { requestPasswordReset, signIn, signUp } from '../../services/authService';
import { friendlyError } from '../../services/errors';
import { useSession } from '../../contexts/SessionContext';

export type AuthMode = 'login' | 'register' | 'reset';

const TITLE: Record<AuthMode, string> = { login: 'Log in', register: 'Create a free account', reset: 'Reset your password' };

export default function AuthModal({ initialMode, onClose }: { initialMode: AuthMode; onClose: () => void }) {
  const { dataset, source } = useSession();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<'confirm' | 'reset' | null>(null);

  const switchMode = (m: AuthMode) => { setMode(m); setError(null); setDone(null); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
        onClose();
      } else if (mode === 'register') {
        const signedIn = await signUp(email.trim(), password, fullName.trim());
        if (signedIn) onClose();
        else setDone('confirm');
      } else {
        await requestPasswordReset(email.trim());
        setDone('reset');
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  const hasGuestWork = dataset !== null && source.kind === 'guest';

  return (
    <Modal title={TITLE[mode]} onClose={onClose} size="sm" dismissible={!busy}>
      {hasGuestWork && !done && <p className={`${alertInfo} mb-4`}>Your current dataset stays open while you sign in. Nothing is saved unless you choose to.</p>}

      {done === 'confirm' ? (
        <div className="space-y-3 text-sm">
          <p>We sent a confirmation link to <strong>{email}</strong>.</p>
          {hasGuestWork && <p className={alertInfo}>Keep this tab open and open the link in a <strong>new tab</strong>. Opening it in this tab would reload the page and clear your temporary data.</p>}
          <p>After confirming, come back and <button className="font-medium text-brand-600 hover:underline" onClick={() => switchMode('login')}>log in</button>.</p>
        </div>
      ) : done === 'reset' ? (
        <p className="text-sm">If an account exists for <strong>{email}</strong>, a reset link is on its way. It opens a page where you choose a new password.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <p role="alert" className={alertError}>{error}</p>}
          {mode === 'register' && (
            <div>
              <label htmlFor="auth-name" className={label}>Full name</label>
              <input id="auth-name" className={input} required autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={busy} />
            </div>
          )}
          <div>
            <label htmlFor="auth-email" className={label}>Email</label>
            <input id="auth-email" type="email" className={input} required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} />
          </div>
          {mode !== 'reset' && (
            <div>
              <label htmlFor="auth-password" className={label}>Password{mode === 'register' ? ' (min. 6 characters)' : ''}</label>
              <input id="auth-password" type="password" className={input} required minLength={mode === 'register' ? 6 : undefined} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} />
            </div>
          )}
          <button type="submit" className={`${btnPrimary} w-full`} disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : mode === 'register' ? 'Create account' : 'Send reset link'}
          </button>
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            {mode === 'login' ? (
              <>
                <button type="button" className="text-brand-600 hover:underline" onClick={() => switchMode('reset')}>Forgot password?</button>
                <button type="button" className="text-brand-600 hover:underline" onClick={() => switchMode('register')}>Create account</button>
              </>
            ) : (
              <button type="button" className="text-brand-600 hover:underline" onClick={() => switchMode('login')}>Back to log in</button>
            )}
          </div>
        </form>
      )}
    </Modal>
  );
}
