import { useTranslation } from 'react-i18next';
import { MessageSquare, X, Send } from 'lucide-react';

const MessageModal = ({ messageSubject, setMessageSubject, messageText, setMessageText, sendingMessage, onSend, onClose }) => {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-surface rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand-100 rounded-full">
              <MessageSquare className="w-6 h-6 text-brand-600" />
            </div>
            <h2 className="text-2xl font-bold text-warm-900">{t('settings.sendToGovernment', { defaultValue: 'Davlatga xabar' })}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-warm-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-warm-500" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-warm-700 mb-2">{t('settings.subject', { defaultValue: 'Mavzu' })}</label>
            <input
              type="text"
              value={messageSubject}
              onChange={(e) => setMessageSubject(e.target.value)}
              placeholder={t('settings.subjectPlaceholder', { defaultValue: 'Xabar mavzusi...' })}
              className="w-full px-4 py-3 border border-warm-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-warm-700 mb-2">{t('settings.message', { defaultValue: 'Xabar' })}</label>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={6}
              placeholder={t('settings.messagePlaceholder', { defaultValue: 'Xabaringizni yozing...' })}
              className="w-full px-4 py-3 border border-warm-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-warm-100 hover:bg-warm-200 text-warm-700 rounded-xl font-semibold transition-colors"
            disabled={sendingMessage}
          >
            {t('settings.cancel', { defaultValue: 'Bekor qilish' })}
          </button>
          <button
            onClick={onSend}
            disabled={sendingMessage || !messageSubject.trim() || !messageText.trim()}
            className="flex-1 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {sendingMessage ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{t('settings.sending', { defaultValue: 'Yuborilmoqda...' })}</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>{t('settings.send', { defaultValue: 'Yuborish' })}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageModal;
