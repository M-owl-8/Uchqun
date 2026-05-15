import { useTranslation } from 'react-i18next';
import SharedLanguageSwitcher from '../../../shared/components/LanguageSwitcher';

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  return (
    <SharedLanguageSwitcher
      value={i18n.language || 'uz'}
      onChange={(e) => { i18n.changeLanguage(e.target.value); localStorage.setItem('lang', e.target.value); }}
      label={t('language', 'Select language')}
    />
  );
};

export default LanguageSwitcher;
