// PP-IA-REDESIGN — Dashboard ("Bugun") as a narrative daily heartbeat.
//
// Layout (top → bottom):
//   1. Date + "snapshot" eyebrow
//   2. 4-tile row: today's attendance, meals, photos, activities (deep-link to detail pages)
//   3. Latest journal entry preview → /journal
//   4. Quick links list (5 secondary destinations)
//
// The notification bell + brand identity now live in MobileTopBar / DesktopTopNav,
// so this page is content-only.

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSocket } from '../../shared/context/SocketContext';
import { useTranslation } from 'react-i18next';
import { useChild } from '../context/ChildContext';
import { useNotification } from '../context/NotificationContext';
import { useToast } from '../../shared/context/ToastContext';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Activity, UtensilsCrossed, Camera, Star,
  ChevronRight, TrendingUp, Dumbbell, Settings, CalendarCheck, NotebookPen,
} from 'lucide-react';
import { formatDateWeekdayMonth } from '@shared/utils/formatDate';

const todayIso = () => new Date().toISOString().slice(0, 10);

// Statuses come from the shared TP-DAVOMAT-REWORK taxonomy.
const ATTENDANCE_LABEL_KEY = {
  present:      'attendance.statusPresent',
  home_leave:   'attendance.statusHomeLeave',
  sick:         'attendance.statusSick',
  hospitalized: 'attendance.statusHospitalized',
  absent:       'attendance.statusAbsent',
};
const ATTENDANCE_TONE = {
  present:      'text-success-700 bg-success-50  border-success-200',
  home_leave:   'text-warning-700 bg-warning-50  border-warning-200',
  sick:         'text-error-700   bg-error-50    border-error-200',
  hospitalized: 'text-error-700   bg-error-50    border-error-200',
  absent:       'text-p-sepia-700 bg-p-sepia-50  border-p-sepia-200',
};

