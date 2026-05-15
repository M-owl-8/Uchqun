import { useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Accessible modal confirmation dialog.
 * Usage: render when `dialog` is non-null; pass null to hide.
 *
 * dialog = { message: string, onConfirm: (reason?: string) => void, requireReason?: boolean }
 */
export default function ConfirmDialog({ dialog, onCancel }) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');

  if (!dialog) return null;

  const handleConfirm = () => {
    dialog.onConfirm(dialog.requireReason ? reason : undefined);
    setReason('');
  };

  const canConfirm = !dialog.requireReason || reason.trim().length > 0;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-modal flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-modal p-6 max-w-sm w-full shadow-xl">
        <p className="text-gray-800 mb-4">{dialog.message}</p>
        {dialog.requireReason && (
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('common.reasonPlaceholder', { defaultValue: 'Enter reason…' })}
            rows={3}
            className="w-full mb-4 px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        )}
        <div className="flex gap-3">
          <button
            onClick={() => { setReason(''); onCancel(); }}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium"
          >
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common.confirm', { defaultValue: 'Confirm' })}
          </button>
        </div>
      </div>
    </div>
  );
}
