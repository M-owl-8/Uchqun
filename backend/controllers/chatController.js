import { Op } from 'sequelize';
import ChatMessage from '../models/ChatMessage.js';
import logger from '../utils/logger.js';
import { parsePagination } from '../utils/pagination.js';

const buildConversationId = (parentId) => `parent:${parentId}`;

const canAccessConversation = async (req, conversationId) => {
  if (req.user.role === 'parent') {
    return conversationId === buildConversationId(req.user.id);
  }
  // Admin can access all conversations
  if (req.user.role === 'admin') return true;
  // Teacher/reception can only access conversations of parents whose children they manage
  if (['teacher', 'reception'].includes(req.user.role)) {
    // Extract parentId from conversationId (format: "parent:<uuid>")
    const parentId = conversationId.replace('parent:', '');
    if (!parentId) return false;
    const { default: Child } = await import('../models/Child.js');
    let where;
    if (req.user.role === 'teacher') {
      // Child has no teacherId — link via Group.teacherId -> Child.groupId
      const { default: Group } = await import('../models/Group.js');
      const groups = await Group.findAll({
        attributes: ['id'],
        where: { teacherId: req.user.id },
        raw: true,
      });
      const groupIds = groups.map((g) => g.id);
      if (groupIds.length === 0) return false;
      where = { parentId, groupId: { [Op.in]: groupIds } };
    } else {
      where = { parentId, createdBy: req.user.id };
    }
    const childCount = await Child.count({ where });
    return childCount > 0;
  }
  return false;
};

