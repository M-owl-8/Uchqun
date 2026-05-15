import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import * as cache from '../../../shared/utils/cache';
import Card from '@shared/components/Card';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import { Users, Mail, Phone, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const PAGE_SIZE = 20;

const Parents = () => {
  const { t } = useTranslation();
  const [parents, setParents] = useState(() => cache.get('government:parents:1')?.parents ?? []);
  const [total, setTotal] = useState(() => cache.get('government:parents:1')?.total ?? 0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(!cache.get('government:parents:1'));

  const loadParents = useCallback(async (pageNum) => {
    const CACHE_KEY = `government:parents:${pageNum}`;
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchFresh = () => {
      const offset = (pageNum - 1) * PAGE_SIZE;
      return api.get(`/government/parents?limit=${PAGE_SIZE}&offset=${offset}`, { signal })
        .then(res => {
          const d = res.data?.data || {};
          cache.set(CACHE_KEY, d);
          setParents(d.parents || []);
          setTotal(d.total ?? 0);
        });
    };

    const cached = cache.get(CACHE_KEY);
    if (cached) {
      setParents(cached.parents || []);
      setTotal(cached.total ?? 0);
      setLoading(false);
      fetchFresh().catch(() => {});
      return;
    }

    try {
      setLoading(true);
      await fetchFresh();
    } catch {
      setParents([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadParents(page);
  }, [page, loadParents]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {t('parentsPage.title', { defaultValue: 'Barcha ota-onalar' })}
        </h1>
        <p className="text-gray-600">
          {t('parentsPage.subtitle', { defaultValue: 'Tizimdagi barcha ota-onalar ro\'yxati' })}
        </p>
      </div>

      <Card className="p-6">
        <p className="text-sm text-gray-600 mb-1">
          {t('parentsPage.total', { defaultValue: 'Jami ota-onalar' })}
        </p>
        <p className="text-2xl font-bold text-gray-900">{total}</p>
      </Card>

      {parents.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">
              {t('parentsPage.notFound', { defaultValue: 'Ota-onalar topilmadi' })}
            </p>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {parents.map((parent) => (
              <Card key={parent.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900">
                      {parent.firstName} {parent.lastName}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                      <Mail className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{parent.email || '—'}</span>
                    </p>
                    {parent.phone && (
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {parent.phone}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Parents;
