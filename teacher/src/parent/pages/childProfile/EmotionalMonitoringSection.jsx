import { Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const EMOTIONAL_KEYS = [
  'stable', 'positiveEmotions', 'noAnxiety', 'noHostility',
  'calmResponse', 'showsEmpathy', 'quickRecovery', 'stableMood', 'trustingRelationship',
];

const EmotionalMonitoringSection = ({ records }) => {
  const { t, i18n } = useTranslation();

  if (!records || records.length === 0) return null;

  return (
    <section className="bg-surface rounded-[2rem] p-8 shadow-sm border border-slate-100">
      <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
        <Heart className="w-6 h-6 text-pink-600" />
        {t('profile.monitoringJournal', { defaultValue: 'Monitoring Journal' })}
      </h3>
      <div className="space-y-4">
        {records.slice(0, 5).map((record) => {
          const emotionalState = record.emotionalState || {};
          const checkedCount = Object.values(emotionalState).filter(Boolean).length;
          const totalCount = Object.keys(emotionalState).length;
          const percentage = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

          return (
            <div key={record.id} className="border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-semibold text-slate-900">
                    {new Date(record.date).toLocaleDateString(i18n.language, {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </p>
                  {record.teacher && (
                    <p className="text-sm text-slate-500 mt-1">
                      {t('childProfile.teacher', { defaultValue: 'Teacher' })}: {record.teacher.firstName} {record.teacher.lastName}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-brand-600">{percentage}%</div>
                  <div className="text-xs text-slate-500">{checkedCount} / {totalCount}</div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {EMOTIONAL_KEYS.map((key) =>
                  emotionalState[key] ? (
                    <div key={key} className="flex items-center gap-2 text-sm text-slate-700">
                      <div className="w-2 h-2 rounded-full bg-success-500" />
                      <span>{t(`child.emotionalCriteria.${key}`)}</span>
                    </div>
                  ) : null
                )}
              </div>

              {record.notes && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-sm font-medium text-slate-700 mb-1">
                    {t('child.emotionalCriteria.notes')}
                  </p>
                  <p className="text-sm text-slate-600">{record.notes}</p>
                </div>
              )}
              {record.teacherSignature && (
                <div className="mt-2 text-xs text-slate-500">Имзо: {record.teacherSignature}</div>
              )}
            </div>
          );
        })}
      </div>
      {records.length > 5 && (
        <p className="text-sm text-slate-500 mt-4 text-center">
          +{records.length - 5} та яна жумла
        </p>
      )}
    </section>
  );
};

export default EmotionalMonitoringSection;
