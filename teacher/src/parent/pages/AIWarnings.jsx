import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../../shared/context/ToastContext';
import api from '../services/api';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import ParentPageHeader from '../components/ParentPageHeader';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '@shared/utils/formatDate';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
} from 'lucide-react';

const AIWarnings = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const { error: showError } = useToast();
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('unresolved');
  const [unresolvedCount, setUnresolvedCount] = useState(null);

  const loadWarnings = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filter === 'unresolved') {
        params.isResolved = false;
      } else if (filter === 'resolved') {
        params.isResolved = true;
      }
      const response = await api.get('/ai-warnings', { params });
      const list = response.data.data.warnings || [];
      setWarnings(list);
      if (filter === 'unresolved') setUnresolvedCount(list.length);
    } catch (error) { void error; } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadWarnings();
  }, [loadWarnings]);

  const resolveWarning = async (warningId) => {
    try {
      await api.put(`/ai-warnings/${warningId}/resolve`);
      loadWarnings();
    } catch (error) {
      showError(error.response?.data?.error || t('warnings.resolveError'));
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-error-100 text-error-800 border-error-300';
      case 'high':
        return 'bg-warning-100 text-warning-800 border-warning-300';
      case 'medium':
        return 'bg-warning-100 text-warning-800 border-yellow-300';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-300';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return XCircle;
      case 'high':
        return AlertTriangle;
      case 'medium':
        return AlertTriangle;
      default:
        return Info;
    }
  };

  const getWarningTypeLabel = (type) => {
    const labels = {
      low_rating: t('warnings.lowRating'),
      declining_rating: t('warnings.decliningRating'),
      negative_feedback: t('warnings.negativeFeedback'),
      complaint: t('warnings.complaint'),
      safety_concern: t('warnings.safetyConcern'),
      quality_issue: t('warnings.qualityIssue'),
      other: t('warnings.other'),
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ParentPageHeader
        title={t('warnings.title')}
        subtitle={t('warnings.subtitle')}
        count={unresolvedCount !== null ? unresolvedCount : undefined}
      />

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'all'
              ? 'bg-brand-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          {t('warnings.all')}
        </button>
        <button
          onClick={() => setFilter('unresolved')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'unresolved'
              ? 'bg-brand-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          {t('warnings.unresolved')}
        </button>
        <button
          onClick={() => setFilter('resolved')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'resolved'
              ? 'bg-brand-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          {t('warnings.resolved')}
        </button>
      </div>

      {/* Warnings List */}
      <div className="space-y-4">
        {warnings.map((warning) => {
          const Icon = getSeverityIcon(warning.severity);
          const colorClass = getSeverityColor(warning.severity);
          return (
            <Card key={warning.id} className="p-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${colorClass}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-slate-900">{warning.title}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${colorClass}`}>
                      {t(`severity.${warning.severity}`)}
                    </span>
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                      {getWarningTypeLabel(warning.warningType)}
                    </span>
                  </div>
                  <p className="text-slate-700 mb-3">{warning.message}</p>
                  {warning.aiAnalysis && (
                    <div className="p-3 bg-slate-50 rounded-lg mb-3">
                      <p className="text-sm text-slate-700">
                        <strong>{t('warnings.aiAnalysis')}:</strong>{' '}
                        {warning.aiAnalysis}
                      </p>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm text-slate-500">
                      {formatDateTime(warning.createdAt, i18n.language)}
                    </span>
                    {!warning.isResolved && user?.role !== 'parent' && (
                      <button
                        onClick={() => resolveWarning(warning.id)}
                        className="px-4 py-2 bg-success-600 text-white rounded-lg font-semibold hover:bg-success-700 transition-colors flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {t('warnings.resolve')}
                      </button>
                    )}
                    {warning.isResolved && (
                      <span className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-semibold flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        {t('warnings.resolved')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {warnings.length === 0 && (
        <Card className="p-12 text-center">
          <CheckCircle className="w-16 h-16 text-success-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {t('warnings.noWarnings')}
          </h3>
          <p className="text-slate-600">
            {t('warnings.noWarningsDesc')}
          </p>
        </Card>
      )}
    </div>
  );
};

export default AIWarnings;
