import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import api from '../shared/services/api';
import { useToast } from '../shared/context/ToastContext';

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

  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [activating, setActivating] = useState(false);
  const [irr, setIrr]               = useState(null);  // null = no IRR yet
  const [form, setForm]             = useState(EMPTY_FORM);
  const [activateError, setActivateError] = useState(null); // string[] of Uzbek field labels

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
        // detail: "Missing: fieldA, fieldB"
        const raw          = detail.replace(/^Missing:\s*/i, '');
        const missingKeys  = raw.split(',').map(s => s.trim()).filter(Boolean);
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
        <div className="flex items-center gap-3 flex-wrap pb-6">
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

      {/* EXTENSION POINT — Phase 3b: assessment tab; 3c: goals tab; 3d: journals tab */}
    </div>
  );
}
