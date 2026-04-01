import { api } from './api';

export async function loadMessages(conversationId) {
  if (!conversationId) return [];
  try {
    const res = await api.get('/chat/messages', { params: { conversationId, limit: 200 } });
    return Array.isArray(res.data) ? res.data : [];
  } catch (e) {
    if (__DEV__) console.warn('loadMessages error', e?.response?.status, e?.response?.data);
    return [];
  }
}

export async function addMessage(author, text, conversationId) {
  if (!conversationId) return null;
  try {
    const res = await api.post('/chat/messages', { conversationId, content: text });
    return res.data;
  } catch (e) {
    if (__DEV__) console.warn('addMessage error', e?.response?.status, e?.response?.data);
    return null;
  }
}

export async function markRead(conversationId) {
  if (!conversationId) return;
  try {
    await api.post('/chat/read', { conversationId });
  } catch (e) {
    if (__DEV__) console.warn('markRead error', e?.response?.status);
  }
}

export async function getUnreadCount(conversationId, role = 'parent') {
  const msgs = await loadMessages(conversationId);
  return msgs.filter((m) => {
    if (role === 'parent') return m.senderRole !== 'parent' && !m.readByParent;
    return m.senderRole !== 'teacher' && !m.readByTeacher;
  }).length;
}

export async function getUnreadTotalForPrefix(prefix = 'parent:', role = 'teacher') {
  // Not implemented for server-side yet; fallback to zero
  return 0;
}

export async function listConversations() {
  return [];
}

export async function updateMessage(messageId, content) {
  if (!messageId) return null;
  if (!content?.trim()) return null;
  try {
    const res = await api.put(`/chat/messages/${messageId}`, { content: content.trim() });
    return res.data;
  } catch (e) {
    if (__DEV__) console.warn('updateMessage error', e?.response?.status, e?.response?.data);
    return null;
  }
}

export async function deleteMessage(messageId) {
  if (!messageId) return null;
  try {
    const res = await api.delete(`/chat/messages/${messageId}`);
    return res.data;
  } catch (e) {
    if (__DEV__) console.warn('deleteMessage error', e?.response?.status, e?.response?.data);
    return null;
  }
}
