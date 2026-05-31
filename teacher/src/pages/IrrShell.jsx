import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import ConfirmDialog from '../shared/components/ConfirmDialog';
import api from '../shared/services/api';
import { useToast } from '../shared/context/ToastContext';
import { ASSESSMENT_CRITERIA, MAX_SCORE } from '@shared/config/assessmentCriteria';
import { SKILL_AREAS } from '@shared/config/skillAreas';
import { DAILY_JOURNAL_ITEMS, DAILY_ITEM_COUNT } from '@shared/config/dailyJournalItems';
import { WEEKLY_JOURNAL_ITEMS, WEEKLY_ITEM_COUNT } from '@shared/config/weeklyJournalItems';

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

function getMondayIso(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
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

  const [confirmDialog, setConfirmDialog] = useState(null);

  // ── Header form state ────────────────────────────────────────────────────
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [activating, setActivating] = useState(false);
  const [irr, setIrr]               = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [activateError, setActivateError] = useState(null);

  // ── Goals state (Phase 3c) ───────────────────────────────────────────────
  const [longTermGoals, setLongTermGoals]   = useState([]);
  const [loadingGoals, setLoadingGoals]     = useState(false);
  const [ltgForm, setLtgForm]               = useState({ goalText: '', targetPeriodStart: '', targetPeriodEnd: '' });
  const [savingLtg, setSavingLtg]           = useState(false);
  const [ltgEditId, setLtgEditId]           = useState(null);
  const [ltgEditForm, setLtgEditForm]       = useState({ goalText: '', targetPeriodStart: '', targetPeriodEnd: '' });

  const [goalPeriods, setGoalPeriods]       = useState([]);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [periodForm, setPeriodForm]         = useState({ periodStart: '', periodEnd: '' });
  const [savingPeriod, setSavingPeriod]     = useState(false);
  const [periodError, setPeriodError]       = useState(null);
  const [expandedPeriods, setExpandedPeriods] = useState(new Set());

  const [stgByPeriod, setStgByPeriod]       = useState({});
  const [stgForms, setStgForms]             = useState({});
  const [savingStg, setSavingStg]           = useState(null);
  const [stgEditId, setStgEditId]           = useState(null);
  const [stgEditForm, setStgEditForm]       = useState({});

  const [reviewForms, setReviewForms]       = useState({});
  const [savingReview, setSavingReview]     = useState(null);
  const [signingPeriod, setSigningPeriod]   = useState(null);

  // ── Monitoring journal state (Phase 3d) ──────────────────────────────────
  const [dailyEntries, setDailyEntries]   = useState([]);
  const [_loadingDaily, setLoadingDaily]   = useState(false);
  const [dailyDate, setDailyDate]         = useState(todayIso);
  const [dailyChecks, setDailyChecks]     = useState({});
  const [dailyNotes, setDailyNotes]       = useState('');
  const [savingDaily, setSavingDaily]     = useState(false);
  const [dailyError, setDailyError]       = useState(null);

  const [weeklyEntries, setWeeklyEntries] = useState([]);
  const [_loadingWeekly, setLoadingWeekly] = useState(false);
  const [weekStart, setWeekStart]         = useState(getMondayIso);
  const [weeklyChecks, setWeeklyChecks]   = useState({});
  const [weeklyNotes, setWeeklyNotes]     = useState('');
  const [savingWeekly, setSavingWeekly]   = useState(false);
  const [weeklyError, setWeeklyError]     = useState(null);

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

  // ── Phase 3c loaders ─────────────────────────────────────────────────────
  const loadLongTermGoals = useCallback(async (irrId) => {
    if (!irrId) return;
    setLoadingGoals(true);
    try {
      const res = await api.get(`/teacher/irr/${irrId}/long-term-goals`);
      setLongTermGoals(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch {
      setLongTermGoals([]);
    } finally {
      setLoadingGoals(false);
    }
  }, []);

  const loadGoalPeriods = useCallback(async (irrId) => {
    if (!irrId) return;
    setLoadingPeriods(true);
    try {
      const res = await api.get(`/teacher/irr/${irrId}/goal-periods`);
      setGoalPeriods(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch {
      setGoalPeriods([]);
    } finally {
      setLoadingPeriods(false);
    }
  }, []);

  const loadShortTermGoals = useCallback(async (periodId) => {
    if (!periodId) return;
    try {
      const res = await api.get(`/teacher/goal-periods/${periodId}/short-term-goals`);
      setStgByPeriod(prev => ({
        ...prev,
        [periodId]: Array.isArray(res.data?.data) ? res.data.data : [],
      }));
    } catch {
      setStgByPeriod(prev => ({ ...prev, [periodId]: [] }));
    }
  }, []);

  // ── Phase 3d loaders ─────────────────────────────────────────────────────
  const loadDailyEntries = useCallback(async (childId) => {
    if (!childId) return;
    setLoadingDaily(true);
    try {
      const res = await api.get(`/teacher/children/${childId}/daily-entries?limit=30`);
      setDailyEntries(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch {
      setDailyEntries([]);
    } finally {
      setLoadingDaily(false);
    }
  }, []);

  const loadWeeklyEntries = useCallback(async (childId) => {
    if (!childId) return;
    setLoadingWeekly(true);
    try {
      const res = await api.get(`/teacher/children/${childId}/weekly-entries?limit=12`);
      setWeeklyEntries(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch {
      setWeeklyEntries([]);
    } finally {
      setLoadingWeekly(false);
    }
  }, []);

  // ── LTG handlers ─────────────────────────────────────────────────────────
  const handleCreateLtg = useCallback(async () => {
    if (!irr || !ltgForm.goalText.trim()) return;
    setSavingLtg(true);
    try {
      const res = await api.post(`/teacher/irr/${irr.id}/long-term-goals`, {
        goalText: ltgForm.goalText,
        targetPeriodStart: ltgForm.targetPeriodStart || null,
        targetPeriodEnd:   ltgForm.targetPeriodEnd   || null,
      });
      setLongTermGoals(prev => [...prev, res.data.data]);
      setLtgForm({ goalText: '', targetPeriodStart: '', targetPeriodEnd: '' });
    } catch {
      showError('Мақсадни сақлашда хато');
    } finally {
      setSavingLtg(false);
    }
  }, [irr, ltgForm, showError]);

  const handleUpdateLtg = useCallback(async () => {
    if (!ltgEditId) return;
    setSavingLtg(true);
    try {
      const res = await api.patch(`/teacher/long-term-goals/${ltgEditId}`, {
        goalText:          ltgEditForm.goalText,
        targetPeriodStart: ltgEditForm.targetPeriodStart || null,
        targetPeriodEnd:   ltgEditForm.targetPeriodEnd   || null,
      });
      setLongTermGoals(prev => prev.map(g => g.id === ltgEditId ? res.data.data : g));
      setLtgEditId(null);
    } catch {
      showError('Мақсадни янгилашда хато');
    } finally {
      setSavingLtg(false);
    }
  }, [ltgEditId, ltgEditForm, showError]);

  const handleDeleteLtg = useCallback((id) => {
    setConfirmDialog({
      message: "Uzoq muddatli maqsadni o'chirmoqchimisiz?",
      warning: "Bu maqsad yumshoq o'chiriladi, lekin hozirda tiklash imkoniyati yo'q.",
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/teacher/long-term-goals/${id}`);
          setLongTermGoals(prev => prev.filter(g => g.id !== id));
        } catch {
          showError('Мақсадни ўчиришда хато');
        }
      },
    });
  }, [showError]);

  // ── Period handlers ───────────────────────────────────────────────────────
  const handleCreatePeriod = useCallback(async () => {
    if (!irr || !periodForm.periodStart || !periodForm.periodEnd) {
      setPeriodError('Давр бошланиш ва тугаш санасини киритинг');
      return;
    }
    setSavingPeriod(true);
    setPeriodError(null);
    try {
      const res = await api.post(`/teacher/irr/${irr.id}/goal-periods`, periodForm);
      setGoalPeriods(prev => [...prev, res.data.data]);
      setPeriodForm({ periodStart: '', periodEnd: '' });
    } catch {
      setPeriodError('Даврни сақлашда хато');
    } finally {
      setSavingPeriod(false);
    }
  }, [irr, periodForm]);

  const togglePeriod = useCallback((periodId) => {
    setExpandedPeriods(prev => {
      const next = new Set(prev);
      if (next.has(periodId)) {
        next.delete(periodId);
      } else {
        next.add(periodId);
        loadShortTermGoals(periodId);
      }
      return next;
    });
  }, [loadShortTermGoals]);

  // ── STG handlers ──────────────────────────────────────────────────────────
  const getStgForm = (periodId) => stgForms[periodId] || {
    skillAreaCode: SKILL_AREAS[0]?.code ?? '',
    goalText: '', taskSetDate: '', targetDate: '',
    tasks: '', methods: '', progress: '', observations: '',
  };

  const handleCreateStg = useCallback(async (periodId) => {
    const form = stgForms[periodId] || {};
    if (!form.goalText?.trim()) return;
    setSavingStg(periodId);
    try {
      const res = await api.post(`/teacher/goal-periods/${periodId}/short-term-goals`, {
        skillAreaCode: form.skillAreaCode || null,
        goalText:      form.goalText,
        taskSetDate:   form.taskSetDate   || null,
        targetDate:    form.targetDate    || null,
        tasks:         form.tasks         || null,
        methods:       form.methods       || null,
        progress:      form.progress      || null,
        observations:  form.observations  || null,
      });
      setStgByPeriod(prev => ({
        ...prev,
        [periodId]: [...(prev[periodId] || []), res.data.data],
      }));
      setStgForms(prev => ({ ...prev, [periodId]: {} }));
    } catch {
      showError('Қисқа муддатли мақсадни сақлашда хато');
    } finally {
      setSavingStg(null);
    }
  }, [stgForms, showError]);

  const handleUpdateStg = useCallback(async (periodId) => {
    if (!stgEditId) return;
    setSavingStg(stgEditId);
    try {
      const res = await api.patch(`/teacher/short-term-goals/${stgEditId}`, stgEditForm);
      setStgByPeriod(prev => ({
        ...prev,
        [periodId]: (prev[periodId] || []).map(g => g.id === stgEditId ? res.data.data : g),
      }));
      setStgEditId(null);
      setStgEditForm({});
    } catch {
      showError('Мақсадни янгилашда хато');
    } finally {
      setSavingStg(null);
    }
  }, [stgEditId, stgEditForm, showError]);

  const handleDeleteStg = useCallback((id, periodId) => {
    setConfirmDialog({
      message: "Qisqa muddatli maqsadni o'chirmoqchimisiz?",
      warning: "Bu maqsad yumshoq o'chiriladi, lekin hozirda tiklash imkoniyati yo'q.",
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/teacher/short-term-goals/${id}`);
          setStgByPeriod(prev => ({
            ...prev,
            [periodId]: (prev[periodId] || []).filter(g => g.id !== id),
          }));
        } catch {
          showError('Мақсадни ўчиришда хато');
        }
      },
    });
  }, [showError]);

  // ── Review + Sign handlers ────────────────────────────────────────────────
  const handleSaveReview = useCallback(async (periodId) => {
    setSavingReview(periodId);
    try {
      const form = reviewForms[periodId] || {};
      const res = await api.patch(`/teacher/goal-periods/${periodId}/review`, form);
      setGoalPeriods(prev => prev.map(p => p.id === periodId ? res.data.data : p));
      success('Чорак якунлари сақланди');
    } catch {
      showError('Сақлашда хато юз берди');
    } finally {
      setSavingReview(null);
    }
  }, [reviewForms, success, showError]);

  const handleSignPeriod = useCallback(async (periodId) => {
    setSigningPeriod(periodId);
    try {
      const res = await api.post(`/teacher/goal-periods/${periodId}/sign`);
      setGoalPeriods(prev => prev.map(p => p.id === periodId ? res.data.data : p));
      success('Имзо қўйилди');
    } catch {
      showError('Имзо қўйишда хато');
    } finally {
      setSigningPeriod(null);
    }
  }, [success, showError]);

  // ── Phase 3d handlers ────────────────────────────────────────────────────
  const handleSubmitDaily = useCallback(async () => {
    if (!dailyDate) return;
    setDailyError(null);
    setSavingDaily(true);
    try {
      const hygieneData = Object.fromEntries(
        DAILY_JOURNAL_ITEMS.hygiene.map(item => [item.code, dailyChecks[item.code] || false])
      );
      const healthData  = Object.fromEntries(
        DAILY_JOURNAL_ITEMS.health.map(item => [item.code, dailyChecks[item.code] || false])
      );
      const giData      = Object.fromEntries(
        DAILY_JOURNAL_ITEMS.gi.map(item => [item.code, dailyChecks[item.code] || false])
      );
      const res = await api.post(`/teacher/children/${id}/daily-entries`, {
        entryDate:   dailyDate,
        hygieneData,
        healthData,
        giData,
        irrId:       irr?.id || null,
        notes:       dailyNotes,
      });
      setDailyEntries(prev => [res.data.data, ...prev]);
      setDailyChecks({});
      setDailyNotes('');
      success('Кундалик мониторинг сақланди');
    } catch (err) {
      const code = err.response?.data?.error?.code;
      if (code === 'DAILY_ENTRY_DUPLICATE') {
        setDailyError('Бу сана учун кундалик мониторинг аллақачон мавжуд');
      } else {
        setDailyError('Сақлашда хато юз берди');
      }
    } finally {
      setSavingDaily(false);
    }
  }, [dailyDate, dailyChecks, dailyNotes, id, irr, success]);

  const handleSubmitWeekly = useCallback(async () => {
    if (!weekStart) return;
    setWeeklyError(null);
    setSavingWeekly(true);
    try {
      const emotionalData   = Object.fromEntries(
        WEEKLY_JOURNAL_ITEMS.emotional.map(item => [item.code, weeklyChecks[item.code] || false])
      );
      const environmentData = Object.fromEntries(
        WEEKLY_JOURNAL_ITEMS.environment.map(item => [item.code, weeklyChecks[item.code] || false])
      );
      const res = await api.post(`/teacher/children/${id}/weekly-entries`, {
        weekStart,
        emotionalData,
        environmentData,
        irrId: irr?.id || null,
        notes: weeklyNotes,
      });
      setWeeklyEntries(prev => [res.data.data, ...prev]);
      setWeeklyChecks({});
      setWeeklyNotes('');
      success('Ҳафталик мониторинг сақланди');
    } catch (err) {
      const code = err.response?.data?.error?.code;
      if (code === 'WEEKLY_ENTRY_DUPLICATE') {
        setWeeklyError('Бу ҳафта учун мониторинг аллақачон мавжуд');
      } else {
        setWeeklyError('Сақлашда хато юз берди');
      }
    } finally {
      setSavingWeekly(false);
    }
  }, [weekStart, weeklyChecks, weeklyNotes, id, irr, success]);

  useEffect(() => {
    loadDailyEntries(id);
    loadWeeklyEntries(id);
  }, [id, loadDailyEntries, loadWeeklyEntries]);

  const irrId = irr?.id;
  useEffect(() => {
    if (irrId) {
      loadSessions(irrId);
      loadLongTermGoals(irrId);
      loadGoalPeriods(irrId);
    }
  }, [irrId, loadSessions, loadLongTermGoals, loadGoalPeriods]);

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
            (<span className="text-red-500">*</span>) to&apos;ldiring va saqlang.
          </p>
        )}
      </div>

      {/* ─── Header form ─────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-surface shadow-sm divide-y divide-slate-100">
        <div className="px-5 py-4">
          <h2 className="text-[15px] font-semibold text-slate-900">Asosiy ma&apos;lumotlar</h2>
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
            Majburiy emas — maqsadlar belgilashdan oldin to&apos;ldirilishi tavsiya etiladi
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
            Faollashtirishdan oldin quyidagi majburiy maydonlarni to&apos;ldiring:
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

      {/* ─── Long-term goals (Phase 3c) ──────────────────────────────────────── */}
      {irr && (
        <div
          className="rounded-xl border border-slate-200 bg-surface shadow-sm divide-y divide-slate-100"
          data-testid="ltg-section"
        >
          <div className="px-5 py-4">
            <h2 className="text-[15px] font-semibold text-slate-900">Узоқ муддатли мақсадлар</h2>
            <p className="text-[12px] text-slate-500 mt-0.5">
              ПТПК амал қилиш муддатига мос равишда, жами 5 тагача (OQ-11: кўникма соҳаси белгиланмайди)
            </p>
          </div>

          {loadingGoals && longTermGoals.length === 0 && (
            <div className="px-5 py-3 text-[13px] text-slate-400">Yuklanmoqda...</div>
          )}

          {longTermGoals.map((goal, idx) => (
            <div key={goal.id} className="px-5 py-4" data-testid={`ltg-row-${goal.id}`}>
              {ltgEditId === goal.id ? (
                <div className="space-y-2">
                  <textarea
                    rows={2}
                    className={textareaCls}
                    value={ltgEditForm.goalText}
                    onChange={e => setLtgEditForm(f => ({ ...f, goalText: e.target.value }))}
                    data-testid={`ltg-edit-text-${goal.id}`}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" className={inputCls} value={ltgEditForm.targetPeriodStart}
                      onChange={e => setLtgEditForm(f => ({ ...f, targetPeriodStart: e.target.value }))} />
                    <input type="date" className={inputCls} value={ltgEditForm.targetPeriodEnd}
                      onChange={e => setLtgEditForm(f => ({ ...f, targetPeriodEnd: e.target.value }))} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleUpdateLtg} disabled={savingLtg}
                      className="h-8 px-3 rounded-md bg-brand-600 text-surface text-[12px] font-medium disabled:opacity-50"
                      data-testid={`ltg-edit-save-${goal.id}`}>
                      Сақлаш
                    </button>
                    <button onClick={() => setLtgEditId(null)}
                      className="h-8 px-3 rounded-md border border-slate-200 text-[12px] text-slate-600">
                      Бекор
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <span className="text-indigo-600 font-bold text-[13px] mt-0.5 shrink-0">{idx + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-slate-800 leading-snug">{goal.goalText}</p>
                    {(goal.targetPeriodStart || goal.targetPeriodEnd) && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {formatDate(goal.targetPeriodStart)} – {formatDate(goal.targetPeriodEnd)}
                      </p>
                    )}
                  </div>
                  {!isReadOnly && (
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => { setLtgEditId(goal.id); setLtgEditForm({ goalText: goal.goalText, targetPeriodStart: goal.targetPeriodStart || '', targetPeriodEnd: goal.targetPeriodEnd || '' }); }}
                        className="h-7 px-2 rounded border border-slate-200 text-[11px] text-slate-500 hover:text-slate-800"
                        data-testid={`ltg-edit-btn-${goal.id}`}
                      >Тах.</button>
                      <button
                        onClick={() => handleDeleteLtg(goal.id)}
                        className="h-7 px-2 rounded border text-[11px]"
                        style={{ borderColor: '#FECACA', color: '#DC2626' }}
                        data-testid={`ltg-delete-${goal.id}`}
                      >✕</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {!isReadOnly && longTermGoals.length < 5 && (
            <div className="px-5 py-4 space-y-3" data-testid="ltg-add-form">
              <h3 className="text-[13px] font-medium text-slate-700">Янги мақсад қўшиш</h3>
              <textarea
                rows={2}
                className={textareaCls}
                placeholder="Мақсад матни (камида 5 та белги)..."
                value={ltgForm.goalText}
                onChange={e => setLtgForm(f => ({ ...f, goalText: e.target.value }))}
                data-testid="ltg-text-input"
              />
              <div className="grid grid-cols-2 gap-2">
                <FieldRow label="Бошланиш санаси">
                  <input type="date" className={inputCls} value={ltgForm.targetPeriodStart}
                    onChange={e => setLtgForm(f => ({ ...f, targetPeriodStart: e.target.value }))}
                    data-testid="ltg-start-input" />
                </FieldRow>
                <FieldRow label="Тугаш санаси">
                  <input type="date" className={inputCls} value={ltgForm.targetPeriodEnd}
                    onChange={e => setLtgForm(f => ({ ...f, targetPeriodEnd: e.target.value }))}
                    data-testid="ltg-end-input" />
                </FieldRow>
              </div>
              <button
                onClick={handleCreateLtg}
                disabled={savingLtg || !ltgForm.goalText.trim()}
                className="h-8 px-3 rounded-md bg-brand-600 text-surface text-[12px] font-medium disabled:opacity-50"
                data-testid="ltg-save-btn"
              >
                {savingLtg ? 'Сақланмоқда...' : 'Мақсад қўшиш'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── Goal periods + short-term goals + review (Phase 3c) ─────────────── */}
      {irr && (
        <div
          className="rounded-xl border border-slate-200 bg-surface shadow-sm divide-y divide-slate-100"
          data-testid="periods-section"
        >
          <div className="px-5 py-4">
            <h2 className="text-[15px] font-semibold text-slate-900">Ривожланиш даврлари</h2>
            <p className="text-[12px] text-slate-500 mt-0.5">
              Ҳар бир давр учун 3–5 та қисқа муддатли мақсад белгиланади (3 ойлик давр)
            </p>
          </div>

          {/* Create period form */}
          {!isReadOnly && (
            <div className="px-5 py-4 space-y-3" data-testid="period-create-form">
              <h3 className="text-[13px] font-medium text-slate-700">Янги давр қўшиш</h3>
              <div className="grid grid-cols-2 gap-3">
                <FieldRow label="Давр бошланиши" required>
                  <input type="date" className={inputCls} value={periodForm.periodStart}
                    onChange={e => { setPeriodForm(f => ({ ...f, periodStart: e.target.value })); setPeriodError(null); }}
                    data-testid="period-start-input" />
                </FieldRow>
                <FieldRow label="Давр тугаши" required>
                  <input type="date" className={inputCls} value={periodForm.periodEnd}
                    onChange={e => { setPeriodForm(f => ({ ...f, periodEnd: e.target.value })); setPeriodError(null); }}
                    data-testid="period-end-input" />
                </FieldRow>
              </div>
              {periodError && (
                <div className="text-[12px] text-red-600" data-testid="period-error">{periodError}</div>
              )}
              <button
                onClick={handleCreatePeriod}
                disabled={savingPeriod}
                className="h-8 px-3 rounded-md bg-brand-600 text-surface text-[12px] font-medium disabled:opacity-50"
                data-testid="period-create-btn"
              >
                {savingPeriod ? 'Сақланмоқда...' : 'Давр қўшиш'}
              </button>
            </div>
          )}

          {loadingPeriods && goalPeriods.length === 0 && (
            <div className="px-5 py-3 text-[13px] text-slate-400">Yuklanmoqda...</div>
          )}

          {goalPeriods.map(period => {
            const isExpanded = expandedPeriods.has(period.id);
            const stgs = stgByPeriod[period.id] || [];
            const stgForm = getStgForm(period.id);
            const reviewForm = reviewForms[period.id] || {};
            const initReview = (field, value) =>
              setReviewForms(prev => ({ ...prev, [period.id]: { ...reviewForm, [field]: value } }));

            return (
              <div key={period.id} data-testid={`period-row-${period.id}`}>
                {/* Period header — click to expand */}
                <button
                  type="button"
                  onClick={() => togglePeriod(period.id)}
                  className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                  data-testid={`period-toggle-${period.id}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] font-medium text-slate-800">
                      {formatDate(period.periodStart)} – {formatDate(period.periodEnd)}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                      style={{ background: period.status === 'active' ? '#E2F0E8' : '#F1F2F4', color: period.status === 'active' ? '#4F8C72' : '#6F7585' }}>
                      {period.status === 'active' ? 'Фаол' : period.status === 'completed' ? 'Якунланган' : period.status}
                    </span>
                  </div>
                  <span className="text-[12px] text-slate-400">{isExpanded ? '▲' : '▼'}</span>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 divide-y divide-slate-100">
                    {/* Short-term goals */}
                    <div className="px-5 py-4 space-y-3" data-testid={`stg-section-${period.id}`}>
                      <div className="flex items-center justify-between">
                        <h3 className="text-[13px] font-semibold text-slate-800">Қисқа муддатли мақсадлар</h3>
                        {stgs.length > 0 && stgs.length < 3 && (
                          <span className="text-[11px] text-amber-600" data-testid={`stg-guidance-${period.id}`}>
                            Тавсия: {3 - stgs.length} та яна мақсад қўшинг (камида 3 та)
                          </span>
                        )}
                        {stgs.length === 0 && !isReadOnly && (
                          <span className="text-[11px] text-amber-600" data-testid={`stg-guidance-${period.id}`}>
                            Тавсия: 3–5 та мақсад белгиланг
                          </span>
                        )}
                      </div>

                      {stgs.map(stg => (
                        <div key={stg.id} className="rounded-lg border border-slate-200 p-3 space-y-1" data-testid={`stg-row-${stg.id}`}>
                          {stgEditId === stg.id ? (
                            <div className="space-y-2">
                              <select className={inputCls} value={stgEditForm.skillAreaCode || ''}
                                onChange={e => setStgEditForm(f => ({ ...f, skillAreaCode: e.target.value }))}>
                                <option value="">— Соҳа танланмаган —</option>
                                {SKILL_AREAS.map(sa => <option key={sa.code} value={sa.code}>{sa.textUz}</option>)}
                              </select>
                              <textarea rows={2} className={textareaCls} value={stgEditForm.goalText || ''}
                                onChange={e => setStgEditForm(f => ({ ...f, goalText: e.target.value }))} />
                              <div className="flex gap-2">
                                <button onClick={() => handleUpdateStg(period.id)} disabled={savingStg === stgEditId}
                                  className="h-7 px-2 rounded-md bg-brand-600 text-surface text-[11px] disabled:opacity-50"
                                  data-testid={`stg-edit-save-${stg.id}`}>Сақлаш</button>
                                <button onClick={() => { setStgEditId(null); setStgEditForm({}); }}
                                  className="h-7 px-2 rounded border border-slate-200 text-[11px] text-slate-600">Бекор</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                {stg.skillAreaCode && (
                                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium mb-1"
                                    style={{ background: '#EEF2FF', color: '#4F46E5' }}
                                    data-testid={`stg-skill-tag-${stg.id}`}>
                                    {SKILL_AREAS.find(sa => sa.code === stg.skillAreaCode)?.textUz ?? stg.skillAreaCode}
                                  </span>
                                )}
                                <p className="text-[13px] text-slate-800">{stg.goalText}</p>
                                {stg.targetDate && (
                                  <p className="text-[11px] text-slate-400 mt-0.5">Муддат: {formatDate(stg.targetDate)}</p>
                                )}
                              </div>
                              {!isReadOnly && (
                                <div className="flex gap-1 shrink-0">
                                  <button onClick={() => { setStgEditId(stg.id); setStgEditForm({ skillAreaCode: stg.skillAreaCode || '', goalText: stg.goalText || '', targetDate: stg.targetDate || '' }); }}
                                    className="h-6 px-2 rounded border border-slate-200 text-[10px] text-slate-500"
                                    data-testid={`stg-edit-btn-${stg.id}`}>Тах.</button>
                                  <button onClick={() => handleDeleteStg(stg.id, period.id)}
                                    className="h-6 px-2 rounded border text-[10px]"
                                    style={{ borderColor: '#FECACA', color: '#DC2626' }}
                                    data-testid={`stg-delete-${stg.id}`}>✕</button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}

                      {!isReadOnly && (
                        <div className="rounded-lg border border-dashed border-slate-300 p-3 space-y-2" data-testid={`stg-add-form-${period.id}`}>
                          <h4 className="text-[12px] font-medium text-slate-600">Янги мақсад</h4>
                          <select className={inputCls}
                            value={stgForm.skillAreaCode || ''}
                            onChange={e => setStgForms(prev => ({ ...prev, [period.id]: { ...getStgForm(period.id), skillAreaCode: e.target.value } }))}
                            data-testid={`stg-skill-area-${period.id}`}>
                            <option value="">— Соҳа танланмаган —</option>
                            {SKILL_AREAS.map(sa => <option key={sa.code} value={sa.code}>{sa.textUz}</option>)}
                          </select>
                          <textarea rows={2} className={textareaCls}
                            placeholder="Мақсад матни..."
                            value={stgForm.goalText || ''}
                            onChange={e => setStgForms(prev => ({ ...prev, [period.id]: { ...getStgForm(period.id), goalText: e.target.value } }))}
                            data-testid={`stg-text-${period.id}`} />
                          <div className="grid grid-cols-2 gap-2">
                            <input type="date" className={inputCls} placeholder="Вазифа санаси"
                              value={stgForm.taskSetDate || ''}
                              onChange={e => setStgForms(prev => ({ ...prev, [period.id]: { ...getStgForm(period.id), taskSetDate: e.target.value } }))}
                              data-testid={`stg-task-date-${period.id}`} />
                            <input type="date" className={inputCls} placeholder="Мақсад муддати"
                              value={stgForm.targetDate || ''}
                              onChange={e => setStgForms(prev => ({ ...prev, [period.id]: { ...getStgForm(period.id), targetDate: e.target.value } }))}
                              data-testid={`stg-target-date-${period.id}`} />
                          </div>
                          <textarea rows={1} className={textareaCls} placeholder="Вазифалар..."
                            value={stgForm.tasks || ''}
                            onChange={e => setStgForms(prev => ({ ...prev, [period.id]: { ...getStgForm(period.id), tasks: e.target.value } }))}
                            data-testid={`stg-tasks-${period.id}`} />
                          <textarea rows={1} className={textareaCls} placeholder="Усуллар..."
                            value={stgForm.methods || ''}
                            onChange={e => setStgForms(prev => ({ ...prev, [period.id]: { ...getStgForm(period.id), methods: e.target.value } }))}
                            data-testid={`stg-methods-${period.id}`} />
                          <textarea rows={1} className={textareaCls} placeholder="Натижалар..."
                            value={stgForm.progress || ''}
                            onChange={e => setStgForms(prev => ({ ...prev, [period.id]: { ...getStgForm(period.id), progress: e.target.value } }))}
                            data-testid={`stg-progress-${period.id}`} />
                          <textarea rows={1} className={textareaCls} placeholder="Кузатувлар..."
                            value={stgForm.observations || ''}
                            onChange={e => setStgForms(prev => ({ ...prev, [period.id]: { ...getStgForm(period.id), observations: e.target.value } }))}
                            data-testid={`stg-observations-${period.id}`} />
                          <button onClick={() => handleCreateStg(period.id)} disabled={savingStg === period.id || !stgForm.goalText?.trim()}
                            className="h-7 px-3 rounded-md bg-brand-600 text-surface text-[11px] font-medium disabled:opacity-50"
                            data-testid={`stg-add-btn-${period.id}`}>
                            {savingStg === period.id ? 'Сақланмоқда...' : 'Мақсад қўшиш'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Quarterly review */}
                    <div className="px-5 py-4 space-y-3" data-testid={`review-section-${period.id}`}>
                      <h3 className="text-[13px] font-semibold text-slate-800">Чорак якуни</h3>
                      <FieldRow label="Умумий баҳолаш">
                        <textarea rows={2} className={textareaCls}
                          value={reviewForm.overallAssessment ?? (period.overallAssessment || '')}
                          onChange={e => initReview('overallAssessment', e.target.value)}
                          disabled={isReadOnly}
                          data-testid={`review-overall-${period.id}`} />
                      </FieldRow>
                      <FieldRow label="Режа ўзгаришлари">
                        <textarea rows={2} className={textareaCls}
                          value={reviewForm.planChanges ?? (period.planChanges || '')}
                          onChange={e => initReview('planChanges', e.target.value)}
                          disabled={isReadOnly}
                          data-testid={`review-changes-${period.id}`} />
                      </FieldRow>
                      <FieldRow label="Ота-она тавсиялари">
                        <textarea rows={2} className={textareaCls}
                          value={reviewForm.parentRecommendations ?? (period.parentRecommendations || '')}
                          onChange={e => initReview('parentRecommendations', e.target.value)}
                          disabled={isReadOnly}
                          data-testid={`review-parent-rec-${period.id}`} />
                      </FieldRow>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <FieldRow label="Кейинги кўриб чиқиш">
                          <input type="date" className={inputCls}
                            value={reviewForm.nextReviewDate ?? (period.nextReviewDate || '')}
                            onChange={e => initReview('nextReviewDate', e.target.value)}
                            disabled={isReadOnly}
                            data-testid={`review-next-date-${period.id}`} />
                        </FieldRow>
                        <FieldRow label="Кейинги баҳолаш">
                          <input type="date" className={inputCls}
                            value={reviewForm.nextAssessmentDate ?? (period.nextAssessmentDate || '')}
                            onChange={e => initReview('nextAssessmentDate', e.target.value)}
                            disabled={isReadOnly}
                            data-testid={`review-next-assess-${period.id}`} />
                        </FieldRow>
                        <FieldRow label="Ота-она билан мулоқот">
                          <input type="date" className={inputCls}
                            value={reviewForm.parentDiscussionDate ?? (period.parentDiscussionDate || '')}
                            onChange={e => initReview('parentDiscussionDate', e.target.value)}
                            disabled={isReadOnly}
                            data-testid={`review-parent-date-${period.id}`} />
                        </FieldRow>
                      </div>

                      {!isReadOnly && (
                        <div className="flex items-center gap-3 flex-wrap pt-1">
                          <button
                            onClick={() => handleSaveReview(period.id)}
                            disabled={savingReview === period.id}
                            className="h-8 px-3 rounded-md bg-brand-600 text-surface text-[12px] font-medium disabled:opacity-50"
                            data-testid={`review-save-${period.id}`}
                          >
                            {savingReview === period.id ? 'Сақланмоқда...' : 'Чорак якунини сақлаш'}
                          </button>

                          <button
                            onClick={() => handleSignPeriod(period.id)}
                            disabled={signingPeriod === period.id || !!period.teacherSignedAt}
                            className="h-8 px-3 rounded-md border text-[12px] font-medium disabled:opacity-50"
                            style={{ borderColor: '#A8D2BC', color: '#4F8C72', background: '#E2F0E8' }}
                            data-testid={`sign-teacher-${period.id}`}
                          >
                            {period.teacherSignedAt
                              ? `Имзоланган: ${formatDate(period.teacherSignedAt)}`
                              : signingPeriod === period.id ? 'Имзоланмоқда...' : 'Ўқитувчи имзоси'}
                          </button>

                          {period.teacherSignedAt && (
                            <span className="text-[11px] text-slate-400" data-testid={`signed-at-${period.id}`}>
                              {formatDate(period.teacherSignedAt)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Daily monitoring journal (Phase 3d) ────────────────────────── */}
      <div
        className="rounded-xl border border-slate-200 bg-surface shadow-sm divide-y divide-slate-100"
        data-testid="daily-section"
      >
        <div className="px-5 py-4">
          <h2 className="text-[15px] font-semibold text-slate-900">
            Кундалик мониторинг журнали
          </h2>
          <p className="text-[12px] text-slate-500 mt-0.5">
            Болаларни кундузги хизматга қабул қилиш / топшириш журнали ({DAILY_ITEM_COUNT} кўрсаткич)
          </p>
        </div>

        <div className="px-5 py-4 space-y-4">
          <FieldRow label="Сана">
            <input
              type="date"
              className={inputCls}
              value={dailyDate}
              onChange={e => { setDailyDate(e.target.value); setDailyError(null); }}
              data-testid="daily-date-input"
            />
          </FieldRow>

          <div data-testid="daily-hygiene-section">
            <h3 className="text-[13px] font-semibold text-slate-700 mb-2">
              Гигиена кўрсаткичлари (9 та)
            </h3>
            <div className="space-y-1.5">
              {DAILY_JOURNAL_ITEMS.hygiene.map(item => (
                <label key={item.code} className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 accent-brand-600"
                    checked={dailyChecks[item.code] || false}
                    onChange={e => setDailyChecks(prev => ({ ...prev, [item.code]: e.target.checked }))}
                    data-testid={`daily-check-${item.code}`}
                  />
                  <span className="text-[13px] text-slate-800">{item.textUz}</span>
                </label>
              ))}
            </div>
          </div>

          <div data-testid="daily-health-section">
            <h3 className="text-[13px] font-semibold text-slate-700 mb-2">
              Соғлиқ кўрсаткичлари (11 та)
            </h3>
            <div className="space-y-1.5">
              {DAILY_JOURNAL_ITEMS.health.map(item => (
                <label key={item.code} className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 accent-brand-600"
                    checked={dailyChecks[item.code] || false}
                    onChange={e => setDailyChecks(prev => ({ ...prev, [item.code]: e.target.checked }))}
                    data-testid={`daily-check-${item.code}`}
                  />
                  <span className="text-[13px] text-slate-800">{item.textUz}</span>
                </label>
              ))}
            </div>
          </div>

          <div data-testid="daily-gi-section">
            <h3 className="text-[13px] font-semibold text-slate-700 mb-2">
              Меъда-ичак кўрсаткичлари (7 та)
            </h3>
            <div className="space-y-1.5">
              {DAILY_JOURNAL_ITEMS.gi.map(item => (
                <label key={item.code} className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 accent-brand-600"
                    checked={dailyChecks[item.code] || false}
                    onChange={e => setDailyChecks(prev => ({ ...prev, [item.code]: e.target.checked }))}
                    data-testid={`daily-check-${item.code}`}
                  />
                  <span className="text-[13px] text-slate-800">{item.textUz}</span>
                </label>
              ))}
            </div>
          </div>

          <FieldRow label="Изоҳ">
            <textarea
              rows={2}
              className={textareaCls}
              value={dailyNotes}
              onChange={e => setDailyNotes(e.target.value)}
              placeholder="Қўшимча маълумотлар..."
              data-testid="daily-notes"
            />
          </FieldRow>

          {dailyError && (
            <div
              className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2"
              data-testid="daily-error-banner"
            >
              {dailyError}
            </div>
          )}

          <button
            onClick={handleSubmitDaily}
            disabled={savingDaily || !dailyDate}
            className="h-9 px-4 rounded-md bg-brand-600 text-surface text-[13px] font-medium disabled:opacity-50"
            data-testid="daily-submit-btn"
          >
            {savingDaily ? 'Сақланмоқда...' : 'Кундалик мониторингни сақлаш'}
          </button>
        </div>

        {dailyEntries.length > 0 && (
          <div className="px-5 py-3">
            <h3 className="text-[13px] font-semibold text-slate-700 mb-2">Сўнгги ёзувлар</h3>
            <div className="space-y-0.5">
              {dailyEntries.slice(0, 10).map(entry => (
                <div
                  key={entry.id}
                  className="flex justify-between items-center text-[12px] py-1.5 border-b border-slate-100 last:border-0"
                  data-testid={`daily-entry-row-${entry.id}`}
                >
                  <span className="text-slate-600">{formatDate(entry.entryDate)}</span>
                  {entry.notes && (
                    <span className="text-slate-400 truncate ml-2 max-w-[60%]">{entry.notes}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Weekly monitoring journal (Phase 3d) ───────────────────────── */}
      <div
        className="rounded-xl border border-slate-200 bg-surface shadow-sm divide-y divide-slate-100"
        data-testid="weekly-section"
      >
        <div className="px-5 py-4">
          <h2 className="text-[15px] font-semibold text-slate-900">
            Ҳафталик мониторинг журнали
          </h2>
          <p className="text-[12px] text-slate-500 mt-0.5">
            Ҳафталик мониторинг ({WEEKLY_ITEM_COUNT} кўрсаткич)
          </p>
        </div>

        <div className="px-5 py-4 space-y-4">
          <FieldRow label="Ҳафта бошланиш санаси (душанба)">
            <input
              type="date"
              className={inputCls}
              value={weekStart}
              onChange={e => { setWeekStart(e.target.value); setWeeklyError(null); }}
              data-testid="weekly-date-input"
            />
          </FieldRow>

          <div data-testid="weekly-emotional-section">
            <h3 className="text-[13px] font-semibold text-slate-700 mb-2">
              Ҳиссий-руҳий ҳолат (9 та)
            </h3>
            <div className="space-y-1.5">
              {WEEKLY_JOURNAL_ITEMS.emotional.map(item => (
                <label key={item.code} className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 accent-brand-600"
                    checked={weeklyChecks[item.code] || false}
                    onChange={e => setWeeklyChecks(prev => ({ ...prev, [item.code]: e.target.checked }))}
                    data-testid={`weekly-check-${item.code}`}
                  />
                  <span className="text-[13px] text-slate-800">{item.textUz}</span>
                </label>
              ))}
            </div>
          </div>

          <div data-testid="weekly-environment-section">
            <h3 className="text-[13px] font-semibold text-slate-700 mb-2">
              Атроф-муҳит (9 та)
            </h3>
            <div className="space-y-1.5">
              {WEEKLY_JOURNAL_ITEMS.environment.map(item => (
                <label key={item.code} className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 accent-brand-600"
                    checked={weeklyChecks[item.code] || false}
                    onChange={e => setWeeklyChecks(prev => ({ ...prev, [item.code]: e.target.checked }))}
                    data-testid={`weekly-check-${item.code}`}
                  />
                  <span className="text-[13px] text-slate-800">{item.textUz}</span>
                </label>
              ))}
            </div>
          </div>

          <FieldRow label="Изоҳ">
            <textarea
              rows={2}
              className={textareaCls}
              value={weeklyNotes}
              onChange={e => setWeeklyNotes(e.target.value)}
              placeholder="Қўшимча маълумотлар..."
              data-testid="weekly-notes"
            />
          </FieldRow>

          {weeklyError && (
            <div
              className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2"
              data-testid="weekly-error-banner"
            >
              {weeklyError}
            </div>
          )}

          <button
            onClick={handleSubmitWeekly}
            disabled={savingWeekly || !weekStart}
            className="h-9 px-4 rounded-md bg-brand-600 text-surface text-[13px] font-medium disabled:opacity-50"
            data-testid="weekly-submit-btn"
          >
            {savingWeekly ? 'Сақланмоқда...' : 'Ҳафталик мониторингни сақлаш'}
          </button>
        </div>

        {weeklyEntries.length > 0 && (
          <div className="px-5 py-3">
            <h3 className="text-[13px] font-semibold text-slate-700 mb-2">Сўнгги ёзувлар</h3>
            <div className="space-y-0.5">
              {weeklyEntries.slice(0, 8).map(entry => (
                <div
                  key={entry.id}
                  className="flex justify-between items-center text-[12px] py-1.5 border-b border-slate-100 last:border-0"
                  data-testid={`weekly-entry-row-${entry.id}`}
                >
                  <span className="text-slate-600">{formatDate(entry.weekStart)}</span>
                  {entry.notes && (
                    <span className="text-slate-400 truncate ml-2 max-w-[60%]">{entry.notes}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>

    <ConfirmDialog dialog={confirmDialog} onCancel={() => setConfirmDialog(null)} />
  );
}
