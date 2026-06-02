import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Eye, EyeOff } from 'lucide-react';

const ReceptionFormModal = ({ mode, formData, onChange, onSubmit, onClose, loading, schoolDomain }) => {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);

  const isCreate = mode === 'create';
  const title = isCreate ? t('receptionsPage.createModalTitle') : t('receptionsPage.editModalTitle');
  const submitLabel = isCreate
    ? (loading ? t('receptionsPage.createSubmitting') : t('receptionsPage.createSubmit'))
    : (loading ? t('receptionsPage.updateSubmitting') : t('receptionsPage.updateSubmit'));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-warm-200">
          <h2 className="text-xl font-bold text-warm-900">{title}</h2>
          <button onClick={onClose} className="text-warm-400 hover:text-warm-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-warm-700 mb-1">
              {t('receptionsPage.firstName')} *
            </label>
            <input
              type="text"
              required
              value={formData.firstName}
              onChange={(e) => onChange({ ...formData, firstName: e.target.value })}
              className="w-full px-3 py-2 border border-warm-300 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-warm-700 mb-1">
              {t('receptionsPage.lastName')} *
            </label>
            <input
              type="text"
              required
              value={formData.lastName}
              onChange={(e) => onChange({ ...formData, lastName: e.target.value })}
              className="w-full px-3 py-2 border border-warm-300 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
          </div>
          {isCreate && (
            <div>
              <label className="block text-sm font-medium text-warm-700 mb-1">
                {t('receptionsPage.email')} *
              </label>
              <div className="flex items-center border border-warm-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-500">
                <input
                  type="text"
                  required
                  value={formData.localPart || ''}
                  onChange={(e) => onChange({ ...formData, localPart: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '') })}
                  placeholder={t('receptionsPage.localPartPlaceholder', { defaultValue: 'iroda' })}
                  className="flex-1 px-3 py-2 border-0 outline-none bg-transparent"
                />
                <span className="px-3 py-2 bg-warm-100 text-warm-600 text-sm border-l border-warm-300 select-none whitespace-nowrap">
                  @{schoolDomain || 'your_school.uz'}
                </span>
              </div>
              <p className="mt-1 text-xs text-warm-500">
                {t('receptionsPage.domainLocked', { defaultValue: 'Email domeni maktab tomonidan belgilanadi' })}
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-warm-700 mb-1">
              {isCreate ? t('receptionsPage.password') : t('receptionsPage.newPassword')}
              {isCreate && ' *'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required={isCreate}
                value={formData.password}
                onChange={(e) => onChange({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 pr-10 border border-warm-300 rounded-lg focus:ring-2 focus:ring-brand-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-warm-500 hover:text-warm-700"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-warm-700 mb-1">
              {t('receptionsPage.phone')}
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => onChange({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-warm-300 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-warm-300 text-warm-700 rounded-lg hover:bg-warm-50"
            >
              {t('receptionsPage.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReceptionFormModal;
