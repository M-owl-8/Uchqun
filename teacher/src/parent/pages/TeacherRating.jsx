import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Star, Mail, Phone, MessageSquare, AlertCircle, CheckCircle2, Building2 } from 'lucide-react';
import api from '../services/api';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import { useChild } from '../context/ChildContext';

const TeacherRating = () => {
  const { t, i18n } = useTranslation();
  const { selectedChild } = useChild();
  const [teacher, setTeacher] = useState(null);
  const [rating, setRating] = useState(null);
  const [summary, setSummary] = useState({ average: 0, count: 0 });
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  
  // School rating states
  const [school, setSchool] = useState(null);
  const [schoolRating, setSchoolRating] = useState(null);
  const [schoolSummary, setSchoolSummary] = useState({ average: 0, count: 0 });
  const [schoolAllRatings, setSchoolAllRatings] = useState([]); // All ratings from all parents
  const [schoolStars, setSchoolStars] = useState(0);
  const [schoolComment, setSchoolComment] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSchool, setSavingSchool] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [schoolError, setSchoolError] = useState('');
  const [schoolSuccess, setSchoolSuccess] = useState('');

  const locale = useMemo(() => {
    return (
      {
        uz: 'uz-UZ',
        ru: 'ru-RU',
        en: 'en-US',
      }[i18n.language] || 'en-US'
    );
  }, [i18n.language]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError('');
      setSchoolError('');
      try {
        const childIdParam = selectedChild?.id ? `?childId=${selectedChild.id}` : '';
        const [profileRes, ratingRes, schoolRatingRes] = await Promise.all([
          api.get('/parent/profile'),
          api.get('/parent/ratings').catch((err) => {
            if (err.response?.status === 400 || err.response?.status === 404) {
              return { data: { data: { rating: null, summary: { average: 0, count: 0 } } } };
            }
            throw err;
          }),
          api.get(`/parent/school-rating${childIdParam}`).catch((err) => {
            if (err.response?.status === 400 || err.response?.status === 404 || err.response?.status === 500) {
              return { data: { data: { rating: null, school: null, summary: { average: 0, count: 0 }, allRatings: [] } } };
            }
            throw err;
          }),
        ]);
        const teacherData = profileRes.data?.data?.user?.assignedTeacher || null;
        setTeacher(teacherData);
        const ratingData = ratingRes?.data?.data || { rating: null, summary: { average: 0, count: 0 } };
        setRating(ratingData.rating);
        setStars(ratingData.rating?.stars || 0);
        setComment(ratingData.rating?.comment || '');
        setSummary(ratingData.summary || { average: 0, count: 0 });
        const schoolRatingData = schoolRatingRes?.data?.data || { rating: null, school: null, summary: { average: 0, count: 0 }, allRatings: [] };
        setSchool(schoolRatingData.school);
        setSchoolRating(schoolRatingData.rating);
        setSchoolStars(schoolRatingData.rating?.stars || 0);
        setSchoolComment(schoolRatingData.rating?.comment || '');
        setSchoolSummary(schoolRatingData.summary || { average: 0, count: 0 });
        setSchoolAllRatings(schoolRatingData.allRatings || []);
      } catch (err) {
        setError(t('ratingPage.errorLoad'));
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [selectedChild?.id, t]);

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!teacher) {
      setError(t('ratingPage.noTeacher'));
      return;
    }

    if (!stars) {
      setError(t('ratingPage.errorRequired'));
      return;
    }

    setSaving(true);
    try {
      await api.post('/parent/ratings', { stars, comment });
      setRating({
        stars,
        comment,
        updatedAt: new Date().toISOString(),
      });
      setSuccess(t('ratingPage.success'));

      // Refresh summary after saving
      const refreshRes = await api.get('/parent/ratings').catch((err) => {
        if (err.response?.status === 400 || err.response?.status === 404) {
          return { data: { data: { summary: { average: 0, count: 0 } } } };
        }
        throw err;
      });
      const ratingData = refreshRes?.data?.data || {};
      setSummary(ratingData.summary || { average: 0, count: 0 });
    } catch (err) {
      
      // Get error message from response
      let errorMessage = t('ratingPage.errorSave');
      if (err.response?.data) {
        // Prefer message field, then error field
        errorMessage = err.response.data.message || err.response.data.error || errorMessage;
        // Add details if available
        if (err.response.data.details) {
          if (typeof err.response.data.details === 'string') {
            errorMessage += ': ' + err.response.data.details;
          } else if (typeof err.response.data.details === 'object') {
            errorMessage += ': ' + JSON.stringify(err.response.data.details);
          }
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleSchoolSubmit = async () => {
    setSchoolError('');
    setSchoolSuccess('');

    if (!school) {
      setSchoolError(t('schoolRatingPage.noSchool'));
      return;
    }

    // Stars (1-5) is REQUIRED
    if (!schoolStars || schoolStars < 1 || schoolStars > 5) {
      setSchoolError(t('schoolRatingPage.errorStarsRequired'));
      return;
    }

    // Validate school data
    if (!school.id && (!school.name || typeof school.name !== 'string' || school.name.trim().length === 0)) {
      setSchoolError(t('schoolRatingPage.noSchool'));
      return;
    }

    setSavingSchool(true);
    try {
      // Stars (1-5) is REQUIRED
      let payload;
      if (school.id) {
        payload = {
          schoolId: school.id,
          stars: schoolStars, // Required
          comment: schoolComment || null
        };
      } else {
        payload = {
          schoolName: school.name.trim(),
          stars: schoolStars, // Required
          comment: schoolComment || null
        };
      }
      
      await api.post('/parent/school-rating', payload);
      setSchoolRating({
        stars: schoolStars,
        comment: schoolComment,
        updatedAt: new Date().toISOString(),
      });
      setSchoolSuccess(t('schoolRatingPage.success'));

      // Refresh summary after saving
      const childIdParam = selectedChild?.id ? `?childId=${selectedChild.id}` : '';
      const refreshRes = await api.get(`/parent/school-rating${childIdParam}`).catch((err) => {
        if (err.response?.status === 400 || err.response?.status === 404) {
          return { data: { data: { summary: { average: 0, count: 0 } } } };
        }
        throw err;
      });
      const ratingData = refreshRes?.data?.data || {};
      setSchoolSummary(ratingData.summary || { average: 0, count: 0 });
      setSchoolAllRatings(ratingData.allRatings || []); // Update all ratings
      // Also update school data in case it was found/created
      if (ratingData.school) {
        setSchool(ratingData.school);
      }
    } catch (err) {

      // Get error message from response
      let errorMessage = t('schoolRatingPage.errorSave');
      if (err.response?.data) {
        // Prefer message field, then error field
        errorMessage = err.response.data.message || err.response.data.error || errorMessage;
        // Add details if available
        if (err.response.data.details) {
          if (typeof err.response.data.details === 'string') {
            errorMessage += ': ' + err.response.data.details;
          } else if (typeof err.response.data.details === 'object') {
            errorMessage += ': ' + JSON.stringify(err.response.data.details);
          }
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      setSchoolError(errorMessage);
    } finally {
      setSavingSchool(false);
    }
  };

  const lastUpdated = useMemo(() => {
    if (!rating?.updatedAt && !rating?.createdAt) return null;
    const dateValue = rating.updatedAt || rating.createdAt;
    return new Date(dateValue).toLocaleString(locale);
  }, [rating, locale]);

  const starButtons = [1, 2, 3, 4, 5];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Teacher Rating Section */}
      {!teacher ? (
        <Card className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-blue-50 text-blue-600">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{t('ratingPage.title')}</h2>
            <p className="text-gray-600">{t('ratingPage.noTeacher')}</p>
          </div>
        </Card>
      ) : (
        <>
          <Card className="bg-gradient-to-r from-blue-500 to-blue-400 rounded-2xl p-6 md:p-8 shadow-xl border-0">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{t('ratingPage.title')}</h1>
            <p className="text-white/90 text-sm md:text-base">{t('ratingPage.subtitle')}</p>
          </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 font-black flex items-center justify-center text-xl">
                {teacher.firstName?.[0]}
                {teacher.lastName?.[0]}
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                  {t('ratingPage.yourTeacher')}
                </p>
                <h2 className="text-xl font-bold text-gray-900">
                  {teacher.firstName} {teacher.lastName}
                </h2>
                <p className="text-sm text-gray-500">{teacher.email}</p>
              </div>
            </div>

            <div className="flex flex-col items-end text-right">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {t('ratingPage.average')}
              </p>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-blue-600 font-bold text-xl">
                  <Star className="w-5 h-5 fill-blue-500 text-blue-500" />
                  {summary.average?.toFixed(1) || '0.0'}
                </div>
                <span className="text-xs text-gray-500">
                  {t('ratingPage.ratingsCount', { count: summary.count || 0 })}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200">
              <Mail className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">{teacher.email || '—'}</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200">
              <Phone className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">{teacher.phone || t('ratingPage.noPhone')}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">{t('ratingPage.starsLabel')}</p>
              <div className="flex items-center gap-2">
                {starButtons.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStars(value)}
                    className={`p-3 rounded-2xl border transition-colors ${
                      stars >= value
                        ? 'bg-blue-50 border-blue-200 text-blue-600'
                        : 'bg-white border-gray-200 text-gray-400 hover:border-blue-200 hover:text-blue-500'
                    }`}
                  >
                    <Star
                      className="w-6 h-6"
                      fill={stars >= value ? '#f97316' : 'none'}
                      stroke={stars >= value ? '#ea580c' : 'currentColor'}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-700">{t('ratingPage.commentLabel')}</p>
                <span className="text-xs text-gray-400">{t('ratingPage.optional')}</span>
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                placeholder={t('ratingPage.commentPlaceholder')}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            {success && (
              <div className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                <CheckCircle2 className="w-4 h-4 mt-0.5" />
                <p>{success}</p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                {lastUpdated && t('ratingPage.lastUpdated', { date: lastUpdated })}
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving && <LoadingSpinner size="sm" />}
                {rating ? t('ratingPage.update') : t('ratingPage.submit')}
              </button>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{t('ratingPage.yourRating')}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {starButtons.map((value) => (
                <Star
                  key={value}
                  className="w-5 h-5"
                  fill={(rating?.stars || stars) >= value ? '#f97316' : 'none'}
                  stroke={(rating?.stars || stars) >= value ? '#ea580c' : '#9ca3af'}
                />
              ))}
            </div>

            <div className="text-sm text-gray-600">
              {rating?.comment ? `"${rating.comment}"` : t('ratingPage.noComment')}
            </div>
          </Card>

          <Card className="space-y-3">
            <p className="text-sm font-semibold text-gray-900">{t('ratingPage.summaryTitle')}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-blue-500 fill-blue-500" />
                <div>
                  <p className="text-xl font-bold text-gray-900">{summary.average?.toFixed(1) || '0.0'}</p>
                  <p className="text-xs text-gray-500">{t('ratingPage.average')}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-gray-900">{summary.count || 0}</p>
                <p className="text-xs text-gray-500">{t('ratingPage.ratingsCount', { count: summary.count || 0 })}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
        </>
      )}

      {/* School Rating Section */}
      {school ? (
        <>
          <Card className="bg-gradient-to-r from-green-500 to-green-400 rounded-2xl p-6 md:p-8 shadow-xl border-0">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">{t('schoolRatingPage.title')}</h2>
            <p className="text-white/90 text-sm md:text-base">{t('schoolRatingPage.subtitle')}</p>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-green-100 text-green-700 font-black flex items-center justify-center text-xl">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">
                      {t('schoolRatingPage.yourSchool')}
                    </p>
                    <h2 className="text-xl font-bold text-gray-900">
                      {school.name}
                    </h2>
                    {school.address && (
                      <p className="text-sm text-gray-500">{school.address}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end text-right">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {t('schoolRatingPage.average')}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-green-600 font-bold text-xl">
                      <Star className="w-5 h-5 fill-green-500 text-green-500" />
                      {schoolSummary.average?.toFixed(1) || '0.0'}
                    </div>
                    <span className="text-xs text-gray-500">
                      {t('schoolRatingPage.ratingsCount', { count: schoolSummary.count || 0 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Stars Rating (1-5) - REQUIRED */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">{t('schoolRatingPage.starsLabel', { defaultValue: 'Baholash (yulduzcha)' })}</p>
                  <p className="text-xs text-gray-500 mb-4">{t('schoolRatingPage.starsSubtitle', { defaultValue: 'Majburiy: 1 dan 5 gacha yulduzcha tanlang' })}</p>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setSchoolStars(value)}
                        className={`p-3 rounded-2xl border transition-colors ${
                          schoolStars >= value
                            ? 'bg-green-50 border-green-200 text-green-600'
                            : 'bg-white border-gray-200 text-gray-400 hover:border-green-200 hover:text-green-500'
                        }`}
                      >
                        <Star
                          className="w-6 h-6"
                          fill={schoolStars >= value ? '#22c55e' : 'none'}
                          stroke={schoolStars >= value ? '#16a34a' : 'currentColor'}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-700">{t('schoolRatingPage.commentLabel')}</p>
                    <span className="text-xs text-gray-400">{t('schoolRatingPage.optional')}</span>
                  </div>
                  <textarea
                    value={schoolComment}
                    onChange={(e) => setSchoolComment(e.target.value)}
                    rows={4}
                    placeholder={t('schoolRatingPage.commentPlaceholder')}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                {schoolError && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 mt-0.5" />
                    <p>{schoolError}</p>
                  </div>
                )}

                {schoolSuccess && (
                  <div className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    <CheckCircle2 className="w-4 h-4 mt-0.5" />
                    <p>{schoolSuccess}</p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    {schoolRating?.updatedAt && t('schoolRatingPage.lastUpdated', { 
                      date: new Date(schoolRating.updatedAt).toLocaleString(locale) 
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={handleSchoolSubmit}
                    disabled={savingSchool}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {savingSchool && <LoadingSpinner size="sm" />}
                    {schoolRating ? t('schoolRatingPage.update') : t('schoolRatingPage.submit')}
                  </button>
                </div>
              </div>
            </Card>

            <div className="space-y-4">
              <Card className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-green-50 text-green-600">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t('schoolRatingPage.yourRating')}</p>
                    <p className="text-xs text-gray-500">{t('schoolRatingPage.rateCta')}</p>
                  </div>
                </div>

                {/* Display Stars Rating */}
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Star
                      key={value}
                      className="w-5 h-5"
                      fill={(schoolRating?.stars || schoolStars) >= value ? '#22c55e' : 'none'}
                      stroke={(schoolRating?.stars || schoolStars) >= value ? '#16a34a' : '#9ca3af'}
                    />
                  ))}
                </div>

                {/* Display Evaluation Criteria if any */}
                {schoolRating?.evaluation && Object.keys(schoolRating.evaluation).length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-gray-200">
                    {Object.keys(schoolRating.evaluation).map((key) => {
                      const isChecked = (schoolRating?.evaluation?.[key]) === true;
                      if (!isChecked) return null;
                      return (
                        <div key={key} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 
                            className="w-4 h-4 text-green-600"
                            fill="#22c55e"
                          />
                          <span className="text-gray-700">
                            {t(`schoolRatingPage.criteria.${key}`)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="text-sm text-gray-600 pt-2 border-t border-gray-200">
                  {schoolRating?.comment ? `"${schoolRating.comment}"` : t('schoolRatingPage.noComment')}
                </div>
              </Card>

              <Card className="space-y-3">
                <p className="text-sm font-semibold text-gray-900">{t('schoolRatingPage.summaryTitle')}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-green-500 fill-green-500" />
                    <div>
                      <p className="text-xl font-bold text-gray-900">{schoolSummary.average?.toFixed(1) || '0.0'}</p>
                      <p className="text-xs text-gray-500">{t('schoolRatingPage.average')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">{schoolSummary.count || 0}</p>
                    <p className="text-xs text-gray-500">{t('schoolRatingPage.ratingsCount', { count: schoolSummary.count || 0 })}</p>
                  </div>
                </div>
              </Card>

              {/* All Ratings from Other Parents */}
              {schoolAllRatings && schoolAllRatings.length > 0 && (
                <Card className="space-y-4">
                  <p className="text-sm font-semibold text-gray-900">{t('schoolRatingPage.allRatings', { defaultValue: 'Barcha baholar' })}</p>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {schoolAllRatings.map((r) => (
                      <div key={r.id} className="border border-gray-200 rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className="w-4 h-4"
                                fill={s <= (r.stars || 0) ? '#22c55e' : 'none'}
                                stroke={s <= (r.stars || 0) ? '#16a34a' : '#d1d5db'}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-gray-400">
                            {r.updatedAt || r.createdAt 
                              ? new Date(r.updatedAt || r.createdAt).toLocaleDateString(locale)
                              : ''}
                          </span>
                        </div>
                        {r.comment && (
                          <div className="flex items-start gap-2 text-gray-700">
                            <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5" />
                            <p className="text-sm leading-relaxed">{r.comment}</p>
                          </div>
                        )}
                        {r.parentName && (
                          <p className="text-xs text-gray-500">
                            {t('schoolRatingPage.byParent', { name: r.parentName, defaultValue: `Baholovchi: ${r.parentName}` })}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </>
      ) : (
        <Card className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-green-50 text-green-600">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{t('schoolRatingPage.title')}</h2>
            <p className="text-gray-600">{t('schoolRatingPage.noSchool')}</p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default TeacherRating;

