import { Calendar, CheckCircle2, User, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ActivityDetailsModal = ({ activity, locale, onClose }) => {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
        <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-400 p-6 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-white">
            {activity.skill || t('activitiesPage.formSkill') || 'Ko\'nikma'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors backdrop-blur-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Goal */}
          {activity.goal && (
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-5 border border-blue-200">
              <p className="text-sm font-bold text-blue-700 mb-2">{t('activitiesPage.formGoal') || 'Maqsad'}</p>
              <p className="text-base text-gray-800 leading-relaxed">{activity.goal}</p>
            </div>
          )}

          {/* Dates and Teacher */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {activity.startDate && (
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-blue-600 font-semibold mb-1">{t('activitiesPage.formStartDate') || 'Boshlanish'}</p>
                  <p className="text-sm font-bold text-gray-900">
                    {new Date(activity.startDate).toLocaleDateString(locale)}
                  </p>
                </div>
              </div>
            )}
            {activity.endDate && (
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-blue-600 font-semibold mb-1">{t('activitiesPage.formEndDate') || 'Tugash'}</p>
                  <p className="text-sm font-bold text-gray-900">
                    {new Date(activity.endDate).toLocaleDateString(locale)}
                  </p>
                </div>
              </div>
            )}
            {activity.teacher && (
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg border border-blue-200">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 font-semibold mb-1">{t('activitiesPage.teacher') || 'O\'qituvchi'}</p>
                  <p className="text-sm font-bold text-gray-900 truncate">{activity.teacher}</p>
                </div>
              </div>
            )}
          </div>

          {/* Tasks */}
          {activity.tasks && Array.isArray(activity.tasks) && activity.tasks.length > 0 && (
            <div className="bg-white rounded-xl p-5 shadow-md border border-gray-200">
              <p className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-500" />
                {t('activitiesPage.formTasks') || 'Vazifalar'}
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
                {activity.tasks.map((task, idx) => task && (
                  <li key={idx} className="leading-relaxed">{task}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Methods */}
          {activity.methods && (
            <div className="bg-white rounded-xl p-5 shadow-md border border-gray-200">
              <p className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-500" />
                {t('activitiesPage.formMethods') || 'Usullar'}
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">{activity.methods}</p>
            </div>
          )}

          {/* Progress */}
          {activity.progress && (
            <div className="bg-white rounded-xl p-5 shadow-md border border-gray-200">
              <p className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-500" />
                {t('activitiesPage.formProgress') || 'Jarayon/Taraqqiyot'}
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">{activity.progress}</p>
            </div>
          )}

          {/* Observation */}
          {activity.observation && (
            <div className="bg-white rounded-xl p-5 shadow-md border border-gray-200">
              <p className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-500" />
                {t('activitiesPage.formObservation') || 'Kuzatish'}
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">{activity.observation}</p>
            </div>
          )}

          {/* Services */}
          {activity.services && Array.isArray(activity.services) && activity.services.length > 0 && (
            <div className="bg-white rounded-xl p-5 shadow-md border border-gray-200">
              <p className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-500" />
                {t('activitiesPage.formServices') || 'Xizmatlar'}
              </p>
              <div className="flex flex-wrap gap-2">
                {activity.services.map((service, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 rounded-lg text-xs font-semibold border border-blue-200/50"
                  >
                    {t(`activitiesPage.services.${service.replace(/\s+/g, '')}`) || service}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors shadow-md"
            >
              {t('activitiesPage.close') || 'Yopish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityDetailsModal;
