import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, Alert, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tokens from '../../styles/tokens';
import { teacherService } from '../../services/teacherService';
import { loadMessages, addMessage, markRead, updateMessage, deleteMessage } from '../../services/chatStore';
import Card from '../../components/common/Card';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

export function ChatScreen() {
  const { user } = useAuth();
  const { connected, on, off } = useSocket();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Bottom nav height + safe area + padding
  const BOTTOM_NAV_HEIGHT = 75;
  const bottomPadding = BOTTOM_NAV_HEIGHT + insets.bottom + 16;
  const [parents, setParents] = useState([]);
  const [parentsWithLastMessage, setParentsWithLastMessage] = useState([]);
  const [selectedParent, setSelectedParent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesWrapRef = useRef(null);
  const justSentRef = useRef(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Load parents and their last messages
  useEffect(() => {
    const fetchParents = async () => {
      try {
        const parentsData = await teacherService.getParents();
        const list = Array.isArray(parentsData) ? parentsData.filter(
          (p) => !user?.id || p.teacherId === user.id
        ) : [];
        setParents(list);

        // Load last message for each parent
        const parentsWithMessages = await Promise.all(
          list.map(async (parent) => {
            const convoId = `parent:${parent.id}`;
            const msgs = await loadMessages(convoId);
            const sorted = Array.isArray(msgs)
              ? [...msgs].sort((a, b) => new Date(b.createdAt || b.time) - new Date(a.createdAt || a.time))
              : [];
            const lastMsg = sorted[0] || null;

            return {
              ...parent,
              lastMessage: lastMsg,
              unreadCount: msgs.filter(m => m.senderRole === 'parent' && !m.readByTeacher).length,
            };
          })
        );

        // Sort by last message time (most recent first)
        parentsWithMessages.sort((a, b) => {
          if (!a.lastMessage && !b.lastMessage) return 0;
          if (!a.lastMessage) return 1;
          if (!b.lastMessage) return -1;
          return new Date(b.lastMessage.createdAt || b.lastMessage.time) - new Date(a.lastMessage.createdAt || a.lastMessage.time);
        });

        setParentsWithLastMessage(parentsWithMessages);
      } catch (err) {
        if (__DEV__) console.error('Failed to load parents for chat', err);
        setError(t('common.loadError', { defaultValue: 'Failed to load data' }));
      } finally {
        setLoading(false);
      }
    };
    fetchParents();
  }, [user?.id]);

  const loadMessagesForParent = useCallback(async () => {
    if (!selectedParent) {
      setMessages([]);
      return;
    }
    const convoId = `parent:${selectedParent.id}`;
    const msgs = await loadMessages(convoId);
    setMessages(Array.isArray(msgs) ? msgs : []);
    await markRead(convoId);

    // Update parent list with latest message
    setParentsWithLastMessage(prev => prev.map(p => {
      if (p.id === selectedParent.id) {
        const sorted = [...msgs].sort((a, b) => new Date(b.createdAt || b.time) - new Date(a.createdAt || a.time));
        return {
          ...p,
          lastMessage: sorted[0] || null,
          unreadCount: msgs.filter(m => m.senderRole === 'parent' && !m.readByTeacher).length,
        };
      }
      return p;
    }));
  }, [selectedParent]);

  // Load messages when parent is selected
  useEffect(() => {
    loadMessagesForParent();
  }, [loadMessagesForParent]);

  // Listen for real-time socket events instead of polling
  useEffect(() => {
    if (!connected) return;

    const handleNewMessage = () => loadMessagesForParent();
    const handleMessageUpdate = () => loadMessagesForParent();
    const handleMessageDelete = () => loadMessagesForParent();

    on('message:created', handleNewMessage);
    on('message:updated', handleMessageUpdate);
    on('message:deleted', handleMessageDelete);

    return () => {
      off('message:created', handleNewMessage);
      off('message:updated', handleMessageUpdate);
      off('message:deleted', handleMessageDelete);
    };
  }, [connected, on, off, loadMessagesForParent]);

  const sorted = useMemo(
    () =>
      [...messages].sort(
        (a, b) => new Date(a.createdAt || a.time) - new Date(b.createdAt || b.time)
      ),
    [messages]
  );

  useEffect(() => {
    if (isAtBottom || justSentRef.current) {
      messagesWrapRef.current?.scrollToEnd({ animated: true });
      justSentRef.current = false;
    }
  }, [sorted.length, isAtBottom]);

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    if (!selectedParent) {
      Alert.alert(t('common.error'), t('chat.selectParent') || 'Please select a parent');
      return;
    }

    const convoId = `parent:${selectedParent.id}`;

    // Clear input immediately for better UX
    setInputText('');

    // Optimistically add message to UI
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      content: trimmed,
      senderRole: 'teacher',
      conversationId: convoId,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };

    setMessages(prev => [...prev, optimisticMessage]);
    justSentRef.current = true;

    // Send to server
    const result = await addMessage('teacher', trimmed, convoId);

    // Replace optimistic message with real one
    if (result) {
      setMessages(prev => prev.map(m => m.id === tempId ? result : m));
      // Update parent list
      setParentsWithLastMessage(prev => prev.map(p => {
        if (p.id === selectedParent.id) {
          return { ...p, lastMessage: result, unreadCount: 0 };
        }
        return p;
      }));
    } else {
      // If failed, reload messages to get clean state
      const msgs = await loadMessages(convoId);
      setMessages(Array.isArray(msgs) ? msgs : []);
    }
  };

  const handleSaveEdit = async (msgId) => {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    setBusyId(msgId);
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, content: trimmed } : m))
    );
    const updated = await updateMessage(msgId, trimmed);
    if (!updated) {
      Alert.alert(t('common.error'), t('chat.errorUpdate') || 'Failed to update message');
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
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    const res = await deleteMessage(msgId);
    if (!res?.success) {
      Alert.alert(t('common.error'), t('chat.errorDelete') || 'Failed to delete message');
    }
    if (selectedParent) {
      const convoId = `parent:${selectedParent.id}`;
      const msgs = await loadMessages(convoId);
      setMessages(Array.isArray(msgs) ? msgs : []);
    }
    setBusyId(null);
    setConfirmDeleteId(null);
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
  };

  const getParentInitials = (parent) => {
    const first = parent.firstName?.charAt(0) || '';
    const last = parent.lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || 'P';
  };

  const handleParentSelect = (parent) => {
    setSelectedParent(parent);
    setInputText(''); // Clear input when switching
  };

  const handleBackToList = () => {
    setSelectedParent(null);
    setMessages([]);
    setInputText('');
  };

  if (loading && parents.length === 0) {
    return <LoadingSpinner />;
  }

  // Show parent list (Telegram style) when no parent is selected
  if (!selectedParent) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader
          title={t('chat.title', { defaultValue: 'Chat' })}
          showBack={false}
        />

        {parentsWithLastMessage.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title={t('chat.noParents', { defaultValue: 'No parents available' })}
            description={t('chat.noParentsDesc', { defaultValue: 'Parents will appear here when available' })}
          />
        ) : (
          <FlatList
            data={parentsWithLastMessage}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={[styles.parentListContent, { paddingBottom: bottomPadding }]}
            renderItem={({ item }) => (
              <Pressable
                style={styles.parentListItem}
                onPress={() => handleParentSelect(item)}
                accessibilityRole="button"
                accessibilityLabel={`${item.firstName} ${item.lastName}${item.unreadCount > 0 ? `, ${item.unreadCount} unread` : ''}`}
                accessibilityHint={t('chat.openConversation', { defaultValue: 'Open conversation' })}
              >
                {/* Avatar */}
                <View style={styles.parentAvatar}>
                  <Text style={styles.parentAvatarText}>
                    {getParentInitials(item)}
                  </Text>
                </View>

                {/* Content */}
                <View style={styles.parentItemContent}>
                  <View style={styles.parentItemHeader}>
                    <Text style={styles.parentItemName} numberOfLines={1}>
                      {item.firstName} {item.lastName}
                    </Text>
                    {item.lastMessage && (
                      <Text style={styles.parentItemTime}>
                        {formatTime(item.lastMessage.createdAt || item.lastMessage.time)}
                      </Text>
                    )}
                  </View>
                  {item.lastMessage ? (
                    <Text style={styles.parentItemPreview} numberOfLines={1}>
                      {item.lastMessage.content || item.lastMessage.text || ''}
                    </Text>
                  ) : (
                    <Text style={styles.parentItemPreviewEmpty}>
                      {t('chat.noMessages', { defaultValue: 'No messages yet' })}
                    </Text>
                  )}
                </View>

                {/* Unread badge */}
                {item.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>
                      {item.unreadCount > 99 ? '99+' : item.unreadCount}
                    </Text>
                  </View>
                )}
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={styles.parentListSeparator} />}
          />
        )}
      </SafeAreaView>
    );
  }

  // Show chat with selected parent
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title={`${selectedParent.firstName} ${selectedParent.lastName}`}
        showBack={true}
        onBackPress={handleBackToList}
      />

      <KeyboardAvoidingView
        style={styles.keyboardFlex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          ref={messagesWrapRef}
          style={styles.messagesContainer}
          contentContainerStyle={[styles.messagesContent, { paddingBottom: 100 }]}
          onScroll={(e) => {
            const el = e?.nativeEvent;
            if (!el?.contentSize?.height) return;
            const distance = el.contentSize.height - el.contentOffset.y - (el.layoutMeasurement?.height ?? 0);
            setIsAtBottom(distance < 80);
          }}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
        >
          {sorted.length === 0 ? (
            <EmptyState
              icon="chatbubbles-outline"
              title={t('chat.empty', { defaultValue: 'No messages yet' })}
              description={t('chat.subtitle', { defaultValue: 'Start a conversation' })}
            />
          ) : (
            sorted.map((msg, index) => {
              const isYou = msg.senderRole === 'teacher';
              const msgKey = msg.id ?? msg._id ?? `msg-${index}`;
              return (
                <View
                  key={msgKey}
                  style={[
                    styles.messageRow,
                    isYou && styles.ownMessageRow,
                  ]}
                >
                  {isYou ? (
                    <LinearGradient
                      colors={[tokens.colors.primary[500], tokens.colors.primary[700]]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.messageBubble, styles.ownMessageBubble]}
                    >
                      <View style={styles.messageHeader}>
                        <Text style={styles.ownSenderLabel}>
                          {t('chat.you', { defaultValue: 'You' })}
                        </Text>
                        <View style={styles.messageActions}>
                          <Pressable
                            onPress={() => {
                              setEditingId(msg.id);
                              setEditValue((msg.content || msg.text || '').toString());
                            }}
                            disabled={busyId === msg.id}
                            accessibilityRole="button"
                            accessibilityLabel={t('chat.editMessage', { defaultValue: 'Edit message' })}
                          >
                            <Ionicons name="pencil" size={16} color={tokens.colors.text.white} />
                          </Pressable>
                          <Pressable
                            onPress={() => setConfirmDeleteId(msg.id)}
                            disabled={busyId === msg.id}
                            accessibilityRole="button"
                            accessibilityLabel={t('chat.deleteMessage', { defaultValue: 'Delete message' })}
                          >
                            <Ionicons name="trash-outline" size={16} color={tokens.colors.text.white} />
                          </Pressable>
                        </View>
                      </View>

                      {editingId === msg.id ? (
                        <View style={styles.editContainer}>
                          <TextInput
                            style={styles.editInput}
                            value={editValue}
                            onChangeText={setEditValue}
                            multiline
                            accessibilityLabel={t('chat.editMessageInput', { defaultValue: 'Edit message text' })}
                          />
                          <View style={styles.editActions}>
                            <Pressable
                              style={styles.editCancel}
                              onPress={() => {
                                setEditingId(null);
                                setEditValue('');
                              }}
                              accessibilityRole="button"
                              accessibilityLabel={t('common.cancel', { defaultValue: 'Cancel' })}
                            >
                              <Text style={styles.editCancelText}>{t('common.cancel', { defaultValue: 'Cancel' })}</Text>
                            </Pressable>
                            <Pressable
                              style={styles.editSave}
                              onPress={() => handleSaveEdit(msg.id)}
                              disabled={!editValue.trim() || busyId === msg.id}
                              accessibilityRole="button"
                              accessibilityLabel={t('common.save', { defaultValue: 'Save' })}
                            >
                              <Text style={styles.editSaveText}>{t('common.save', { defaultValue: 'Save' })}</Text>
                            </Pressable>
                          </View>
                        </View>
                      ) : (
                        <Text style={styles.ownMessageText}>
                          {msg.content || msg.text}
                        </Text>
                      )}

                      {msg.createdAt && (
                        <Text style={styles.ownMessageTime}>
                          {new Date(msg.createdAt || msg.time).toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </Text>
                      )}
                    </LinearGradient>
                  ) : (
                    <View style={[styles.messageBubble, styles.receivedBubble]}>
                      <View style={styles.messageHeader}>
                        <Text style={styles.senderLabel}>
                          {t('chat.parent', { defaultValue: 'Parent' })}
                        </Text>
                        {(user?.role === 'teacher' || user?.role === 'admin') && (
                          <View style={styles.messageActions}>
                            <Pressable
                              onPress={() => setConfirmDeleteId(msg.id)}
                              disabled={busyId === msg.id}
                              accessibilityRole="button"
                              accessibilityLabel={t('chat.deleteMessage', { defaultValue: 'Delete message' })}
                            >
                              <Ionicons name="trash-outline" size={16} color={tokens.colors.semantic.error} />
                            </Pressable>
                          </View>
                        )}
                      </View>
                      <Text style={styles.messageText}>
                        {msg.content || msg.text}
                      </Text>
                      {msg.createdAt && (
                        <Text style={styles.messageTime}>
                          {new Date(msg.createdAt || msg.time).toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
          <View ref={messagesEndRef} />
        </ScrollView>

        {!isAtBottom && sorted.length > 0 && (
          <Pressable
            style={styles.scrollToBottom}
            onPress={() => messagesWrapRef.current?.scrollToEnd({ animated: true })}
            accessibilityRole="button"
            accessibilityLabel={t('chat.scrollToBottom', { defaultValue: 'Scroll to latest messages' })}
          >
            <Ionicons name="arrow-down" size={20} color={tokens.colors.text.primary} />
          </Pressable>
        )}

        <View style={[styles.inputContainer, { paddingBottom: insets.bottom + tokens.space.sm }]}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder={t('chat.placeholder', { defaultValue: 'Write a message...' })}
            placeholderTextColor={tokens.colors.text.tertiary}
            multiline
            maxLength={500}
            accessibilityLabel={t('chat.messageInput', { defaultValue: 'Message input' })}
            accessibilityHint={t('chat.messageInputHint', { defaultValue: 'Type your message here' })}
          />
          <Pressable
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim()}
            accessibilityRole="button"
            accessibilityLabel={t('chat.send', { defaultValue: 'Send message' })}
            accessibilityState={{ disabled: !inputText.trim() }}
          >
            <Ionicons name="send" size={20} color={tokens.colors.text.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <View style={styles.modalOverlay} accessibilityViewIsModal={true}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('chat.delete', { defaultValue: 'Delete' })}</Text>
            <Text style={styles.modalText}>{t('chat.confirmDelete', { defaultValue: 'Delete this message?' })}</Text>
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancel}
                onPress={() => setConfirmDeleteId(null)}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel', { defaultValue: 'Cancel' })}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel', { defaultValue: 'Cancel' })}</Text>
              </Pressable>
              <Pressable
                style={styles.modalDelete}
                onPress={() => handleDelete(confirmDeleteId)}
                disabled={busyId === confirmDeleteId}
                accessibilityRole="button"
                accessibilityLabel={t('chat.confirmDeleteAction', { defaultValue: 'Confirm delete message' })}
              >
                <Text style={styles.modalDeleteText}>{t('chat.delete', { defaultValue: 'Delete' })}</Text>
              </Pressable>
            </View>
          </Card>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background.primary,
  },
  keyboardFlex: {
    flex: 1,
  },
  // Parent List Styles
  parentListContent: {
    padding: 0,
  },
  parentListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: tokens.space.md,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: tokens.space.lg,
  },
  parentListSeparator: {
    height: 1,
    backgroundColor: tokens.colors.border.light,
    marginLeft: 80,
  },
  parentAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: tokens.colors.accent.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.space.md,
  },
  parentAvatarText: {
    fontSize: 20,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.text.white,
  },
  parentItemContent: {
    flex: 1,
    justifyContent: 'center',
  },
  parentItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  parentItemName: {
    fontSize: tokens.type.body.fontSize,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.text.primary,
    flex: 1,
  },
  parentItemTime: {
    fontSize: tokens.type.caption.fontSize,
    color: tokens.colors.text.muted,
    marginLeft: tokens.space.sm,
  },
  parentItemPreview: {
    fontSize: tokens.type.sub.fontSize,
    color: tokens.colors.text.secondary,
  },
  parentItemPreviewEmpty: {
    fontSize: tokens.type.sub.fontSize,
    color: tokens.colors.text.muted,
    fontStyle: 'italic',
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: tokens.colors.nav.indicator,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: tokens.space.sm,
  },
  unreadBadgeText: {
    fontSize: 12,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.text.white,
  },
  // Messages
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: tokens.space.md,
    paddingBottom: tokens.space.xl,
  },
  messageRow: {
    alignItems: 'flex-start',
    marginBottom: tokens.space.md,
  },
  ownMessageRow: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '85%',
    padding: tokens.space.md,
    borderRadius: tokens.radius.lg,
  },
  ownMessageBubble: {
    borderBottomRightRadius: tokens.radius.sm,
    ...tokens.shadow.soft,
  },
  receivedBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
    borderBottomLeftRadius: tokens.radius.sm,
    ...tokens.shadow.soft,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.space.xs,
  },
  senderLabel: {
    fontSize: tokens.type.caption.fontSize,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.text.secondary,
  },
  ownSenderLabel: {
    fontSize: tokens.type.caption.fontSize,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.text.white,
    opacity: 0.9,
  },
  messageActions: {
    flexDirection: 'row',
    gap: tokens.space.sm,
  },
  messageText: {
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.primary,
    lineHeight: 20,
  },
  ownMessageText: {
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.white,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: tokens.type.caption.fontSize,
    color: tokens.colors.text.muted,
    alignSelf: 'flex-end',
    marginTop: tokens.space.xs,
  },
  ownMessageTime: {
    fontSize: tokens.type.caption.fontSize,
    color: tokens.colors.text.white,
    opacity: 0.8,
    alignSelf: 'flex-end',
    marginTop: tokens.space.xs,
  },
  editContainer: {
    marginTop: tokens.space.sm,
  },
  editInput: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: tokens.radius.md,
    padding: tokens.space.sm,
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.white,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: tokens.space.sm,
    marginTop: tokens.space.sm,
  },
  editCancel: {
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
  },
  editCancelText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: tokens.type.sub.fontSize,
  },
  editSave: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    borderRadius: tokens.radius.sm,
  },
  editSaveText: {
    color: tokens.colors.text.white,
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
  scrollToBottom: {
    position: 'absolute',
    bottom: 100,
    right: tokens.space.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadow.soft,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: tokens.space.md,
    paddingTop: tokens.space.sm,
    backgroundColor: '#FFFFFF',
    minHeight: 60,
    shadowColor: '#2E3A59',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  input: {
    flex: 1,
    borderRadius: tokens.radius.xl,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    marginRight: tokens.space.sm,
    maxHeight: 100,
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.primary,
    backgroundColor: tokens.colors.background.tertiary,
    borderWidth: 1,
    borderColor: tokens.colors.border.light,
    minHeight: 44,
  },
  sendButton: {
    backgroundColor: tokens.colors.accent.blue,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...tokens.shadow.soft,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  // Modal
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: tokens.colors.surface.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalCard: {
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: tokens.type.h3.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.text.primary,
    marginBottom: tokens.space.sm,
  },
  modalText: {
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.secondary,
    marginBottom: tokens.space.lg,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: tokens.space.md,
  },
  modalCancel: {
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.sm,
  },
  modalCancelText: {
    color: tokens.colors.text.secondary,
    fontSize: tokens.type.body.fontSize,
  },
  modalDelete: {
    backgroundColor: tokens.colors.semantic.error,
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.sm,
    borderRadius: tokens.radius.sm,
  },
  modalDeleteText: {
    color: tokens.colors.text.white,
    fontSize: tokens.type.body.fontSize,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
});
