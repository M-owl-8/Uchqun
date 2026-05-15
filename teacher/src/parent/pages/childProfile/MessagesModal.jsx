import { MessageSquare, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../../components/LoadingSpinner';

const MessagesModal = ({ show, onClose, messages, loadingMessages }) => {
  const { t, i18n } = useTranslation();

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-full">
              <MessageSquare className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              {t('profile.myMessages', { defaultValue: 'Mening xabarlarim' })}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {loadingMessages ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="md" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">{t('profile.noMessages', { defaultValue: 'Hozircha xabarlar yo\'q' })}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{msg.subject}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(msg.createdAt).toLocaleDateString(i18n.language, {
                        year: 'numeric', month: 'long', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {msg.reply && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                      {t('profile.replied', { defaultValue: 'Javob berildi' })}
                    </span>
                  )}
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    {t('profile.yourMessage', { defaultValue: 'Sizning xabaringiz' })}:
                  </p>
                  <p className="text-gray-800 bg-gray-50 rounded-lg p-4 whitespace-pre-wrap">{msg.message}</p>
                </div>

                {msg.reply && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-2 bg-primary-100 rounded-full">
                        <MessageSquare className="w-4 h-4 text-primary-600" />
                      </div>
                      <p className="text-sm font-medium text-primary-700">
                        {t('profile.governmentReply', { defaultValue: 'Davlat javobi' })}
                      </p>
                      <span className="text-xs text-gray-500 ml-auto">
                        {new Date(msg.repliedAt).toLocaleDateString(i18n.language, {
                          year: 'numeric', month: 'long', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-gray-800 bg-primary-50 rounded-lg p-4 whitespace-pre-wrap">{msg.reply}</p>
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
