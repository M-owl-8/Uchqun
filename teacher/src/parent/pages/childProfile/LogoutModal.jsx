import { AlertCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../../shared/context/ToastContext';

const LogoutModal = ({ show, onClose }) => {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { success: toastSuccess } = useToast();

  if (!show) return null;

  const confirmLogout = () => {
    onClose();
    toastSuccess(t('profile.logoutSuccess', { defaultValue: 'Muvaffaqiyatli chiqildi' }));
    setTimeout(() => {
      logout();
      navigate('/login');
    }, 500);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-full">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              {t('profile.logoutTitle', { defaultValue: 'Chiqish' })}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <p className="text-gray-600 mb-8 text-lg">
          {t('profile.confirmLogout', { defaultValue: 'Chiqishni xohlaysizmi?' })}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors"
          >
            {t('profile.cancel', { defaultValue: 'Yo\'q' })}
          </button>
          <button
            onClick={confirmLogout}
            className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors shadow-md"
          >
            {t('profile.yes', { defaultValue: 'Ha' })}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutModal;
