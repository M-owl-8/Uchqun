import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera } from 'lucide-react';
import api from '../../shared/services/api';
import { useAuth } from '../../shared/context/AuthContext';
import { useToast } from '../../shared/context/ToastContext';

const AvatarUpload = ({ user }) => {
  const { t } = useTranslation();
  const { setUser } = useAuth();
  const { success, error: showError } = useToast();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError(t('profile.invalidImage', { defaultValue: 'Faqat rasm fayllari qabul qilinadi' }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showError(t('profile.imageTooLarge', { defaultValue: 'Rasm hajmi 5MB dan katta bo\'lmasligi kerak' }));
      return;
    }

    try {
      setUploadingAvatar(true);
      const formData = new FormData();
      formData.append('avatar', file);
      const response = await api.put('/user/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (setUser) setUser(response.data);
      success(t('profile.avatarUpdated', { defaultValue: 'Rasm muvaffaqiyatli yuklandi' }));
    } catch (err) {
      showError(err.response?.data?.error || t('profile.uploadError', { defaultValue: 'Rasm yuklashda xatolik yuz berdi' }));
    } finally {
      setUploadingAvatar(false);
      event.target.value = '';
    }
  };

  return (
    <div className="mb-6 flex items-center gap-4">
      <div className="relative">
        <div
          className="w-20 h-20 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-2xl font-bold overflow-hidden shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={handleAvatarClick}
        >
          {user?.avatar ? (
            <img
              src={user.avatar.startsWith('http') ? user.avatar : `${API_BASE.replace(/\/api\/?$/, '')}${user.avatar.startsWith('/') ? '' : '/'}${user.avatar}`}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{user?.firstName?.[0]}{user?.lastName?.[0]}</span>
          )}
          {uploadingAvatar && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleAvatarClick}
          className="absolute -bottom-1 -right-1 w-7 h-7 bg-brand-600 text-white rounded-full flex items-center justify-center hover:bg-brand-700 transition-colors shadow-md"
          title={t('profile.changeAvatar', { defaultValue: 'Rasmni o\'zgartirish' })}
        >
          <Camera className="w-4 h-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarUpload}
          className="hidden"
        />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-700">{t('profile.profilePicture', { defaultValue: 'Profil rasmi' })}</p>
        <p className="text-xs text-slate-500">{t('profile.clickToChange', { defaultValue: 'Rasmni o\'zgartirish uchun bosing' })}</p>
      </div>
    </div>
  );
};

export default AvatarUpload;
