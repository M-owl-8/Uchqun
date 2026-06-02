import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import * as cache from '../../../shared/utils/cache';
import Card from '@shared/components/Card';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import { Star, Building2, Search, ChevronDown, ChevronUp, MessageSquare, User, Users, Globe, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useRegionName } from '../hooks/useRegionName';

// ── Star display ──────────────────────────────────────────────────────────────
const StarDisplay = ({ rating, size = 'sm' }) => {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${iconSize} ${
          i <= fullStars
            ? 'fill-yellow-400 text-yellow-400'
            : i === fullStars + 1 && hasHalf
              ? 'fill-yellow-400/50 text-yellow-400'
              : 'text-gray-300'
        }`} />
      ))}
    </div>
  );
};

// ── Rating row: label + stars + value (or "Reyting yo'q") ────────────────────
const RatingRow = ({ label, avg, count, period, isPartialNote, badge }) => {
  const { t } = useTranslation();
  const noRating = avg === null || avg === undefined;
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <div className="flex items-center gap-1.5 min-w-0">
        {badge && <span className="text-xs font-semibold text-brand-600 uppercase tracking-wide">{badge}</span>}
        <span className="text-sm text-gray-600 truncate">{label}</span>
        {isPartialNote && !noRating && (
          <span className="text-xs text-amber-600 font-medium">({t('ratings.partial', { defaultValue: "qisman" })})</span>
        )}
      </div>
      {noRating ? (
        <span className="text-xs text-gray-400 italic flex-shrink-0">{t('ratings.noRating', { defaultValue: "Reyting yo'q" })}</span>
      ) : (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <StarDisplay rating={avg} />
          <span className="text-sm font-bold text-gray-900 tabular-nums">{avg.toFixed(1)}</span>
          {count !== undefined && (
            <span className="text-xs text-gray-400">({count})</span>
          )}
          {period && (
            <span className="text-xs text-gray-400 ml-0.5">{period}</span>
          )}
        </div>
      )}
    </div>
  );
};

// ── Distribution bars for parent ratings ─────────────────────────────────────
const DistributionBar = ({ distribution, total }) => {
  if (total === 0) return null;
  return (
    <div className="space-y-1">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = distribution?.[star] || 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={star} className="flex items-center gap-2 text-xs">
            <span className="w-3 text-gray-600">{star}</span>
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
            </div>
            <span className="w-6 text-right text-gray-500">{count}</span>
          </div>
        );
      })}
    </div>
  );
};

// ── Combined school card: all three ratings ────────────────────────────────────
const CombinedSchoolCard = ({ school, showRank }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [govReviews, setGovReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [govReviewsLoading, setGovReviewsLoading] = useState(false);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);
  const [govReviewsLoaded, setGovReviewsLoaded] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsTotalPages, setReviewsTotalPages] = useState(1);
  const [activeSection, setActiveSection] = useState(null);

  const loadParentReviews = async (pageNum = 1) => {
    try {
      setReviewsLoading(true);
      const res = await api.get(`/government/ratings/${school.id}`, { params: { page: pageNum, limit: 10 } });
      const data = res.data?.data || {};
      if (pageNum === 1) setReviews(data.ratings || []);
      else setReviews(prev => [...prev, ...(data.ratings || [])]);
      setReviewsTotalPages(data.totalPages || 1);
      setReviewsPage(pageNum);
      setReviewsLoaded(true);
    } catch { /* silent */ } finally {
      setReviewsLoading(false);
    }
  };

  const loadGovReviews = async () => {
    try {
      setGovReviewsLoading(true);
      const res = await api.get(`/government/schools/${school.id}/ratings/gov`);
      setGovReviews(res.data?.data?.ratings || []);
      setGovReviewsLoaded(true);
    } catch { /* silent */ } finally {
      setGovReviewsLoading(false);
    }
  };

  const toggleSection = (section) => {
    if (activeSection === section) {
      setActiveSection(null);
    } else {
      setActiveSection(section);
      if (section === 'parent' && !reviewsLoaded) loadParentReviews(1);
      if (section === 'gov' && !govReviewsLoaded) loadGovReviews();
    }
  };

  const hasParent = school.parentCount > 0;
  const hasGov = school.govAvg !== null && school.govAvg !== undefined;
  const hasCumulative = school.cumulativeAvg !== null && school.cumulativeAvg !== undefined;

  return (
    <Card className="p-6">
      {/* Header: rank + school name */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          {showRank && (
            <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm bg-white border border-gray-200 text-gray-900 flex-shrink-0">
              {school.rank}
            </div>
          )}
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-brand-600" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 truncate">{school.name}</h3>
              {school.address && <p className="text-xs text-gray-500 truncate">{school.address}</p>}
            </div>
          </div>
        </div>
        {/* Cumulative headline */}
        <div className="flex flex-col items-end flex-shrink-0 ml-3">
          {hasCumulative ? (
            <>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-lg font-bold text-gray-900 tabular-nums">{school.cumulativeAvg.toFixed(1)}</span>
              </div>
              <span className="text-xs text-gray-500">{t('ratings.cumulative', { defaultValue: 'Umumiy' })}</span>
            </>
          ) : (
            <span className="text-xs text-gray-400 italic">{t('ratings.noRating', { defaultValue: "Reyting yo'q" })}</span>
          )}
        </div>
      </div>

      {/* Three-rating breakdown */}
      <div className="border-t border-b border-gray-100 py-2 mb-3 space-y-0">
        <RatingRow
          label={t('ratings.parentRating', { defaultValue: 'Ota-onalar reytingi' })}
          avg={school.parentAvg}
          count={school.parentCount}
        />
        <RatingRow
          label={t('ratings.govRating', { defaultValue: 'Davlat reytingi' })}
          avg={school.govAvg}
          period={school.govPeriod}
        />
        {hasCumulative && school.cumulativeIsPartial && (
          <p className="text-xs text-amber-600 mt-1">
            {school.parentAvg !== null && school.govAvg === null
              ? t('ratings.parentOnly', { defaultValue: "Faqat ota-onalar bahosi asosida" })
              : t('ratings.govOnly', { defaultValue: "Faqat davlat bahosi asosida" })}
          </p>
        )}
      </div>

      {/* Distribution (parent only) */}
      {hasParent && school.distribution && (
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-500 mb-1.5">
            {t('ratings.parentDistribution', { defaultValue: "Ota-onalar taqsimoti" })}
          </p>
          <DistributionBar distribution={school.distribution} total={school.parentCount} />
        </div>
      )}

      {/* Expandable review sections */}
      <div className="space-y-1">
        {hasParent && (
          <button
            onClick={() => toggleSection('parent')}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
          >
            {activeSection === 'parent' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {t('ratings.showParentReviews', { defaultValue: "Ota-onalar izohlarini ko'rsatish" })}
          </button>
        )}
        {hasGov && (
          <button
            onClick={() => toggleSection('gov')}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
          >
            {activeSection === 'gov' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {t('ratings.showGovReviews', { defaultValue: "Davlat baholarini ko'rsatish" })}
          </button>
        )}
      </div>

      {/* Parent reviews */}
      {activeSection === 'parent' && (
        <div className="mt-3 space-y-2 border-t pt-3">
          {reviewsLoading && reviews.length === 0 ? (
            <div className="flex justify-center py-3"><LoadingSpinner size="sm" /></div>
          ) : reviews.length === 0 ? (
            <p className="text-xs text-gray-400 text-center">{t('ratings.notFound')}</p>
          ) : (
            <>
              {reviews.map((review) => (
                <div key={review.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-brand-100 rounded-full flex items-center justify-center">
                        <User className="w-3 h-3 text-brand-600" />
                      </div>
                      <span className="text-xs font-medium text-gray-800">{review.parentName || t('ratings.unknown')}</span>
                    </div>
                    {review.score !== null && (
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs font-semibold text-gray-700">{review.score?.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  {review.comment ? (
                    <div className="flex items-start gap-1 mt-1">
                      <MessageSquare className="w-3 h-3 text-gray-400 mt-0.5" />
                      <p className="text-xs text-gray-600">{review.comment}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">{t('ratings.noComment')}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">{new Date(review.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
              {reviewsPage < reviewsTotalPages && (
                <button
                  onClick={() => loadParentReviews(reviewsPage + 1)}
                  disabled={reviewsLoading}
                  className="w-full py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 rounded-md disabled:opacity-50"
                >
                  {reviewsLoading ? <LoadingSpinner size="sm" /> : t('ratings.loadMore')}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Gov reviews */}
      {activeSection === 'gov' && (
        <div className="mt-3 space-y-2 border-t pt-3">
          {govReviewsLoading ? (
            <div className="flex justify-center py-3"><LoadingSpinner size="sm" /></div>
          ) : govReviews.length === 0 ? (
            <p className="text-xs text-gray-400 text-center">{t('ratings.notFound')}</p>
          ) : (
            govReviews.map((r) => (
              <div key={r.id} className="bg-brand-50/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-brand-100 rounded-full flex items-center justify-center">
                      <Users className="w-3 h-3 text-brand-600" />
                    </div>
                    <span className="text-xs font-medium text-gray-800">{r.govUserName || '—'}</span>
                    {r.govLevel && <span className="text-xs text-gray-400">({r.govLevel})</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs font-semibold text-gray-700">{r.stars}</span>
                    <span className="text-xs text-gray-400 ml-0.5">{r.period}</span>
                  </div>
                </div>
                {r.comment && (
                  <div className="flex items-start gap-1 mt-1">
                    <MessageSquare className="w-3 h-3 text-gray-400 mt-0.5" />
                    <p className="text-xs text-gray-600">{r.comment}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </Card>
  );
};

const COMBINED_CACHE_KEY = 'government:ratings:combined';

const Ratings = () => {
  const { t } = useTranslation();
  const { isRepublic, isRegionAccount } = useAuth();
  const regionName = useRegionName();
  const [schools, setSchools] = useState(() => cache.get(COMBINED_CACHE_KEY)?.schools ?? []);
  const [loading, setLoading] = useState(!cache.get(COMBINED_CACHE_KEY));
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('cumulative');

  const fetchCombined = useCallback((signal) =>
    api.get('/government/ratings', { signal, params: { direction: 'combined' } })
      .then(res => {
        const schools = res.data?.data?.schools || [];
        cache.set(COMBINED_CACHE_KEY, { schools });
        setSchools(schools);
        setLoadError(false);
      }), []);

  useEffect(() => {
    const controller = new AbortController();
    const cached = cache.get(COMBINED_CACHE_KEY);
    if (cached) {
      setSchools(cached.schools);
      setLoading(false);
      fetchCombined(controller.signal).catch(() => {});
      return () => controller.abort();
    }
    setLoading(true);
    fetchCombined(controller.signal)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [fetchCombined]);

  const sortValue = (school) => {
    if (sortBy === 'parent') return school.parentAvg;
    if (sortBy === 'gov') return school.govAvg;
    return school.cumulativeAvg;
  };

  const filteredSchools = schools
    .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const vA = sortValue(a);
      const vB = sortValue(b);
      if (vB === null && vA === null) return 0;
      if (vB === null) return -1;
      if (vA === null) return 1;
      return vB - vA;
    })
    .map((school, idx) => ({ ...school, rank: idx + 1 }));

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><LoadingSpinner size="lg" /></div>;
  }

  if (loadError && schools.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-red-600 mb-3">{t('ratings.loadError', { defaultValue: "Ma'lumotlarni yuklashda xatolik" })}</p>
        <button
          onClick={() => { setLoadError(false); setLoading(true); const c = new AbortController(); fetchCombined(c.signal).finally(() => setLoading(false)); }}
          className="px-4 py-2 text-sm font-medium text-brand-600 border border-brand-200 rounded-md hover:bg-brand-50"
        >
          {t('warnings.retry', { defaultValue: 'Qayta urinish' })}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-inkGreen-900">{t('ratings.title')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {isRegionAccount && regionName
            ? t('ratings.subtitleRegion', { name: regionName, defaultValue: 'Muassasalar reytingi — {{name}}' })
            : t('ratings.subtitle')}
        </p>
        <div className="flex items-center gap-1.5 mt-1" data-testid="scope-label">
          {isRepublic ? (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <Globe className="w-3 h-3" />
              {t('scope.national', { defaultValue: 'All regions' })}
            </span>
          ) : isRegionAccount && regionName ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200">
              <MapPin className="w-3 h-3" />
              {regionName}
            </span>
          ) : null}
        </div>
      </div>

      {/* Controls row: search + sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('ratings.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {t('ratings.sortBy', { defaultValue: 'Saralash:' })}
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            data-testid="sort-select"
          >
            <option value="cumulative">{t('ratings.sortCumulative', { defaultValue: 'Umumiy (asosiy)' })}</option>
            <option value="parent">{t('ratings.sortParent', { defaultValue: "Ota-onalar bo'yicha" })}</option>
            <option value="gov">{t('ratings.sortGov', { defaultValue: "Davlat bo'yicha" })}</option>
          </select>
        </div>
      </div>

      {/* School count */}
      <p className="text-sm text-gray-500">
        {filteredSchools.length} {t('ratings.schoolsCount', { defaultValue: 'muassasa' })}
      </p>

      {/* School cards */}
      {filteredSchools.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              {isRegionAccount && regionName && !search.trim()
                ? t('ratings.notFoundRegion', { name: regionName, defaultValue: '{{name}} da reytinglar yo\'q' })
                : t('ratings.notFound')}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredSchools.map((school) => (
            <CombinedSchoolCard key={school.id} school={school} showRank={!search.trim()} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Ratings;
