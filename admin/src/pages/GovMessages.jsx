import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useToast } from '@shared/context/ToastContext';
import { Mail, X } from 'lucide-react';

const GovMessages = () => {
  const { t } = useTranslation();
  const { success: toastSuccess, error: toastError } = useToast();
  const toastSuccessRef = useRef(toastSuccess);
  toastSuccessRef.current = toastSuccess;
  const toastErrorRef = useRef(toastError);
  toastErrorRef.current = toastError;

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [composing, setComposing] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    api.get('/admin/messages', { signal: controller.signal })
      .then(res => setMessages(res.data?.data ?? []))
      .catch(err => {
        if (err.code === 'ERR_CANCELED') return;
        toastErrorRef.current(t('govMessages.loadError', { defaultValue: 'Failed to load messages' }));
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [t]);

  const handleCompose = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    try {
      const res = await api.post('/admin/message-to-government', { subject: subject.trim(), message: body.trim() });
      const created = res.data?.data ?? res.data;
      setMessages(prev => [created, ...prev]);
      setComposing(false);
      setSubject('');
      setBody('');
      toastSuccessRef.current(t('govMessages.sendSuccess', { defaultValue: 'Message sent successfully' }));
    } catch {
      toastErrorRef.current(t('govMessages.sendError', { defaultValue: 'Failed to send message' }));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Mail className="w-6 h-6 text-brand-600" />
          <h1 className="text-2xl font-bold text-gray-900">
            {t('govMessages.title', { defaultValue: 'Messages to Government' })}
          </h1>
        </div>
        <button
          onClick={() => setComposing(true)}
          className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          {t('govMessages.compose', { defaultValue: 'New Message' })}
        </button>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        {/* Sent list */}
        <div className="w-80 flex-shrink-0 flex flex-col border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
            {t('govMessages.sent', { defaultValue: 'Sent' })}
          </div>

          {loading && (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              {t('govMessages.loading', { defaultValue: 'Loading…' })}
            </div>
          )}

          {!loading && messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
              <Mail className="w-8 h-8 opacity-30" />
              <p>{t('govMessages.empty', { defaultValue: 'No messages sent yet' })}</p>
            </div>
          )}

          {!loading && messages.length > 0 && (
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {messages.map(msg => (
                <button
                  key={msg.id}
                  onClick={() => setSelected(msg)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                    selected?.id === msg.id ? 'bg-brand-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 truncate flex-1 mr-2">
                      {msg.subject}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
                      msg.reply
                        ? 'bg-success-100 text-success-700'
                        : 'bg-warning-100 text-warning-700'
                    }`}>
                      {msg.reply
                        ? t('govMessages.badge.replied', { defaultValue: 'Replied' })
                        : t('govMessages.badge.pending', { defaultValue: 'Pending' })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {new Date(msg.createdAt).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Thread view */}
        <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden flex flex-col">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
              <Mail className="w-10 h-10 opacity-30" />
              <p className="text-sm">{t('govMessages.selectPrompt', { defaultValue: 'Select a message to view' })}</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">{selected.subject}</h2>
                <p className="text-xs text-gray-400">
                  {t('govMessages.sent', { defaultValue: 'Sent' })}: {new Date(selected.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                  {t('govMessages.yourMessage', { defaultValue: 'Your message' })}
                </p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{selected.message}</p>
              </div>
              {selected.reply && (
                <div className="bg-brand-50 border border-brand-200 rounded-lg p-4">
                  <p className="text-xs font-medium text-brand-600 mb-2 uppercase tracking-wide">
                    {t('govMessages.govReply', { defaultValue: "Government's reply" })}
                    {selected.repliedAt && (
                      <span className="ml-2 normal-case font-normal text-brand-400">
                        · {new Date(selected.repliedAt).toLocaleString()}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{selected.reply}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Compose modal */}
      {composing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {t('govMessages.composeTitle', { defaultValue: 'New Message to Government' })}
              </h2>
              <button onClick={() => { setComposing(false); setSubject(''); setBody(''); }}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <form onSubmit={handleCompose} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('govMessages.subjectLabel', { defaultValue: 'Subject' })}
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  maxLength={255}
                  required
                  placeholder={t('govMessages.subjectPlaceholder', { defaultValue: 'Enter subject' })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('govMessages.bodyLabel', { defaultValue: 'Message' })}
                </label>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  maxLength={10000}
                  required
                  rows={6}
                  placeholder={t('govMessages.bodyPlaceholder', { defaultValue: 'Enter your message' })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setComposing(false); setSubject(''); setBody(''); }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  {t('govMessages.cancel', { defaultValue: 'Cancel' })}
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {sending
                    ? t('govMessages.sending', { defaultValue: 'Sending…' })
                    : t('govMessages.send', { defaultValue: 'Send' })}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GovMessages;
