// TP-MONITORING-SEPARATION — weekly monitoring tab.
//
// Extracted from IrrShell. Takes a childId and posts to the same backend
// endpoint as before (POST /teacher/children/:id/weekly-entries). irrId is
// null because monitoring is decoupled from IRR.
//
// 18 boolean checks: 9 emotional + 9 environment.

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { WEEKLY_JOURNAL_ITEMS, WEEKLY_ITEM_COUNT } from '@shared/config/weeklyJournalItems';
import { todayLocal } from '@shared/utils/formatDate';
import api from '../../shared/services/api';

const getMondayIso = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
};

const formatDate = (iso) => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
};

const WeeklyMonitoringTab = ({ childId }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('ru') ? 'textRu' : i18n.language?.startsWith('en') ? 'textEn' : 'textUz';

  const [weekStart, setWeekStart] = useState(getMondayIso());
  const [checks, setChecks]       = useState({});
  const [notes, setNotes]         = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState(null);
  const [entries, setEntries]     = useState([]);

  const load = useCallback(async (signal) => {
    if (!childId) return;
    try {
      const res = await api.get(`/teacher/children/${childId}/weekly-entries?limit=12`, { signal });
      setEntries(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      if (err.code === 'ERR_CANCELED') return;
      setEntries([]);
    }
  }, [childId]);

  useEffect(() => {
    const c = new AbortController();
    setChecks({});
    setNotes('');
    setError(null);
    load(c.signal);
    return () => c.abort();
  }, [childId, load]);

  const handleSubmit = async () => {
    if (!childId || !weekStart) return;
    setError(null);
    setSaving(true);
    try {
      const emotionalData = Object.fromEntries(
        WEEKLY_JOURNAL_ITEMS.emotional.map(i => [i.code, checks[i.code] || false])
      );
      const environmentData = Object.fromEntries(
        WEEKLY_JOURNAL_ITEMS.environment.map(i => [i.code, checks[i.code] || false])
      );
      const res = await api.post(`/teacher/children/${childId}/weekly-entries`, {
        weekStart,
        emotionalData, environmentData,
        irrId: null,
        notes,
      });
      setEntries(prev => [res.data.data, ...prev]);
      setChecks({});
      setNotes('');
    } catch (err) {
      const code = err?.response?.data?.error?.code;
      setError(code === 'WEEKLY_ENTRY_DUPLICATE'
        ? t('monitoring.weekly.duplicate', { defaultValue: 'Bu hafta uchun yozuv allaqachon mavjud' })
        : t('monitoring.weekly.saveFailed', { defaultValue: 'Saqlab boʻlmadi' }));
    } finally {
      setSaving(false);
    }
  };

  if (!childId) {
    return (
      <div className="rounded-xl border border-slate-200 bg-surface p-8 text-center text-[13px] text-slate-500">
        {t('monitoring.selectChildFirst', { defaultValue: 'Avval bolani tanlang' })}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-surface shadow-sm divide-y divide-slate-100">
      <div className="px-5 py-4">
        <h2 className="text-[15px] font-semibold text-slate-900">
          {t('monitoring.weekly.title', { defaultValue: 'Haftalik monitoring' })}
        </h2>
        <p className="text-[12px] text-slate-500 mt-0.5">
          {t('monitoring.weekly.subtitle', { defaultValue: `Haftalik monitoring (${WEEKLY_ITEM_COUNT} koʻrsatkich)` })}
        </p>
      </div>

      <div className="px-5 py-4 space-y-4">
        <label className="block">
          <span className="text-[12px] text-slate-600">{t('monitoring.weekStart', { defaultValue: 'Hafta boshi' })}</span>
          <input
            type="date"
            value={weekStart}
            max={todayLocal()}
            onChange={e => { setWeekStart(e.target.value); setError(null); }}
            className="mt-1 w-full md:w-48 px-3 py-2 border border-slate-200 rounded-md text-[13px] focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </label>

        {[
          { key: 'emotional',   items: WEEKLY_JOURNAL_ITEMS.emotional,   title: t('monitoring.weekly.emotional',   { defaultValue: "Hissiy-ruhiy holat" }) },
          { key: 'environment', items: WEEKLY_JOURNAL_ITEMS.environment, title: t('monitoring.weekly.environment', { defaultValue: 'Atrof-muhit' }) },
        ].map(section => (
          <div key={section.key}>
            <h3 className="text-[13px] font-semibold text-slate-700 mb-2">
              {section.title} ({section.items.length} ta)
            </h3>
            <div className="space-y-1.5">
              {section.items.map(item => (
                <label key={item.code} className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 accent-brand-600"
                    checked={checks[item.code] || false}
                    onChange={e => setChecks(prev => ({ ...prev, [item.code]: e.target.checked }))}
                  />
                  <span className="text-[13px] text-slate-800">{item[lang] || item.textUz}</span>
                </label>
              ))}
            </div>
          </div>
        ))}

        <label className="block">
          <span className="text-[12px] text-slate-600">{t('monitoring.notes', { defaultValue: 'Izoh' })}</span>
          <textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md text-[13px] focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder={t('monitoring.notesPlaceholder', { defaultValue: "Qoʻshimcha maʼlumot…" })}
          />
        </label>

        {error && (
          <div className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={saving || !weekStart}
          className="h-9 px-4 rounded-md bg-brand-600 text-white text-[13px] font-medium disabled:opacity-50 inline-flex items-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {t('monitoring.saveWeekly', { defaultValue: 'Haftalik monitoringni saqlash' })}
        </button>
      </div>

      {entries.length > 0 && (
        <div className="px-5 py-3">
          <h3 className="text-[13px] font-semibold text-slate-700 mb-2">
            {t('monitoring.recent', { defaultValue: "So'nggi yozuvlar" })}
          </h3>
          <div className="space-y-0.5">
            {entries.slice(0, 8).map(e => (
              <div key={e.id} className="flex justify-between items-center text-[12px] py-1.5 border-b border-slate-100 last:border-0">
                <span className="text-slate-600">{formatDate(e.weekStart)}</span>
                {e.notes && <span className="text-slate-400 truncate ml-2 max-w-[60%]">{e.notes}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyMonitoringTab;
