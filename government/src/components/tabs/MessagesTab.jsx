import { Check, Send } from 'lucide-react';
import Card from '@shared/components/Card';
import Button from '@shared/components/Button';
import Modal from '@shared/components/Modal';
import Textarea from '@shared/components/Textarea';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import { useTranslation } from 'react-i18next';

export default function MessagesTab({
  messages, loadingMessages,
  selectedMessage, replyText, replying,
  onMarkRead, onSelectMessage, onReply,
  setReplyText,
}) {
  const { t } = useTranslation();

  const closeReply = () => { onSelectMessage(null); setReplyText(''); };

  return (
    <>
      <div className="text-center">
        <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
          {t('government.messagesTitle', { defaultValue: 'Xabarlar' })}
        </h2>
        <p className="text-gray-600 font-medium">{t('government.messagesSubtitle', { defaultValue: 'Foydalanuvchilardan kelgan xabarlar' })}</p>
      </div>

      <Card className="p-6 space-y-4">
        {loadingMessages ? (
          <div className="flex items-center justify-center min-h-[120px]">
            <LoadingSpinner size="sm" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-gray-600">{t('government.messagesEmpty', { defaultValue: "Xabarlar yo'q" })}</p>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`border rounded-xl p-4 hover:shadow-sm transition-shadow ${!msg.isRead ? 'border-brand-300 bg-brand-50' : 'border-gray-100'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900">{msg.subject}</h3>
                      {!msg.isRead && <span className="px-2 py-0.5 text-xs font-semibold rounded bg-brand-500 text-white">{t('government.new', { defaultValue: 'Yangi' })}</span>}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{msg.message}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{msg.sender?.firstName} {msg.sender?.lastName} ({msg.sender?.role})</span>
                      <span>{new Date(msg.createdAt).toLocaleString()}</span>
                    </div>
                    {msg.reply && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-xs font-semibold text-green-700 mb-1">{t('government.reply', { defaultValue: 'Javob' })}:</p>
                        <p className="text-sm text-gray-700">{msg.reply}</p>
                        <p className="text-xs text-gray-500 mt-1">{new Date(msg.repliedAt).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {!msg.isRead && (
                      <Button variant="ghost" size="sm" onClick={() => onMarkRead(msg.id, true)}>
                        <Check className="w-3 h-3 mr-1" />
                        {t('government.markRead', { defaultValue: "O'qildi" })}
                      </Button>
                    )}
                    {!msg.reply && (
                      <Button variant="ghost" size="sm" onClick={() => onSelectMessage(msg)}>
                        <Send className="w-3 h-3 mr-1" />
                        {t('government.reply', { defaultValue: 'Javob berish' })}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        isOpen={!!selectedMessage}
        onClose={closeReply}
        title={selectedMessage ? `${t('government.replyTo', { defaultValue: 'Javob berish' })}: ${selectedMessage.subject}` : ''}
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={closeReply} disabled={replying}>
              {t('government.cancel', { defaultValue: 'Bekor qilish' })}
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => onReply(selectedMessage?.id)}
              disabled={replying || !replyText.trim()}
              loading={replying}
            >
              <Send className="w-4 h-4 mr-1" />
              {t('government.send', { defaultValue: 'Yuborish' })}
            </Button>
          </div>
        }
      >
        <Textarea
          label={t('government.replyText', { defaultValue: 'Javob' })}
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          rows={6}
          placeholder={t('government.replyPlaceholder', { defaultValue: 'Javobingizni yozing...' })}
        />
      </Modal>
    </>
  );
}
