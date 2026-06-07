// CROSS-IRR-VISIBILITY — shared IRR summary card used by admin + government.
//
// Read-only view of a child's active IRR. Fetches from a role-specific
// endpoint (`endpointBase` prop) — e.g. `/admin/children/${childId}` or
// `/government/children/${childId}`. Same JSON shape across both surfaces
// because both controllers (admin/government) return the same fields.
//
// Renders:
//   - Header strip (status badge + activated date)
//   - Score progression — latest 5 sessions on an inline bar chart
//   - Long-term goals list (skill area + goal text)
//   - Periods (signed badge + STG count)
//
// Optional `onSignPeriod(period)` callback — when provided, signs are
// surfaced as inline buttons on each unsigned period. Admin passes this
// to enable inline counter-signing (Q1 decision); government does not.

import { useEffect, useState } from 'react';
import { FileText, TrendingUp, TrendingDown, Minus, Target, CalendarCheck, AlertCircle, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';

const StatusBadge = ({ status, t }) => {
  const map = {
    draft:    { tone: 'bg-slate-100 text-slate-700 border-slate-200',     label: t?.('irrSummary.statusDraft',    { defaultValue: 'Qoralama' }) },
    active:   { tone: 'bg-success-50 text-success-700 border-success-200', label: t?.('irrSummary.statusActive',   { defaultValue: 'Faol' }) },
    archived: { tone: 'bg-slate-100 text-slate-500 border-slate-200',     label: t?.('irrSummary.statusArchived', { defaultValue: 'Arxivlangan' }) },
  };
  const m = map[status] || map.draft;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${m.tone}`}>
      {m.label}
    </span>
  );
};

const SessionBar = ({ session, max }) => {
  const score = session.totalScore ?? 0;
  const pct = max ? Math.round((score / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-slate-500 w-20 shrink-0">{session.sessionType}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-brand-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-semibold text-slate-700 w-12 text-right tnum">{score}/{max ?? '—'}</span>
    </div>
  );
};

const IRRSummary = ({ api, childId, endpointBase, onSignPeriod, t = (k, opts) => opts?.defaultValue ?? k }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [irr, setIrr] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [longTermGoals, setLongTermGoals] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [shortTermGoals, setShortTermGoals] = useState([]);
  const [signingId, setSigningId] = useState(null);

  useEffect(() => {
    if (!childId || !endpointBase) return;
    let alive = true;
    setLoading(true);
    setError(null);
    Promise.all([
      api.get(`${endpointBase}/${childId}/irr`).catch((err) => {
        const code = err?.response?.data?.error?.code;
        if (code === 'IRR_NOT_FOUND') return null;
        throw err;
      }),
      api.get(`${endpointBase}/${childId}/irr/assessment`).catch(() => ({ data: { data: [] } })),
      api.get(`${endpointBase}/${childId}/irr/goals`).catch(() => ({ data: { data: { longTermGoals: [], periods: [], shortTermGoals: [] } } })),
    ])
      .then(([irrRes, assessRes, goalsRes]) => {
        if (!alive) return;
        setIrr(irrRes?.data?.data ?? null);
        setSessions(assessRes?.data?.data ?? []);
        const goals = goalsRes?.data?.data ?? {};
        setLongTermGoals(goals.longTermGoals ?? []);
        setPeriods(goals.periods ?? []);
        setShortTermGoals(goals.shortTermGoals ?? []);
      })
      .catch((err) => {
        if (!alive) return;
        const code = err?.response?.data?.error?.code;
        setError(code || 'IRR_FETCH_FAILED');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [api, childId, endpointBase]);

  const handleSign = async (period) => {
    if (!onSignPeriod) return;
    setSigningId(period.id);
    try {
      await onSignPeriod(period);
      // Refresh — re-fetch goals so the period's manager signature flips
      const goalsRes = await api.get(`${endpointBase}/${childId}/irr/goals`);
      setPeriods(goalsRes?.data?.data?.periods ?? []);
    } finally {
      setSigningId(null);
    }
  };

  if (loading) {
    return (
      <div className="border border-slate-200 rounded-xl p-5 bg-surface flex items-center gap-3 text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-[13px]">{t('irrSummary.loading', { defaultValue: 'IRR yuklanmoqda...' })}</span>
      </div>
    );
  }

  if (error && error !== 'IRR_NOT_FOUND') {
    return (
      <div className="border border-error-200 rounded-xl p-5 bg-error-50 text-error-700 text-[13px]">
        <AlertCircle className="w-4 h-4 inline-block mr-1" />
        {t(`error.${error}`, { defaultValue: t('irrSummary.errorGeneric', { defaultValue: "IRR'ni yuklab bo'lmadi" }) })}
      </div>
    );
  }

  if (!irr) {
    return (
      <div className="border border-slate-200 rounded-xl p-5 bg-surface">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-md bg-slate-100 grid place-items-center shrink-0">
            <FileText className="w-4 h-4 text-slate-400" />
          </span>
          <div>
            <p className="text-[14px] font-semibold text-slate-900">
              {t('irrSummary.noIrrTitle', { defaultValue: "IRR hali tuzilmagan" })}
            </p>
            <p className="text-[12px] text-slate-500 mt-0.5">
              {t('irrSummary.noIrrHint', { defaultValue: "Tarbiyachi IRR tuzganda shu yerda ko'rinadi." })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const max = sessions[0]?.maxPossibleScore ?? null;
  const latest = sessions[sessions.length - 1];
  const prev = sessions[sessions.length - 2];
  const trend = (latest && prev && latest.totalScore != null && prev.totalScore != null)
    ? (latest.totalScore > prev.totalScore ? 'up' : latest.totalScore < prev.totalScore ? 'down' : 'flat')
    : null;

  return (
    <div className="border border-slate-200 rounded-xl bg-surface overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <span className="w-9 h-9 rounded-md bg-brand-50 text-brand-600 grid place-items-center shrink-0">
          <FileText className="w-4 h-4" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[15px] font-semibold text-slate-900">
              {t('irrSummary.title', { defaultValue: "IRR — Reabilitatsiya rejasi" })}
            </h3>
            <StatusBadge status={irr.status} t={t} />
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {t('irrSummary.subtitle', { defaultValue: "12 oylik klinik reja. Tarbiyachi yuritadi, Direktor imzo qo'yadi." })}
          </p>
        </div>
        {latest && (
          <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-brand-50 rounded-md">
            <span className="text-[13px] font-bold text-slate-900 tnum">{latest.totalScore}/{max ?? '—'}</span>
            {trend === 'up' && <TrendingUp className="w-4 h-4 text-success-600" />}
            {trend === 'down' && <TrendingDown className="w-4 h-4 text-error-500" />}
            {trend === 'flat' && <Minus className="w-4 h-4 text-slate-400" />}
          </div>
        )}
      </div>

      {/* Score progression */}
      {sessions.length > 0 && (
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-3">
            {t('irrSummary.progression', { defaultValue: 'Baholash bosqichlari' })}
          </p>
          <div className="space-y-2">
            {sessions.slice(-5).map((s) => <SessionBar key={s.id} session={s} max={max} />)}
          </div>
        </div>
      )}

      {/* Long-term goals */}
      {longTermGoals.length > 0 && (
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-3 flex items-center gap-1.5">
            <Target className="w-3 h-3" />
            {t('irrSummary.longTermGoals', { defaultValue: 'Uzoq muddatli maqsadlar' })}
            <span className="text-slate-400">({longTermGoals.length})</span>
          </p>
          <div className="space-y-2">
            {longTermGoals.map((g) => (
              <div key={g.id} className="text-[13px] text-slate-700">
                {g.skillArea && (
                  <span className="inline-block px-1.5 py-0.5 mr-2 rounded text-[10px] font-medium bg-brand-50 text-brand-700">
                    {g.skillArea}
                  </span>
                )}
                {g.goal}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Periods */}
      {periods.length > 0 && (
        <div className="px-5 py-4">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-3 flex items-center gap-1.5">
            <CalendarCheck className="w-3 h-3" />
            {t('irrSummary.periods', { defaultValue: 'Choraklar' })}
            <span className="text-slate-400">({periods.length})</span>
          </p>
          <div className="space-y-2">
            {periods.map((p) => {
              const stgCount = shortTermGoals.filter(s => s.periodId === p.id).length;
              const teacherSigned = !!p.teacherSignedAt;
              const managerSigned = !!p.managerSignedAt;
              const fullySigned = teacherSigned && managerSigned;
              return (
                <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-md bg-slate-50 border border-slate-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-slate-900">
                      {p.title || `Q${p.quarter || ''}`}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                      <span>{stgCount} {t('irrSummary.stgs', { defaultValue: 'qisqa muddatli maqsad' })}</span>
                      {teacherSigned && (
                        <span className="inline-flex items-center gap-0.5 text-success-600">
                          <CheckCircle2 className="w-3 h-3" />
                          {t('irrSummary.signedTeacher', { defaultValue: 'Tarbiyachi' })}
                        </span>
                      )}
                      {managerSigned && (
                        <span className="inline-flex items-center gap-0.5 text-success-600">
                          <CheckCircle2 className="w-3 h-3" />
                          {t('irrSummary.signedDirector', { defaultValue: 'Direktor' })}
                        </span>
                      )}
                    </div>
                  </div>
                  {onSignPeriod && teacherSigned && !managerSigned && (
                    <button
                      type="button"
                      onClick={() => handleSign(p)}
                      disabled={signingId === p.id}
                      className="px-3 py-1.5 rounded-md text-[12px] font-medium bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      {signingId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                      {t('irrSummary.signAsDirector', { defaultValue: "Direktor sifatida imzo qo'yish" })}
                    </button>
                  )}
                  {fullySigned && (
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default IRRSummary;
