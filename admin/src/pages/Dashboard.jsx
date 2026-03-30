import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Users,
  GraduationCap,
  UserCheck,
  UsersRound,
  Crown,
  BarChart3,
  Shield,
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [receptions, setReceptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  // Helper function to safely get groups count
  const getGroupsCount = (groups) => {
    if (typeof groups === 'number') return groups;
    if (groups && typeof groups === 'object' && 'total' in groups) return groups.total;
    return 0;
  };

  // Helper function to safely get receptions count
  const getReceptionsCount = (receptions) => {
    if (typeof receptions === 'number') return receptions;
    if (receptions && typeof receptions === 'object' && 'total' in receptions) return receptions.total;
    return 0;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsResponse, receptionsResponse] = await Promise.all([
          api.get('/admin/statistics').catch(() => null),
          api.get('/admin/receptions').catch(() => ({ data: { data: [] } })),
        ]);
        
        const receptionsData = receptionsResponse?.data?.data || [];
        
        if (statsResponse?.data?.data) {
          const statsData = statsResponse.data.data;
          // Ensure we get the correct values
          const teachersCount = typeof statsData.teachers === 'number' 
            ? statsData.teachers 
            : (statsData.users?.teachers ?? 0);
          const parentsCount = typeof statsData.parents === 'number' 
            ? statsData.parents 
            : (statsData.users?.parents ?? 0);
          // Get children count - check multiple possible locations
          let childrenCount = 0;
          if (typeof statsData.children === 'number') {
            childrenCount = statsData.children;
          } else if (typeof statsData.users?.children === 'number') {
            childrenCount = statsData.users.children;
          } else if (typeof statsData.childrenCount === 'number') {
            childrenCount = statsData.childrenCount;
          } else {
            childrenCount = 0;
          }
          
          setStats({
            receptions: getReceptionsCount(statsData.receptions),
            teachers: teachersCount,
            parents: parentsCount,
            children: childrenCount,
            groups: getGroupsCount(statsData.groups),
          });
        } else {
          // Fallback to individual API calls if statistics endpoint fails
          try {
            const [receptionsRes, parentsRes, teachersRes, groupsRes] = await Promise.all([
              api.get('/admin/receptions').catch(() => ({ data: { data: [] } })),
              api.get('/admin/parents').catch(() => ({ data: { data: [] } })),
              api.get('/admin/teachers').catch(() => ({ data: { data: [] } })),
              api.get('/admin/groups').catch(() => ({ data: { groups: [] } })),
            ]);

            const receptionsData = receptionsRes.data.data || [];
            const parents = parentsRes.data.data || [];
            const teachers = teachersRes.data.data || [];
            const groups = groupsRes.data.groups || [];

            // Get children count - we'll calculate from parents data if available
            // For now, set to 0 as we don't have a direct API endpoint
            // The main statistics endpoint should provide this
            let childrenCount = 0;

            setStats({
              receptions: receptionsData.length,
              teachers: teachers.length,
              parents: parents.length,
              children: childrenCount,
              groups: groups.length,
            });
            setReceptions(receptionsData);
          } catch {
            setStats({
              receptions: 0,
              teachers: 0,
              parents: 0,
              children: 0,
              groups: 0,
            });
            setReceptions([]);
          }
        }
        setReceptions(receptionsData);
      } catch {
        setStats({
          receptions: 0,
          teachers: 0,
          parents: 0,
          children: 0,
          groups: 0,
        });
        setReceptions([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
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
