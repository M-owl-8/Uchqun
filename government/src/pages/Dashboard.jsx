import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import * as cache from '../../../shared/utils/cache';
import { SkeletonDashboard } from '../../../shared/components/Skeleton';
import { StaleIndicator } from '../../../shared/components/OfflineBanner';
import {
  Building2,
  GraduationCap,
  Star,
  RefreshCw,
  Shield,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const CACHE_KEY = 'government:dashboard';

const Dashboard = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState(() => cache.get(CACHE_KEY)?.stats ?? null);
  const [schools, setSchools] = useState(() => cache.get(CACHE_KEY)?.schools ?? []);
  const [admins, setAdmins] = useState(() => cache.get(CACHE_KEY)?.admins ?? []);
  const [activeWarnings, setActiveWarnings] = useState(() => cache.get(CACHE_KEY)?.activeWarnings ?? 0);
  const [loading, setLoading] = useState(!cache.get(CACHE_KEY));
  const [isStale, setIsStale] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadData = useCallback(async (bust = false) => {
    const cached = !bust && cache.get(CACHE_KEY);
    if (cached) {
      setStats(cached.stats);
      setSchools(cached.schools);
      setAdmins(cached.admins);
      setActiveWarnings(cached.activeWarnings ?? 0);
      setLoading(false);
      Promise.allSettled([
        api.get('/government/overview'),
        api.get('/government/schools?limit=10'),
        api.get('/government/admins'),
        api.get('/ai-warnings', { params: { resolved: false } }),
      ]).then(([overviewRes, schoolsRes, adminsRes, warningsRes]) => {
        const anyFailed = [overviewRes, schoolsRes, adminsRes].some(r => r.status === 'rejected');
        const s = overviewRes.status === 'fulfilled' ? overviewRes.value.data.data : cached.stats;
        const sc = schoolsRes.status === 'fulfilled' ? (schoolsRes.value.data.data?.schools || []) : cached.schools;
        const ad = adminsRes.status === 'fulfilled' ? (adminsRes.value.data?.data || []) : cached.admins;
        const aw = warningsRes.status === 'fulfilled' ? (warningsRes.value.data?.data?.length ?? warningsRes.value.data?.warnings?.length ?? 0) : cached.activeWarnings;
        cache.set(CACHE_KEY, { stats: s, schools: sc, admins: ad, activeWarnings: aw });
        setStats(s); setSchools(sc); setAdmins(ad); setActiveWarnings(aw); setIsStale(anyFailed);
        setLastUpdated(new Date());
      }).catch(() => {});
      return;
    }
    setLoading(true);
    const [overviewRes, schoolsRes, adminsRes, warningsRes] = await Promise.allSettled([
      api.get('/government/overview'),
      api.get('/government/schools?limit=10'),
      api.get('/government/admins'),
      api.get('/ai-warnings', { params: { resolved: false } }),
    ]);
    const anyFailed = [overviewRes, schoolsRes, adminsRes].some(r => r.status === 'rejected');
    const s = overviewRes.status === 'fulfilled' ? overviewRes.value.data.data : null;
    const sc = schoolsRes.status === 'fulfilled' ? (schoolsRes.value.data.data?.schools || []) : [];
    const ad = adminsRes.status === 'fulfilled' ? (adminsRes.value.data?.data || []) : [];
    const aw = warningsRes.status === 'fulfilled' ? (warningsRes.value.data?.data?.length ?? warningsRes.value.data?.warnings?.length ?? 0) : 0;
    cache.set(CACHE_KEY, { stats: s, schools: sc, admins: ad, activeWarnings: aw });
    setStats(s); setSchools(sc); setAdmins(ad); setActiveWarnings(aw); setIsStale(anyFailed);
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <SkeletonDashboard stats={4} cards={3} />;

  const pendingAdmins = admins.filter(a => !a.isApproved).length;

  const regionBreakdown = Object.values(
    schools.reduce((acc, s) => {
      const r = s.region || t('dashboard.unknownRegion', { defaultValue: "Noma'lum" });
      if (!acc[r]) acc[r] = { region: r, count: 0, totalRating: 0, rated: 0 };
      acc[r].count++;
      if (s.averageRating > 0) { acc[r].totalRating += s.averageRating; acc[r].rated++; }
      return acc;
    }, {})
  ).map(r => ({ ...r, avgRating: r.rated > 0 ? r.totalRating / r.rated : 0 }))
   .sort((a, b) => b.count - a.count);


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
            aria-label={t('dashboard.refresh')}
            className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => navigate('/government/schools')}
          className="bg-paper-card border border-gray-200 rounded-lg p-5 text-left hover:border-brand-300 hover:shadow-sm transition-all"
        >
          <Building2 className="w-4 h-4 text-brand-600 mb-3" strokeWidth={1.5} />
          <p className="text-2xl font-semibold text-inkGreen-900 tabular-nums">{(stats?.schools || 0).toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">{t('dashboard.totalSchools', { defaultValue: 'Muassasalar' })}</p>
        </button>

        <div className="bg-paper-card border border-gray-200 rounded-lg p-5">
          <GraduationCap className="w-4 h-4 text-brand-600 mb-3" strokeWidth={1.5} />
          <p className="text-2xl font-semibold text-inkGreen-900 tabular-nums">{(stats?.students || 0).toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">{t('dashboard.totalStudents', { defaultValue: "O'quvchilar" })}</p>
        </div>

        <div className={`bg-paper-card border rounded-lg p-5 ${pendingAdmins > 0 ? 'border-amber-300 bg-amber-50' : 'border-gray-200'}`}>
          <AlertTriangle className={`w-4 h-4 mb-3 ${pendingAdmins > 0 ? 'text-amber-500' : 'text-brand-600'}`} strokeWidth={1.5} />
          <p className="text-2xl font-semibold text-inkGreen-900 tabular-nums">{pendingAdmins}</p>
          <p className="text-xs text-gray-500 mt-1">{t('dashboard.pendingAdmins', { defaultValue: 'Kutilayotgan adminlar' })}</p>
        </div>

        <button
          onClick={() => navigate('/government/warnings')}
          className={`border rounded-lg p-5 text-left transition-all hover:shadow-sm ${activeWarnings > 0 ? 'bg-red-50 border-red-200 hover:border-red-300' : 'bg-paper-card border-gray-200 hover:border-brand-300'}`}
        >
          <ShieldAlert className={`w-4 h-4 mb-3 ${activeWarnings > 0 ? 'text-red-500' : 'text-brand-600'}`} strokeWidth={1.5} />
          <p className="text-2xl font-semibold text-inkGreen-900 tabular-nums">{activeWarnings}</p>
          <p className="text-xs text-gray-500 mt-1">{t('dashboard.activeWarnings', { defaultValue: 'Faol ogohlantirishlar' })}</p>
        </button>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending admin registrations */}
        <div className="bg-paper-card border border-gray-200 rounded-lg">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">
              {t('dashboard.pendingAdminList', { defaultValue: "Kutilayotgan admin so'rovlari" })}
            </h2>
            <Shield className="w-4 h-4 text-gray-300" />
          </div>
          {pendingAdmins === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">
              {t('dashboard.noPendingAdmins', { defaultValue: "Kutilayotgan so'rovlar yo'q" })}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="text-left px-5 py-2.5 font-medium">{t('dashboard.colName')}</th>
                  <th className="text-left px-5 py-2.5 font-medium hidden sm:table-cell">{t('dashboard.colEmail')}</th>
                  <th className="text-left px-5 py-2.5 font-medium hidden md:table-cell">{t('dashboard.colDate')}</th>
                </tr>
              </thead>
              <tbody>
                {admins.filter(a => !a.isApproved).slice(0, 8).map((admin) => (
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

      {/* Regional breakdown */}
      {regionBreakdown.length > 0 && (
        <div className="bg-paper-card border border-gray-200 rounded-lg">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">
              {t('dashboard.regionalBreakdown', { defaultValue: 'Viloyatlar bo\'yicha' })}
            </h2>
            <Building2 className="w-4 h-4 text-gray-300" />
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100 bg-paper-deep">
                <th className="text-left px-5 py-2.5 font-medium">{t('dashboard.colRegion', { defaultValue: 'Viloyat' })}</th>
                <th className="text-left px-5 py-2.5 font-medium">{t('dashboard.colSchools', { defaultValue: 'Muassasalar' })}</th>
                <th className="text-left px-5 py-2.5 font-medium">{t('dashboard.colAvgRating', { defaultValue: "O'rtacha reyting" })}</th>
              </tr>
            </thead>
            <tbody>
              {regionBreakdown.map((r) => (
                <tr key={r.region} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-2.5 font-medium text-gray-800">{r.region}</td>
                  <td className="px-5 py-2.5 tabular-nums text-gray-600">{r.count}</td>
                  <td className="px-5 py-2.5">
                    {r.avgRating > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="tabular-nums font-semibold text-gray-900">{r.avgRating.toFixed(1)}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">{t('dashboard.noRatings', { defaultValue: "Reyting yo'q" })}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
