import { Save, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const TherapyFormModal = ({
  editingTherapy,
  formData,
  setFormData,
  childList,
  saving,
  onSave,
  onClose,
}) => {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-surface">
          <h3 className="text-lg font-bold text-slate-900">
            {editingTherapy
              ? t('therapy.edit')
              : t('therapy.create')}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('therapy.title')} *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder={t('therapy.titlePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('therapy.description')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder={t('therapy.descriptionPlaceholder')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('therapy.type')} *
              </label>
              <select
                value={formData.therapyType}
                onChange={(e) => setFormData({ ...formData, therapyType: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              >
                <option value="music">{t('therapy.music')}</option>
                <option value="video">{t('therapy.video')}</option>
                <option value="content">{t('therapy.content')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('therapy.contentType')}
              </label>
              <select
                value={formData.contentType}
                onChange={(e) => setFormData({ ...formData, contentType: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              >
                <option value="audio">{t('therapy.audio')}</option>
                <option value="video">{t('therapy.video')}</option>
                <option value="image">{t('therapy.image')}</option>
                <option value="document">{t('therapy.document')}</option>
                <option value="interactive">{t('therapy.interactive')}</option>
                <option value="link">{t('therapy.link')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('therapy.contentUrl')}
            </label>
            <input
              type="url"
              value={formData.contentUrl}
              onChange={(e) => setFormData({ ...formData, contentUrl: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="https://example.com/therapy.mp3"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('therapy.duration')}
              </label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('therapy.ageGroup')}
              </label>
              <select
                value={formData.ageGroup}
                onChange={(e) => setFormData({ ...formData, ageGroup: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              >
                <option value="all">{t('therapy.allAges')}</option>
                <option value="infant">{t('therapy.infant')}</option>
                <option value="toddler">{t('therapy.toddler')}</option>
                <option value="preschool">{t('therapy.preschool')}</option>
                <option value="school_age">{t('therapy.schoolAge')}</option>
                <option value="adolescent">{t('therapy.adolescent')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('therapy.difficulty')}
              </label>
              <select
                value={formData.difficultyLevel}
                onChange={(e) => setFormData({ ...formData, difficultyLevel: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              >
                <option value="all">{t('therapy.allLevels')}</option>
                <option value="beginner">{t('therapy.beginner')}</option>
                <option value="intermediate">{t('therapy.intermediate')}</option>
                <option value="advanced">{t('therapy.advanced')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('therapy.tags')}
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="tag1, tag2, tag3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('therapy.assignChild')}
            </label>
            <select
              value={formData.childId}
              onChange={(e) => setFormData({ ...formData, childId: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            >
              <option value="">{t('therapy.noAssignment')}</option>
              {childList.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.firstName} {child.lastName} {child.parentName ? `(${child.parentName})` : ''}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              {t('therapy.assignChildHint')}
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors"
              disabled={saving}
            >
              {t('therapy.cancel')}
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{t('therapy.saving')}</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>{t('therapy.save')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TherapyFormModal;
