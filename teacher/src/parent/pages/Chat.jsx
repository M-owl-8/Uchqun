import { useState, useMemo, useEffect, useRef } from 'react';
import { ArrowDown, MessageCircle, Pencil, Send, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { loadMessages, addMessage, markRead, updateMessage, deleteMessage } from '../../shared/services/chatStore';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../../shared/context/ToastContext';
import { useSocket } from '../../shared/context/SocketContext';
import Card from '../components/Card';
// PP-CHAT-INTEGRITY: layout parity with teacher messenger — date separators
// + bubble timestamps via the shared locale-aware formatter (PP-DATE-LOCALE).
import { formatTime, formatDateShort } from '@shared/utils/formatDate';
import ParentPageHeader from '../components/ParentPageHeader';

// Same-day check for date-separator gating.
const isSameDay = (a, b) => {
  if (!a || !b) return false;
  return new Date(a).toDateString() === new Date(b).toDateString();
};

const Chat = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const { on, off } = useSocket();
  const conversationId = user?.id ? `parent:${user.id}` : null;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(!!conversationId);
  const messagesEndRef = useRef(null);
  const messagesWrapRef = useRef(null);
  const justSentRef = useRef(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      if (!conversationId) return;
      setLoadingMessages(true);
      const msgs = await loadMessages(conversationId);
      if (!alive) return;
      setMessages(Array.isArray(msgs) ? msgs : []);
      setLoadingMessages(false);
      await markRead(conversationId);
    };

    const handleMessage = (msg) => {
      if (msg?.conversationId === conversationId) load();
    };

    load();
    on('chat:message', handleMessage);

    return () => {
      alive = false;
      off('chat:message', handleMessage);
    };
  }, [conversationId, on, off]);

  const sorted = useMemo(
    () =>
      [...messages].sort(
        (a, b) => new Date(a.createdAt || a.time) - new Date(b.createdAt || b.time)
      ),
    [messages]
  );

  useEffect(() => {
    if (isAtBottom || justSentRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      justSentRef.current = false;
    }
  }, [sorted.length, isAtBottom]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (!conversationId) return;
    const result = await addMessage('parent', trimmed, conversationId);
    if (!result) {
      toastError(t('chat.sendFailed'));
      return;
    }
    justSentRef.current = true;
    const msgs = await loadMessages(conversationId);
    setMessages(Array.isArray(msgs) ? msgs : []);
    setInput('');
  };

  const handleSaveEdit = async (msgId) => {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    setBusyId(msgId);
    // Optimistic update
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, content: trimmed } : m))
    );

    const updated = await updateMessage(msgId, trimmed);
    if (!updated) {
      toastError(t('chat.updateFailed'));
    } else {
      toastSuccess(t('chat.updated'));
    }
    if (conversationId) {
      const msgs = await loadMessages(conversationId);
      setMessages(Array.isArray(msgs) ? msgs : []);
    }
    setEditingId(null);
    setEditValue('');
    setBusyId(null);
  };

  const handleDelete = async (msgId) => {
    setBusyId(msgId);
    // Optimistic remove
    setMessages((prev) => prev.filter((m) => m.id !== msgId));

    const res = await deleteMessage(msgId);
    if (!res?.success) {
      toastError(t('chat.deleteFailed'));
    } else {
      toastSuccess(t('chat.deleted'));
    }
    if (conversationId) {
      const msgs = await loadMessages(conversationId);
      setMessages(Array.isArray(msgs) ? msgs : []);
    }
    setBusyId(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <ParentPageHeader
        title={t('parentChat.title')}
        subtitle={t('parentChat.subtitle')}
      />

      <Card className="bg-p-surface/95 backdrop-blur-sm h-[calc(100vh-220px)] min-h-[420px] lg:h-[60vh] flex flex-col relative shadow-xl">
        <div
          ref={messagesWrapRef}
          className="flex-1 overflow-y-auto p-4 space-y-3"
          onScroll={(e) => {
            const el = e.currentTarget;
            const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
            setIsAtBottom(distance < 80);
          }}
        >
          {loadingMessages && (
            <div className="flex flex-col gap-2 py-4">
              {[40, 64, 48].map((w, i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                  <div className={`h-8 bg-p-sepia-100 animate-pulse rounded-2xl`} style={{ width: w * 4 }} />
                </div>
              ))}
            </div>
          )}
          {!loadingMessages && sorted.length === 0 && (
            <div className="text-center text-slate-400 py-8 text-sm">
              {t('chat.empty')}
            </div>
          )}
          {sorted.map((msg, idx) => {
            const isYou = msg.senderRole === 'parent';
            const prev = sorted[idx - 1];
            const showSep = !prev || !isSameDay(prev.createdAt || prev.time, msg.createdAt || msg.time);
            return (
              <div key={msg.id}>
                {showSep && (
                  <div className="flex items-center gap-2 my-4" aria-hidden="true">
                    <div className="flex-1 h-px bg-p-sepia-100" />
                    <span className="text-[10px] uppercase tracking-[.12em] text-p-sepia-500 shrink-0">
                      {formatDateShort(msg.createdAt || msg.time, i18n.language)}
                    </span>
                    <div className="flex-1 h-px bg-p-sepia-100" />
                  </div>
                )}
                <div className={`flex ${isYou ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm border ${
                  isYou
                    ? 'bg-p-sepia-50 text-p-ink border-p-sepia-200'
                    : 'bg-slate-100 text-slate-900 border-slate-200'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-xs font-semibold mb-1">
                      {isYou ? t('chat.you') : t('chat.teacher')}
                    </div>
                    {isYou && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="p-1 rounded-md hover:bg-black/5"
                          aria-label={t('chat.edit')}
                          title={t('chat.edit')}
                          disabled={busyId === msg.id}
                          onClick={() => {
                            setEditingId(msg.id);
                            setEditValue((msg.content || msg.text || '').toString());
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          className="p-1 rounded-md hover:bg-black/5 text-error-600"
                          aria-label={t('chat.delete')}
                          title={t('chat.delete')}
                          disabled={busyId === msg.id}
                          onClick={() => setConfirmDeleteId(msg.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {editingId === msg.id ? (
                    <div className="mt-2 space-y-2">
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-p-brand-500 focus:border-transparent bg-p-surface"
                        rows={3}
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
                          onClick={() => {
                            setEditingId(null);
                            setEditValue('');
                          }}
                          disabled={busyId === msg.id}
                        >
                          <X className="w-4 h-4" />
                          {t('cancel')}
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-p-brand-600 text-white hover:bg-p-brand-700"
                          onClick={() => handleSaveEdit(msg.id)}
                          disabled={busyId === msg.id || !editValue.trim()}
                        >
                          <Send className="w-4 h-4" />
                          {t('save')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="whitespace-pre-wrap break-words">{msg.content || msg.text}</div>
                      <div className={`text-[10px] mt-1 ${isYou ? 'text-p-sepia-500 text-right' : 'text-slate-500'}`}>
                        {formatTime(msg.createdAt || msg.time, i18n.language)}
                      </div>
                    </>
                  )}
                </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {!isAtBottom && sorted.length > 0 && (
          <button
            type="button"
            className="absolute bottom-16 right-4 w-11 h-11 rounded-full bg-p-surface border border-slate-200 shadow-lg flex items-center justify-center hover:bg-slate-50"
            aria-label={t('chat.scrollToBottom')}
            title={t('chat.scrollToBottom')}
            onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
          >
            <ArrowDown className="w-5 h-5 text-slate-700" />
          </button>
        )}

        <div className="border-t border-slate-100 p-3 bg-slate-50 rounded-b-2xl flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('parentChat.placeholder')}
            className="flex-1 h-12 rounded-xl border border-slate-200 px-4 focus:ring-2 focus:ring-p-brand-500 focus:border-transparent"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            onClick={handleSend}
            className="w-12 h-12 inline-flex items-center justify-center rounded-xl bg-p-brand-600 text-white hover:bg-p-brand-700 transition-colors"
            aria-label={t('chat.send')}
            title={t('chat.send')}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </Card>

      {confirmDeleteId && (
        <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-p-surface rounded-2xl shadow-xl border border-slate-200 p-5">
            <div className="text-lg font-bold text-slate-900">
              {t('chat.delete')}
            </div>
            <div className="text-sm text-slate-600 mt-1">
              {t('chat.confirmDelete')}
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
                onClick={() => setConfirmDeleteId(null)}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-error-600 text-white hover:bg-error-700"
                onClick={async () => {
                  const id = confirmDeleteId;
                  setConfirmDeleteId(null);
                  await handleDelete(id);
                }}
                disabled={busyId === confirmDeleteId}
              >
                {t('chat.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;

