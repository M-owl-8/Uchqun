// TP-IA-REDESIGN — Bolalar (Children) tab.
//
// Replaces the old "Ota-onalar" sidebar item. Each card is a CHILD (not a
// parent — parents are reached *through* the child). The card surfaces
// today's per-child snapshot at a glance:
//   - Attendance status today
//   - Latest IRR aggregate score (with trend arrow)
//   - Today's eaten/total meals
//   - Unresolved warning count (if any)
//
// Tap any card → /teacher/children/:id (existing ChildDetail) which now
// surfaces IRR as a one-tap CTA at the top.

import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users, CalendarCheck, UtensilsCrossed, TrendingUp, TrendingDown, Minus, ShieldAlert, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../shared/services/api';
import { useToast } from '../shared/context/ToastContext';
import LoadingSpinner from '../shared/components/LoadingSpinner';
import { todayLocal } from '@shared/utils/formatDate';

// Status badges match the TP-DAVOMAT-REWORK care-model taxonomy.
const STATUS_META = {
  present:      { tone: 'bg-success-50 text-success-700 border-success-200', dot: 'bg-success-500', labelKey: 'attendance.statusPresent' },
  home_leave:   { tone: 'bg-warning-50 text-warning-700 border-warning-200', dot: 'bg-warning-500', labelKey: 'attendance.statusHomeLeave' },
  sick:         { tone: 'bg-error-50 text-error-700 border-error-200',       dot: 'bg-error-400',   labelKey: 'attendance.statusSick' },
  hospitalized: { tone: 'bg-error-50 text-error-700 border-error-200',       dot: 'bg-error-500',   labelKey: 'attendance.statusHospitalized' },
  absent:       { tone: 'bg-slate-100 text-slate-700 border-slate-200',      dot: 'bg-slate-400',   labelKey: 'attendance.statusAbsent' },
};

