import { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, MessageSquare, Search, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../shared/services/api';
import { useAuth } from '../shared/context/AuthContext';
import { useSocket } from '../shared/context/SocketContext';
import { useToast } from '../shared/context/ToastContext';
import * as cache from '../../../shared/utils/cache';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(dateStr, lang) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleTimeString(lang || 'en', {
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
  } catch { return ''; }
}

function formatDate(dateStr, lang) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString(lang || 'en', {
      day: 'numeric', month: 'short',
    });
  } catch { return ''; }
}

function isSameDay(a, b) {
  if (!a || !b) return false;
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function getInitials(p) {
  if (!p) return '?';
  return `${(p.firstName || '').charAt(0)}${(p.lastName || '').charAt(0)}`.toUpperCase() || '?';
}

const AVATAR_BG = { background: '#7A6FA8', color: '#fff' };

// ── Component ─────────────────────────────────────────────────────────────────

const Chat = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { on, off } = useSocket();
  const { error: showError } = useToast();

  const [parents, setParents] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedParentId, setSelectedParentId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState('');
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Load parents (names + children) + conversations in parallel
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [parentsRes, convosRes] = await Promise.all([
          api.get('/teacher/parents'),
          api.get('/chat/conversations'),
        ]);
        if (!alive) return;
        const parentList = parentsRes.data?.parents || [];
        const convoList = Array.isArray(convosRes.data) ? convosRes.data : [];
        cache.set('teacher:parents', parentList);
        setParents(parentList);
        // Left panel: all assigned parents, conversation data overlaid where available
        const convoMap = {};
        convoList.forEach(c => {
          const pid = c.conversationId?.replace('parent:', '');
          if (pid) convoMap[pid] = c;
        });
        const merged = parentList.map(p => ({
          conversationId: `parent:${p.id}`,
          lastMessage: convoMap[String(p.id)]?.lastMessage || null,
          unreadCount: convoMap[String(p.id)]?.unreadCount || 0,
          updatedAt: convoMap[String(p.id)]?.updatedAt || null,
        }));
        // Sort: recent conversations first, then alphabetically by name
        merged.sort((a, b) => {
          if (a.updatedAt && b.updatedAt) return new Date(b.updatedAt) - new Date(a.updatedAt);
          if (a.updatedAt) return -1;
          if (b.updatedAt) return 1;
          const pa = parentList.find(p => String(p.id) === a.conversationId.replace('parent:', ''));
          const pb = parentList.find(p => String(p.id) === b.conversationId.replace('parent:', ''));
          return `${pa?.firstName} ${pa?.lastName}`.localeCompare(`${pb?.firstName} ${pb?.lastName}`);
        });
        setConversations(merged);
        if (merged.length > 0) {
          const firstId = merged[0].conversationId.replace('parent:', '');
          setSelectedParentId(prev => prev ?? firstId);
        }
      } catch {
        // network failure — empty state shown below
      } finally {
        if (alive) setLoadingConvos(false);
      }
    };
    load();
    return () => { alive = false; };
  }, [user?.id]);

  // Load messages when selected conversation changes
  useEffect(() => {
    if (!selectedParentId) return;
    const convoId = `parent:${selectedParentId}`;
    let alive = true;
    setLoadingMessages(true);
    setMessages([]);
    api.get('/chat/messages', { params: { conversationId: convoId, limit: 200 } })
      .then(res => {
        if (!alive) return;
        setMessages(Array.isArray(res.data) ? res.data : []);
        // mark this conversation read
        api.post('/chat/read', { conversationId: convoId })
          .then(() => {
            setConversations(prev =>
              prev.map(c => c.conversationId === convoId ? { ...c, unreadCount: 0 } : c)
            );
          })
          .catch(() => {});
      })
      .catch(() => { if (alive) setMessages([]); })
      .finally(() => { if (alive) setLoadingMessages(false); });
    return () => { alive = false; };
  }, [selectedParentId]);

  // Scroll to bottom when thread grows
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Socket: incoming message
  useEffect(() => {
    const handle = (msg) => {
      const msgConvoId = msg.conversationId;
      const activeConvoId = selectedParentId ? `parent:${selectedParentId}` : null;
      const isActiveConvo = msgConvoId === activeConvoId;

      if (isActiveConvo) {
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
        api.post('/chat/read', { conversationId: msgConvoId }).catch(() => {});
      }

      setConversations(prev => prev.map(c => {
        if (c.conversationId !== msgConvoId) return c;
        return {
          ...c,
          lastMessage: msg,
          updatedAt: msg.createdAt,
          unreadCount: isActiveConvo ? 0 : (c.unreadCount || 0) + 1,
        };
      }));
    };
    on('chat:message', handle);
    return () => off('chat:message', handle);
  }, [selectedParentId, on, off]);

  // Derived state
  const parentMap = useMemo(() => {
    const m = {};
    parents.forEach(p => { m[String(p.id)] = p; });
    return m;
  }, [parents]);

  const sorted = useMemo(() =>
    [...messages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
    [messages]
  );

  const filteredConvos = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(c => {
      const pid = c.conversationId.replace('parent:', '');
      const p = parentMap[pid];
      if (!p) return false;
      return `${p.firstName} ${p.lastName}`.toLowerCase().includes(q);
    });
  }, [conversations, parentMap, search]);

  const selectedParent = selectedParentId ? parentMap[String(selectedParentId)] : null;

  // Send message
  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || !selectedParentId || sending) return;
    setSending(true);
    const convoId = `parent:${selectedParentId}`;
    try {
      const res = await api.post('/chat/messages', { conversationId: convoId, content: trimmed });
      const msg = res.data;
      setMessages(prev => [...prev, msg]);
      setConversations(prev => prev.map(c =>
        c.conversationId === convoId
          ? { ...c, lastMessage: msg, updatedAt: msg.createdAt }
          : c
      ));
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch {
      showError(t('chat.sendFailed', { defaultValue: 'Xabar yuborishda xatolik' }));
    } finally {
      setSending(false);
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const selectConversation = (pid) => {
    setSelectedParentId(pid);
    setSearch('');
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    // Bust out of Layout padding to fill the full content area
    <div
      className="-mx-4 sm:-mx-6 -mt-6 -mb-8 flex overflow-hidden border-t border-slate-200"
      style={{ height: 'calc(100vh - 56px)' }}
    >
      {/* ── LEFT PANEL: conversation list ───────────────────────────────── */}
      <div
        className={`${
          selectedParentId ? 'hidden md:flex' : 'flex'
        } md:w-[300px] w-full flex-col shrink-0 border-r border-slate-200 bg-surface`}
      >
        {/* Panel header */}
        <div className="px-4 py-3 border-b border-slate-100 shrink-0">
          <div className="text-[15px] font-semibold text-slate-900">
            {t('chat.title', { defaultValue: 'Ota-onalar bilan muloqot' })}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {t('chat.subtitle', { defaultValue: "Guruhingiz ota-onalari bilan yozishmalar" })}
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-slate-100 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('chat.searchParents', { defaultValue: "Ota-ona qidirish..." })}
              className="w-full pl-8 pr-3 h-8 rounded-lg border border-slate-200 text-[12px] bg-paper focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Conversation rows */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvos ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-3 border-b border-slate-50">
                <div className="w-9 h-9 rounded-full bg-slate-200 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-200 animate-pulse rounded w-28" />
                  <div className="h-2.5 bg-slate-200 animate-pulse rounded w-36" />
                </div>
              </div>
            ))
          ) : filteredConvos.length === 0 ? (
            <div className="py-14 text-center text-[12px] text-slate-400">
              {t('chat.noConversations', { defaultValue: "Suhbatlar yo'q" })}
            </div>
          ) : (
            filteredConvos.map(convo => {
              const pid = convo.conversationId.replace('parent:', '');
              const p = parentMap[pid];
              const isActive = pid === String(selectedParentId);
              const lastText = convo.lastMessage?.content || '';
              const lastTime = convo.updatedAt ? formatTime(convo.updatedAt, i18n.language) : '';

              return (
                <button
                  key={convo.conversationId}
                  type="button"
                  onClick={() => selectConversation(pid)}
                  className="w-full text-left flex items-center gap-3 px-3 py-3 border-b border-slate-50 transition-colors"
                  style={{ background: isActive ? 'rgba(122,111,168,.12)' : 'transparent' }}
                >
                  <div
                    className="w-9 h-9 rounded-full shrink-0 grid place-items-center text-[12px] font-semibold"
                    style={AVATAR_BG}
                  >
                    {getInitials(p)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[13px] font-medium text-slate-900 truncate">
                        {p ? `${p.firstName} ${p.lastName}` : pid}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">{lastTime}</span>
                    </div>
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <span className="text-[11px] text-slate-500 truncate">
                        {lastText || t('chat.noMessages', { defaultValue: "Xabar yo'q" })}
                      </span>
                      {convo.unreadCount > 0 && (
                        <span
                          className="shrink-0 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-semibold grid place-items-center"
                          style={{ background: '#9A5045', color: '#fff' }}
                        >
                          {convo.unreadCount > 9 ? '9+' : convo.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL: thread ──────────────────────────────────────────── */}
      {!selectedParentId ? (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center gap-3 text-slate-400 bg-paper">
          <MessageSquare className="w-10 h-10 opacity-25" strokeWidth={1.5} />
          <span className="text-[14px]">
            {t('chat.selectConversation', { defaultValue: "Suhbat tanlang" })}
          </span>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-w-0 bg-paper">
          {/* Thread header */}
          <div
            className="shrink-0 border-b border-slate-200 px-4 flex items-center gap-3 bg-surface"
            style={{ height: 56 }}
          >
            {/* Mobile back button */}
            <button
              type="button"
              className="md:hidden mr-1 text-brand-600 flex items-center gap-1 text-[13px]"
              onClick={() => setSelectedParentId(null)}
              aria-label={t('chat.back', { defaultValue: 'Orqaga' })}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div
              className="w-8 h-8 rounded-full grid place-items-center text-[11px] font-semibold shrink-0"
              style={AVATAR_BG}
            >
              {getInitials(selectedParent)}
            </div>
            <div className="min-w-0">
              <div className="text-[14px] font-semibold text-slate-900 truncate">
                {selectedParent
                  ? `${selectedParent.firstName} ${selectedParent.lastName}`
                  : selectedParentId}
              </div>
              {selectedParent?.children?.length > 0 && (
                <div className="text-[11px] text-slate-500 truncate">
                  {selectedParent.children
                    .map(c => `${c.firstName} ${c.lastName}`)
                    .join(', ')}
                </div>
              )}
            </div>
          </div>

          {/* Message area */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {loadingMessages ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                    <div className="h-9 w-44 bg-slate-200 animate-pulse rounded-2xl" />
                  </div>
                ))}
              </div>
            ) : sorted.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[13px] text-slate-400">
                {t('chat.empty', { defaultValue: "Hozircha xabarlar yo'q" })}
              </div>
            ) : (
              sorted.map((msg, idx) => {
                const isYou = msg.senderRole === 'teacher';
                const prev = sorted[idx - 1];
                const showSep = !prev || !isSameDay(prev.createdAt, msg.createdAt);

                return (
                  <div key={msg.id}>
                    {showSep && (
                      <div className="flex items-center gap-2 my-4">
                        <div className="flex-1 h-px bg-slate-200" />
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatDate(msg.createdAt, i18n.language)}
                        </span>
                        <div className="flex-1 h-px bg-slate-200" />
                      </div>
                    )}
                    <div className={`flex mb-1.5 ${isYou ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[68%] rounded-2xl px-3 py-2 text-[13px] ${
                          isYou
                            ? 'bg-brand-600 text-white rounded-br-sm'
                            : 'bg-surface border border-slate-100 text-slate-900 rounded-bl-sm'
                        }`}
                      >
                        <div className="whitespace-pre-wrap break-words leading-relaxed">
                          {msg.content}
                        </div>
                        <div
                          className={`text-[9px] mt-0.5 ${
                            isYou ? 'text-white/60 text-right' : 'text-slate-400'
                          }`}
                        >
                          {formatTime(msg.createdAt, i18n.language)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Composer pinned to bottom */}
          <div className="shrink-0 border-t border-slate-200 p-3 bg-surface flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              placeholder={t('chat.placeholder', { defaultValue: 'Xabar yozing...' })}
              rows={1}
              className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-surface leading-5"
              style={{ maxHeight: 120, overflowY: 'auto', minHeight: 40 }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="w-10 h-10 rounded-xl grid place-items-center bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-40 shrink-0"
              aria-label={t('chat.send', { defaultValue: 'Yuborish' })}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
