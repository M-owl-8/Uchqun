import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import * as cache from '../../../shared/utils/cache';
import {
  FileCheck2,
  BellRing,
  UserPlus,
  TrendingUp,
  Minus,
  RotateCw,
  UserPlus2,
  FileText,
  CheckCircle2,
  LogIn,
  Pencil,
  ArrowRight,
  MapPin,
  UsersRound,
  ShieldCheck,
  Phone,
  Star,
} from 'lucide-react';

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

const MOCK_ACTIVITY = [
  { icon: UserPlus2, color: 'bg-success-50 text-success-700', text: ['Aziza Karimova', ' yangi ota-onani qo\'shdi · ', 'Yusuf Toshmatov'], time: '12 daqiqa oldin' },
  { icon: FileText, color: 'bg-brand-50 text-brand-700', text: ['Bobur Saidov', ' hujjat yukladi · ', 'Tibbiy ma\'lumot'], time: '28 daqiqa oldin' },
  { icon: Pencil, color: 'bg-info-50 text-info-700', text: ['Madina Rahmatova', ' o\'qituvchi profilini tahrirladi · ', 'Sevara Tursunova'], time: '1 soat 14 daqiqa oldin' },
  { icon: CheckCircle2, color: 'bg-success-50 text-success-700', text: ['Aziza Karimova', ' guruh ro\'yxatini yangiladi · ', '5-A "Quyosh"'], time: '2 soat 03 daqiqa oldin' },
  { icon: LogIn, color: 'bg-warm-100 text-warm-600', text: ['Bobur Saidov', ' tizimga kirdi', ''], time: '3 soat 41 daqiqa oldin' },
];

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

const Dashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [stats, setStats]               = useState(() => cache.get(CACHE_KEY)?.stats ?? null);
  const [receptions, setReceptions]     = useState(() => cache.get(CACHE_KEY)?.receptions ?? []);
  const [pendingDocs, setPendingDocs]   = useState(() => cache.get(CACHE_KEY)?.pendingDocs ?? []);
  const [aiWarnings, setAiWarnings]     = useState(() => cache.get(CACHE_KEY)?.aiWarnings ?? []);
  const [ratings, setRatings]           = useState(() => cache.get(CACHE_KEY)?.ratings ?? null);
  const [loading, setLoading]           = useState(!cache.get(CACHE_KEY));
  const [lastUpdated, setLastUpdated]   = useState(null);
  const [refreshing, setRefreshing]     = useState(false);

  const fetchFresh = useCallback(async (signal) => {
    const [statsRes, receptionsRes, docsRes, aiRes, ratingsRes] = await Promise.allSettled([
      api.get('/admin/statistics', { signal }),
      api.get('/admin/receptions', { signal }),
      api.get('/admin/documents/pending', { signal }),
      api.get('/admin/ai-warnings', { signal }),
      api.get('/admin/school-ratings', { signal }),
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

    return { stats: statsData, receptions: receptionsData, pendingDocs: pendingDocsData, aiWarnings: aiData, ratings: ratingsData };
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

  const today = new Date().toLocaleDateString('uz-UZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const lastUpdatedStr = lastUpdated
    ? lastUpdated.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
    : null;

  const capacity  = stats?.capacity || 140;
  const enrolled  = stats?.children || stats?.enrolled || 0;
  const occupancy = capacity > 0 ? Math.round((enrolled / capacity) * 100) : 0;

  // Derived tasks from real data
  const tasks = [
    pendingDocsArray.length > 0 && {
      id: 'docs',
      text: `${pendingDocsArray.length} ta hujjatni tasdiqlash`,
      sub: `Eng eskisi ${pendingDocsArray[0]?.daysOld ?? '?'} kun oldin yuklangan`,
      link: '/admin/documents',
      linkLabel: 'Hujjatlarga o\'tish →',
      done: false,
    },
    aiWarningsArray.filter((w) => !w.isResolved).length > 0 && {
      id: 'ai',
      text: 'AI ogohlantirishni ko\'rib chiqish',
      sub: aiWarningsArray.find((w) => !w.isResolved)?.title || '',
      link: '/admin/ai-warnings',
      linkLabel: 'Ogohlantirishga o\'tish →',
      done: false,
    },
  ].filter(Boolean);
  // TODO(phase-2): wire to a real /admin/me/tasks endpoint

  const ratingAvg  = ratings?.average ?? 4.6;
  const ratingDist = ratings?.distribution || [59, 18, 7, 2, 1];
  const ratingTotal = ratingDist.reduce((a, b) => a + b, 0) || 87;
  const ratingPct  = (n) => ratingTotal > 0 ? Math.round((n / ratingTotal) * 100) : 0;

  const highestAi = aiWarningsArray.find((w) => !w.isResolved && ['critical', 'high'].includes(w.severity?.toLowerCase()));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="letterhead pt-4">
          <div className="skel h-3 w-48 mb-3" />
          <div className="skel h-8 w-64 mb-2" />
          <div className="skel h-4 w-80" />
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[1,2,3].map((i) => (
            <div key={i} className="bg-surface border border-warm-200 rounded-lg shadow-xs p-5">
              <div className="skel h-3 w-40 mb-3" />
              <div className="skel h-10 w-20 mb-2" />
              <div className="skel h-3 w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Page header */}
      <div className="letterhead pt-4 flex items-end justify-between flex-wrap gap-4 mb-9">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-brand-700 num">{today}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-warm-900">
            {t('dashboard.title', { defaultValue: 'Boshqaruv paneli' })}
          </h1>
          <p className="text-base text-warm-600 mt-1">
            {t('dashboard.welcome', { name: user?.firstName || '', defaultValue: `Xush kelibsiz, ${user?.firstName || ''}. Bugun e'tiboringizni talab qiladigan ishlar:` })}
          </p>
        </div>
        <div className="flex items-center gap-3 pb-1">
          {lastUpdatedStr && (
            <div className="text-right">
              <p className="text-[11px] text-warm-500">Oxirgi yangilanish</p>
              <p className="text-sm text-warm-800 num">{lastUpdatedStr}</p>
            </div>
          )}
          <button
            aria-label="Yangilash"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center justify-center w-10 h-10 text-warm-700 bg-surface border border-warm-200 hover:bg-warm-50 rounded-md shadow-xs disabled:opacity-50 transition-colors"
          >
            <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* ATTENTION ROW */}
      <h2 className="text-lg font-semibold text-warm-900 mb-3 flex items-center gap-2">
        <span className="w-1 h-4 bg-brand-600 rounded-full" />
        {t('dashboard.attention', { defaultValue: 'Sizning e\'tiboringizni talab qiladi' })}
      </h2>
      <div className="grid md:grid-cols-3 gap-4 mb-10">
        {/* Pending docs */}
        <article className="bg-surface border border-warm-200 rounded-lg shadow-xs p-5 flex flex-col">
          <div className="flex items-start justify-between mb-2">
            <p className="text-sm font-medium text-warm-700">{t('dashboard.pendingDocs', { defaultValue: 'Tasdiq kutayotgan hujjatlar' })}</p>
            <FileCheck2 className="w-5 h-5 text-brand-600" strokeWidth={1.75} />
          </div>
          <p className="num text-4xl font-semibold text-warm-900 mt-1">{pendingDocsArray.length}</p>
          <p className="text-sm text-warm-500 mt-1">{t('dashboard.pendingDocsHint', { defaultValue: 'hujjat ko\'rib chiqilishi kerak' })}</p>
          <div className="mt-4 pt-4 border-t border-warm-100 flex items-center justify-between">
            <div className="flex -space-x-1.5">
              {pendingDocsArray.slice(0, 3).map((d, i) => (
                <div key={i} className="w-6 h-6 rounded-full bg-brand-100 text-brand-800 border-2 border-surface flex items-center justify-center text-[10px] font-semibold">
                  {d.reception?.firstName?.charAt(0)}{d.reception?.lastName?.charAt(0)}
                </div>
              ))}
              {pendingDocsArray.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-warm-100 text-warm-500 border-2 border-surface flex items-center justify-center text-[10px] font-semibold num">
                  +{pendingDocsArray.length - 3}
                </div>
              )}
            </div>
            <Link to="/admin/documents" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800">
              {t('dashboard.review', { defaultValue: 'Ko\'rib chiqish' })} <ArrowRight className="w-4 h-4" strokeWidth={2} />
            </Link>
          </div>
        </article>

        {/* AI warnings */}
        <article className="bg-surface border border-warm-200 rounded-lg shadow-xs p-5 flex flex-col">
          <div className="flex items-start justify-between mb-2">
            <p className="text-sm font-medium text-warm-700">{t('dashboard.aiWarnings', { defaultValue: 'Yangi AI ogohlantirishlar' })}</p>
            <BellRing className="w-5 h-5 text-warning-600" strokeWidth={1.75} />
          </div>
          <p className="num text-4xl font-semibold text-warm-900 mt-1">{aiWarningsArray.filter((w) => !w.isResolved).length}</p>
          <p className="text-sm text-warm-500 mt-1">
            {aiWarningsArray.filter((w) => w.severity === 'high' || w.severity === 'critical').length > 0
              ? `shulardan ${aiWarningsArray.filter((w) => (w.severity === 'high' || w.severity === 'critical') && !w.isResolved).length} ta yuqori darajada`
              : t('dashboard.noHighSeverity', { defaultValue: 'hech qanday yuqori darajali yo\'q' })}
          </p>
          <div className="mt-4 pt-4 border-t border-warm-100">
            {highestAi && (
              <div className="flex items-start gap-2 mb-3">
                <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-sm bg-error-50 text-error-700 border border-error-100 shrink-0 mt-0.5">High</span>
                <p className="text-xs text-warm-700 line-clamp-2">{highestAi.title || highestAi.message || ''}</p>
              </div>
            )}
            <Link to="/admin/ai-warnings" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800">
              {t('dashboard.viewAll', { defaultValue: 'Hammasini ko\'rish' })} <ArrowRight className="w-4 h-4" strokeWidth={2} />
            </Link>
          </div>
        </article>

        {/* New reception staff */}
        <article className="bg-surface border border-warm-200 rounded-lg shadow-xs p-5 flex flex-col">
          <div className="flex items-start justify-between mb-2">
            <p className="text-sm font-medium text-warm-700">{t('dashboard.newReception', { defaultValue: 'Yangi qabulxona xodimlari' })}</p>
            <UserPlus className="w-5 h-5 text-info-600" strokeWidth={1.75} />
          </div>
          <p className="num text-4xl font-semibold text-warm-900 mt-1">{pendingReceptions.length}</p>
          <p className="text-sm text-warm-500 mt-1">{t('dashboard.awaitingActivation', { defaultValue: 'faollashtirish kutmoqda' })}</p>
          <div className="mt-4 pt-4 border-t border-warm-100">
            <ul className="text-xs text-warm-700 space-y-1.5 mb-3">
              {pendingReceptions.slice(0, 3).map((r, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-warm-400" />
                  {r.firstName} {r.lastName}
                  {r.createdAt && (
                    <span className="text-warm-500 num">· {Math.floor((Date.now() - new Date(r.createdAt)) / 86400000)} kun</span>
                  )}
                </li>
              ))}
            </ul>
            <Link to="/admin/receptions" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800">
              {t('dashboard.activate', { defaultValue: 'Faollashtirish' })} <ArrowRight className="w-4 h-4" strokeWidth={2} />
            </Link>
          </div>
        </article>
      </div>

      {/* STATS ROW */}
      <h2 className="text-lg font-semibold text-warm-900 mb-3 flex items-center gap-2">
        <span className="w-1 h-4 bg-warm-300 rounded-full" />
        {t('dashboard.atAGlance', { defaultValue: 'Maktab — bir qarashda' })}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-surface border border-warm-200 rounded-lg shadow-xs p-5">
          <p className="text-sm text-warm-500">{t('dashboard.children', { defaultValue: 'Bolalar' })}</p>
          <p className="num text-3xl font-semibold text-warm-900 mt-1">{stats?.children || 0}</p>
          <p className="mt-2.5 flex items-center gap-1.5 text-xs text-warm-500">
            <Minus className="w-3.5 h-3.5" strokeWidth={2} /><span>{t('dashboard.noChange', { defaultValue: 'o\'zgarish yo\'q' })}</span>
          </p>
        </div>
        <div className="bg-surface border border-warm-200 rounded-lg shadow-xs p-5">
          <p className="text-sm text-warm-500">{t('dashboard.teachers', { defaultValue: 'O\'qituvchilar' })}</p>
          <p className="num text-3xl font-semibold text-warm-900 mt-1">{stats?.teachers || 0}</p>
          <p className="mt-2.5 flex items-center gap-1.5 text-xs text-warm-500">
            <Minus className="w-3.5 h-3.5" strokeWidth={2} /><span>{t('dashboard.noChange', { defaultValue: 'o\'zgarish yo\'q' })}</span>
          </p>
        </div>
        <div className="bg-surface border border-warm-200 rounded-lg shadow-xs p-5">
          <p className="text-sm text-warm-500">{t('dashboard.parents', { defaultValue: 'Ota-onalar' })}</p>
          <p className="num text-3xl font-semibold text-warm-900 mt-1">{stats?.parents || 0}</p>
          <p className="mt-2.5 flex items-center gap-1.5 text-xs text-success-700">
            <TrendingUp className="w-3.5 h-3.5" strokeWidth={2} /><span className="text-warm-500">{t('dashboard.activeAccounts', { defaultValue: 'faol akkaunt' })}</span>
          </p>
        </div>
        <div className="bg-surface border border-warm-200 rounded-lg shadow-xs p-5">
          <p className="text-sm text-warm-500">{t('dashboard.occupancy', { defaultValue: 'Bandlik' })}</p>
          <p className="num text-3xl font-semibold text-warm-900 mt-1">{occupancy}%</p>
          <div className="mt-2.5 h-1.5 bg-warm-100 rounded-full overflow-hidden">
            <div className="h-full bg-brand-600 rounded-full" style={{ width: `${occupancy}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-warm-500 num">{enrolled} / {capacity} ta o'rin</p>
        </div>
      </div>

      {/* TWO COL */}
      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        {/* Left */}
        <div className="space-y-6">
          {/* Activity feed */}
          <article className="bg-surface border border-warm-200 rounded-lg shadow-xs">
            <header className="flex items-center justify-between px-5 py-4 border-b border-warm-100">
              <div>
                <p className="text-base font-semibold text-warm-900">{t('dashboard.recentActivity', { defaultValue: 'So\'nggi faoliyat' })}</p>
                <p className="text-xs text-warm-500 mt-0.5">{t('dashboard.recentActivitySub', { defaultValue: 'Qabulxona xodimlari bugun bajargan ishlar' })}</p>
              </div>
              <span className="text-sm text-brand-700 font-medium">{t('dashboard.auditLog', { defaultValue: 'Audit jurnali →' })}</span>
            </header>
            <div className="divide-y divide-warm-100">
              {MOCK_ACTIVITY.map((item, i) => (
                <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                  <div className={`w-7 h-7 rounded-md ${item.color} flex items-center justify-center shrink-0 mt-0.5`}>
                    <item.icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 text-sm">
                    <p className="text-warm-700">
                      <span className="text-warm-900 font-medium">{item.text[0]}</span>
                      {item.text[1]}
                      {item.text[2] && <span className="text-warm-900 font-medium">{item.text[2]}</span>}
                    </p>
                    <p className="text-xs text-warm-500 num mt-0.5">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* TODO(phase-2): wire to /api/v1/admin/me/activity once backend supports it */}
          </article>

          {/* Ratings panel */}
          <article className="bg-surface border border-warm-200 rounded-lg shadow-xs p-5">
            <header className="flex items-baseline justify-between mb-4">
              <div>
                <p className="text-base font-semibold text-warm-900">{t('dashboard.schoolRating', { defaultValue: 'Maktab reytingi' })}</p>
                <p className="text-xs text-warm-500 mt-0.5">{t('dashboard.ratingPeriod', { defaultValue: 'Ota-onalar tomonidan berilgan baholar · oxirgi 30 kun' })}</p>
              </div>
              <Link to="/admin/school-ratings" className="text-sm text-brand-700 hover:text-brand-800 font-medium">
                {t('dashboard.viewDetails', { defaultValue: 'Batafsil →' })}
              </Link>
            </header>
            <div className="grid md:grid-cols-[200px_1fr] gap-6 items-center">
              <div className="text-center">
                <p className="num text-5xl font-semibold text-warm-900" style={{ lineHeight: 1 }}>
                  {typeof ratingAvg === 'number' ? ratingAvg.toFixed(1) : ratingAvg}
                </p>
                <div className="flex items-center justify-center gap-0.5 mt-2 text-brand-600">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} className={`w-4 h-4 ${s <= Math.round(ratingAvg) ? '' : 'opacity-30'}`} strokeWidth={1.75} fill="currentColor" />
                  ))}
                </div>
                <p className="text-xs text-warm-500 mt-2 num">{ratingTotal} ta baho</p>
              </div>
              <div className="space-y-2">
                {[5,4,3,2,1].map((star, idx) => (
                  <RatingBar key={star} star={star} width={ratingPct(ratingDist[idx] ?? 0)} count={ratingDist[idx] ?? 0} />
                ))}
              </div>
            </div>
          </article>
        </div>

        {/* Right rail */}
        <aside className="space-y-6">
          {/* Tasks */}
          <article className="bg-surface border border-warm-200 rounded-lg shadow-xs p-5">
            <p className="text-base font-semibold text-warm-900 mb-1">{t('dashboard.tasks', { defaultValue: 'Mening vazifalarim' })}</p>
            <p className="text-xs text-warm-500 mb-4">{t('dashboard.tasksSub', { defaultValue: 'Bugun bajarilishi lozim' })} · {tasks.length}</p>
            <ul className="space-y-3">
              {tasks.map((task) => (
                <li key={task.id} className="flex items-start gap-3 pt-3 border-t border-warm-100 first:pt-0 first:border-t-0">
                  <input type="checkbox" defaultChecked={task.done} className="mt-1 w-4 h-4 rounded-sm border-warm-300 text-brand-600 focus:ring-brand-600/40" readOnly />
                  <div className="flex-1">
                    <p className={`text-sm ${task.done ? 'text-warm-400 line-through' : 'text-warm-900'}`}>{task.text}</p>
                    <p className="text-xs text-warm-500 mt-0.5">{task.sub}</p>
                    {!task.done && (
                      <Link to={task.link} className="text-xs text-brand-700 hover:underline mt-1 inline-block">{task.linkLabel}</Link>
                    )}
                  </div>
                </li>
              ))}
              {tasks.length === 0 && (
                <li className="text-sm text-warm-500 text-center py-4">{t('dashboard.noTasks', { defaultValue: 'Bugunlik vazifalar bajarildi' })}</li>
              )}
            </ul>
          </article>

          {/* Quick info */}
          <article className="bg-surface border border-warm-200 rounded-lg shadow-xs p-5">
            <p className="text-base font-semibold text-warm-900">{t('dashboard.quickInfo', { defaultValue: 'Tezkor ma\'lumot' })}</p>
            <p className="text-xs text-warm-500 mt-0.5">{t('dashboard.schoolInfo', { defaultValue: 'Maktab haqida' })}</p>
            <dl className="mt-4 space-y-3 text-sm">
              {user?.school?.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-warm-500 mt-0.5 shrink-0" strokeWidth={1.75} />
                  <div>
                    <dt className="text-xs text-warm-500">{t('dashboard.address', { defaultValue: 'Manzil' })}</dt>
                    <dd className="text-warm-800">{user.school.address}</dd>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3 pt-3 border-t border-warm-100">
                <UsersRound className="w-4 h-4 text-warm-500 mt-0.5 shrink-0" strokeWidth={1.75} />
                <div>
                  <dt className="text-xs text-warm-500">{t('dashboard.capacity', { defaultValue: 'Sig\'im' })}</dt>
                  <dd className="text-warm-800 num">{enrolled} / {capacity} {t('dashboard.capacityUnit', { defaultValue: 'bola' })}</dd>
                </div>
              </div>
              {user?.school?.accreditation && (
                <div className="flex items-start gap-3 pt-3 border-t border-warm-100">
                  <ShieldCheck className="w-4 h-4 text-warm-500 mt-0.5 shrink-0" strokeWidth={1.75} />
                  <div>
                    <dt className="text-xs text-warm-500">{t('dashboard.accreditation', { defaultValue: 'Akkredidatsiya' })}</dt>
                    <dd className="text-warm-800 num">{user.school.accreditation}</dd>
                  </div>
                </div>
              )}
              {user?.school?.phone && (
                <div className="flex items-start gap-3 pt-3 border-t border-warm-100">
                  <Phone className="w-4 h-4 text-warm-500 mt-0.5 shrink-0" strokeWidth={1.75} />
                  <div>
                    <dt className="text-xs text-warm-500">{t('dashboard.contact', { defaultValue: 'Aloqa' })}</dt>
                    <dd className="text-warm-800 num">{user.school.phone}</dd>
                  </div>
                </div>
              )}
            </dl>
          </article>
        </aside>
      </div>
    </div>
  );
};

export default Dashboard;
