import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { AttendanceGrid } from '../components/AttendanceGrid';
import { useTranslation } from 'react-i18next';
import api from '../shared/services/api';
import { useToast } from '../shared/context/ToastContext';
import { todayLocal } from '@shared/utils/formatDate';

const FILTER_OPTIONS = [
  { key: 'all' },
  { key: 'present' },
  { key: 'home_leave' },
  { key: 'sick' },
  { key: 'hospitalized' },
  { key: 'absent' },
];

const FILTER_LABEL_KEYS = {
  all:          'attendance.filterAll',
  present:      'attendance.statusPresent',
  home_leave:   'attendance.statusHomeLeave',
  sick:         'attendance.statusSick',
  hospitalized: 'attendance.statusHospitalized',
  absent:       'attendance.statusAbsent',
};

const STATUS_COLORS = {
  present:      '#7AB89A',
  home_leave:   '#C58A1F',
  sick:         '#4D6584',
  hospitalized: '#7C5CBF',
  absent:       '#E55A4E',
};

const todayStr = () => todayLocal();

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function getWeekDates(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(mon);
    dt.setDate(mon.getDate() + i);
    dates.push(dt.toISOString().split('T')[0]);
  }
  return dates;
}

function getMonthDates(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const year = d.getFullYear();
  const month = d.getMonth();
  const last = new Date(year, month + 1, 0).getDate();
  const dates = [];
  for (let day = 1; day <= last; day++) {
    dates.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  }
  return dates;
}

function formatShortDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function StatusDot({ status }) {
  const color = STATUS_COLORS[status];
  if (!color) return <span className="text-slate-300 text-[10px]">—</span>;
  return <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} />;
}

