import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import * as cache from '../../../shared/utils/cache';
import { useToast } from '@shared/context/ToastContext';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck, ShieldAlert, AlertTriangle, AlertCircle, Info,
  CheckCircle2, Clock, ChevronDown, RotateCw,
} from 'lucide-react';

const SEVERITY_META = {
  critical: {
    label: 'Kritik · Critical',
    iconBox: 'bg-error-600 text-walnut-text',
    badge: 'bg-error-600 text-walnut-text border-error-700',
    cardBorder: 'border-error-100',
    Icon: ShieldAlert,
  },
  high: {
    label: 'Yuqori · High',
    iconBox: 'bg-error-50 text-error-700',
    badge: 'bg-error-50 text-error-700 border-error-100',
    cardBorder: 'border-warm-200',
    Icon: AlertTriangle,
  },
  medium: {
    label: "O'rta · Medium",
    iconBox: 'bg-warning-50 text-warning-700',
    badge: 'bg-warning-50 text-warning-700 border-warning-100',
    cardBorder: 'border-warm-200',
    Icon: AlertCircle,
  },
  low: {
    label: 'Past · Low',
    iconBox: 'bg-info-50 text-info-700',
    badge: 'bg-info-50 text-info-700 border-info-100',
    cardBorder: 'border-warm-200',
    Icon: Info,
  },
};

