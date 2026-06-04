import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useToast } from '@shared/context/ToastContext';

const DATE_LOCALE = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' };

const ACTION_KEYS = [
  'approve:documents', 'reject:documents',
  'create:receptions', 'delete:receptions', 'activate:receptions', 'deactivate:receptions',
  'suspend:users', 'activate:users',
  'restore:children', 'restore:users', 'bulk_import:children', 'transfer:children',
  'update:schools',
];

const ACTION_LABELS_UZ = {
  'approve:documents':    'Hujjat tasdiqlandi',
  'reject:documents':     'Hujjat rad etildi',
  'create:receptions':    'Qabulxona yaratildi',
  'delete:receptions':    "Qabulxona o'chirildi",
  'activate:receptions':  'Qabulxona faollashtirildi',
  'deactivate:receptions':"Qabulxona o'chirildi",
  'suspend:users':        "Ota-ona to'xtatildi",
  'activate:users':       'Ota-ona faollashtirildi',
  'restore:children':     'Bola tiklandi',
  'restore:users':        'Foydalanuvchi tiklandi',
  'bulk_import:children': 'Bolalar import qilindi',
  'transfer:children':    "Bola ko'chirildi",
  'update:schools':       'Muassasa yangilandi',
};

const getActionLabel = (action, entity, t) => {
  const key = `${action}:${entity}`;
  return t(`activityActions.${action}_${entity}`, { defaultValue: ACTION_LABELS_UZ[key] ?? key });
};

const getEntityLabel = (entity, t) =>
  t(`activityEntities.${entity}`, { defaultValue: entity });

const PAGE_SIZE = 20;

const ActivityFeed = () => {
  const { t, i18n } = useTranslation();
  const { error: toastError } = useToast();
  const toastErrorRef = useRef(toastError);
  toastErrorRef.current = toastError;

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
      toastErrorRef.current(t('activityFeed.loadError', { defaultValue: 'Failed to load activity' }));
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

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


  const hasFilters = !!(filterAction || startDate || endDate);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="letterhead pt-4">
        <p className="text-xs font-medium uppercase tracking-wider text-brand-700">
          {t('activityFeed.eyebrow', { defaultValue: 'Hisobotlar' })}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-warm-900">
          {t('activityFeed.title', { defaultValue: 'Faoliyat tarixchasi' })}
        </h1>
        <p className="text-sm text-warm-600 mt-1">
          {t('activityFeed.subtitle', { defaultValue: "Maktabingizdagi barcha amallar audit jurnali" })}
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
            className="px-3 py-2 border border-warm-200 rounded-md text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600"
          >
            <option value="">
              {t('activityFeed.filterAll', { defaultValue: 'All actions' })}
            </option>
            {ACTION_KEYS.map((key) => {
              const [action, entity] = key.split(':');
              return (
                <option key={key} value={action}>
                  {getActionLabel(action, entity, t)}
                </option>
              );
            })}
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
            className="px-3 py-2 border border-warm-200 rounded-md text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600"
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
            className="px-3 py-2 border border-warm-200 rounded-md text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600"
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
              {hasFilters
                ? t('activityFeed.filterEmpty', { defaultValue: 'No results for selected filter' })
                : t('activityFeed.noActivity', { defaultValue: 'No activity yet' })}
            </p>
            {!hasFilters && (
              <p className="text-warm-400 text-sm mt-1">
                {t('activityFeed.noActivitySub', { defaultValue: 'Actions will appear here once staff start working' })}
              </p>
            )}
            {hasFilters && (
              <button
                onClick={() => { setFilterAction(''); setStartDate(''); setEndDate(''); setPage(1); }}
                className="mt-3 text-sm text-brand-700 hover:text-brand-800 font-medium"
              >
                {t('activityFeed.clearFilter', { defaultValue: 'Clear filter' })}
              </button>
            )}
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
                    {new Date(entry.occurredAt).toLocaleString(DATE_LOCALE[i18n?.language] ?? 'uz-UZ')}
                  </td>
                  <td className="px-4 py-3 text-warm-900">
                    {entry.actor
                      ? `${entry.actor.firstName} ${entry.actor.lastName}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-warm-900">
                    {getActionLabel(entry.action, entry.entity, t)}
                  </td>
                  <td className="px-4 py-3 text-warm-500">{getEntityLabel(entry.entity, t)}</td>
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
            {t('activityFeed.pageOf', { page, totalPages, total, defaultValue: '{{page}} / {{totalPages}} ({{total}} ta)' })}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 border border-warm-200 rounded-md hover:bg-warm-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {t('activityFeed.prev', { defaultValue: 'Oldingi' })}
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 border border-warm-200 rounded-md hover:bg-warm-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {t('activityFeed.next', { defaultValue: 'Keyingi' })}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
