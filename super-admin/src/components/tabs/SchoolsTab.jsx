import { Building2, Star } from 'lucide-react';
import Card from '../Card';
import { useTranslation } from 'react-i18next';

export default function SchoolsTab({ schools, loadingSchools }) {
  const { t } = useTranslation();
  return (
    <>
      <div className="text-center">
        <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
          {t('superAdmin.schoolsTitle')}
        </h2>
        <p className="text-gray-600 font-medium">{t('superAdmin.schoolsSubtitle', { defaultValue: 'Barcha muassasalar va ularning baholari' })}</p>
      </div>

      <Card className="p-6 space-y-4">
        {loadingSchools ? (
          <div className="flex items-center justify-center min-h-[120px]">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : schools.length === 0 ? (
          <p className="text-sm text-gray-600">{t('superAdmin.schoolsEmpty')}</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-sm text-blue-600 font-medium mb-1">{t('superAdmin.totalSchools', { defaultValue: 'Jami Muassasalar' })}</p>
                <p className="text-2xl font-bold text-blue-900">{schools.length}</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-4">
                <p className="text-sm text-purple-600 font-medium mb-1">{t('superAdmin.totalRatings', { defaultValue: 'Jami Baholar' })}</p>
                <p className="text-2xl font-bold text-purple-900">
                  {schools.reduce((sum, s) => sum + (s.summary?.count || 0), 0)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {schools
                .sort((a, b) => (b.summary?.average || 0) - (a.summary?.average || 0))
                .map((school) => (
                  <div key={school.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-all bg-white">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-100 to-green-200 text-green-700 flex items-center justify-center shadow-sm">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <p className="text-sm font-bold text-gray-900">{school.name}</p>
                        {school.address && <p className="text-xs text-gray-600 line-clamp-1">{school.address}</p>}
                        {school.type && (
                          <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                            {school.type === 'school' ? t('superAdmin.schoolTypeSchool') :
                             school.type === 'kindergarten' ? t('superAdmin.schoolTypeKindergarten') :
                             t('superAdmin.schoolTypeBoth')}
                          </span>
                        )}
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star key={star} className={`w-4 h-4 ${star <= Math.round(school.summary?.average || 0) ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`} />
                            ))}
                          </div>
                          <span className="text-sm font-bold text-gray-900 ml-1">{school.summary?.average?.toFixed(1) || '0.0'}</span>
                          <span className="text-xs text-gray-500 ml-1">({school.summary?.count || 0} {t('superAdmin.ratings', { defaultValue: 'baholar' })})</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}
      </Card>
    </>
  );
}
