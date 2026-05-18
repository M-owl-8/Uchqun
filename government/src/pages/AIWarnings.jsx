import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import { useToast } from '@shared/context/ToastContext';
import { useTranslation } from 'react-i18next';
import {
  ShieldAlert, AlertTriangle, AlertCircle, Info,
  CheckCircle2, RefreshCw, Shield,
} from 'lucide-react';

const SEVERITY_META = {
  critical: { badge: 'bg-red-100 text-red-700 border-red-200', Icon: ShieldAlert },
  high:     { badge: 'bg-orange-100 text-orange-700 border-orange-200', Icon: AlertTriangle },
  medium:   { badge: 'bg-yellow-100 text-yellow-700 border-yellow-200', Icon: AlertCircle },
  low:      { badge: 'bg-blue-100 text-blue-700 border-blue-200',   Icon: Info },
};

const WarningCard = ({ warning, onRequestResolve }) => {
  const { t } = useTranslation();
  const meta = SEVERITY_META[warning.severity] ?? SEVERITY_META.low;
  const { Icon } = meta;
  const severityLabel = t(`warnings.severity.${warning.severity}`, {
    defaultValue: warning.severity.charAt(0).toUpperCase() + warning.severity.slice(1),
  });

  if (warning.resolvedAt) {
    return (
      <div className="bg-paper-card border border-gray-100 rounded-lg p-4 opacity-60">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-500 line-through">{warning.title}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {t('warnings.resolved', { defaultValue: 'Hal qilindi' })} · {new Date(warning.resolvedAt).toLocaleDateString()}
              {warning.resolver && ` · ${warning.resolver.firstName} ${warning.resolver.lastName}`}
            </p>
            {warning.resolutionNotes && (
              <p className="text-xs text-gray-500 mt-1 italic">&ldquo;{warning.resolutionNotes}&rdquo;</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-paper-card border border-gray-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <Icon className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-500" strokeWidth={1.5} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${meta.badge}`}>
              {severityLabel}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(warning.createdAt).toLocaleDateString()}
            </span>
          </div>
          <p className="text-sm font-semibold text-gray-900 mb-1">{warning.title}</p>
          {warning.message && (
            <p className="text-sm text-gray-600">{warning.message}</p>
          )}
          {warning.school?.name && (
            <p className="text-xs text-gray-400 mt-1">
              {t('warnings.school', { defaultValue: 'Muassasa' })}: {warning.school.name}
            </p>
          )}
        </div>
        <button
          onClick={() => onRequestResolve(warning)}
          className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-brand-600 border border-brand-200 rounded-md hover:bg-brand-50 transition-colors"
        >
          {t('warnings.resolve', { defaultValue: 'Hal qilish' })}
        </button>
      </div>
    </div>
  );
};

const AIWarnings = () => {
  const { t } = useTranslation();
  const { success, error: showError } = useToast();
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState('active');
  const [resolveModal, setResolveModal] = useState(null); // { warning, note }
  const [submittingResolve, setSubmittingResolve] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const params = { isResolved: filter === 'resolved' };
      const res = await api.get('/ai-warnings', { params });
      setWarnings(res.data?.data?.warnings || res.data?.warnings || []);
    } catch {
      setLoadError(true);
      setWarnings([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleRequestResolve = (warning) => {
    setResolveModal({ warning, note: '' });
  };

  const handleConfirmResolve = async () => {
    if (!resolveModal || !resolveModal.note.trim()) return;
    setSubmittingResolve(true);
    try {
      await api.put(`/ai-warnings/${resolveModal.warning.id}/resolve`, {
        resolutionNotes: resolveModal.note.trim(),
      });
      success(t('warnings.resolveSuccess', { defaultValue: 'Ogohlantirish hal qilindi' }));
      setResolveModal(null);
      await load();
    } catch (err) {
      showError(err.response?.data?.error || t('warnings.resolveError', { defaultValue: 'Hal qilishda xatolik' }));
    } finally {
      setSubmittingResolve(false);
    }
  };

  const active = warnings.filter(w => !w.resolvedAt);
  const criticalCount = active.filter(w => w.severity === 'critical').length;
  const highCount = active.filter(w => w.severity === 'high').length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-inkGreen-900">
            {t('warnings.title', { defaultValue: 'AI Ogohlantirishlari' })}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {t('warnings.subtitle', { defaultValue: 'Muassasalar bo\'yicha avtomatik tahlil natijalari' })}
          </p>
        </div>
        <button
          onClick={load}
          aria-label={t('warnings.refresh', { defaultValue: 'Yangilash' })}
          className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* KPI strip */}
      {!loading && active.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-paper-card border border-gray-200 rounded-lg px-4 py-3">
            <p className="text-xs text-gray-500">{t('warnings.kpiActive', { defaultValue: 'Faol' })}</p>
            <p className="text-xl font-semibold text-gray-900 tabular-nums">{active.length}</p>
          </div>
          {criticalCount > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-xs text-red-600">{t('warnings.severity.critical', { defaultValue: 'Kritik' })}</p>
              <p className="text-xl font-semibold text-red-700 tabular-nums">{criticalCount}</p>
            </div>
          )}
          {highCount > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
              <p className="text-xs text-orange-600">{t('warnings.severity.high', { defaultValue: 'Yuqori' })}</p>
              <p className="text-xl font-semibold text-orange-700 tabular-nums">{highCount}</p>
            </div>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {['active', 'resolved'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === f ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {f === 'active'
              ? t('warnings.filterActive', { defaultValue: 'Faol' })
              : t('warnings.filterResolved', { defaultValue: 'Hal qilingan' })}
          </button>
        ))}
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{t('warnings.loadError', { defaultValue: "Ma'lumotlarni yuklashda xatolik yuz berdi" })}</span>
          <button onClick={load} className="text-red-600 hover:text-red-800 font-medium underline ml-4">
            {t('warnings.retry', { defaultValue: 'Qayta urinish' })}
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">
          {t('warnings.loading', { defaultValue: 'Yuklanmoqda...' })}
        </div>
      ) : !loadError && warnings.length === 0 ? (
        <div className="py-16 text-center">
          <Shield className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">
            {filter === 'active'
              ? t('warnings.noActive', { defaultValue: 'Faol ogohlantirishlar yo\'q' })
              : t('warnings.noResolved', { defaultValue: 'Hal qilingan ogohlantirishlar yo\'q' })}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {warnings.map(w => (
            <WarningCard
              key={w.id}
              warning={w}
              onRequestResolve={handleRequestResolve}
            />
          ))}
        </div>
      )}

      {/* Resolution note modal */}
      {resolveModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 grid place-items-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              {t('warnings.resolveTitle', { defaultValue: 'Hal qilingan deb belgilash' })}
            </h3>
            <p className="text-sm text-slate-600 mb-4">{resolveModal.warning.title}</p>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              {t('warnings.resolutionNote', { defaultValue: 'Hal qilish izohi' })}
              <span className="text-red-500 ml-0.5">*</span>
            </label>
            <textarea
              value={resolveModal.note}
              onChange={(e) => setResolveModal(m => ({ ...m, note: e.target.value }))}
              rows={3}
              className="w-full rounded-md border border-slate-200 p-2 text-sm focus:border-brand-600 focus:ring-2 focus:ring-brand-600/30 outline-none resize-none"
              placeholder={t('warnings.resolutionPlaceholder', { defaultValue: "Qanday hal qilinganini qisqacha yozing..." })}
              autoFocus
            />
            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={() => setResolveModal(null)}
                disabled={submittingResolve}
                className="h-9 px-4 rounded-md border border-slate-200 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
              >
                {t('common.cancel', { defaultValue: 'Bekor qilish' })}
              </button>
              <button
                disabled={!resolveModal.note.trim() || submittingResolve}
                onClick={handleConfirmResolve}
                className="h-9 px-4 rounded-md bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50"
              >
                {submittingResolve
                  ? t('warnings.resolving', { defaultValue: 'Hal qilinmoqda...' })
                  : t('warnings.resolve', { defaultValue: 'Hal qilish' })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIWarnings;
