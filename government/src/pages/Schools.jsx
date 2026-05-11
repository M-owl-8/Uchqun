import { useEffect, useState } from 'react';
import api from '../services/api';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import { Building2, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Schools = () => {
  const { t } = useTranslation();
  const [schools, setSchools] = useState([]);
  const [globalStats, setGlobalStats] = useState({ total: 0, totalReviews: 0, globalAverageRating: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    loadSchools();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSchools = async () => {
    try {
      setLoading(true);
      const res = await api.get('/government/schools');
      const data = res.data?.data || {};
      setSchools(data.schools || []);
      setGlobalStats({
        total: data.total || 0,
        totalReviews: data.totalReviews || 0,
        globalAverageRating: data.globalAverageRating || 0,
      });
    } catch (error) {
      setSchools([]);
      setLoadError(error.response?.data?.error || t('common.loadError', { defaultValue: 'Failed to load data' }));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" role="status" aria-label={t('schools.loading', { defaultValue: 'Loading schools' })}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-red-500">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {t('schools.title', { defaultValue: 'Muassasalar' })}
        </h1>
        <p className="text-gray-600">
          {t('schools.subtitle', { defaultValue: 'Barcha muassasalar ro\'yxati' })}
        </p>
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-label={t('schools.globalStats', { defaultValue: 'Global statistics' })} role="region">
        <Card className="p-6">
          <p className="text-sm text-gray-600 mb-1">
            {t('schools.totalSchools', { defaultValue: 'Jami muassasalar' })}
          </p>
          <p className="text-2xl font-bold text-gray-900">{globalStats.total}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-600 mb-1">
            {t('schools.totalReviews', { defaultValue: 'Jami baholar' })}
          </p>
          <p className="text-2xl font-bold text-gray-900">{globalStats.totalReviews}</p>
        </Card>
      </div>

      {schools.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">
              {t('schools.notFound', { defaultValue: 'Muassasalar topilmadi' })}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="list" aria-label={t('schools.title', { defaultValue: 'Muassasalar' })}>
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
              const rank = index + 1;
              return (
                <Card key={school.id} className="p-6" role="listitem">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1">
                      {/* Rank Badge */}
                      <div className="flex-shrink-0">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg ${
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
                      </div>
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-primary-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{school.name}</h3>
                          {school.address && (
                            <p className="text-sm text-gray-600 mt-1">{school.address}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {t('schools.students', { defaultValue: 'O\'quvchilar' })}:
                    </span>
                    <span className="font-semibold text-gray-900">{school.studentsCount || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {t('schools.ratings', { defaultValue: 'Baholar' })}:
                    </span>
                    <span className="font-semibold text-gray-900">{school.ratingsCount || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {t('schools.averageRating', { defaultValue: 'O\'rtacha reyting' })}:
                    </span>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                      <span className="font-semibold text-gray-900" aria-label={`${t('schools.averageRating', { defaultValue: "O'rtacha reyting" })}: ${(school.averageRating || 0).toFixed(1)}`}>
                        {(school.averageRating || 0).toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Schools;
