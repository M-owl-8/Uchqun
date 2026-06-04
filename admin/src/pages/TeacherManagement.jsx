import { useEffect, useState, memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Card from '@shared/components/Card';
import { SkeletonList } from '../../../shared/components/Skeleton';
import * as cache from '../../../shared/utils/cache';
import { useToast } from '@shared/context/ToastContext';
import { useTranslation } from 'react-i18next';
import {
  UserCheck,
  Search,
  Phone,
  ChevronRight,
} from 'lucide-react';

/**
 * Teacher Management Page (Read-Only for Admin)
 * 
 * Business Logic:
 * - Admin can only VIEW teachers (read-only)
 * - Admin cannot create, edit, or delete teachers
 */
const TeacherManagement = () => {
  const [teachers, setTeachers] = useState(() => cache.get('admin:teachers') || []);
  const [loading, setLoading] = useState(!cache.get('admin:teachers'));
  const [searchQuery, setSearchQuery] = useState('');
  const { error: toastError } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    const CACHE_KEY = 'admin:teachers';
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchFresh = () => api.get('/admin/teachers', { signal })
      .then(res => {
        const d = res.data.data || [];
        cache.set(CACHE_KEY, d);
        setTeachers(d);
      });

    const cached = cache.get(CACHE_KEY);
    if (cached) {
      setTeachers(cached);
      setLoading(false);
      fetchFresh().catch(() => {});
      return () => controller.abort();
    }

    fetchFresh()
      .catch(err => {
        if (err.code === 'ERR_CANCELED') return;
        toastError(t('teachersPage.loadError') || 'Error');
        setTeachers([]);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [t, toastError]);

  const filteredTeachers = useMemo(() => teachers.filter((teacher) => {
    const query = searchQuery.toLowerCase();
    return (
      teacher.firstName?.toLowerCase().includes(query) ||
      teacher.lastName?.toLowerCase().includes(query) ||
      teacher.email?.toLowerCase().includes(query) ||
      teacher.phone?.toLowerCase().includes(query)
    );
  }), [teachers, searchQuery]);

  if (loading) {
    return <SkeletonList items={6} />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-warm-900">
            {t('teachersPage.title')} ({filteredTeachers.length})
          </h1>
          <p className="text-sm text-warm-500 mt-0.5">{t('teachersPage.subtitle')}</p>
        </div>
        <form role="search" aria-label={t('teachersPage.search')} className="relative sm:w-64">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400" aria-hidden="true" />
          <input
            type="text"
            placeholder={t('teachersPage.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label={t('teachersPage.search')}
            className="pl-10 pr-4 py-2.5 bg-surface border border-warm-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent w-full"
          />
        </form>
      </div>

      {filteredTeachers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeachers.map((teacher) => (
            <TeacherCard
              key={teacher.id}
              teacher={teacher}
              t={t}
              onClick={() => navigate('/admin/teachers/' + teacher.id)}
            />
          ))}
        </div>
      ) : searchQuery ? (
        <div className="bg-surface border border-warm-200 rounded-lg p-10 text-center">
          <UserCheck className="w-10 h-10 text-warm-200 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm font-medium text-warm-500">{t('teachersPage.emptySearch')}</p>
          <p className="text-xs text-warm-400 mt-1">«{searchQuery}»</p>
        </div>
      ) : (
        <div className="bg-surface border border-warm-200 rounded-lg p-10 text-center">
          <UserCheck className="w-10 h-10 text-warm-200 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm font-medium text-warm-600">{t('teachersPage.empty')}</p>
          <p className="text-xs text-warm-400 mt-2 max-w-xs mx-auto leading-relaxed">
            {t('teachersPage.emptyBusiness', { defaultValue: "Tarbiyachilar qabulxona xodimlari tomonidan qo'shiladi" })}
          </p>
        </div>
      )}
    </div>
  );
};

const TeacherCard = memo(function TeacherCard({ teacher, t, onClick }) {
  const initials = `${teacher.firstName?.charAt(0) ?? ''}${teacher.lastName?.charAt(0) ?? ''}`.toUpperCase();
  const hasStatus = teacher.isActive !== undefined;

  return (
    <button type="button" onClick={onClick} className="w-full text-left">
      <Card className="p-4 hover:border-warm-300 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-warm-100 text-warm-700 flex items-center justify-center text-sm font-semibold shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-warm-900 truncate">
              {teacher.firstName} {teacher.lastName}
            </p>
            <p className="text-xs text-warm-500 truncate">{teacher.email}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {hasStatus && (
              <span
                title={teacher.isActive
                  ? t('teachersPage.statusActive', { defaultValue: 'Faol' })
                  : t('teachersPage.statusInactive', { defaultValue: 'Nofaol' })}
                className={`w-2 h-2 rounded-full ${teacher.isActive ? 'bg-success-500' : 'bg-warm-300'}`}
              />
            )}
            <ChevronRight className="w-4 h-4 text-warm-300 shrink-0" strokeWidth={1.75} />
          </div>
        </div>
        {teacher.phone && (
          <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-warm-100">
            <Phone className="w-3.5 h-3.5 text-warm-400 shrink-0" strokeWidth={1.75} />
            <span className="text-xs text-warm-600">{teacher.phone}</span>
          </div>
        )}
      </Card>
    </button>
  );
});

export default TeacherManagement;
