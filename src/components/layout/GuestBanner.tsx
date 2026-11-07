import { Info } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAuthUI } from '../../contexts/AuthUIContext';

export default function GuestBanner() {
  const { user, loading } = useAuth();
  const { openAuth } = useAuthUI();
  if (user || loading) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-brand-100 bg-brand-50 px-4 py-2 text-sm text-brand-700 dark:border-brand-700/30 dark:bg-brand-700/10 dark:text-brand-100">
      <Info className="h-4 w-4 shrink-0" aria-hidden />
      <p className="flex-1">
        You're using Nexus Analytics as a guest. Your data is temporary and will be cleared when you refresh or leave this session.{' '}
        <button className="font-medium underline" onClick={() => openAuth('register')}>Create a free account to save your datasets and access your analysis anytime.</button>
      </p>
    </div>
  );
}
