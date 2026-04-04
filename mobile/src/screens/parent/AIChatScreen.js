import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { parentService } from '../../services/parentService';
import { useTranslation } from 'react-i18next';
import tokens from '../../styles/tokens';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/common/ScreenHeader';

const CHAT_STORAGE_KEY = '@uchqun/ai-chat-messages';
const getDefaultMessage = (t) => ({
  role: 'assistant',
  content: t('aiChat.welcomeMessage', { defaultValue: "Salom! Men sizning AI yordamchingizman. Farzandingiz ta'limi haqida savollaringiz bo'lsa, bemalol so'rang! 🎓" }),
  timestamp: new Date().toISOString(),
});

const QUICK_PROMPTS = [
  { emoji: '📚', text: "Uy vazifasi maslahatlar" },
  { emoji: '🎯', text: "O'qishda rivojlanish" },
  { emoji: '💡', text: "Motivatsiya usullari" },
  { emoji: '🤝', text: "Ijtimoiy ko'nikmalar" },
];

// Static loading dots component
function TypingIndicator() {
  return (
    <View style={styles.typingContainer}>
      <View style={styles.typingAvatar}>
        <Text style={styles.typingAvatarEmoji}>🤖</Text>
      </View>
      <View style={styles.typingBubble}>
        <View style={styles.typingDots}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.typingDot} />
          ))}
        </View>
      </View>
    </View>
  );
}

