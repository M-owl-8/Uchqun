import { Menu, Crown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const TopBar = ({ onMenuClick }) => {
  const { t } = useTranslation();
  return (
    <div className="fixed top-0 left-0 right-0 h-16 bg-gradient-to-r from-primary-600 to-primary-500 z-50 flex items-center justify-between px-4 shadow-md">
      <button
        onClick={onMenuClick}
        className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
        aria-label="Menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      <div className="flex items-center gap-2">
        <Crown className="w-5 h-5 text-yellow-300" />
        <span className="text-white font-bold text-lg">{t('sidebar.title', { defaultValue: 'Uchqun Admin' })}</span>
      </div>
    </div>
  );
};

export default TopBar;

