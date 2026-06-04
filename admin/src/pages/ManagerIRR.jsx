import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, CheckCircle2, PenLine, AlertCircle, PlusCircle, Trash2 } from 'lucide-react';
import api from '../services/api';
import { useToast } from '@shared/context/ToastContext';
import { QUARTERLY_JOURNAL_ITEMS } from '@shared/config/quarterlyJournalItems';

// ── Quarterly section config ──────────────────────────────────────────────────
// formKey  → JSONB column name sent to backend
// configKey → key in QUARTERLY_JOURNAL_ITEMS

const SECTION_MAP = [
  { formKey: 'infoSystemData',    configKey: 'infoSystem',    labelKey: 'managerIrr.sectionInfoSystem' },
  { formKey: 'parentWorkData',    configKey: 'parentWork',    labelKey: 'managerIrr.sectionParentWork' },
  { formKey: 'documentationData', configKey: 'documentation', labelKey: 'managerIrr.sectionDocumentation' },
  { formKey: 'careQualityData',   configKey: 'careQuality',   labelKey: 'managerIrr.sectionCareQuality' },
  { formKey: 'conditionsData',    configKey: 'conditions',    labelKey: 'managerIrr.sectionConditions' },
];

const buildEmptySectionChecks = (items) =>
  items.reduce((acc, item) => ({ ...acc, [item.code]: false }), {});

const EMPTY_QUARTERLY = {
  quarterStart: '',
  quarterEnd: '',
  infoSystemData:    buildEmptySectionChecks(QUARTERLY_JOURNAL_ITEMS.infoSystem),
  parentWorkData:    buildEmptySectionChecks(QUARTERLY_JOURNAL_ITEMS.parentWork),
  documentationData: buildEmptySectionChecks(QUARTERLY_JOURNAL_ITEMS.documentation),
  careQualityData:   buildEmptySectionChecks(QUARTERLY_JOURNAL_ITEMS.careQuality),
  conditionsData:    buildEmptySectionChecks(QUARTERLY_JOURNAL_ITEMS.conditions),
  departures: [],
  notes: '',
};

// ── Goal-period signature tab ─────────────────────────────────────────────────