const Bolalar = () => {
  const { t } = useTranslation();
  const { error: showError } = useToast();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [perChildStats, setPerChildStats] = useState({});

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get('/teacher/children', { signal: controller.signal });
        const list = Array.isArray(res.data?.data) ? res.data.data
                   : Array.isArray(res.data) ? res.data : [];
        setChildren(list);
      } catch (err) {
        if (err.code === 'ERR_CANCELED') return;
        showError(t('bolalar.loadError', { defaultValue: 'Bolalar ro\'yxatini yuklab bo\'lmadi' }));
        setChildren([]);
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [showError, t]);

  // Per-child rich stats — attendance status, today's meals, latest IRR trend.
  // Fetched in parallel after children load. Failures fail open (card shows
  // baseline info without the rich tile).
  useEffect(() => {
    if (children.length === 0) return;
    const date = todayLocal();
    const controller = new AbortController();
    (async () => {
      const entries = await Promise.all(children.map(async (c) => {
        try {
          const [attRes, mealsRes, irrRes] = await Promise.all([
            api.get('/attendance', { params: { childId: c.id, startDate: date, endDate: date }, signal: controller.signal }).catch(() => null),
            api.get('/meals', { params: { childId: c.id }, signal: controller.signal }).catch(() => null),
            api.get(`/teacher/children/${c.id}/irr`, { signal: controller.signal }).catch(() => null),
          ]);
          const todayAtt = (attRes?.data?.data?.records || []).find(r => r.date === date) || null;
          const allMeals = mealsRes?.data?.meals || mealsRes?.data || [];
          const todayMeals = Array.isArray(allMeals) ? allMeals.filter(m => m.date === date) : [];
          const irr = irrRes?.data?.data || null;
          const progression = Array.isArray(irr?.assessmentSessions)
            ? [...irr.assessmentSessions].sort((a, b) => new Date(a.date) - new Date(b.date))
            : [];
          const lastTwo = progression.slice(-2);
          const latestScore = lastTwo[lastTwo.length - 1]?.totalScore;
          const prevScore = lastTwo[0]?.totalScore;
          const trend = (lastTwo.length === 2 && latestScore != null && prevScore != null)
            ? (latestScore > prevScore ? 'up' : latestScore < prevScore ? 'down' : 'flat')
            : null;
          return [c.id, {
            attendanceStatus: todayAtt?.status || null,
            mealsTotal: todayMeals.length,
            mealsEaten: todayMeals.filter(m => m.eaten).length,
            irrScore: latestScore,
            irrTrend: trend,
          }];
        } catch {
          return [c.id, {}];
        }
      }));
      setPerChildStats(Object.fromEntries(entries));
    })();
    return () => controller.abort();
  }, [children]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return children;
    return children.filter(c =>
      (c.firstName || '').toLowerCase().includes(q)
      || (c.lastName || '').toLowerCase().includes(q)
    );
  }, [children, searchQuery]);

  if (loading) {
    return <div className="flex justify-center items-center h-96"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-slate-900">
            {t('bolalar.title', { defaultValue: 'Bolalar' })} ({children.length})
          </h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            {t('bolalar.subtitle', { defaultValue: "Sizning guruhingiz bolalari va bugungi holati" })}
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('bolalar.searchPlaceholder', { defaultValue: 'Bolani qidirish...' })}
            className="pl-9 pr-3 py-2 bg-surface border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent w-full md:w-64 text-[13px]"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="page-card rounded-xl p-10 text-center bg-surface">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-slate-100 grid place-items-center">
            <Users className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-[15px] font-semibold text-slate-900">
            {t('bolalar.empty', { defaultValue: 'Hozircha bolalar yo\'q' })}
          </p>
          <p className="text-[13px] text-slate-500 mt-1">
            {t('bolalar.emptyHint', { defaultValue: 'Yangi bola qabul kelganda shu yerda ko\'rinadi' })}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const stats = perChildStats[c.id] || {};
            const attMeta = stats.attendanceStatus ? STATUS_META[stats.attendanceStatus] : null;
            const initials = `${(c.firstName || '').charAt(0)}${(c.lastName || '').charAt(0)}`.toUpperCase();
            return (
              <Link
                key={c.id}
                to={`/teacher/children/${c.id}`}
                className="bg-surface border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-brand-300 transition-all flex flex-col gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 grid place-items-center font-semibold text-[14px] shrink-0">
                    {initials || '·'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-semibold text-slate-900 truncate">
                      {c.firstName} {c.lastName}
                    </div>
                    <div className="text-[12px] text-slate-500 truncate">
                      {c.disabilityType || c.class || '—'}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 mt-1 shrink-0" />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {attMeta ? (
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[11px] font-medium ${attMeta.tone}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${attMeta.dot}`} />
                      {t(attMeta.labelKey)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-500 text-[11px]">
                      <CalendarCheck className="w-3 h-3" />
                      {t('bolalar.attendanceUnmarked', { defaultValue: 'Davomat belgilanmagan' })}
                    </span>
                  )}

                  {stats.mealsTotal > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-slate-100 rounded-full px-2 py-1">
                      <UtensilsCrossed className="w-3 h-3" />
                      {stats.mealsEaten}/{stats.mealsTotal}
                    </span>
                  )}

                  {stats.irrScore != null && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-700 bg-brand-50 rounded-full px-2 py-1">
                      ИРР: <span className="font-semibold">{stats.irrScore}</span>
                      {stats.irrTrend === 'up' && <TrendingUp className="w-3 h-3 text-success-600" />}
                      {stats.irrTrend === 'down' && <TrendingDown className="w-3 h-3 text-error-500" />}
                      {stats.irrTrend === 'flat' && <Minus className="w-3 h-3 text-slate-400" />}
                    </span>
                  )}

                  {c.unresolvedWarningCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-error-700 bg-error-50 border border-error-200 rounded-full px-2 py-1">
                      <ShieldAlert className="w-3 h-3" />
                      {c.unresolvedWarningCount}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Bolalar;
