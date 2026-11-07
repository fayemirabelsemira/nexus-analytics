import { LogOut, Menu, Moon, Save, Sun } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAuthUI } from '../../contexts/AuthUIContext';
import { useFeedback } from '../../contexts/FeedbackContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import { useSession } from '../../contexts/SessionContext';
import { signOut } from '../../services/authService';
import { friendlyError } from '../../services/errors';
import { btnGhost, btnPrimary, btnSecondary } from '../ui';

export default function TopBar({ onMenu }: { onMenu: () => void }) {
  const { user } = useAuth();
  const { openAuth, openSave } = useAuthUI();
  const { dataset, unsaved, source } = useSession();
  const { theme, toggleTheme } = usePreferences();
  const { confirm, toast } = useFeedback();

  const logout = async () => {
    if (unsaved && source.kind === 'saved' && !(await confirm({ title: 'Sign out with unsaved changes?', message: 'Your cleaning changes to this dataset have not been saved and will be lost.', confirmLabel: 'Sign out', danger: true }))) return;
    try {
      await signOut();
    } catch (e) {
      toast('error', friendlyError(e));
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-gray-800 dark:bg-gray-900/90">
      <button className="md:hidden" onClick={onMenu} aria-label="Open menu"><Menu className="h-6 w-6" /></button>

      {dataset ? (
        <p className="min-w-0 truncate text-sm text-gray-600 dark:text-gray-300">
          <span className="font-medium text-gray-900 dark:text-gray-100">{dataset.name}</span> · {dataset.rows.length.toLocaleString()} rows
          {unsaved && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">unsaved</span>}
        </p>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">No dataset loaded</p>
      )}

      <div className="ml-auto flex items-center gap-2">
        {user ? (
          <>
            {dataset && unsaved && (
              <button className={btnSecondary} onClick={openSave}><Save className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">{source.kind === 'guest' ? 'Save dataset' : 'Save as new'}</span></button>
            )}
            <span className="hidden max-w-40 truncate text-sm text-gray-600 dark:text-gray-300 sm:inline">{user.fullName || user.email}</span>
            <button className={btnGhost} onClick={() => void logout()}><LogOut className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">Log out</span></button>
          </>
        ) : (
          <>
            <span className="hidden rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200 sm:inline">Guest Mode</span>
            <button className={btnSecondary} onClick={() => openAuth('login')}>Log in</button>
            <button className={`${btnPrimary} hidden sm:inline-flex`} onClick={() => openAuth('register')}>Create account</button>
          </>
        )}
        <button className={btnGhost} onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}
