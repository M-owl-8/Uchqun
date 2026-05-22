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
  Eye,
  FileText,
  Utensils,
  Image as ImageIcon,
  Baby,
  UserX,
  UserCheck,
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
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-warm-900 tracking-tight">{t('parentsPage.title')}</h1>
          <p className="text-warm-500 font-medium mt-1">{t('parentsPage.subtitle')}</p>
        </div>

        <form role="search" aria-label={t('parentsPage.search')} className="relative flex-1 md:flex-initial md:w-64">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-warm-400" aria-hidden="true" />
          <input
            type="text"
            placeholder={t('parentsPage.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label={t('parentsPage.search')}
            className="pl-12 pr-4 py-3 bg-surface border border-warm-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent w-full"
          />
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Parent List */}
        <div className="bg-surface rounded-lg shadow-sm border border-warm-200">
          <div className="p-4 border-b border-warm-200">
            <h2 className="text-lg font-semibold text-warm-900">{t('parentsPage.listTitle')}</h2>
          </div>
          <div className="divide-y divide-warm-200 max-h-[600px] overflow-y-auto">
            {filteredParents.length === 0 ? (
              <div className="p-8 text-center text-warm-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-warm-300" />
                <p>{searchQuery ? t('parentsPage.emptySearch') : t('parentsPage.empty')}</p>
              </div>
            ) : (
              filteredParents.map((parent) => (
                <div
                  key={parent.id}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedParent?.id === parent.id
                      ? 'bg-brand-50 border-l-4 border-brand-500'
                      : 'hover:bg-warm-50'
                  }`}
                  onClick={() => handleViewParent(parent)}
                  aria-label={`${t('parentsPage.viewLabel') || 'View'} ${parent.firstName} ${parent.lastName}`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleViewParent(parent)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold" aria-hidden="true">
                          {parent.firstName?.charAt(0)}{parent.lastName?.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-warm-900">
                            {parent.firstName} {parent.lastName}
                          </h3>
                          <p className="text-sm text-warm-600">{parent.email}</p>
                        </div>
                        {parent.status === 'suspended' ? (
                          <span className="ml-auto inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                            {t('parentsPage.statusSuspended', { defaultValue: 'Suspended' })}
                          </span>
                        ) : (
                          <span className="ml-auto inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                            {t('parentsPage.statusActive', { defaultValue: 'Active' })}
                          </span>
                        )}
                      </div>
                      {parent.phone && (
                        <div className="flex items-center gap-2 text-sm text-warm-500 mt-2">
                          <Phone className="w-4 h-4" aria-hidden="true" />
                          <span>{parent.phone}</span>
                        </div>
                      )}
                    </div>
                    <Eye className="w-5 h-5 text-warm-400 shrink-0 ml-2" aria-hidden="true" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Parent Data View */}
        <div className="bg-surface rounded-lg shadow-sm border border-warm-200">
          {selectedParent ? (
            <>
              <div className="p-4 border-b border-warm-200 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-warm-900">
                    {selectedParent.firstName} {selectedParent.lastName}
                  </h2>
                  <p className="text-sm text-warm-600">{selectedParent.email}</p>
                </div>
                <div className="shrink-0">
                  {selectedParent.status === 'suspended' ? (
                    <button
                      onClick={() => handleActivate(selectedParent)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-green-50 hover:bg-green-100 text-green-700 rounded-md border border-green-200 transition-colors"
                    >
                      <UserCheck className="w-4 h-4" />
                      {t('parentsPage.activate', { defaultValue: 'Activate' })}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSuspend(selectedParent)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-red-50 hover:bg-red-100 text-red-700 rounded-md border border-red-200 transition-colors"
                    >
                      <UserX className="w-4 h-4" />
                      {t('parentsPage.suspend', { defaultValue: 'Suspend' })}
                    </button>
                  )}
                </div>
              </div>
              {loadingParentData ? (
                <div className="p-8 text-center" role="status" aria-label="Loading parent data">
                  <LoadingSpinner size="md" />
                </div>
              ) : parentData ? (
                <div className="p-4 space-y-6">
                  {/* Children */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Baby className="w-5 h-5 text-brand-600" />
                      <h3 className="font-semibold text-warm-900">Children ({parentData.children?.length || 0})</h3>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {parentData.children && parentData.children.length > 0 ? (
                        parentData.children.map((child) => (
                          <Link
                            key={child.id}
                            to={`/admin/children/${child.id}`}
                            state={{ child }}
                            className="block p-3 bg-warm-50 rounded-lg hover:bg-warm-100 transition-colors"
                          >
                            <p className="font-medium text-warm-900">{child.firstName} {child.lastName}</p>
                            <div className="text-xs text-warm-500 mt-1">
                              <p>DOB: {new Date(child.dateOfBirth).toLocaleDateString()}</p>
                              <p>Gender: {child.gender}</p>
                              <p>School: {child.childSchool?.name || ''}</p>
                              <p>Class: {child.class}</p>
                            </div>
                          </Link>
                        ))
                      ) : (
                        <p className="text-sm text-warm-500">No children registered</p>
                      )}
                    </div>
                  </div>

                  {/* Activities */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-5 h-5 text-brand-600" />
                      <h3 className="font-semibold text-warm-900">Activities ({parentData.activities?.length || 0})</h3>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {parentData.activities && parentData.activities.length > 0 ? (
                        parentData.activities.map((activity) => (
                          <div key={activity.id} className="p-2 bg-warm-50 rounded text-sm">
                            <p className="font-medium">{activity.title}</p>
                            <p className="text-xs text-warm-500">{new Date(activity.activityDate).toLocaleDateString()}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-warm-500">No activities</p>
                      )}
                    </div>
                  </div>

                  {/* Meals */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Utensils className="w-5 h-5 text-brand-600" />
                      <h3 className="font-semibold text-warm-900">Meals ({parentData.meals?.length || 0})</h3>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {parentData.meals && parentData.meals.length > 0 ? (
                        parentData.meals.map((meal) => (
                          <div key={meal.id} className="p-2 bg-warm-50 rounded text-sm">
                            <p className="font-medium">{meal.mealName}</p>
                            <p className="text-xs text-warm-500">{meal.mealType} - {new Date(meal.mealDate).toLocaleDateString()}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-warm-500">No meals</p>
                      )}
                    </div>
                  </div>

                  {/* Media */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <ImageIcon className="w-5 h-5 text-brand-600" />
                      <h3 className="font-semibold text-warm-900">Media ({parentData.media?.length || 0})</h3>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {parentData.media && parentData.media.length > 0 ? (
                        parentData.media.map((media) => (
                          <div key={media.id} className="p-2 bg-warm-50 rounded text-sm">
                            <p className="font-medium">{media.title || media.fileName}</p>
                            <p className="text-xs text-warm-500">{media.fileType} - {new Date(media.uploadDate).toLocaleDateString()}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-warm-500">No media</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-warm-500">
                  <p>Failed to load parent data</p>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-warm-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-warm-300" />
              <p>Select a parent to view their data</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog dialog={dialog} onCancel={() => setDialog(null)} />
    </div>
  );
};

export default ParentManagement;
