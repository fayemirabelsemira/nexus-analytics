import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface AppUser {
  id: string;
  email: string;
  fullName: string;
}

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const toUser = (session: Session | null): AppUser | null =>
  session?.user
    ? {
        id: session.user.id,
        email: session.user.email ?? '',
        fullName: String(session.user.user_metadata?.full_name ?? ''),
      }
    : null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore the session once, then follow auth changes. We only read the session object here
    // (no database calls inside the listener) so token refreshes never block or reset the UI.
    supabase.auth
      .getSession()
      .then(({ data }) => setUser(toUser(data.session)))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));

    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(toUser(session)));
    return () => data.subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
