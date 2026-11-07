import { useCallback, useEffect, useRef, useState } from 'react';
import { friendlyError } from '../services/errors';

/** Loads data when mounted (or when `enabled` becomes true) and exposes loading/error/reload. */
export function useLoad<T>(fn: () => Promise<T>, enabled = true) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fnRef.current());
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) void reload();
  }, [enabled, reload]);

  return { data, loading, error, reload };
}
