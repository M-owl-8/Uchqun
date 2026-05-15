import Card from '../../shared/components/Card';
import { useTranslation } from 'react-i18next';
import { Bell, Save } from 'lucide-react';

const NotificationPreferences = ({ profileForm, setProfileForm, saving, onSubmit }) => {
  const { t } = useTranslation();
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-6 h-6 text-primary-600" />
          <h2 className="text-xl font-bold text-gray-900">{t('settings.notifications', { defaultValue: 'Bildirishnomalar' })}</h2>
        </div>

        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={profileForm.notificationPreferences.email}
              onChange={(e) => setProfileForm({
                ...profileForm,
                notificationPreferences: {
                  ...profileForm.notificationPreferences,
                  email: e.target.checked,
                },
              })}
              className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">{t('settings.emailNotifications', { defaultValue: 'Email bildirishnomalari' })}</span>
              <p className="text-xs text-gray-500">{t('settings.emailNotificationsDesc', { defaultValue: 'Email orqali yangiliklar olish' })}</p>
            </div>
          </label>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {t('settings.savePreferences', { defaultValue: 'Saqlash' })}
          </button>
        </div>
      </Card>
    </form>
  );
};

export default NotificationPreferences;
