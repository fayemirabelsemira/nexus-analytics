import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import AuthModal, { type AuthMode } from '../components/auth/AuthModal';
import SaveDatasetDialog from '../components/auth/SaveDatasetDialog';
import { useAuth } from './AuthContext';
import { useSession } from './SessionContext';

interface AuthUIValue {
  openAuth: (mode?: Exclude<AuthMode, 'reset'>) => void;
  openSave: () => void;
}

const AuthUIContext = createContext<AuthUIValue | undefined>(undefined);

/**
 * Login/sign-up happen in a modal (no page reload), so the guest's in-memory dataset survives.
 * After a successful sign-in we ASK whether to save it. Nothing is uploaded without that consent.
 */
export function AuthUIProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { dataset, source } = useSession();
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const askAfterAuth = useRef(false);
  const prevUser = useRef<string | null>(null);

  const openAuth = useCallback<AuthUIValue['openAuth']>((mode = 'login') => {
    askAfterAuth.current = true;
    setAuthMode(mode);
  }, []);
  const openSave = useCallback(() => setSaveOpen(true), []);

  useEffect(() => {
    const id = user?.id ?? null;
    if (id && !prevUser.current && askAfterAuth.current && dataset && source.kind === 'guest') setSaveOpen(true);
    if (id) askAfterAuth.current = false;
    prevUser.current = id;
  }, [user, dataset, source]);

  const value = useMemo(() => ({ openAuth, openSave }), [openAuth, openSave]);

  return (
    <AuthUIContext.Provider value={value}>
      {children}
      {authMode && !user && <AuthModal initialMode={authMode} onClose={() => setAuthMode(null)} />}
      {saveOpen && user && <SaveDatasetDialog onClose={() => setSaveOpen(false)} />}
    </AuthUIContext.Provider>
  );
}

export function useAuthUI(): AuthUIValue {
  const ctx = useContext(AuthUIContext);
  if (!ctx) throw new Error('useAuthUI must be used inside <AuthUIProvider>');
  return ctx;
}
