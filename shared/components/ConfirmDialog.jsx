import { useTranslation } from 'react-i18next';

/**
 * Accessible modal confirmation dialog.
 * Usage: render when `dialog` is non-null; pass null to hide.
 *
 * dialog = { message: string, onConfirm: () => void }
 */
export default function ConfirmDialog({ dialog, onCancel }) {
  const { t } = useTranslation();
  if (!dialog) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
        <p className="text-gray-800 mb-6">{dialog.message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </button>
          <button
            onClick={dialog.onConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            {t('common.confirm', { defaultValue: 'Confirm' })}
          </button>
        </div>
      </div>
    </div>
  );
}
