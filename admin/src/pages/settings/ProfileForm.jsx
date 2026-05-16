import Card from '@shared/components/Card';
import { useTranslation } from 'react-i18next';
import { User, Mail, Phone, Save } from 'lucide-react';

const ProfileForm = ({ profileForm, setProfileForm, saving, onSubmit }) => {
  const { t } = useTranslation();
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-6 h-6 text-brand-600" />
          <h2 className="text-xl font-bold text-warm-900">{t('settings.profileInfo', { defaultValue: 'Profil ma\'lumotlari' })}</h2>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-warm-700 mb-2">{t('settings.firstName', { defaultValue: 'Ism' })}</label>
              <input
                type="text"
                value={profileForm.firstName}
                onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                className="w-full px-4 py-3 border border-warm-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-warm-700 mb-2">{t('settings.lastName', { defaultValue: 'Familiya' })}</label>
              <input
                type="text"
                value={profileForm.lastName}
                onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                className="w-full px-4 py-3 border border-warm-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-warm-700 mb-2">
              <Mail className="w-4 h-4 inline mr-2" />
              {t('settings.email', { defaultValue: 'Email' })}
            </label>
            <input
              type="email"
              value={profileForm.email}
              disabled
              className="w-full px-4 py-3 border border-warm-200 rounded-lg bg-warm-50 text-warm-500 cursor-not-allowed"
            />
            <p className="text-xs text-warm-500 mt-1">{t('settings.emailCannotChange', { defaultValue: 'Email o\'zgartirib bo\'lmaydi' })}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-warm-700 mb-2">
              <Phone className="w-4 h-4 inline mr-2" />
              {t('settings.phone', { defaultValue: 'Telefon' })}
            </label>
            <input
              type="tel"
              value={profileForm.phone}
              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
              className="w-full px-4 py-3 border border-warm-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="+998 90 123 45 67"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-colors shadow-sm disabled:opacity-50"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {t('settings.saveProfile', { defaultValue: 'Profilni saqlash' })}
          </button>
        </div>
      </Card>
    </form>
  );
};

export default ProfileForm;
