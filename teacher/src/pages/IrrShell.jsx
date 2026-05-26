import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import api from '../shared/services/api';
import { useToast } from '../shared/context/ToastContext';
import { ASSESSMENT_CRITERIA, MAX_SCORE } from '@shared/config/assessmentCriteria';

// Must match HEADER_FIELDS in backend/controllers/teacher/irrController.js
const MANDATORY_FIELDS = [
  'childFullName', 'dateOfBirth', 'ageAtAssessmentStart',
  'ptpkIntakeDate', 'ptpkConclusionDate', 'ptpkConclusionNumber',
  'ptpkDiagnosis', 'irrStartDate', 'additionalInfo',
];

// Uzbek labels for missing-field error display (backend returns field names in detail)
const FIELD_LABELS_UZ = {
  childFullName:        'Боланинг фамилияси, исми',
  dateOfBirth:          'Туғилган санаси',
  ageAtAssessmentStart: 'Текширув бошланган вақтдаги ёш',
  ptpkIntakeDate:       'ПТПКга келиб тушган сана',
  ptpkConclusionDate:   'ПТПК хулосаси санаси',
  ptpkConclusionNumber: 'ПТПК рўйхатдан ўтказиш рақами',
  ptpkDiagnosis:        'ПТПК ташхиси',
  irrStartDate:         'ИРР бошланган сана',
  additionalInfo:       'Қўшимча маълумотлар',
};

// Session type Uzbek labels (IRR-SPECIFICATION.md Part A-3a)
const SESSION_TYPE_LABELS = {
  intake: 'Кундузги парвариш хизматига қабул қилинганда',
  '3mo':  '3 ойдан кейин',
  '6mo':  '6 ойдан кейин',
  '9mo':  '9 ойдан кейин',
  '12mo': '12 ойдан кейин',
  custom: 'Бошқа сана',
};

const EMPTY_FORM = {
  childFullName: '', dateOfBirth: '', ageAtAssessmentStart: '',
  ptpkIntakeDate: '', ptpkConclusionDate: '', ptpkConclusionNumber: '',
  ptpkDiagnosis: '', ptpkNotes: '', irrStartDate: '', additionalInfo: '',
  childStrengths: '', riskFactors: '',
};

