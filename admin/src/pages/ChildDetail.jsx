import { useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useToast } from '@shared/context/ToastContext';
import { ArrowLeft } from 'lucide-react';
import IRRSummary from '@shared/components/IRRSummary';

const ChildDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { error: toastError } = useToast();
  const toastErrorRef = useRef(toastError);
  toastErrorRef.current = toastError;

  const child = location.state?.child ?? null;

  const [activeTab, setActiveTab] = useState('irr');
  const [goals, setGoals] = useState([]);
  const [loadingGoals, setLoadingGoals] = useState(false);

  const handleGoalsTab = () => {
    setActiveTab('goals');
    if (goals.length > 0 || loadingGoals) return;
    setLoadingGoals(true);
    api.get(`/admin/children/${id}/goals`)
      .then((res) => setGoals(Array.isArray(res.data) ? res.data : []))
      .catch(() => toastErrorRef.current(t('childDetail.loadError', { defaultValue: 'Failed to load data' })))
      .finally(() => setLoadingGoals(false));
  };

  const displayName = child ? `${child.firstName} ${child.lastName}` : `Child ${id}`;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-warm-600 hover:text-warm-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
        {t('childDetail.back', { defaultValue: 'Back' })}
      </button>

      {/* Child header */}
      <div className="bg-surface border border-warm-200 rounded-lg p-5">
        <h1 className="text-2xl font-semibold text-warm-900">{displayName}</h1>
        {child && (
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-warm-600">
            {child.dateOfBirth && (
              <span>{t('childDetail.dob', { defaultValue: "Tug'ilgan sana" })}: {new Date(child.dateOfBirth).toLocaleDateString()}</span>
            )}
            {child.gender && <span>{t('childDetail.gender', { defaultValue: 'Jinsi' })}: {child.gender}</span>}
            {child.class && <span>{t('childDetail.class', { defaultValue: 'Sinf' })}: {child.class}</span>}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-warm-200">
        <button
          onClick={() => setActiveTab('irr')}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'irr'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-warm-500 hover:text-warm-800'
          }`}
        >
          {t('childDetail.irr', { defaultValue: 'IRR' })}
        </button>
        <button
          onClick={handleGoalsTab}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'goals'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-warm-500 hover:text-warm-800'
          }`}
        >
          {t('childDetail.goals', { defaultValue: 'Goals' })}
        </button>
      </div>

      {/* IRR Tab — CROSS-IRR-VISIBILITY (Q1: inline counter-sign) */}
      {activeTab === 'irr' && (
        <IRRSummary
          api={api}
          childId={id}
          endpointBase="/admin/children"
          onSignPeriod={async (period) => {
            try {
              await api.post(`/admin/goal-periods/${period.id}/sign`);
            } catch (err) {
              const code = err?.response?.data?.error?.code;
              toastError(t(`error.${code}`, { defaultValue: t('childDetail.signFailed', { defaultValue: 'Imzo qoʻyib boʻlmadi' }) }));
              throw err;
            }
          }}
          t={t}
        />
      )}

      {/* Goals Tab */}
      {activeTab === 'goals' && (
        <div>
          {loadingGoals ? (
            <div className="space-y-3 animate-pulse">
              {[1,2,3].map((i) => <div key={i} className="skel h-16 w-full" />)}
            </div>
          ) : goals.length === 0 ? (
            <div className="text-center py-10 text-warm-400">
              <p className="font-medium">{t('childDetail.noGoals', { defaultValue: 'No goals recorded' })}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {goals.map((g) => (
                <div key={g.id} className="bg-surface border border-warm-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                      g.status === 'completed' ? 'bg-green-50 text-green-700' :
                      g.status === 'paused' ? 'bg-warm-100 text-warm-600' :
                      'bg-blue-50 text-blue-700'
                    }`}>
                      {g.status}
                    </span>
                    {g.category && (
                      <span className="text-xs text-warm-500">{g.category}</span>
                    )}
                    {g.latestReviewDate && (
                      <span className="text-xs text-warm-400 ml-auto num">
                        {t('childDetail.latestReview', { defaultValue: 'Latest review' })}: {new Date(g.latestReviewDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-warm-800">{g.goal}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChildDetail;
