import { useTranslation } from 'react-i18next';
import SharedLanguageSwitcher from '../../../../shared/components/LanguageSwitcher';

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  return (
    <SharedLanguageSwitcher
      value={i18n.language || 'uz'}
      onChange={(e) => { i18n.changeLanguage(e.target.value); localStorage.setItem('dnp:lang', e.target.value); }}
      selectClassName="px-2 py-1 text-xs border border-p-sepia-200 rounded-lg bg-p-surface focus:outline-none focus:ring-2 focus:ring-p-brand-500"
      label={t('language', 'Select language')}
    />
  );
};

export default LanguageSwitcher;
