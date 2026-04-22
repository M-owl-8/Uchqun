import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { parentService } from '../../../services/parentService';
import { teacherService } from '../../../services/teacherService';

export default function AIChatModal({ visible, onClose, contextHint = '' }) {
  const tokens = useThemeTokens();
  const { isDark } = useTheme();
  const { user } = useAuth();
  const { t } = useTranslation();

  const QUICK_PROMPTS = [
    { emoji: '📊', text: t('ai.prompt1', { defaultValue: "Farzandim bugun qanday?" }) },
    { emoji: '🍎', text: t('ai.prompt2', { defaultValue: "Farzandim nima yedi?" }) },
    { emoji: '🎨', text: t('ai.prompt3', { defaultValue: "Qanday mashg'ulotlar o'tkazildi?" }) },
    { emoji: '💡', text: t('ai.prompt4', { defaultValue: "Menga maslahatlar?" }) },
  ];

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: t('ai.greeting', { defaultValue: "Salom! Men Uchqun, sizning AI yordamchingizman! Farzandingiz haqida har qanday savolni bering!" }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  const scrollViewRef = useRef(null);

  const handleSend = async (text = inputText) => {
    const messageToSend = text.trim();
    if (!messageToSend || loading) return;

    setInputText('');
    setMessages(prev => [...prev, { role: 'user', content: messageToSend }]);
    setLoading(true);

    try {
      const fullMessage = contextHint
        ? `Context: ${contextHint}\n\nQuestion: ${messageToSend}`
        : messageToSend;

      const isTeacher = user?.role === 'teacher';
      const service = isTeacher ? teacherService : parentService;

      const response = await service.aiChat(fullMessage, 'uz', messages);
      const aiMessage = response?.response || response?.data?.response || response?.advice || response?.message || t('ai.errorResponse', { defaultValue: "Kechirasiz, javob olishda xatolik yuz berdi." });

      setMessages(prev => [...prev, { role: 'assistant', content: aiMessage }]);
    } catch (error) {
      if (__DEV__) console.error('[AIChatModal] Error sending message:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: t('ai.errorRetry', { defaultValue: "Kechirasiz, xatolik yuz berdi. Yana urinib ko'ring?" }),
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const styles = getStyles(tokens, isDark);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <Pressable style={styles.modalOverlay} onPress={onClose} />

        <View
          style={styles.chatContainer}
        >
          {/* Header */}
          <LinearGradient
            colors={['#8B5CF6', '#6366F1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <View style={styles.avatarContainer}>
                <Image
                  source={require('../../../../assets/Uchqun logo.png')}
                  style={styles.avatarImage}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>{t('ai.headerTitle', { defaultValue: 'Uchqun AI Assistant' })}</Text>
                <Text style={styles.headerSubtitle}>{t('ai.headerSubtitle', { defaultValue: 'Always here to help!' })}</Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Close AI chat">
              <View>
                <Ionicons name="close" size={24} color="#fff" />
              </View>
            </Pressable>
          </LinearGradient>

          {/* Quick Prompts */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.promptsScroll}
            contentContainerStyle={styles.promptsContainer}
          >
            {QUICK_PROMPTS.map((prompt, index) => (
              <Pressable
                key={index}
                style={styles.promptChip}
                onPress={() => handleSend(prompt.text)}
                accessibilityRole="button"
                accessibilityLabel={prompt.text}
              >
                <Text style={styles.promptEmoji}>{prompt.emoji}</Text>
                <Text style={styles.promptText} numberOfLines={1}>{prompt.text}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((msg, index) => (
              <View
                key={index}
                style={[
                  styles.messageBubble,
                  msg.role === 'user' ? styles.userBubble : styles.aiBubble,
                ]}
              >
                {msg.role === 'assistant' && (
                  <Image
                    source={require('../../../../assets/Uchqun logo.png')}
                    style={styles.messageAvatarImage}
                    resizeMode="contain"
                  />
                )}
                <View style={[
                  styles.messageContent,
                  msg.role === 'user' ? styles.userContent : styles.aiContent,
                ]}>
                  <Text style={[
                    styles.messageText,
                    msg.role === 'user' && styles.userText,
                  ]}>
                    {msg.content}
                  </Text>
                </View>
              </View>
            ))}
            {loading && (
              <View style={[styles.messageBubble, styles.aiBubble]}>
                <Image
                  source={require('../../../../assets/Uchqun logo.png')}
                  style={styles.messageAvatarImage}
                  resizeMode="contain"
                />
                <View style={[styles.messageContent, styles.aiContent, styles.typingIndicator]}>
                  <ActivityIndicator size="small" color={tokens.colors.accent.blue} />
                  <Text style={styles.typingText}>{t('ai.thinking', { defaultValue: 'Thinking...' })}</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder={t('ai.inputPlaceholder', { defaultValue: 'Ask me anything...' })}
              placeholderTextColor={tokens.colors.text.muted}
              multiline
              maxLength={500}
              accessibilityLabel="AI chat message input"
              accessibilityHint="Type your question for the AI assistant"
            />
            <Pressable
              style={[
                styles.sendButton,
                (!inputText.trim() || loading) && styles.sendButtonDisabled,
              ]}
              onPress={() => handleSend()}
              disabled={!inputText.trim() || loading}
              accessibilityRole="button"
              accessibilityLabel="Send message to AI"
              accessibilityState={{ disabled: !inputText.trim() || loading }}
            >
              <LinearGradient
                colors={inputText.trim() && !loading
                  ? ['#8B5CF6', '#6366F1']
                  : ['#E2E8F0', '#CBD5E1']}
                style={styles.sendButtonGradient}
              >
                <Ionicons
                  name="paper-plane"
                  size={20}
                  color={inputText.trim() && !loading ? '#fff' : '#94A3B8'}
                />
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const getStyles = (tokens, isDark) => StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.4)',
  },
  chatContainer: {
    backgroundColor: tokens.colors.background.primary,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '75%',
    overflow: 'hidden',
    ...tokens.shadow.elevated,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 20 : 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptsScroll: {
    maxHeight: 50,
    backgroundColor: tokens.colors.background.secondary,
  },
  promptsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
  },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.background.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: isDark ? tokens.colors.border.light : tokens.colors.accent[100],
    marginRight: 8,
    ...tokens.shadow.xs,
  },
  promptEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  promptText: {
    fontSize: 13,
    color: tokens.colors.text.secondary,
    fontWeight: '500',
    maxWidth: 140,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: tokens.colors.background.secondary,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  userBubble: {
    justifyContent: 'flex-end',
  },
  aiBubble: {
    justifyContent: 'flex-start',
  },
  messageAvatarImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    marginBottom: 4,
  },
  messageContent: {
    maxWidth: '75%',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userContent: {
    backgroundColor: tokens.colors.accent.blue,
    borderBottomRightRadius: 6,
    marginLeft: 'auto',
  },
  aiContent: {
    backgroundColor: tokens.colors.background.primary,
    borderBottomLeftRadius: 6,
    ...tokens.shadow.sm,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    color: tokens.colors.text.primary,
  },
  userText: {
    color: '#fff',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  typingText: {
    fontSize: 14,
    color: tokens.colors.text.muted,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: tokens.colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border.light,
  },
  input: {
    flex: 1,
    backgroundColor: tokens.colors.background.secondary,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 8,
    borderWidth: 1,
    borderColor: tokens.colors.border.light,
    color: tokens.colors.text.primary,
  },
  sendButton: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  sendButtonGradient: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
});
