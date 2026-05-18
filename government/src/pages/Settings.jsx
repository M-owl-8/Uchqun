import { useState } from 'react';
import api from '../services/api';
import Card from '@shared/components/Card';
import { useToast } from '@shared/context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { Lock, LogOut, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Settings = () => {
  const { logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
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
  const { success, error: showError } = useToast();

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
            {t('settings.subtitle', { defaultValue: 'Hisob sozlamalarini boshqarish' })}
          </p>
        </div>
        <LanguageSwitcher />
      </div>

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
