import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Dimensions,
  Image,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { clearAuth } from '../../storage/authStorage';
import { API_URL } from '../../config';
import tokens from '../../styles/tokens';
import Card from '../../components/common/Card';

const { width } = Dimensions.get('window');

export function LoginScreen() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Clear any stale auth data when LoginScreen mounts
  useEffect(() => {
    clearAuth().catch(() => {});
    if (__DEV__) {
      console.log('[LoginScreen] API URL:', API_URL);
    }
  }, []);

  const onSubmit = async () => {
    if (submitting) return;
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = typeof password === 'string' ? password.trim() : String(password || '').trim();
    if (!trimmedEmail || !trimmedPassword) {
      setError(t('login.fillAllFields', { defaultValue: 'Iltimos, email va parolni kiriting' }));
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await clearAuth();
      await login(trimmedEmail, trimmedPassword);
    } catch (e) {
      let msg = t('login.invalid', { defaultValue: 'Email yoki parol noto\'g\'ri' });

      if (e?.response?.data?.error) {
        msg = e.response.data.error;
      } else if (e?.response?.data?.message) {
        msg = e.response.data.message;
      } else if (e?.message && !e.message.includes('Network')) {
        msg = e.message;
      } else if (e?.message?.includes('Network')) {
        msg = t('login.networkError', { defaultValue: 'Serverga ulanib bo\'lmadi. Internet aloqasini tekshiring.' });
      }
      setError(msg);
      if (__DEV__) {
        console.error('[LoginScreen] Login error:', e?.response?.data || e?.message || e);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={styles.content}
          >
            {/* Logo and header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Image
                  source={require('../../../assets/Uchqun logo.png')}
                  style={styles.appIcon}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.title}>{t('login.title', { defaultValue: 'Uchqun Portal' })}</Text>
              <Text style={styles.subtitle}>{t('login.subtitle', { defaultValue: 'Maxsus ta\'lim maktabi boshqaruvi' })}</Text>
            </View>

            {/* Login card */}
            <Card style={styles.card}>
              {error ? (
                <View style={styles.errorContainer} accessibilityRole="alert" accessibilityLiveRegion="assertive">
                  <Ionicons name="alert-circle" size={18} color={tokens.colors.semantic.error} />
                  <Text style={styles.error}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.form}>
                {/* Email input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('login.email', { defaultValue: 'Email manzil' })}</Text>
                  <View style={styles.inputContainer}>
                    <View style={styles.inputIconContainer}>
                      <Ionicons name="mail-outline" size={20} color={tokens.colors.text.secondary} />
                    </View>
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      textContentType="username"
                      placeholder={t('login.emailPlaceholder', { defaultValue: 'sizning@email.com' })}
                      placeholderTextColor={tokens.colors.text.tertiary}
                      style={styles.input}
                      accessibilityLabel={t('login.email', { defaultValue: 'Email manzil' })}
                      accessibilityHint={t('login.emailHint', { defaultValue: 'Enter your email to log in' })}
                    />
                  </View>
                </View>

                {/* Password input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('login.password', { defaultValue: 'Parol' })}</Text>
                  <View style={styles.inputContainer}>
                    <View style={styles.inputIconContainer}>
                      <Ionicons name="lock-closed-outline" size={20} color={tokens.colors.text.secondary} />
                    </View>
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      textContentType="password"
                      placeholder={t('login.passwordPlaceholder', { defaultValue: 'Parolni kiriting' })}
                      placeholderTextColor={tokens.colors.text.tertiary}
                      style={[styles.input, styles.inputWithIcon]}
                      accessibilityLabel={t('login.password', { defaultValue: 'Parol' })}
                      accessibilityHint={t('login.passwordHint', { defaultValue: 'Enter your password' })}
                    />
                    <Pressable
                      onPress={() => setShowPassword((v) => !v)}
                      hitSlop={10}
                      style={({ pressed }) => [
                        styles.eyeButton,
                        pressed && { opacity: 0.7 }
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={showPassword ? t('login.hidePassword', { defaultValue: 'Hide password' }) : t('login.showPassword', { defaultValue: 'Show password' })}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                        size={20}
                        color={tokens.colors.text.secondary}
                      />
                    </Pressable>
                  </View>
                </View>

                {/* Login button */}
                <Pressable
                  onPress={onSubmit}
                  disabled={submitting}
                  style={({ pressed }) => [
                    styles.buttonContainer,
                    pressed && !submitting && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                    submitting && styles.buttonDisabled,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t('login.submit', { defaultValue: 'Kirish' })}
                  accessibilityState={{ disabled: submitting }}
                  accessibilityHint={t('login.submitHint', { defaultValue: 'Double tap to log in' })}
                >
                  <LinearGradient
                    colors={submitting 
                      ? [tokens.colors.text.muted, tokens.colors.text.muted] 
                      : [tokens.colors.joy.lavender, tokens.colors.accent.blue]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.button}
                  >
                    {submitting ? (
                      <ActivityIndicator color={tokens.colors.text.white} size="small" />
                    ) : (
                      <>
                        <Text style={styles.buttonText}>{t('login.submit', { defaultValue: 'Kirish' })}</Text>
                        <Ionicons name="arrow-forward" size={18} color={tokens.colors.text.white} />
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>
            </Card>

            {/* Footer hint */}
            <Text style={styles.footerText}>
              <Ionicons name="shield-checkmark-outline" size={12} color={tokens.colors.text.muted} />
              {' '}{t('login.secureAuth', { defaultValue: 'JWT bilan xavfsiz autentifikatsiya' })}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background.primary, // Warm Sand background
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: tokens.space.xl,
    paddingVertical: tokens.space['2xl'],
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: tokens.space['3xl'],
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: tokens.colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.space.lg,
    ...tokens.shadow.soft,
  },
  appIcon: {
    width: 50,
    height: 50,
  },
  title: {
    fontSize: tokens.type.h1.fontSize,
    fontWeight: tokens.type.h1.fontWeight,
    color: tokens.colors.text.primary,
    marginBottom: tokens.space.sm,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.secondary,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  card: {
    marginBottom: tokens.space.xl,
  },
  form: {
    gap: tokens.space.xl,
  },
  inputGroup: {
    gap: tokens.space.sm,
  },
  label: {
    fontSize: tokens.type.sub.fontSize,
    fontWeight: '600',
    color: tokens.colors.text.primary,
    letterSpacing: 0.3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.background.tertiary,
    borderRadius: tokens.radius.lg,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    // Removed: borderWidth, borderColor - no borders per design
  },
  inputIconContainer: {
    marginRight: tokens.space.sm,
  },
  input: {
    flex: 1,
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.primary,
    paddingVertical: tokens.space.xs,
  },
  inputWithIcon: {
    paddingRight: tokens.space['3xl'],
  },
  eyeButton: {
    position: 'absolute',
    right: tokens.space.md,
    padding: tokens.space.sm,
  },
  buttonContainer: {
    marginTop: tokens.space.md,
    borderRadius: tokens.radius.lg,
    overflow: 'hidden',
    ...tokens.shadow.soft,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.space.lg,
    gap: tokens.space.sm,
  },
  buttonText: {
    fontSize: tokens.type.button.fontSize,
    fontWeight: tokens.type.button.fontWeight,
    color: tokens.colors.text.white,
    letterSpacing: tokens.type.button.letterSpacing,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.semantic.errorSoft,
    padding: tokens.space.md,
    borderRadius: tokens.radius.md,
    marginBottom: tokens.space.xl,
    gap: tokens.space.sm,
    // Removed: borderWidth, borderColor - no borders per design
  },
  error: {
    flex: 1,
    color: tokens.colors.semantic.error,
    fontSize: tokens.type.sub.fontSize,
    lineHeight: 18,
  },
  footerText: {
    fontSize: tokens.type.caption.fontSize,
    color: tokens.colors.text.muted,
    textAlign: 'center',
    marginTop: tokens.space.lg,
    letterSpacing: 0.5,
  },
});
