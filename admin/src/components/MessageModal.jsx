import { useState } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const MessageModal = ({ onClose }) => {
  const { t } = useTranslation();
  const { success, error: showError } = useToast();
  const [messageSubject, setMessageSubject] = useState('');
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const handleSendMessage = async () => {
    if (!messageSubject.trim() || !messageText.trim()) {
      showError(t('messageModal.validationError', { defaultValue: "Subject va xabar to'ldirilishi kerak" }));
      return;
    }

    setSendingMessage(true);
    try {
      await api.post('/admin/message-to-government', {
        subject: messageSubject.trim(),
        message: messageText.trim(),
      });
      success(t('messageModal.sent', { defaultValue: 'Xabar muvaffaqiyatli yuborildi' }));
      setMessageSubject('');
      setMessageText('');
      if (onClose) onClose();
    } catch (error) {
      showError(error.response?.data?.error || t('messageModal.sendError', { defaultValue: 'Xabar yuborishda xatolik' }));
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => {
      if (onClose) onClose();
    }}>
      <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-full">
              <MessageSquare className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{t('messageModal.title', { defaultValue: 'Davlatga xabar yuborish' })}</h2>
          </div>
          <button
            onClick={() => {
              if (onClose) onClose();
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('messageModal.subject', { defaultValue: 'Mavzu' })}</label>
            <input
              type="text"
              value={messageSubject}
              onChange={(e) => setMessageSubject(e.target.value)}
              placeholder={t('messageModal.subjectPlaceholder', { defaultValue: 'Xabar mavzusi...' })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('messageModal.message', { defaultValue: 'Xabar' })}</label>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={6}
              placeholder={t('messageModal.messagePlaceholder', { defaultValue: 'Xabaringizni yozing...' })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              if (onClose) onClose();
            }}
            className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors"
            disabled={sendingMessage}
          >
            {t('messageModal.cancel', { defaultValue: 'Bekor qilish' })}
          </button>
          <button
            onClick={handleSendMessage}
            disabled={sendingMessage || !messageSubject.trim() || !messageText.trim()}
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {sendingMessage ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{t('messageModal.sending', { defaultValue: 'Yuborilmoqda...' })}</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>{t('messageModal.send', { defaultValue: 'Yuborish' })}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageModal;
