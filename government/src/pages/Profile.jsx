import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { Shield, Mail, Phone, LogOut, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('profile.title', { defaultValue: 'Profil' })}
          </h1>
          <p className="text-gray-600">
            {t('profile.subtitle', { defaultValue: 'Hisobingiz ma\'lumotlari' })}
          </p>
        </div>
        <LanguageSwitcher />
      </div>

      {/* Profile Information */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 bg-primary-100 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
            {user?.avatar ? (
              <img src={user.avatar.startsWith('http') ? user.avatar : `${(import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '') || window.location.origin}${user.avatar.startsWith('/') ? '' : '/'}${user.avatar}`} alt="" className="w-full h-full object-cover" />
            ) : (
              <Shield className="w-10 h-10 text-primary-600" />
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {t('profile.personalInfo', { defaultValue: 'Shaxsiy ma\'lumotlar' })}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <p className="text-sm text-gray-600">{t('profile.email', { defaultValue: 'Email' })}</p>
                </div>
                <p className="font-semibold text-gray-900">{user?.email || '—'}</p>
              </div>
              {user?.phone && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <p className="text-sm text-gray-600">{t('profile.phone', { defaultValue: 'Telefon' })}</p>
                  </div>
                  <p className="font-semibold text-gray-900">{user.phone}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600 mb-2">{t('profile.role', { defaultValue: 'Rol' })}</p>
                <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                  Government
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">{t('profile.status', { defaultValue: 'Holati' })}</p>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  user?.isActive 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {user?.isActive 
                    ? t('profile.active', { defaultValue: 'Faol' })
                    : t('profile.inactive', { defaultValue: 'Nofaol' })
                  }
                </span>
              </div>
              {user?.createdAt && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    {t('profile.createdAt', { defaultValue: 'Yaratilgan sana' })}
                  </p>
                  <p className="font-semibold text-gray-900">
                    {new Date(user.createdAt).toLocaleDateString(i18n.language)}
                  </p>
                </div>
              )}
            </div>
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
              Tizimdan chiqish uchun quyidagi tugmani bosing
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
