import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LanguageSwitcher = ({
  showGlobe = false,
  selectClassName = 'px-2 py-1 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500',
  wrapperClassName = '',
}) => {
  const { i18n, t } = useTranslation();
  const current = i18n.language || 'uz';

  const handleChange = (e) => {
    i18n.changeLanguage(e.target.value);
    localStorage.setItem('lang', e.target.value);
  };

  const select = (
    <select
      value={current}
      onChange={handleChange}
      className={selectClassName}
      aria-label={t('language', 'Select language')}
    >
      <option value="uz">UZ</option>
      <option value="ru">RU</option>
      <option value="en">EN</option>
    </select>
  );

  if (showGlobe || wrapperClassName) {
    return (
      <div className={wrapperClassName || 'flex items-center gap-2'}>
        {showGlobe && <Globe className="w-4 h-4 text-gray-600" />}
        {select}
      </div>
    );
  }

  return select;
};

export default LanguageSwitcher;
