// PL-015 GATE: Indicator labels in the school rating form are PLACEHOLDERS from
// shared/config/ratingIndicators.js. DO NOT ship this form to beta users until the
// partner provides real indicator names via PL-015 and ratingIndicators.js is updated.
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Star, Mail, Phone, MessageSquare, AlertCircle, CheckCircle2, Building2, BarChart3 } from 'lucide-react';
import api from '../services/api';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import { useChild } from '../context/ChildContext';
import { useToast } from '../../shared/context/ToastContext';
import { PARENT_INDICATORS } from '@shared/config/ratingIndicators.js';

const DEFAULT_INDICATORS = Object.fromEntries(PARENT_INDICATORS.map((ind) => [ind.key, 3]));

const TeacherRating = () => {
  const { t, i18n } = useTranslation();
  const { selectedChild } = useChild();
  const toast = useToast();

  const [teacher, setTeacher] = useState(null);
  const [rating, setRating] = useState(null);
  const [summary, setSummary] = useState({ average: 0, count: 0 });
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');

  const [school, setSchool] = useState(null);
  const [schoolRating, setSchoolRating] = useState(null);
  const [schoolSummary, setSchoolSummary] = useState({ average: 0, count: 0 });
  const [schoolIndicators, setSchoolIndicators] = useState(DEFAULT_INDICATORS);
  const [schoolComment, setSchoolComment] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSchool, setSavingSchool] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
              return { data: { data: { rating: null, school: null, summary: { average: 0, count: 0 } } } };
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

        const schoolRatingData = schoolRatingRes?.data?.data || { rating: null, school: null, summary: { average: 0, count: 0 } };
        setSchool(schoolRatingData.school);
        setSchoolRating(schoolRatingData.rating);
        setSchoolComment(schoolRatingData.rating?.comment || '');
        setSchoolSummary(schoolRatingData.summary || { average: 0, count: 0 });

        const saved = schoolRatingData.rating?.indicators;
        if (saved && typeof saved === 'object') {
          setSchoolIndicators((prev) => ({
            ...prev,
            ...Object.fromEntries(
              PARENT_INDICATORS.map((ind) => [ind.key, saved[ind.key] ?? prev[ind.key]])
            ),
          }));
        }
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
      setRating({ stars, comment, updatedAt: new Date().toISOString() });
      setSuccess(t('ratingPage.success'));

      const refreshRes = await api.get('/parent/ratings').catch((err) => {
        if (err.response?.status === 400 || err.response?.status === 404) {
          return { data: { data: { summary: { average: 0, count: 0 } } } };
        }
        throw err;
      });
      const ratingData = refreshRes?.data?.data || {};
      setSummary(ratingData.summary || { average: 0, count: 0 });
    } catch (err) {
      let errorMessage = t('ratingPage.errorSave');
      if (err.response?.data) {
        errorMessage = err.response.data.message || err.response.data.error || errorMessage;
        if (err.response.data.details) {
          errorMessage +=
            ': ' +
            (typeof err.response.data.details === 'string'
              ? err.response.data.details
              : JSON.stringify(err.response.data.details));
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
    if (!school) {
      toast.error(t('schoolRatingPage.noSchool'));
      return;
    }

    if (!schoolComment.trim()) {
      toast.error(t('schoolRatingPage.commentRequired', { defaultValue: 'Izoh majburiy' }));
      return;
    }

    const allValid = PARENT_INDICATORS.every((ind) => {
      const v = schoolIndicators[ind.key];
      return Number.isInteger(v) && v >= 1 && v <= 5;
    });
    if (!allValid) {
      toast.error(t('schoolRatingPage.indicatorsRequired', { defaultValue: "Barcha ko'rsatkichlarni to'ldiring" }));
      return;
    }

    setSavingSchool(true);
    try {
      const indicators = Object.fromEntries(
        PARENT_INDICATORS.map((ind) => [ind.key, schoolIndicators[ind.key]])
      );
      await api.post('/parent/school-rating', {
        schoolId: school.id,
        indicators,
        comment: schoolComment.trim(),
      });
      setSchoolRating({ indicators, comment: schoolComment, updatedAt: new Date().toISOString() });
      toast.success(t('schoolRatingPage.success'));

      const childIdParam = selectedChild?.id ? `?childId=${selectedChild.id}` : '';
      const refreshRes = await api.get(`/parent/school-rating${childIdParam}`).catch((err) => {
        if (err.response?.status === 400 || err.response?.status === 404) {
          return { data: { data: { summary: { average: 0, count: 0 } } } };
        }
        throw err;
      });
      const ratingData = refreshRes?.data?.data || {};
      setSchoolSummary(ratingData.summary || { average: 0, count: 0 });
      if (ratingData.school) setSchool(ratingData.school);
    } catch (err) {
      const code = err.response?.data?.error?.code;
      const errMap = {
        RATING_COMMENT_REQUIRED: t('schoolRatingPage.commentRequired', { defaultValue: 'Izoh majburiy' }),
        RATING_INDICATORS_REQUIRED: t('schoolRatingPage.indicatorsRequired', { defaultValue: "Barcha ko'rsatkichlarni to'ldiring" }),
        RATING_INDICATOR_INVALID: t('schoolRatingPage.indicatorInvalid', { defaultValue: "Har bir ko'rsatkich 1-5 oralig'ida bo'lishi kerak" }),
        RATING_SCHOOL_FORBIDDEN: t('schoolRatingPage.schoolForbidden', { defaultValue: "Bu maktabni baholash huquqingiz yo'q" }),
        RATING_SCHOOL_NOT_FOUND: t('schoolRatingPage.noSchool'),
      };
      toast.error(errMap[code] || t('schoolRatingPage.errorSave'));
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
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Teacher Rating Section */}
      {!teacher ? (
        <div className="page-card rounded-xl p-5 flex items-start gap-3">
          <div className="p-2 rounded-full bg-p-brand-50 text-p-brand-600 shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-serif text-[16px] font-semibold text-p-ink">{t('ratingPage.title')}</h2>
            <p className="text-[13px] text-p-sepia-500">{t('ratingPage.noTeacher')}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-p-brand-700 rounded-xl p-5 text-white">
            <p className="text-[11px] uppercase tracking-[.12em] font-medium text-p-brand-200 mb-1">{t('ratingPage.subtitle')}</p>
            <h1 className="font-serif text-[22px] font-semibold">{t('ratingPage.title')}</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-p-brand-50 text-p-brand-700 font-black flex items-center justify-center text-xl">
                    {teacher.firstName?.[0]}
                    {teacher.lastName?.[0]}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-p-brand-600 uppercase tracking-wide">
                      {t('ratingPage.yourTeacher')}
                    </p>
                    <h2 className="text-xl font-bold text-slate-900">
                      {teacher.firstName} {teacher.lastName}
                    </h2>
                    <p className="text-sm text-slate-500">{teacher.email}</p>
                  </div>
                </div>

                <div className="flex flex-col items-end text-right">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {t('ratingPage.average')}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-p-brand-600 font-bold text-xl">
                      <Star className="w-5 h-5 fill-p-brand-500 text-p-brand-500" />
                      {summary.average?.toFixed(1) || '0.0'}
                    </div>
                    <span className="text-xs text-slate-500">
                      {t('ratingPage.ratingsCount', { count: summary.count || 0 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200">
                  <Mail className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-700">{teacher.email || '—'}</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200">
                  <Phone className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-700">{teacher.phone || t('ratingPage.noPhone')}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">{t('ratingPage.starsLabel')}</p>
                  <div className="flex items-center gap-2">
                    {starButtons.map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setStars(value)}
                        className={`p-3 rounded-2xl border transition-colors ${
                          stars >= value
                            ? 'bg-p-brand-50 border-p-brand-200 text-p-brand-600'
                            : 'bg-p-surface border-slate-200 text-slate-400 hover:border-p-brand-200 hover:text-p-brand-500'
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
                    <p className="text-sm font-semibold text-slate-700">{t('ratingPage.commentLabel')}</p>
                    <span className="text-xs text-slate-400">{t('ratingPage.optional')}</span>
                  </div>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    placeholder={t('ratingPage.commentPlaceholder')}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-p-brand-500 focus:border-transparent"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">
                    <AlertCircle className="w-4 h-4 mt-0.5" />
                    <p>{error}</p>
                  </div>
                )}

                {success && (
                  <div className="flex items-start gap-2 rounded-xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700">
                    <CheckCircle2 className="w-4 h-4 mt-0.5" />
                    <p>{success}</p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    {lastUpdated && t('ratingPage.lastUpdated', { date: lastUpdated })}
                  </div>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-p-brand-600 text-white font-semibold hover:bg-p-brand-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
                  <div className="p-2 rounded-xl bg-p-brand-50 text-p-brand-600">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{t('ratingPage.yourRating')}</p>
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

                <div className="text-sm text-slate-600">
                  {rating?.comment ? `"${rating.comment}"` : t('ratingPage.noComment')}
                </div>
              </Card>

              <Card className="space-y-3">
                <p className="text-sm font-semibold text-slate-900">{t('ratingPage.summaryTitle')}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-p-brand-500 fill-p-brand-500" />
                    <div>
                      <p className="text-xl font-bold text-slate-900">{summary.average?.toFixed(1) || '0.0'}</p>
                      <p className="text-xs text-slate-500">{t('ratingPage.average')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-slate-900">{summary.count || 0}</p>
                    <p className="text-xs text-slate-500">{t('ratingPage.ratingsCount', { count: summary.count || 0 })}</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* School Rating Section — 5-indicator form (CP-020) */}
      {school ? (
        <>
          <Card className="bg-p-honey-500 rounded-2xl p-6 md:p-8 shadow-xl border-0">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">{t('schoolRatingPage.title')}</h2>
            <p className="text-white/90 text-sm md:text-base">{t('schoolRatingPage.subtitle')}</p>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 space-y-6">
              {/* School header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-p-honey-100 text-p-honey-700 font-black flex items-center justify-center text-xl">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-p-honey-700 uppercase tracking-wide">
                      {t('schoolRatingPage.yourSchool')}
                    </p>
                    <h2 className="text-xl font-bold text-slate-900">{school.name}</h2>
                    {school.address && <p className="text-sm text-slate-500">{school.address}</p>}
                  </div>
                </div>
                <div className="flex flex-col items-end text-right">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {t('schoolRatingPage.average')}
                  </p>
                  <div className="flex items-center gap-1 text-p-honey-700 font-bold text-xl">
                    <Star className="w-5 h-5 fill-p-honey-500 text-p-honey-500" />
                    {schoolSummary.average?.toFixed(1) || '0.0'}
                  </div>
                  <span className="text-xs text-slate-500">
                    {t('schoolRatingPage.ratingsCount', { count: schoolSummary.count || 0 })}
                  </span>
                </div>
              </div>

              {/* 5-indicator sliders — PL-015 GATE: labels are placeholders */}
              <div className="space-y-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <BarChart3 className="w-4 h-4 text-p-honey-700" />
                  {t('schoolRatingPage.indicatorsLabel', { defaultValue: "Ko'rsatkichlar bo'yicha baho" })}
                </div>
                {PARENT_INDICATORS.map((ind) => (
                  <div key={ind.key} className="space-y-1" data-testid={`indicator-row-${ind.key}`}>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700">
                        {ind[i18n.language] || ind.en}
                      </label>
                      <span
                        className="text-sm font-bold text-p-honey-700 min-w-[3rem] text-right"
                        data-testid={`score-${ind.key}`}
                      >
                        {schoolIndicators[ind.key]} / 5
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="1"
                      value={schoolIndicators[ind.key]}
                      onChange={(e) =>
                        setSchoolIndicators((prev) => ({ ...prev, [ind.key]: Number(e.target.value) }))
                      }
                      className="w-full accent-p-honey-700 cursor-pointer"
                      data-testid={`slider-${ind.key}`}
                      aria-label={ind[i18n.language] || ind.en}
                    />
                    <div className="flex justify-between text-xs text-slate-400 px-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span key={n}>{n}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Mandatory comment */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-slate-700">{t('schoolRatingPage.commentLabel')}</p>
                  <span className="text-xs font-medium text-error-500">
                    * {t('schoolRatingPage.required', { defaultValue: 'Majburiy' })}
                  </span>
                </div>
                <textarea
                  value={schoolComment}
                  onChange={(e) => setSchoolComment(e.target.value)}
                  rows={4}
                  required
                  placeholder={t('schoolRatingPage.commentPlaceholder')}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-p-honey-500 focus:border-transparent"
                  data-testid="school-comment"
                />
              </div>

              {/* Submit */}
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  {schoolRating?.updatedAt &&
                    t('schoolRatingPage.lastUpdated', {
                      date: new Date(schoolRating.updatedAt).toLocaleString(locale),
                    })}
                </div>
                <button
                  type="button"
                  onClick={handleSchoolSubmit}
                  disabled={savingSchool}
                  data-testid="school-submit"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-p-honey-500 text-white font-semibold hover:bg-p-honey-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {savingSchool && <LoadingSpinner size="sm" />}
                  {schoolRating ? t('schoolRatingPage.update') : t('schoolRatingPage.submit')}
                </button>
              </div>
            </Card>

            {/* Sidebar */}
            <div className="space-y-4">
              <Card className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-p-honey-100 text-p-honey-700">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{t('schoolRatingPage.yourRating')}</p>
                </div>

                {schoolRating?.indicators ? (
                  <div className="space-y-2 pt-1">
                    {PARENT_INDICATORS.map((ind) => (
                      <div key={ind.key} className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 truncate max-w-[70%]">{ind[i18n.language] || ind.en}</span>
                        <span className="font-semibold text-p-honey-700">
                          {schoolRating.indicators[ind.key] ?? '—'} / 5
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">{t('schoolRatingPage.noComment')}</p>
                )}

                {schoolRating?.comment && (
                  <div className="text-sm text-slate-600 pt-2 border-t border-slate-200">
                    {`"${schoolRating.comment}"`}
                  </div>
                )}
              </Card>

              <Card className="space-y-3">
                <p className="text-sm font-semibold text-slate-900">{t('schoolRatingPage.summaryTitle')}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-p-honey-500 fill-p-honey-500" />
                    <div>
                      <p className="text-xl font-bold text-slate-900">{schoolSummary.average?.toFixed(1) || '0.0'}</p>
                      <p className="text-xs text-slate-500">{t('schoolRatingPage.average')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-slate-900">{schoolSummary.count || 0}</p>
                    <p className="text-xs text-slate-500">
                      {t('schoolRatingPage.ratingsCount', { count: schoolSummary.count || 0 })}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </>
      ) : (
        <Card className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-p-honey-100 text-p-honey-700">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t('schoolRatingPage.title')}</h2>
            <p className="text-slate-600">{t('schoolRatingPage.noSchool')}</p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default TeacherRating;
