// TP-MONITORING-SEPARATION — daily monitoring tab.
//
// Extracted from IrrShell. Takes a childId (from a parent selector) and
// posts to the same backend endpoint as before (POST /teacher/children/:id/
// daily-entries). irrId is null because monitoring is now decoupled from IRR.
//
// 27 boolean checks: 9 hygiene + 11 health + 7 GI.

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { DAILY_JOURNAL_ITEMS, DAILY_ITEM_COUNT } from '@shared/config/dailyJournalItems';
import { todayLocal } from '@shared/utils/formatDate';
import api from '../../shared/services/api';

const formatDate = (iso) => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
};

const DailyMonitoringTab = ({ childId }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('ru') ? 'textRu' : i18n.language?.startsWith('en') ? 'textEn' : 'textUz';

  const [date, setDate]     = useState(todayLocal());
  const [checks, setChecks] = useState({});
  const [notes, setNotes]   = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);
  const [entries, setEntries] = useState([]);

  const load = useCallback(async (signal) => {
    if (!childId) return;
    try {
      const res = await api.get(`/teacher/children/${childId}/daily-entries?limit=30`, { signal });
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
    if (!childId || !date) return;
    setError(null);
    setSaving(true);
    try {
      const hygieneData = Object.fromEntries(
        DAILY_JOURNAL_ITEMS.hygiene.map(i => [i.code, checks[i.code] || false])
      );
      const healthData = Object.fromEntries(
        DAILY_JOURNAL_ITEMS.health.map(i => [i.code, checks[i.code] || false])
      );
      const giData = Object.fromEntries(
        DAILY_JOURNAL_ITEMS.gi.map(i => [i.code, checks[i.code] || false])
      );
      const res = await api.post(`/teacher/children/${childId}/daily-entries`, {
        entryDate: date,
        hygieneData, healthData, giData,
        irrId: null,
        notes,
      });
      setEntries(prev => [res.data.data, ...prev]);
      setChecks({});
      setNotes('');
    } catch (err) {
      const code = err?.response?.data?.error?.code;
      setError(code === 'DAILY_ENTRY_DUPLICATE'
        ? t('monitoring.daily.duplicate', { defaultValue: 'Bu sana uchun yozuv allaqachon mavjud' })
        : t('monitoring.daily.saveFailed', { defaultValue: 'Saqlab boʻlmadi' }));
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
          {t('monitoring.daily.title', { defaultValue: 'Kundalik monitoring' })}
        </h2>
        <p className="text-[12px] text-slate-500 mt-0.5">
          {t('monitoring.daily.subtitle', { defaultValue: `Bolalarni kunduzgi xizmatga qabul qilish / topshirish jurnali (${DAILY_ITEM_COUNT} ko'rsatkich)` })}
        </p>
      </div>

      <div className="px-5 py-4 space-y-4">
        <label className="block">
          <span className="text-[12px] text-slate-600">{t('monitoring.date', { defaultValue: 'Sana' })}</span>
          <input
            type="date"
            value={date}
            max={todayLocal()}
            onChange={e => { setDate(e.target.value); setError(null); }}
            className="mt-1 w-full md:w-48 px-3 py-2 border border-slate-200 rounded-md text-[13px] focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </label>

        {[
          { key: 'hygiene', items: DAILY_JOURNAL_ITEMS.hygiene, title: t('monitoring.daily.hygiene', { defaultValue: 'Gigiena koʻrsatkichlari' }), count: 9 },
          { key: 'health',  items: DAILY_JOURNAL_ITEMS.health,  title: t('monitoring.daily.health',  { defaultValue: 'Sogʻliq koʻrsatkichlari' }),  count: 11 },
          { key: 'gi',      items: DAILY_JOURNAL_ITEMS.gi,      title: t('monitoring.daily.gi',      { defaultValue: 'Meʼda-ichak koʻrsatkichlari' }), count: 7 },
        ].map(section => (
          <div key={section.key}>
            <h3 className="text-[13px] font-semibold text-slate-700 mb-2">
              {section.title} ({section.count} ta)
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
          disabled={saving || !date}
          className="h-9 px-4 rounded-md bg-brand-600 text-white text-[13px] font-medium disabled:opacity-50 inline-flex items-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {t('monitoring.saveDaily', { defaultValue: 'Kundalik monitoringni saqlash' })}
        </button>
      </div>

      {entries.length > 0 && (
        <div className="px-5 py-3">
          <h3 className="text-[13px] font-semibold text-slate-700 mb-2">
            {t('monitoring.recent', { defaultValue: "So'nggi yozuvlar" })}
          </h3>
          <div className="space-y-0.5">
            {entries.slice(0, 10).map(e => (
              <div key={e.id} className="flex justify-between items-center text-[12px] py-1.5 border-b border-slate-100 last:border-0">
                <span className="text-slate-600">{formatDate(e.entryDate)}</span>
                {e.notes && <span className="text-slate-400 truncate ml-2 max-w-[60%]">{e.notes}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyMonitoringTab;
