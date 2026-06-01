import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import * as cache from '../../../shared/utils/cache';
import { useAuth } from '../context/AuthContext';

const CACHE_KEY = 'platform:regions';

function pickName(region, language) {
  if (!region) return null;
  if (language === 'ru' && region.nameRu) return region.nameRu;
  return region.name;
}

export function useRegionName() {
  const { govRegionId } = useAuth();
  const { i18n } = useTranslation();
  const language = i18n.language;

  const [region, setRegion] = useState(() => {
    const cached = cache.get(CACHE_KEY);
    if (!cached || !govRegionId) return null;
    return cached.find((r) => r.id === govRegionId) ?? null;
  });

  useEffect(() => {
    if (!govRegionId) return;
    const cached = cache.get(CACHE_KEY);
    if (cached) {
      setRegion(cached.find((r) => r.id === govRegionId) ?? null);
      return;
    }
    api.get('/government/regions').then((res) => {
      const regions = res.data?.data || [];
      cache.set(CACHE_KEY, regions);
      setRegion(regions.find((r) => r.id === govRegionId) ?? null);
    }).catch(() => {});
  }, [govRegionId]);

  return pickName(region, language);
}
