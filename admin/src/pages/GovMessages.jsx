import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useToast } from '@shared/context/ToastContext';
import { Plus, X } from 'lucide-react';

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

  const closeCompose = () => { setComposing(false); setSubject(''); setBody(''); };

  const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString() : '';
  const formatDateTime = (iso) => iso ? new Date(iso).toLocaleString() : '';

  return (
    <div className="page-fade-in h-full flex flex-col">
      {/* Header */}
      <div className="letterhead pt-4 flex items-end justify-between flex-wrap gap-4 mb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-brand-700">
            {t('nav.section.communications', { defaultValue: 'Aloqa' })}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-warm-900">
            {t('govMessages.title', { defaultValue: 'Hukumatga xabarlar' })} ({messages.length})
          </h1>
          <p className="text-sm text-warm-600 mt-1">
            {t('govMessages.subtitle', { defaultValue: 'Davlat nazorat organiga murojaatlar' })}
          </p>
        </div>
        <button
          onClick={() => setComposing(true)}
          className="inline-flex items-center gap-2 h-10 px-4 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-walnut-text rounded-md shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          {t('govMessages.compose', { defaultValue: 'Yangi xabar' })}
        </button>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        {/* Sent list */}
        <div className="w-72 shrink-0 flex flex-col border border-warm-200 rounded-lg overflow-hidden shadow-xs">
          <div className="px-4 py-3 bg-warm-50 border-b border-warm-200 text-xs font-medium uppercase tracking-wider text-warm-500">
            {t('govMessages.sent', { defaultValue: 'Yuborilgan' })}
          </div>

          {loading && (
            <div className="flex-1 flex items-center justify-center text-warm-400 text-sm">
              {t('govMessages.loading', { defaultValue: 'Yuklanmoqda…' })}
            </div>
          )}

          {!loading && messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-warm-400 text-sm gap-2 p-6 text-center">
              <p className="text-sm font-medium text-warm-600">{t('govMessages.empty', { defaultValue: "Hali xabar yuborilmagan" })}</p>
              <p className="text-xs text-warm-400">{t('govMessages.emptyHint', { defaultValue: 'Yuqoridagi + tugmani bosib birinchi xabarni yuboring.' })}</p>
            </div>
          )}

          {!loading && messages.length > 0 && (
            <div className="flex-1 overflow-y-auto divide-y divide-warm-100">
              {messages.map(msg => (
                <button
                  key={msg.id}
                  onClick={() => setSelected(msg)}
                  className={`w-full text-left px-4 py-3 hover:bg-warm-50 transition-colors ${
                    selected?.id === msg.id ? 'bg-brand-50/60 border-l-[3px] border-brand-600' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-sm font-medium text-warm-900 truncate flex-1">
                      {msg.subject}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-sm font-medium shrink-0 ${
                      msg.reply
                        ? 'bg-success-50 text-success-700 border border-success-100'
                        : 'bg-warning-50 text-warning-700 border border-warning-100'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${msg.reply ? 'bg-success-600' : 'bg-warning-500'}`} />
                      {msg.reply
                        ? t('govMessages.badge.replied', { defaultValue: 'Javob berildi' })
                        : t('govMessages.badge.pending', { defaultValue: 'Kutilmoqda' })}
                    </span>
                  </div>
                  <p className="text-xs text-warm-400">{formatDate(msg.createdAt)}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Thread view */}
        <div className="flex-1 border border-warm-200 rounded-lg overflow-hidden flex flex-col shadow-xs">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-warm-400 gap-2">
              <p className="text-sm">{t('govMessages.selectPrompt', { defaultValue: 'Xabarni tanlang' })}</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {/* Metadata */}
              <div className="pb-4 border-b border-warm-100">
                <h2 className="text-lg font-semibold text-warm-900 mb-2">{selected.subject}</h2>
                <div className="flex items-center gap-4 text-xs text-warm-500">
                  <span>{t('govMessages.sent', { defaultValue: 'Yuborilgan' })}: {formatDateTime(selected.createdAt)}</span>
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm font-medium ${
                    selected.reply
                      ? 'bg-success-50 text-success-700 border border-success-100'
                      : 'bg-warning-50 text-warning-700 border border-warning-100'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${selected.reply ? 'bg-success-600' : 'bg-warning-500'}`} />
                    {selected.reply
                      ? t('govMessages.badge.replied', { defaultValue: 'Javob berildi' })
                      : t('govMessages.badge.pending', { defaultValue: 'Kutilmoqda' })}
                  </span>
                </div>
              </div>

              {/* Your message */}
              <div className="bg-warm-50 border border-warm-200 rounded-md p-4">
                <p className="text-xs font-medium text-warm-500 mb-2">
                  {t('govMessages.yourMessage', { defaultValue: 'Sizning xabaringiz' })}
                </p>
                <p className="text-sm text-warm-800 whitespace-pre-wrap">{selected.message}</p>
              </div>

              {/* Government reply */}
              {selected.reply && (
                <div className="bg-brand-50 border border-brand-100 rounded-md p-4">
                  <p className="text-xs font-medium text-brand-700 mb-2">
                    {t('govMessages.govReply', { defaultValue: 'Davlat javobi' })}
                    {selected.repliedAt && (
                      <span className="ml-2 font-normal text-brand-400">
                        · {formatDateTime(selected.repliedAt)}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-warm-800 whitespace-pre-wrap">{selected.reply}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Compose modal */}
      {composing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-warm-200">
              <h2 className="text-base font-semibold text-warm-900">
                {t('govMessages.composeTitle', { defaultValue: 'Hukumatga yangi xabar' })}
              </h2>
              <button onClick={closeCompose} className="p-1 text-warm-400 hover:text-warm-700 rounded-md">
                <X className="w-5 h-5" strokeWidth={1.75} />
              </button>
            </div>
            <form onSubmit={handleCompose} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-warm-800 mb-1.5">
                  {t('govMessages.subjectLabel', { defaultValue: 'Mavzu' })} <span className="text-error-600">*</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  maxLength={255}
                  required
                  placeholder={t('govMessages.subjectPlaceholder', { defaultValue: 'Mavzuni kiriting' })}
                  className="w-full border border-warm-300 rounded-md px-3 py-2 text-sm bg-surface text-warm-900 placeholder:text-warm-400 focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-warm-800 mb-1.5">
                  {t('govMessages.bodyLabel', { defaultValue: 'Xabar' })} <span className="text-error-600">*</span>
                </label>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  maxLength={10000}
                  required
                  rows={6}
                  placeholder={t('govMessages.bodyPlaceholder', { defaultValue: 'Xabaringizni kiriting' })}
                  className="w-full border border-warm-300 rounded-md px-3 py-2 text-sm bg-surface text-warm-900 placeholder:text-warm-400 focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600 resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeCompose}
                  className="inline-flex items-center h-9 px-4 text-sm font-medium text-warm-700 bg-surface border border-warm-300 hover:bg-warm-50 rounded-md transition-colors"
                >
                  {t('govMessages.cancel', { defaultValue: 'Bekor qilish' })}
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex items-center h-9 px-4 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-walnut-text rounded-md shadow-xs transition-colors disabled:opacity-50"
                >
                  {sending
                    ? t('govMessages.sending', { defaultValue: 'Yuborilmoqda…' })
                    : t('govMessages.send', { defaultValue: 'Yuborish' })}
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
