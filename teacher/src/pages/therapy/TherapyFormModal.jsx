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
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <h3 className="text-lg font-bold text-gray-900">
            {editingTherapy
              ? t('therapy.edit', { defaultValue: 'Terapiyani Tahrirlash' })
              : t('therapy.create', { defaultValue: 'Yangi Terapiya' })}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('therapy.title', { defaultValue: 'Sarlavha' })} *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder={t('therapy.titlePlaceholder', { defaultValue: 'Terapiya nomi' })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('therapy.description', { defaultValue: 'Tavsif' })}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder={t('therapy.descriptionPlaceholder', { defaultValue: 'Terapiya tavsifi' })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('therapy.type', { defaultValue: 'Turi' })} *
              </label>
              <select
                value={formData.therapyType}
                onChange={(e) => setFormData({ ...formData, therapyType: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="music">{t('therapy.music', { defaultValue: 'Musiqa' })}</option>
                <option value="video">{t('therapy.video', { defaultValue: 'Video' })}</option>
                <option value="content">{t('therapy.content', { defaultValue: 'Content' })}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('therapy.contentType', { defaultValue: 'Content Turi' })}
              </label>
              <select
                value={formData.contentType}
                onChange={(e) => setFormData({ ...formData, contentType: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="audio">{t('therapy.audio', { defaultValue: 'Audio' })}</option>
                <option value="video">{t('therapy.video', { defaultValue: 'Video' })}</option>
                <option value="image">{t('therapy.image', { defaultValue: 'Rasm' })}</option>
                <option value="document">{t('therapy.document', { defaultValue: 'Hujjat' })}</option>
                <option value="interactive">{t('therapy.interactive', { defaultValue: 'Interaktiv' })}</option>
                <option value="link">{t('therapy.link', { defaultValue: 'Havola' })}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('therapy.contentUrl', { defaultValue: 'Content URL' })}
            </label>
            <input
              type="url"
              value={formData.contentUrl}
              onChange={(e) => setFormData({ ...formData, contentUrl: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="https://example.com/therapy.mp3"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('therapy.duration', { defaultValue: 'Davomiyligi (min)' })}
              </label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('therapy.ageGroup', { defaultValue: 'Yosh Guruhi' })}
              </label>
              <select
                value={formData.ageGroup}
                onChange={(e) => setFormData({ ...formData, ageGroup: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">{t('therapy.allAges', { defaultValue: 'Barcha' })}</option>
                <option value="infant">{t('therapy.infant', { defaultValue: 'Chaqaloq' })}</option>
                <option value="toddler">{t('therapy.toddler', { defaultValue: 'Yosh bola' })}</option>
                <option value="preschool">{t('therapy.preschool', { defaultValue: 'Muassasagacha' })}</option>
                <option value="school_age">{t('therapy.schoolAge', { defaultValue: 'Muassasa yoshi' })}</option>
                <option value="adolescent">{t('therapy.adolescent', { defaultValue: 'O\'smir' })}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('therapy.difficulty', { defaultValue: 'Qiyinlik' })}
              </label>
              <select
                value={formData.difficultyLevel}
                onChange={(e) => setFormData({ ...formData, difficultyLevel: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">{t('therapy.allLevels', { defaultValue: 'Barcha' })}</option>
                <option value="beginner">{t('therapy.beginner', { defaultValue: 'Boshlang\'ich' })}</option>
                <option value="intermediate">{t('therapy.intermediate', { defaultValue: 'O\'rta' })}</option>
                <option value="advanced">{t('therapy.advanced', { defaultValue: 'Yuqori' })}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('therapy.tags', { defaultValue: 'Teglar (vergul bilan ajratilgan)' })}
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="tag1, tag2, tag3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('therapy.assignChild', { defaultValue: 'Bolaga tayinlash (ixtiyoriy)' })}
            </label>
            <select
              value={formData.childId}
              onChange={(e) => setFormData({ ...formData, childId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">{t('therapy.noAssignment', { defaultValue: 'Tayinlamaslik' })}</option>
              {childList.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.firstName} {child.lastName} {child.parentName ? `(${child.parentName})` : ''}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {t('therapy.assignChildHint', { defaultValue: 'Agar bolani tanlasangiz, terapiya avtomatik ravishda unga tayinlanadi' })}
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors"
              disabled={saving}
            >
              {t('therapy.cancel', { defaultValue: 'Bekor qilish' })}
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{t('therapy.saving', { defaultValue: 'Saqlanmoqda...' })}</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>{t('therapy.save', { defaultValue: 'Saqlash' })}</span>
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
