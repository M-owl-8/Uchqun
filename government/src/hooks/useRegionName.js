import { useState, useEffect } from 'react';
import api from '../services/api';
import * as cache from '../../../shared/utils/cache';
import { useAuth } from '../context/AuthContext';

const CACHE_KEY = 'platform:regions';

export function useRegionName() {
  const { govRegionId } = useAuth();

  const [regionName, setRegionName] = useState(() => {
    const cached = cache.get(CACHE_KEY);
    if (!cached || !govRegionId) return null;
    return cached.find((r) => r.id === govRegionId)?.name ?? null;
  });

  useEffect(() => {
    if (!govRegionId) return;
    const cached = cache.get(CACHE_KEY);
    if (cached) {
      setRegionName(cached.find((r) => r.id === govRegionId)?.name ?? null);
      return;
    }
    api.get('/government/regions').then((res) => {
      const regions = res.data?.data || [];
      cache.set(CACHE_KEY, regions);
      setRegionName(regions.find((r) => r.id === govRegionId)?.name ?? null);
    }).catch(() => {});
  }, [govRegionId]);

  return regionName;
}
