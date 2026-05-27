import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useChild } from '../context/ChildContext';
import { useToast } from '../../shared/context/ToastContext';
import { SKILL_AREAS } from '@shared/config/skillAreas';

const MAX_SCORE = 68;

const SESSION_LABELS = {
  initial: 'Дастлабки баҳолаш',
  '3_month': '3 ойдан кейин',
  '6_month': '6 ойдан кейин',
  final: 'Якуний баҳолаш',
};

function sessionLabel(type) {
  return SESSION_LABELS[type] || type;
}

function trendIcon(sessions, idx) {
  if (idx === 0) return null;
  const prev = sessions[idx - 1].totalScore;
  const curr = sessions[idx].totalScore;
  if (curr > prev) return 'up';
  if (curr < prev) return 'down';
  return 'stable';
}

function skillLabel(code, lang) {
  const area = SKILL_AREAS.find((a) => a.code === code);
  if (!area) return code;
  if (lang === 'ru') return area.textRu;
  return area.textUz;
}

const ChildIRR = () => {
  const { selectedChildId } = useChild();
  const { error: showError } = useToast();
  const { t, i18n } = useTranslation();

  const [irr, setIrr] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [goals, setGoals] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async (childId) => {
    setPageLoading(true);
    setNotFound(false);
    setLoadError(false);
    try {
      let irrRes;
      try {
        irrRes = await api.get(`/parent/children/${childId}/irr`);
      } catch (err) {
        if (err.response?.status === 404) {
          setNotFound(true);
          return;
        }
        throw err;
      }
      setIrr(irrRes.data.data);
      const [sessionsRes, goalsRes] = await Promise.all([
        api.get(`/parent/children/${childId}/irr/assessment`),
        api.get(`/parent/children/${childId}/irr/goals`),
      ]);
      setSessions(sessionsRes.data.data || []);
      setGoals(goalsRes.data.data || null);
    } catch (err) {
      if (err.code === 'ERR_CANCELED') return;
      showError(t('irr.loadError', { defaultValue: 'Маълумот юкланмади. Яна уриниб кўринг.' }));
      setLoadError(true);
    } finally {
      setPageLoading(false);
    }
  }, [showError, t]);

  useEffect(() => {
    if (selectedChildId) {
      load(selectedChildId);
    } else {
      setPageLoading(false);
    }
  }, [selectedChildId, load]);

  if (pageLoading) {
    return (
      <div data-testid="irr-loading" className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-p-brand-600" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div data-testid="irr-not-found" className="py-16 text-center">
        <div className="page-card rounded-xl p-10">
          <TrendingUp className="w-12 h-12 text-p-brand-300 mx-auto mb-5" />
          <h2 className="font-serif text-[18px] font-semibold text-p-ink mb-2">
            {t('irr.notFoundTitle', { defaultValue: 'Ривожланиш режаси ҳали тузилмаган' })}
          </h2>
          <p className="text-[14px] text-p-sepia-500 leading-relaxed">
            {t('irr.notFoundDesc', { defaultValue: 'Ўқитувчи режани тузгач, сиз бу ерда фарзандингизнинг ривожланишини кузата оласиз.' })}
          </p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div data-testid="irr-load-error" className="py-16 text-center">
        <div className="page-card rounded-xl p-10">
          <p className="text-[14px] text-p-sepia-600 mb-5">
            {t('irr.loadError', { defaultValue: 'Маълумот юкланмади. Яна уриниб кўринг.' })}
          </p>
          {selectedChildId && (
            <button
              onClick={() => load(selectedChildId)}
              className="px-5 py-2 rounded-lg bg-p-brand-600 text-white text-[14px] font-medium hover:bg-p-brand-700 transition-colors"
            >
              {t('irr.retry', { defaultValue: 'Яна уриниш' })}
            </button>
          )}
        </div>
      </div>
    );
  }

  const latestSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;
  const progressPct = latestSession
    ? Math.round((latestSession.totalScore / (latestSession.maxPossibleScore || MAX_SCORE)) * 100)
    : 0;

  return (
    <div data-testid="child-irr-page" className="space-y-5 animate-in fade-in duration-300">
      {/* Header card */}
      <div className="bg-p-brand-700 rounded-xl p-6 text-white">
        <p className="text-[11px] uppercase tracking-[.12em] font-medium text-p-brand-200 mb-1">
          {t('irr.subtitle', { defaultValue: 'Фарзандингизнинг ривожланиш йўли' })}
        </p>
        <h1 className="font-serif text-[22px] font-semibold">
          {t('irr.title', { defaultValue: 'Ривожланиш режаси (ИРР)' })}
        </h1>
        {latestSession && (
          <div className="mt-5">
            <div className="flex items-end gap-2 mb-2">
              <span className="text-[36px] font-bold tnum">{latestSession.totalScore}</span>
              <span className="text-p-brand-200 text-[15px] mb-1">/ {latestSession.maxPossibleScore || MAX_SCORE}</span>
              <span className="ml-1 text-p-brand-100 text-[12px] mb-1">
                {t('irr.progressLabel', { defaultValue: 'кўникмалар кўрсаткичи' })}
              </span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className="bg-white h-2 rounded-full transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-p-brand-200 text-[11px] mt-1.5">
              {t('irr.scoreNote', { defaultValue: `Максимал кўрсаткич: ${MAX_SCORE} балл. Балл ошиши — ривожланишнинг белгиси.` })}
            </p>
          </div>
        )}
      </div>

      {/* Progression section */}
      {sessions.length > 0 && (
        <section data-testid="progression-section" className="page-card rounded-xl p-5">
          <h2 className="font-serif text-[16px] font-semibold text-p-ink mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-p-brand-600" />
            {t('irr.progressionTitle', { defaultValue: 'Ривожланиш динамикаси' })}
          </h2>
          <div className="space-y-5">
            {sessions.map((s, idx) => {
              const trend = trendIcon(sessions, idx);
              const pct = Math.round((s.totalScore / (s.maxPossibleScore || MAX_SCORE)) * 100);
              return (
                <div key={s.id} data-testid={`session-row-${s.id}`} className="flex items-center gap-4">
                  <div className="w-36 shrink-0">
                    <p className="text-sm font-semibold text-slate-700">{sessionLabel(s.sessionType)}</p>
                    {s.completedAt && (
                      <p className="text-xs text-slate-400">
                        {new Date(s.completedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm font-bold text-slate-900">{s.totalScore}</span>
                      <span className="text-xs text-slate-400">/ {s.maxPossibleScore || MAX_SCORE}</span>
                      {trend === 'up' && <TrendingUp className="w-4 h-4 text-success-600" aria-label="ошди" />}
                      {trend === 'down' && <TrendingDown className="w-4 h-4 text-amber-500" aria-label="камайди" />}
                      {trend === 'stable' && <Minus className="w-4 h-4 text-slate-400" aria-label="ўзгармади" />}
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          pct >= 60 ? 'bg-success-500' : pct >= 30 ? 'bg-brand-500' : 'bg-amber-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Long-term goals */}
      {goals?.longTermGoals?.length > 0 && (
        <section data-testid="ltg-section" className="page-card rounded-xl p-5">
          <h2 className="text-lg font-bold text-slate-900 mb-6">
            {t('irr.ltgTitle', { defaultValue: 'Узоқ муддатли мақсадлар' })}
          </h2>
          <div className="space-y-3">
            {goals.longTermGoals.map((ltg) => (
              <div
                key={ltg.id}
                data-testid={`ltg-row-${ltg.id}`}
                className="p-4 bg-p-brand-50 rounded-xl border border-p-brand-100"
              >
                <p className="text-xs font-semibold text-brand-500 uppercase tracking-wide mb-1">
                  {skillLabel(ltg.skillArea, i18n.language)}
                </p>
                <p className="text-sm font-medium text-slate-800">{ltg.goalText}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Periods with STGs */}
      {goals?.periods?.length > 0 && (
        <section data-testid="periods-section" className="space-y-6">
          <h2 className="text-lg font-bold text-slate-900">
            {t('irr.periodsTitle', { defaultValue: 'Ривожланиш даврлари' })}
          </h2>
          {goals.periods.map((period) => {
            const periodStgs = (goals.shortTermGoals || []).filter(
              (stg) => stg.periodId === period.id
            );
            return (
              <div
                key={period.id}
                data-testid={`period-card-${period.id}`}
                className="page-card rounded-xl p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-800">{period.periodLabel}</h3>
                  {period.signedAt && (
                    <span className="text-xs text-success-600 font-semibold bg-success-50 px-2 py-1 rounded-lg">
                      {t('irr.signed', { defaultValue: 'Тасдиқланган' })}
                    </span>
                  )}
                </div>
                {(period.startDate || period.endDate) && (
                  <p className="text-xs text-slate-400 mb-4">
                    {period.startDate && new Date(period.startDate).toLocaleDateString()}
                    {period.startDate && period.endDate && ' — '}
                    {period.endDate && new Date(period.endDate).toLocaleDateString()}
                  </p>
                )}
                {periodStgs.length > 0 ? (
                  <div className="space-y-5">
                    {periodStgs.map((stg) => (
                      <div
                        key={stg.id}
                        data-testid={`stg-row-${stg.id}`}
                        className="border-l-2 border-p-brand-200 pl-4"
                      >
                        <p className="text-sm font-medium text-slate-800 mb-2">{stg.stgText}</p>
                        {stg.review && (
                          <div
                            data-testid={`review-card-${stg.id}`}
                            className="mt-2 bg-slate-50 rounded-xl p-3"
                          >
                            <p className="text-xs text-slate-500">{stg.review}</p>
                          </div>
                        )}
                        {stg.parentRecommendations && (
                          <div
                            data-testid={`parent-rec-${stg.id}`}
                            className="mt-3 bg-amber-50 border border-amber-100 rounded-xl p-4"
                          >
                            <p className="text-xs font-bold text-amber-700 mb-1.5">
                              {t('irr.parentRec', { defaultValue: 'Уйда бажариш учун тавсия:' })}
                            </p>
                            <p className="text-sm font-medium text-amber-900">{stg.parentRecommendations}</p>
                          </div>
                        )}
                        {stg.discussionDate && (
                          <p
                            data-testid={`discussion-date-${stg.id}`}
                            className="text-xs text-slate-400 mt-2"
                          >
                            {t('irr.discussion', { defaultValue: 'Муҳокама:' })}{' '}
                            {new Date(stg.discussionDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">
                    {t('irr.noStgs', { defaultValue: 'Мақсадлар ҳали тузилмаган' })}
                  </p>
                )}
              </div>
            );
          })}
        </section>
      )}

      {/* Empty data state (IRR exists but no sessions and no goals yet) */}
      {irr && sessions.length === 0 && !goals?.longTermGoals?.length && !goals?.periods?.length && (
        <div className="bg-surface rounded-[2rem] p-10 text-center shadow-sm border border-slate-100">
          <p className="text-slate-500 font-medium">
            {t('irr.noData', { defaultValue: 'Режа тузилган, аммо ҳали баҳолаш ўтказилмаган.' })}
          </p>
        </div>
      )}
    </div>
  );
};

export default ChildIRR;
