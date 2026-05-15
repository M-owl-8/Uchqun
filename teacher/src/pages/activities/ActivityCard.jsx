import { Calendar, Edit2, Trash2, User, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ActivityCard = ({ activity, isTeacher, locale, onEdit, onDelete, onDetails }) => {
  const { t } = useTranslation();
  return (
    <div
      className="bg-white rounded-2xl shadow-lg border border-gray-200 hover:shadow-2xl transition-all duration-300 overflow-hidden group"
    >
      {/* Card Header */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-400 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">
              {activity.skill || t('activitiesPage.formSkill') || 'Ko\'nikma'}
            </h3>
            {activity.goal && (
              <p className="text-sm text-primary-50 line-clamp-2">
                {activity.goal.length > 80 ? `${activity.goal.substring(0, 80)}...` : activity.goal}
              </p>
            )}
          </div>
          {isTeacher && (
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(activity); }}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors backdrop-blur-sm"
                title={t('activitiesPage.edit') || 'Tahrirlash'}
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(activity.id); }}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors backdrop-blur-sm"
                title={t('activitiesPage.delete') || 'O\'chirish'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 space-y-4">
        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          {activity.startDate && (
            <div className="flex items-center gap-2 p-3 bg-primary-50 rounded-xl border border-primary-100">
              <Calendar className="w-4 h-4 text-primary-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-primary-600 font-semibold mb-0.5">{t('activitiesPage.formStartDate') || 'Boshlanish'}</p>
                <p className="text-sm font-bold text-gray-900 truncate">
                  {new Date(activity.startDate).toLocaleDateString(locale)}
                </p>
              </div>
            </div>
          )}
          {activity.endDate && (
            <div className="flex items-center gap-2 p-3 bg-primary-50 rounded-xl border border-primary-100">
              <Calendar className="w-4 h-4 text-primary-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-primary-600 font-semibold mb-0.5">{t('activitiesPage.formEndDate') || 'Tugash'}</p>
                <p className="text-sm font-bold text-gray-900 truncate">
                  {new Date(activity.endDate).toLocaleDateString(locale)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Teacher */}
        {activity.teacher && (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
            <div className="p-2 bg-gradient-to-br from-primary-100 to-primary-50 rounded-lg border border-primary-200">
              <User className="w-5 h-5 text-primary-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 font-semibold mb-0.5">{t('activitiesPage.teacher') || 'O\'qituvchi'}</p>
              <p className="text-sm font-bold text-gray-900 truncate">{activity.teacher}</p>
            </div>
          </div>
        )}

        {/* Services */}
        {activity.services && Array.isArray(activity.services) && activity.services.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">{t('activitiesPage.formServices') || 'Xizmatlar'}</p>
            <div className="flex flex-wrap gap-2">
              {activity.services.slice(0, 3).map((service, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 bg-gradient-to-r from-primary-100 to-primary-50 text-primary-700 rounded-lg text-xs font-semibold border border-primary-200/50"
                >
                  {t(`activitiesPage.services.${service.replace(/\s+/g, '')}`) || service}
                </span>
              ))}
              {activity.services.length > 3 && (
                <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold border border-gray-200">
                  +{activity.services.length - 3}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Details Button */}
        <button
          onClick={() => onDetails(activity)}
          className="w-full flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-primary-500 to-primary-400 hover:from-primary-600 hover:to-primary-500 rounded-xl text-white transition-all duration-200 font-semibold text-sm shadow-md hover:shadow-lg"
        >
          <ChevronDown className="w-4 h-4" />
          {t('activitiesPage.showDetails') || 'Batafsil'}
        </button>
      </div>
    </div>
  );
};

export default ActivityCard;
