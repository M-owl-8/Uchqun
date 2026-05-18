import { useCallback, useEffect, useState } from 'react';
import { Check, Send, Trash2, Search, ChevronDown, ChevronUp } from 'lucide-react';
import Card from '@shared/components/Card';
import Button from '@shared/components/Button';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import { useTranslation } from 'react-i18next';
import { useToast } from '@shared/context/ToastContext';
import api from '../../services/api';

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function MessagesTab({ onUnreadCountChange }) {
  const { t } = useTranslation();
  const { success, error: showError } = useToast();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loadingMore, setLoadingMore] = useState(false);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);

  const [expandedId, setExpandedId] = useState(null);
  const [replyTexts, setReplyTexts] = useState({});
  const [replying, setReplying] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const fetchMessages = useCallback(async (page = 1, append = false) => {
    try {
      if (page === 1) setLoading(true);
      else setLoadingMore(true);
      setLoadError(false);

      const params = { page, limit: 20 };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

      const res = await api.get('/government/messages', { params });
      const incoming = res.data?.data || [];
      const pg = res.data?.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 };

      setMessages(prev => append ? [...prev, ...incoming] : incoming);
      setPagination(pg);

      const unread = (append
        ? [...(append ? messages : []), ...incoming]
        : incoming
      ).filter(m => !m.isRead).length;
      onUnreadCountChange?.(unread);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchMessages(1, false);
  }, [fetchMessages]);

  const handleMarkRead = async (msgId) => {
    try {
      await api.put(`/government/messages/${msgId}/read`, { isRead: true });
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isRead: true, readAt: new Date().toISOString() } : m));
      onUnreadCountChange?.(messages.filter(m => !m.isRead && m.id !== msgId).length);
    } catch {
      showError(t('platform.markReadFailed', { defaultValue: 'Belgilab bo\'lmadi' }));
    }
  };

  const handleReply = async (msgId) => {
    const text = (replyTexts[msgId] || '').trim();
    if (!text) return;
    setReplying(msgId);
    try {
      await api.post(`/government/messages/${msgId}/reply`, { reply: text });
      success(t('government.replySent', { defaultValue: 'Javob yuborildi' }));
      setReplyTexts(prev => ({ ...prev, [msgId]: '' }));
      await fetchMessages(1, false);
    } catch (err) {
      showError(err.response?.data?.error || t('government.replyError', { defaultValue: 'Javob yuborishda xatolik' }));
    } finally {
      setReplying(null);
    }
  };

  const handleDelete = async (msgId) => {
    if (!window.confirm(t('government.confirmDeleteMessage', { defaultValue: 'Xabarni o\'chirishni tasdiqlaysizmi?' }))) return;
    setDeleting(msgId);
    try {
      await api.delete(`/government/messages/${msgId}`);
      success(t('government.messageDeleted', { defaultValue: 'Xabar o\'chirildi' }));
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch (err) {
      showError(err.response?.data?.error || t('government.deleteError', { defaultValue: 'O\'chirishda xatolik' }));
    } finally {
      setDeleting(null);
    }
  };

  const allReplies = (msg) => {
    const childReplies = msg.replies || [];
    // Show old-style single reply (legacy) if no child records exist
    if (childReplies.length === 0 && msg.reply) {
      return [{
        id: `legacy-${msg.id}`,
        message: msg.reply,
        createdAt: msg.repliedAt || msg.updatedAt,
        sender: { firstName: t('government.governmentLabel', { defaultValue: 'Government' }), lastName: '', role: 'government' },
        _legacy: true,
      }];
    }
    return childReplies;
  };

  return (
    <>
      <div className="text-center">
        <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
          {t('government.messagesTitle', { defaultValue: 'Xabarlar' })}
        </h2>
        <p className="text-gray-600 font-medium">
          {t('government.messagesSubtitle', { defaultValue: 'Foydalanuvchilardan kelgan xabarlar' })}
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('government.searchMessages', { defaultValue: 'Xabarlarni qidirish...' })}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <Card className="p-6 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center min-h-[120px]">
            <LoadingSpinner size="sm" />
          </div>
        ) : loadError ? (
          <div className="py-8 text-center">
            <p className="text-sm text-red-600 mb-2">{t('government.loadError', { defaultValue: 'Yuklab bo\'lmadi' })}</p>
            <Button variant="secondary" size="sm" onClick={() => fetchMessages(1, false)}>
              {t('warnings.retry', { defaultValue: 'Qayta urinish' })}
            </Button>
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-gray-600 py-4 text-center">
            {search
              ? t('government.noSearchResults', { defaultValue: 'Topilmadi' })
              : t('government.messagesEmpty', { defaultValue: "Xabarlar yo'q" })}
          </p>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const replies = allReplies(msg);
              const isExpanded = expandedId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`border rounded-xl p-4 transition-shadow ${
                    !msg.isRead ? 'border-brand-300 bg-brand-50' : 'border-gray-100 hover:shadow-sm'
                  }`}
                >
                  {/* Message header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-gray-900 truncate">{msg.subject}</h3>
                        {!msg.isRead && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-brand-500 text-white shrink-0">
                            {t('government.new', { defaultValue: 'Yangi' })}
                          </span>
                        )}
                        {replies.length > 0 && (
                          <span className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-700 shrink-0">
                            {replies.length} {t('government.replies', { defaultValue: 'javob' })}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{msg.message}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{msg.sender?.firstName} {msg.sender?.lastName} ({msg.sender?.role})</span>
                        <span>{new Date(msg.createdAt).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {!msg.isRead && (
                        <Button variant="ghost" size="sm" onClick={() => handleMarkRead(msg.id)}>
                          <Check className="w-3 h-3 mr-1" />
                          {t('government.markRead', { defaultValue: "O'qildi" })}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedId(isExpanded ? null : msg.id)}
                      >
                        {isExpanded ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
                        {isExpanded
                          ? t('government.collapse', { defaultValue: 'Yopish' })
                          : t('government.reply', { defaultValue: 'Javob' })}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(msg.id)}
                        disabled={deleting === msg.id}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        {t('government.delete', { defaultValue: "O'chirish" })}
                      </Button>
                    </div>
                  </div>

                  {/* Thread (expanded) */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                      {replies.map((r) => (
                        <div key={r.id} className="flex gap-2">
                          <div className="w-1 rounded bg-green-300 shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-0.5">
                              <span className="font-medium">{r.sender?.firstName} {r.sender?.lastName}</span>
                              <span className="text-gray-400">·</span>
                              <span>{r.sender?.role}</span>
                              <span className="text-gray-400">·</span>
                              <span>{new Date(r.createdAt).toLocaleString()}</span>
                            </div>
                            <p className="text-sm text-gray-700">{r.message}</p>
                          </div>
                        </div>
                      ))}

                      {/* Reply input */}
                      <div className="flex gap-2 pt-2">
                        <textarea
                          value={replyTexts[msg.id] || ''}
                          onChange={e => setReplyTexts(prev => ({ ...prev, [msg.id]: e.target.value }))}
                          rows={2}
                          placeholder={t('government.replyPlaceholder', { defaultValue: 'Javobingizni yozing...' })}
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                        <button
                          onClick={() => handleReply(msg.id)}
                          disabled={replying === msg.id || !(replyTexts[msg.id] || '').trim()}
                          className="px-3 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors shrink-0"
                          aria-label={t('government.send', { defaultValue: 'Yuborish' })}
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Load more */}
        {!loading && !loadError && pagination.page < pagination.totalPages && (
          <div className="pt-2 text-center">
            <Button
              variant="secondary"
              onClick={() => fetchMessages(pagination.page + 1, true)}
              loading={loadingMore}
            >
              {t('government.loadMore', { defaultValue: 'Ko\'proq yuklash' })}
              {` (${pagination.total - messages.length})`}
            </Button>
          </div>
        )}
      </Card>
    </>
  );
}
