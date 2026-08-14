import { useEffect, useState, useCallback } from 'react';
import { useChild } from '../context/ChildContext';
import api from '../services/api';
import * as cache from '../../../../shared/utils/cache';
import { useSocket } from '../../shared/context/SocketContext';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import ParentPageHeader from '../components/ParentPageHeader';
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  User,
  FileX,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDateMedium } from '@shared/utils/formatDate';

const Activities = () => {
  const { selectedChildId } = useChild();
  const { on, off, connected } = useSocket();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t, i18n } = useTranslation();

  const fetchActivities = useCallback(async (childId, signal) => {
    const key = `parent:activities:${childId}`;
    const cached = cache.get(key);
    if (cached) { setActivities(cached); setLoading(false); return; }
    try {
      const response = await api.get(`/activities?childId=${childId}`, { signal });
      const activitiesData = response.data?.activities || response.data || [];
      const data = Array.isArray(activitiesData) ? activitiesData : [];
      cache.set(key, data);
      setActivities(data);
    } catch (error) {
      if (error.code === 'ERR_CANCELED') return;
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedChildId) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    fetchActivities(selectedChildId, controller.signal);
    return () => controller.abort();
  }, [selectedChildId, fetchActivities]);

  useEffect(() => {
    if (!connected || !selectedChildId) return;
    const bust = () => {
      cache.invalidate(`parent:activities:${selectedChildId}`);
      fetchActivities(selectedChildId);
    };
    const events = ['activity:created', 'activity:updated', 'activity:deleted'];
    events.forEach(ev => on(ev, bust));
    return () => events.forEach(ev => off(ev, bust));
  }, [connected, selectedChildId, on, off, fetchActivities]);

  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const openDetailsModal = (activity) => {
    setSelectedActivity(activity);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedActivity(null);
  };

  if (loading) return <div className="flex justify-center items-center h-96"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="max-w-5xl mx-auto pb-20 animate-in fade-in duration-500">
      <ParentPageHeader
        title={t('activities.title')}
        subtitle={t('activities.subtitle')}
        count={activities.length}
      />

      {/* Activities Cards Grid */}
      {activities.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {activities.map((activity) => {
            return (
              <div
                key={activity.id}
                className="bg-p-surface rounded-2xl shadow-lg border border-p-sepia-200 hover:shadow-2xl transition-all duration-300 overflow-hidden group"
              >
                {/* Card Header */}
                <div className="bg-p-brand-700 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">
                        {activity.skill || t('activities.skill') || 'Ko\'nikma'}
                      </h3>
                      {activity.goal && (
                        <p className="text-sm text-white line-clamp-2">
                          {activity.goal.length > 80 ? `${activity.goal.substring(0, 80)}...` : activity.goal}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-4">
                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-3">
                    {activity.startDate && (
                      <div className="flex items-center gap-2 p-3 bg-p-sepia-50 rounded-xl border border-p-sepia-200">
                        <Calendar className="w-4 h-4 text-p-brand-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-p-brand-600 font-semibold mb-0.5">{t('activities.startDate') || 'Boshlanish'}</p>
                          <p className="text-sm font-bold text-p-sepia-900 truncate">
                            {formatDateMedium(activity.startDate, i18n.language)}
                          </p>
                        </div>
                      </div>
                    )}
                    {activity.endDate && (
                      <div className="flex items-center gap-2 p-3 bg-p-sepia-50 rounded-xl border border-p-sepia-200">
                        <Calendar className="w-4 h-4 text-p-brand-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-p-brand-600 font-semibold mb-0.5">{t('activities.endDate') || 'Tugash'}</p>
                          <p className="text-sm font-bold text-p-sepia-900 truncate">
                            {formatDateMedium(activity.endDate, i18n.language)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Teacher */}
                  {activity.teacher && (
                    <div className="flex items-center gap-3 p-3 bg-p-sepia-50 rounded-xl border border-p-sepia-200">
                      <div className="p-2 bg-p-sepia-50 rounded-lg border border-p-sepia-300">
                        <User className="w-5 h-5 text-p-brand-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-p-sepia-500 font-semibold mb-0.5">{t('activities.teacher') || 'O\'qituvchi'}</p>
                        {/* D-57: "Zebo Ashurova" needs 104px and the card gives 74,
                            so every activity card cut the teacher's name mid-word —
                            at 1440px, not just on a phone. A truncated person's name
                            is worse than a second line. */}
                        <p className="text-sm font-bold text-p-sepia-900 break-words">{activity.teacher}</p>
                      </div>
                    </div>
                  )}

                  {/* Services */}
                  {activity.services && Array.isArray(activity.services) && activity.services.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-p-sepia-600 mb-2">{t('activities.services') || 'Xizmatlar'}</p>
                      <div className="flex flex-wrap gap-2">
                        {activity.services.slice(0, 3).map((service, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 bg-p-sepia-50 text-p-brand-700 rounded-lg text-xs font-semibold border border-p-sepia-300"
                          >
                            {t(`activities.service.${service.replace(/\s+/g, '')}`) || service}
                          </span>
                        ))}
                        {activity.services.length > 3 && (
                          <span className="px-2.5 py-1 bg-p-sepia-100 text-p-sepia-600 rounded-lg text-xs font-semibold border border-p-sepia-200">
                            +{activity.services.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Details Button */}
                  <button
                    onClick={() => openDetailsModal(activity)}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-p-brand-600 hover:bg-p-brand-700 rounded-xl text-white transition-all duration-200 font-semibold text-sm shadow-md hover:shadow-lg"
                  >
                    <ChevronDown className="w-4 h-4" />
                    {t('activities.showDetails') || 'Batafsil'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="text-center py-20 bg-p-surface/95 backdrop-blur-sm">
          <FileX className="w-12 h-12 text-p-sepia-300 mx-auto mb-4" />
          <p className="text-p-sepia-500 font-medium text-lg">{t('activities.empty')}</p>
        </Card>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-p-surface rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
            <div className="sticky top-0 bg-p-brand-700 p-6 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-white">
                {selectedActivity.skill || t('activities.skill') || 'Ko\'nikma'}
              </h2>
              <button
                onClick={closeDetailsModal}
                className="p-2 bg-p-surface/20 hover:bg-p-surface/30 rounded-lg text-white transition-colors backdrop-blur-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Goal */}
              {selectedActivity.goal && (
                <div className="bg-p-sepia-50 rounded-xl p-5 border border-p-sepia-200">
                  <p className="text-sm font-bold text-p-brand-700 mb-2">{t('activities.goal') || 'Maqsad'}</p>
                  <p className="text-base text-p-sepia-800 leading-relaxed">{selectedActivity.goal}</p>
                </div>
              )}

              {/* Dates and Teacher */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {selectedActivity.startDate && (
                  <div className="flex items-center gap-3 p-4 bg-p-sepia-50 rounded-xl border border-p-sepia-200">
                    <Calendar className="w-5 h-5 text-p-brand-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-p-brand-600 font-semibold mb-1">{t('activities.startDate') || 'Boshlanish'}</p>
                      <p className="text-sm font-bold text-p-sepia-900">
                        {formatDateMedium(selectedActivity.startDate, i18n.language)}
                      </p>
                    </div>
                  </div>
                )}
                {selectedActivity.endDate && (
                  <div className="flex items-center gap-3 p-4 bg-p-sepia-50 rounded-xl border border-p-sepia-200">
                    <Calendar className="w-5 h-5 text-p-brand-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-p-brand-600 font-semibold mb-1">{t('activities.endDate') || 'Tugash'}</p>
                      <p className="text-sm font-bold text-p-sepia-900">
                        {formatDateMedium(selectedActivity.endDate, i18n.language)}
                      </p>
                    </div>
                  </div>
                )}
                {selectedActivity.teacher && (
                  <div className="flex items-center gap-3 p-4 bg-p-sepia-50 rounded-xl border border-p-sepia-200">
                    <div className="p-2 bg-p-sepia-50 rounded-lg border border-p-sepia-300">
                      <User className="w-5 h-5 text-p-brand-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-p-sepia-500 font-semibold mb-1">{t('activities.teacher') || 'O\'qituvchi'}</p>
                      <p className="text-sm font-bold text-p-sepia-900 break-words">{selectedActivity.teacher}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Tasks */}
              {selectedActivity.tasks && Array.isArray(selectedActivity.tasks) && selectedActivity.tasks.length > 0 && (
                <div className="bg-p-surface rounded-xl p-5 shadow-md border border-p-sepia-200">
                  <p className="text-base font-bold text-p-sepia-800 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-p-brand-500" />
                    {t('activities.tasks') || 'Vazifalar'}
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm text-p-sepia-700">
                    {selectedActivity.tasks.map((task, idx) => task && (
                      <li key={idx} className="leading-relaxed">{task}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Methods */}
              {selectedActivity.methods && (
                <div className="bg-p-surface rounded-xl p-5 shadow-md border border-p-sepia-200">
                  <p className="text-base font-bold text-p-sepia-800 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-p-brand-500" />
                    {t('activities.methods') || 'Usullar'}
                  </p>
                  <p className="text-sm text-p-sepia-700 leading-relaxed">{selectedActivity.methods}</p>
                </div>
              )}

              {/* Progress */}
              {selectedActivity.progress && (
                <div className="bg-p-surface rounded-xl p-5 shadow-md border border-p-sepia-200">
                  <p className="text-base font-bold text-p-sepia-800 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-p-brand-500" />
                    {t('activities.progress') || 'Jarayon/Taraqqiyot'}
                  </p>
                  <p className="text-sm text-p-sepia-700 leading-relaxed">{selectedActivity.progress}</p>
                </div>
              )}

              {/* Observation */}
              {selectedActivity.observation && (
                <div className="bg-p-surface rounded-xl p-5 shadow-md border border-p-sepia-200">
                  <p className="text-base font-bold text-p-sepia-800 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-p-brand-500" />
                    {t('activities.observation') || 'Kuzatish'}
                  </p>
                  <p className="text-sm text-p-sepia-700 leading-relaxed">{selectedActivity.observation}</p>
                </div>
              )}

              {/* Services */}
              {selectedActivity.services && Array.isArray(selectedActivity.services) && selectedActivity.services.length > 0 && (
                <div className="bg-p-surface rounded-xl p-5 shadow-md border border-p-sepia-200">
                  <p className="text-base font-bold text-p-sepia-800 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-p-brand-500" />
                    {t('activities.services') || 'Xizmatlar'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedActivity.services.map((service, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 bg-p-sepia-50 text-p-brand-700 rounded-lg text-xs font-semibold border border-p-sepia-300"
                      >
                        {t(`activities.service.${service.replace(/\s+/g, '')}`) || service}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Close Button */}
              <div className="flex justify-end pt-4 border-t border-p-sepia-200">
                <button
                  onClick={closeDetailsModal}
                  className="px-6 py-3 bg-p-brand-600 hover:bg-p-brand-700 text-white rounded-xl font-semibold transition-colors shadow-md"
                >
                  {t('activities.close') || 'Yopish'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Activities;
