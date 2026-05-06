import { Check, Send, X } from 'lucide-react';
import Card from '../Card';
import { useTranslation } from 'react-i18next';

export default function MessagesTab({
  messages, loadingMessages,
  selectedMessage, replyText, replying,
  onMarkRead, onSelectMessage, onReply,
  setReplyText,
}) {
  const { t } = useTranslation();
  return (
    <>
      <div className="text-center">
        <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
          {t('superAdmin.messagesTitle', { defaultValue: 'Xabarlar' })}
        </h2>
        <p className="text-gray-600 font-medium">{t('superAdmin.messagesSubtitle', { defaultValue: 'Foydalanuvchilardan kelgan xabarlar' })}</p>
      </div>

      <Card className="p-6 space-y-4">
        {loadingMessages ? (
          <div className="flex items-center justify-center min-h-[120px]">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-gray-600">{t('superAdmin.messagesEmpty', { defaultValue: "Xabarlar yo'q" })}</p>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`border rounded-xl p-4 hover:shadow-sm transition-shadow ${!msg.isRead ? 'border-primary-300 bg-primary-50' : 'border-gray-100'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900">{msg.subject}</h3>
                      {!msg.isRead && <span className="px-2 py-0.5 text-xs font-semibold rounded bg-primary-500 text-white">{t('superAdmin.new', { defaultValue: 'Yangi' })}</span>}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{msg.message}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{msg.sender?.firstName} {msg.sender?.lastName} ({msg.sender?.role})</span>
                      <span>{new Date(msg.createdAt).toLocaleString()}</span>
                    </div>
                    {msg.reply && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-xs font-semibold text-green-700 mb-1">{t('superAdmin.reply', { defaultValue: 'Javob' })}:</p>
                        <p className="text-sm text-gray-700">{msg.reply}</p>
                        <p className="text-xs text-gray-500 mt-1">{new Date(msg.repliedAt).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {!msg.isRead && (
                      <button onClick={() => onMarkRead(msg.id, true)} className="px-3 py-1 text-xs font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                        <Check className="w-3 h-3 inline mr-1" />
                        {t('superAdmin.markRead', { defaultValue: "O'qildi" })}
                      </button>
                    )}
                    {!msg.reply && (
                      <button onClick={() => onSelectMessage(msg)} className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                        <Send className="w-3 h-3 inline mr-1" />
                        {t('superAdmin.reply', { defaultValue: 'Javob berish' })}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">{t('superAdmin.replyTo', { defaultValue: 'Javob berish' })}: {selectedMessage.subject}</h3>
              <button onClick={() => { onSelectMessage(null); setReplyText(''); }} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('superAdmin.replyText', { defaultValue: 'Javob' })}</label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={6}
                  placeholder={t('superAdmin.replyPlaceholder', { defaultValue: 'Javobingizni yozing...' })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => { onSelectMessage(null); setReplyText(''); }} disabled={replying} className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors">
                  {t('superAdmin.cancel', { defaultValue: 'Bekor qilish' })}
                </button>
                <button
                  onClick={() => onReply(selectedMessage.id)}
                  disabled={replying || !replyText.trim()}
                  className="flex-1 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {replying ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Send className="w-4 h-4" /><span>{t('superAdmin.send', { defaultValue: 'Yuborish' })}</span></>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
