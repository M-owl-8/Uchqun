import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../../shared/context/SocketContext';
import { useTranslation } from 'react-i18next';
import { useChild } from '../context/ChildContext';
import { useNotification } from '../context/NotificationContext';
import { useToast } from '../../shared/context/ToastContext';
import api from '../services/api';
import * as cache from '../../../../shared/utils/cache';
import LoadingSpinner from '../components/LoadingSpinner';
import ChildSwitcher from '../components/ChildSwitcher';
import DayCard from '../components/DayCard';
import { Bell, Activity, UtensilsCrossed, Camera, Star, HeartPulse, ChevronRight, TrendingUp, Dumbbell, HelpCircle } from 'lucide-react';

const today = new Date().toISOString().split('T')[0];

const Dashboard = () => {
  const { user } = useAuth();
  const { on, off, connected } = useSocket();
  const { selectedChildId } = useChild();
  const { refreshNotifications, count = 0 } = useNotification();
  const cacheKey = selectedChildId ? `parent:dashboard:${selectedChildId}` : null;
  const [stats, setStats] = useState(() => cacheKey ? cache.get(cacheKey) : null);
  const [loading, setLoading] = useState(!cacheKey || !cache.get(cacheKey));
  const { t } = useTranslation();
  const { error: showError } = useToast();

  const fetchFresh = useCallback(async (signal) => {
    if (!selectedChildId) return null;
    const [activitiesResponse, mealsResponse, mediaResponse] = await Promise.all([
      api.get(`/activities?limit=5&childId=${selectedChildId}`, { signal }).catch(() => ({ data: { activities: [] } })),
      api.get(`/meals?limit=5&childId=${selectedChildId}`, { signal }).catch(() => ({ data: { meals: [] } })),
      api.get(`/media?limit=5&childId=${selectedChildId}`, { signal }).catch(() => ({ data: { media: [] } })),
    ]);
    const [ratingsResponse, monitoringResponse] = await Promise.all([
      api.get('/parent/ratings', { signal }).catch(() => ({ data: { data: { summary: { average: 0, count: 0 } } } })),
      api.get(`/parent/emotional-monitoring/child/${selectedChildId}?limit=1`, { signal }).catch(() => ({ data: { data: [] } })),
    ]);

    const activities = activitiesResponse.data?.activities || activitiesResponse.data || [];
    const meals = mealsResponse.data?.meals || mealsResponse.data || [];
    const media = mediaResponse.data?.media || mediaResponse.data || [];
    const ratingsSummary = ratingsResponse.data?.data?.summary || { average: 0, count: 0 };
    const latestMonitoring = Array.isArray(monitoringResponse.data?.data) && monitoringResponse.data.data.length > 0
      ? monitoringResponse.data.data[0] : null;
    const emotionalState = latestMonitoring?.emotionalState || {};
    const emotionalTotal = Object.keys(emotionalState).length;
    const emotionalChecked = Object.values(emotionalState).filter(Boolean).length;
    const emotionalScore = emotionalTotal > 0 ? Math.round((emotionalChecked / emotionalTotal) * 100) : 0;

    return {
      activities: Array.isArray(activities) ? activities.length : 0,
      meals: Array.isArray(meals) ? meals.length : 0,
      media: Array.isArray(media) ? media.length : 0,
      teacherRating: Number(ratingsSummary.average || 0).toFixed(1),
      teacherRatingCount: Number(ratingsSummary.count || 0),
      childStatusScore: emotionalScore,
      recentActivity: Array.isArray(activities) && activities.length > 0 ? activities[0] : null,
    };
  }, [selectedChildId]);

  const loadData = useCallback(async (signal) => {
    if (!selectedChildId) return;
    const key = `parent:dashboard:${selectedChildId}`;
    const cached = cache.get(key);

    if (cached) {
      setStats(cached);
      setLoading(false);
      fetchFresh(signal)
        .then(data => {
          if (!data) return;
          cache.set(key, data);
          setStats(data);
          refreshNotifications();
        })
        .catch(() => {});
      return;
    }

    try {
      const data = await fetchFresh(signal);
      if (!data) return;
      cache.set(key, data);
      setStats(data);
      refreshNotifications();
    } catch (error) {
      if (error.code === 'ERR_CANCELED') return;
      showError(error.response?.data?.error || t('common.networkError'));
    } finally {
      setLoading(false);
    }
  }, [selectedChildId, fetchFresh, refreshNotifications, showError, t]);

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [selectedChildId, loadData]);

  useEffect(() => {
    if (!connected || !selectedChildId) return;
    const handleDataChange = () => {
      cache.invalidate(`parent:dashboard:${selectedChildId}`);
      loadData();
    };
    const events = ['activity:created','activity:updated','activity:deleted','meal:created','meal:updated','meal:deleted','media:created','media:updated','media:deleted','child:updated'];
    events.forEach(ev => on(ev, handleDataChange));
    return () => events.forEach(ev => off(ev, handleDataChange));
  }, [connected, selectedChildId, on, off, loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const quickLinks = [
    { title: t('dashboard.individualPlan') || 'Faoliyat',        value: stats?.activities || 0,   icon: Activity,       href: '/activities' },
    { title: t('dashboard.meals') || 'Ovqat',                   value: stats?.meals || 0,        icon: UtensilsCrossed, href: '/meals' },
    { title: t('dashboard.media') || 'Rasm',                    value: stats?.media || 0,        icon: Camera,          href: '/media' },
    { title: t('dashboard.childStatus') || 'Hissiy holat',      value: `${stats?.childStatusScore || 0}%`, icon: HeartPulse, href: '/child' },
    { title: t('dashboard.teacherRating') || 'Baholash',        value: `${stats?.teacherRating || '0.0'} (${stats?.teacherRatingCount || 0})`, icon: Star, href: '/rating' },
    { title: t('dashboard.irr') || 'ИРР — Ривожланиш режаси',  value: '',                       icon: TrendingUp,      href: '/irr' },
    { title: t('dashboard.therapy') || 'Foydali materiallar',   value: '',                       icon: Dumbbell,        href: '/therapy' },
    { title: t('dashboard.help') || 'Yordam',                   value: '',                       icon: HelpCircle,      href: '/help' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* Header row: greeting + notifications */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] uppercase tracking-[.12em] font-medium text-p-sepia-500 mb-0.5">
            Ota-ona portali
          </p>
          <h1 className="font-serif text-[26px] leading-tight text-p-ink font-semibold">
            {user?.firstName || ''} {user?.lastName || ''}
          </h1>
        </div>
        <Link to="/notifications" className="relative mt-1 p-2 rounded-lg hover:bg-p-sepia-100 transition-colors">
          <Bell className="w-5 h-5 text-p-sepia-500" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 bg-p-brand-600 text-white text-[10px] leading-none font-bold rounded-full px-1.5 py-0.5 border-2 border-p-paper">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </Link>
      </div>

      {/* Child switcher */}
      <div>
        <ChildSwitcher />
      </div>

      {/* Today's day card */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-5 h-px bg-p-brand-400" />
          <span className="text-[11px] uppercase tracking-[.12em] font-semibold text-p-brand-600">
            Bugungi xulosa
          </span>
        </div>
        <DayCard
          date={today}
          activities={stats?.activities || 0}
          meals={stats?.meals || 0}
          media={stats?.media || 0}
          isToday
        />
      </div>

      {/* Stitch separator */}
      <div className="stitch" />

      {/* Quick access links */}
      <div>
        <h2 className="text-[13px] uppercase tracking-[.1em] font-semibold text-p-sepia-500 mb-3">
          {t('dashboard.overview') || 'Tezkor havolalar'}
        </h2>
        <div className="space-y-2">
          {quickLinks.map((item) => (
            <Link key={item.href} to={item.href}>
              <div className="page-card rounded-lg px-4 py-3 flex items-center gap-3 hover:shadow-md transition-shadow group">
                <div className="w-8 h-8 rounded-md bg-p-brand-50 grid place-items-center shrink-0">
                  <item.icon className="w-4 h-4 text-p-brand-600" />
                </div>
                <span className="flex-1 text-[14px] font-medium text-p-ink">{item.title}</span>
                <span className="text-[14px] font-semibold text-p-brand-700 tnum">{item.value}</span>
                <ChevronRight className="w-4 h-4 text-p-sepia-400 group-hover:text-p-brand-600 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
