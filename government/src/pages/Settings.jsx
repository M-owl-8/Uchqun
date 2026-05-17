import { useEffect, useState } from 'react';
import api from '../services/api';
import Card from '@shared/components/Card';
import { useToast } from '@shared/context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { Lock, User, LogOut, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Settings = () => {
  const { user, setUser, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
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
  const { success, error: showError } = useToast();

  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await api.put('/user/profile', {
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        phone: profileForm.phone,
      });
      success(t('settings.profileUpdated', { defaultValue: 'Profil muvaffaqiyatli yangilandi' }));
      if (setUser) {
        setUser(response.data.data ?? response.data);
      }
    } catch (error) {
      const details = error.response?.data?.details;
      const msg = details?.length
        ? details.map(d => d.message).join('; ')
        : error.response?.data?.error;
      showError(msg || t('settings.profileError', { defaultValue: 'Profilni yangilashda xatolik' }));
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
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
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

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-inkGreen-900">
            {t('settings.title', { defaultValue: 'Sozlamalar' })}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {t('settings.subtitle', { defaultValue: 'Profil va hisob sozlamalarini boshqarish' })}
          </p>
        </div>
        <LanguageSwitcher />
      </div>

      {/* Profile Information */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-6 h-6 text-brand-600" />
          <h2 className="text-xl font-bold text-gray-900">
            {t('settings.profileInfo', { defaultValue: 'Profil ma\'lumotlari' })}
          </h2>
        </div>
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('settings.firstName', { defaultValue: 'Ism' })}
              </label>
              <input
                type="text"
                value={profileForm.firstName}
                onChange={(e) => setProfileForm(f => ({ ...f, firstName: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('settings.lastName', { defaultValue: 'Familiya' })}
              </label>
              <input
                type="text"
                value={profileForm.lastName}
                onChange={(e) => setProfileForm(f => ({ ...f, lastName: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings.email', { defaultValue: 'Email' })}
            </label>
            <input
              type="email"
              value={profileForm.email}
              disabled
              className="w-full px-4 py-2.5 border border-gray-200 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">
              {t('settings.emailCannotChange', { defaultValue: 'Email o\'zgartirilmaydi' })}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings.phone', { defaultValue: 'Telefon' })}
            </label>
            <input
              type="tel"
              value={profileForm.phone}
              onChange={(e) => setProfileForm(f => ({ ...f, phone: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-brand-600 text-white rounded-md font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {saving
              ? t('settings.saving', { defaultValue: 'Saqlanmoqda...' })
              : t('settings.saveProfile', { defaultValue: 'Profilni saqlash' })}
          </button>
        </form>
      </Card>

      {/* Change Password */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Lock className="w-6 h-6 text-brand-600" />
          <h2 className="text-xl font-bold text-gray-900">
            {t('settings.changePassword', { defaultValue: 'Parolni o\'zgartirish' })}
          </h2>
        </div>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings.currentPassword', { defaultValue: 'Joriy parol' })}
            </label>
            <div className="relative">
              <input
                type={showPasswords.current ? 'text' : 'password'}
                autoComplete="current-password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))}
                className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                required
              />
              <button type="button" onClick={() => setShowPasswords(s => ({ ...s, current: !s.current }))} className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600">
                {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings.newPassword', { defaultValue: 'Yangi parol' })}
            </label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                autoComplete="new-password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                required
              />
              <button type="button" onClick={() => setShowPasswords(s => ({ ...s, new: !s.new }))} className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600">
                {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings.confirmNewPassword', { defaultValue: 'Yangi parolni tasdiqlang' })}
            </label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                autoComplete="new-password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                required
              />
              <button type="button" onClick={() => setShowPasswords(s => ({ ...s, confirm: !s.confirm }))} className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600">
                {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={savingPassword}
            className="px-6 py-2.5 bg-brand-600 text-white rounded-md font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {savingPassword
              ? t('settings.saving', { defaultValue: 'Saqlanmoqda...' })
              : t('settings.changePasswordButton', { defaultValue: 'Parolni o\'zgartirish' })}
          </button>
        </form>
      </Card>

      {/* Logout */}
      <Card className="p-6">
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-md font-bold hover:bg-red-700 transition-colors w-full"
        >
          <LogOut className="w-5 h-5" />
          {t('nav.logout', { defaultValue: 'Chiqish' })}
        </button>
      </Card>
    </div>
  );
};

export default Settings;
