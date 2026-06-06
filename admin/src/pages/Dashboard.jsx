import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import * as cache from '../../../shared/utils/cache';
import {
  FileCheck2,
  BellRing,
  UserPlus,
  CheckCircle2,
  RotateCw,
  ArrowRight,
  UsersRound,
  Star,
  ClipboardList,
} from 'lucide-react';

const ACTION_META_COLOR = {
  'approve:documents':      'text-success-600',
  'reject:documents':       'text-error-600',
  'create:receptions':      'text-info-600',
  'delete:receptions':      'text-error-600',
  'activate:receptions':    'text-success-600',
  'deactivate:receptions':  'text-warning-600',
  'suspend:users':          'text-error-600',
  'activate:users':         'text-success-600',
  'restore:children':       'text-info-600',
  'restore:users':          'text-info-600',
  'bulk_import:children':   'text-brand-600',
  'transfer:children':      'text-warning-600',
  'update:schools':         'text-brand-600',
};

const getActionLabel = (action, entity, t) =>
  t(`activityActions.${action}_${entity}`, { defaultValue: `${action}:${entity}` });

const getActionColor = (action, entity) =>
  ACTION_META_COLOR[`${action}:${entity}`] ?? 'text-warm-600';

const formatRelativeTime = (iso, t) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return t('timeAgo.justNow', { defaultValue: 'Hozirgina' });
  if (min < 60) return t('timeAgo.minutes', { count: min, defaultValue: '{{count}} daqiqa oldin' });
  const hr = Math.floor(min / 60);
  if (hr < 24) return t('timeAgo.hours', { count: hr, defaultValue: '{{count}} soat oldin' });
  return new Date(iso).toLocaleDateString();
};

const CACHE_KEY = 'admin:dashboard';

const getReceptionsCount = (v) => {
  if (typeof v === 'number') return v;
  if (v && typeof v === 'object' && 'total' in v) return v.total;
  return 0;
};

const getGroupsCount = (v) => {
  if (typeof v === 'number') return v;
  if (v && typeof v === 'object' && 'total' in v) return v.total;
  return 0;
};


const RatingBar = ({ star, width, count }) => {
  const barColor = star === 5 ? 'bg-brand-600' : star === 4 ? 'bg-brand-500' : 'bg-warm-300';
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="num w-4 text-warm-600">{star}</span>
      <div className="flex-1 h-2 bg-warm-100 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full`} style={{ width: `${width}%` }} />
      </div>
      <span className="num w-10 text-right text-warm-500">{count}</span>
    </div>
  );
};

const DATE_LOCALE = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' };

