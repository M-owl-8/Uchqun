// PP-ATTENDANCE-SURFACE — parents view their child's daily attendance.
//
// Data: GET /parent/attendance — scoped by Child.parentId on the backend.
// Statuses: TP-DAVOMAT-REWORK taxonomy (present / home_leave / sick /
//           hospitalized / absent). Localized via the shared attendance.*
//           catalog keys (same as teacher), NOT a parent-side fork.
// Dates:    every render through @shared/utils/formatDate (S6), driven by
//           i18n.language.

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useChild } from '../context/ChildContext';
import ChildSwitcher from '../components/ChildSwitcher';
import LoadingSpinner from '../components/LoadingSpinner';
import Card from '../components/Card';
import ParentPageHeader from '../components/ParentPageHeader';
import { useToast } from '../../shared/context/ToastContext';
import {
  formatDateWeekdayMonth,
  formatDateShort,
  formatDateMedium,
} from '@shared/utils/formatDate';

const STATUS_META = {
  present:      { color: 'bg-success-100 text-success-800 border-success-300', dot: 'bg-success-500', labelKey: 'attendance.statusPresent' },
  home_leave:   { color: 'bg-warning-100 text-warning-800 border-warning-300', dot: 'bg-warning-500', labelKey: 'attendance.statusHomeLeave' },
  sick:         { color: 'bg-error-50 text-error-700 border-error-200',         dot: 'bg-error-400',   labelKey: 'attendance.statusSick' },
  hospitalized: { color: 'bg-error-100 text-error-800 border-error-300',        dot: 'bg-error-500',   labelKey: 'attendance.statusHospitalized' },
  absent:       { color: 'bg-slate-100 text-slate-700 border-slate-300',        dot: 'bg-slate-400',   labelKey: 'attendance.statusAbsent' },
};

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

// Anchor of week = Monday of the given date
const mondayOf = (d) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

const isoOf = (d) => new Date(d).toISOString().slice(0, 10);

