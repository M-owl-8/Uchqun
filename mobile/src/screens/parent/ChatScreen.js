import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { loadMessages, addMessage, markRead, updateMessage, deleteMessage } from '../../services/chatStore';
import tokens from '../../styles/tokens';
import Card from '../../components/common/Card';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import Skeleton from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';

export function ChatScreen() {
  const { user } = useAuth();
  const { connected, on, off } = useSocket();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const conversationId = user?.id ? `parent:${user.id}` : null;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  const BOTTOM_NAV_HEIGHT = 75;

  const loadMessagesData = useCallback(async () => {
    if (!conversationId) return;
    const msgs = await loadMessages(conversationId);
    setMessages(Array.isArray(msgs) ? msgs : []);
    await markRead(conversationId);
  }, [conversationId]);

  // Load messages on mount and on focus
  useFocusEffect(
    useCallback(() => {
      let alive = true;

      const load = async () => {
        if (!conversationId) return;
        setError(null);
        try {
          const msgs = await loadMessages(conversationId);
          if (!alive) return;
          setMessages(Array.isArray(msgs) ? msgs : []);
          await markRead(conversationId);
        } catch (err) {
          if (!alive) return;
          setError(t('common.loadError', { defaultValue: 'Failed to load data' }));
        }
        if (loading) setLoading(false);
      };

      load();

      return () => {
        alive = false;
      };
    }, [conversationId])
  );

  // Listen for real-time socket events instead of polling
  useEffect(() => {
    if (!connected) return;

    const handleNewMessage = () => loadMessagesData();
    const handleMessageUpdate = () => loadMessagesData();
    const handleMessageDelete = () => loadMessagesData();

    on('message:created', handleNewMessage);
    on('message:updated', handleMessageUpdate);
    on('message:deleted', handleMessageDelete);

    return () => {
      off('message:created', handleNewMessage);
      off('message:updated', handleMessageUpdate);
      off('message:deleted', handleMessageDelete);
    };
  }, [connected, on, off, loadMessagesData]);

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
    if (!conversationId) return;

    // Clear input immediately for better UX
    setInputText('');

    // Optimistically add message to UI
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      content: trimmed,
      senderRole: 'parent',
      conversationId,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };

    setMessages(prev => [...prev, optimisticMessage]);
    justSentRef.current = true;

    // Send to server
    const result = await addMessage('parent', trimmed, conversationId);

    // Replace optimistic message with real one
    if (result) {
      setMessages(prev => prev.map(m => m.id === tempId ? result : m));
    } else {
      // If failed, reload messages to get clean state
      const msgs = await loadMessages(conversationId);
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
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    const res = await deleteMessage(msgId);
    if (!res?.success) {
      Alert.alert(t('common.error'), t('chat.errorDelete') || 'Failed to delete message');
    }
    if (conversationId) {
      const msgs = await loadMessages(conversationId);
      setMessages(Array.isArray(msgs) ? msgs : []);
    }
    setBusyId(null);
    setConfirmDeleteId(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title={t('chat.title', { defaultValue: 'Chat' })}
        showBack={false}
      />

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={48} color={tokens.colors.semantic.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => loadMessagesData()} accessibilityRole="button" accessibilityLabel="Retry"
            style={styles.retryButton}>
            <Text style={styles.retryButtonText}>{t('common.retry', { defaultValue: 'Retry' })}</Text>
          </Pressable>
        </View>
      )}
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? BOTTOM_NAV_HEIGHT + insets.bottom : 0}
      >
        <ScrollView
          ref={messagesWrapRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onScroll={(e) => {
            const el = e.nativeEvent;
            const distance = el.contentSize.height - el.contentOffset.y - el.layoutMeasurement.height;
            setIsAtBottom(distance < 80);
          }}
          scrollEventThrottle={16}
        >
          {loading ? (
            <>
              <View style={[styles.messageWrapper]}>
                <Card style={styles.skeletonBubble}>
                  <Skeleton width="70%" height={60} />
                </Card>
              </View>
              <View style={[styles.messageWrapper, styles.ownMessageWrapper]}>
                <Card style={styles.skeletonBubble}>
                  <Skeleton width="70%" height={60} />
                </Card>
              </View>
            </>
          ) : sorted.length === 0 ? (
            <Card style={styles.emptyCard}>
              <EmptyState
                icon="chatbubbles-outline"
                title={t('chat.empty', { defaultValue: 'No messages yet' })}
                description={t('chat.subtitle', { defaultValue: 'Start a conversation with your child\'s teacher' })}
              />
            </Card>
          ) : (
            sorted.map((msg) => {
              const isYou = msg.senderRole === 'parent';
              return (
                <View
                  key={msg.id}
                  style={[
                    styles.messageWrapper,
                    isYou && styles.ownMessageWrapper,
                  ]}
                >
                  {isYou ? (
                    <LinearGradient
                      colors={[tokens.colors.primary[500], tokens.colors.primary[700]]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.messageBubble, styles.ownMessageBubble]}
                    >
                      <View style={styles.messageBubbleContent}>
                        <View style={styles.messageHeader}>
                          <Text style={styles.ownMessageSender}>
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
                              placeholderTextColor={tokens.colors.text.white}
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
                          <Text style={styles.ownMessageText} allowFontScaling={true}>
                            {msg.content || msg.text}
                          </Text>
                        )}
                        {msg.createdAt && (
                          <Text style={styles.ownMessageTime} allowFontScaling={true}>
                            {new Date(msg.createdAt || msg.time).toLocaleTimeString([], {
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </Text>
                        )}
                      </View>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.messageBubble, styles.receivedBubble]}>
                      <View style={styles.messageBubbleContent}>
                        <View style={styles.messageHeader}>
                          <Text style={styles.messageSender}>
                            {t('chat.teacher', { defaultValue: 'Teacher' })}
                          </Text>
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

        {/* Input Bar - sits naturally at bottom of flex layout */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder={t('chat.placeholder', { defaultValue: 'Type a message...' })}
              placeholderTextColor={tokens.colors.text.tertiary}
              multiline
              maxLength={500}
              allowFontScaling={true}
              accessibilityLabel={t('chat.messageInput', { defaultValue: 'Message input' })}
              accessibilityHint={t('chat.messageInputHint', { defaultValue: 'Type your message here' })}
            />
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.sendButton,
              !inputText.trim() && styles.sendButtonDisabled,
              pressed && styles.sendButtonPressed,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim()}
            accessibilityRole="button"
            accessibilityLabel={t('chat.send', { defaultValue: 'Send message' })}
            accessibilityState={{ disabled: !inputText.trim() }}
          >
            <Ionicons
              name="send"
              size={20}
              color={tokens.colors.text.white}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <View style={styles.modalOverlay} accessibilityViewIsModal={true}>
          <Card style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('chat.delete') || 'Delete'}</Text>
            <Text style={styles.modalText}>{t('chat.confirmDelete') || 'Delete this message?'}</Text>
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancel}
                onPress={() => setConfirmDeleteId(null)}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel', { defaultValue: 'Cancel' })}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel') || 'Cancel'}</Text>
              </Pressable>
              <Pressable
                style={styles.modalDelete}
                onPress={() => handleDelete(confirmDeleteId)}
                disabled={busyId === confirmDeleteId}
                accessibilityRole="button"
                accessibilityLabel={t('chat.confirmDeleteAction', { defaultValue: 'Confirm delete message' })}
              >
                <Text style={styles.modalDeleteText}>{t('chat.delete') || 'Delete'}</Text>
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
  keyboardView: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: tokens.space.lg,
  },
  messageWrapper: {
    alignItems: 'flex-start',
    marginBottom: tokens.space.sm,
  },
  ownMessageWrapper: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: tokens.radius.lg,
    padding: tokens.space.md,
  },
  ownMessageBubble: {
    borderRadius: tokens.radius.lg,
    borderBottomRightRadius: tokens.radius.sm,
    padding: tokens.space.md,
    ...tokens.shadow.soft,
  },
  receivedBubble: {
    backgroundColor: tokens.glass.bg,
    borderWidth: 1,
    borderColor: tokens.glass.border,
    borderBottomLeftRadius: tokens.radius.sm,
    ...tokens.shadow.glass,
  },
  messageBubbleContent: {
    gap: tokens.space.xs,
  },
  skeletonBubble: {
    maxWidth: '75%',
  },
  messageText: {
    fontSize: tokens.type.body.fontSize,
    fontWeight: tokens.type.body.fontWeight,
    color: tokens.colors.text.primary,
    marginBottom: tokens.space.xs,
  },
  ownMessageText: {
    fontSize: tokens.type.body.fontSize,
    fontWeight: tokens.type.body.fontWeight,
    color: tokens.colors.text.white,
  },
  messageTime: {
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.type.sub.fontWeight,
    color: tokens.colors.text.muted,
    alignSelf: 'flex-end',
  },
  ownMessageTime: {
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.type.sub.fontWeight,
    color: tokens.colors.text.white,
    opacity: 0.8,
    alignSelf: 'flex-end',
  },
  emptyCard: {
    marginTop: tokens.space.xl,
  },
  errorBanner: {
    padding: tokens.space['2xl'],
    alignItems: 'center',
  },
  errorText: {
    color: tokens.colors.text.secondary,
    marginTop: tokens.space.md,
    textAlign: 'center',
    fontSize: tokens.type.body.fontSize,
  },
  retryButton: {
    marginTop: tokens.space.lg,
    paddingHorizontal: tokens.space['2xl'],
    paddingVertical: tokens.space.md,
    backgroundColor: tokens.colors.accent.blue,
    borderRadius: tokens.radius.md,
  },
  retryButtonText: {
    color: tokens.colors.text.white,
    fontWeight: tokens.typography.fontWeight.semibold,
    fontSize: tokens.type.body.fontSize,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: tokens.space.md,
    backgroundColor: '#FFFFFF',
    gap: tokens.space.sm,
    shadowColor: '#2E3A59',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  inputWrapper: {
    flex: 1,
  },
  input: {
    backgroundColor: tokens.colors.background.tertiary,
    borderRadius: tokens.radius.xl,
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.md,
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.primary,
    maxHeight: 100,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: tokens.colors.accent.blue,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadow.soft,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.space.xs,
  },
  messageSender: {
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.text.secondary,
  },
  ownMessageSender: {
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.text.white,
    opacity: 0.9,
  },
  messageActions: {
    flexDirection: 'row',
    gap: tokens.space.sm,
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
    fontWeight: tokens.type.h3.fontWeight,
  },
  scrollToBottom: {
    position: 'absolute',
    bottom: 140,
    right: tokens.space.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: tokens.glass.bg,
    borderWidth: 1,
    borderColor: tokens.glass.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadow.glass,
  },
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
  modalContent: {
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
    fontWeight: tokens.type.h3.fontWeight,
  },
});
