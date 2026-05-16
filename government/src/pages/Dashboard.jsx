import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import * as cache from '../../../shared/utils/cache';
import { SkeletonDashboard } from '../../../shared/components/Skeleton';
import { StaleIndicator } from '../../../shared/components/OfflineBanner';
import {
  Building2,
  Users,
  GraduationCap,
  Star,
  RefreshCw,
  Shield,
  UserCheck,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const CACHE_KEY = 'government:dashboard';

// Two-state badge only \u2014 pending / approved
// TODO(phase-2): backend should support intermediate states (e.g., "under review")
const StatusBadge = ({ status }) => {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-success-100 text-success-800">
        Tasdiqlangan
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
      Kutilmoqda
    </span>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState(() => cache.get(CACHE_KEY)?.stats ?? null);
  const [schools, setSchools] = useState(() => cache.get(CACHE_KEY)?.schools ?? []);
  const [admins, setAdmins] = useState(() => cache.get(CACHE_KEY)?.admins ?? []);
  const [loading, setLoading] = useState(!cache.get(CACHE_KEY));
  const [isStale, setIsStale] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadData = useCallback(async (bust = false) => {
    const cached = !bust && cache.get(CACHE_KEY);
    if (cached) {
      setStats(cached.stats);
      setSchools(cached.schools);
      setAdmins(cached.admins);
      setLoading(false);
      Promise.allSettled([
        api.get('/government/overview'),
        api.get('/government/schools?limit=10'),
        api.get('/government/admins'),
      ]).then(([overviewRes, schoolsRes, adminsRes]) => {
        const anyFailed = [overviewRes, schoolsRes, adminsRes].some(r => r.status === 'rejected');
        const s = overviewRes.status === 'fulfilled' ? overviewRes.value.data.data : cached.stats;
        const sc = schoolsRes.status === 'fulfilled' ? (schoolsRes.value.data.data?.schools || []) : cached.schools;
        const ad = adminsRes.status === 'fulfilled' ? (adminsRes.value.data?.data || []) : cached.admins;
        cache.set(CACHE_KEY, { stats: s, schools: sc, admins: ad });
        setStats(s); setSchools(sc); setAdmins(ad); setIsStale(anyFailed);
        setLastUpdated(new Date());
      }).catch(() => {});
      return;
    }
    setLoading(true);
    const [overviewRes, schoolsRes, adminsRes] = await Promise.allSettled([
      api.get('/government/overview'),
      api.get('/government/schools?limit=10'),
      api.get('/government/admins'),
    ]);
    const anyFailed = [overviewRes, schoolsRes, adminsRes].some(r => r.status === 'rejected');
    const s = overviewRes.status === 'fulfilled' ? overviewRes.value.data.data : null;
    const sc = schoolsRes.status === 'fulfilled' ? (schoolsRes.value.data.data?.schools || []) : [];
    const ad = adminsRes.status === 'fulfilled' ? (adminsRes.value.data?.data || []) : [];
    cache.set(CACHE_KEY, { stats: s, schools: sc, admins: ad });
    setStats(s); setSchools(sc); setAdmins(ad); setIsStale(anyFailed);
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <SkeletonDashboard stats={4} cards={3} />;

  const overviewCards = [
    { title: t('dashboard.totalSchools', { defaultValue: 'Muassasalar' }),     value: stats?.schools  || 0, icon: Building2,    path: '/government/schools' },
    { title: t('dashboard.totalStudents', { defaultValue: "O'quvchilar" }),    value: stats?.students || 0, icon: GraduationCap, path: '/government/students' },
    { title: t('dashboard.totalTeachers', { defaultValue: "O'qituvchilar" }), value: stats?.teachers || 0, icon: UserCheck,     path: '/government/teachers' },
    { title: t('dashboard.totalParents', { defaultValue: 'Ota-onalar' }),      value: stats?.parents  || 0, icon: Users,        path: '/government/parents' },
  ];


  return (
    <div className="space-y-6">
      <StaleIndicator isStale={isStale} onRetry={loadData} />

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-inkGreen-900">
            {t('dashboard.title', { defaultValue: 'Davlat Nazorat Paneli' })}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {t('dashboard.subtitle', { defaultValue: "Umumiy ko'rinish" })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 mt-1">
          {lastUpdated && (
            <span className="text-xs text-gray-400">
              {t('dashboard.lastUpdated', { defaultValue: 'Oxirgi yangilanish' })}: {lastUpdated.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => loadData(true)}
            aria-label="Ma'lumotlarni yangilash"
            className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.path}
              onClick={() => navigate(card.path)}
              className="bg-paper-card border border-gray-200 rounded-lg p-5 text-left hover:border-brand-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <Icon className="w-4 h-4 text-brand-600" strokeWidth={1.5} />
              </div>
              <p className="text-2xl font-semibold text-inkGreen-900 tabular-nums">{card.value.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">{card.title}</p>
            </button>
          );
        })}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left \u2014 main content (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Admin registrations */}
          <div className="bg-paper-card border border-gray-200 rounded-lg">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">
                {t('dashboard.adminList', { defaultValue: "So'nggi admin so'rovlari" })}
              </h2>
              <Shield className="w-4 h-4 text-gray-300" />
            </div>
            {admins.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">
                {t('dashboard.adminNotFound', { defaultValue: "Admin so'rovlari topilmadi" })}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    <th className="text-left px-5 py-2.5 font-medium">Ism</th>
                    <th className="text-left px-5 py-2.5 font-medium hidden sm:table-cell">Email</th>
                    <th className="text-left px-5 py-2.5 font-medium hidden md:table-cell">Sana</th>
                    <th className="text-left px-5 py-2.5 font-medium">Holat</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.slice(0, 8).map((admin) => (
                    <tr
                      key={admin.id}
                      onClick={() => navigate(`/government/admin/${admin.id}`)}
                      className="border-b border-gray-50 last:border-0 hover:bg-brand-50 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {admin.firstName} {admin.lastName}
                      </td>
                      <td className="px-5 py-3 text-gray-500 hidden sm:table-cell">{admin.email}</td>
                      <td className="px-5 py-3 text-gray-400 hidden md:table-cell tabular-nums">
                        {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString(i18n.language) : '\u2014'}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={admin.isApproved ? 'approved' : 'pending'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Schools ratings */}
          <div className="bg-paper-card border border-gray-200 rounded-lg">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">
                {t('dashboard.schoolsList', { defaultValue: 'Muassasalar reytingi' })}
              </h2>
              <Star className="w-4 h-4 text-gray-300" />
            </div>
            {schools.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">
                {t('dashboard.schoolsNotFound', { defaultValue: 'Muassasalar topilmadi' })}
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {schools
                  .sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
                  .slice(0, 6)
                  .map((school, index) => (
                    <div key={school.id} className="flex items-center justify-between px-5 py-3 hover:bg-brand-50 cursor-pointer transition-colors"
                         onClick={() => navigate(`/government/schools/${school.id}`)}>
                      <div className="flex items-center gap-3">
                        <span className="text-xs tabular-nums text-gray-400 w-5">{index + 1}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{school.name}</p>
                          {school.address && <p className="text-xs text-gray-400 truncate max-w-[200px]">{school.address}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-semibold tabular-nums text-gray-900">
                          {(school.averageRating || 0).toFixed(1)}
                        </span>
                        <span className="text-xs text-gray-400">({school.ratingsCount || 0})</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Right rail \u2014 quick links */}
        <div className="space-y-6">
          <div className="bg-paper-card border border-gray-200 rounded-lg">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">
                {t('dashboard.quickLinks', { defaultValue: 'Tezkor havolalar' })}
              </h2>
            </div>
            <div className="divide-y divide-gray-50">
              {[
                { icon: Shield,    label: t('nav.platform', { defaultValue: 'Platforma' }),   href: '/government/platform' },
                { icon: Building2, label: t('nav.schools', { defaultValue: 'Muassasalar' }), href: '/government/schools' },
                { icon: Star,      label: t('nav.ratings', { defaultValue: 'Reytinglar' }),   href: '/government/ratings' },
                { icon: UserCheck, label: t('nav.teachers', { defaultValue: "O'qituvchilar" }), href: '/government/teachers' },
                { icon: Users,     label: t('nav.parents', { defaultValue: 'Ota-onalar' }),   href: '/government/parents' },
              ].map(({ icon: Icon, label, href }) => (
                <button key={href} onClick={() => navigate(href)} className="w-full flex items-center gap-3 px-5 py-3 hover:bg-brand-50 transition-colors text-left">
                  <Icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" strokeWidth={1.5} />
                  <p className="text-xs text-gray-600">{label}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
