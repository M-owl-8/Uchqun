import { useEffect, useState } from 'react';
import api from '../services/api';
import * as cache from '../../../shared/utils/cache';
import Card from '@shared/components/Card';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import { useToast } from '@shared/context/ToastContext';
import { useTranslation } from 'react-i18next';
import { 
  UsersRound, 
  Search,
  UserCheck,
  Calendar
} from 'lucide-react';

/**
 * Group Management Page (Read-Only for Admin)
 * 
 * Business Logic:
 * - Admin can only VIEW groups (read-only)
 * - Admin cannot create, edit, or delete groups
 */
const GroupManagement = () => {
  const [groups, setGroups] = useState(() => cache.get('admin:groups') || []);
  const [loading, setLoading] = useState(!cache.get('admin:groups'));
  const [searchQuery, setSearchQuery] = useState('');
  const { error: toastError } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    const CACHE_KEY = 'admin:groups';
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchFresh = () => api.get('/admin/groups', { signal })
      .then(res => {
        const d = res.data.groups || res.data.data || [];
        cache.set(CACHE_KEY, d);
        setGroups(d);
      });

    const cached = cache.get(CACHE_KEY);
    if (cached) {
      setGroups(cached);
      setLoading(false);
      fetchFresh().catch(() => {});
      return () => controller.abort();
    }

    fetchFresh()
      .catch(err => {
        if (err.code === 'ERR_CANCELED') return;
        toastError(t('groupsPage.loadError') || 'Error');
        setGroups([]);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [t, toastError]);

  const filteredGroups = groups.filter((group) => {
    const query = searchQuery.toLowerCase();
    return (
      group.name?.toLowerCase().includes(query) ||
      group.description?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700">
      <div className="letterhead pt-4 flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-brand-700">
            {t('groupsPage.eyebrow', { defaultValue: 'Boshqaruv' })}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-warm-900">
            {t('groupsPage.title', { defaultValue: 'Guruhlar' })} ({groups.length})
          </h1>
          <p className="text-sm text-warm-600 mt-1">{t('groupsPage.subtitle')}</p>
        </div>

        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400" />
          <input
            type="text"
            placeholder={t('groupsPage.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 h-10 bg-surface border border-warm-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600 w-full text-sm"
          />
        </div>
      </div>

      {filteredGroups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map((group) => (
            <Card key={group.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-warm-100 flex items-center justify-center text-warm-600">
                    <UsersRound className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-warm-900">
                      {group.name}
                    </h3>
                    {group.description && (
            <p className="text-sm text-warm-500 mt-1">{group.description}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {group.teacher && (
                  <div className="flex items-center gap-2 text-sm text-warm-600">
                    <UserCheck className="w-4 h-4 text-warm-400" />
                    <span>
                      {group.teacher.firstName} {group.teacher.lastName}
                    </span>
                  </div>
                )}
                {group.capacity && (
                  <div className="flex items-center gap-2 text-sm text-warm-600">
                    <UsersRound className="w-4 h-4 text-warm-400" />
                    <span>{t('groupsPage.capacity', { count: group.capacity })}</span>
                  </div>
                )}
                {group.ageRange && (
                  <div className="flex items-center gap-2 text-sm text-warm-600">
                    <Calendar className="w-4 h-4 text-warm-400" />
                    <span>{t('groupsPage.age', { range: group.ageRange })}</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <UsersRound className="w-16 h-16 text-warm-200 mx-auto mb-4" />
          <p className="text-warm-400 font-medium text-lg">
            {searchQuery ? t('groupsPage.emptySearch') : t('groupsPage.empty')}
          </p>
          {!searchQuery && (
            <p className="text-warm-400 text-sm mt-2">
              {t('groupsPage.emptyReason', { defaultValue: "Guruhlar qabulxona xodimlari tomonidan yaratiladi" })}
            </p>
          )}
        </Card>
      )}
    </div>
  );
};

export default GroupManagement;
