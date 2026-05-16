import LoadingSpinner from '@shared/components/LoadingSpinner';
import { useTranslation } from 'react-i18next';
import { MessageSquare, X } from 'lucide-react';

const MessagesModal = ({ myMessages, loadingMessages, onClose }) => {
  const { t, i18n } = useTranslation();
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-surface rounded-3xl p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-success-100 rounded-full">
              <MessageSquare className="w-6 h-6 text-success-600" />
            </div>
            <h2 className="text-2xl font-bold text-warm-900">{t('settings.myMessages', { defaultValue: 'Mening xabarlarim' })}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-warm-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-warm-500" />
          </button>
        </div>

        {loadingMessages ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="md" />
          </div>
        ) : myMessages.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 text-warm-300 mx-auto mb-4" />
            <p className="text-warm-500">{t('settings.noMessages', { defaultValue: 'Hozircha xabarlar yo\'q' })}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {myMessages.map((msg) => (
              <div key={msg.id} className="border border-warm-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-warm-900 text-lg">{msg.subject}</h3>
                    <p className="text-sm text-warm-500 mt-1">
                      {new Date(msg.createdAt).toLocaleDateString(i18n.language, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  {msg.reply && (
                    <span className="px-3 py-1 bg-success-100 text-success-700 rounded-full text-xs font-semibold">
                      {t('settings.replied', { defaultValue: 'Javob berildi' })}
                    </span>
                  )}
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium text-warm-700 mb-2">{t('settings.yourMessage', { defaultValue: 'Sizning xabaringiz' })}:</p>
                  <p className="text-warm-800 bg-warm-50 rounded-lg p-4 whitespace-pre-wrap">{msg.message}</p>
                </div>

                {msg.reply && (
                  <div className="border-t border-warm-200 pt-4 mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-2 bg-brand-100 rounded-full">
                        <MessageSquare className="w-4 h-4 text-brand-600" />
                      </div>
                      <p className="text-sm font-medium text-brand-700">{t('settings.governmentReply', { defaultValue: 'Davlat javobi' })}</p>
                      <span className="text-xs text-warm-500 ml-auto">
                        {new Date(msg.repliedAt).toLocaleDateString(i18n.language, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="text-warm-800 bg-brand-50 rounded-lg p-4 whitespace-pre-wrap">{msg.reply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesModal;
