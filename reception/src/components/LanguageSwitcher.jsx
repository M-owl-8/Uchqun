import { useTranslation } from 'react-i18next';
import SharedLanguageSwitcher from '../../../shared/components/LanguageSwitcher';

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  return (
    <SharedLanguageSwitcher
      value={i18n.language || 'uz'}
      onChange={(e) => { i18n.changeLanguage(e.target.value); localStorage.setItem('lang', e.target.value); }}
      wrapperClassName="inline-flex items-center gap-2 bg-surface text-slate-700 rounded-lg px-2 py-1 shadow-sm border border-slate-200"
      selectClassName="bg-transparent text-sm font-semibold focus:outline-none cursor-pointer"
      label={t('language', 'Select language')}
    />
  );
};

export default LanguageSwitcher;
