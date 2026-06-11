import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useFetch } from '@shared/hooks/useFetch';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import StarRating from '@shared/components/StarRating';
import { useToast } from '@shared/context/ToastContext';
import {
  Building2, ChevronRight, Star, Users, UserCheck, FileText,
  ClipboardCheck, ShieldAlert, ClipboardList, Mail, Phone,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { GOV_INDICATORS, containsFillerIndicators } from '@shared/config/ratingIndicators';

// StarRating moved to @shared/components/StarRating (extracted 2026-06-07
// so parent + gov + any future portal can share one rater implementation
// instead of inlining the radio + svg pattern in each file).

// ── helpers ──────────────────────────────────────────────────────────────────

function lastFourQuarters() {
  const today = new Date();
  const year = today.getFullYear();
  const q = Math.ceil((today.getMonth() + 1) / 3);
  const result = [];
  let curQ = q; let curY = year;
  for (let i = 0; i < 4; i++) {
    result.push(`Q${curQ}-${curY}`);
    curQ--; if (curQ < 1) { curQ = 4; curY--; }
  }
  return result;
}
const QUARTERS = lastFourQuarters();
const DEFAULT_INDICATORS = Object.fromEntries(GOV_INDICATORS.map(ind => [ind.key, 3]));

// ── GovRatingForm ─────────────────────────────────────────────────────────────

const GovRatingForm = ({ schoolId, onSuccess }) => {
  const { t } = useTranslation();
  const { success: showSuccess, error: showError } = useToast();
  const [period, setPeriod] = useState(QUARTERS[0]);
  const [indicators, setIndicators] = useState(DEFAULT_INDICATORS);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [existing, setExisting] = useState(null);
  const [loadingExisting, setLoadingExisting] = useState(false);

  const loadExisting = useCallback(async (p) => {
    setLoadingExisting(true);
    try {
      const res = await api.get(`/government/schools/${schoolId}/ratings/gov`, { params: { period: p } });
      const ratings = res.data?.data?.ratings || [];
      if (ratings.length > 0) {
        const r = ratings[0];
        setExisting(r);
        setIndicators({ ...DEFAULT_INDICATORS, ...r.indicators });
        setComment(r.comment || '');
      } else {
        setExisting(null); setIndicators(DEFAULT_INDICATORS); setComment('');
      }
    } catch { setExisting(null); }
    finally { setLoadingExisting(false); }
  }, [schoolId]);

  useEffect(() => { loadExisting(period); }, [loadExisting, period]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      showError(t('govRating.commentRequired', { defaultValue: "Izoh majburiy" })); return;
    }
    setSubmitting(true);
    try {
      await api.post(`/government/schools/${schoolId}/rate`, { period, indicators, comment: comment.trim() });
      showSuccess(t('govRating.success', { defaultValue: "Baho muvaffaqiyatli saqlandi" }));
      await loadExisting(period); onSuccess?.();
    } catch (err) {
      const code = err?.response?.data?.error;
      const errorMap = {
        RATING_COMMENT_REQUIRED: t('govRating.commentRequired', { defaultValue: "Izoh majburiy" }),
        RATING_PERIOD_INVALID: t('govRating.periodInvalid', { defaultValue: "Noto'g'ri davr formati" }),
        RATING_INDICATORS_REQUIRED: t('govRating.indicatorsRequired', { defaultValue: "Barcha ko'rsatkichlar kerak" }),
        RATING_INDICATOR_INVALID: t('govRating.indicatorInvalid', { defaultValue: "Ko'rsatkich 1-5 oralig'ida bo'lishi kerak" }),
        RATING_SCHOOL_NOT_FOUND: t('govRating.schoolNotFound', { defaultValue: "Muassasa topilmadi" }),
      };
      showError(errorMap[code] ?? err.response?.data?.error?.detail ?? t('govRating.failed', { defaultValue: "Xato yuz berdi" }));
    } finally { setSubmitting(false); }
  };

  // PL-015 ship gate (Q3): never render the rating form over positional filler labels.
  if (containsFillerIndicators(GOV_INDICATORS)) return null;

  return (
    <div className="bg-paper-card border border-brand-200 rounded-lg">
      <div className="px-5 py-4 border-b border-brand-100 flex items-center gap-2">
        <ClipboardCheck className="w-4 h-4 text-brand-600" />
        <h2 className="text-sm font-semibold text-gray-900">
          {existing ? t('govRating.editTitle', { defaultValue: "Davlat bahosini tahrirlash" }) : t('govRating.addTitle', { defaultValue: "Davlat bahosi qo'shish" })}
        </h2>
      </div>
      <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t('govRating.period', { defaultValue: "Chorak (davr)" })} <span className="text-red-500">*</span>
          </label>
          <select value={period} onChange={e => { setPeriod(e.target.value); }}
            className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent">
            {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
          </select>
          {loadingExisting && <p className="text-xs text-gray-400 mt-1">{t('govRating.checking', { defaultValue: "Mavjud baho tekshirilmoqda..." })}</p>}
          {existing && !loadingExisting && (
            <p className="text-xs text-brand-600 mt-1">{t('govRating.existingFound', { defaultValue: "Ushbu davr uchun baho topildi — tahrirlashingiz mumkin" })}</p>
          )}
        </div>
        <div className="space-y-4">
          <p className="text-xs font-medium text-gray-700">{t('govRating.indicators', { defaultValue: "Ko'rsatkichlar (1–5)" })}</p>
          {GOV_INDICATORS.map((ind) => (
            <div key={ind.key} className="flex items-center gap-3">
              <span className="text-xs text-gray-600 w-28 flex-shrink-0">{ind.uz}</span>
              <StarRating
                value={indicators[ind.key]}
                onChange={(v) => setIndicators(prev => ({ ...prev, [ind.key]: v }))}
                name={ind.uz}
                disabled={submitting}
              />
              <span
                className="text-sm font-semibold tabular-nums w-8 text-right text-brand-700"
                aria-hidden="true"
              >
                {indicators[ind.key]}/5
              </span>
            </div>
          ))}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t('govRating.comment', { defaultValue: "Izoh" })} <span className="text-red-500">*</span>
          </label>
          <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} required
            placeholder={t('govRating.commentPlaceholder', { defaultValue: "Muassasaning ushbu davrdagi faoliyati haqida izoh yozing..." })}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none" />
        </div>
        <button type="submit" disabled={submitting}
          className="w-full py-2.5 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-2">
          {submitting ? <LoadingSpinner size="sm" /> : null}
          {existing ? t('govRating.updateBtn', { defaultValue: "Bahoni yangilash" }) : t('govRating.submitBtn', { defaultValue: "Baho yuborish" })}
        </button>
      </form>
    </div>
  );
};

