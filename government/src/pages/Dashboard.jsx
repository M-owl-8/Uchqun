import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Building2,
  Users,
  GraduationCap,
  Star,
  BarChart3,
  Shield,
  Award,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [schools, setSchools] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [overviewRes, schoolsRes, adminsRes] = await Promise.allSettled([
      api.get('/government/overview'),
      api.get('/government/schools?limit=10'),
      api.get('/government/admins'),
    ]);

    if (overviewRes.status === 'fulfilled') setStats(overviewRes.value.data.data);
    if (schoolsRes.status === 'fulfilled') setSchools(schoolsRes.value.data.data?.schools || []);
    if (adminsRes.status === 'fulfilled') setAdmins(adminsRes.value.data?.data || []);

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const LEVEL_COLORS = {
    5: 'bg-green-100 text-green-800',
    4: 'bg-blue-100 text-blue-800',
    3: 'bg-yellow-100 text-yellow-800',
    2: 'bg-orange-100 text-orange-800',
    1: 'bg-red-100 text-red-800',
    0: 'bg-gray-100 text-gray-500',
  };

  const overviewCards = [
    {
      title: t('dashboard.totalSchools', { defaultValue: 'Jami Muassasalar' }),
      value: stats?.schools || 0,
      icon: Building2,
      color: 'bg-blue-500',
      path: '/government/schools',
    },
    {
      title: t('dashboard.totalStudents', { defaultValue: 'Jami O\'quvchilar' }),
      value: stats?.students || 0,
      icon: Users,
      color: 'bg-green-500',
      path: '/government/students',
    },
    {
      title: t('dashboard.totalTeachers', { defaultValue: 'Jami O\'qituvchilar' }),
      value: stats?.teachers || 0,
      icon: GraduationCap,
      color: 'bg-purple-500',
      path: '/government/teachers',
    },
    {
      title: t('dashboard.totalParents', { defaultValue: 'Jami Ota-onalar' }),
      value: stats?.parents || 0,
      icon: Users,
      color: 'bg-orange-500',
      path: '/government/parents',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {t('dashboard.title', { defaultValue: 'Davlat Nazorat Paneli' })}
        </h1>
        <p className="text-gray-600">
          {t('dashboard.welcome', { 
            defaultValue: 'Xush kelibsiz, {{name}}',
            name: `${user?.firstName} ${user?.lastName}`
          })}
        </p>
      </div>

      {/* Overview Cards - bosilganda tegishli sahifaga o'tadi */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {overviewCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card
              key={index}
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer hover:ring-2 hover:ring-primary-500/30"
              onClick={() => card.path && navigate(card.path)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                </div>
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Admins List */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {t('dashboard.adminList', { defaultValue: 'Adminlar' })}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {t('dashboard.adminListDesc', { 
                defaultValue: 'Barcha adminlar ro\'yxati ({{count}})',
                count: admins.length
              })}
            </p>
          </div>
          <Shield className="w-6 h-6 text-gray-400" />
        </div>

        {admins.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">
              {t('dashboard.adminNotFound', { defaultValue: 'Adminlar topilmadi' })}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {admins.map((admin) => (
              <div
                key={admin.id}
                onClick={() => navigate(`/government/admin/${admin.id}`)}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 mb-1">
                      {admin.firstName} {admin.lastName}
                    </h3>
                    <p className="text-sm text-gray-600 truncate">{admin.email}</p>
                    {admin.phone && (
                      <p className="text-xs text-gray-500 mt-1">{admin.phone}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString('uz-UZ') : '—'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Schools with Ratings */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {t('dashboard.schoolsList', { defaultValue: 'Muassasalar va Baholari' })}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {t('dashboard.schoolsListDesc', { defaultValue: 'Muassasalar reytinglari va statistikasi' })}
            </p>
          </div>
          <BarChart3 className="w-6 h-6 text-gray-400" />
        </div>

        {schools.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">
              {t('dashboard.schoolsNotFound', { defaultValue: 'Muassasalar topilmadi' })}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {schools
              .sort((a, b) => {
                // Sort by average rating (descending), then by ratings count (descending)
                const ratingA = a.averageRating || 0;
                const ratingB = b.averageRating || 0;
                if (ratingB !== ratingA) {
                  return ratingB - ratingA;
                }
                return (b.ratingsCount || 0) - (a.ratingsCount || 0);
              })
              .map((school, index) => {
                const level = school.governmentLevel ?? 0;
                const rank = index + 1;
                return (
                  <div
                    key={school.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {/* Rank Badge */}
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-base flex-shrink-0 ${
                            rank === 1 
                              ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-400' 
                              : rank === 2 
                              ? 'bg-gray-100 text-gray-700 border-2 border-gray-400'
                              : rank === 3
                              ? 'bg-orange-100 text-orange-700 border-2 border-orange-400'
                              : 'bg-primary-100 text-primary-600'
                          }`}>
                            {rank}
                          </div>
                          <Building2 className="w-5 h-5 text-blue-600" />
                          <h3 className="font-bold text-gray-900">{school.name}</h3>
                        </div>
                        {school.address && (
                          <p className="text-sm text-gray-600 mb-2">{school.address}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>
                            {t('dashboard.students', { defaultValue: 'O\'quvchilar' })}: {school.studentsCount || 0}
                          </span>
                          <span>
                            {t('dashboard.ratings', { defaultValue: 'Baholar' })}: {school.ratingsCount || 0}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-5 h-5 ${
                                star <= Math.round(school.averageRating || 0)
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'fill-gray-200 text-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-lg font-bold text-gray-900 ml-2">
                          {(school.averageRating || 0).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
