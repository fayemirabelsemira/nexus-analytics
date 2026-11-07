import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { CleanLogEntry, Dataset } from '../engine/types.ts';
import type { CleanResult } from '../engine/clean.ts';
import { applyFilters, sortIndexes, subset, type Filter, type Sort } from '../engine/filter.ts';
import { useAuth } from './AuthContext';

export type Source = { kind: 'guest' } | { kind: 'saved'; id: string };

interface State {
  dataset: Dataset | null;
  original: Dataset | null;
  undo: Dataset[];
  log: CleanLogEntry[];
  source: Source;
  filters: Filter[];
  sort: Sort | null;
}

const EMPTY: State = { dataset: null, original: null, undo: [], log: [], source: { kind: 'guest' }, filters: [], sort: null };

interface SessionValue extends State {
  /** The working dataset after filters and sorting (what analytics, charts and exports use). */
  view: Dataset | null;
  /** True when closing the tab would lose work. */
  unsaved: boolean;
  load: (ds: Dataset, source?: Source) => void;
  clear: () => void;
  /** Runs a cleaning operation; throws its error message so the page can show it. Returns the result message. */
  applyClean: (op: (ds: Dataset) => CleanResult) => string;
  undoClean: () => void;
  resetCleaning: () => void;
  addFilter: (f: Filter) => void;
  removeFilter: (id: string) => void;
  clearFilters: () => void;
  /** Replaces the quick-search filter (empty text removes it). */
  setSearch: (text: string) => void;
  setSort: (s: Sort | null) => void;
  markSaved: (id: string, name: string) => void;
}

const SessionContext = createContext<SessionValue | undefined>(undefined);

/**
 * Holds the dataset being analysed. Everything lives in React memory only: nothing is written to
 * localStorage, IndexedDB or Supabase unless the signed-in user explicitly saves it.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<State>(EMPTY);
  const ref = useRef(state);
  ref.current = state;

  const load = useCallback((ds: Dataset, source: Source = { kind: 'guest' }) => setState({ ...EMPTY, dataset: ds, original: ds, source }), []);
  const clear = useCallback(() => setState(EMPTY), []);

  const applyClean = useCallback((op: (ds: Dataset) => CleanResult) => {
    const cur = ref.current.dataset;
    if (!cur) throw new Error('No dataset loaded.');
    const res = op(cur); // may throw
    setState((s) => ({
      ...s,
      dataset: res.dataset,
      undo: [...s.undo.slice(-9), cur],
      log: [...s.log, { action: res.message, at: new Date().toISOString() }],
      filters: [], // column positions may have changed
      sort: null,
    }));
    return res.message;
  }, []);

  const undoClean = useCallback(() => setState((s) => (s.undo.length ? { ...s, dataset: s.undo[s.undo.length - 1], undo: s.undo.slice(0, -1), log: s.log.slice(0, -1), filters: [], sort: null } : s)), []);
  const resetCleaning = useCallback(() => setState((s) => (s.original ? { ...s, dataset: s.original, undo: [], log: [], filters: [], sort: null } : s)), []);
  const addFilter = useCallback((f: Filter) => setState((s) => ({ ...s, filters: [...s.filters, f] })), []);
  const removeFilter = useCallback((id: string) => setState((s) => ({ ...s, filters: s.filters.filter((f) => f.id !== id) })), []);
  const clearFilters = useCallback(() => setState((s) => ({ ...s, filters: [] })), []);
  const setSearch = useCallback(
    (text: string) =>
      setState((s) => ({
        ...s,
        filters: [...s.filters.filter((f) => f.kind !== 'search'), ...(text.trim() ? [{ id: 'search', kind: 'search' as const, text: text.trim() }] : [])],
      })),
    [],
  );
  const setSort = useCallback((sort: Sort | null) => setState((s) => ({ ...s, sort })), []);
  const markSaved = useCallback(
    (id: string, name: string) =>
      setState((s) => (s.dataset ? { ...s, dataset: { ...s.dataset, name }, original: { ...s.dataset, name }, undo: [], log: [], source: { kind: 'saved', id } } : s)),
    [],
  );

  // A saved dataset belongs to the account: drop it from memory when the user signs out.
  useEffect(() => {
    if (!user && ref.current.source.kind === 'saved') setState(EMPTY);
  }, [user]);

  const view = useMemo(() => {
    if (!state.dataset) return null;
    if (state.filters.length === 0 && !state.sort) return state.dataset;
    return subset(state.dataset, sortIndexes(state.dataset, applyFilters(state.dataset, state.filters), state.sort));
  }, [state.dataset, state.filters, state.sort]);

  const unsaved = state.dataset !== null && (state.source.kind === 'guest' || state.log.length > 0);

  // Confirmation before the tab is closed or refreshed with unsaved work.
  useEffect(() => {
    if (!unsaved) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [unsaved]);

  const value = useMemo<SessionValue>(
    () => ({ ...state, view, unsaved, load, clear, applyClean, undoClean, resetCleaning, addFilter, removeFilter, clearFilters, setSearch, setSort, markSaved }),
    [state, view, unsaved, load, clear, applyClean, undoClean, resetCleaning, addFilter, removeFilter, clearFilters, setSearch, setSort, markSaved],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}
