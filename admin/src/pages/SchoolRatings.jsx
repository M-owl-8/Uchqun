import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import { Building2, Star, AlertCircle } from 'lucide-react';

const SchoolRatings = () => {
  const { t } = useTranslation();
  const [schoolRatings, setSchoolRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/admin/school-ratings');
      setSchoolRatings(response.data.data || []);
    } catch (err) {
      setError(err.response?.data?.error || t('schoolRatings.errorLoad'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Card className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-red-50 text-red-600">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{t('schoolRatings.error')}</h2>
            <p className="text-gray-600">{error}</p>
          </div>
        </Card>
      </div>
    );
  }

  if (schoolRatings.length === 0) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Card className="flex items-center justify-center py-12">
          <div className="text-center">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">{t('schoolRatings.empty')}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('schoolRatings.title')}</h1>
        <p className="text-gray-600 mt-2">{t('schoolRatings.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {schoolRatings.map((schoolData, index) => (
          <Card key={schoolData.school?.id || `school-${index}`} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-100 text-green-700 flex items-center justify-center">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{schoolData.school?.name || 'Unknown School'}</h2>
                  {schoolData.school?.address && (
                    <p className="text-sm text-gray-500 mt-1">{schoolData.school.address}</p>
                  )}
                  {schoolData.school?.type && (
                    <span className="inline-block mt-2 px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-700">
                      {schoolData.school.type === 'school' ? t('schoolRatings.typeSchool') :
                       schoolData.school.type === 'kindergarten' ? t('schoolRatings.typeKindergarten') :
                       t('schoolRatings.typeBoth')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 fill-green-500 text-green-500" />
                  <span className="text-2xl font-bold text-gray-900">
                    {schoolData.average?.toFixed(1) || '0.0'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {t('schoolRatings.ratingsCount', { count: schoolData.count || 0 })}
                </p>
              </div>
            </div>

            {schoolData.ratings && schoolData.ratings.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">
                  {t('schoolRatings.recentRatings')}
                </h3>
                <div className="space-y-3">
                  {schoolData.ratings.slice(0, 5).map((rating) => (
                    <div key={rating.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <Star
                            key={value}
                            className="w-4 h-4"
                            fill={rating.stars >= value ? '#22c55e' : 'none'}
                            stroke={rating.stars >= value ? '#16a34a' : '#9ca3af'}
                          />
                        ))}
                      </div>
                      <div className="flex-1">
                        {rating.comment && (
                          <p className="text-sm text-gray-700">{rating.comment}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {rating.parentName && (
                            <p className="text-xs text-gray-500">
                              {t('schoolRatings.by')} {rating.parentName}
                            </p>
                          )}
                          {rating.updatedAt && (
                            <p className="text-xs text-gray-400">
                              {new Date(rating.updatedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SchoolRatings;
