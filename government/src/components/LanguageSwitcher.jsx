import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SharedLanguageSwitcher from '../../../shared/components/LanguageSwitcher';
import { changeLanguage } from '../i18n';

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  return (
    <SharedLanguageSwitcher
      value={i18n.language || 'uz'}
      onChange={(e) => changeLanguage(e.target.value)}
      icon={Globe}
      label={t('language', 'Select language')}
    />
  );
};

export default LanguageSwitcher;
