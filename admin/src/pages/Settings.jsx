import { useEffect, useState } from 'react';
import api from '../services/api';
import Card from '@shared/components/Card';
import { useToast } from '@shared/context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { LogOut, Building2, Upload, ClipboardList, UsersRound, Mail } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import ProfileForm from './settings/ProfileForm';
import NotificationPreferences from './settings/NotificationPreferences';
import PasswordForm from './settings/PasswordForm';

const Settings = () => {
  const { user, setUser, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
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
    if (user) {
      setProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        notificationPreferences: user.notificationPreferences || { email: true, push: true },
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
        notificationPreferences: profileForm.notificationPreferences,
      });
      success(t('settings.profileUpdated', { defaultValue: 'Profil muvaffaqiyatli yangilandi' }));
      if (setUser) {
        setUser(response.data.data ?? response.data);
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
      showError(t('settings.passwordTooShort', { defaultValue: "Parol kamida 8 ta belgidan iborat bo'lishi kerak" }));
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordForm.newPassword)) {
      showError(t('settings.passwordWeak', { defaultValue: 'Parol katta va kichik harflar hamda raqamdan iborat bo\'lishi kerak' }));
      return;
    }

    setSavingPassword(true);
    try {
      await api.put('/user/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      success(t('settings.passwordChanged', { defaultValue: "Parol muvaffaqiyatli o'zgartirildi" }));
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      if (error.response?.status === 400) {
        showError(t('settings.passwordIncorrect', { defaultValue: "Joriy parol noto'g'ri" }));
      } else {
        showError(t('settings.passwordError', { defaultValue: "Parolni o'zgartirishda xatolik" }));
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="letterhead pt-4">
        <p className="text-xs font-medium uppercase tracking-wider text-brand-700">
          {t('nav.settings', { defaultValue: 'Sozlamalar' })}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-warm-900">
          {t('settings.title', { defaultValue: 'Sozlamalar' })}
        </h1>
        <p className="text-sm text-warm-600 mt-1">
          {t('settings.subtitle', { defaultValue: 'Profil va hisob sozlamalarini boshqarish' })}
        </p>
      </div>

      {/* Profile Settings */}
      <ProfileForm
        profileForm={profileForm}
        setProfileForm={setProfileForm}
        saving={saving}
        onSubmit={handleProfileSubmit}
      />

      {/* Notification Preferences */}
      <NotificationPreferences
        profileForm={profileForm}
        setProfileForm={setProfileForm}
        saving={saving}
        onSubmit={handleProfileSubmit}
      />

      {/* Password Change */}
      <PasswordForm
        passwordForm={passwordForm}
        setPasswordForm={setPasswordForm}
        showPasswords={showPasswords}
        setShowPasswords={setShowPasswords}
        savingPassword={savingPassword}
        onSubmit={handlePasswordSubmit}
      />

      {/* Quick links */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-warm-800 mb-4 uppercase tracking-wider">
          {t('settings.quickLinks', { defaultValue: "Boshqa bo'limlar" })}
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <Link to="/admin/school" className="flex items-center gap-3 p-3 border border-warm-200 rounded-md hover:bg-warm-50 transition-colors">
            <Building2 className="w-4 h-4 text-brand-600 shrink-0" strokeWidth={1.75} />
            <div>
              <p className="text-sm font-medium text-warm-900">{t('nav.school', { defaultValue: 'Muassasa profili' })}</p>
              <p className="text-xs text-warm-500">{t('settings.schoolProfileDesc', { defaultValue: "Manzil, aloqa va muassasa ma'lumotlari" })}</p>
            </div>
          </Link>
          <Link to="/admin/import" className="flex items-center gap-3 p-3 border border-warm-200 rounded-md hover:bg-warm-50 transition-colors">
            <Upload className="w-4 h-4 text-brand-600 shrink-0" strokeWidth={1.75} />
            <div>
              <p className="text-sm font-medium text-warm-900">{t('nav.import', { defaultValue: 'Ommaviy import' })}</p>
              <p className="text-xs text-warm-500">{t('settings.importDesc', { defaultValue: 'CSV orqali bolalarni import qilish' })}</p>
            </div>
          </Link>
          <Link to="/admin/irr" className="flex items-center gap-3 p-3 border border-warm-200 rounded-md hover:bg-warm-50 transition-colors">
            <ClipboardList className="w-4 h-4 text-brand-600 shrink-0" strokeWidth={1.75} />
            <div>
              <p className="text-sm font-medium text-warm-900">{t('nav.irr', { defaultValue: 'Choraklik monitoring jurnali' })}</p>
              <p className="text-xs text-warm-500">{t('settings.irrDesc', { defaultValue: "Har chorakda bir marta to'ldiriladi" })}</p>
            </div>
          </Link>
          <Link to="/admin/groups" className="flex items-center gap-3 p-3 border border-warm-200 rounded-md hover:bg-warm-50 transition-colors">
            <UsersRound className="w-4 h-4 text-brand-600 shrink-0" strokeWidth={1.75} />
            <div>
              <p className="text-sm font-medium text-warm-900">{t('nav.groups', { defaultValue: 'Guruhlar' })}</p>
              <p className="text-xs text-warm-500">{t('settings.groupsDesc', { defaultValue: "Guruhlar ro'yxati (faqat ko'rish)" })}</p>
            </div>
          </Link>
          <Link to="/admin/messages" className="flex items-center gap-3 p-3 border border-warm-200 rounded-md hover:bg-warm-50 transition-colors">
            <Mail className="w-4 h-4 text-brand-600 shrink-0" strokeWidth={1.75} />
            <div>
              <p className="text-sm font-medium text-warm-900">{t('nav.govMessages', { defaultValue: 'Hukumatga xabarlar' })}</p>
              <p className="text-xs text-warm-500">{t('settings.messagesDesc', { defaultValue: 'Davlat nazorat organiga murojaatlar' })}</p>
            </div>
          </Link>
          <Link to="/admin/trash" className="flex items-center gap-3 p-3 border border-warm-200 rounded-md hover:bg-warm-50 transition-colors">
            <LogOut className="w-4 h-4 text-warm-500 shrink-0" strokeWidth={1.75} />
            <div>
              <p className="text-sm font-medium text-warm-900">{t('nav.trash', { defaultValue: 'Savatcha' })}</p>
              <p className="text-xs text-warm-500">{t('settings.trashDesc', { defaultValue: "O'chirilgan ma'lumotlar arxivi" })}</p>
            </div>
          </Link>
        </div>
      </Card>

      {/* Logout */}
      <Card className="p-4">
        <button
          onClick={handleLogout}
          className="inline-flex items-center justify-center gap-2 h-10 px-4 text-sm font-medium bg-error-50 hover:bg-error-100 text-error-700 border border-error-200 rounded-md transition-colors w-full"
        >
          <LogOut className="w-4 h-4" strokeWidth={1.75} />
          {t('logout', { defaultValue: 'Chiqish' })}
        </button>
      </Card>
    </div>
  );
};

export default Settings;