const Dashboard = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();

  const [stats, setStats]               = useState(() => cache.get(CACHE_KEY)?.stats ?? null);
  const [receptions, setReceptions]     = useState(() => cache.get(CACHE_KEY)?.receptions ?? []);
  const [pendingDocs, setPendingDocs]   = useState(() => cache.get(CACHE_KEY)?.pendingDocs ?? []);
  const [aiWarnings, setAiWarnings]     = useState(() => cache.get(CACHE_KEY)?.aiWarnings ?? []);
  const [ratings, setRatings]           = useState(() => cache.get(CACHE_KEY)?.ratings ?? null);
  const [auditEntries, setAuditEntries] = useState(() => cache.get(CACHE_KEY)?.auditEntries ?? []);
  const [loading, setLoading]           = useState(!cache.get(CACHE_KEY));
  const [lastUpdated, setLastUpdated]   = useState(null);
  const [refreshing, setRefreshing]     = useState(false);

  const fetchFresh = useCallback(async (signal) => {
    const [statsRes, receptionsRes, docsRes, aiRes, ratingsRes, auditRes] = await Promise.allSettled([
      api.get('/admin/statistics', { signal }),
      api.get('/admin/receptions', { signal }),
      api.get('/admin/documents/pending', { signal }),
      api.get('/ai-warnings', { signal }),
      api.get('/admin/school-ratings', { signal }),
      api.get('/admin/audit-log', { params: { limit: 8 }, signal }),
    ]);

    const receptionsData = receptionsRes.status === 'fulfilled'
      ? (receptionsRes.value?.data?.data || []) : [];

    const pendingDocsData = docsRes.status === 'fulfilled'
      ? (docsRes.value?.data?.data || docsRes.value?.data || []) : [];

    const aiData = aiRes.status === 'fulfilled'
      ? (aiRes.value?.data?.data || aiRes.value?.data || []) : [];

    const ratingsData = ratingsRes.status === 'fulfilled'
      ? (ratingsRes.value?.data?.data || ratingsRes.value?.data || null) : null;

    let statsData = null;
    if (statsRes.status === 'fulfilled' && statsRes.value?.data?.data) {
      const raw = statsRes.value.data.data;
      const teachersCount = typeof raw.teachers === 'number' ? raw.teachers : (raw.users?.teachers ?? 0);
      const parentsCount = typeof raw.parents === 'number' ? raw.parents : (raw.users?.parents ?? 0);
      let childrenCount = 0;
      if (typeof raw.children === 'number') childrenCount = raw.children;
      else if (typeof raw.users?.children === 'number') childrenCount = raw.users.children;
      else if (typeof raw.childrenCount === 'number') childrenCount = raw.childrenCount;

      statsData = {
        receptions: getReceptionsCount(raw.receptions),
        teachers: teachersCount,
        parents: parentsCount,
        children: childrenCount,
        groups: getGroupsCount(raw.groups),
        capacity: raw.capacity || null,
        enrolled: raw.enrolled || childrenCount,
      };
    } else {
      statsData = { receptions: 0, teachers: 0, parents: 0, children: 0, groups: 0 };
    }

    const auditData = auditRes.status === 'fulfilled'
      ? (auditRes.value?.data?.data?.entries || []) : [];

    return { stats: statsData, receptions: receptionsData, pendingDocs: pendingDocsData, aiWarnings: aiData, ratings: ratingsData, auditEntries: auditData };
  }, []);

  const loadData = useCallback(async (signal, showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const result = await fetchFresh(signal);
      if (!result) return;
      cache.set(CACHE_KEY, result);
      setStats(result.stats);
      setReceptions(result.receptions);
      setPendingDocs(result.pendingDocs);
      setAiWarnings(result.aiWarnings);
      setRatings(result.ratings);
      setAuditEntries(result.auditEntries ?? []);
      setLastUpdated(new Date());
    } catch {
      // ignore abort
    } finally {
      setLoading(false);
      if (showRefresh) setRefreshing(false);
    }
  }, [fetchFresh]);

  useEffect(() => {
    const controller = new AbortController();
    const cached = cache.get(CACHE_KEY);
    if (cached) {
      setLoading(false);
      loadData(controller.signal);
    } else {
      loadData(controller.signal);
    }
    return () => controller.abort();
  }, [loadData]);

  const handleRefresh = () => {
    const controller = new AbortController();
    loadData(controller.signal, true);
  };

  const pendingDocsArray = Array.isArray(pendingDocs) ? pendingDocs : [];
  const aiWarningsArray  = Array.isArray(aiWarnings) ? aiWarnings : [];
  const pendingReceptions = receptions.filter((r) => !r.isActive);

  const dateLocale = DATE_LOCALE[i18n?.language] ?? 'uz-UZ';
  const today = new Date().toLocaleDateString(dateLocale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const lastUpdatedStr = lastUpdated
    ? lastUpdated.toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })
    : null;

  const capacity  = stats?.capacity ?? null;
  const enrolled  = stats?.children || stats?.enrolled || 0;
  const openDocsCount      = pendingDocsArray.length;
  const openWarningsCount  = aiWarningsArray.filter((w) => !w.resolvedAt).length;
  const openReceptionsCount = pendingReceptions.length;
  const allClear           = openDocsCount === 0 && openWarningsCount === 0 && openReceptionsCount === 0;
  const hasHighSeverity    = aiWarningsArray.some(
    (w) => !w.resolvedAt && (w.severity === 'high' || w.severity === 'critical')
  );

  const ratingAvg   = ratings?.average ?? null;
  const ratingDist  = ratings?.distribution ?? null;
  const ratingTotal = ratingDist ? ratingDist.reduce((a, b) => a + b, 0) : 0;
  const ratingPct   = (n) => ratingTotal > 0 ? Math.round((n / ratingTotal) * 100) : 0;

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <div className="skel h-3 w-48 mb-3" />
          <div className="skel h-8 w-64 mb-2" />
          <div className="skel h-4 w-80" />
        </div>
        <div className="bg-surface border border-warm-200 rounded-lg shadow-xs divide-y divide-warm-100">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
              <div className="skel h-3 w-full max-w-sm" />
            </div>
          ))}
        </div>
        <div className="bg-surface border border-warm-200 rounded-lg shadow-xs overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-warm-100">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="px-5 py-4">
                <div className="skel h-6 w-10 mb-2" />
                <div className="skel h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* 1 · PAGE HEADER */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-brand-700 num">{today}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-warm-900">
            {t('dashboard.title', { defaultValue: 'Boshqaruv paneli' })}
          </h1>
          <p className="text-base text-warm-600 mt-1">
            {t('dashboard.welcome', { name: user?.firstName || '', defaultValue: `Xush kelibsiz, ${user?.firstName || ''}` })}
          </p>
        </div>
        <div className="flex items-center gap-3 self-start pt-1">
          {lastUpdatedStr && (
            <div className="text-right">
              <p className="text-[11px] text-warm-500">{t('dashboard.lastUpdated', { defaultValue: 'Oxirgi yangilanish' })}</p>
              <p className="text-sm text-warm-800 num">{lastUpdatedStr}</p>
            </div>
          )}
          <button
            aria-label={t('dashboard.refresh', { defaultValue: 'Yangilash' })}
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center justify-center w-10 h-10 text-warm-700 bg-surface border border-warm-200 hover:bg-warm-50 rounded-md shadow-xs disabled:opacity-50 transition-colors"
          >
            <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* 2 · ATTENTION ZONE — single consolidated card, per-row hide if count=0 */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-wider text-warm-500 mb-2">
          {t('dashboard.attention', { defaultValue: "Sizning e'tiboringizni talab qiladi" })}
        </p>
        <div className="bg-surface border border-warm-200 rounded-lg shadow-xs divide-y divide-warm-100">
          {openDocsCount > 0 && (
            <div className="flex items-center gap-4 px-5 py-3.5">
              <FileCheck2 className="w-4 h-4 text-warm-400 shrink-0" strokeWidth={1.75} />
              <span className="num text-base font-semibold text-warm-900 w-7 text-right shrink-0">{openDocsCount}</span>
              <p className="flex-1 text-sm text-warm-700 min-w-0">
                {t('dashboard.pendingDocs', { defaultValue: 'ta hujjat tasdiqlash kutmoqda' })}
              </p>
              <Link to="/admin/documents" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800 shrink-0">
                {t('dashboard.review', { defaultValue: "Ko'rib chiqish" })} <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
              </Link>
            </div>
          )}
          {openWarningsCount > 0 && (
            <div className="flex items-center gap-4 px-5 py-3.5">
              <BellRing className="w-4 h-4 text-warning-600 shrink-0" strokeWidth={1.75} />
              <span className="num text-base font-semibold text-warm-900 w-7 text-right shrink-0">{openWarningsCount}</span>
              <p className="flex-1 text-sm text-warm-700 min-w-0 flex items-center gap-2 flex-wrap">
                {t('dashboard.aiWarnings', { defaultValue: 'ta ogohlantirish ochiq' })}
                {hasHighSeverity && (
                  <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded-sm bg-error-50 text-error-700 border border-error-100">
                    {t('dashboard.highSeverity', { defaultValue: 'yuqori darajali' })}
                  </span>
                )}
              </p>
              <Link to="/admin/ai-warnings" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800 shrink-0">
                {t('dashboard.viewAll', { defaultValue: "Ko'rish" })} <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
              </Link>
            </div>
          )}
          {openReceptionsCount > 0 && (
            <div className="flex items-center gap-4 px-5 py-3.5">
              <UserPlus className="w-4 h-4 text-info-600 shrink-0" strokeWidth={1.75} />
              <span className="num text-base font-semibold text-warm-900 w-7 text-right shrink-0">{openReceptionsCount}</span>
              <p className="flex-1 text-sm text-warm-700 min-w-0">
                {t('dashboard.newReception', { defaultValue: 'ta yangi xodim faollashtirish kutmoqda' })}
              </p>
              <Link to="/admin/receptions" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800 shrink-0">
                {t('dashboard.activate', { defaultValue: 'Faollashtirish' })} <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
              </Link>
            </div>
          )}
          {allClear && (
            <div className="flex items-center gap-3 px-5 py-4">
              <CheckCircle2 className="w-4 h-4 text-success-600 shrink-0" strokeWidth={1.75} />
              <p className="text-sm text-warm-500">
                {t('dashboard.attentionAllClear', { defaultValue: "Hammasi joyida! Bugun e'tiboringizni talab qiladigan ishlar yo'q" })}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 3 · STATS STRIP — compact single-card inline metrics */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-wider text-warm-500 mb-2">
          {t('dashboard.atAGlance', { defaultValue: 'Muassasa — bir qarashda' })}
        </p>
        <div className="bg-surface border border-warm-200 rounded-lg shadow-xs overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-warm-100">
            <div className="px-5 py-4">
              <p className="num text-2xl font-semibold text-warm-900">{stats?.children || 0}</p>
              <p className="text-xs text-warm-500 mt-0.5">{t('dashboard.children', { defaultValue: 'Bolalar' })}</p>
            </div>
            <div className="px-5 py-4">
              <p className="num text-2xl font-semibold text-warm-900">{stats?.teachers || 0}</p>
              <p className="text-xs text-warm-500 mt-0.5">{t('dashboard.teachers', { defaultValue: 'Tarbiyachilar' })}</p>
            </div>
            <div className="px-5 py-4">
              <p className="num text-2xl font-semibold text-warm-900">{stats?.parents || 0}</p>
              <p className="text-xs text-warm-500 mt-0.5">{t('dashboard.parents', { defaultValue: 'Ota-onalar' })}</p>
            </div>
            <div className="px-5 py-4">
              <p className="num text-2xl font-semibold text-warm-900">
                {capacity != null ? `${enrolled}/${capacity}` : (enrolled || '—')}
              </p>
              <p className="text-xs text-warm-500 mt-0.5">{t('dashboard.occupancy', { defaultValue: 'Bandlik' })}</p>
              {capacity != null && (
                <div className="mt-1.5 h-1 bg-warm-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-warm-400 rounded-full"
                    style={{ width: `${Math.min(100, Math.round((enrolled / capacity) * 100))}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4 · TWO-COLUMN MAIN: activity feed (left) + rating (right) */}
      <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">

        {/* Activity feed — left column */}
        <article className="bg-surface border border-warm-200 rounded-lg shadow-xs">
          <header className="flex items-center justify-between px-5 py-4 border-b border-warm-100">
            <div>
              <p className="text-base font-semibold text-warm-900">{t('dashboard.recentActivity', { defaultValue: "So'nggi faoliyat" })}</p>
              <p className="text-xs text-warm-500 mt-0.5">{t('dashboard.recentActivitySub', { defaultValue: 'Qabulxona xodimlari bugun bajargan ishlar' })}</p>
            </div>
            <Link to="/admin/activity" className="text-sm font-medium text-brand-700 hover:text-brand-800">
              {t('dashboard.auditLog', { defaultValue: 'Audit jurnali →' })}
            </Link>
          </header>
          <div className="px-5 py-2">
            {auditEntries.length === 0 ? (
              <p className="text-sm text-warm-400 text-center py-6">
                {t('activityFeed.noActivity', { defaultValue: 'No activity yet' })}
              </p>
            ) : (
              auditEntries.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 py-2.5 border-b border-warm-100 last:border-0">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${getActionColor(entry.action, entry.entity).replace('text-', 'bg-')}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-warm-900 truncate">
                      {getActionLabel(entry.action, entry.entity, t)}
                      {entry.actor && <span className="text-warm-500"> — {entry.actor.firstName} {entry.actor.lastName}</span>}
                    </p>
                    <p className="text-xs text-warm-400">{formatRelativeTime(entry.occurredAt, t)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        {/* Rating card — right column */}
        <article className="bg-surface border border-warm-200 rounded-lg shadow-xs p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-base font-semibold text-warm-900">{t('dashboard.schoolRating', { defaultValue: 'Muassasa reytingi' })}</p>
              <p className="text-xs text-warm-500 mt-0.5">{t('dashboard.ratingPeriod', { defaultValue: 'Ota-onalar · oxirgi 30 kun' })}</p>
            </div>
            <Link to="/admin/school-ratings" className="text-sm font-medium text-brand-700 hover:text-brand-800 shrink-0">
              {t('dashboard.viewDetails', { defaultValue: 'Batafsil →' })}
            </Link>
          </div>
          {ratings != null ? (
            <>
              <div className="text-center mb-4">
                <p className="num text-4xl font-semibold text-warm-900" style={{ lineHeight: 1 }}>
                  {typeof ratingAvg === 'number' ? ratingAvg.toFixed(1) : '—'}
                </p>
                <div className="flex items-center justify-center gap-0.5 mt-2 text-yellow-400">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-4 h-4 ${ratingAvg != null && s <= Math.round(ratingAvg) ? '' : 'opacity-30'}`}
                      strokeWidth={1.75}
                      fill="currentColor"
                    />
                  ))}
                </div>
                <p className="text-xs text-warm-500 mt-1.5 num">
                  {ratingTotal} {t('dashboard.ratingsCount', { defaultValue: 'ta baho' })}
                </p>
              </div>
              <div className="space-y-1.5">
                {[5, 4, 3, 2, 1].map((star, idx) => (
                  <RatingBar key={star} star={star} width={ratingPct(ratingDist?.[idx] ?? 0)} count={ratingDist?.[idx] ?? 0} />
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-warm-400 py-4 text-center">
              {t('dashboard.noRatings', { defaultValue: 'Hozircha reytinglar mavjud emas.' })}
            </p>
          )}
        </article>
      </div>

      {/* 5 · HISOBOTLAR BOTTOM STRIP — 3 compact reference link-cards */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-wider text-warm-500 mb-2">
          {t('nav.section.reports', { defaultValue: 'Hisobotlar' })}
        </p>
        <div className="grid sm:grid-cols-3 gap-3">
          <Link
            to="/admin/irr"
            className="flex items-center gap-3 bg-surface border border-warm-100 rounded-lg px-4 py-3 hover:border-warm-200 hover:bg-warm-50 transition-colors group"
          >
            <ClipboardList className="w-4 h-4 text-warm-400 group-hover:text-brand-600 shrink-0 transition-colors" strokeWidth={1.75} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-warm-800 truncate">{t('nav.irr', { defaultValue: 'Choraklik monitoring jurnali' })}</p>
              <p className="text-xs text-warm-400">{t('dashboard.irrSub', { defaultValue: "Har chorakda bir marta" })}</p>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-warm-300 group-hover:text-brand-600 transition-colors shrink-0" strokeWidth={2} />
          </Link>
          <Link
            to="/admin/groups"
            className="flex items-center gap-3 bg-surface border border-warm-100 rounded-lg px-4 py-3 hover:border-warm-200 hover:bg-warm-50 transition-colors group"
          >
            <UsersRound className="w-4 h-4 text-warm-400 group-hover:text-brand-600 shrink-0 transition-colors" strokeWidth={1.75} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-warm-800 truncate">{t('nav.groups', { defaultValue: 'Guruhlar' })}</p>
              <p className="text-xs text-warm-400">{t('dashboard.groupsSub', { defaultValue: "Guruhlar ro'yxati" })}</p>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-warm-300 group-hover:text-brand-600 transition-colors shrink-0" strokeWidth={2} />
          </Link>
          <Link
            to="/admin/activity"
            className="flex items-center gap-3 bg-surface border border-warm-100 rounded-lg px-4 py-3 hover:border-warm-200 hover:bg-warm-50 transition-colors group"
          >
            <ClipboardList className="w-4 h-4 text-warm-400 group-hover:text-brand-600 shrink-0 transition-colors" strokeWidth={1.75} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-warm-800 truncate">{t('nav.activity', { defaultValue: 'Audit jurnali' })}</p>
              <p className="text-xs text-warm-400">{t('dashboard.auditRefSub', { defaultValue: "Barcha amallar ro'yxati" })}</p>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-warm-300 group-hover:text-brand-600 transition-colors shrink-0" strokeWidth={2} />
          </Link>
        </div>
      </section>

    </div>
  );
};

export default Dashboard;
