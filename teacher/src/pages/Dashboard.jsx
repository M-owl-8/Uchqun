import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Camera,
  Users,
  UtensilsCrossed,
  HeartPulse,
  Star,
} from 'lucide-react';
import Card from '../shared/components/Card';
import { SkeletonDashboard } from '../../../shared/components/Skeleton';
import { useAuth } from '../shared/context/AuthContext';
import api from '../shared/services/api';
import { useTranslation } from 'react-i18next';
import * as cache from '../../../shared/utils/cache';

const CACHE_KEY = 'teacher:dashboard';
const CACHE_TTL = 90_000;

const FALLBACK = { parents: 0, activities: 0, meals: 0, media: 0, statusEntries: 0, rating: '0.0', ratingsCount: 0 };

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(() => cache.get(CACHE_KEY));
  const [loading, setLoading] = useState(!cache.get(CACHE_KEY));
  const { t } = useTranslation();

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      const cached = cache.get(CACHE_KEY);
      if (cached) {
        setStats(cached);
        setLoading(false);
        // Silent background refresh
        try {
          const res = await api.get('/teacher/dashboard/counts', { signal: controller.signal });
          const data = res.data.data;
          cache.set(CACHE_KEY, data, CACHE_TTL);
          setStats(data);
        } catch { /* stale data stays visible */ }
        return;
      }
      try {
        const res = await api.get('/teacher/dashboard/counts', { signal: controller.signal });
        const data = res.data.data;
        cache.set(CACHE_KEY, data, CACHE_TTL);
        setStats(data);
      } catch (error) {
        if (error.code === 'ERR_CANCELED') return;
        setStats(FALLBACK);
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, []);

  if (loading) {
    return <SkeletonDashboard stats={5} cards={3} />;
  }

  const overviewCards = [
    { title: t('dashboard.parents'), value: stats?.parents || 0, icon: Users, href: '/teacher/parents' },
    { title: t('dashboard.activities'), value: stats?.activities || 0, icon: Activity, href: '/teacher/activities' },
    { title: t('dashboard.meals'), value: stats?.meals || 0, icon: UtensilsCrossed, href: '/teacher/meals' },
    { title: t('dashboard.media'), value: stats?.media || 0, icon: Camera, href: '/teacher/media' },
    { title: t('dashboard.teacherRating', { defaultValue: "Mening bahom" }), value: `${stats?.rating || '0.0'} (${stats?.ratingsCount || 0})`, icon: Star, href: '/teacher' },
    { title: t('dashboard.childStatus', { defaultValue: "Bola holati yozuvlari" }), value: stats?.statusEntries || 0, icon: HeartPulse, href: '/teacher/monitoring' },
  ];

  const getRoleText = () => {
    if (user?.role === 'admin') return t('dashboard.roleAdmin') || 'My Role: Admin';
    if (user?.role === 'teacher') return t('dashboard.roleTeacher') || 'My Role: Teacher';
    return t('dashboard.role') || 'My Role: Teacher';
  };

  return (
    <div className="space-y-6 relative z-10">
      <div className="bg-primary-500 rounded-2xl p-6 md:p-8 -mx-4 md:mx-0 relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-6 h-6 text-white" />
          <p className="text-white/90 text-sm font-medium">{getRoleText()}</p>
        </div>
        <p className="text-white/90 text-sm mb-1">{t('dashboard.welcome')}</p>
        <h1 className="text-3xl md:text-4xl font-bold text-white">
          {user?.firstName || ''} {user?.lastName || ''}
        </h1>
      </div>

      <div className="relative z-10">
        <h2 className="text-lg font-semibold text-white mb-4 drop-shadow-sm">{t('dashboard.overview')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {overviewCards.map((card) => (
            <Card key={card.title} className="p-4 hover:shadow-lg transition">
              <Link to={card.href} className="flex items-center gap-4">
                <div className="p-3 bg-primary-50 rounded-xl">
                  <card.icon className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-sm text-gray-600">{card.title}</p>
                </div>
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