export const listMessages = async (req, res) => {
  try {
    const { conversationId } = req.query;
    const { limit, offset } = parsePagination(req.query, { limit: 50 });
    if (!conversationId) {
      return res.status(400).json({ error: 'conversationId is required' });
    }
    if (!(await canAccessConversation(req, conversationId))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const msgs = await ChatMessage.findAll({
      where: { conversationId },
      order: [['createdAt', 'ASC']],
      limit,
      offset,
    });

    res.json(msgs);
  } catch (err) {
    logger.error('listMessages error', err);
    res.status(500).json({ error: 'Failed to load messages' });
  }
};

export const createMessage = async (req, res) => {
  try {
    const { conversationId, content } = req.body;
    if (!conversationId || !content?.trim()) {
      return res.status(400).json({ error: 'conversationId and content are required' });
    }
    if (!(await canAccessConversation(req, conversationId))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const senderRole = req.user.role === 'parent' ? 'parent' : 'teacher';
    const msg = await ChatMessage.create({
      conversationId,
      senderId: req.user.id,
      senderRole,
      content: content.trim(),
      readByParent: senderRole === 'parent',
      readByTeacher: senderRole === 'teacher',
    });

    res.status(201).json(msg);
  } catch (err) {
    logger.error('createMessage error', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

export const markConversationRead = async (req, res) => {
  try {
    const { conversationId } = req.body;
    if (!conversationId) {
      return res.status(400).json({ error: 'conversationId is required' });
    }
    if (!(await canAccessConversation(req, conversationId))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const role = req.user.role === 'parent' ? 'parent' : 'teacher';
    await ChatMessage.update(
      role === 'parent' ? { readByParent: true } : { readByTeacher: true },
      { where: { conversationId } }
    );

    res.json({ success: true });
  } catch (err) {
    logger.error('markConversationRead error', err);
    res.status(500).json({ error: 'Failed to mark read' });
  }
};

export const updateMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!id) return res.status(400).json({ error: 'id is required' });
    if (!content?.trim()) return res.status(400).json({ error: 'content is required' });

    const msg = await ChatMessage.findByPk(id);
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    if (!(await canAccessConversation(req, msg.conversationId))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const isAdmin = req.user.role === 'admin' || req.user.role === 'government';
    const isOwner = msg.senderId === req.user.id;
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Only the sender can edit this message' });
    }

    msg.content = content.trim();
    await msg.save();

    res.json(msg);
  } catch (err) {
    logger.error('updateMessage error', err);
    res.status(500).json({ error: 'Failed to update message' });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'id is required' });

    const msg = await ChatMessage.findByPk(id);
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    if (!(await canAccessConversation(req, msg.conversationId))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const isAdmin = req.user.role === 'admin' || req.user.role === 'government';
    const isTeacher = req.user.role === 'teacher';
    const isOwner = msg.senderId === req.user.id;
    // Allow moderation: teacher/admin can delete any message in allowed conversations
    if (!isAdmin && !isTeacher && !isOwner) {
      return res.status(403).json({ error: 'Only the sender can delete this message' });
    }

    await msg.destroy();
    res.json({ success: true });
  } catch (err) {
    logger.error('deleteMessage error', err);
    res.status(500).json({ error: 'Failed to delete message' });
  }
};

const getAccessibleConversationIds = async (req, prefix) => {
  if (req.user.role === 'parent') {
    const id = `parent:${req.user.id}`;
    return prefix ? (id.startsWith(prefix) ? [id] : []) : [id];
  }

  if (req.user.role === 'admin') {
    const rows = await ChatMessage.findAll({
      attributes: ['conversationId'],
      group: ['conversationId'],
      raw: true,
      ...(prefix && { where: { conversationId: { [Op.like]: `${prefix}%` } } }),
    });
    return rows.map((r) => r.conversationId);
  }

  // teacher: derive from children in groups they own (Child has no teacherId
  // column — link goes Group.teacherId -> Group -> Child.groupId)
  const { default: Child } = await import('../models/Child.js');
  let where;
  if (req.user.role === 'teacher') {
    const { default: Group } = await import('../models/Group.js');
    const groups = await Group.findAll({
      attributes: ['id'],
      where: { teacherId: req.user.id },
      raw: true,
    });
    const groupIds = groups.map((g) => g.id);
    if (groupIds.length === 0) return [];
    where = { groupId: { [Op.in]: groupIds } };
  } else {
    where = { createdBy: req.user.id };
  }
  const children = await Child.findAll({
    attributes: ['parentId'],
    where,
    group: ['parentId'],
    raw: true,
  });
  const ids = children.map((c) => `parent:${c.parentId}`);
  return prefix ? ids.filter((id) => id.startsWith(prefix)) : ids;
};

export const getUnreadCount = async (req, res) => {
  try {
    const { prefix = 'parent:', role } = req.query;
    const countRole = role || (req.user.role === 'parent' ? 'parent' : 'teacher');

    const conversationIds = await getAccessibleConversationIds(req, prefix);
    if (conversationIds.length === 0) return res.json({ count: 0 });

    const unreadWhere =
      countRole === 'parent'
        ? { readByParent: false, senderRole: 'teacher' }
        : { readByTeacher: false, senderRole: 'parent' };

    const count = await ChatMessage.count({
      where: { conversationId: { [Op.in]: conversationIds }, ...unreadWhere },
    });

    res.json({ count });
  } catch (err) {
    logger.error('getUnreadCount error', err);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
};

export const listConversations = async (req, res) => {
  try {
    const conversationIds = await getAccessibleConversationIds(req, null);
    if (conversationIds.length === 0) return res.json([]);

    const isParent = req.user.role === 'parent';
    const unreadWhere = isParent
      ? { readByParent: false, senderRole: 'teacher' }
      : { readByTeacher: false, senderRole: 'parent' };

    const conversations = await Promise.all(
      conversationIds.map(async (conversationId) => {
        const [lastMessage, unreadCount] = await Promise.all([
          ChatMessage.findOne({
            where: { conversationId },
            order: [['createdAt', 'DESC']],
          }),
          ChatMessage.count({ where: { conversationId, ...unreadWhere } }),
        ]);
        return {
          conversationId,
          lastMessage: lastMessage || null,
          unreadCount,
          updatedAt: lastMessage?.createdAt || null,
        };
      })
    );

    conversations.sort((a, b) => {
      if (!a.updatedAt) return 1;
      if (!b.updatedAt) return -1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    res.json(conversations);
  } catch (err) {
    logger.error('listConversations error', err);
    res.status(500).json({ error: 'Failed to list conversations' });
  }
};
