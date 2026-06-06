// PP-JOURNAL-FEATURE — parent read of the teacher's daily journal entries.
//
// Data: GET /parent/children/:id/journal — scoped by Child.parentId on the
//       backend (canonical chain, same boundary as PP-ATTENDANCE-SURFACE).
//       Filters by isVisibleToParent: true so the teacher can keep notes
//       private; parents only see what the teacher chose to share.
// Shape: { date, content, teacherFirstName, teacherLastName }.
// Dates: rendered through @shared/utils/formatDate (S6) driven by i18n.language.
// Read-only — no compose / edit / delete affordance.

import { useState, useEffect, useCallback } from 'react';
import { CalendarDays, NotebookPen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useChild } from '../context/ChildContext';
import ChildSwitcher from '../components/ChildSwitcher';
import LoadingSpinner from '../components/LoadingSpinner';
import Card from '../components/Card';
import ParentPageHeader from '../components/ParentPageHeader';
import { useToast } from '../../shared/context/ToastContext';
import { formatDateMonthLong } from '@shared/utils/formatDate';

const Journal = () => {
  const { t, i18n } = useTranslation();
  const { selectedChildId, children } = useChild();
  const { error: showError } = useToast();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!selectedChildId) { setEntries([]); return; }
    setLoading(true);
    try {
      const res = await api.get(`/parent/children/${selectedChildId}/journal`);
      setEntries(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      showError(err.response?.data?.error || t('parentJournal.loadError'));
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [selectedChildId, showError, t]);

  useEffect(() => { load(); }, [load]);

  if (!selectedChildId) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card className="p-8 text-center">
          <NotebookPen className="w-12 h-12 mx-auto mb-3 text-p-sepia-400" />
          <p className="text-p-ink/70">{t('parentJournal.noChild')}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-in fade-in duration-300">
      <ParentPageHeader
        title={t('parentJournal.title')}
        subtitle={t('parentJournal.subtitle')}
        count={entries.length}
      />

      {children?.length > 1 && (
        <div className="flex items-center justify-start">
          <ChildSwitcher />
        </div>
      )}

      {loading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner size="md" />
        </div>
      ) : entries.length === 0 ? (
        <Card className="p-8 text-center">
          <NotebookPen className="w-12 h-12 mx-auto mb-3 text-p-sepia-400" />
          <p className="text-p-ink/70">{t('parentJournal.empty')}</p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {entries.map((e) => {
            const authorName = [e.teacherFirstName, e.teacherLastName]
              .filter(Boolean)
              .join(' ')
              .trim() || t('parentJournal.author');
            return (
              <li key={e.id}>
                <Card className="p-5">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[.12em] text-p-sepia-500 mb-2">
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>{formatDateMonthLong(e.date, i18n.language) || e.date}</span>
                    <span aria-hidden="true">·</span>
                    <span>{authorName}</span>
                  </div>
                  <p className="text-[14px] leading-relaxed text-p-ink whitespace-pre-wrap break-words">
                    {e.content}
                  </p>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default Journal;
