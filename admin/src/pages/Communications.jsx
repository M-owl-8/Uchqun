import { useEffect, useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useToast } from '@shared/context/ToastContext';
import { MessageSquare, Search } from 'lucide-react';

const Communications = () => {
  const { t } = useTranslation();
  const { error: toastError } = useToast();
  const toastErrorRef = useRef(toastError);
  toastErrorRef.current = toastError;

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        const [convsRes, parentsRes] = await Promise.all([
          api.get('/chat/conversations', { signal: controller.signal }),
          api.get('/admin/parents', { signal: controller.signal }),
        ]);

        const convsList = convsRes.data || [];
        const parents = parentsRes.data?.data || [];
        const parentMap = Object.fromEntries(parents.map((p) => [p.id, p]));

        const enriched = convsList.map((c) => ({
          ...c,
          parent: parentMap[c.conversationId.replace('parent:', '')] ?? null,
        }));

        setConversations(enriched);
      } catch (err) {
        if (err.code === 'ERR_CANCELED') return;
        toastErrorRef.current(t('communications.loadError', { defaultValue: 'Failed to load conversations' }));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    return () => controller.abort();
  }, [t]);

  const handleSelect = async (conv) => {
    setSelected(conv);
    setLoadingMessages(true);
    try {
      const res = await api.get('/chat/messages', {
        params: { conversationId: conv.conversationId },
      });
      setMessages(res.data || []);
    } catch {
      toastErrorRef.current(t('communications.messagesLoadError', { defaultValue: 'Failed to load messages' }));
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((conv) => {
      const parent = conv.parent;
      const name = parent ? `${parent.firstName ?? ''} ${parent.lastName ?? ''}`.toLowerCase() : '';
      return name.includes(q) || conv.conversationId.toLowerCase().includes(q);
    });
  }, [conversations, searchQuery]);

  const formatTime = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  const parentInitials = (parent) => {
    if (!parent) return '?';
    return `${parent.firstName?.charAt(0) ?? ''}${parent.lastName?.charAt(0) ?? ''}`;
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="letterhead pt-4 mb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-brand-700">
          {t('nav.section.communications', { defaultValue: 'Aloqa' })}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-warm-900">
          {t('communications.title', { defaultValue: 'Muloqotlar' })} ({conversations.length})
        </h1>
        <p className="text-sm text-warm-600 mt-1">
          {t('communications.subtitle', { defaultValue: "Xodim-ota-ona suhbatlarini faqat ko'rish" })}
        </p>
        <p className="text-xs text-info-600 mt-1 font-medium">
          {t('communications.readOnly', { defaultValue: "Faqat o'qish — direktor xabar yubora olmaydi" })}
        </p>
      </div>

      <div className="flex gap-0 border border-warm-200 rounded-lg overflow-hidden" style={{ minHeight: '480px' }}>
        {/* Left panel — conversation list */}
        <div className="w-80 shrink-0 border-r border-warm-200 flex flex-col">
          {/* Search input */}
          <div className="p-3 border-b border-warm-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400" strokeWidth={2} />
              <input
                type="text"
                placeholder={t('communications.search', { defaultValue: "Ota-onani qidirish…" })}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 h-9 text-sm rounded-md border border-warm-200 bg-surface text-warm-900 placeholder:text-warm-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-3 p-4 animate-pulse">
              {[1,2,3].map((i) => <div key={i} className="skel h-14 w-full" />)}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-warm-400">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-40" strokeWidth={1.5} />
              <p className="font-medium">{t('communications.noConversations', { defaultValue: 'No active conversations' })}</p>
              <p className="text-xs mt-1">{t('communications.noConversationsSub', { defaultValue: 'Conversations will appear here once parents and teachers start messaging' })}</p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const parent = conv.parent;
              const isSelected = selected?.conversationId === conv.conversationId;
              return (
                <button
                  key={conv.conversationId}
                  onClick={() => handleSelect(conv)}
                  className={`w-full text-left p-4 border-b border-warm-100 last:border-0 transition-colors ${
                    isSelected ? 'bg-brand-50' : 'hover:bg-warm-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-warm-100 text-warm-800 flex items-center justify-center text-sm font-semibold shrink-0">
                      {parentInitials(parent)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-sm font-medium text-warm-900 truncate">
                          {parent ? `${parent.firstName} ${parent.lastName}` : conv.conversationId}
                        </p>
                        <div className="flex items-center gap-1 shrink-0">
                          {conv.unreadCount > 0 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-brand-600 text-white">
                              {conv.unreadCount}
                            </span>
                          )}
                          {conv.updatedAt && (
                            <span className="text-[10px] text-warm-400 num">{formatTime(conv.updatedAt)}</span>
                          )}
                        </div>
                      </div>
                      {conv.lastMessage && (
                        <p className="text-xs text-warm-500 truncate mt-0.5">
                          {conv.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
          </div>
        </div>

        {/* Right panel — messages */}
        <div className="flex-1 flex flex-col">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-warm-400">
              <div className="text-center">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" strokeWidth={1.5} />
                <p className="text-sm">{t('communications.selectConversation', { defaultValue: 'Select a conversation to view messages' })}</p>
              </div>
            </div>
          ) : loadingMessages ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="space-y-3 w-full px-5 animate-pulse">
                {[1,2,3].map((i) => <div key={i} className="skel h-10 w-3/4" />)}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {messages.map((msg) => {
                const isParent = msg.senderRole === 'parent';
                return (
                  <div key={msg.id} className={`flex flex-col ${isParent ? 'items-start' : 'items-end'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-sm ${
                        isParent
                          ? 'bg-info-50 text-info-700'
                          : 'bg-warm-100 text-warm-700'
                      }`}>
                        {isParent
                          ? t('communications.roleParent', { defaultValue: 'Parent' })
                          : t('communications.roleTeacher', { defaultValue: 'Teacher / Staff' })}
                      </span>
                      <span className="text-[10px] text-warm-400 num">{formatTime(msg.createdAt)}</span>
                    </div>
                    <div className={`max-w-sm px-3 py-2 rounded-lg text-sm ${
                      isParent
                        ? 'bg-warm-100 text-warm-900'
                        : 'bg-brand-50 text-warm-900'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 && (
                <p className="text-sm text-warm-400 text-center py-8">
                  {t('communications.noConversations', { defaultValue: 'No messages yet' })}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Communications;