function HistoryGrid({ childList, records, dates }) {
  const { t } = useTranslation();
  const lookup = {};
  for (const r of records) {
    lookup[`${r.childId}-${r.date?.split('T')[0] || r.date}`] = r.status;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]" style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: `${140 + dates.length * 32}px` }}>
        <thead>
          <tr>
            <th className="text-left py-1.5 px-2 text-slate-500 font-medium sticky left-0 bg-surface z-10 min-w-[120px]">{t('attendance.historyName')}</th>
            {dates.map(d => (
              <th key={d} className="text-center py-1.5 px-0.5 text-slate-400 font-medium w-8">
                {formatShortDate(d)}
              </th>
            ))}
            <th className="text-center py-1.5 px-2 text-slate-500 font-medium min-w-[44px]">{t('attendance.historyPresent')}</th>
          </tr>
        </thead>
        <tbody>
          {childList.map(child => {
            let presentCount = 0;
            const dayCount = dates.length;
            return (
              <tr key={child.id} className="border-t border-slate-100">
                <td className="py-1.5 px-2 font-medium text-slate-800 sticky left-0 bg-surface z-10 whitespace-nowrap">
                  {child.firstName} {child.lastName?.charAt(0)}.
                </td>
                {dates.map(d => {
                  const status = lookup[`${child.id}-${d}`];
                  if (status === 'present') presentCount++;
                  return (
                    <td key={d} className="py-1.5 px-0.5 text-center">
                      <StatusDot status={status} />
                    </td>
                  );
                })}
                <td className="py-1.5 px-2 text-center text-[11px] font-semibold text-slate-700">
                  {presentCount}/{dayCount}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const Attendance = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { success, error: showError } = useToast();

  const [viewMode, setViewMode] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [children, setChildren] = useState([]);
  const [states, setStates] = useState({});
  const [filter, setFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [hasSavedData, setHasSavedData] = useState(false);

  const today = todayStr();
  const isFuture = selectedDate > today;

  // Load children once on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/teacher/children');
        const list = res.data?.data || res.data || [];
        setChildren(Array.isArray(list) ? list : []);
      } catch {
        setChildren([]);
        showError(t('attendance.errorLoadChildren'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [showError, t]);

  // Load attendance records for the selected date (daily view)
  useEffect(() => {
    if (viewMode !== 'daily' || children.length === 0) return;
    setHasSavedData(false);
    const load = async () => {
      try {
        const res = await api.get('/attendance', { params: { startDate: selectedDate, endDate: selectedDate } });
        const records = res.data?.data || [];
        const newStates = {};
        children.forEach(c => { newStates[c.id] = 'unset'; });
        records.forEach(r => {
          const date = r.date?.split('T')[0] || r.date;
          if (date === selectedDate) newStates[r.childId] = r.status;
        });
        setStates(newStates);
        setHasSavedData(records.length > 0);
      } catch {
        const newStates = {};
        children.forEach(c => { newStates[c.id] = 'unset'; });
        setStates(newStates);
      }
    };
    load();
  }, [selectedDate, viewMode, children]);

  const loadHistory = useCallback(async (dates) => {
    if (dates.length === 0) return;
    setHistoryLoading(true);
    try {
      const res = await api.get('/attendance', { params: { startDate: dates[0], endDate: dates[dates.length - 1] } });
      setHistoryRecords(res.data?.data || []);
    } catch {
      setHistoryRecords([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (viewMode === 'week') loadHistory(getWeekDates(selectedDate));
    else if (viewMode === 'month') loadHistory(getMonthDates(selectedDate));
  }, [viewMode, selectedDate, loadHistory]);

  const handleStateChange = (childId, newState) => {
    setStates(prev => ({ ...prev, [childId]: newState }));
  };

  const handleMarkAll = () => {
    const allPresent = {};
    children.forEach(c => { allPresent[c.id] = 'present'; });
    setStates(allPresent);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const records = children.map(c => ({
        childId: c.id,
        date: selectedDate,
        status: states[c.id] || 'unset',
      }));
      const res = await api.post('/attendance', { records });
      // D-01: the backend returns 207 (a 2xx, so axios does NOT throw) when some
      // records were refused. Treating that as success is what silently discarded
      // children — including their absences — while showing "Davomat saqlandi".
      const payload = res.data ?? {};
      const failed = payload.data?.errors ?? [];
      if (payload.success === false || failed.length > 0) {
        const names = failed
          .map(e => children.find(c => c.id === e.childId))
          .filter(Boolean)
          .map(c => `${c.firstName} ${c.lastName ?? ''}`.trim());
        showError(
          names.length
            ? t('attendance.partialSaveNamed', { names: names.join(', ') })
            : t('attendance.partialSave', { count: failed.length })
        );
        return; // stay on the page so the teacher can see and correct the grid
      }
      success(t('attendance.saved'));
      navigate('/teacher');
    } catch (err) {
      const code = err.response?.data?.error?.code;
      const detail = err.response?.data?.error?.detail;
      const msg = code
        ? ((() => {
            // S2b: backend codes are unbounded — explicit resolution, no
            // defaultValue mask.
            const k = `errors.${code}`;
            const tr = t(k);
            return tr !== k ? tr : (detail || t('attendance.errorSave'));
          })())
        : t('attendance.errorSave');
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  const shiftDate = (delta) => {
    if (viewMode === 'week') {
      const next = addDays(selectedDate, delta * 7);
      if (delta > 0 && next > today) return;
      setSelectedDate(next);
    } else if (viewMode === 'month') {
      const d = new Date(selectedDate + 'T12:00:00');
      d.setMonth(d.getMonth() + delta);
      const next = d.toISOString().split('T')[0];
      if (delta > 0 && next.substring(0, 7) > today.substring(0, 7)) return;
      setSelectedDate(next);
    } else {
      const next = addDays(selectedDate, delta);
      if (delta > 0 && next > today) return;
      setSelectedDate(next);
    }
  };

  const nextBlocked = () => {
    if (viewMode === 'daily') return selectedDate >= today;
    if (viewMode === 'week') return getWeekDates(selectedDate).some(d => d >= today);
    if (viewMode === 'month') return selectedDate.substring(0, 7) >= today.substring(0, 7);
    return false;
  };

  const filtered = filter === 'all' ? children : children.filter(c => states[c.id] === filter);
  const markedCount = Object.values(states).filter(s => s && s !== 'unset').length;
  const total = children.length;
  const progressPct = total > 0 ? Math.round((markedCount / total) * 100) : 0;

  const counts = { all: total };
  children.forEach(c => {
    const s = states[c.id] || 'unset';
    if (s !== 'unset') counts[s] = (counts[s] || 0) + 1;
  });

  const VIEW_TABS = [
    { key: 'daily', label: t('attendance.viewDaily') },
    { key: 'week',  label: t('attendance.viewWeek') },
    { key: 'month', label: t('attendance.viewMonth') },
  ];

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => <div key={i} className="skel h-20 rounded-xl" />)}
      </div>
    );
  }

  const historyDates = viewMode === 'week'
    ? getWeekDates(selectedDate)
    : viewMode === 'month'
      ? getMonthDates(selectedDate)
      : [];

  return (
    <div className="pb-32">
      <div className="max-w-lg mx-auto">
      {/* View tabs */}
      <div className="flex items-center gap-1 mb-3 pt-2">
        {VIEW_TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setViewMode(tab.key)}
            className="h-8 px-3 rounded-full text-[12px] font-medium transition-colors"
            style={
              viewMode === tab.key
                ? { background: '#2A2E39', color: '#FFFFFE' }
                : { background: '#FFFFFE', border: '1px solid #DDE0E6', color: '#3D424F' }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date navigation */}
      <div className="flex items-center gap-2 mb-3">
        <button
          type="button"
          onClick={() => shiftDate(-1)}
          className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors flex-shrink-0"
        >
          <ChevronLeft className="w-4 h-4 text-slate-600" />
        </button>
        <input
          type="date"
          value={selectedDate}
          max={today}
          onChange={e => { if (e.target.value) setSelectedDate(e.target.value); }}
          className="flex-1 h-8 px-2 rounded-lg border border-slate-200 text-[13px] text-slate-800 text-center bg-surface"
        />
        <button
          type="button"
          onClick={() => shiftDate(1)}
          disabled={nextBlocked()}
          className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
        >
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </button>
      </div>

      {/* Daily view */}
      {viewMode === 'daily' && (
        <>
          <div className="px-1 pb-3">
            <div className="text-[12px] text-slate-500">
              {children[0]?.groupName || t('attendance.group')} · {total} {t('attendance.children')}
            </div>
            {hasSavedData && !isFuture && (
              <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 border border-green-200 rounded-lg text-[11px] text-green-700 w-fit">
                <CheckCheck className="w-3 h-3 flex-shrink-0" strokeWidth={2.5} />
                {t('attendance.alreadySaved')}
              </div>
            )}
            {!isFuture && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="mt-2 h-9 px-3 rounded-full bg-brand-50 text-brand-700 text-[13px] font-medium flex items-center gap-1.5 hover:bg-brand-100 transition-colors"
              >
                <CheckCheck className="w-4 h-4" strokeWidth={1.75} />
                {t('attendance.markAll')}
              </button>
            )}
          </div>

          {/* Filter chips */}
          <div className="overflow-x-auto pb-2">
            <div className="flex items-center gap-1.5 text-[12px] min-w-max">
              {FILTER_OPTIONS.map(opt => {
                const count = opt.key === 'all' ? total : (counts[opt.key] || 0);
                const active = filter === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setFilter(opt.key)}
                    className="h-7 px-2.5 rounded-full font-medium transition-colors"
                    style={
                      active
                        ? { background: '#2A2E39', color: '#FFFFFE' }
                        : { background: '#FFFFFE', border: '1px solid #DDE0E6', color: '#3D424F' }
                    }
                  >
                    {t(FILTER_LABEL_KEYS[opt.key])} · {count}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid */}
          <div className="mt-1">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-[13px] text-slate-500">
                {t('attendance.noChildren')}
              </div>
            ) : (
              <AttendanceGrid
                childList={filtered}
                states={states}
                onStateChange={handleStateChange}
              />
            )}
          </div>

          {/* Sticky save bar — only when date is not in the future */}
          {!isFuture && (
            <div className="fixed bottom-0 inset-x-0 bg-surface border-t border-slate-200 p-3 z-30">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="relative w-full h-11 rounded-md text-surface text-[14px] font-medium overflow-hidden disabled:opacity-60"
                style={{ background: '#525868' }}
              >
                <span
                  className="absolute left-0 top-0 bottom-0 bg-brand-600 transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
                <span className="relative">
                  {saving
                    ? t('attendance.saving')
                    : `${t('attendance.saveProgress', { total, marked: markedCount })} · ${hasSavedData ? t('attendance.saveUpdate') : t('common.save')}`}
                </span>
              </button>
            </div>
          )}
        </>
      )}

      </div>

      {/* Week / Month history view */}
      {(viewMode === 'week' || viewMode === 'month') && (
        <div className="mt-1">
          {historyLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <div key={i} className="skel h-8 rounded" />)}
            </div>
          ) : children.length === 0 ? (
            <div className="text-center py-12 text-[13px] text-slate-500">
              {t('attendance.noChildren')}
            </div>
          ) : (
            <>
              {/* Status legend */}
              <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3 text-[10px] text-slate-500">
                {Object.entries(STATUS_COLORS).map(([s, color]) => (
                  <span key={s} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                    {t(FILTER_LABEL_KEYS[s])}
                  </span>
                ))}
              </div>
              <HistoryGrid childList={children} records={historyRecords} dates={historyDates} />
              {historyRecords.length === 0 && (
                <div className="text-center pt-6 text-[13px] text-slate-400">
                  {t('attendance.noHistory')}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Attendance;
