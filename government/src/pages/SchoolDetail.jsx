import { useParams, useNavigate, Link } from 'react-router-dom';
import { useFetch } from '@shared/hooks/useFetch';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import { Building2, ChevronRight, Star, Users, UserCheck, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// TODO(phase-2): backend /api/v1/government/schools/:id endpoint needs to return
// { school, stats: { studentsCount, teachersCount, docsApproved, docsTotal, capacity }, ratings: [] }

const SchoolDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // TODO(phase-2): confirm exact API path once backend implements it
  const { data, loading, error } = useFetch(`/government/schools/${id}`);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-16 text-center">
        <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
        <p className="text-sm text-gray-500 mb-4">
          {t('schoolDetail.notFound', { defaultValue: 'Muassasa topilmadi' })}
        </p>
        <button
          onClick={() => navigate('/government/schools')}
          className="text-sm text-brand-600 hover:text-brand-700"
        >
          \u2190 {t('schoolDetail.backToList', { defaultValue: "Ro'yxatga qaytish" })}
        </button>
      </div>
    );
  }

  const school = data.school || data;
  const stats = data.stats || {};

  // Derived metrics with TODO fallbacks
  const occupancyPct = stats.capacity
    ? Math.round(((stats.studentsCount || 0) / stats.capacity) * 100)
    : null; // TODO(phase-2): capacity field not yet in API

  const docApprovalPct = stats.docsTotal
    ? Math.round(((stats.docsApproved || 0) / stats.docsTotal) * 100)
    : null; // TODO(phase-2): docsApproved/docsTotal not yet in API

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-400">
        <Link to="/government/schools" className="hover:text-brand-600 transition-colors">
          {t('schools.title', { defaultValue: 'Muassasalar' })}
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-700 font-medium">{school.name}</span>
      </nav>

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-inkGreen-900">{school.name}</h1>
          {school.address && <p className="text-sm text-gray-500 mt-0.5">{school.address}</p>}
        </div>
        {school.isActive !== undefined && (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
            school.isActive ? 'bg-success-100 text-success-800' : 'bg-gray-100 text-gray-600'
          }`}>
            {school.isActive
              ? t('schoolDetail.active', { defaultValue: 'Faol' })
              : t('schoolDetail.inactive', { defaultValue: 'Nofaol' })}
          </span>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main \u2014 left 2/3 */}
        <div className="lg:col-span-2 space-y-5">
          {/* Key facts */}
          <div className="bg-paper-card border border-gray-200 rounded-lg">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">
                {t('schoolDetail.overview', { defaultValue: "Umumiy ma'lumot" })}
              </h2>
            </div>
            <div className="px-5 py-4 grid grid-cols-2 gap-x-8 gap-y-4">
              {[
                { label: t('schoolDetail.type', { defaultValue: 'Tur' }), value: school.type || '\u2014' },
                { label: t('schoolDetail.region', { defaultValue: 'Viloyat' }), value: school.region || '\u2014' },
                { label: t('schoolDetail.city', { defaultValue: 'Shahar' }), value: school.city || '\u2014' },
                { label: t('schoolDetail.phone', { defaultValue: 'Telefon' }), value: school.phone || '\u2014' },
                { label: t('schoolDetail.email', { defaultValue: 'Email' }), value: school.email || '\u2014' },
                { label: t('schoolDetail.director', { defaultValue: 'Direktor' }), value: school.director || '\u2014' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                  <p className="text-sm text-gray-800 font-medium">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Maktab ko'rsatkichlari \u2014 3 metric cells */}
          <div className="bg-paper-card border border-gray-200 rounded-lg">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">
                {t('schoolDetail.metrics', { defaultValue: "Maktab ko'rsatkichlari" })}
              </h2>
            </div>
            <div className="grid grid-cols-3 divide-x divide-gray-100">
              {/* Talabalar bandligi */}
              <div className="px-5 py-4">
                <p className="text-xs text-gray-400 mb-1">{t('schoolDetail.occupancy', { defaultValue: 'Talabalar bandligi' })}</p>
                {occupancyPct !== null ? (
                  <>
                    <p className="text-xl font-semibold tabular-nums text-gray-900">{occupancyPct}%</p>
                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full" style={{ width: `${Math.min(occupancyPct, 100)}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{stats.studentsCount} / {stats.capacity}</p>
                  </>
                ) : (
                  <p className="text-sm text-gray-400">
                    {stats.studentsCount || 0}
                    {/* TODO(phase-2): capacity field needed from API */}
                  </p>
                )}
              </div>

              {/* O'qituvchilar yuklamasi */}
              <div className="px-5 py-4">
                <p className="text-xs text-gray-400 mb-1">{t('schoolDetail.teacherLoad', { defaultValue: "O'qituvchilar yuklamasi" })}</p>
                <p className="text-xl font-semibold tabular-nums text-gray-900">
                  {stats.teachersCount || school.teachersCount || 0}
                </p>
                <p className="text-xs text-gray-400 mt-1">{t('schoolDetail.teachers', { defaultValue: "O'qituvchilar" })}</p>
                {/* TODO(phase-2): teacher load ratio (students per teacher) needs API support */}
              </div>

              {/* Hujjat tasdiqlash */}
              <div className="px-5 py-4">
                <p className="text-xs text-gray-400 mb-1">{t('schoolDetail.docApproval', { defaultValue: 'Hujjat tasdiqlash' })}</p>
                {docApprovalPct !== null ? (
                  <>
                    <p className="text-xl font-semibold tabular-nums text-gray-900">{docApprovalPct}%</p>
                    <p className="text-xs text-gray-400 mt-1">{stats.docsApproved} / {stats.docsTotal}</p>
                  </>
                ) : (
                  <p className="text-sm text-gray-400">
                    \u2014
                    {/* TODO(phase-2): docs approved/total fields needed from API */}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right rail */}
        <div className="space-y-5">
          {/* Quick stats */}
          <div className="bg-paper-card border border-gray-200 rounded-lg">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">
                {t('schoolDetail.stats', { defaultValue: 'Statistika' })}
              </h2>
            </div>
            <div className="divide-y divide-gray-50">
              {[
                { icon: Users,     label: t('schoolDetail.students', { defaultValue: "O'quvchilar" }), value: school.studentsCount || stats.studentsCount || 0 },
                { icon: UserCheck, label: t('schoolDetail.teachers', { defaultValue: "O'qituvchilar" }), value: school.teachersCount || stats.teachersCount || 0 },
                { icon: FileText,  label: t('schoolDetail.ratings', { defaultValue: 'Baholar' }),       value: school.ratingsCount || 0 },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                    <span className="text-sm text-gray-600">{label}</span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-gray-900">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rating */}
          <div className="bg-paper-card border border-gray-200 rounded-lg">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">
                {t('schoolDetail.rating', { defaultValue: 'Reyting' })}
              </h2>
            </div>
            <div className="px-5 py-4 text-center">
              <p className="text-4xl font-bold tabular-nums text-inkGreen-900">
                {(school.averageRating || 0).toFixed(1)}
              </p>
              <div className="flex justify-center gap-0.5 my-2">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={`w-4 h-4 ${s <= Math.round(school.averageRating || 0) ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`} />
                ))}
              </div>
              <p className="text-xs text-gray-400">{school.ratingsCount || 0} ta baho</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchoolDetail;
