import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAuthUI } from '../../contexts/AuthUIContext';
import EmptyState from '../EmptyState';
import Spinner from '../Spinner';
import { btnPrimary } from '../ui';

/** Wraps account-only pages. Guests get a prompt instead of a redirect, so their session is untouched. */
export default function RequireAccount({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { openAuth } = useAuthUI();
  if (loading) return <Spinner />;
  if (!user) {
    return (
      <EmptyState
        icon={Lock}
        title="Log in to use this page"
        text="Saved datasets, history and reports belong to your account. Analyzing and exporting data works without one."
        action={<button className={btnPrimary} onClick={() => openAuth('login')}>Log in or create account</button>}
      />
    );
  }
  return <>{children}</>;
}
