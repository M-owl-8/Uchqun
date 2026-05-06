import { useEffect, useState } from 'react';
import api from '../../shared/services/api';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../../shared/context/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import {
  User,
  Lock,
  Bell,
  Save,
  Mail,
  Phone,
  Eye,
  EyeOff,
  Globe,
  LogOut,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Settings = () => {
  const { user, setUser, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'https://uchqun-production-2d8a.up.railway.app';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notificationPreferences: {
      email: true,
      push: true,
    },
  });
  const { success, error: showError } = useToast();

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/auth/me');
      const userData = response.data;
      setProfileForm({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email || '',
        phone: userData.phone || '',
        notificationPreferences: userData.notificationPreferences || {
          email: true,
          push: true,
        },
      });
      if (setUser) {
        setUser(userData);
      }
    } catch (error) {
      showError(error.response?.data?.error || t('settings.loadError', { defaultValue: 'Profil yuklashda xatolik' }));
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await api.put('/user/profile', {
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        phone: profileForm.phone,
        notificationPreferences: profileForm.notificationPreferences,
      });
      success(t('settings.profileUpdated', { defaultValue: 'Profil muvaffaqiyatli yangilandi' }));
      if (setUser) {
        setUser(response.data);
      }
    } catch (error) {
      showError(error.response?.data?.error || t('settings.profileError', { defaultValue: 'Profilni yangilashda xatolik' }));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showError(t('settings.passwordMismatch', { defaultValue: 'Yangi parollar mos kelmadi' }));
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      showError(t('settings.passwordTooShort', { defaultValue: 'Parol kamida 8 ta belgidan iborat bo\'lishi kerak' }));
      return;
    }

    setSavingPassword(true);
    try {
      await api.put('/user/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      success(t('settings.passwordChanged', { defaultValue: 'Parol muvaffaqiyatli o\'zgartirildi' }));
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      showError(error.response?.data?.error || t('settings.passwordError', { defaultValue: 'Parolni o\'zgartirishda xatolik' }));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900">{t('settings.title', { defaultValue: 'Sozlamalar' })}</h1>
          <p className="text-gray-500 font-medium mt-1">{t('settings.subtitle', { defaultValue: 'Profil va hisob sozlamalarini boshqarish' })}</p>
        </div>
        <LanguageSwitcher />
      </div>

      {/* Profile Settings */}
      <form onSubmit={handleProfileSubmit} className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">{t('settings.profileInfo', { defaultValue: 'Profil ma\'lumotlari' })}</h2>
          </div>

          {/* Avatar Display */}
          <div className="mb-6 flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-2xl font-bold overflow-hidden shrink-0">
              {user?.avatar ? (
                <img src={user.avatar.startsWith('http') ? user.avatar : `${API_BASE.replace(/\/api\/?$/, '')}${user.avatar.startsWith('/') ? '' : '/'}${user.avatar}`} alt="" className="w-full h-full object-cover" />
              ) : (
                <span>{user?.firstName?.[0]}{user?.lastName?.[0]}</span>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">{t('profile.profilePicture', { defaultValue: 'Profil rasmi' })}</p>
              <p className="text-xs text-gray-500">{t('profile.changeInProfile', { defaultValue: 'Rasmni profil sahifasida o\'zgartirishingiz mumkin' })}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.firstName', { defaultValue: 'Ism' })}</label>
                <input
                  type="text"
                  value={profileForm.firstName}
                  onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.lastName', { defaultValue: 'Familiya' })}</label>
                <input
                  type="text"
                  value={profileForm.lastName}
                  onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                {t('settings.email', { defaultValue: 'Email' })}
              </label>
              <input
                type="email"
                value={profileForm.email}
                disabled
                className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">{t('settings.emailCannotChange', { defaultValue: 'Email o\'zgartirib bo\'lmaydi' })}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="w-4 h-4 inline mr-2" />
                {t('settings.phone', { defaultValue: 'Telefon' })}
              </label>
              <input
                type="tel"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+998 90 123 45 67"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
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

      {/* Notification Preferences */}
      <form onSubmit={handleProfileSubmit} className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-6 h-6 text-blue-600" />
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
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">{t('settings.emailNotifications', { defaultValue: 'Email bildirishnomalari' })}</span>
                <p className="text-xs text-gray-500">{t('settings.emailNotificationsDesc', { defaultValue: 'Email orqali yangiliklar olish' })}</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={profileForm.notificationPreferences.push}
                onChange={(e) => setProfileForm({
                  ...profileForm,
                  notificationPreferences: {
                    ...profileForm.notificationPreferences,
                    push: e.target.checked,
                  },
                })}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">{t('settings.pushNotifications', { defaultValue: 'Push bildirishnomalari' })}</span>
                <p className="text-xs text-gray-500">{t('settings.pushNotificationsDesc', { defaultValue: 'Brauzerda push bildirishnomalar olish' })}</p>
              </div>
            </label>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {t('settings.savePreferences', { defaultValue: 'Saqlash' })}
            </button>
          </div>
        </Card>
      </form>

      {/* Language Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Globe className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">{t('settings.language', { defaultValue: 'Til' })}</h2>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">{t('settings.selectLanguage', { defaultValue: 'Interfeys tilini tanlang' })}</p>
          <LanguageSwitcher />
        </div>
      </Card>

      {/* Password Change */}
      <form onSubmit={handlePasswordSubmit} className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">{t('settings.changePassword', { defaultValue: 'Parolni o\'zgartirish' })}</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.currentPassword', { defaultValue: 'Joriy parol' })}</label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                >
                  {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.newPassword', { defaultValue: 'Yangi parol' })}</label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                >
                  {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">{t('settings.passwordRequirements', { defaultValue: 'Parol kamida 8 ta belgidan iborat bo\'lishi kerak' })}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.confirmPassword', { defaultValue: 'Yangi parolni tasdiqlash' })}</label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                >
                  {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={savingPassword}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {savingPassword ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {t('settings.updatePassword', { defaultValue: 'Parolni yangilash' })}
            </button>
          </div>
        </Card>
      </form>

      {/* Logout */}
      <Card className="p-6">
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-sm w-full"
        >
          <LogOut className="w-5 h-5" />
          {t('logout', { defaultValue: 'Chiqish' })}
        </button>
      </Card>
    </div>
  );
};

export default Settings;
