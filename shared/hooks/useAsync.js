import { useState, useCallback, useRef, useEffect } from 'react';

export function useAsync(asyncFn, immediate = false) {
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [isStale, setIsStale] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await asyncFn(...args);
      if (mountedRef.current) {
        setData(result);
        setError(null);
        setIsStale(false);
      }
      return result;
    } catch (err) {
      if (mountedRef.current) {
        setError(err);
        // Keep existing data but mark it stale on network failure
        if (err?.code === 'ERR_NETWORK' || err?.message === 'Network Error') {
          setIsStale(true);
        }
      }
      throw err;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [asyncFn]);

  useEffect(() => {
    if (immediate) execute();
  }, [immediate, execute]);

  return { loading, error, data, isStale, execute, retry: execute };
}

export function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}
