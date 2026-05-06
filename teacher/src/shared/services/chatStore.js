import api from './api';

export async function loadMessages(conversationId) {
  if (!conversationId) return [];
  try {
    const res = await api.get('/chat/messages', { params: { conversationId, limit: 200 } });
    return Array.isArray(res.data) ? res.data : [];
  } catch (e) {
    return [];
  }
}

export async function addMessage(author, text, conversationId) {
  if (!conversationId) return [];
  try {
    const res = await api.post('/chat/messages', { conversationId, content: text });
    return res.data;
  } catch (e) {
    return null;
  }
}

export async function markRead(conversationId) {
  if (!conversationId) return;
  try {
    await api.post('/chat/read', { conversationId });
  } catch (e) { /* swallowed */ void e; }
}

export async function getUnreadCount(conversationId, role = 'parent') {
  const msgs = await loadMessages(conversationId);
  return msgs.filter((m) => {
    if (role === 'parent') return m.senderRole !== 'parent' && !m.readByParent;
    return m.senderRole !== 'teacher' && !m.readByTeacher;
  }).length;
}

export async function getUnreadTotalForPrefix(prefix = 'parent:', role = 'teacher') {
  try {
    // For teacher role, get all parent conversations and count unread messages
    if (role === 'teacher') {
      // Get all parents (conversations) for this teacher
      const res = await api.get('/teacher/parents');
      const parents = res.data?.parents || [];
      
      let totalUnread = 0;
      for (const parent of parents) {
        const convoId = `parent:${parent.id}`;
        const msgs = await loadMessages(convoId);
        const unread = msgs.filter((m) => m.senderRole !== 'teacher' && !m.readByTeacher).length;
        totalUnread += unread;
      }
      return totalUnread;
    }
    
    // For parent role, get their own conversation
    if (role === 'parent' && prefix === 'parent:') {
      // This will be handled by the parent component using getUnreadCount
  return 0;
    }
    
    return 0;
  } catch (e) {
    return 0;
  }
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
    return null;
  }
}

export async function deleteMessage(messageId) {
  if (!messageId) return null;
  try {
    const res = await api.delete(`/chat/messages/${messageId}`);
    return res.data;
  } catch (e) {
    return null;
  }
}

