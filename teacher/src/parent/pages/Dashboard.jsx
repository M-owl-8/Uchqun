import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../../shared/context/SocketContext';
import { useTranslation } from 'react-i18next';
import { useChild } from '../context/ChildContext';
import { useNotification } from '../context/NotificationContext';
import { useToast } from '../../shared/context/ToastContext';
import api from '../services/api';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Activity,
  UtensilsCrossed,
  Camera,
  Bell,
  HeartPulse,
  Star,
  ChevronRight,
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const { on, off, connected } = useSocket();
  const { selectedChildId } = useChild();
  const { refreshNotifications, count = 0 } = useNotification();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const { error: showError } = useToast();

  const loadData = useCallback(async () => {
    if (!selectedChildId) return;
    try {
      const [childResponse, activitiesResponse, mealsResponse, mediaResponse] = await Promise.all([
        api.get(`/child/${selectedChildId}`).catch(() => ({ data: null })),
        api.get(`/activities?limit=5&childId=${selectedChildId}`).catch(() => ({ data: { activities: [] } })),
        api.get(`/meals?limit=5&childId=${selectedChildId}`).catch(() => ({ data: { meals: [] } })),
        api.get(`/media?limit=5&childId=${selectedChildId}`).catch(() => ({ data: { media: [] } })),
      ]);
      const [ratingsResponse, monitoringResponse] = await Promise.all([
        api.get('/parent/ratings').catch(() => ({ data: { data: { summary: { average: 0, count: 0 } } } })),
        api.get(`/parent/emotional-monitoring/child/${selectedChildId}?limit=1`).catch(() => ({ data: { data: [] } })),
      ]);

      const activities = activitiesResponse.data?.activities || activitiesResponse.data || [];
      const meals = mealsResponse.data?.meals || mealsResponse.data || [];
      const media = mediaResponse.data?.media || mediaResponse.data || [];
      const ratingsSummary = ratingsResponse.data?.data?.summary || { average: 0, count: 0 };
      const latestMonitoring = Array.isArray(monitoringResponse.data?.data) && monitoringResponse.data.data.length > 0
        ? monitoringResponse.data.data[0]
        : null;
      const emotionalState = latestMonitoring?.emotionalState || {};
      const emotionalTotal = Object.keys(emotionalState).length;
      const emotionalChecked = Object.values(emotionalState).filter(Boolean).length;
      const emotionalScore = emotionalTotal > 0 ? Math.round((emotionalChecked / emotionalTotal) * 100) : 0;

      setStats({
        activities: Array.isArray(activities) ? activities.length : 0,
        meals: Array.isArray(meals) ? meals.length : 0,
        media: Array.isArray(media) ? media.length : 0,
        teacherRating: Number(ratingsSummary.average || 0).toFixed(1),
        teacherRatingCount: Number(ratingsSummary.count || 0),
        childStatusScore: emotionalScore,
        recentActivity: Array.isArray(activities) && activities.length > 0 ? activities[0] : null,
      });

      // Refresh notifications after loading data
      refreshNotifications();
    } catch (error) { showError(error.response?.data?.error || error.message); } finally {
      setLoading(false);
    }
  }, [selectedChildId, refreshNotifications]);

  useEffect(() => {
    loadData();
  }, [selectedChildId, loadData]);

  // Real-time WebSocket listeners
  useEffect(() => {
    if (!connected || !selectedChildId) return;

    const handleDataChange = (data) => {
      loadData(); // Reload dashboard data
    };

    // Subscribe to all relevant events
    on('activity:created', handleDataChange);
    on('activity:updated', handleDataChange);
    on('activity:deleted', handleDataChange);
    on('meal:created', handleDataChange);
    on('meal:updated', handleDataChange);
    on('meal:deleted', handleDataChange);
    on('media:created', handleDataChange);
    on('media:updated', handleDataChange);
    on('media:deleted', handleDataChange);
    on('child:updated', handleDataChange);

    // Cleanup
    return () => {
      off('activity:created', handleDataChange);
      off('activity:updated', handleDataChange);
      off('activity:deleted', handleDataChange);
      off('meal:created', handleDataChange);
      off('meal:updated', handleDataChange);
      off('meal:deleted', handleDataChange);
      off('media:created', handleDataChange);
      off('media:updated', handleDataChange);
      off('media:deleted', handleDataChange);
      off('child:updated', handleDataChange);
    };
  }, [connected, selectedChildId, on, off, loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const overviewCards = [
    {
      title: t('dashboard.individualPlan') || 'Individual reja',
      value: stats?.activities || 0,
      icon: Activity,
      href: '/activities',
    },
    {
      title: t('dashboard.meals') || t('dashboard.mealsTracked'),
      value: stats?.meals || 0,
      icon: UtensilsCrossed,
      href: '/meals',
    },
    {
      title: t('dashboard.media') || t('dashboard.photos'),
      value: stats?.media || 0,
      icon: Camera,
      href: '/media',
    },
    {
      title: t('dashboard.childStatus', { defaultValue: "Bolaning holati" }),
      value: `${stats?.childStatusScore || 0}%`,
      icon: HeartPulse,
      href: '/child',
    },
    {
      title: t('dashboard.teacherRating', { defaultValue: "Tarbiyachi bahosi" }),
      value: `${stats?.teacherRating || '0.0'} (${stats?.teacherRatingCount || 0})`,
      icon: Star,
      href: '/rating',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto pb-20 animate-in fade-in duration-500 relative z-10">
      <div className="space-y-6 relative z-10">
          {/* Welcome Header Card */}
          <Card className="relative bg-gradient-to-r from-blue-500 to-blue-400 rounded-2xl p-6 md:p-8 shadow-xl border-0 z-10">
            {/* Notifications Icon in Top Right Corner of Card */}
            <Link to="/notifications" className="absolute top-4 right-4 md:top-6 md:right-6 z-10">
              <div className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm relative">
                <Bell className="w-5 h-5 text-white" />
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] leading-none font-extrabold rounded-full px-1.5 py-1 border-2 border-white shadow-sm">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </div>
            </Link>
            
            <div className="flex items-center gap-3 mb-2">
              <p className="text-white/90 text-sm font-medium">{t('dashboard.role')}</p>
            </div>
            <p className="text-white/90 text-sm mb-1">{t('dashboard.welcome')}</p>
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              {user?.firstName || ''} {user?.lastName || ''}
            </h1>
          </Card>

          {/* Overview Cards */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 drop-shadow-sm">{t('dashboard.overview')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
              {overviewCards.map((card) => (
                <Link key={card.title} to={card.href}>
                  <Card className="p-5 hover:shadow-xl transition-all duration-300 bg-white/95 backdrop-blur-sm cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                        <card.icon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                        <p className="text-sm text-gray-600 font-medium">{card.title}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