export function AIChatScreen() {
  const navigation = useNavigation();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState([getDefaultMessage(t)]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const scrollViewRef = useRef(null);
  const BOTTOM_NAV_HEIGHT = 75;
  const keyboardVerticalOffset = Platform.OS === 'ios' ? (insets.bottom > 0 ? insets.bottom + 60 : 90) : 0;

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const saved = await AsyncStorage.getItem(CHAT_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
          } else {
            setMessages([getDefaultMessage(t)]);
          }
        } else {
          setMessages([getDefaultMessage(t)]);
        }
      } catch (e) {
        if (__DEV__) console.warn('Failed to load saved AI chat:', e);
        setMessages([getDefaultMessage(t)]);
      } finally {
        setInitialLoading(false);
      }
    };
    loadMessages();
  }, []);

  useEffect(() => {
    if (initialLoading) return;
    const saveMessages = async () => {
      try {
        await AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
      } catch (e) {
        if (__DEV__) console.warn('Failed to save AI chat history:', e);
      }
    };
    saveMessages();
  }, [messages, initialLoading]);

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const sendMessage = async (text) => {
    const messageText = text || inputText.trim();
    if (!messageText || loading) return;

    setInputText('');
    setMessages((prev) => [
      ...prev,
      {
        role: 'user',
        content: messageText,
        timestamp: new Date().toISOString(),
      },
    ]);
    setLoading(true);

    try {
      const currentMessages = [
        ...messages,
        {
          role: 'user',
          content: messageText,
          timestamp: new Date().toISOString(),
        },
      ];
      const response = await parentService.aiChat(messageText, i18n.language, currentMessages);
      const assistantMessage =
        response?.response ||
        response?.advice ||
        response?.message ||
        response?.data?.response ||
        response?.data?.advice ||
        response?.data?.message ||
        t('aiChat.errorMessage', { defaultValue: "Kechirasiz, xatolik yuz berdi. Qaytadan urinib ko'ring." });
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: assistantMessage,
          timestamp: response?.timestamp || new Date().toISOString(),
        },
      ]);
    } catch (error) {
      const errorMessage =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        t('aiChat.errorMessage', { defaultValue: "Kechirasiz, xatolik yuz berdi. Qaytadan urinib ko'ring." });
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: errorMessage,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = async () => {
    setMessages([getDefaultMessage(t)]);
    try {
      await AsyncStorage.removeItem(CHAT_STORAGE_KEY);
    } catch (e) {
      if (__DEV__) console.warn('Failed to clear chat:', e);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('uz-UZ', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader 
        title="AI Yordamchi" 
        showBack={true}
        rightComponent={
          <Pressable
            style={styles.clearButton}
            onPress={clearChat}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={20} color={tokens.colors.text.primary} />
          </Pressable>
        }
      />
      <View style={styles.content}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={keyboardVerticalOffset}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Welcome card for empty/initial state */}
            {messages.length <= 1 && (
              <View style={styles.welcomeCard}>
                <View style={styles.welcomeIconContainer}>
                  <Text style={styles.welcomeIcon}>🎓</Text>
                </View>
                <Text style={styles.welcomeTitle}>
                  Ta'lim bo'yicha yordam
                </Text>
                <Text style={styles.welcomeText}>
                  Farzandingiz ta'limi, rivojlanishi va qo'llab-quvvatlash
                  haqida savollar bering
                </Text>

                {/* Quick prompts */}
                <View style={styles.quickPromptsContainer}>
                  {QUICK_PROMPTS.map((prompt, index) => (
                    <Pressable
                      key={index}
                      style={({ pressed }) => [
                        styles.quickPrompt,
                        pressed && styles.quickPromptPressed,
                      ]}
                      onPress={() => sendMessage(prompt.text)}
                    >
                      <Text style={styles.quickPromptEmoji}>{prompt.emoji}</Text>
                      <Text style={styles.quickPromptText}>{prompt.text}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Messages */}
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <View
                  key={index}
                  style={[
                    styles.messageRow,
                    isUser && styles.userMessageRow,
                  ]}
                >
                  {!isUser && (
                    <View style={styles.avatarContainer}>
                      <Text style={styles.avatarEmoji}>🤖</Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.messageBubble,
                      isUser ? styles.userBubble : styles.aiBubble,
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        isUser && styles.userMessageText,
                      ]}
                    >
                      {msg.content}
                    </Text>
                    <Text
                      style={[
                        styles.messageTime,
                        isUser && styles.userMessageTime,
                      ]}
                    >
                      {formatTime(msg.timestamp)}
                    </Text>
                  </View>
                  {isUser && (
                    <View style={styles.userAvatarContainer}>
                      <Text style={styles.avatarEmoji}>👤</Text>
                    </View>
                  )}
                </View>
              );
            })}

            {loading && <TypingIndicator />}
          </ScrollView>

          {/* Input Bar */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder={t('aiChat.inputPlaceholder', { defaultValue: 'Savol yozing...' })}
                placeholderTextColor={tokens.colors.text.tertiary}
                multiline
                maxLength={500}
              />
              <Pressable
                style={({ pressed }) => [
                  styles.sendButton,
                  (!inputText.trim() || loading) && styles.sendButtonDisabled,
                  pressed && inputText.trim() && !loading && styles.sendButtonPressed,
                ]}
                onPress={() => sendMessage()}
                disabled={!inputText.trim() || loading}
              >
                <LinearGradient
                  colors={
                    inputText.trim() && !loading
                      ? ['#667EEA', '#764BA2']
                      : ['#E2E8F0', '#E2E8F0']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sendButtonGradient}
                >
                  <Ionicons
                    name="send"
                    size={18}
                    color={inputText.trim() && !loading ? '#fff' : tokens.colors.text.tertiary}
                  />
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background.primary,
  },
  content: {
    flex: 1,
  },
  clearButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: tokens.space.lg,
    paddingBottom: tokens.space.xl,
  },
  welcomeCard: {
    backgroundColor: tokens.colors.background.secondary,
    borderRadius: tokens.radius.xl,
    padding: tokens.space.xl,
    marginBottom: tokens.space.xl,
    alignItems: 'center',
    ...tokens.shadow.soft,
  },
  welcomeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: tokens.colors.accent[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.space.md,
  },
  welcomeIcon: {
    fontSize: 32,
  },
  welcomeTitle: {
    fontSize: tokens.type.h2.fontSize,
    fontWeight: tokens.type.h2.fontWeight,
    color: tokens.colors.text.primary,
    marginBottom: tokens.space.sm,
  },
  welcomeText: {
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: tokens.space.lg,
  },
  quickPromptsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: tokens.space.sm,
    marginTop: tokens.space.sm,
  },
  quickPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.accent[50],
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    borderRadius: tokens.radius.pill,
    gap: tokens.space.xs,
  },
  quickPromptPressed: {
    backgroundColor: tokens.colors.accent[100],
    transform: [{ scale: 0.98 }],
  },
  quickPromptEmoji: {
    fontSize: 14,
  },
  quickPromptText: {
    fontSize: tokens.type.sub.fontSize,
    fontWeight: '600',
    color: tokens.colors.accent.blueVibrant,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: tokens.space.md,
  },
  userMessageRow: {
    justifyContent: 'flex-end',
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: tokens.colors.accent[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.space.sm,
  },
  userAvatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: tokens.colors.joy.lavenderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: tokens.space.sm,
  },
  avatarEmoji: {
    fontSize: 16,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm + 2,
    borderRadius: tokens.radius.lg,
  },
  aiBubble: {
    backgroundColor: tokens.colors.background.secondary,
    borderBottomLeftRadius: tokens.radius.xs,
    ...tokens.shadow.xs,
  },
  userBubble: {
    backgroundColor: tokens.colors.accent.blue,
    borderBottomRightRadius: tokens.radius.xs,
  },
  messageText: {
    fontSize: tokens.type.body.fontSize,
    lineHeight: tokens.type.body.fontSize * 1.5,
    color: tokens.colors.text.primary,
  },
  userMessageText: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 10,
    color: tokens.colors.text.secondary,
    marginTop: tokens.space.xs,
    alignSelf: 'flex-end',
  },
  userMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: tokens.space.md,
  },
  typingAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: tokens.colors.accent[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.space.sm,
  },
  typingAvatarEmoji: {
    fontSize: 16,
  },
  typingBubble: {
    backgroundColor: tokens.colors.background.secondary,
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.md,
    borderRadius: tokens.radius.lg,
    borderBottomLeftRadius: tokens.radius.xs,
    ...tokens.shadow.xs,
  },
  typingDots: {
    flexDirection: 'row',
    gap: tokens.space.xs,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tokens.colors.accent.blue,
  },
  inputContainer: {
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.md,
    paddingBottom: tokens.space.lg,
    backgroundColor: tokens.colors.background.secondary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: tokens.colors.background.tertiary,
    borderRadius: tokens.radius.xl,
    paddingLeft: tokens.space.md,
    paddingRight: tokens.space.xs,
    paddingVertical: tokens.space.xs,
  },
  input: {
    flex: 1,
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.primary,
    maxHeight: 100,
    paddingVertical: tokens.space.sm,
    paddingRight: tokens.space.sm,
  },
  sendButton: {
    borderRadius: tokens.radius.pill,
    overflow: 'hidden',
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  sendButtonGradient: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
