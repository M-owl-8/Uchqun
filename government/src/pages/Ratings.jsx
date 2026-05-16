import { useEffect, useState } from 'react';
import api from '../services/api';
import * as cache from '../../../shared/utils/cache';
import Card from '@shared/components/Card';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import { Star, Building2, Search, ChevronDown, ChevronUp, MessageSquare, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// TODO(phase-1): star rating color palette — 5=green, 4=blue, 3=yellow, 2=orange, 1=red are semantic data-visualization colors for distribution bars; confirm whether blue-500 for 4-star should stay or use a different token
const STAR_COLORS = {
  5: 'bg-green-500',
  4: 'bg-blue-500',
  3: 'bg-yellow-500',
  2: 'bg-orange-500',
  1: 'bg-red-500',
};

const StarDisplay = ({ rating, size = 'sm' }) => {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${iconSize} ${
            i <= fullStars
              ? 'fill-yellow-400 text-yellow-400'
              : i === fullStars + 1 && hasHalf
                ? 'fill-yellow-400/50 text-yellow-400'
                : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );
};

const DistributionBar = ({ distribution, total }) => {
  if (total === 0) return null;

  return (
    <div className="space-y-1">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = distribution[star] || 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={star} className="flex items-center gap-2 text-xs">
            <span className="w-3 text-gray-600">{star}</span>
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${STAR_COLORS[star]}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-6 text-right text-gray-500">{count}</span>
          </div>
        );
      })}
    </div>
  );
};

const SchoolCard = ({ school }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadReviews = async (pageNum = 1) => {
    try {
      setReviewsLoading(true);
      const res = await api.get(`/government/ratings/${school.id}`, {
        params: { page: pageNum, limit: 10 },
      });
      const data = res.data?.data || {};
      if (pageNum === 1) {
        setReviews(data.ratings || []);
      } else {
        setReviews((prev) => [...prev, ...(data.ratings || [])]);
      }
      setTotalPages(data.totalPages || 1);
      setPage(pageNum);
      setReviewsLoaded(true);
    } catch (error) { /* swallowed: surface to UI when toast hook is available */ void error; } finally {
      setReviewsLoading(false);
    }
  };

  const handleToggle = () => {
    if (!expanded && !reviewsLoaded) {
      loadReviews(1);
    }
    setExpanded(!expanded);
  };

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          {/* Rank Badge */}
          <div className="flex-shrink-0">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg ${
              school.rank === 1 
                ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-400' 
                : school.rank === 2 
                ? 'bg-gray-100 text-gray-700 border-2 border-gray-400'
                : school.rank === 3
                ? 'bg-orange-100 text-orange-700 border-2 border-orange-400'
                : 'bg-brand-100 text-brand-600'
            }`}>
              {school.rank || '—'}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-brand-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{school.name}</h3>
              {school.address && (
                <p className="text-sm text-gray-500 mt-0.5">{school.address}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <StarDisplay rating={school.averageRating || 0} />
        <span className="text-lg font-bold text-gray-900">
          {(school.averageRating || 0).toFixed(1)}
        </span>
        <span className="text-sm text-gray-500">
          ({school.ratingsCount || 0} {t('ratings.ratingsCount')})
        </span>
      </div>

      {school.ratingsCount > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 mb-2">{t('ratings.distribution')}</p>
          <DistributionBar distribution={school.distribution} total={school.ratingsCount} />
        </div>
      )}

      {school.ratingsCount > 0 && (
        <button
          onClick={handleToggle}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              {t('ratings.hideReviews')}
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              {t('ratings.showReviews')}
            </>
          )}
        </button>
      )}

      {expanded && (
        <div className="mt-4 space-y-3 border-t pt-4">
          {reviewsLoading && reviews.length === 0 ? (
            <div className="flex justify-center py-4">
              <LoadingSpinner size="sm" />
            </div>
          ) : reviews.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-2">{t('ratings.notFound')}</p>
          ) : (
            <>
              {reviews.map((review) => (
                <div key={review.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-brand-100 rounded-full flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-brand-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {review.parentName || t('ratings.unknown')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {review.score !== null && (
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-semibold text-gray-700">{review.score.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {review.comment ? (
                    <div className="flex items-start gap-1.5 mt-1">
                      <MessageSquare className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-gray-600">{review.comment}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">{t('ratings.noComment')}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
              {page < totalPages && (
                <button
                  onClick={() => loadReviews(page + 1)}
                  disabled={reviewsLoading}
                  className="w-full py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  {reviewsLoading ? <LoadingSpinner size="sm" /> : t('ratings.showReviews')}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  );
};

const RATINGS_CACHE_KEY = 'government:ratings';

const Ratings = () => {
  const { t } = useTranslation();
  const [schools, setSchools] = useState(() => cache.get(RATINGS_CACHE_KEY)?.schools ?? []);
  const [stats, setStats] = useState(() => cache.get(RATINGS_CACHE_KEY)?.stats ?? { total: 0, average: 0 });
  const [loading, setLoading] = useState(!cache.get(RATINGS_CACHE_KEY));
  const [search, setSearch] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchFresh = () => api.get('/government/ratings', { signal })
      .then(res => {
        const data = res.data?.data || {};
        const result = { schools: data.schools || [], stats: { total: data.total || 0, average: data.average || 0 } };
        cache.set(RATINGS_CACHE_KEY, result);
        setSchools(result.schools);
        setStats(result.stats);
      });

    const cached = cache.get(RATINGS_CACHE_KEY);
    if (cached) {
      setSchools(cached.schools);
      setStats(cached.stats);
      setLoading(false);
      fetchFresh().catch(() => {});
      return () => controller.abort();
    }

    fetchFresh()
      .catch(() => setSchools([]))
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  // Filter and sort schools by rating (highest first), then add rank
  const filteredSchools = schools
    .filter((school) =>
      school.name.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      // Sort by average rating (descending), then by ratings count (descending)
      const ratingA = a.averageRating || 0;
      const ratingB = b.averageRating || 0;
      if (ratingB !== ratingA) {
        return ratingB - ratingA;
      }
      // If ratings are equal, sort by count
      return (b.ratingsCount || 0) - (a.ratingsCount || 0);
    })
    .map((school, index) => ({
      ...school,
      rank: index + 1, // Add rank (1, 2, 3, ...)
    }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('ratings.title')}</h1>
        <p className="text-gray-600">{t('ratings.subtitle')}</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6">
          <p className="text-sm text-gray-600 mb-1">{t('ratings.totalRatings')}</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-600 mb-1">{t('ratings.schoolsCount')}</p>
          <p className="text-2xl font-bold text-gray-900">{schools.length}</p>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder={t('ratings.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>

      {/* School list */}
      {filteredSchools.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">{t('ratings.notFound')}</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredSchools.map((school) => (
            <SchoolCard key={school.id} school={school} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Ratings;