const fmt = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('uz-UZ', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

const ChildPeriodRow = ({ child, onSigned }) => {
  const { t } = useTranslation();
  const { error: showError, success: showSuccess } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [noIrr, setNoIrr] = useState(false);
  const [signing, setSigning] = useState(null);

  const loadPeriods = useCallback(async () => {
    if (loaded) return;
    setLoading(true);
    try {
      let irrRes;
      try {
        irrRes = await api.get(`/teacher/children/${child.id}/irr`);
      } catch (err) {
        if (err.response?.status === 404) { setNoIrr(true); setLoaded(true); return; }
        throw err;
      }
      const irrId = irrRes.data?.data?.id;
      const periodsRes = await api.get(`/teacher/irr/${irrId}/goal-periods`);
      setPeriods(periodsRes.data?.data ?? []);
      setLoaded(true);
    } catch {
      showError(t('managerIrr.loadPeriodsError', { defaultValue: 'Даврлар юкланмади' }));
    } finally {
      setLoading(false);
    }
  }, [child.id, loaded, showError, t]);

  const handleExpand = () => {
    if (!expanded) loadPeriods();
    setExpanded((v) => !v);
  };

  const handleSign = async (periodId) => {
    setSigning(periodId);
    try {
      const res = await api.post(`/teacher/goal-periods/${periodId}/sign`);
      const updated = res.data?.data;
      setPeriods((prev) => prev.map((p) => (p.id === periodId ? updated : p)));
      showSuccess(t('managerIrr.signSuccess', { defaultValue: 'Имзоланди' }));
      if (onSigned) onSigned(periodId);
    } catch {
      showError(t('managerIrr.signError', { defaultValue: 'Имзолашда хатолик' }));
    } finally {
      setSigning(null);
    }
  };

  return (
    <div data-testid={`child-row-${child.id}`} className="border border-warm-200 rounded-lg overflow-hidden">
      <button
        onClick={handleExpand}
        className="w-full flex items-center gap-3 px-4 py-3 bg-surface hover:bg-warm-50 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-warm-400 shrink-0" strokeWidth={1.75} />
        ) : (
          <ChevronRight className="w-4 h-4 text-warm-400 shrink-0" strokeWidth={1.75} />
        )}
        <span className="font-medium text-warm-900">
          {child.lastName} {child.firstName}
        </span>
        {child.class && (
          <span className="ml-auto text-xs text-warm-500">{child.class}</span>
        )}
      </button>

      {expanded && (
        <div className="border-t border-warm-100 bg-warm-50/30 px-4 py-3">
          {loading && (
            <p data-testid="periods-loading" className="text-sm text-warm-500 animate-pulse">
              {t('common.loading', { defaultValue: 'Юкланмоқда…' })}
            </p>
          )}
          {!loading && noIrr && (
            <p data-testid={`no-irr-${child.id}`} className="text-sm text-warm-500 italic">
              {t('managerIrr.noIrr', { defaultValue: 'ИРР ҳали яратилмаган' })}
            </p>
          )}
          {!loading && !noIrr && loaded && periods.length === 0 && (
            <p className="text-sm text-warm-500 italic">
              {t('managerIrr.noPeriods', { defaultValue: 'Мақсадли даврлар йўқ' })}
            </p>
          )}
          {!loading && periods.map((period) => {
            const managerSigned = !!period.managerSignedAt;
            const teacherSigned = !!period.teacherSignedAt;
            return (
              <div
                key={period.id}
                data-testid={`period-row-${period.id}`}
                className="flex items-center gap-3 py-2 border-b border-warm-100 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-warm-900">
                    {fmt(period.periodStart)} — {fmt(period.periodEnd)}
                  </p>
                  <div className="flex gap-4 mt-0.5">
                    <span className={`text-xs flex items-center gap-1 ${teacherSigned ? 'text-success-600' : 'text-warm-400'}`}>
                      <CheckCircle2 className="w-3 h-3" strokeWidth={2} />
                      {t('managerIrr.teacherSign', { defaultValue: 'Ўқитувчи' })}
                      {teacherSigned ? '' : ` — ${t('managerIrr.pending', { defaultValue: 'кутилмоқда' })}`}
                    </span>
                    <span
                      data-testid={`manager-sign-status-${period.id}`}
                      className={`text-xs flex items-center gap-1 ${managerSigned ? 'text-success-600' : 'text-warning-600'}`}
                    >
                      <CheckCircle2 className="w-3 h-3" strokeWidth={2} />
                      {t('managerIrr.managerSign', { defaultValue: 'Раҳбар' })}
                      {managerSigned ? '' : ` — ${t('managerIrr.pending', { defaultValue: 'кутилмоқда' })}`}
                    </span>
                  </div>
                </div>
                {!managerSigned && (
                  <button
                    data-testid={`sign-btn-${period.id}`}
                    onClick={() => handleSign(period.id)}
                    disabled={signing === period.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-600 text-white text-xs font-medium hover:bg-brand-700 disabled:opacity-60 transition-colors"
                  >
                    <PenLine className="w-3.5 h-3.5" strokeWidth={2} />
                    {signing === period.id
                      ? t('common.saving', { defaultValue: '…' })
                      : t('managerIrr.sign', { defaultValue: 'Имзолаш' })}
                  </button>
                )}
                {managerSigned && (
                  <span data-testid={`signed-badge-${period.id}`} className="flex items-center gap-1 text-xs text-success-600 font-medium">
                    <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
                    {t('managerIrr.signed', { defaultValue: 'Имзоланган' })}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Quarterly monitoring tab ──────────────────────────────────────────────────

const QuarterlyTab = () => {
  const { t } = useTranslation();
  const { error: showError, success: showSuccess } = useToast();
  const [form, setForm] = useState(EMPTY_QUARTERLY);
  const [submitting, setSubmitting] = useState(false);
  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);

  const fetchEntries = useCallback(async () => {
    setLoadingEntries(true);
    try {
      const res = await api.get('/admin/irr/quarterly-entries');
      setEntries(res.data?.data ?? []);
    } catch {
      showError(t('managerIrr.quarterlyLoadError', { defaultValue: 'Чоракли ёзувлар юкланмади' }));
    } finally {
      setLoadingEntries(false);
    }
  }, [showError, t]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const toggleCheck = (sectionKey, code) => {
    setForm((f) => ({
      ...f,
      [sectionKey]: { ...f[sectionKey], [code]: !f[sectionKey][code] },
    }));
  };

  const addDeparture = () => {
    setForm((f) => ({
      ...f,
      departures: [...f.departures, { name: '', admitDate: '', departDate: '', reason: '' }],
    }));
  };

  const removeDeparture = (idx) => {
    setForm((f) => ({ ...f, departures: f.departures.filter((_, i) => i !== idx) }));
  };

  const updateDeparture = (idx, field, value) => {
    setForm((f) => ({
      ...f,
      departures: f.departures.map((d, i) => i === idx ? { ...d, [field]: value } : d),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.quarterStart || !form.quarterEnd) {
      showError(t('managerIrr.quarterlyDatesRequired', { defaultValue: 'Бошланиш ва тугаш санасини киритинг' }));
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/admin/irr/quarterly-entries', {
        quarterStart: form.quarterStart,
        quarterEnd:   form.quarterEnd,
        infoSystemData:    form.infoSystemData,
        parentWorkData:    form.parentWorkData,
        documentationData: form.documentationData,
        careQualityData:   form.careQualityData,
        conditionsData:    form.conditionsData,
        departures: form.departures,
        notes:      form.notes || null,
      });
      showSuccess(t('managerIrr.quarterlySubmitSuccess', { defaultValue: 'Чоракли ҳисобот сақланди' }));
      setForm(EMPTY_QUARTERLY);
      fetchEntries();
    } catch (err) {
      if (err.response?.status === 409) {
        showError(t('managerIrr.quarterlyDuplicate', { defaultValue: 'Бу чорак учун ёзув аллақачон мавжуд' }));
      } else {
        showError(t('managerIrr.quarterlySubmitError', { defaultValue: 'Хатолик юз берди' }));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div data-testid="quarterly-tab">
      {/* Form */}
      <form onSubmit={handleSubmit} data-testid="quarterly-form" className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-warm-700 mb-1">
              {t('managerIrr.quarterStart', { defaultValue: 'Чорак бошланиши' })}
            </label>
            <input
              type="date"
              data-testid="quarter-start"
              value={form.quarterStart}
              onChange={(e) => setForm((f) => ({ ...f, quarterStart: e.target.value }))}
              className="w-full border border-warm-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-warm-700 mb-1">
              {t('managerIrr.quarterEnd', { defaultValue: 'Чорак тугаши' })}
            </label>
            <input
              type="date"
              data-testid="quarter-end"
              value={form.quarterEnd}
              onChange={(e) => setForm((f) => ({ ...f, quarterEnd: e.target.value }))}
              className="w-full border border-warm-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600"
              required
            />
          </div>
        </div>

        {/* 5 JSONB sections — structured 52-item checklist (OQ-10: parentWork count provisional) */}
        {SECTION_MAP.map(({ formKey, configKey, labelKey }) => (
          <div key={formKey}>
            <h4 className="text-sm font-semibold text-warm-800 mb-2">
              {t(labelKey, { defaultValue: labelKey })}
            </h4>
            <div data-testid={`section-${formKey}`} className="space-y-1.5 bg-warm-50 rounded-lg p-3">
              {QUARTERLY_JOURNAL_ITEMS[configKey].map((item) => (
                <label key={item.code} className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    data-testid={`item-${item.code}`}
                    checked={!!form[formKey][item.code]}
                    onChange={() => toggleCheck(formKey, item.code)}
                    className="mt-0.5 h-4 w-4 rounded border-warm-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-warm-800">{item.textUz}</span>
                </label>
              ))}
            </div>
          </div>
        ))}

        {/* Departures */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-warm-800">
              {t('managerIrr.departures', { defaultValue: 'Чиқиб кетганлар' })}
            </label>
            <button
              type="button"
              data-testid="add-departure"
              onClick={addDeparture}
              className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
            >
              <PlusCircle className="w-4 h-4" strokeWidth={2} />
              {t('managerIrr.addDeparture', { defaultValue: 'Қўшиш' })}
            </button>
          </div>
          {form.departures.length === 0 && (
            <p className="text-xs text-warm-400 italic">
              {t('managerIrr.noDepartures', { defaultValue: 'Чиқиб кетганлар йўқ' })}
            </p>
          )}
          {form.departures.map((dep, idx) => (
            <div key={idx} data-testid={`departure-row-${idx}`} className="grid grid-cols-4 gap-2 mb-2 items-center">
              <input
                type="text"
                placeholder={t('managerIrr.departureName', { defaultValue: 'Исм' })}
                value={dep.name}
                onChange={(e) => updateDeparture(idx, 'name', e.target.value)}
                className="border border-warm-300 rounded px-2 py-1.5 text-sm"
              />
              <input
                type="date"
                value={dep.admitDate}
                onChange={(e) => updateDeparture(idx, 'admitDate', e.target.value)}
                className="border border-warm-300 rounded px-2 py-1.5 text-sm"
              />
              <input
                type="date"
                value={dep.departDate}
                onChange={(e) => updateDeparture(idx, 'departDate', e.target.value)}
                className="border border-warm-300 rounded px-2 py-1.5 text-sm"
              />
              <div className="flex gap-1">
                <input
                  type="text"
                  placeholder={t('managerIrr.departureReason', { defaultValue: 'Сабаб' })}
                  value={dep.reason}
                  onChange={(e) => updateDeparture(idx, 'reason', e.target.value)}
                  className="flex-1 border border-warm-300 rounded px-2 py-1.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeDeparture(idx)}
                  className="p-1.5 text-error-500 hover:text-error-700"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={2} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* General notes */}
        <div>
          <label className="block text-sm font-medium text-warm-700 mb-1">
            {t('managerIrr.generalNotes', { defaultValue: 'Умумий эзгу' })}
          </label>
          <textarea
            data-testid="quarterly-notes"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2}
            className="w-full border border-warm-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600 resize-y"
          />
        </div>

        <button
          type="submit"
          data-testid="quarterly-submit"
          disabled={submitting}
          className="px-5 py-2 bg-brand-600 text-white rounded-md text-sm font-medium hover:bg-brand-700 disabled:opacity-60 transition-colors"
        >
          {submitting
            ? t('common.saving', { defaultValue: 'Сақланмоқда…' })
            : t('managerIrr.quarterlySubmit', { defaultValue: 'Ҳисоботни сақлаш' })}
        </button>
      </form>

      {/* History */}
      <div className="mt-8">
        <h3 className="text-sm font-semibold text-warm-800 mb-3">
          {t('managerIrr.quarterlyHistory', { defaultValue: 'Олдинги ҳисоботлар' })}
        </h3>
        {loadingEntries && (
          <p className="text-sm text-warm-400 animate-pulse">
            {t('common.loading', { defaultValue: 'Юкланмоқда…' })}
          </p>
        )}
        {!loadingEntries && entries.length === 0 && (
          <p data-testid="quarterly-empty" className="text-sm text-warm-400 italic">
            {t('managerIrr.quarterlyNoEntries', { defaultValue: 'Ҳисоботлар мавжуд эмас' })}
          </p>
        )}
        {!loadingEntries && entries.map((entry) => (
          <div
            key={entry.id}
            data-testid={`quarterly-entry-${entry.id}`}
            className="border border-warm-200 rounded-lg px-4 py-3 mb-2 bg-surface"
          >
            <p className="text-sm font-medium text-warm-900">
              {fmt(entry.quarterStart)} — {fmt(entry.quarterEnd)}
            </p>
            {entry.notes && (
              <p className="text-xs text-warm-600 mt-1">{entry.notes}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

const ManagerIRR = () => {
  const { t } = useTranslation();
  const { error: showError } = useToast();
  const [tab, setTab] = useState('periods');
  const [children, setChildren] = useState([]);
  const [childrenLoading, setChildrenLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get('/teacher/children')
      .then((res) => {
        if (!cancelled) setChildren(res.data?.data ?? []);
      })
      .catch(() => {
        if (!cancelled) showError(t('managerIrr.childrenLoadError', { defaultValue: 'Болалар рўйхати юкланмади' }));
      })
      .finally(() => {
        if (!cancelled) setChildrenLoading(false);
      });
    return () => { cancelled = true; };
  }, [showError, t]);

  return (
    <div data-testid="manager-irr-page" className="max-w-4xl mx-auto px-4 py-6">
      <div className="letterhead pt-4 mb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-brand-700">
          {t('managerIrr.eyebrow', { defaultValue: 'Hisobotlar' })}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-warm-900">
          {t('managerIrr.title', { defaultValue: 'IRR boshqaruvi — Rahbar' })}
        </h1>
        <p className="text-sm text-warm-600 mt-1">
          {t('managerIrr.subtitle', { defaultValue: 'Maqsadli davrlarni imzolash va chorakli monitoring' })}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-warm-200 mb-6">
        {[
          { key: 'periods',   label: t('managerIrr.tabPeriods',   { defaultValue: 'Мақсадли даврлар' }) },
          { key: 'quarterly', label: t('managerIrr.tabQuarterly', { defaultValue: 'Чоракли мониторинг' }) },
        ].map(({ key, label }) => (
          <button
            key={key}
            data-testid={`tab-${key}`}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-warm-500 hover:text-warm-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Periods tab */}
      {tab === 'periods' && (
        <div data-testid="periods-tab">
          {childrenLoading && (
            <p data-testid="children-loading" className="text-sm text-warm-400 animate-pulse">
              {t('common.loading', { defaultValue: 'Юкланмоқда…' })}
            </p>
          )}
          {!childrenLoading && children.length === 0 && (
            <div data-testid="no-children" className="flex items-center gap-2 text-sm text-warm-500">
              <AlertCircle className="w-4 h-4" strokeWidth={1.75} />
              {t('managerIrr.noChildren', { defaultValue: 'Болалар рўйхати бўш' })}
            </div>
          )}
          <div className="space-y-2">
            {children.map((child) => (
              <ChildPeriodRow key={child.id} child={child} />
            ))}
          </div>
        </div>
      )}

      {/* Quarterly tab */}
      {tab === 'quarterly' && <QuarterlyTab />}
    </div>
  );
};

export default ManagerIRR;
