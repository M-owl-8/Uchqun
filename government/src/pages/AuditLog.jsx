import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import api from '../services/api';

const ACTIONS = ['archive', 'reactivate', 'approve_registration', 'reject_registration', 'create', 'update', 'delete'];
const ENTITIES = ['schools', 'admin_registrations', 'admins', 'government_users'];

const ACTION_LABELS = {
  archive: 'Arxivlash',
  reactivate: 'Qayta faollashtirish',
  approve_registration: 'Tasdiqlash',
  reject_registration: 'Rad etish',
  create: 'Yaratish',
  update: 'Tahrirlash',
  delete: "O'chirish",
};

const ENTITY_LABELS = {
  schools: 'Maktablar',
  admin_registrations: "Ro'yxatga olish",
  admins: 'Adminlar',
  government_users: 'Davlat foydalanuvchilari',
};

const AuditLog = () => {
  const { t } = useTranslation();

  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchLog = useCallback(async (pageNum) => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({ page: pageNum, limit: 20 });
      if (filterAction) params.set('action', filterAction);
      if (filterEntity) params.set('entity', filterEntity);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await api.get(`/government/audit-log?${params}`);
      const d = res.data.data;
      setEntries(d.entries);
      setTotal(d.total);
      setTotalPages(d.totalPages);
      setPage(pageNum);
    } catch (err) {
      setFetchError(
        err.response?.data?.error?.detail ??
        err.response?.data?.error?.code ??
        t('auditLog.fetchError', { defaultValue: 'Xato yuz berdi' })
      );
    } finally {
      setLoading(false);
    }
  }, [filterAction, filterEntity, startDate, endDate, t]);

  useEffect(() => {
    fetchLog(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApply = () => fetchLog(1);

  const formatDateTime = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('uz-UZ', { dateStyle: 'short', timeStyle: 'short' });
  };

  const actorName = (entry) => {
    if (entry.actor) return `${entry.actor.firstName ?? ''} ${entry.actor.lastName ?? ''}`.trim();
    return '—';
  };

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <ClipboardList className="w-6 h-6 text-brand-600" />
        <h1 className="text-2xl font-semibold text-inkGreen-900">
          {t('auditLog.title', { defaultValue: 'Audit jurnali' })}
        </h1>
      </div>

      {/* Filters */}
      <div className="bg-paper-card border border-gray-200 rounded-lg px-5 py-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">
              {t('auditLog.action', { defaultValue: 'Harakat' })}
            </label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              data-testid="filter-action"
            >
              <option value="">{t('auditLog.allActions', { defaultValue: 'Barcha harakatlar' })}</option>
              {ACTIONS.map((a) => (
                <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">
              {t('auditLog.entity', { defaultValue: "Ob'ekt" })}
            </label>
            <select
              value={filterEntity}
              onChange={(e) => setFilterEntity(e.target.value)}
              className="text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              data-testid="filter-entity"
            >
              <option value="">{t('auditLog.allEntities', { defaultValue: "Barcha ob'ektlar" })}</option>
              {ENTITIES.map((en) => (
                <option key={en} value={en}>{ENTITY_LABELS[en] || en}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">
              {t('auditLog.startDate', { defaultValue: 'Boshlanish sanasi' })}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              data-testid="filter-start-date"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">
              {t('auditLog.endDate', { defaultValue: 'Tugash sanasi' })}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              data-testid="filter-end-date"
            />
          </div>

          <button
            onClick={handleApply}
            className="px-4 py-1.5 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-md transition-colors"
            data-testid="apply-filters"
          >
            {t('auditLog.filter', { defaultValue: 'Filtrlash' })}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-paper-card border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16" data-testid="loading-area">
            <LoadingSpinner size="lg" />
          </div>
        ) : fetchError ? (
          <div className="py-16 text-center" data-testid="error-state">
            <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">{fetchError}</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="py-16 text-center" data-testid="empty-state">
            <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              {t('auditLog.noEntries', { defaultValue: 'Yozuvlar topilmadi' })}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm" data-testid="audit-table">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {[
                  t('auditLog.date', { defaultValue: 'Sana' }),
                  t('auditLog.actor', { defaultValue: 'Foydalanuvchi' }),
                  t('auditLog.actionCol', { defaultValue: 'Harakat' }),
                  t('auditLog.entityCol', { defaultValue: "Ob'ekt" }),
                  t('auditLog.entityId', { defaultValue: 'ID' }),
                ].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-5 py-3 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-gray-600 tabular-nums whitespace-nowrap">
                    {formatDateTime(entry.createdAt)}
                  </td>
                  <td className="px-5 py-3 text-gray-800">{actorName(entry)}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-brand-50 text-brand-700">
                      {ACTION_LABELS[entry.action] || entry.action}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{ENTITY_LABELS[entry.entity] || entry.entity}</td>
                  <td className="px-5 py-3 text-gray-400 font-mono text-xs truncate max-w-[160px]">
                    {entry.entityId || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            {t('auditLog.total', { defaultValue: 'Jami' })}: {total}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchLog(page - 1)}
              disabled={page <= 1 || loading}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-40 transition-colors"
              data-testid="prev-page"
            >
              <ChevronLeft className="w-4 h-4" />
              {t('auditLog.prev', { defaultValue: 'Oldingi' })}
            </button>
            <span className="px-2" data-testid="page-indicator">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => fetchLog(page + 1)}
              disabled={page >= totalPages || loading}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-40 transition-colors"
              data-testid="next-page"
            >
              {t('auditLog.next', { defaultValue: 'Keyingi' })}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLog;
