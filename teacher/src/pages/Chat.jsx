import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, Pencil, Send, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { loadMessages, addMessage, markRead, updateMessage, deleteMessage } from '../shared/services/chatStore';
import api from '../shared/services/api';
import { useAuth } from '../shared/context/AuthContext';
import { useToast } from '../shared/context/ToastContext';
import { useSocket } from '../shared/context/SocketContext';
import Card from '../shared/components/Card';
import * as cache from '../../../shared/utils/cache';

const Chat = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const { on, off } = useSocket();
  const [parents, setParents] = useState(() => cache.get('teacher:parents') || []);
  const [selectedParent, setSelectedParent] = useState(() => {
    const cached = cache.get('teacher:parents');
    return cached?.length > 0 ? cached[0] : null;
  });
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const messagesWrapRef = useRef(null);
  const justSentRef = useRef(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    const cached = cache.get('teacher:parents');
    const applyList = (list) => {
      setParents(list);
      setSelectedParent(prev => prev ?? (list.length > 0 ? list[0] : null));
    };
    if (cached) {
      applyList(cached);
      // Silent background refresh
      api.get('/teacher/parents')
        .then(res => {
          const list = res.data.parents || [];
          cache.set('teacher:parents', list);
          applyList(list);
        })
        .catch(() => {});
      return;
    }
    api.get('/teacher/parents')
      .then(res => {
        const list = res.data.parents || [];
        cache.set('teacher:parents', list);
        applyList(list);
      })
      .catch(() => toastError(t('chat.loadError', { defaultValue: 'Failed to load parents' })));
  }, [user?.id, toastError, t]);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      if (!selectedParent) return;
      const convoId = `parent:${selectedParent.id}`;
      const msgs = await loadMessages(convoId);
      if (!alive) return;
      setMessages(Array.isArray(msgs) ? msgs : []);
      await markRead(convoId);
    };

    load();

    return () => { alive = false; };
  }, [selectedParent]);

  useEffect(() => {
    if (!selectedParent) return;
    const convoId = `parent:${selectedParent.id}`;

    const handleMessage = async (msg) => {
      if (msg.conversationId !== convoId) return;
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
      );
      await markRead(convoId);
    };

    on('chat:message', handleMessage);
    return () => off('chat:message', handleMessage);
  }, [selectedParent, on, off]);

  const sorted = useMemo(
    () =>
      [...messages].sort(
        (a, b) => new Date(a.createdAt || a.time) - new Date(b.createdAt || b.time)
      ),
    [messages]
  );

  const canModerateDelete = user?.role === 'teacher' || user?.role === 'admin' || user?.role === 'government';

  useEffect(() => {
    if (isAtBottom || justSentRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      justSentRef.current = false;
    }
  }, [sorted.length, isAtBottom]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (!selectedParent) return;
    const convoId = `parent:${selectedParent.id}`;
    await addMessage('teacher', trimmed, convoId);
    justSentRef.current = true;
    const msgs = await loadMessages(convoId);
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
      toastError(t('chat.updateFailed', { defaultValue: 'Failed to update message' }));
    } else {
      toastSuccess(t('chat.updated', { defaultValue: 'Message updated' }));
    }
    if (selectedParent) {
      const convoId = `parent:${selectedParent.id}`;
      const msgs = await loadMessages(convoId);
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
      toastError(t('chat.deleteFailed', { defaultValue: 'Failed to delete message' }));
    } else {
      toastSuccess(t('chat.deleted', { defaultValue: 'Message deleted' }));
    }
    if (selectedParent) {
      const convoId = `parent:${selectedParent.id}`;
      const msgs = await loadMessages(convoId);
      setMessages(Array.isArray(msgs) ? msgs : []);
    }
    setBusyId(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight drop-shadow-sm">{t('chat.title')}</h1>
          <p className="text-white/90 font-medium mt-1 drop-shadow-sm">{t('chat.subtitle')}</p>
        </div>
      </div>

      {/* Parent selector */}
      <div className="bg-white border border-gray-100 rounded-xl p-3 flex gap-3 items-center shadow-sm">
        <span className="text-sm font-medium text-gray-600">{t('chat.parent') || 'Parent'}:</span>
        <select
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          value={selectedParent?.id || ''}
          onChange={(e) => {
            const v = e.target.value;
            const p = parents.find((x) => String(x.id) === String(v));
            setSelectedParent(p || null);
          }}
        >
          {(parents || []).length === 0 && <option value="">{t('chat.empty')}</option>}
          {(parents || []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.firstName} {p.lastName}
            </option>
          ))}
        </select>
      </div>

      <Card className="bg-white/95 backdrop-blur-sm h-[60vh] flex flex-col relative shadow-xl">
        <div
          ref={messagesWrapRef}
          className="flex-1 overflow-y-auto p-4 space-y-3"
          onScroll={(e) => {
            const el = e.currentTarget;
            const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
            setIsAtBottom(distance < 80);
          }}
        >
          {sorted.length === 0 && (
            <div className="text-center text-gray-400 py-8 text-sm">
              {t('chat.empty')}
            </div>
          )}
          {sorted.map((msg) => {
            const isYou = msg.senderRole === 'teacher';
            return (
              <div
                key={msg.id}
                className={`flex ${isYou ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm border ${
                  isYou
                    ? 'bg-primary-50 text-primary-900 border-primary-100'
                    : 'bg-gray-100 text-gray-900 border-gray-200'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-xs font-semibold mb-1">
                      {isYou ? t('chat.you') : t('chat.parent')}
                    </div>
                    {(isYou || canModerateDelete) && (
                      <div className="flex items-center gap-1">
                        {isYou && (
                          <button
                            type="button"
                            className="p-1 rounded-md hover:bg-black/5"
                            aria-label={t('chat.edit', { defaultValue: 'Edit' })}
                            title={t('chat.edit', { defaultValue: 'Edit' })}
                            disabled={busyId === msg.id}
                            onClick={() => {
                              setEditingId(msg.id);
                              setEditValue((msg.content || msg.text || '').toString());
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          className="p-1 rounded-md hover:bg-black/5 text-red-600"
                          aria-label={t('chat.delete', { defaultValue: 'Delete' })}
                          title={t('chat.delete', { defaultValue: 'Delete' })}
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
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                        rows={3}
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
                          onClick={() => {
                            setEditingId(null);
                            setEditValue('');
                          }}
                          disabled={busyId === msg.id}
                        >
                          <X className="w-4 h-4" />
                          {t('cancel', { defaultValue: 'Cancel' })}
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700"
                          onClick={() => handleSaveEdit(msg.id)}
                          disabled={busyId === msg.id || !editValue.trim()}
                        >
                          <Send className="w-4 h-4" />
                          {t('save', { defaultValue: 'Save' })}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap break-words">{msg.content || msg.text}</div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {!isAtBottom && sorted.length > 0 && (
          <button
            type="button"
            className="absolute bottom-16 right-4 w-11 h-11 rounded-full bg-white border border-gray-200 shadow-lg flex items-center justify-center hover:bg-gray-50"
            aria-label={t('chat.scrollToBottom', { defaultValue: 'Scroll to bottom' })}
            title={t('chat.scrollToBottom', { defaultValue: 'Scroll to bottom' })}
            onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
          >
            <ArrowDown className="w-5 h-5 text-gray-700" />
          </button>
        )}

        <div className="border-t border-gray-100 p-3 bg-gray-50 rounded-b-2xl flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('chat.placeholder')}
            className="flex-1 h-12 rounded-xl border border-gray-200 px-4 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            onClick={handleSend}
            className="w-12 h-12 inline-flex items-center justify-center rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-colors"
            aria-label={t('chat.send')}
            title={t('chat.send')}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </Card>

      {confirmDeleteId && (
        <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-200 p-5">
            <div className="text-lg font-bold text-gray-900">
              {t('chat.delete', { defaultValue: 'Delete' })}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {t('chat.confirmDelete', { defaultValue: 'Delete this message?' })}
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
                onClick={() => setConfirmDeleteId(null)}
              >
                {t('cancel', { defaultValue: 'Cancel' })}
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700"
                onClick={async () => {
                  const id = confirmDeleteId;
                  setConfirmDeleteId(null);
                  await handleDelete(id);
                }}
                disabled={busyId === confirmDeleteId}
              >
                {t('chat.delete', { defaultValue: 'Delete' })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;


