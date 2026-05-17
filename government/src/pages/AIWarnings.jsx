import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import { useToast } from '@shared/context/ToastContext';
import { useTranslation } from 'react-i18next';
import {
  ShieldAlert, AlertTriangle, AlertCircle, Info,
  CheckCircle2, RefreshCw, Shield,
} from 'lucide-react';

const SEVERITY_META = {
  critical: { label: 'Kritik', badge: 'bg-red-100 text-red-700 border-red-200', Icon: ShieldAlert },
  high:     { label: 'Yuqori', badge: 'bg-orange-100 text-orange-700 border-orange-200', Icon: AlertTriangle },
  medium:   { label: "O'rta",  badge: 'bg-yellow-100 text-yellow-700 border-yellow-200', Icon: AlertCircle },
  low:      { label: 'Past',   badge: 'bg-blue-100 text-blue-700 border-blue-200',   Icon: Info },
};

const WarningCard = ({ warning, onResolve, resolving }) => {
  const { t } = useTranslation();
  const meta = SEVERITY_META[warning.severity] ?? SEVERITY_META.low;
  const { Icon } = meta;

  if (warning.resolvedAt) {
    return (
      <div className="bg-paper-card border border-gray-100 rounded-lg p-4 opacity-60">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-500 line-through">{warning.title}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {t('warnings.resolved', { defaultValue: 'Hal qilindi' })} · {new Date(warning.resolvedAt).toLocaleDateString()}
              {warning.resolvedBy && ` · ${warning.resolvedBy}`}
            </p>
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
              {meta.label}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(warning.createdAt).toLocaleDateString()}
            </span>
          </div>
          <p className="text-sm font-semibold text-gray-900 mb-1">{warning.title}</p>
          {warning.description && (
            <p className="text-sm text-gray-600">{warning.description}</p>
          )}
          {warning.schoolName && (
            <p className="text-xs text-gray-400 mt-1">
              {t('warnings.school', { defaultValue: 'Muassasa' })}: {warning.schoolName}
            </p>
          )}
        </div>
        <button
          onClick={() => onResolve(warning.id)}
          disabled={resolving === warning.id}
          className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-brand-600 border border-brand-200 rounded-md hover:bg-brand-50 transition-colors disabled:opacity-50"
        >
          {resolving === warning.id
            ? t('warnings.resolving', { defaultValue: 'Hal qilinmoqda...' })
            : t('warnings.resolve', { defaultValue: 'Hal qilish' })}
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
  const [resolving, setResolving] = useState(null);
  const [filter, setFilter] = useState('active');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const params = filter === 'resolved' ? { resolved: true } : { resolved: false };
      const res = await api.get('/ai-warnings', { params });
      setWarnings(res.data?.data || res.data?.warnings || []);
    } catch {
      setLoadError(true);
      setWarnings([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleResolve = async (id) => {
    setResolving(id);
    try {
      await api.put(`/ai-warnings/${id}/resolve`, { resolutionNote: '' });
      success(t('warnings.resolveSuccess', { defaultValue: 'Ogohlantirish hal qilindi' }));
      await load();
    } catch (err) {
      showError(err.response?.data?.error || t('warnings.resolveError', { defaultValue: 'Hal qilishda xatolik' }));
    } finally {
      setResolving(null); }
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
              <p className="text-xs text-red-600">{t('warnings.kpiCritical', { defaultValue: 'Kritik' })}</p>
              <p className="text-xl font-semibold text-red-700 tabular-nums">{criticalCount}</p>
            </div>
          )}
          {highCount > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
              <p className="text-xs text-orange-600">{t('warnings.kpiHigh', { defaultValue: 'Yuqori' })}</p>
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
              onResolve={handleResolve}
              resolving={resolving}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AIWarnings;
