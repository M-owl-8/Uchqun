import { Camera, Save, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@shared/context/ToastContext';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

const ChildFormModal = ({ childFormData, setChildFormData, isEditing, onSubmit, onClose }) => {
  const { t } = useTranslation();
  const { error: showError } = useToast();
  const photoInputId = isEditing ? 'editChildPhoto' : 'childPhoto';

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      showError(t('parentsPage.invalidFileType', { defaultValue: 'Only JPEG, PNG, WebP and GIF images are allowed' }));
      e.target.value = '';
      return;
    }
    if (file.size > MAX_PHOTO_SIZE) {
      showError(t('parentsPage.fileTooLarge', { defaultValue: 'Image must be smaller than 5 MB' }));
      e.target.value = '';
      return;
    }
    setChildFormData({ ...childFormData, photo: file, photoPreview: URL.createObjectURL(file) });
  };

  const handleRemovePhoto = () => {
    setChildFormData({ ...childFormData, photo: null, photoPreview: null });
  };

  const modalTitle = isEditing
    ? t('parentsPage.editChildTitle')
    : 'Bola qo\'shish';
  const modalTitleId = isEditing ? 'edit-child-modal-title' : 'add-child-modal-title';
  const submitLabel = isEditing
    ? t('parentsPage.buttons.updateChild')
    : t('parentsPage.buttons.addChild');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 id={modalTitleId} className="text-2xl font-bold text-gray-900">{modalTitle}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label={t('common.close', { defaultValue: 'Close' })}
          >
            <X className="w-5 h-5 text-gray-500" aria-hidden="true" />
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          aria-label={isEditing ? t('parentsPage.editChildTitle') : t('parentsPage.buttons.addChild')}
          className="p-6 space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('parentsPage.form.childFirstName')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={childFormData.firstName}
                onChange={(e) => setChildFormData({ ...childFormData, firstName: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('parentsPage.form.childLastName')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={childFormData.lastName}
                onChange={(e) => setChildFormData({ ...childFormData, lastName: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('parentsPage.form.childDob')} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={childFormData.dateOfBirth}
                onChange={(e) => setChildFormData({ ...childFormData, dateOfBirth: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('parentsPage.form.childGender')} <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={childFormData.gender}
                onChange={(e) => setChildFormData({ ...childFormData, gender: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="Male">{t('gender.male', 'Erkak')}</option>
                <option value="Female">{t('gender.female', 'Ayol')}</option>
                <option value="Other">{t('gender.other', 'Boshqa')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('parentsPage.form.childDisability')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={childFormData.disabilityType}
              onChange={(e) => setChildFormData({ ...childFormData, disabilityType: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('parentsPage.form.childSpecialNeeds')}</label>
            <textarea
              value={childFormData.specialNeeds}
              onChange={(e) => setChildFormData({ ...childFormData, specialNeeds: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('parentsPage.form.childSchool')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={childFormData.school || ''}
              onChange={(e) => setChildFormData({ ...childFormData, school: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('parentsPage.form.childPhoto')}
            </label>
            <div className="flex items-center gap-4">
              {childFormData.photoPreview ? (
                <div className="relative">
                  <img
                    src={childFormData.photoPreview}
                    alt="Preview"
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <div>
                <input
                  type="file"
                  id={photoInputId}
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <label
                  htmlFor={photoInputId}
                  className="cursor-pointer px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm"
                >
                  {t('parentsPage.form.uploadPhoto')}
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  {t('parentsPage.form.photoSize')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              {t('parentsPage.form.cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChildFormModal;
