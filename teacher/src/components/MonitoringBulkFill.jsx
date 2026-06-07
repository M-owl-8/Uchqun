// TP-IA-REDESIGN Q3 — bulk-fill modal for emotional monitoring.
//
// Replaces the "open modal, pick one child, tick 9 boxes, save, repeat × N"
// daily ritual with a single screen: every child in the teacher's group is
// listed; the 9 criteria are 9 columns of checkboxes; Save All POSTs one
// record per child in parallel.
//
// Backend has no batch endpoint — we Promise.all the POSTs. Per-row failures
// are surfaced in the toast summary so the teacher knows which children
// failed to save.

import { useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../shared/services/api';
import { useToast } from '../shared/context/ToastContext';
import { todayLocal } from '@shared/utils/formatDate';

const CRITERIA = [
  'stable', 'positiveEmotions', 'noAnxiety', 'noHostility', 'calmResponse',
  'showsEmpathy', 'quickRecovery', 'stableMood', 'trustingRelationship',
];

const MonitoringBulkFill = ({ open, onClose, children, onSaved }) => {
  const { t } = useTranslation();
  const { success: toastOk, error: toastError } = useToast();
  const [date, setDate] = useState(todayLocal());
  const [grid, setGrid] = useState({});
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const toggle = (childId, key) => {
    setGrid((prev) => ({
      ...prev,
      [childId]: { ...(prev[childId] || {}), [key]: !prev[childId]?.[key] },
    }));
  };

  const toggleRow = (childId, value) => {
    setGrid((prev) => ({
      ...prev,
      [childId]: CRITERIA.reduce((acc, k) => ({ ...acc, [k]: value }), {}),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const results = await Promise.allSettled(
      children.map((c) => {
        const emotionalState = CRITERIA.reduce(
          (acc, k) => ({ ...acc, [k]: !!grid[c.id]?.[k] }),
          {},
        );
        return api.post('/teacher/emotional-monitoring', {
          childId: c.id,
          date,
          emotionalState,
          notes: '',
          teacherSignature: '',
        });
      }),
    );
    setSaving(false);
    const okCount = results.filter((r) => r.status === 'fulfilled').length;
    const failCount = results.length - okCount;
    if (failCount === 0) {
      toastOk(t('bulkMonitoring.allSaved', { defaultValue: 'Hammasi saqlandi' }));
      onSaved?.();
      onClose();
    } else {
      toastError(
        t('bulkMonitoring.partialFail', {
          defaultValue: `${okCount} ta saqlandi, ${failCount} ta saqlanmadi`,
          ok: okCount, fail: failCount,
        }),
      );
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-surface rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center gap-3">
          <h2 className="text-[16px] font-semibold text-slate-900 flex-1">
            {t('bulkMonitoring.title', { defaultValue: 'Kunlik kuzatuv — barcha bolalar' })}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            aria-label={t('cancel', { defaultValue: 'Yopish' })}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Date picker */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-100 flex items-center gap-3 flex-wrap">
          <label className="text-[13px] font-medium text-slate-700">
            {t('bulkMonitoring.date', { defaultValue: 'Sana' })}:
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={todayLocal()}
            className="px-3 py-1.5 rounded-md border border-slate-200 text-[13px] focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
          <span className="text-[12px] text-slate-500 ml-auto">
            {t('bulkMonitoring.criteriaCount', { count: CRITERIA.length, defaultValue: `${CRITERIA.length} ta mezon × ${children.length} ta bola` })}
          </span>
        </div>

        {/* Grid — scrolls vertically */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3">
          {children.length === 0 ? (
            <p className="text-center text-slate-500 py-8 text-[13px]">
              {t('bolalar.empty', { defaultValue: "Bolalar yo'q" })}
            </p>
          ) : (
            <div className="space-y-2">
              {children.map((c) => {
                const initials = `${(c.firstName || '').charAt(0)}${(c.lastName || '').charAt(0)}`.toUpperCase();
                const rowState = grid[c.id] || {};
                const allChecked = CRITERIA.every((k) => rowState[k]);
                const anyChecked = CRITERIA.some((k) => rowState[k]);
                return (
                  <div key={c.id} className="border border-slate-200 rounded-xl p-3">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 grid place-items-center font-semibold text-[12px] shrink-0">
                        {initials || '·'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-semibold text-slate-900 truncate">
                          {c.firstName} {c.lastName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {anyChecked ? `${CRITERIA.filter(k => rowState[k]).length}/${CRITERIA.length}` : '—'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleRow(c.id, !allChecked)}
                        className="text-[11px] font-medium text-brand-600 hover:text-brand-700 px-2 py-1 rounded-md hover:bg-brand-50"
                      >
                        {allChecked
                          ? t('bulkMonitoring.unselectAll', { defaultValue: 'Hammasini olib tashlash' })
                          : t('bulkMonitoring.selectAll', { defaultValue: 'Hammasini belgilash' })}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                      {CRITERIA.map((k) => (
                        <label
                          key={k}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-[12px] transition-colors ${
                            rowState[k]
                              ? 'bg-brand-50 text-brand-700 border border-brand-200'
                              : 'bg-slate-50 text-slate-600 border border-transparent hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={!!rowState[k]}
                            onChange={() => toggle(c.id, k)}
                            className="w-3.5 h-3.5 accent-brand-600"
                          />
                          <span className="truncate">{t(`child.emotionalCriteria.${k}`, { defaultValue: k })}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-md text-[13px] font-medium text-slate-700 hover:bg-slate-100"
          >
            {t('cancel', { defaultValue: 'Bekor qilish' })}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || children.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-md text-[13px] font-medium bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t('bulkMonitoring.saveAll', { defaultValue: 'Hammasini saqlash' })}
            {children.length > 0 && <span className="text-white/70">({children.length})</span>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MonitoringBulkFill;
