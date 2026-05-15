import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import Card from '../components/Card';
import { SkeletonDashboard } from '../../../shared/components/Skeleton';
import * as cache from '../../../shared/utils/cache';
import {
  Users,
  GraduationCap,
  UserCheck,
  UsersRound,
  Crown,
  BarChart3,
  Shield,
} from 'lucide-react';

const CACHE_KEY = 'admin:dashboard';

const getGroupsCount = (groups) => {
  if (typeof groups === 'number') return groups;
  if (groups && typeof groups === 'object' && 'total' in groups) return groups.total;
  return 0;
};

const getReceptionsCount = (receptions) => {
  if (typeof receptions === 'number') return receptions;
  if (receptions && typeof receptions === 'object' && 'total' in receptions) return receptions.total;
  return 0;
};

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(() => cache.get(CACHE_KEY)?.stats ?? null);
  const [receptions, setReceptions] = useState(() => cache.get(CACHE_KEY)?.receptions ?? []);
  const [loading, setLoading] = useState(!cache.get(CACHE_KEY));
  const { t } = useTranslation();

  const fetchFresh = useCallback(async (signal) => {
    const [statsResponse, receptionsResponse] = await Promise.all([
      api.get('/admin/statistics', { signal }).catch(() => null),
      api.get('/admin/receptions', { signal }).catch(() => ({ data: { data: [] } })),
    ]);

    const receptionsData = receptionsResponse?.data?.data || [];
    let statsData = null;

    if (statsResponse?.data?.data) {
      const raw = statsResponse.data.data;
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
      };
    } else {
      try {
        const [receptionsRes, parentsRes, teachersRes, groupsRes] = await Promise.all([
          api.get('/admin/receptions', { signal }).catch(() => ({ data: { data: [] } })),
          api.get('/admin/parents', { signal }).catch(() => ({ data: { data: [] } })),
          api.get('/admin/teachers', { signal }).catch(() => ({ data: { data: [] } })),
          api.get('/admin/groups', { signal }).catch(() => ({ data: { groups: [] } })),
        ]);
        statsData = {
          receptions: (receptionsRes.data.data || []).length,
          teachers: (teachersRes.data.data || []).length,
          parents: (parentsRes.data.data || []).length,
          children: 0,
          groups: (groupsRes.data.groups || []).length,
        };
      } catch {
        statsData = { receptions: 0, teachers: 0, parents: 0, children: 0, groups: 0 };
      }
    }

    return { stats: statsData, receptions: receptionsData };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    const cached = cache.get(CACHE_KEY);

    if (cached) {
      setStats(cached.stats);
      setReceptions(cached.receptions);
      setLoading(false);
      fetchFresh(signal)
        .then(result => {
          if (!result) return;
          cache.set(CACHE_KEY, result);
          setStats(result.stats);
          setReceptions(result.receptions);
        })
        .catch(() => {});
      return () => controller.abort();
    }

    fetchFresh(signal)
      .then(result => {
        if (!result) return;
        cache.set(CACHE_KEY, result);
        setStats(result.stats);
        setReceptions(result.receptions);
      })
      .catch(() => {
        setStats({ receptions: 0, teachers: 0, parents: 0, children: 0, groups: 0 });
        setReceptions([]);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [fetchFresh]);

  if (loading) {
    return <SkeletonDashboard stats={5} cards={2} />;
  }

  const statisticsCards = [
    {
      title: t('dashboard.receptions', { defaultValue: 'Receptions' }),
      value: stats?.receptions || 0,
      icon: Users,
      color: 'bg-blue-50 text-blue-600'
    },
    {
      title: t('dashboard.teachers', { defaultValue: 'Teachers' }),
      value: stats?.teachers || 0,
      icon: GraduationCap,
      color: 'bg-indigo-50 text-indigo-600'
    },
    {
      title: t('dashboard.parents', { defaultValue: 'Parents' }),
      value: stats?.parents || 0,
      icon: UserCheck,
      color: 'bg-orange-50 text-orange-600'
    },
    {
      title: t('dashboard.groups', { defaultValue: 'Groups' }),
      value: stats?.groups || 0,
      icon: UsersRound,
      color: 'bg-teal-50 text-teal-600'
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary-600 to-primary-500 rounded-2xl p-6 md:p-8 -mx-4 md:mx-0">
        <div className="flex items-center gap-3 mb-2">
          <Crown className="w-8 h-8 text-yellow-300" />
          <p className="text-white/90 text-sm font-medium">{t('dashboard.role')}</p>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white">
          {t('dashboard.welcome', { name: user?.firstName || 'Admin', defaultValue: `Welcome, ${user?.firstName || 'Admin'}` })}
        </h1>
        <p className="text-white/80 text-sm mt-2">{t('dashboard.subtitle', { defaultValue: 'Admin Statistics Dashboard' })}</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.statistics', { defaultValue: 'Statistics' })}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statisticsCards.map((card, index) => (
            <Card key={`card-${index}`} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex flex-col items-center text-center">
                <div className={`p-3 rounded-xl ${card.color} mb-3`}>
                  <card.icon className="w-6 h-6" />
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-1">{card.value}</p>
                <p className="text-sm text-gray-600">{card.title}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Receptions List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{t('dashboard.receptionsList', { defaultValue: 'Receptions List' })}</h2>
          <Link to="/admin/receptions" className="text-sm text-primary-600 hover:underline">
            {t('common.viewAll', { defaultValue: 'View All' })}
          </Link>
        </div>
        {receptions.length > 0 ? (
          <Card className="overflow-hidden">
            <div className="divide-y divide-gray-100">
              {receptions.slice(0, 5).map((reception, index) => (
                <div key={reception.id || reception._id || `reception-${index}`} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold">
                      {reception.firstName?.charAt(0)}{reception.lastName?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{reception.firstName} {reception.lastName}</p>
                      <p className="text-sm text-gray-500">{reception.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      reception.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {reception.isActive ? t('common.active', { defaultValue: 'Active' }) : t('common.pending', { defaultValue: 'Pending' })}
                    </span>
                    <Link
                      to={`/admin/receptions/${reception.id || reception._id}`}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      <BarChart3 className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card className="p-6 text-center">
            <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{t('dashboard.noReceptions', { defaultValue: 'No receptions yet' })}</p>
            <Link
              to="/admin/receptions/new"
              className="inline-block mt-3 text-primary-600 hover:underline text-sm"
            >
              {t('dashboard.addReception', { defaultValue: 'Add Reception' })}
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
