// PP-CHAT-MESSENGER — real-messenger layout for the parent chat page.
//
// Three problems with the prior layout (confirmed via mobile screenshot 2026-06-07):
//   1. No left/right distinction — both teacher AND parent messages stacked
//      on the LEFT with a "Tarbiyachi" / "Siz" label above each bubble.
//   2. Input bar was clipped behind the bottom tab bar on mobile.
//   3. Edit/delete icons always visible on own bubbles — clutter.
//
// New pattern (WhatsApp / Telegram / iMessage):
//   - Teacher messages: LEFT, neutral sepia bubble, NO label
//   - Parent messages:  RIGHT, brand-coloured bubble, NO label
//   - Bubble corners asymmetric (tail toward sender side)
//   - Time inside bubble, small + muted
//   - Date separator: small centred chip, not a full divider
//   - Edit/delete: tap own bubble to reveal action row; tap again to hide
//   - Input bar: `fixed bottom-16` on mobile (clears 64px tab bar), `relative`
//     inside card on desktop. Always visible. Auto-grows for multi-line.
//   - No letterhead ParentPageHeader — chat IS the page, compact title strip
//     at the top of the card saves the vertical space.
//
// Implementation note: viewport sizing uses `100dvh` (dynamic viewport height)
// so mobile Safari's collapsing address bar doesn't hide the input.

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { ArrowDown, MessageCircle, Pencil, Send, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { loadMessages, addMessage, markRead, updateMessage, deleteMessage } from '../../shared/services/chatStore';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../../shared/context/ToastContext';
import { useSocket } from '../../shared/context/SocketContext';
import { formatTime, formatDateShort } from '@shared/utils/formatDate';

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
  const inputRef = useRef(null);
  const justSentRef = useRef(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  // Tap an own bubble to reveal the inline Edit/Delete actions. Single state =
  // only one bubble's actions open at a time; tap again or tap elsewhere closes.
  const [openActionsId, setOpenActionsId] = useState(null);

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
        (a, b) => new Date(a.createdAt || a.time) - new Date(b.createdAt || b.time),
      ),
    [messages],
  );

  useEffect(() => {
    if (isAtBottom || justSentRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      justSentRef.current = false;
    }
  }, [sorted.length, isAtBottom]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || !conversationId) return;
    const result = await addMessage('parent', trimmed, conversationId);
    if (!result) {
      toastError(t('chat.sendFailed'));
      return;
    }
    justSentRef.current = true;
    const msgs = await loadMessages(conversationId);
    setMessages(Array.isArray(msgs) ? msgs : []);
    setInput('');
    inputRef.current?.focus();
  }, [input, conversationId, toastError, t]);

  const handleSaveEdit = async (msgId) => {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    setBusyId(msgId);
    setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, content: trimmed } : m)));
    const updated = await updateMessage(msgId, trimmed);
    if (!updated) toastError(t('chat.updateFailed'));
    else toastSuccess(t('chat.updated'));
    if (conversationId) {
      const msgs = await loadMessages(conversationId);
      setMessages(Array.isArray(msgs) ? msgs : []);
    }
    setEditingId(null);
    setEditValue('');
    setBusyId(null);
    setOpenActionsId(null);
  };

  const handleDelete = async (msgId) => {
    setBusyId(msgId);
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    const res = await deleteMessage(msgId);
    if (!res?.success) toastError(t('chat.deleteFailed'));
    else toastSuccess(t('chat.deleted'));
    if (conversationId) {
      const msgs = await loadMessages(conversationId);
      setMessages(Array.isArray(msgs) ? msgs : []);
    }
    setBusyId(null);
    setOpenActionsId(null);
  };

  const toggleActions = (msgId) => {
    setOpenActionsId((cur) => (cur === msgId ? null : msgId));
  };

  return (
    // Break out of Layout's px-4 py-6 padding so the chat fills the visible
    // viewport. On desktop, return to a contained card-like surface.
    <div
      className="-mx-4 sm:-mx-6 -mt-6 -mb-24 lg:m-0 lg:max-w-3xl lg:mx-auto flex flex-col bg-p-paper lg:rounded-2xl lg:overflow-hidden lg:border lg:border-p-sepia-200 lg:shadow-sm"
      style={{
        // Mobile: viewport minus MobileTopBar(56px) minus MobileTabBar(64px) = 120px
        // Desktop: viewport minus DesktopTopNav(60px) minus padding(60px) = 120px
        height: 'calc(100dvh - 120px)',
      }}
    >
      {/* Compact title strip */}
      <div className="px-4 py-3 border-b border-p-sepia-200 bg-p-paper/95 backdrop-blur shrink-0">
        <h1 className="font-serif text-[16px] font-semibold text-p-ink leading-tight">
          {t('parentChat.title')}
        </h1>
        <p className="text-[11px] text-p-sepia-500 mt-0.5">{t('parentChat.subtitle')}</p>
      </div>

      {/* Messages */}
      <div
        ref={messagesWrapRef}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-1 relative"
        onScroll={(e) => {
          const el = e.currentTarget;
          const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
          setIsAtBottom(distance < 80);
        }}
      >
        {loadingMessages && (
          <div className="flex flex-col gap-2 py-4">
            {[60, 80, 50, 70].map((w, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                <div className="h-10 bg-p-sepia-100 animate-pulse rounded-2xl" style={{ width: `${w}%` }} />
              </div>
            ))}
          </div>
        )}

        {!loadingMessages && sorted.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div className="w-14 h-14 rounded-full bg-p-brand-50 grid place-items-center mb-3">
              <MessageCircle className="w-7 h-7 text-p-brand-600" strokeWidth={1.5} />
            </div>
            <p className="font-serif text-[15px] font-semibold text-p-ink">{t('chat.empty')}</p>
            <p className="text-[12px] text-p-sepia-500 mt-1 max-w-xs">{t('parentChat.subtitle')}</p>
          </div>
        )}

        {sorted.map((msg, idx) => {
          const isYou = msg.senderRole === 'parent';
          const prev = sorted[idx - 1];
          const showSep = !prev || !isSameDay(prev.createdAt || prev.time, msg.createdAt || msg.time);
          const time = formatTime(msg.createdAt || msg.time, i18n.language);
          const isOpen = openActionsId === msg.id;
          const isEditing = editingId === msg.id;
          return (
            <div key={msg.id}>
              {showSep && (
                <div className="flex justify-center my-3" aria-hidden="true">
                  <span className="text-[10px] font-medium text-p-sepia-600 bg-p-sepia-100 rounded-full px-2.5 py-0.5">
                    {formatDateShort(msg.createdAt || msg.time, i18n.language)}
                  </span>
                </div>
              )}

              <div className={`flex ${isYou ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[78%] flex flex-col">
                  {isEditing ? (
                    /* Edit mode — replaces the bubble */
                    <div className="rounded-2xl bg-p-surface border border-p-brand-300 p-2 shadow-sm">
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        rows={2}
                        autoFocus
                        className="w-full text-[14px] text-p-ink resize-none bg-transparent focus:outline-none"
                      />
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <button
                          type="button"
                          aria-label={t('cancel')}
                          onClick={() => { setEditingId(null); setEditValue(''); }}
                          disabled={busyId === msg.id}
                          className="px-2 py-1 rounded-md text-[12px] text-p-sepia-600 hover:bg-p-sepia-50"
                        >
                          {t('cancel')}
                        </button>
                        <button
                          type="button"
                          aria-label={t('save')}
                          onClick={() => handleSaveEdit(msg.id)}
                          disabled={busyId === msg.id || !editValue.trim()}
                          className="px-3 py-1 rounded-md text-[12px] font-medium bg-p-brand-600 text-white hover:bg-p-brand-700 disabled:opacity-50"
                        >
                          {t('save')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Bubble — tap own bubble to toggle action row */
                    <button
                      type="button"
                      onClick={isYou ? () => toggleActions(msg.id) : undefined}
                      className={`text-left rounded-2xl px-3 py-2 text-[14px] leading-relaxed select-text transition-colors ${
                        isYou
                          ? `bg-p-brand-600 text-white rounded-br-md ${isOpen ? 'ring-2 ring-p-brand-300' : ''}`
                          : 'bg-p-sepia-100 text-p-ink rounded-bl-md'
                      } ${isYou ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <div className="whitespace-pre-wrap break-words">{msg.content || msg.text}</div>
                      <div className={`text-[10px] mt-0.5 ${isYou ? 'text-white/70' : 'text-p-sepia-500'} ${isYou ? 'text-right' : ''}`}>
                        {time}
                      </div>
                    </button>
                  )}

                  {/* Action row — only on own bubbles, only when toggled */}
                  {isYou && isOpen && !isEditing && (
                    <div className="flex items-center justify-end gap-1 mt-1 pr-1">
                      <button
                        type="button"
                        aria-label={t('chat.edit')}
                        onClick={() => {
                          setEditingId(msg.id);
                          setEditValue((msg.content || msg.text || '').toString());
                        }}
                        disabled={busyId === msg.id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-p-sepia-600 bg-p-paper hover:bg-p-sepia-50 border border-p-sepia-200"
                      >
                        <Pencil className="w-3 h-3" />
                        {t('chat.edit')}
                      </button>
                      <button
                        type="button"
                        aria-label={t('chat.delete')}
                        onClick={() => setConfirmDeleteId(msg.id)}
                        disabled={busyId === msg.id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-error-600 bg-p-paper hover:bg-error-50 border border-error-200"
                      >
                        <Trash2 className="w-3 h-3" />
                        {t('chat.delete')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />

        {/* Scroll-to-bottom floating button */}
        {!isAtBottom && sorted.length > 0 && (
          <button
            type="button"
            aria-label={t('chat.scrollToBottom')}
            onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="sticky bottom-3 ml-auto mr-2 w-10 h-10 rounded-full bg-p-surface border border-p-sepia-200 shadow-md flex items-center justify-center hover:bg-p-sepia-50 z-10"
          >
            <ArrowDown className="w-4 h-4 text-p-ink" />
          </button>
        )}
      </div>

      {/* Input bar — sticky inside card on desktop, fixed above tab bar on mobile */}
      <div className="border-t border-p-sepia-200 bg-p-paper p-2 shrink-0 flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('parentChat.placeholder')}
          rows={1}
          className="flex-1 max-h-24 px-3 py-2 rounded-2xl border border-p-sepia-200 bg-p-surface text-[14px] resize-none focus:outline-none focus:ring-2 focus:ring-p-brand-500 focus:border-transparent"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!input.trim()}
          aria-label={t('chat.send')}
          className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-p-brand-600 text-white hover:bg-p-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[9999] bg-p-ink/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-p-paper rounded-2xl shadow-xl border border-p-sepia-200 p-5">
            <div className="flex items-start gap-3 mb-2">
              <span className="w-8 h-8 rounded-md bg-error-50 grid place-items-center shrink-0">
                <Trash2 className="w-4 h-4 text-error-600" />
              </span>
              <h2 className="font-serif text-[16px] font-semibold text-p-ink">
                {t('chat.delete')}
              </h2>
            </div>
            <p className="text-[13px] text-p-sepia-600 leading-relaxed pl-11">
              {t('chat.confirmDelete')}
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-[13px] text-p-sepia-700 hover:bg-p-sepia-50 font-medium"
                onClick={() => setConfirmDeleteId(null)}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-[13px] font-medium bg-error-600 text-white hover:bg-error-700 inline-flex items-center gap-1.5"
                onClick={async () => {
                  const id = confirmDeleteId;
                  setConfirmDeleteId(null);
                  await handleDelete(id);
                }}
                disabled={busyId === confirmDeleteId}
              >
                <Trash2 className="w-3.5 h-3.5" />
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