function irrToForm(data) {
  return {
    childFullName:        data.childFullName        || '',
    dateOfBirth:          data.dateOfBirth          || '',
    ageAtAssessmentStart: data.ageAtAssessmentStart || '',
    ptpkIntakeDate:       data.ptpkIntakeDate       || '',
    ptpkConclusionDate:   data.ptpkConclusionDate   || '',
    ptpkConclusionNumber: data.ptpkConclusionNumber || '',
    ptpkDiagnosis:        data.ptpkDiagnosis        || '',
    ptpkNotes:            data.ptpkNotes            || '',
    irrStartDate:         data.irrStartDate         || '',
    additionalInfo:       data.additionalInfo       || '',
    childStrengths:       data.childStrengths       || '',
    riskFactors:          data.riskFactors          || '',
  };
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('uz-UZ', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function StatusBadge({ status }) {
  const cfg = {
    draft:    { label: 'Qoralama',    bg: '#FBF3E4', color: '#8E6314', border: '#F0DBA8' },
    active:   { label: 'Faol',        bg: '#E2F0E8', color: '#4F8C72', border: '#A8D2BC' },
    archived: { label: 'Arxivlangan', bg: '#F1F2F4', color: '#6F7585', border: '#DDE0E6' },
  }[status] || { label: status, bg: '#F1F2F4', color: '#6F7585', border: '#DDE0E6' };

  return (
    <span
      className="px-3 py-1 rounded-full text-[12px] font-semibold"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      {cfg.label}
    </span>
  );
}

function FieldRow({ label, required, children }) {
  return (
    <div className="space-y-1">
      <label className="block text-[13px] font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full h-9 px-3 rounded-md border border-slate-200 text-[14px] text-slate-900 bg-white ' +
  'focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-colors ' +
  'disabled:bg-slate-50 disabled:text-slate-400';

const textareaCls =
  'w-full px-3 py-2 rounded-md border border-slate-200 text-[14px] text-slate-900 bg-white ' +
  'focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-colors ' +
  'resize-none disabled:bg-slate-50 disabled:text-slate-400';

export default function IrrShell() {
  const { id } = useParams();
  const { success, error: showError } = useToast();

  // ── Header form state ────────────────────────────────────────────────────
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [activating, setActivating] = useState(false);
  const [irr, setIrr]               = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [activateError, setActivateError] = useState(null);

  // ── Assessment session state (Phase 3b) ──────────────────────────────────
  const [sessions, setSessions]           = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [scores, setScores]               = useState(() => Array(17).fill(null));
  const [sessionType, setSessionType]     = useState('intake');
  const [completedAt, setCompletedAt]     = useState(todayIso);
  const [isHearingImpaired, setIsHearingImpaired] = useState(false);
  const [sessionNotes, setSessionNotes]   = useState('');
  const [submittingSession, setSubmittingSession] = useState(false);
  const [sessionError, setSessionError]   = useState(null);

  // ── IRR load ─────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const res = await api.get(`/teacher/children/${id}/irr`);
      const data = res.data?.data;
      setIrr(data || null);
      if (data) setForm(irrToForm(data));
    } catch (err) {
      if (err.response?.status !== 404) {
        showError('ИРР yuklanmadi. Qayta urinib ko\'ring.');
      }
      setIrr(null);
    } finally {
      setLoading(false);
    }
  }, [id, showError]);

  useEffect(() => { load(); }, [load]);

  // ── Sessions load (fires when irr.id is set/changes) ────────────────────
  const loadSessions = useCallback(async (irrId) => {
    if (!irrId) return;
    setLoadingSessions(true);
    try {
      const res = await api.get(`/teacher/irr/${irrId}/assessment-sessions`);
      setSessions(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch {
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  const irrId = irr?.id;
  useEffect(() => {
    if (irrId) loadSessions(irrId);
  }, [irrId, loadSessions]);

  // ── Header form handlers ─────────────────────────────────────────────────
  const handleChange = useCallback((field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    if (activateError) setActivateError(null);
  }, [activateError]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      if (!irr) {
        const res = await api.post(`/teacher/children/${id}/irr`, form);
        const created = res.data?.data;
        setIrr(created);
        if (created) setForm(irrToForm(created));
        success('ИРР yaratildi');
      } else {
        await api.patch(`/teacher/irr/${irr.id}`, form);
        success('ИРР saqlandi');
        await load();
      }
    } catch {
      showError('Saqlashda xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  }, [irr, id, form, success, showError, load]);

  const handleActivate = useCallback(async () => {
    if (!irr) return;
    setActivating(true);
    setActivateError(null);
    try {
      await api.post(`/teacher/irr/${irr.id}/activate`);
      success('ИРР faollashtirildi!');
      await load();
    } catch (err) {
      const code   = err.response?.data?.error?.code;
      const detail = err.response?.data?.error?.detail || '';
      if (code === 'IRR_HEADER_INCOMPLETE') {
        const raw           = detail.replace(/^Missing:\s*/i, '');
        const missingKeys   = raw.split(',').map(s => s.trim()).filter(Boolean);
        const missingLabels = missingKeys.map(k => FIELD_LABELS_UZ[k] || k);
        setActivateError(missingLabels.length ? missingLabels : ['Majburiy maydonlar to\'ldirilmagan']);
        showError('Barcha majburiy maydonlarni to\'ldiring');
      } else if (code === 'IRR_INVALID_STATUS') {
        showError('ИРР allaqachon faol yoki arxivlangan');
      } else {
        showError('Faollashtirishda xatolik yuz berdi');
      }
    } finally {
      setActivating(false);
    }
  }, [irr, success, showError, load]);

  // ── Assessment session handlers (Phase 3b) ───────────────────────────────
  const handleScoreChange = useCallback((criterionIndex, score) => {
    setScores(prev => {
      const next = [...prev];
      next[criterionIndex] = score;
      return next;
    });
    if (sessionError) setSessionError(null);
  }, [sessionError]);

  const handleSubmitSession = useCallback(async () => {
    if (!irr) return;
    setSubmittingSession(true);
    setSessionError(null);
    try {
      await api.post(`/teacher/irr/${irr.id}/assessment-sessions`, {
        sessionType,
        scores,
        isHearingImpaired,
        notes: sessionNotes,
        completedAt,
      });
      success('Баҳолаш натижалари сақланди');
      setScores(Array(17).fill(null));
      setSessionNotes('');
      await loadSessions(irr.id);
    } catch (err) {
      const code = err.response?.data?.error?.code;
      if (code === 'ASSESSMENT_SESSION_EXISTS') {
        setSessionError('Бу турдаги баҳолаш аллақачон мавжуд. Бошқа турни танланг ёки "Бошқа сана"ни танланг.');
      } else if (code === 'ASSESSMENT_INCOMPLETE') {
        setSessionError('Барча 17 та мезонни баҳоланг.');
      } else {
        setSessionError('Сақлашда хато юз берди. Қайта уриниб кўринг.');
      }
    } finally {
      setSubmittingSession(false);
    }
  }, [irr, sessionType, scores, isHearingImpaired, sessionNotes, completedAt, success, loadSessions]);

  // ── Derived values ────────────────────────────────────────────────────────
  const liveScore = scores.reduce((sum, s) => sum + (s !== null ? s : 0), 0);
  const allScored = scores.every(s => s !== null);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-3 max-w-2xl mx-auto">
        <div className="skel h-5 rounded w-36" />
        <div className="skel h-20 rounded-2xl" />
        <div className="skel h-96 rounded-xl" />
      </div>
    );
  }

  const isReadOnly = irr?.status === 'archived';

  return (
    <div className="max-w-2xl mx-auto space-y-5" data-testid="irr-shell">
      {/* Back */}
      <Link
        to={`/teacher/children/${id}`}
        className="inline-flex items-center gap-1.5 text-[13px] text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={1.75} /> Bolaning sahifasi
      </Link>

      {/* Title + status */}
      <div className="rounded-2xl border border-slate-200 bg-surface shadow-sm p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-brand-600" strokeWidth={1.75} />
            <h1 className="text-[20px] font-semibold text-slate-900">
              Индивидуал Ривожланиш Режаси
            </h1>
          </div>
          {irr && <StatusBadge status={irr.status} />}
        </div>
        {!irr && (
          <p className="mt-2 text-[13px] text-slate-500">
            Bola uchun yangi ИРР tuzing. Barcha majburiy maydonlarni{' '}
            (<span className="text-red-500">*</span>) to'ldiring va saqlang.
          </p>
        )}
      </div>

      {/* ─── Header form ─────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-surface shadow-sm divide-y divide-slate-100">
        <div className="px-5 py-4">
          <h2 className="text-[15px] font-semibold text-slate-900">Asosiy ma'lumotlar</h2>
          <p className="text-[12px] text-slate-500 mt-0.5">
            <span className="text-red-500">*</span> belgilangan maydonlar faollashtirish uchun majburiy
          </p>
        </div>

        <div className="px-5 py-5 space-y-4">
          <FieldRow label="Боланинг фамилияси, исми" required>
            <input
              type="text"
              className={inputCls}
              value={form.childFullName}
              onChange={handleChange('childFullName')}
              placeholder="Yusupov Zafar Bobir o'g'li"
              disabled={isReadOnly}
            />
          </FieldRow>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldRow label="Туғилган санаси" required>
              <input
                type="date"
                className={inputCls}
                value={form.dateOfBirth}
                onChange={handleChange('dateOfBirth')}
                disabled={isReadOnly}
              />
            </FieldRow>
            <FieldRow label="Текширув бошланган вақтдаги ёш" required>
              <input
                type="text"
                className={inputCls}
                value={form.ageAtAssessmentStart}
                onChange={handleChange('ageAtAssessmentStart')}
                placeholder="5 yosh 3 oy"
                disabled={isReadOnly}
              />
            </FieldRow>
          </div>

          <FieldRow label="ПТПКга келиб тушган сана" required>
            <input
              type="date"
              className={inputCls}
              value={form.ptpkIntakeDate}
              onChange={handleChange('ptpkIntakeDate')}
              disabled={isReadOnly}
            />
          </FieldRow>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldRow label="ПТПК хулосаси санаси" required>
              <input
                type="date"
                className={inputCls}
                value={form.ptpkConclusionDate}
                onChange={handleChange('ptpkConclusionDate')}
                disabled={isReadOnly}
              />
            </FieldRow>
            <FieldRow label="ПТПК рўйхатдан ўтказиш рақами" required>
              <input
                type="text"
                className={inputCls}
                value={form.ptpkConclusionNumber}
                onChange={handleChange('ptpkConclusionNumber')}
                placeholder="PKT-001"
                disabled={isReadOnly}
              />
            </FieldRow>
          </div>

          <FieldRow label="ПТПК ташхиси" required>
            <textarea
              rows={2}
              className={textareaCls}
              value={form.ptpkDiagnosis}
              onChange={handleChange('ptpkDiagnosis')}
              placeholder="F84.0 — Autizm..."
              disabled={isReadOnly}
            />
          </FieldRow>

          {/* ptpkNotes — optional (NOT in HEADER_FIELDS gate) */}
          <FieldRow label="ПТПК изоҳи">
            <textarea
              rows={2}
              className={textareaCls}
              value={form.ptpkNotes}
              onChange={handleChange('ptpkNotes')}
              placeholder="ПТПК qo'shimcha izohlari..."
              disabled={isReadOnly}
            />
          </FieldRow>

          <FieldRow label="ИРР бошланган сана" required>
            <input
              type="date"
              className={inputCls}
              value={form.irrStartDate}
              onChange={handleChange('irrStartDate')}
              disabled={isReadOnly}
            />
          </FieldRow>

          <FieldRow label="Қўшимча маълумотлар" required>
            <textarea
              rows={3}
              className={textareaCls}
              value={form.additionalInfo}
              onChange={handleChange('additionalInfo')}
              placeholder="Bola haqida qo'shimcha ma'lumotlar..."
              disabled={isReadOnly}
            />
          </FieldRow>
        </div>
      </div>

      {/* ─── Needs assessment (advisory — OQ-9) ──────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-surface shadow-sm divide-y divide-slate-100">
        <div className="px-5 py-4">
          <h2 className="text-[15px] font-semibold text-slate-900">Ehtiyojlarni baholash</h2>
          <p className="text-[12px] text-slate-500 mt-0.5">
            Majburiy emas — maqsadlar belgilashdan oldin to'ldirilishi tavsiya etiladi
          </p>
        </div>
        <div className="px-5 py-5 space-y-4">
          <FieldRow label="Боланинг кучли томонлари">
            <textarea
              rows={3}
              className={textareaCls}
              value={form.childStrengths}
              onChange={handleChange('childStrengths')}
              placeholder="Mustaqil ovqatlanadi, rasm chizishni yaxshi ko'radi..."
              disabled={isReadOnly}
            />
          </FieldRow>
          <FieldRow label="Бола билан боғлиқ хатар омиллари">
            <textarea
              rows={3}
              className={textareaCls}
              value={form.riskFactors}
              onChange={handleChange('riskFactors')}
              placeholder="Tutqanoq hujumlari, maxsus parvarish talab etadi..."
              disabled={isReadOnly}
            />
          </FieldRow>
        </div>
      </div>

      {/* ─── Activation error banner ──────────────────────────────────────────── */}
      {activateError && activateError.length > 0 && (
        <div
          className="rounded-lg border p-4"
          style={{ background: '#FEF2F2', borderColor: '#FECACA' }}
          data-testid="activate-error-banner"
        >
          <div className="text-[13px] font-semibold text-red-700 mb-2">
            Faollashtirishdan oldin quyidagi majburiy maydonlarni to'ldiring:
          </div>
          <ul className="list-disc list-inside space-y-0.5">
            {activateError.map(label => (
              <li key={label} className="text-[13px] text-red-600">{label}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ─── Action buttons ───────────────────────────────────────────────────── */}
      {!isReadOnly && (
        <div className="flex items-center gap-3 flex-wrap pb-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            data-testid="save-btn"
            className="h-9 px-4 rounded-md bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-surface text-[13px] font-medium transition-colors"
          >
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>

          {irr?.status === 'draft' && (
            <button
              type="button"
              onClick={handleActivate}
              disabled={activating}
              data-testid="activate-btn"
              className="h-9 px-4 rounded-md border text-[13px] font-medium transition-colors disabled:opacity-50"
              style={{ background: '#E2F0E8', color: '#4F8C72', borderColor: '#A8D2BC' }}
            >
              {activating ? 'Faollashtirilmoqda...' : 'ИРРни faollashtirish'}
            </button>
          )}
        </div>
      )}

      {/* ─── Assessment section (Phase 3b) ───────────────────────────────────── */}
      {irr && (
        <div
          className="rounded-xl border border-slate-200 bg-surface shadow-sm divide-y divide-slate-100"
          data-testid="assessment-section"
        >
          {/* Section header */}
          <div className="px-5 py-4">
            <h2 className="text-[15px] font-semibold text-slate-900">Баҳолаш натижалари</h2>
            <p className="text-[12px] text-slate-500 mt-0.5">
              17 та мезон бўйича баҳолаш (максимум {MAX_SCORE} балл)
            </p>
          </div>

          {/* Progression table */}
          {sessions.length > 0 && (
            <div className="px-5 py-4 overflow-x-auto">
              <table className="w-full text-[13px]" data-testid="progression-table">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="pb-2 pr-4 font-medium">Вақти</th>
                    <th className="pb-2 pr-4 font-medium">Баллар</th>
                    <th className="pb-2 font-medium">Сана</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sessions.map(sess => (
                    <tr key={sess.id}>
                      <td className="py-2 pr-4 text-slate-800">
                        {SESSION_TYPE_LABELS[sess.sessionType] ?? sess.sessionType}
                      </td>
                      <td className="py-2 pr-4 font-semibold text-slate-900">
                        {sess.totalScore} / {MAX_SCORE}
                      </td>
                      <td className="py-2 text-slate-500">{formatDate(sess.completedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {loadingSessions && sessions.length === 0 && (
            <div className="px-5 py-4 text-[13px] text-slate-400">Yuklanmoqda...</div>
          )}

          {/* New session form */}
          {!isReadOnly && (
            <div className="px-5 py-5 space-y-5">
              <h3 className="text-[14px] font-semibold text-slate-800">Yangi baholash</h3>

              {/* Session meta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldRow label="Баҳолаш тури" required>
                  <select
                    className={inputCls}
                    value={sessionType}
                    onChange={e => setSessionType(e.target.value)}
                    data-testid="session-type-select"
                  >
                    {Object.entries(SESSION_TYPE_LABELS).map(([v, label]) => (
                      <option key={v} value={v}>{label}</option>
                    ))}
                  </select>
                </FieldRow>
                <FieldRow label="Баҳолаш санаси" required>
                  <input
                    type="date"
                    className={inputCls}
                    value={completedAt}
                    onChange={e => setCompletedAt(e.target.value)}
                    data-testid="completed-at-input"
                  />
                </FieldRow>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hearing-impaired-check"
                  checked={isHearingImpaired}
                  onChange={e => setIsHearingImpaired(e.target.checked)}
                  data-testid="hearing-impaired-check"
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="hearing-impaired-check" className="text-[13px] text-slate-700 cursor-pointer">
                  Бола эшитиш қобилияти чекланган
                </label>
              </div>

              {/* Live score display */}
              <div
                className="flex items-center justify-between rounded-lg px-4 py-3"
                style={{ background: '#EEF2FF', border: '1px solid #C7D2FE' }}
              >
                <span className="text-[13px] text-slate-700">
                  Жорий баллар
                  {!allScored && (
                    <span className="ml-2 text-[11px] text-slate-400">
                      ({scores.filter(s => s !== null).length} / 17 та мезон баҳоланди)
                    </span>
                  )}
                </span>
                <span
                  className="text-[20px] font-bold text-indigo-600"
                  data-testid="live-score"
                >
                  {liveScore} / {MAX_SCORE}
                </span>
              </div>

              {/* 17 Criteria — data-driven from @shared/config/assessmentCriteria */}
              {/* Scoring direction: button value IS software score (0=worst, 4=best).  */}
              {/* levelDescriptions keys are in software direction — no extra inversion. */}
              {/* Buttons displayed 4→3→2→1→0 (best→worst left to right).              */}
              <div className="space-y-6">
                {ASSESSMENT_CRITERIA.map((criterion, index) => (
                  <div key={criterion.code} data-testid={`criterion-row-${criterion.code}`}>
                    <div className="text-[13px] font-medium text-slate-800 mb-2 leading-snug">
                      <span className="text-indigo-600 mr-1 font-bold">{criterion.sortOrder}.</span>
                      {criterion.textUz}
                      {criterion.isHearingSpecific && (
                        <span className="ml-1.5 text-[11px] text-amber-600 font-normal">
                          (ОQ-1: барча болалар учун)
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                      {[4, 3, 2, 1, 0].map(score => {
                        const desc = criterion.levelDescriptions[String(score)];
                        const isSelected = scores[index] === score;
                        return (
                          <button
                            key={score}
                            type="button"
                            data-testid={`score-btn-${criterion.code}-${score}`}
                            onClick={() => handleScoreChange(index, score)}
                            className="p-2 rounded-md border text-[11px] leading-tight transition-colors text-left"
                            style={{
                              background:   isSelected ? '#4F46E5' : '#FFFFFF',
                              color:        isSelected ? '#FFFFFF' : '#374151',
                              borderColor:  isSelected ? '#4F46E5' : '#E2E8F0',
                            }}
                          >
                            <div className="font-bold text-[12px] mb-0.5">{score}</div>
                            <div className="opacity-90">{desc.uz}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Session error banner */}
              {sessionError && (
                <div
                  className="rounded-lg border p-3 text-[13px] text-red-700"
                  style={{ background: '#FEF2F2', borderColor: '#FECACA' }}
                  data-testid="session-error-banner"
                >
                  {sessionError}
                </div>
              )}

              {/* Notes */}
              <FieldRow label="Изоҳ (ихтиёрий)">
                <textarea
                  rows={2}
                  className={textareaCls}
                  value={sessionNotes}
                  onChange={e => setSessionNotes(e.target.value)}
                  placeholder="Qo'shimcha izohlar..."
                />
              </FieldRow>

              <button
                type="button"
                onClick={handleSubmitSession}
                disabled={!allScored || submittingSession}
                data-testid="submit-session-btn"
                className="h-9 px-4 rounded-md text-[13px] font-medium transition-colors disabled:opacity-50"
                style={{ background: '#4F46E5', color: '#FFFFFF' }}
              >
                {submittingSession ? 'Сақланмоқда...' : 'Натижаларни сақлаш'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* EXTENSION POINT — Phase 3c: goals tab; 3d: journals tab */}
    </div>
  );
}