const Attendance = () => {
  const { t, i18n } = useTranslation();
  const { selectedChildId, selectedChild, children } = useChild();
  const { error: showError } = useToast();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('day');                    // 'day' | 'week'
  const [anchorDate, setAnchorDate] = useState(todayIsoDate); // current focus date

  const isFuture = (iso) => iso > todayIsoDate();

  // Range to fetch based on the view
  const range = useMemo(() => {
    if (view === 'day') return { start: anchorDate, end: anchorDate };
    const monday = mondayOf(anchorDate);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { start: isoOf(monday), end: isoOf(sunday) };
  }, [view, anchorDate]);

  const load = useCallback(async () => {
    if (!selectedChildId) {
      setRecords([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get('/parent/attendance', {
        params: {
          childId: selectedChildId,
          startDate: range.start,
          endDate: range.end,
        },
      });
      setRecords(res.data?.data?.records || []);
    } catch (err) {
      showError(err.response?.data?.error || t('parentAttendance.loadError'));
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [selectedChildId, range.start, range.end, showError, t]);

  useEffect(() => { load(); }, [load]);

  // Day-view: single record or null
  const dayRecord = useMemo(() => {
    if (view !== 'day') return null;
    return records.find(r => r.date === anchorDate) || null;
  }, [records, anchorDate, view]);

  // Week-view: 7 columns, each may or may not have a record
  const weekDays = useMemo(() => {
    if (view !== 'week') return [];
    const monday = mondayOf(anchorDate);
    return [...Array(7)].map((_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const iso = isoOf(d);
      const rec = records.find(r => r.date === iso) || null;
      return { iso, date: d, record: rec };
    });
  }, [records, anchorDate, view]);

  const goPrev = () => {
    const d = new Date(anchorDate);
    if (view === 'day') d.setDate(d.getDate() - 1);
    else d.setDate(d.getDate() - 7);
    setAnchorDate(isoOf(d));
  };

  const goNext = () => {
    const d = new Date(anchorDate);
    if (view === 'day') d.setDate(d.getDate() + 1);
    else d.setDate(d.getDate() + 7);
    const next = isoOf(d);
    // Block future
    if (view === 'day' && next > todayIsoDate()) return;
    if (view === 'week') {
      const monday = mondayOf(next);
      if (isoOf(monday) > todayIsoDate()) return;
    }
    setAnchorDate(next);
  };

  const goToday = () => setAnchorDate(todayIsoDate());

  // Block-next decision for the disabled state
  const nextDisabled = useMemo(() => {
    const d = new Date(anchorDate);
    if (view === 'day') {
      d.setDate(d.getDate() + 1);
      return isoOf(d) > todayIsoDate();
    }
    d.setDate(d.getDate() + 7);
    const monday = mondayOf(d);
    return isoOf(monday) > todayIsoDate();
  }, [anchorDate, view]);

  if (!selectedChildId) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card className="p-8 text-center">
          <CalendarDays className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-600">{t('parentAttendance.noChildSelected')}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-in fade-in duration-300">
      <ParentPageHeader
        title={t('parentAttendance.title')}
        subtitle={t('parentAttendance.subtitle')}
      />

      {/* Child switcher (only renders if multiple) */}
      {children?.length > 1 && (
        <div className="flex items-center justify-start">
          <ChildSwitcher />
        </div>
      )}

      {/* View toggle */}
      <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
        {['day', 'week'].map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 text-[13px] font-medium ${
              view === v ? 'bg-brand-600 text-white' : 'bg-surface text-slate-700 hover:bg-slate-50'
            }`}
            type="button"
          >
            {v === 'day' ? t('parentAttendance.viewDay') : t('parentAttendance.viewWeek')}
          </button>
        ))}
      </div>

      {/* Date navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={goPrev}
          aria-label={view === 'day' ? t('parentAttendance.previousDay') : t('parentAttendance.previousWeek')}
          className="w-9 h-9 grid place-items-center rounded-md border border-slate-200 bg-surface hover:bg-slate-50"
          type="button"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-[14px] font-semibold text-slate-900 text-center flex-1">
          {view === 'day'
            ? formatDateWeekdayMonth(anchorDate, i18n.language) || anchorDate
            : `${formatDateMedium(range.start, i18n.language)} – ${formatDateMedium(range.end, i18n.language)}`}
        </div>
        <button
          onClick={goNext}
          disabled={nextDisabled}
          aria-label={view === 'day' ? t('parentAttendance.nextDay') : t('parentAttendance.nextWeek')}
          className="w-9 h-9 grid place-items-center rounded-md border border-slate-200 bg-surface hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          type="button"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {anchorDate !== todayIsoDate() && (
        <button
          onClick={goToday}
          type="button"
          className="text-[12px] font-medium text-brand-600 hover:text-brand-700 underline-offset-2 hover:underline"
        >
          → {t('parentAttendance.today')}
        </button>
      )}

      {/* Content */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner size="md" />
        </div>
      ) : view === 'day' ? (
        <DayView record={dayRecord} t={t} childName={selectedChild ? `${selectedChild.firstName} ${selectedChild.lastName}` : ''} />
      ) : (
        <WeekGrid days={weekDays} t={t} lang={i18n.language} todayIso={todayIsoDate()} isFuture={isFuture} />
      )}
    </div>
  );
};

const DayView = ({ record, t }) => {
  if (!record) {
    return (
      <Card className="p-6 text-center">
        <CalendarDays className="w-10 h-10 mx-auto mb-3 text-slate-300" />
        <p className="text-[13px] text-slate-500">{t('parentAttendance.noRecord')}</p>
      </Card>
    );
  }
  const meta = STATUS_META[record.status];
  if (!meta) return null;
  return (
    <Card className="p-6">
      <div className="flex items-center gap-3">
        <span className={`w-3 h-3 rounded-full ${meta.dot}`} aria-hidden="true" />
        <span className={`px-3 py-1.5 rounded-full text-[13px] font-semibold border ${meta.color}`}>
          {t(meta.labelKey)}
        </span>
      </div>
      {record.note && (
        <div className="mt-4 p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-500 mb-1">
            <Info className="w-3.5 h-3.5" /> {t('parentAttendance.teacherNote')}
          </div>
          <p className="text-[13px] text-slate-800 whitespace-pre-wrap">{record.note}</p>
        </div>
      )}
    </Card>
  );
};

const WeekGrid = ({ days, t, lang, todayIso, isFuture }) => (
  <div className="grid grid-cols-7 gap-1.5">
    {days.map(({ iso, date, record }) => {
      const meta = record ? STATUS_META[record.status] : null;
      const isToday = iso === todayIso;
      const future = isFuture(iso);
      return (
        <div
          key={iso}
          className={`rounded-lg border p-2 min-h-[78px] flex flex-col gap-1 ${
            isToday ? 'border-brand-400 bg-brand-50' : 'border-slate-200 bg-surface'
          } ${future ? 'opacity-40' : ''}`}
        >
          <div className="text-[10px] uppercase tracking-wide text-slate-500">
            {formatDateShort(date, lang)}
          </div>
          {meta ? (
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${meta.dot}`} aria-hidden="true" />
              <span className="text-[10px] font-medium text-slate-700 truncate">{t(meta.labelKey)}</span>
            </div>
          ) : !future ? (
            <span className="text-[10px] text-slate-400">{t('attendance.statusUnset')}</span>
          ) : null}
        </div>
      );
    })}
  </div>
);

export default Attendance;
