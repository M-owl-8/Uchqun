import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { SkeletonList } from '../../../shared/components/Skeleton';
import * as cache from '../../../shared/utils/cache';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import { useToast } from '@shared/context/ToastContext';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Search,
  Phone,
  FileText,
  Utensils,
  Image as ImageIcon,
  Baby,
  UserX,
  UserCheck,
  ChevronRight,
} from 'lucide-react';

/**
 * Parent Management Page
 *
 * Admin can VIEW parents and suspend/activate them.
 */
const ParentManagement = () => {
  const [parents, setParents] = useState(() => cache.get('admin:parents') || []);
  const [loading, setLoading] = useState(!cache.get('admin:parents'));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedParent, setSelectedParent] = useState(null);
  const [parentData, setParentData] = useState(null);
  const [loadingParentData, setLoadingParentData] = useState(false);
  const [dialog, setDialog] = useState(null);
  const { error: toastError, success: toastSuccess } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    const CACHE_KEY = 'admin:parents';
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchFresh = () => api.get('/admin/parents', { signal })
      .then(res => {
        const d = res.data.data || [];
        cache.set(CACHE_KEY, d);
        setParents(d);
      });

    const cached = cache.get(CACHE_KEY);
    if (cached) {
      setParents(cached);
      setLoading(false);
      fetchFresh().catch(() => {});
      return () => controller.abort();
    }

    fetchFresh()
      .catch(err => {
        if (err.code === 'ERR_CANCELED') return;
        toastError(t('parentsPage.loadError') || 'Error');
        setParents([]);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [t, toastError]);

  const handleViewParent = async (parent) => {
    setSelectedParent(parent);
    setLoadingParentData(true);
    try {
      const response = await api.get(`/admin/parents/${parent.id}`);
      setParentData(response.data.data);
    } catch (error) {
      toastError(t('parentsPage.dataError') || 'Error');
    } finally {
      setLoadingParentData(false);
    }
  };

  const updateParentStatus = (parentId, newStatus) => {
    setParents(prev => prev.map(p => p.id === parentId ? { ...p, status: newStatus } : p));
    setSelectedParent(prev => prev?.id === parentId ? { ...prev, status: newStatus } : prev);
  };

  const handleSuspend = (parent) => {
    setDialog({
      message: t('parentsPage.suspendConfirm', { defaultValue: 'Bu ota-onani to\'xtatib qo\'yish?' }),
      onConfirm: async () => {
        setDialog(null);
        try {
          const res = await api.put(`/admin/parents/${parent.id}/suspend`);
          updateParentStatus(parent.id, res.data?.data?.status ?? 'suspended');
          toastSuccess(t('parentsPage.suspendSuccess', { defaultValue: 'Ota-ona to\'xtatildi' }));
        } catch (err) {
          toastError(err.response?.data?.error?.detail || t('parentsPage.suspendError', { defaultValue: 'To\'xtatishda xatolik' }));
        }
      },
    });
  };

  const handleActivate = (parent) => {
    setDialog({
      message: t('parentsPage.activateConfirm', { defaultValue: 'Bu ota-onani faollashtirish?' }),
      onConfirm: async () => {
        setDialog(null);
        try {
          const res = await api.put(`/admin/parents/${parent.id}/activate`);
          updateParentStatus(parent.id, res.data?.data?.status ?? 'active');
          toastSuccess(t('parentsPage.activateSuccess', { defaultValue: 'Ota-ona faollashtirildi' }));
        } catch (err) {
          toastError(err.response?.data?.error?.detail || t('parentsPage.activateError', { defaultValue: 'Faollashtirishda xatolik' }));
        }
      },
    });
  };

  const filteredParents = useMemo(() => (Array.isArray(parents) ? parents : []).filter((parent) => {
    const query = searchQuery.toLowerCase();
    return (
      parent.firstName?.toLowerCase().includes(query) ||
      parent.lastName?.toLowerCase().includes(query) ||
      parent.email?.toLowerCase().includes(query) ||
      parent.phone?.toLowerCase().includes(query)
    );
  }), [parents, searchQuery]);

  if (loading) {
    return <SkeletonList items={8} />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-warm-900">
            {t('parentsPage.title')} ({filteredParents.length})
          </h1>
          <p className="text-sm text-warm-500 mt-0.5">{t('parentsPage.subtitle')}</p>
        </div>
        <form role="search" aria-label={t('parentsPage.search')} className="relative sm:w-64">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400" aria-hidden="true" />
          <input
            type="text"
            placeholder={t('parentsPage.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label={t('parentsPage.search')}
            className="pl-10 pr-4 py-2.5 bg-surface border border-warm-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent w-full"
          />
        </form>
      </div>

      {/* Master-detail split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left: Parent list */}
        <div className="bg-surface rounded-lg border border-warm-200 overflow-hidden">
          <div className="divide-y divide-warm-100 max-h-[600px] overflow-y-auto">
            {filteredParents.length === 0 ? (
              <div className="p-10 text-center">
                <Users className="w-10 h-10 mx-auto mb-3 text-warm-200" strokeWidth={1.5} />
                <p className="text-sm font-medium text-warm-500">
                  {searchQuery ? t('parentsPage.emptySearch') : t('parentsPage.empty')}
                </p>
              </div>
            ) : (
              filteredParents.map((parent) => (
                <div
                  key={parent.id}
                  className={`border-l-[3px] px-4 py-3 cursor-pointer transition-colors ${
                    selectedParent?.id === parent.id
                      ? 'border-brand-600 bg-warm-50'
                      : 'border-transparent hover:bg-warm-50'
                  }`}
                  onClick={() => handleViewParent(parent)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleViewParent(parent)}
                  aria-label={`${parent.firstName} ${parent.lastName}`}
                  aria-selected={selectedParent?.id === parent.id}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-warm-100 text-warm-700 flex items-center justify-center text-sm font-semibold shrink-0" aria-hidden="true">
                      {parent.firstName?.charAt(0)}{parent.lastName?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-warm-900 truncate">
                        {parent.firstName} {parent.lastName}
                      </p>
                      <p className="text-xs text-warm-500 truncate">{parent.email}</p>
                    </div>
                    <span
                      title={parent.status === 'suspended'
                        ? t('parentsPage.statusSuspended', { defaultValue: "To'xtatilgan" })
                        : t('parentsPage.statusActive', { defaultValue: 'Faol' })}
                      className={`w-2 h-2 rounded-full shrink-0 ${parent.status === 'suspended' ? 'bg-warm-300' : 'bg-success-500'}`}
                    />
                  </div>
                  {parent.phone && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-warm-100">
                      <Phone className="w-3.5 h-3.5 text-warm-400 shrink-0" strokeWidth={1.75} />
                      <span className="text-xs text-warm-600">{parent.phone}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Detail panel */}
        <div className="bg-surface rounded-lg border border-warm-200 overflow-hidden">
          {selectedParent ? (
            <>
              {/* Detail header: name + suspend/activate */}
              <div className="px-5 py-4 border-b border-warm-100 flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-warm-900">
                    {selectedParent.firstName} {selectedParent.lastName}
                  </p>
                  <p className="text-sm text-warm-500">{selectedParent.email}</p>
                </div>
                <div className="shrink-0">
                  {selectedParent.status === 'suspended' ? (
                    <button
                      onClick={() => handleActivate(selectedParent)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-green-50 hover:bg-green-100 text-green-700 rounded-md border border-green-200 transition-colors"
                    >
                      <UserCheck className="w-4 h-4" strokeWidth={1.75} />
                      {t('parentsPage.activate', { defaultValue: 'Faollashtirish' })}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSuspend(selectedParent)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-red-50 hover:bg-red-100 text-red-700 rounded-md border border-red-200 transition-colors"
                    >
                      <UserX className="w-4 h-4" strokeWidth={1.75} />
                      {t('parentsPage.suspend', { defaultValue: "To'xtatish" })}
                    </button>
                  )}
                </div>
              </div>

              {/* Detail body */}
              {loadingParentData ? (
                <div className="p-10 text-center" role="status">
                  <LoadingSpinner size="md" />
                </div>
              ) : parentData ? (
                <div className="px-5 py-4 space-y-5 max-h-[520px] overflow-y-auto">
                  {/* Children */}
                  <div>
                    <div className="flex items-center gap-2 mb-2.5">
                      <Baby className="w-4 h-4 text-warm-400 shrink-0" strokeWidth={1.75} />
                      <p className="text-sm font-semibold text-warm-900">
                        {t('parentsPage.children', { count: parentData.children?.length || 0 })}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      {parentData.children?.length > 0 ? (
                        parentData.children.map((child) => (
                          <Link
                            key={child.id}
                            to={`/admin/children/${child.id}`}
                            state={{ child }}
                            className="flex items-center justify-between p-2.5 bg-warm-50 rounded-md hover:bg-warm-100 transition-colors group"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-warm-900 truncate">{child.firstName} {child.lastName}</p>
                              <p className="text-xs text-warm-500">{child.class}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-warm-300 group-hover:text-brand-600 transition-colors shrink-0" strokeWidth={1.75} />
                          </Link>
                        ))
                      ) : (
                        <p className="text-xs text-warm-400">{t('parentsPage.noChildren')}</p>
                      )}
                    </div>
                  </div>

                  {/* Activities */}
                  <div>
                    <div className="flex items-center gap-2 mb-2.5">
                      <FileText className="w-4 h-4 text-warm-400 shrink-0" strokeWidth={1.75} />
                      <p className="text-sm font-semibold text-warm-900">
                        {t('parentsPage.activities', { count: parentData.activities?.length || 0 })}
                      </p>
                    </div>
                    <div className="space-y-1.5 max-h-28 overflow-y-auto">
                      {parentData.activities?.length > 0 ? (
                        parentData.activities.map((activity) => (
                          <div key={activity.id} className="p-2.5 bg-warm-50 rounded-md">
                            <p className="text-sm font-medium text-warm-900 truncate">{activity.title}</p>
                            <p className="text-xs text-warm-500">{new Date(activity.activityDate).toLocaleDateString()}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-warm-400">{t('parentsPage.noActivities')}</p>
                      )}
                    </div>
                  </div>

                  {/* Meals */}
                  <div>
                    <div className="flex items-center gap-2 mb-2.5">
                      <Utensils className="w-4 h-4 text-warm-400 shrink-0" strokeWidth={1.75} />
                      <p className="text-sm font-semibold text-warm-900">
                        {t('parentsPage.meals', { count: parentData.meals?.length || 0 })}
                      </p>
                    </div>
                    <div className="space-y-1.5 max-h-24 overflow-y-auto">
                      {parentData.meals?.length > 0 ? (
                        parentData.meals.map((meal) => (
                          <div key={meal.id} className="p-2.5 bg-warm-50 rounded-md">
                            <p className="text-sm font-medium text-warm-900 truncate">{meal.mealName}</p>
                            <p className="text-xs text-warm-500">{meal.mealType} · {new Date(meal.mealDate).toLocaleDateString()}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-warm-400">{t('parentsPage.noMeals')}</p>
                      )}
                    </div>
                  </div>

                  {/* Media */}
                  <div>
                    <div className="flex items-center gap-2 mb-2.5">
                      <ImageIcon className="w-4 h-4 text-warm-400 shrink-0" strokeWidth={1.75} />
                      <p className="text-sm font-semibold text-warm-900">
                        {t('parentsPage.media', { count: parentData.media?.length || 0 })}
                      </p>
                    </div>
                    <div className="space-y-1.5 max-h-24 overflow-y-auto">
                      {parentData.media?.length > 0 ? (
                        parentData.media.map((media) => (
                          <div key={media.id} className="p-2.5 bg-warm-50 rounded-md">
                            <p className="text-sm font-medium text-warm-900 truncate">{media.title || media.fileName}</p>
                            <p className="text-xs text-warm-500">{media.fileType}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-warm-400">{t('parentsPage.noMedia')}</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-10 text-center">
                  <p className="text-sm text-warm-400">{t('parentsPage.dataError')}</p>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-10 text-center min-h-[200px]">
              <Users className="w-10 h-10 text-warm-200 mb-3" strokeWidth={1.5} />
              <p className="text-sm text-warm-500">
                {t('parentsPage.selectParent', { defaultValue: "Ko'rish uchun ota-onani tanlang" })}
              </p>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog dialog={dialog} onCancel={() => setDialog(null)} />
    </div>
  );
};

export default ParentManagement;
