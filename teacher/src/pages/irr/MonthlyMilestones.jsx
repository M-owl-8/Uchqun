// IRR-MONTHLY-MILESTONES (Option B) — per-long-term-goal 12-month panel.
//
// Two modes:
//   View   — read-only grid of months 1-12 (skipped months stay blank).
//   Edit   — 12 textareas, one per month; status pills; save all in bulk.
//
// Reuses /api/v1/teacher/long-term-goals/:ltgId/monthly-milestones (GET list,
// PUT bulk replace). Inline status changes go through PATCH for one-row save.

import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Edit2, Save, Loader2 } from 'lucide-react';
import api from '../../shared/services/api';

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

const STATUS_STYLE = {
  planned:  { bg: '#F1F2F4', color: '#6F7585', borderColor: '#DDE0E6' },
  achieved: { bg: '#E2F0E8', color: '#4F8C72', borderColor: '#A8D2BC' },
  partial:  { bg: '#FBF3E4', color: '#8E6314', borderColor: '#F0DBA8' },
  missed:   { bg: '#FBE5E5', color: '#A04141', borderColor: '#F4BCBC' },
};

const StatusPill = ({ status, onClick }) => {
  const { t } = useTranslation();
  const s = STATUS_STYLE[status] || STATUS_STYLE.planned;
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2 py-0.5 rounded-full text-[10px] font-medium border"
      style={{ background: s.bg, color: s.color, borderColor: s.borderColor }}
    >
      {t(`irr.monthlyMilestones.status.${status}`, { defaultValue: status })}
    </button>
  );
};

