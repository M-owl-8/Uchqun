import { useState } from 'react';
import { User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../shared/context/ToastContext';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';

const AvatarUploadModal = ({ show, childId, onClose, onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();
  const { t } = useTranslation();

  if (!show) return null;

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toastError(t('profile.invalidImage', { defaultValue: 'Faqat rasm fayllari qabul qilinadi' }));
      event.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toastError(t('profile.imageTooLarge', { defaultValue: 'Rasm hajmi 5MB dan katta bo\'lmasligi kerak' }));
      event.target.value = '';
      return;
    }

    try {
      setUploading(true);
      const reader = new FileReader();
      const photoBase64 = await new Promise((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result;
          typeof result === 'string' ? resolve(result) : reject(new Error('Failed to read file as base64'));
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      await api.put(`/child/${childId}`, { photoBase64 }, {
        headers: { 'Content-Type': 'application/json' },
      });

      toastSuccess(t('profile.avatarUpdated', { defaultValue: 'Rasm muvaffaqiyatli yuklandi' }));

      try {
        const childResponse = await api.get(`/child/${childId}`);
        onUploadSuccess(childResponse.data);
      } catch {
        onUploadSuccess(null);
      }
      onClose();
    } catch (err) {
      let errorMessage = t('profile.uploadError', { defaultValue: 'Rasm yuklashda xatolik yuz berdi' });
      if (err.response) {
        if (err.response.status === 403) {
          const serverError = err.response.data?.error || '';
          errorMessage = (serverError.includes('Account not approved') || serverError.includes('Account is not active'))
            ? serverError
            : err.response.data?.error || 'Ruxsat yo\'q. Iltimos, qayta kirib ko\'ring.';
        } else if (err.response.status === 401) {
          errorMessage = 'Sessiya muddati tugagan. Iltimos, qayta kirib ko\'ring.';
          setTimeout(() => { window.location.replace('/login'); }, 2000);
        } else {
          errorMessage = err.response.data?.message || err.response.data?.error || errorMessage;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      toastError(errorMessage);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-surface rounded-2xl p-8 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-6 text-center">Rasm yuklash</h2>
        <div className="space-y-4">
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-brand-500 transition-colors">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
              id="avatar-upload"
            />
            <label
              htmlFor="avatar-upload"
              className={`cursor-pointer flex flex-col items-center gap-4 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {uploading ? (
                <>
                  <LoadingSpinner size="md" />
                  <span className="text-slate-600 font-medium">Yuklanmoqda...</span>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-brand-600" />
                  </div>
                  <div>
                    <p className="text-slate-700 font-semibold mb-1">Galeriyadan rasm tanlang</p>
                    <p className="text-sm text-slate-500">JPG, PNG yoki GIF (maks. 5MB)</p>
                  </div>
                </>
              )}
            </label>
          </div>
        </div>
        <button
          onClick={onClose}
          disabled={uploading}
          className="mt-6 w-full py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('profile.cancel', { defaultValue: 'Bekor qilish' })}
        </button>
      </div>
    </div>
  );
};

export default AvatarUploadModal;
