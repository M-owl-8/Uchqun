import { useState, useEffect, useCallback } from 'react';
import api from '../services/api.js';
import * as cache from '../utils/cache.js';

export function useFetch(url, { initialData = null, skip = false, ttl } = {}) {
  const [data, setData] = useState(() => cache.get(url) ?? initialData);
  const [loading, setLoading] = useState(!skip && !cache.get(url));
  const [error, setError] = useState(null);

  const refresh = useCallback(async (bust = false) => {
    if (skip) return;
    const cached = !bust && cache.get(url);
    if (cached) {
      setData(cached);
      setLoading(false);
      api.get(url)
        .then(res => {
          const fresh = res.data?.data ?? res.data ?? null;
          cache.set(url, fresh, ttl);
          setData(fresh);
        })
        .catch(() => {});
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(url);
      const fresh = res.data?.data ?? res.data ?? null;
      cache.set(url, fresh, ttl);
      setData(fresh);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [url, skip, ttl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
