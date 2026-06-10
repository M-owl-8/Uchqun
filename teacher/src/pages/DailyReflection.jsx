import { useState, useEffect, useRef } from 'react';
import { Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ParentJournalComposer } from '../components/ParentJournalComposer';
import api from '../shared/services/api';
import { todayLocal } from '@shared/utils/formatDate';

const getReflectionKey = () => {
  const d = todayLocal();
  return `teacher:reflection:${d}`;
};

const DailyReflection = () => {
  const { t, i18n } = useTranslation();
  const reflKey = getReflectionKey();
  const [reflection, setReflection] = useState(
    () => localStorage.getItem(reflKey) || ''
  );
  const [children, setChildren] = useState([]);
  const [saving, setSaving]     = useState(false);
  const autoSaveTimer = useRef(null);

  const today = new Date().toLocaleDateString(i18n.language, {
    day: 'numeric', month: 'long', year: 'numeric', weekday: 'long',
  });

  useEffect(() => {
    api.get('/teacher/children')
      .then((res) => {
        const list = res.data?.data || res.data || [];
        setChildren(Array.isArray(list) ? list : []);
      })
      .catch(() => { /* parent journal composer still usable */ });
  }, []);

  // Auto-save reflection to localStorage
  useEffect(() => {
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      localStorage.setItem(reflKey, reflection);
    }, 1000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [reflection, reflKey]);

  const handleSaveReflection = async () => {
    if (!reflection.trim()) return;
    setSaving(true);
    try {
      await api.post('/teacher/reflections', {
        date:      todayLocal(),
        content:   reflection,
        isPrivate: true,
      });
    } catch {
      // Graceful fail — localStorage has the draft
    } finally {
      setSaving(false);
    }
  };

  // PP-JOURNAL-BULK — composer sends {subject, body, recipientIds, photos};
  // we translate to the backend's bulk shape and drop photos (a follow-up;
  // composer keeps showing the "not persisted" warning when photos are
  // attached). Returns the server response so the composer can surface
  // per-recipient failures.
  const handleJournalSend = async ({ subject, body, recipientIds }) => {
    const res = await api.post('/teacher/journal/bulk', {
      subject,
      body,
      recipientIds,
      date: todayLocal(),
      isVisibleToParent: true,
    });
    return res.data;
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1
          className="text-[22px] md:text-[28px] font-semibold text-slate-900"
          style={{ borderLeft: '4px solid #7A6FA8', paddingLeft: '14px' }}
        >
          {t('reflection.title')}
        </h1>
        <p className="mt-1 text-[14px] text-slate-600 pl-[18px]">{today}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1.4fr] gap-6">
        {/* LEFT: Private reflection */}
        <div className="rounded-xl border border-slate-200 bg-surface p-5">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
            <span className="text-[12px] font-medium text-slate-700 uppercase tracking-[.1em]">{t('reflection.private')}</span>
            <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px]">
              {t('reflection.privateNote')}
            </span>
          </div>
          <textarea
            value={reflection}
            onChange={e => setReflection(e.target.value)}
            onBlur={handleSaveReflection}
            placeholder={t('reflection.placeholder')}
            className="w-full text-[15px] text-slate-800 leading-[1.7] placeholder:text-slate-400 outline-none resize-none bg-transparent"
            rows={10}
          />
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>{t('reflection.autoSave')}</span>
            {saving && <span className="text-brand-700">{t('reflection.saving')}</span>}
          </div>
        </div>

        {/* RIGHT: Parent journal composer */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-[3px] h-4 bg-brand-600 rounded" />
            <h2 className="text-[16px] font-semibold text-slate-900">{t('reflection.parentJournal')}</h2>
          </div>
          <div className="min-h-[320px] lg:min-h-[500px]">
            <ParentJournalComposer
              childList={children}
              onSend={handleJournalSend}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyReflection;
