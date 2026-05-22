import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useToast } from '@shared/context/ToastContext';

const ACTION_META = {
  'approve:documents':      { label: 'Hujjat tasdiqlandi',           color: 'text-success-600' },
  'reject:documents':       { label: 'Hujjat rad etildi',            color: 'text-error-600' },
  'create:receptions':      { label: 'Qabulxona yaratildi',          color: 'text-info-600' },
  'delete:receptions':      { label: "Qabulxona o'chirildi",         color: 'text-error-600' },
  'activate:receptions':    { label: 'Qabulxona faollashtirildi',    color: 'text-success-600' },
  'deactivate:receptions':  { label: "Qabulxona o'chirildi",         color: 'text-warning-600' },
  'suspend:users':          { label: "Ota-ona to'xtatildi",          color: 'text-error-600' },
  'activate:users':         { label: 'Ota-ona faollashtirildi',      color: 'text-success-600' },
  'restore:children':       { label: 'Bola tiklandi',                color: 'text-info-600' },
  'restore:users':          { label: 'Foydalanuvchi tiklandi',       color: 'text-info-600' },
  'bulk_import:children':   { label: 'Bolalar import qilindi',       color: 'text-brand-600' },
  'transfer:children':      { label: "Bola ko'chirildi",             color: 'text-warning-600' },
  'update:schools':         { label: 'Maktab yangilandi',            color: 'text-brand-600' },
};

const getActionLabel = (action, entity) =>
  ACTION_META[`${action}:${entity}`]?.label ?? `${action} ${entity}`;

const PAGE_SIZE = 20;

const ActivityFeed = () => {
  const { t } = useTranslation();
  const { error: toastError } = useToast();

  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [filterAction, setFilterAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchEntries = useCallback(async (pg, action, sd, ed) => {
    setLoading(true);
    try {
      const params = { page: pg, limit: PAGE_SIZE };
      if (action) params.action = action;
      if (sd) params.startDate = sd;
      if (ed) params.endDate = ed;

      const res = await api.get('/admin/audit-log', { params });
      const d = res.data?.data;
      setEntries(d?.entries ?? []);
      setTotal(d?.total ?? 0);
      setTotalPages(d?.totalPages ?? 1);
    } catch {
      toastError(t('activityFeed.loadError', { defaultValue: 'Failed to load activity' }));
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [t, toastError]);

  useEffect(() => {
    fetchEntries(page, filterAction, startDate, endDate);
  }, [fetchEntries, page, filterAction, startDate, endDate]);

  const handleActionChange = (e) => {
    setFilterAction(e.target.value);
    setPage(1);
  };

  const handleStartDate = (e) => {
    setStartDate(e.target.value);
    setPage(1);
  };

  const handleEndDate = (e) => {
    setEndDate(e.target.value);
    setPage(1);
  };

  const actionKeys = Object.keys(ACTION_META);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-warm-900">
          {t('activityFeed.title', { defaultValue: 'Activity Feed' })}
        </h1>
        <p className="text-warm-500 mt-1">
          {t('activityFeed.subtitle', { defaultValue: 'Audit log of all actions at your school' })}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-warm-600 mb-1">
            {t('activityFeed.filterAction', { defaultValue: 'Filter by action' })}
          </label>
          <select
            value={filterAction}
            onChange={handleActionChange}
            className="px-3 py-2 border border-warm-200 rounded-md text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">
              {t('activityFeed.filterAll', { defaultValue: 'All actions' })}
            </option>
            {actionKeys.map((key) => (
              <option key={key} value={key.split(':')[0]}>
                {ACTION_META[key].label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-warm-600 mb-1">
            {t('activityFeed.startDate', { defaultValue: 'From' })}
          </label>
          <input
            type="date"
            value={startDate}
            onChange={handleStartDate}
            className="px-3 py-2 border border-warm-200 rounded-md text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-warm-600 mb-1">
            {t('activityFeed.endDate', { defaultValue: 'To' })}
          </label>
          <input
            type="date"
            value={endDate}
            onChange={handleEndDate}
            className="px-3 py-2 border border-warm-200 rounded-md text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-warm-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="space-y-2 p-5 animate-pulse">
            {[1,2,3,4,5].map((i) => <div key={i} className="skel h-10 w-full" />)}
          </div>
        ) : entries.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-warm-500 font-medium">
              {t('activityFeed.noActivity', { defaultValue: 'No activity yet' })}
            </p>
            <p className="text-warm-400 text-sm mt-1">
              {t('activityFeed.noActivitySub', { defaultValue: 'Actions will appear here once staff start working' })}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-warm-200 bg-warm-50 text-left">
                <th className="px-4 py-3 font-medium text-warm-600">
                  {t('activityFeed.date', { defaultValue: 'Date' })}
                </th>
                <th className="px-4 py-3 font-medium text-warm-600">
                  {t('activityFeed.actor', { defaultValue: 'Actor' })}
                </th>
                <th className="px-4 py-3 font-medium text-warm-600">
                  {t('activityFeed.action', { defaultValue: 'Action' })}
                </th>
                <th className="px-4 py-3 font-medium text-warm-600">
                  {t('activityFeed.entity', { defaultValue: 'Entity' })}
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-warm-100 last:border-0">
                  <td className="px-4 py-3 text-warm-600 num whitespace-nowrap">
                    {new Date(entry.occurredAt).toLocaleString('uz-UZ')}
                  </td>
                  <td className="px-4 py-3 text-warm-900">
                    {entry.actor
                      ? `${entry.actor.firstName} ${entry.actor.lastName}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-warm-900">
                    {getActionLabel(entry.action, entry.entity)}
                  </td>
                  <td className="px-4 py-3 text-warm-500">{entry.entity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-warm-600">
          <span>
            Page {page} of {totalPages} ({total} total)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 border border-warm-200 rounded-md hover:bg-warm-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 border border-warm-200 rounded-md hover:bg-warm-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
