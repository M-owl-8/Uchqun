import { useTranslation } from 'react-i18next';
import { useFetch } from '@shared/hooks/useFetch';
import Card from '@shared/components/Card';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import { Building2, Star, AlertCircle } from 'lucide-react';

const RatingSummaryRow = ({ label, avg, extra }) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between py-2 border-b border-warm-100 last:border-0">
      <span className="text-sm text-warm-600">{label}</span>
      {avg != null ? (
        <div className="flex items-center gap-1.5">
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          <span className="text-sm font-bold text-warm-900">{Number(avg).toFixed(1)}</span>
          {extra && <span className="text-xs text-warm-400">{extra}</span>}
        </div>
      ) : (
        <span className="text-xs text-warm-400 italic">{t('schoolRatings.noRating', { defaultValue: "Reyting yo'q" })}</span>
      )}
    </div>
  );
};

const TYPE_KEYS = {
  daycare:            'schoolRatings.typeDaycare',
  early_preschool:    'schoolRatings.typeEarlyPreschool',
  support:            'schoolRatings.typeSupport',
  early_intervention: 'schoolRatings.typeEarlyIntervention',
  home_care:          'schoolRatings.typeHomeCare',
};

const SchoolRatings = () => {
  const { t } = useTranslation();
  const { data: schoolRatings, loading, error } = useFetch('/admin/school-ratings', { initialData: [] });
  const { data: ratingSummary } = useFetch('/admin/school-rating-summary');

  const typeLabel = (type) =>
    t(TYPE_KEYS[type] ?? 'schoolRatings.typeUnknown', { defaultValue: type });

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
          <div className="p-2 rounded-full bg-error-50 text-error-600">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-warm-900">{t('schoolRatings.error')}</h2>
            <p className="text-warm-600">{error}</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!schoolRatings || schoolRatings.length === 0) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Card className="flex items-center justify-center py-12">
          <div className="text-center">
            <Building2 className="w-12 h-12 text-warm-400 mx-auto mb-4" />
            <p className="text-warm-600">{t('schoolRatings.empty')}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="letterhead pt-4">
        <p className="text-xs font-medium uppercase tracking-wider text-brand-700">
          {t('aiWarnings.eyebrow', { defaultValue: 'Hisobotlar' })}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-warm-900">
          {t('schoolRatings.title')} ({schoolRatings.length})
        </h1>
        <p className="text-sm text-warm-600 mt-1">{t('schoolRatings.subtitle')}</p>
      </div>

      {/* Three-rating summary card */}
      {ratingSummary && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-warm-800 mb-3">{t('schoolRatings.summaryTitle', { defaultValue: "Maktab Reytingi Xulosasi" })}</h2>
          <RatingSummaryRow
            label={t('schoolRatings.parentRating', { defaultValue: 'Ota-onalar reytingi' })}
            avg={ratingSummary.parent?.avg}
            extra={ratingSummary.parent?.count != null ? `(${ratingSummary.parent.count} ta baho)` : undefined}
          />
          <RatingSummaryRow
            label={t('schoolRatings.govRating', { defaultValue: 'Davlat reytingi' })}
            avg={ratingSummary.government?.avg}
            extra={ratingSummary.government?.period}
          />
          <RatingSummaryRow
            label={t('schoolRatings.cumulativeRating', { defaultValue: 'Umumiy reyting' })}
            avg={ratingSummary.cumulative?.avg}
            extra={ratingSummary.cumulative?.isPartial ? t('schoolRatings.partial', { defaultValue: 'qisman' }) : undefined}
          />
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6">
        {schoolRatings.map((schoolData, index) => (
          <Card key={schoolData.school?.id || `school-${index}`} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-md bg-warm-100 text-warm-700 flex items-center justify-center">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-warm-900">{schoolData.school?.name || 'Unknown School'}</h2>
                  {schoolData.school?.address && (
                    <p className="text-sm text-warm-500 mt-1">{schoolData.school.address}</p>
                  )}
                  {schoolData.school?.type && (
                    <span className="inline-flex items-center mt-2 px-2 py-0.5 text-xs font-medium rounded-sm bg-warm-100 text-warm-700 border border-warm-200">
                      {typeLabel(schoolData.school.type)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="text-2xl font-bold text-warm-900">
                    {schoolData.average?.toFixed(1) || '0.0'}
                  </span>
                </div>
                <p className="text-sm text-warm-500 mt-1">
                  {t('schoolRatings.ratingsCount', { count: schoolData.count || 0 })}
                </p>
              </div>
            </div>

            {schoolData.ratings && schoolData.ratings.length > 0 && (
              <div className="mt-6 pt-6 border-t border-warm-200">
                <h3 className="text-sm font-semibold text-warm-700 mb-4">
                  {t('schoolRatings.recentRatings')}
                </h3>
                <div className="space-y-3">
                  {schoolData.ratings.slice(0, 5).map((rating) => (
                    <div key={rating.id} className="flex items-start gap-3 p-3 rounded-lg bg-warm-50">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <Star
                            key={value}
                            className={`w-4 h-4 ${rating.stars >= value ? 'fill-yellow-400 text-yellow-400' : 'fill-transparent text-warm-300'}`}
                          />
                        ))}
                      </div>
                      <div className="flex-1">
                        {rating.comment && (
                          <p className="text-sm text-warm-700">{rating.comment}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {rating.parentName && (
                            <p className="text-xs text-warm-500">
                              {t('schoolRatings.by')} {rating.parentName}
                            </p>
                          )}
                          {rating.updatedAt && (
                            <p className="text-xs text-warm-400">
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
