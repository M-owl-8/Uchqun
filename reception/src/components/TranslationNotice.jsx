import { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const STORAGE_KEY = 'reception_translation_notice_dismissed';

const TranslationNotice = () => {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(STORAGE_KEY) === '1'
  );

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setDismissed(true);
  };

  return (
    <div
      role="status"
      data-testid="translation-notice"
      className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-3 text-sm text-amber-800"
    >
      <span className="flex-1">
        {t('common.translationNotice', {
          defaultValue:
            'Translations on this platform are AI-generated and may contain errors. Professional review is in progress.',
        })}
      </span>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={t('common.dismiss', { defaultValue: 'Dismiss' })}
        className="shrink-0 p-1 rounded hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-amber-500"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
};

export default TranslationNotice;
