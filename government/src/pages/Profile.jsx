import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '@shared/context/ToastContext';
import Card from '@shared/components/Card';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { Shield, Mail, Phone, LogOut, Pencil, X, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

const Profile = () => {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { success, error: showError } = useToast();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '' });

  const startEdit = () => {
    setForm({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
    });
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put('/user/profile', {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
      });
      if (setUser) setUser(res.data.data ?? res.data);
      success(t('settings.profileUpdated', { defaultValue: 'Profil muvaffaqiyatli yangilandi' }));
      setEditing(false);
    } catch (err) {
      const details = err.response?.data?.details;
      const msg = details?.length ? details.map(d => d.message).join('; ') : err.response?.data?.error;
      showError(msg || t('settings.profileError', { defaultValue: 'Profilni yangilashda xatolik' }));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const avatarUrl = user?.avatar
    ? (user.avatar.startsWith('http')
        ? user.avatar
        : `${(import.meta.env.VITE_API_URL || '').replace(/\/api(?:\/v\d+)?\/?$/, '') || window.location.origin}${user.avatar.startsWith('/') ? '' : '/'}${user.avatar}`)
    : null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-inkGreen-900">
            {t('profile.title', { defaultValue: 'Profil' })}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {t('profile.subtitle', { defaultValue: "Hisobingiz ma'lumotlari" })}
          </p>
        </div>
        <LanguageSwitcher />
      </div>

      {/* Profile Information */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 bg-brand-100 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Shield className="w-10 h-10 text-brand-600" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {t('profile.personalInfo', { defaultValue: 'Shaxsiy ma\'lumotlar' })}
              </h2>
              {!editing && (
                <button
                  onClick={startEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-600 border border-brand-200 rounded-md hover:bg-brand-50 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {t('profile.edit', { defaultValue: 'Tahrirlash' })}
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {t('settings.firstName', { defaultValue: 'Ism' })}
                    </label>
                    <input
                      type="text"
                      value={form.firstName}
                      onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {t('settings.lastName', { defaultValue: 'Familiya' })}
                    </label>
                    <input
                      type="text"
                      value={form.lastName}
                      onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t('settings.phone', { defaultValue: 'Telefon' })}
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-md hover:bg-brand-700 disabled:opacity-50 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {saving ? t('settings.saving', { defaultValue: 'Saqlanmoqda...' }) : t('profile.save', { defaultValue: 'Saqlash' })}
                  </button>
                  <button
                    onClick={cancelEdit}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    {t('common.cancel', { defaultValue: 'Bekor qilish' })}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">{t('settings.firstName', { defaultValue: 'Ism' })}</p>
                  <p className="font-semibold text-gray-900">{user?.firstName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">{t('settings.lastName', { defaultValue: 'Familiya' })}</p>
                  <p className="font-semibold text-gray-900">{user?.lastName || '—'}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <p className="text-xs text-gray-500">{t('profile.email', { defaultValue: 'Email' })}</p>
                  </div>
                  <p className="font-semibold text-gray-900">{user?.email || '—'}</p>
                </div>
                {user?.phone && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <p className="text-xs text-gray-500">{t('profile.phone', { defaultValue: 'Telefon' })}</p>
                    </div>
                    <p className="font-semibold text-gray-900">{user.phone}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 mb-1">{t('profile.role', { defaultValue: 'Rol' })}</p>
                  <span className="px-3 py-1 bg-brand-100 text-brand-700 rounded-full text-sm font-medium">
                    {t('profile.governmentRole', { defaultValue: 'Government' })}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">{t('profile.status', { defaultValue: 'Holati' })}</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    user?.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {user?.isActive
                      ? t('profile.active', { defaultValue: 'Faol' })
                      : t('profile.inactive', { defaultValue: 'Nofaol' })}
                  </span>
                </div>
                {user?.createdAt && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      {t('profile.createdAt', { defaultValue: 'Yaratilgan sana' })}
                    </p>
                    <p className="font-semibold text-gray-900">
                      {new Date(user.createdAt).toLocaleDateString(i18n.language)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Logout Button */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 mb-1">
              {t('profile.logout', { defaultValue: 'Chiqish' })}
            </h3>
            <p className="text-sm text-gray-600">
              {t('profile.logoutDesc', { defaultValue: 'Hisobdan chiqish' })}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            {t('profile.logout', { defaultValue: 'Chiqish' })}
          </button>
        </div>
      </Card>
    </div>
  );
};

export default Profile;
