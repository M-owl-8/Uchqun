import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function NotFound() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-4">
      <h1 className="text-6xl font-bold text-gray-300">{t('page404.heading', { defaultValue: '404' })}</h1>
      <p className="text-xl text-gray-500">{t('page404.message', { defaultValue: 'Page not found' })}</p>
      <button
        onClick={() => navigate('/government')}
        className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
      >
        {t('page404.goBack', { defaultValue: 'Go Back' })}
      </button>
    </div>
  );
}
