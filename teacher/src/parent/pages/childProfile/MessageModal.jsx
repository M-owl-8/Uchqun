import { useState } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../shared/context/ToastContext';
import api from '../../services/api';

const MessageModal = ({ show, onClose, onSent }) => {
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();
  const { t } = useTranslation();

  if (!show) return null;

  const handleSend = async () => {
    if (!subject.trim() || !text.trim()) {
      toastError(t('profile.messageRequired', { defaultValue: 'Subject va xabar to\'ldirilishi kerak' }));
      return;
    }
    setSending(true);
    try {
      await api.post('/parent/message-to-government', {
        subject: subject.trim(),
        message: text.trim(),
      });
      toastSuccess(t('profile.messageSent', { defaultValue: 'Xabar muvaffaqiyatli yuborildi' }));
      setSubject('');
      setText('');
      onClose();
      const response = await api.get('/parent/messages');
      onSent(response.data.data || []);
    } catch (error) {
      toastError(error.response?.data?.error || t('profile.messageError', { defaultValue: 'Xabar yuborishda xatolik' }));
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand-100 rounded-full">
              <MessageSquare className="w-6 h-6 text-brand-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              {t('profile.contactGovernment', { defaultValue: 'Davlatga xabar yuborish' })}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('profile.subject', { defaultValue: 'Mavzu' })}
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t('profile.subjectPlaceholder', { defaultValue: 'Xabar mavzusi...' })}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('profile.message', { defaultValue: 'Xabar' })}
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              placeholder={t('profile.messagePlaceholder', { defaultValue: 'Xabaringizni yozing...' })}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
            disabled={sending}
          >
            {t('profile.cancel', { defaultValue: 'Bekor qilish' })}
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !subject.trim() || !text.trim()}
            className="flex-1 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {sending ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{t('profile.sending', { defaultValue: 'Yuborilmoqda...' })}</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>{t('profile.send', { defaultValue: 'Yuborish' })}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageModal;
