import { useRef } from 'react';
import { Save, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const SERVICES = [
  'Logoped',
  'Defektolog',
  'SurdoPedagok',
  'AbA teropiya',
  'Ergoteropiya',
  'Izo',
  'SBO',
  'Musiqa',
  'Ipoteropiya',
  'Umumiy Massaj',
  'GidroVanna',
  'LogoMassaj',
  'CME',
  'Issiq ovqat',
  'Transport xizmati',
];

const ActivityFormModal = ({
  editingActivity,
  formData,
  setFormData,
  isTeacher,
  parents,
  childList,
  onSubmit,
  onClose,
  loadChildrenForParent,
}) => {
  const { t } = useTranslation();
  const taskIdsRef = useRef(formData.tasks.map((_, i) => `task-init-${i}`));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-surface border-b border-slate-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">
            {editingActivity ? t('activitiesPage.editTitle') : t('activitiesPage.createTitle')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          {isTeacher && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('activitiesPage.parent') || 'Ota-ona'}
                </label>
                <select
                  required
                  value={formData.parentId}
                  onChange={(e) => {
                    const selectedParentId = e.target.value;
                    setFormData(prev => ({ ...prev, parentId: selectedParentId, childId: '' }));
                    if (selectedParentId) {
                      loadChildrenForParent(selectedParentId);
                    }
                  }}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                >
                  <option value="">{t('activitiesPage.selectParent') || 'Ota-onani tanlang'}</option>
                  {parents.map(parent => (
                    <option key={parent.id} value={parent.id}>
                      {parent.firstName} {parent.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('activitiesPage.child')}
                </label>
                <select
                  required
                  value={formData.childId}
                  onChange={(e) => setFormData({ ...formData, childId: e.target.value })}
                  disabled={!formData.parentId || childList.length === 0}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  <option value="">{t('activitiesPage.selectChild')}</option>
                  {childList.map(child => (
                    <option key={child.id} value={child.id}>
                      {child.firstName} {child.lastName}
                    </option>
                  ))}
                </select>
                {formData.parentId && childList.length === 0 && (
                  <p className="text-sm text-slate-500 mt-2">{t('activitiesPage.noChildren') || 'Bu ota-onada bolalar yo\'q'}</p>
                )}
              </div>
            </>
          )}

          {/* Individual Plan Fields */}
          <div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('activitiesPage.formSkill') || 'Ko\'nikma'}
              </label>
              <input
                type="text"
                value={formData.skill}
                onChange={(e) => setFormData({ ...formData, skill: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder={t('activitiesPage.formSkillPlaceholder') || 'Masalan: O\'z-o\'ziga xizmat ko\'rsatish ko\'nikmalari'}
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('activitiesPage.formGoal') || 'Maqsad'}
              </label>
              <textarea
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder={t('activitiesPage.formGoalPlaceholder') || 'Maqsadni batafsil yozing'}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('activitiesPage.formStartDate') || 'Vazifalar tuzilgan sana'}
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('activitiesPage.formEndDate') || 'Maqsadlarga erishish muddati'}
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('activitiesPage.formTasks') || 'Vazifalar'}
              </label>
              {formData.tasks.map((task, index) => (
                <div key={taskIdsRef.current[index]} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={task}
                    onChange={(e) => {
                      const newTasks = [...formData.tasks];
                      newTasks[index] = e.target.value;
                      setFormData({ ...formData, tasks: newTasks });
                    }}
                    className="flex-1 px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder={`${t('activitiesPage.formTask') || 'Vazifa'} ${index + 1}`}
                  />
                  {formData.tasks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        taskIdsRef.current = taskIdsRef.current.filter((_, i) => i !== index);
                        const newTasks = formData.tasks.filter((_, i) => i !== index);
                        setFormData({ ...formData, tasks: newTasks });
                      }}
                      className="px-3 py-2 bg-error-50 text-error-600 rounded-lg hover:bg-error-100 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  taskIdsRef.current = [...taskIdsRef.current, `task-new-${Date.now()}-${Math.random()}`];
                  setFormData({ ...formData, tasks: [...formData.tasks, ''] });
                }}
                className="mt-2 text-sm text-brand-600 hover:text-brand-700 font-medium"
              >
                + {t('activitiesPage.addTask') || 'Vazifa qo\'shish'}
              </button>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('activitiesPage.formMethods') || 'Usullar'}
              </label>
              <textarea
                value={formData.methods}
                onChange={(e) => setFormData({ ...formData, methods: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder={t('activitiesPage.formMethodsPlaceholder') || 'Qo\'llaniladigan usullarni yozing'}
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('activitiesPage.formProgress') || 'Jarayon/Taraqqiyot'}
              </label>
              <textarea
                value={formData.progress}
                onChange={(e) => setFormData({ ...formData, progress: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder={t('activitiesPage.formProgressPlaceholder') || 'Jarayon va taraqqiyotni yozing'}
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('activitiesPage.formObservation') || 'Kuzatish'}
              </label>
              <textarea
                value={formData.observation}
                onChange={(e) => setFormData({ ...formData, observation: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder={t('activitiesPage.formObservationPlaceholder') || 'Kuzatuvlarni yozing'}
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('activitiesPage.formServices') || 'Xizmatlar'}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {SERVICES.map((service) => (
                  <label key={service} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.services.includes(service)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, services: [...formData.services, service] });
                        } else {
                          setFormData({ ...formData, services: formData.services.filter((s) => s !== service) });
                        }
                      }}
                      className="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500"
                    />
                    <span className="text-sm text-slate-700">
                      {t(`activitiesPage.services.${service.replace(/\s+/g, '')}`) || service}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
            >
              {t('activitiesPage.cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              {editingActivity ? t('activitiesPage.update') : t('activitiesPage.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ActivityFormModal;
