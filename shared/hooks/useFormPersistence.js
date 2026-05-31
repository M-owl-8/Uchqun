import { useCallback, useMemo, useRef } from 'react';

/**
 * Persistent form state across navigation and page refreshes.
 *
 * Usage:
 *   const { restore, save, clear } = useFormPersistence('my:key', { storage: 'localStorage' });
 *
 * - restore() → saved state object, or null if none
 * - save(state) → writes to storage (throttled to once per 500 ms)
 * - clear() → removes the saved state; call after successful submit
 *
 * Storage convention:
 *   sessionStorage — transient workflows (single-session, resets when tab closes)
 *   localStorage   — cross-session drafts (survive browser restarts)
 *
 * Non-serializable values (File, Blob, etc.) are stripped silently —
 * wrap them in a visible UX warning instead of trying to persist them.
 */
export function useFormPersistence(key, { storage = 'sessionStorage' } = {}) {
  const store = useMemo(() => {
    try {
      return storage === 'localStorage' ? window.localStorage : window.sessionStorage;
    } catch {
      return null;
    }
  }, [storage]);

  const throttleRef = useRef(null);
  const pendingRef  = useRef(null);

  const restore = useCallback(() => {
    if (!store) return null;
    try {
      const raw = store.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [key, store]);

  const save = useCallback((state) => {
    pendingRef.current = state;
    if (throttleRef.current) return; // already scheduled
    throttleRef.current = setTimeout(() => {
      throttleRef.current = null;
      if (!store) return;
      try {
        store.setItem(key, JSON.stringify(pendingRef.current));
      } catch {
        // Storage full or private-browsing restriction — silently ignore
      }
    }, 500);
  }, [key, store]);

  const clear = useCallback(() => {
    if (throttleRef.current) {
      clearTimeout(throttleRef.current);
      throttleRef.current = null;
    }
    if (!store) return;
    try {
      store.removeItem(key);
    } catch { /* ignore */ }
  }, [key, store]);

  return { restore, save, clear };
}

export default useFormPersistence;