const MonthlyMilestones = ({ longTermGoalId, isReadOnly = false }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [editing, setEditing]   = useState(false);
  const [milestones, setMilestones] = useState([]);
  const [drafts, setDrafts]     = useState({}); // month → { targetText, status, actualText, notes }
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState(null);

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/teacher/long-term-goals/${longTermGoalId}/monthly-milestones`, { signal });
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      setMilestones(list);
      const next = {};
      list.forEach(m => {
        next[m.monthNumber] = {
          targetText: m.targetText || '',
          status:     m.status || 'planned',
          actualText: m.actualText || '',
          notes:      m.notes || '',
        };
      });
      setDrafts(next);
    } catch (err) {
      if (err.code === 'ERR_CANCELED') return;
      const code = err?.response?.data?.error?.code;
      setError(code === 'MONTHLY_MILESTONE_LTG_NOT_ACCESSIBLE'
        ? t('irr.monthlyMilestones.notAccessible', { defaultValue: 'Bu uzoq muddatli maqsad mavjud emas.' })
        : t('irr.monthlyMilestones.loadFailed', { defaultValue: "Oylik maqsadlarni yuklab boʻlmadi" }));
    } finally {
      setLoading(false);
    }
  }, [longTermGoalId, t]);

  useEffect(() => {
    if (!expanded) return;
    const c = new AbortController();
    load(c.signal);
    return () => c.abort();
  }, [expanded, load]);

  const setDraft = (month, patch) => {
    setDrafts(prev => ({
      ...prev,
      [month]: { ...(prev[month] || { targetText: '', status: 'planned', actualText: '', notes: '' }), ...patch },
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = MONTHS
        .map(m => ({ monthNumber: m, ...(drafts[m] || {}) }))
        .filter(m => m.targetText && m.targetText.trim().length > 0);
      const res = await api.put(`/teacher/long-term-goals/${longTermGoalId}/monthly-milestones/bulk`, {
        milestones: payload,
      });
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      setMilestones(list);
      setEditing(false);
    } catch (err) {
      setError(t('irr.monthlyMilestones.saveFailed', { defaultValue: "Saqlab boʻlmadi" }));
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditing(false);
    // restore drafts from server state
    const next = {};
    milestones.forEach(m => {
      next[m.monthNumber] = {
        targetText: m.targetText || '',
        status:     m.status || 'planned',
        actualText: m.actualText || '',
        notes:      m.notes || '',
      };
    });
    setDrafts(next);
  };

  const filledCount = MONTHS.filter(m => drafts[m]?.targetText?.trim()).length;

  return (
    <div className="mt-2 border-t border-slate-100 pt-2" data-testid={`monthly-milestones-${longTermGoalId}`}>
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2 text-left text-[12px] text-slate-600 hover:text-slate-900"
      >
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        <span className="font-medium">
          {t('irr.monthlyMilestones.toggle', { defaultValue: 'Oylik nishonlar (12 oy)' })}
        </span>
        {!loading && milestones.length > 0 && (
          <span className="text-slate-400 text-[11px]">
            {milestones.length}/{MONTHS.length}
          </span>
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {loading && (
            <div className="text-[12px] text-slate-400 py-2">{t('irr.loading', { defaultValue: 'Yuklanmoqda…' })}</div>
          )}

          {!loading && !editing && (
            <>
              <div className="space-y-1.5">
                {MONTHS.map(m => {
                  const row = milestones.find(x => x.monthNumber === m);
                  const empty = !row;
                  return (
                    <div
                      key={m}
                      className={`rounded-md border px-3 py-2 ${empty ? 'border-dashed border-slate-200 bg-slate-50' : 'border-slate-200 bg-white'}`}
                      data-testid={`milestone-row-${m}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-[11px] font-semibold text-slate-500 shrink-0 w-12 mt-0.5">
                          {t('irr.monthlyMilestones.monthLabel', { count: m, defaultValue: `${m}-oy` })}
                        </span>
                        <div className="flex-1 min-w-0">
                          {empty ? (
                            <p className="text-[12px] text-slate-400 italic">
                              {t('irr.monthlyMilestones.empty', { defaultValue: 'Belgilanmagan' })}
                            </p>
                          ) : (
                            <>
                              <p className="text-[13px] text-slate-800">{row.targetText}</p>
                              {row.actualText && (
                                <p className="text-[12px] text-slate-500 mt-1">
                                  <span className="font-medium">{t('irr.monthlyMilestones.actualLabel', { defaultValue: 'Natija' })}: </span>
                                  {row.actualText}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                        {!empty && (
                          <div className="shrink-0">
                            <StatusPill status={row.status} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="h-8 px-3 rounded-md bg-brand-600 text-white text-[12px] font-medium inline-flex items-center gap-1.5"
                  data-testid="milestone-edit-btn"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  {t('irr.monthlyMilestones.edit', { defaultValue: 'Tahrirlash' })}
                </button>
              )}
            </>
          )}

          {!loading && editing && (
            <>
              <p className="text-[12px] text-slate-500 mb-1">
                {t('irr.monthlyMilestones.editHint', {
                  defaultValue: 'Har bir oy uchun bola qanday holatda boʻlishini yozing. Boʻsh qoldirilgan oylar saqlanmaydi.',
                })}
              </p>
              <div className="space-y-2">
                {MONTHS.map(m => {
                  const d = drafts[m] || { targetText: '', status: 'planned', actualText: '', notes: '' };
                  return (
                    <div key={m} className="rounded-md border border-slate-200 bg-white p-3" data-testid={`milestone-edit-${m}`}>
                      <div className="flex items-start gap-3">
                        <span className="text-[11px] font-semibold text-slate-500 shrink-0 w-12 mt-1">
                          {t('irr.monthlyMilestones.monthLabel', { count: m, defaultValue: `${m}-oy` })}
                        </span>
                        <div className="flex-1 space-y-2">
                          <textarea
                            rows={2}
                            value={d.targetText}
                            onChange={e => setDraft(m, { targetText: e.target.value })}
                            placeholder={t('irr.monthlyMilestones.targetPlaceholder', { defaultValue: `Bola ${m}-oyda…` })}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-[13px] focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            data-testid={`milestone-target-${m}`}
                          />
                          <div className="flex items-center gap-2 flex-wrap">
                            <select
                              value={d.status || 'planned'}
                              onChange={e => setDraft(m, { status: e.target.value })}
                              className="px-2 py-1 border border-slate-200 rounded text-[12px]"
                              data-testid={`milestone-status-${m}`}
                            >
                              <option value="planned">{t('irr.monthlyMilestones.status.planned', { defaultValue: 'Rejalashtirilgan' })}</option>
                              <option value="achieved">{t('irr.monthlyMilestones.status.achieved', { defaultValue: 'Erishildi' })}</option>
                              <option value="partial">{t('irr.monthlyMilestones.status.partial', { defaultValue: 'Qisman' })}</option>
                              <option value="missed">{t('irr.monthlyMilestones.status.missed', { defaultValue: 'Bajarilmadi' })}</option>
                            </select>
                            {(d.status === 'achieved' || d.status === 'partial' || d.status === 'missed') && (
                              <input
                                type="text"
                                value={d.actualText}
                                onChange={e => setDraft(m, { actualText: e.target.value })}
                                placeholder={t('irr.monthlyMilestones.actualPlaceholder', { defaultValue: 'Aslida nima yuz berdi?' })}
                                className="flex-1 min-w-[160px] px-2 py-1 border border-slate-200 rounded text-[12px]"
                                data-testid={`milestone-actual-${m}`}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {error && (
                <div className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSaveAll}
                  disabled={saving}
                  className="h-8 px-3 rounded-md bg-brand-600 text-white text-[12px] font-medium disabled:opacity-50 inline-flex items-center gap-1.5"
                  data-testid="milestone-save-btn"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {t('irr.monthlyMilestones.saveAll', { defaultValue: 'Hammasini saqlash' })}
                  <span className="text-white/70">({filledCount}/12)</span>
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="h-8 px-3 rounded-md border border-slate-200 text-[12px] text-slate-600"
                  data-testid="milestone-cancel-btn"
                >
                  {t('irr.monthlyMilestones.cancel', { defaultValue: 'Bekor' })}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MonthlyMilestones;