const Dashboard = () => {
  const { on, off, connected } = useSocket();
  const { selectedChildId } = useChild();
  const { refreshNotifications } = useNotification();
  const { t, i18n } = useTranslation();
  const { error: showError } = useToast();

  const [today, setToday] = useState({
    attendanceStatus: null,
    mealsTotal: 0,
    mealsEaten: 0,
    mediaCount: 0,
    activitiesCount: 0,
    latestJournal: null,
  });
  const [loading, setLoading] = useState(true);

  const fetchToday = useCallback(async (signal) => {
    if (!selectedChildId) return null;
    const date = todayIso();

    const [attendanceRes, mealsRes, mediaRes, activitiesRes, journalRes] = await Promise.all([
      api.get('/parent/attendance', {
        params: { childId: selectedChildId, startDate: date, endDate: date },
        signal,
      }).catch(() => ({ data: { data: { records: [] } } })),
      api.get(`/meals?childId=${selectedChildId}`, { signal }).catch(() => ({ data: { meals: [] } })),
      api.get(`/media?childId=${selectedChildId}`, { signal }).catch(() => ({ data: { media: [] } })),
      api.get(`/activities?childId=${selectedChildId}`, { signal }).catch(() => ({ data: { activities: [] } })),
      api.get(`/parent/children/${selectedChildId}/journal`, { signal }).catch(() => ({ data: { data: [] } })),
    ]);

    const records = attendanceRes.data?.data?.records || [];
    const todayAttendance = records.find(r => r.date === date) || null;

    const meals = mealsRes.data?.meals || mealsRes.data || [];
    const todayMeals = Array.isArray(meals) ? meals.filter(m => m.date === date) : [];

    const media = mediaRes.data?.media || mediaRes.data || [];
    const todayMedia = Array.isArray(media) ? media.filter(m => (m.date || '').slice(0, 10) === date) : [];

    const activities = activitiesRes.data?.activities || activitiesRes.data || [];
    const todayActivities = Array.isArray(activities)
      ? activities.filter(a => {
          // Activities have date ranges (startDate/endDate). Count "active today".
          const start = (a.startDate || '').slice(0, 10);
          const end = (a.endDate || '').slice(0, 10);
          return (!start || start <= date) && (!end || end >= date);
        })
      : [];

    const journal = Array.isArray(journalRes.data?.data) ? journalRes.data.data : [];
    const latestJournal = journal.find(j => (j.date || '').slice(0, 10) === date) || journal[0] || null;

    return {
      attendanceStatus: todayAttendance?.status || null,
      mealsTotal: todayMeals.length,
      mealsEaten: todayMeals.filter(m => m.eaten).length,
      mediaCount: todayMedia.length,
      activitiesCount: todayActivities.length,
      latestJournal,
    };
  }, [selectedChildId]);

  useEffect(() => {
    if (!selectedChildId) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true);
    fetchToday(controller.signal)
      .then(data => {
        if (data) setToday(data);
        refreshNotifications();
      })
      .catch(err => {
        if (err.code === 'ERR_CANCELED') return;
        showError(t('common.networkError'));
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [selectedChildId, fetchToday, refreshNotifications, showError, t]);

  useEffect(() => {
    if (!connected || !selectedChildId) return;
    const reload = () => fetchToday().then(d => d && setToday(d)).catch(() => {});
    const events = ['activity:created','activity:updated','activity:deleted','meal:created','meal:updated','meal:deleted','media:created','media:updated','media:deleted','attendance:updated','journal:created'];
    events.forEach(ev => on(ev, reload));
    return () => events.forEach(ev => off(ev, reload));
  }, [connected, selectedChildId, fetchToday, on, off]);

  const dateLabel = useMemo(() => formatDateWeekdayMonth(todayIso(), i18n.language), [i18n.language]);

  const attendanceLabel = today.attendanceStatus
    ? t(ATTENDANCE_LABEL_KEY[today.attendanceStatus] || 'attendance.statusAbsent')
    : t('dashboard.attendanceUnknown');
  const attendanceTone = today.attendanceStatus
    ? ATTENDANCE_TONE[today.attendanceStatus] || ATTENDANCE_TONE.absent
    : 'text-p-sepia-600 bg-p-sepia-50 border-p-sepia-200';

  const quickLinks = [
    { labelKey: 'child.row.irr',            icon: TrendingUp, href: '/irr' },
    { labelKey: 'child.row.individualPlan', icon: Activity,   href: '/activities' },
    { labelKey: 'child.row.therapy',        icon: Dumbbell,   href: '/therapy' },
    { labelKey: 'child.row.rating',         icon: Star,       href: '/rating' },
    { labelKey: 'child.row.settings',       icon: Settings,   href: '/settings' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Today header */}
      <div>
        <p className="text-[11px] uppercase tracking-[.12em] font-semibold text-p-brand-600 mb-1">
          {t('dashboard.snapshot')}
        </p>
        <h1 className="font-serif text-[24px] leading-tight text-p-ink font-semibold">
          {dateLabel}
        </h1>
      </div>

      {/* Today tiles row (4 stats, click → detail) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          to="/attendance"
          className={`page-card rounded-xl p-3 border transition-shadow hover:shadow-md ${attendanceTone}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <CalendarCheck className="w-4 h-4" />
            <span className="text-[11px] uppercase tracking-wider font-semibold">
              {t('dashboard.todayAttendance')}
            </span>
          </div>
          <p className="text-[14px] font-semibold leading-tight">
            {attendanceLabel}
          </p>
        </Link>

        <Link
          to="/meals"
          className="page-card rounded-xl p-3 border border-p-sepia-200 bg-p-surface hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-2 mb-1 text-p-brand-600">
            <UtensilsCrossed className="w-4 h-4" />
            <span className="text-[11px] uppercase tracking-wider font-semibold">
              {t('dashboard.todayMeals')}
            </span>
          </div>
          <p className="text-[14px] font-semibold text-p-ink leading-tight tnum">
            {today.mealsEaten}/{today.mealsTotal}
          </p>
        </Link>

        <Link
          to="/media?range=today"
          className="page-card rounded-xl p-3 border border-p-sepia-200 bg-p-surface hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-2 mb-1 text-p-brand-600">
            <Camera className="w-4 h-4" />
            <span className="text-[11px] uppercase tracking-wider font-semibold">
              {t('dashboard.todayMedia')}
            </span>
          </div>
          <p className="text-[14px] font-semibold text-p-ink leading-tight tnum">
            {today.mediaCount}
          </p>
        </Link>

        <Link
          to="/activities"
          className="page-card rounded-xl p-3 border border-p-sepia-200 bg-p-surface hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-2 mb-1 text-p-brand-600">
            <Activity className="w-4 h-4" />
            <span className="text-[11px] uppercase tracking-wider font-semibold">
              {t('dashboard.todayActivities')}
            </span>
          </div>
          <p className="text-[14px] font-semibold text-p-ink leading-tight tnum">
            {today.activitiesCount}
          </p>
        </Link>
      </div>

      {/* Latest journal entry */}
      <Link
        to="/journal"
        className="page-card page-corner rounded-xl p-5 block hover:shadow-md transition-shadow"
      >
        <div className="flex items-center gap-2 mb-3">
          <NotebookPen className="w-4 h-4 text-p-brand-500" />
          <span className="text-[11px] uppercase tracking-[.12em] font-semibold text-p-brand-600">
            {t('dashboard.latestJournalEyebrow')}
          </span>
        </div>
        {today.latestJournal ? (
          <>
            <p className="text-[14px] text-p-ink leading-relaxed whitespace-pre-wrap line-clamp-3">
              {today.latestJournal.content}
            </p>
            <p className="text-[12px] text-p-sepia-500 mt-3">
              — {today.latestJournal.teacherFirstName} {today.latestJournal.teacherLastName}
            </p>
          </>
        ) : (
          <p className="text-[13px] text-p-sepia-500 italic">
            {t('dashboard.noJournalToday')}
          </p>
        )}
      </Link>

      <div className="stitch" />

      {/* Quick access links */}
      <div>
        <h2 className="text-[13px] uppercase tracking-[.1em] font-semibold text-p-sepia-500 mb-3">
          {t('dashboard.quickAccess')}
        </h2>
        <div className="space-y-2">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="page-card rounded-lg px-4 py-3 flex items-center gap-3 hover:shadow-md transition-shadow group"
            >
              <div className="w-8 h-8 rounded-md bg-p-brand-50 grid place-items-center shrink-0">
                <item.icon className="w-4 h-4 text-p-brand-600" />
              </div>
              <span className="flex-1 text-[14px] font-medium text-p-ink">{t(item.labelKey)}</span>
              <ChevronRight className="w-4 h-4 text-p-sepia-400 group-hover:text-p-brand-600 transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