// ── Tab: Overview ─────────────────────────────────────────────────────────────

const OverviewTab = ({ school, canRate, onRefresh }) => {
  const { t } = useTranslation();
  const { id } = useParams();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-5">
        <div className="bg-paper-card border border-gray-200 rounded-lg">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">{t('schoolDetail.overview', { defaultValue: "Umumiy ma'lumot" })}</h2>
          </div>
          <div className="px-5 py-4 grid grid-cols-2 gap-x-8 gap-y-4">
            {[
              { label: t('schoolDetail.type', { defaultValue: 'Tur' }), value: (() => {
                const typeMap = {
                  daycare: t('schools.typeDaycare', { defaultValue: 'Kunduzgi parvarish' }),
                  early_preschool: t('schools.typeEarlyPreschool', { defaultValue: 'Yangi kun' }),
                  support: t('schools.typeSupport', { defaultValue: 'Madad' }),
                  early_intervention: t('schools.typeEarlyIntervention', { defaultValue: 'Erta aralashuv' }),
                  home_care: t('schools.typeHomeCare', { defaultValue: 'Uyda qarab turish' }),
                };
                return typeMap[school.type] || school.type || '—';
              })() },
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
        {canRate && <GovRatingForm schoolId={id} onSuccess={onRefresh} />}
      </div>
      <div className="space-y-5">
        <div className="bg-paper-card border border-gray-200 rounded-lg">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">{t('schoolDetail.stats', { defaultValue: 'Statistika' })}</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {[
              { icon: Users,     label: t('schoolDetail.students', { defaultValue: "O'quvchilar" }), value: school.studentsCount || 0 },
              { icon: UserCheck, label: t('schoolDetail.teachers', { defaultValue: "Tarbiyachilar" }), value: school.teachersCount || 0 },
              { icon: FileText,  label: t('schoolDetail.ratings',  { defaultValue: 'Baholar' }),       value: school.ratingsCount || 0 },
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
        <div className="bg-paper-card border border-gray-200 rounded-lg">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">{t('schoolDetail.rating', { defaultValue: 'Reyting' })}</h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            {/* Cumulative headline */}
            <div className="text-center pb-2 border-b border-gray-100">
              {(school.cumulativeAvg != null) ? (
                <>
                  <p className="text-4xl font-bold tabular-nums text-inkGreen-900">{school.cumulativeAvg.toFixed(1)}</p>
                  <div className="flex justify-center gap-0.5 my-1">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(school.cumulativeAvg) ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">{t('schoolDetail.cumulativeRating', { defaultValue: 'Umumiy reyting' })}</p>
                  {school.cumulativeIsPartial && (
                    <p className="text-xs text-amber-600 mt-0.5">
                      {school.parentAvg != null && school.govAvg == null
                        ? t('ratings.parentOnly', { defaultValue: 'Faqat ota-onalar bahosi' })
                        : t('ratings.govOnly', { defaultValue: 'Faqat davlat bahosi' })}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-400 italic py-2">{t('ratings.noRating', { defaultValue: "Reyting yo'q" })}</p>
              )}
            </div>
            {/* Parent row */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">{t('schoolDetail.parentRating', { defaultValue: 'Ota-onalar' })}</span>
              {(school.parentAvg != null) ? (
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold text-gray-900">{school.parentAvg.toFixed(1)}</span>
                  <span className="text-xs text-gray-400">({school.parentCount || school.ratingsCount || 0})</span>
                </div>
              ) : (
                <span className="text-xs text-gray-400 italic">{t('ratings.noRating', { defaultValue: "Yo'q" })}</span>
              )}
            </div>
            {/* Government row */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">{t('schoolDetail.govRating', { defaultValue: 'Davlat' })}</span>
              {(school.govAvg != null) ? (
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold text-gray-900">{school.govAvg.toFixed(1)}</span>
                  {school.govPeriod && <span className="text-xs text-gray-400">{school.govPeriod}</span>}
                </div>
              ) : (
                <span className="text-xs text-gray-400 italic">{t('ratings.noRating', { defaultValue: "Yo'q" })}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Tab: Teachers ─────────────────────────────────────────────────────────────

const TeachersTab = ({ schoolId }) => {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true); setError(false);
    api.get('/government/teachers', { params: { schoolId, limit: 200 } })
      .then(res => setData(res.data?.data || {}))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [schoolId]);

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>;
  if (error) return <div className="py-16 text-center text-sm text-red-500">{t('common.error', { defaultValue: 'Xatolik yuz berdi' })}</div>;

  const teachers = data?.teachers || [];
  return (
    <div className="bg-paper-card border border-gray-200 rounded-lg overflow-hidden">
      {teachers.length === 0 ? (
        <div className="py-16 text-center">
          <UserCheck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">{t('schoolDetail.noTeachers', { defaultValue: "Bu maktabda hali o'qituvchilar yo'q" })}</p>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-100 bg-paper-deep">
              <th className="text-left px-5 py-3 font-medium">#</th>
              <th className="text-left px-5 py-3 font-medium">{t('colName', { defaultValue: 'Ism' })}</th>
              <th className="text-left px-5 py-3 font-medium hidden sm:table-cell">{t('colEmail', { defaultValue: 'Email' })}</th>
              <th className="text-left px-5 py-3 font-medium hidden md:table-cell">{t('colPhone', { defaultValue: 'Telefon' })}</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((teacher, i) => (
              <tr key={teacher.id} className="border-b border-gray-50 last:border-0 hover:bg-brand-50 transition-colors">
                <td className="px-5 py-3 text-gray-400 tabular-nums">{i + 1}</td>
                <td className="px-5 py-3 font-medium text-gray-900">{teacher.firstName} {teacher.lastName}</td>
                <td className="px-5 py-3 text-gray-500 hidden sm:table-cell">
                  {teacher.email ? <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{teacher.email}</span> : '—'}
                </td>
                <td className="px-5 py-3 text-gray-500 hidden md:table-cell">
                  {teacher.phone ? <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{teacher.phone}</span> : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {teachers.length > 0 && (
        <div className="px-5 py-3 border-t border-gray-100 bg-paper-deep">
          <p className="text-xs text-gray-400">{t('schoolDetail.totalTeachers', { defaultValue: "Jami o'qituvchilar" })}: <span className="font-semibold">{data?.total ?? teachers.length}</span></p>
        </div>
      )}
    </div>
  );
};

// ── Tab: Students ─────────────────────────────────────────────────────────────

const StudentsTab = ({ schoolId }) => {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true); setError(false);
    api.get('/government/students', { params: { schoolId, limit: 200 } })
      .then(res => setData(res.data?.data || {}))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [schoolId]);

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>;
  if (error) return <div className="py-16 text-center text-sm text-red-500">{t('common.error', { defaultValue: 'Xatolik yuz berdi' })}</div>;

  const students = data?.students || [];
  return (
    <div className="bg-paper-card border border-gray-200 rounded-lg overflow-hidden">
      {students.length === 0 ? (
        <div className="py-16 text-center">
          <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">{t('schoolDetail.noStudents', { defaultValue: "Bu maktabda hali o'quvchilar yo'q" })}</p>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-100 bg-paper-deep">
              <th className="text-left px-5 py-3 font-medium">#</th>
              <th className="text-left px-5 py-3 font-medium">{t('colName', { defaultValue: 'Ism' })}</th>
              <th className="text-left px-5 py-3 font-medium hidden sm:table-cell">{t('studentsPage.dob', { defaultValue: "Tug'ilgan sana" })}</th>
              <th className="text-left px-5 py-3 font-medium hidden sm:table-cell">{t('studentsPage.gender', { defaultValue: 'Jins' })}</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, i) => (
              <tr key={student.id} className="border-b border-gray-50 last:border-0 hover:bg-brand-50 transition-colors">
                <td className="px-5 py-3 text-gray-400 tabular-nums">{i + 1}</td>
                <td className="px-5 py-3 font-medium text-gray-900">{student.firstName} {student.lastName}</td>
                <td className="px-5 py-3 text-gray-500 hidden sm:table-cell">{student.dateOfBirth || '—'}</td>
                <td className="px-5 py-3 text-gray-500 hidden sm:table-cell">{student.gender || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {students.length > 0 && (
        <div className="px-5 py-3 border-t border-gray-100 bg-paper-deep">
          <p className="text-xs text-gray-400">{t('schoolDetail.totalStudents', { defaultValue: "Jami o'quvchilar" })}: <span className="font-semibold">{data?.total ?? students.length}</span></p>
        </div>
      )}
    </div>
  );
};

// ── Tab: Parents ──────────────────────────────────────────────────────────────

const ParentsTab = ({ schoolId }) => {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true); setError(false);
    api.get('/government/parents', { params: { schoolId, limit: 200 } })
      .then(res => setData(res.data?.data || {}))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [schoolId]);

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>;
  if (error) return <div className="py-16 text-center text-sm text-red-500">{t('common.error', { defaultValue: 'Xatolik yuz berdi' })}</div>;

  const parents = data?.parents || [];
  return (
    <div className="bg-paper-card border border-gray-200 rounded-lg overflow-hidden">
      {parents.length === 0 ? (
        <div className="py-16 text-center">
          <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">{t('schoolDetail.noParents', { defaultValue: "Bu maktabda hali ota-onalar yo'q" })}</p>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-100 bg-paper-deep">
              <th className="text-left px-5 py-3 font-medium">#</th>
              <th className="text-left px-5 py-3 font-medium">{t('colName', { defaultValue: 'Ism' })}</th>
              <th className="text-left px-5 py-3 font-medium hidden sm:table-cell">{t('colEmail', { defaultValue: 'Email' })}</th>
              <th className="text-left px-5 py-3 font-medium hidden md:table-cell">{t('colPhone', { defaultValue: 'Telefon' })}</th>
            </tr>
          </thead>
          <tbody>
            {parents.map((parent, i) => (
              <tr key={parent.id} className="border-b border-gray-50 last:border-0 hover:bg-brand-50 transition-colors">
                <td className="px-5 py-3 text-gray-400 tabular-nums">{i + 1}</td>
                <td className="px-5 py-3 font-medium text-gray-900">{parent.firstName} {parent.lastName}</td>
                <td className="px-5 py-3 text-gray-500 hidden sm:table-cell">
                  {parent.email ? <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{parent.email}</span> : '—'}
                </td>
                <td className="px-5 py-3 text-gray-500 hidden md:table-cell">
                  {parent.phone ? <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{parent.phone}</span> : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {parents.length > 0 && (
        <div className="px-5 py-3 border-t border-gray-100 bg-paper-deep">
          <p className="text-xs text-gray-400">{t('schoolDetail.totalParents', { defaultValue: "Jami ota-onalar" })}: <span className="font-semibold">{data?.total ?? parents.length}</span></p>
        </div>
      )}
    </div>
  );
};

// ── Tab: Warnings ─────────────────────────────────────────────────────────────

const WarningsTab = ({ schoolId }) => {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true); setError(false);
    api.get('/ai-warnings', { params: { schoolId, limit: 50 } })
      .then(res => setData(res.data?.data || {}))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [schoolId]);

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>;
  if (error) return <div className="py-16 text-center text-sm text-red-500">{t('common.error', { defaultValue: 'Xatolik yuz berdi' })}</div>;

  const warnings = data?.warnings || [];
  const SEVERITY_COLORS = {
    critical: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="space-y-3">
      {warnings.length === 0 ? (
        <div className="bg-paper-card border border-gray-200 rounded-lg py-16 text-center">
          <ShieldAlert className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">{t('schoolDetail.noWarnings', { defaultValue: "Bu maktab uchun faol ogohlantirishlar yo'q" })}</p>
        </div>
      ) : warnings.map((w) => (
        <div key={w.id} className="bg-paper-card border border-gray-200 rounded-lg px-5 py-4 space-y-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-gray-900">{w.message || w.type}</p>
            <div className="flex items-center gap-2 flex-shrink-0">
              {w.severity && (
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${SEVERITY_COLORS[w.severity] || 'bg-gray-100 text-gray-600'}`}>
                  {t(`warnings.severity.${w.severity}`, { defaultValue: w.severity })}
                </span>
              )}
              {w.isResolved && (
                <span className="text-xs px-2 py-0.5 rounded font-medium bg-green-100 text-green-700">
                  {t('warnings.resolved', { defaultValue: 'Hal qilindi' })}
                </span>
              )}
            </div>
          </div>
          {w.createdAt && <p className="text-xs text-gray-400">{new Date(w.createdAt).toLocaleDateString()}</p>}
        </div>
      ))}
    </div>
  );
};

// ── Tab: Audit ────────────────────────────────────────────────────────────────

const AuditTab = ({ schoolId }) => {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true); setError(false);
    api.get('/government/audit-log', { params: { entityId: schoolId, entity: 'schools', limit: 20 } })
      .then(res => setData(res.data?.data || {}))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [schoolId]);

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>;
  if (error) return <div className="py-16 text-center text-sm text-red-500">{t('common.error', { defaultValue: 'Xatolik yuz berdi' })}</div>;

  const entries = data?.entries || [];
  return (
    <div className="bg-paper-card border border-gray-200 rounded-lg overflow-hidden">
      {entries.length === 0 ? (
        <div className="py-16 text-center">
          <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">{t('schoolDetail.noAudit', { defaultValue: "Bu maktab uchun audit yozuvlari yo'q" })}</p>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-100 bg-paper-deep">
              <th className="text-left px-5 py-3 font-medium">{t('auditLog.actionCol', { defaultValue: 'Harakat' })}</th>
              <th className="text-left px-5 py-3 font-medium hidden sm:table-cell">{t('auditLog.actor', { defaultValue: 'Foydalanuvchi' })}</th>
              <th className="text-left px-5 py-3 font-medium">{t('auditLog.date', { defaultValue: 'Sana' })}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 text-xs text-gray-700">{t(`auditActions.${e.action}`, { defaultValue: e.action })}</td>
                <td className="px-5 py-3 text-gray-500 hidden sm:table-cell">
                  {e.actor ? `${e.actor.firstName || ''} ${e.actor.lastName || ''}`.trim() || e.actor.email : '—'}
                </td>
                <td className="px-5 py-3 text-gray-400 text-xs">{e.createdAt ? new Date(e.createdAt).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// ── Tab bar ───────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',  labelKey: 'schoolDetail.tabOverview',  defaultLabel: "Umumiy ma'lumot" },
  { id: 'teachers',  labelKey: 'schoolDetail.tabTeachers',  defaultLabel: "Tarbiyachilar" },
  { id: 'students',  labelKey: 'schoolDetail.tabStudents',  defaultLabel: "O'quvchilar" },
  { id: 'parents',   labelKey: 'schoolDetail.tabParents',   defaultLabel: 'Ota-onalar' },
  { id: 'warnings',  labelKey: 'schoolDetail.tabWarnings',  defaultLabel: 'Ogohlantirishlar' },
  { id: 'audit',     labelKey: 'schoolDetail.tabAudit',     defaultLabel: 'Audit' },
];

// ── Main component ────────────────────────────────────────────────────────────

const SchoolDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { success: showSuccess, error: showError } = useToast();
  const { hasCapability } = useAuth();

  const { data, loading, error, refresh } = useFetch(`/government/schools/${id}`);

  const [isActiveOverride, setIsActiveOverride] = useState(null);
  const [archiving, setArchiving] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

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
        <p className="text-sm text-gray-500 mb-4">{t('schoolDetail.notFound', { defaultValue: 'Muassasa topilmadi' })}</p>
        <button onClick={() => navigate('/government/schools')} className="text-sm text-brand-600 hover:text-brand-700">
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
      const errPayload = err?.response?.data?.error;
      const code = typeof errPayload === 'object' ? errPayload?.code : errPayload;
      if (code === 'SCHOOL_ALREADY_ARCHIVED') {
        showError(t('schoolDetail.alreadyArchived', { defaultValue: "Maktab allaqachon arxivlangan" }));
      } else if (code === 'SCHOOL_ALREADY_ACTIVE') {
        showError(t('schoolDetail.alreadyActive', { defaultValue: "Maktab allaqachon faol" }));
      } else {
        showError(errPayload?.detail ?? t('schoolDetail.archiveError', { defaultValue: "Xato yuz berdi" }));
      }
    } finally {
      setArchiving(false);
    }
  };

  const canRate = hasCapability('canRateSchools');

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

      {/* Page header + actions */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-inkGreen-900">{school.name}</h1>
          {school.address && <p className="text-sm text-gray-500 mt-0.5">{school.address}</p>}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
            isActive ? 'bg-success-100 text-success-800' : 'bg-gray-100 text-gray-600'
          }`}>
            {isActive ? t('schoolDetail.active', { defaultValue: 'Faol' }) : t('schoolDetail.inactive', { defaultValue: 'Nofaol' })}
          </span>
          {isActive ? (
            <button onClick={() => setArchiveTarget('archive')} disabled={archiving}
              className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50">
              {archiving ? <LoadingSpinner size="xs" /> : t('schoolDetail.archiveSchool', { defaultValue: 'Arxivlash' })}
            </button>
          ) : (
            <button onClick={() => setArchiveTarget('reactivate')} disabled={archiving}
              className="px-3 py-1.5 text-xs font-medium text-brand-600 border border-brand-200 rounded-md hover:bg-brand-50 transition-colors disabled:opacity-50">
              {archiving ? <LoadingSpinner size="xs" /> : t('schoolDetail.reactivateSchool', { defaultValue: 'Qayta faollashtirish' })}
            </button>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200 -mb-0 overflow-x-auto">
        <nav className="flex gap-0 min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t(tab.labelKey, { defaultValue: tab.defaultLabel })}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'overview'  && <OverviewTab school={school} canRate={canRate} onRefresh={() => refresh(true)} />}
        {activeTab === 'teachers'  && <TeachersTab  schoolId={id} />}
        {activeTab === 'students'  && <StudentsTab  schoolId={id} />}
        {activeTab === 'parents'   && <ParentsTab   schoolId={id} />}
        {activeTab === 'warnings'  && <WarningsTab  schoolId={id} />}
        {activeTab === 'audit'     && <AuditTab     schoolId={id} />}
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