const WarningCard = ({ warning, onResolve, resolving }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  if (warning.resolvedAt) {
    return (
      <article className="bg-surface border border-warm-100 rounded-lg p-5 opacity-60">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-md bg-warm-100 text-warm-500 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-sm bg-warm-100 text-warm-600 border border-warm-200">
                {t('aiWarnings.resolved', { defaultValue: 'Hal qilingan' })}
              </span>
              {warning.resolvedAt && (
                <span className="text-xs text-warm-500 num">
                  {new Intl.DateTimeFormat('uz-UZ', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(warning.resolvedAt))}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-warm-800 line-through">{warning.title}</p>
            {warning.resolvedBy && (
              <p className="text-sm text-warm-600 mt-1">
                {t('aiWarnings.resolvedBy', { defaultValue: 'Hal qildi' })}: <span className="text-warm-800 font-medium">{warning.resolvedBy}</span>
                {warning.resolutionNote && ` · "${warning.resolutionNote}"`}
              </p>
            )}
          </div>
        </div>
      </article>
    );
  }

  const meta = SEVERITY_META[warning.severity] ?? SEVERITY_META.low;
  const { Icon } = meta;
  const body = warning.body ?? warning.description ?? '';
  const isLong = body.length > 200;
  const displayBody = isLong && !expanded ? body.slice(0, 200) + '…' : body;

  return (
    <article className={`bg-surface border rounded-lg shadow-xs p-5 ${meta.cardBorder}`}>
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${meta.iconBox}`}>
          <Icon className="w-5 h-5" strokeWidth={1.75} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-sm border ${meta.badge}`}>
              {meta.label}
            </span>
            {warning.category && <span className="text-xs text-warm-500">{warning.category}</span>}
            {warning.target && (
              <>
                <span className="text-xs text-warm-400">·</span>
                <span className="text-xs text-warm-500 num">{warning.target}</span>
              </>
            )}
          </div>
          <p className="text-sm font-semibold text-warm-900">{warning.title}</p>
          {body && (
            <p className="text-sm text-warm-700 mt-1">
              {displayBody}
              {isLong && (
                <button
                  onClick={() => setExpanded(v => !v)}
                  className="text-brand-700 font-medium ml-1 hover:underline"
                >
                  {expanded
                    ? t('aiWarnings.showLess', { defaultValue: 'Kamroq' })
                    : t('aiWarnings.showMore', { defaultValue: "Ko'proq" })}
                </button>
              )}
            </p>
          )}
          <div className="mt-3 flex items-center gap-3 text-xs text-warm-500">
            {warning.createdAt && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-3 h-3" strokeWidth={1.75} />
                <span className="num">
                  {new Intl.RelativeTimeFormat('uz', { numeric: 'auto' }).format(
                    Math.round((new Date(warning.createdAt) - Date.now()) / 60000),
                    'minute'
                  )}
                </span>
              </span>
            )}
            {warning.source && (
              <>
                <span>·</span>
                <span>
                  {t('aiWarnings.source', { defaultValue: 'Manba' })}: <span className="text-warm-700">{warning.source}</span>
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {warning.actionUrl && (
            <a
              href={warning.actionUrl}
              className="inline-flex items-center justify-center h-9 px-3 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-walnut-text rounded-md shadow-xs transition-colors"
            >
              {t('aiWarnings.review', { defaultValue: "Ko'rib chiqish" })}
            </a>
          )}
          {warning.severity !== 'critical' && (
            <button
              onClick={() => onResolve(warning.id)}
              disabled={resolving === warning.id}
              className="inline-flex items-center justify-center h-9 px-3 text-sm font-medium text-warm-700 hover:bg-warm-100 rounded-md transition-colors disabled:opacity-50"
            >
              {resolving === warning.id
                ? t('aiWarnings.resolving', { defaultValue: 'Saqlanmoqda…' })
                : t('aiWarnings.markResolved', { defaultValue: 'Hal qilingan deb belgilash' })}
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

const AIWarnings = () => {
  const [warnings, setWarnings] = useState(() => cache.get('admin:ai-warnings') || []);
  const [loading, setLoading] = useState(!cache.get('admin:ai-warnings'));
  const [resolving, setResolving] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const { success, error: showError } = useToast();
  const { t } = useTranslation();

  const fetchWarnings = useCallback(async (bust = false) => {
    const CACHE_KEY = 'admin:ai-warnings';
    const cached = !bust && cache.get(CACHE_KEY);
    if (cached) {
      setWarnings(cached);
      setLoading(false);
      api.get('/admin/ai-warnings').then(res => {
        const data = res.data.data || [];
        cache.set(CACHE_KEY, data);
        setWarnings(data);
      }).catch(() => {});
      return;
    }
    try {
      setLoading(true);
      const res = await api.get('/admin/ai-warnings');
      const data = res.data.data || [];
      cache.set(CACHE_KEY, data);
      setWarnings(data);
    } catch {
      // endpoint may not exist yet — silently show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWarnings(); }, [fetchWarnings]);

  const handleResolve = async (id) => {
    try {
      setResolving(id);
      await api.post(`/admin/ai-warnings/${id}/resolve`);
      success(t('aiWarnings.resolveSuccess', { defaultValue: 'Ogohlantirish hal qilindi' }));
      cache.invalidate('admin:ai-warnings');
      await fetchWarnings(true);
    } catch (err) {
      showError(err.response?.data?.error || t('aiWarnings.resolveError', { defaultValue: 'Xatolik yuz berdi' }));
    } finally {
      setResolving(null);
    }
  };

  const filtered = warnings.filter(w => {
    const matchesStatus =
      statusFilter === 'all' ? true :
      statusFilter === 'unresolved' ? !w.resolvedAt :
      statusFilter === 'resolved' ? !!w.resolvedAt : true;
    const matchesSeverity =
      severityFilter === 'all' ? true : w.severity === severityFilter;
    return matchesStatus && matchesSeverity;
  });

  const unresolvedCount = warnings.filter(w => !w.resolvedAt).length;
  const resolvedCount = warnings.filter(w => w.resolvedAt).length;

  if (loading) {
    return (
      <div className="page-fade-in space-y-6">
        <div className="letterhead pt-4">
          <div className="skel h-3 w-24 mb-2" />
          <div className="skel h-8 w-64" />
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="skel h-28 w-full rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="page-fade-in space-y-6">
      {/* Header */}
      <div className="letterhead pt-4 flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-brand-700">
            {t('aiWarnings.eyebrow', { defaultValue: 'Hisobotlar' })}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-warm-900">
            {t('aiWarnings.title', { defaultValue: 'AI ogohlantirishlar' })}{' '}
            <span className="text-xl font-medium text-warm-500 num">· {warnings.length}</span>
          </h1>
          <p className="text-sm text-warm-600 mt-1">
            {t('aiWarnings.subtitle', { defaultValue: "Tizim aniqlagan e'tibor talab qiluvchi naqshlar va voqealar." })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="h-10 pl-3.5 pr-9 text-sm bg-surface border border-warm-300 rounded-md text-warm-900 appearance-none focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600"
            >
              <option value="all">{t('aiWarnings.filterAll', { defaultValue: 'Hammasi' })} · {warnings.length}</option>
              <option value="unresolved">{t('aiWarnings.filterUnresolved', { defaultValue: 'Hal qilinmagan' })} · {unresolvedCount}</option>
              <option value="resolved">{t('aiWarnings.filterResolved', { defaultValue: 'Hal qilingan' })} · {resolvedCount}</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-500 pointer-events-none" strokeWidth={1.75} />
          </div>
          <div className="relative">
            <select
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value)}
              className="h-10 pl-3.5 pr-9 text-sm bg-surface border border-warm-300 rounded-md text-warm-900 appearance-none focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600"
            >
              <option value="all">{t('aiWarnings.severityAll', { defaultValue: 'Hamma darajalar' })}</option>
              <option value="low">{t('aiWarnings.severityLow', { defaultValue: 'Past · Low' })}</option>
              <option value="medium">{t('aiWarnings.severityMedium', { defaultValue: "O'rta · Medium" })}</option>
              <option value="high">{t('aiWarnings.severityHigh', { defaultValue: 'Yuqori · High' })}</option>
              <option value="critical">{t('aiWarnings.severityCritical', { defaultValue: 'Kritik · Critical' })}</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-500 pointer-events-none" strokeWidth={1.75} />
          </div>
          <button
            onClick={() => fetchWarnings(true)}
            className="inline-flex items-center justify-center w-10 h-10 text-warm-600 bg-surface border border-warm-300 hover:bg-warm-50 rounded-md transition-colors"
            aria-label={t('aiWarnings.refresh', { defaultValue: 'Yangilash' })}
          >
            <RotateCw className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="bg-surface border border-warm-200 rounded-lg shadow-xs p-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-success-50 flex items-center justify-center mb-3">
            <ShieldCheck className="w-7 h-7 text-success-600" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-semibold text-warm-900">
            {t('aiWarnings.emptyTitle', { defaultValue: 'Ogohlantirish yo\'q' })}
          </p>
          <p className="text-sm text-warm-500 mt-1 max-w-md mx-auto">
            {t('aiWarnings.emptyBody', {
              defaultValue:
                "Hozircha hech narsa sizning e'tiboringizni talab qilmaydi. AI tizim doimiy ravishda ma'lumotlarni kuzatadi.",
            })}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(w => (
            <WarningCard key={w.id} warning={w} onResolve={handleResolve} resolving={resolving} />
          ))}
        </div>
      )}
    </div>
  );
};

export default AIWarnings;
