import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useFetch } from '@shared/hooks/useFetch';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import { useToast } from '@shared/context/ToastContext';
import { Building2, ChevronRight, Star, Users, UserCheck, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

const SchoolDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { success: showSuccess, error: showError } = useToast();

  const { data, loading, error } = useFetch(`/government/schools/${id}`);

  // Local override for isActive so UI updates immediately after archive/reactivate
  const [isActiveOverride, setIsActiveOverride] = useState(null);
  const [archiving, setArchiving] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState(null); // 'archive' | 'reactivate' | null

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
          &#8592; {t('schoolDetail.backToList', { defaultValue: "Ro'yxatga qaytish" })}
        </button>
      </div>
    );
  }

  const school = data;
  const isActive = isActiveOverride !== null ? isActiveOverride : school.isActive;

  const handleArchiveAction = async () => {
    const action = archiveTarget;
    setArchiveTarget(null);
    setArchiving(true);
    try {
      await api.put(`/government/schools/${id}/${action}`);
      const nowActive = action === 'reactivate';
      setIsActiveOverride(nowActive);
      showSuccess(nowActive
        ? t('schoolDetail.reactivateSuccess', { defaultValue: "Maktab qayta faollashtirildi" })
        : t('schoolDetail.archiveSuccess', { defaultValue: "Maktab arxivlandi" })
      );
    } catch (err) {
      const code = err.response?.data?.error?.code;
      if (code === 'SCHOOL_ALREADY_ARCHIVED') {
        showError(t('schoolDetail.alreadyArchived', { defaultValue: "Maktab allaqachon arxivlangan" }));
      } else if (code === 'SCHOOL_ALREADY_ACTIVE') {
        showError(t('schoolDetail.alreadyActive', { defaultValue: "Maktab allaqachon faol" }));
      } else {
        const msg = err.response?.data?.error?.detail ?? err.response?.data?.error?.code ?? t('schoolDetail.archiveError', { defaultValue: "Xato yuz berdi" });
        showError(msg);
      }
    } finally {
      setArchiving(false);
    }
  };

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
        <div className="flex items-center gap-3 flex-shrink-0">
          {isActive !== undefined && (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
              isActive ? 'bg-success-100 text-success-800' : 'bg-gray-100 text-gray-600'
            }`}>
              {isActive
                ? t('schoolDetail.active', { defaultValue: 'Faol' })
                : t('schoolDetail.inactive', { defaultValue: 'Nofaol' })}
            </span>
          )}
          {isActive ? (
            <button
              onClick={() => setArchiveTarget('archive')}
              disabled={archiving}
              className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {archiving ? <LoadingSpinner size="xs" /> : t('schoolDetail.archiveSchool', { defaultValue: 'Arxivlash' })}
            </button>
          ) : (
            <button
              onClick={() => setArchiveTarget('reactivate')}
              disabled={archiving}
              className="px-3 py-1.5 text-xs font-medium text-brand-600 border border-brand-200 rounded-md hover:bg-brand-50 transition-colors disabled:opacity-50"
            >
              {archiving ? <LoadingSpinner size="xs" /> : t('schoolDetail.reactivateSchool', { defaultValue: 'Qayta faollashtirish' })}
            </button>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main — left 2/3 */}
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
                { label: t('schoolDetail.type', { defaultValue: 'Tur' }), value: school.type || '—' },
                { label: t('schoolDetail.region', { defaultValue: 'Viloyat' }), value: school.region || '—' },
                { label: t('schoolDetail.city', { defaultValue: 'Shahar' }), value: school.city || '—' },
                { label: t('schoolDetail.phone', { defaultValue: 'Telefon' }), value: school.phone || '—' },
                { label: t('schoolDetail.email', { defaultValue: 'Email' }), value: school.email || '—' },
                { label: t('schoolDetail.director', { defaultValue: 'Direktor' }), value: school.director || '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                  <p className="text-sm text-gray-800 font-medium">{value}</p>
                </div>
              ))}
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
                { icon: Users,     label: t('schoolDetail.students', { defaultValue: "O'quvchilar" }), value: school.studentsCount || 0 },
                { icon: UserCheck, label: t('schoolDetail.teachers', { defaultValue: "O'qituvchilar" }), value: school.teachersCount || 0 },
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
              <p className="text-xs text-gray-400">{school.ratingsCount || 0} {t('schoolDetail.ratingsCount')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm archive/reactivate */}
      <ConfirmDialog
        dialog={archiveTarget ? {
          message: archiveTarget === 'archive'
            ? t('schoolDetail.confirmArchive', { defaultValue: "Ushbu maktabni arxivlashni tasdiqlaysizmi?" })
            : t('schoolDetail.confirmReactivate', { defaultValue: "Ushbu maktabni qayta faollashtirishni tasdiqlaysizmi?" }),
          onConfirm: handleArchiveAction,
        } : null}
        onCancel={() => setArchiveTarget(null)}
      />
    </div>
  );
};

export default SchoolDetail;
