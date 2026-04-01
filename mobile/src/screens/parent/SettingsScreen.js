import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, Alert, Modal, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { changeLanguage, getCurrentLanguage, getAvailableLanguages } from '../../i18n/config';
import tokens from '../../styles/tokens';
import { api } from '../../services/api';
import Card from '../../components/common/Card';
import { ScreenHeader } from '../../components/common/ScreenHeader';

export function SettingsScreen() {
  const { user, logout, refreshUser } = useAuth();

  const navigation = useNavigation();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const parentNavigation = navigation?.getParent?.();

  // Bottom nav height + safe area + padding
  const BOTTOM_NAV_HEIGHT = 75;
  const bottomPadding = BOTTOM_NAV_HEIGHT + insets.bottom + 16;

  // Password change modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Profile edit modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    notificationPreferences: {
      email: true,
      push: true,
    },
  });
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    setCurrentLanguage(getCurrentLanguage());
  }, []);

  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        notificationPreferences: user.notificationPreferences || {
          email: true,
          push: true,
        },
      });
    }
  }, [user]);

  const handleProfileUpdate = async () => {
    if (!profileData.firstName || !profileData.lastName) {
      Alert.alert(t('common.error', { defaultValue: 'Error' }), t('settings.nameRequired', { defaultValue: 'First and last name are required' }));
      return;
    }

    setProfileLoading(true);
    try {
      await api.put('/user/profile', {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phone: profileData.phone,
        notificationPreferences: profileData.notificationPreferences,
      });
      if (refreshUser) await refreshUser();
      Alert.alert(t('common.success', { defaultValue: 'Success' }), t('settings.profileUpdated', { defaultValue: 'Profile updated successfully' }));
      setShowProfileModal(false);
    } catch (error) {
      const message = error.response?.data?.message || t('settings.profileUpdateFailed', { defaultValue: 'Failed to update profile' });
      Alert.alert(t('common.error', { defaultValue: 'Error' }), message);
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      Alert.alert(t('common.error', { defaultValue: 'Error' }), t('settings.allFieldsRequired', { defaultValue: 'All fields are required' }));
      return;
    }
    if (passwordData.newPassword.length < 8) {
      Alert.alert(t('common.error', { defaultValue: 'Error' }), t('settings.passwordMinLength', { defaultValue: 'Password must be at least 8 characters' }));
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Alert.alert(t('common.error', { defaultValue: 'Error' }), t('settings.passwordsMismatch', { defaultValue: 'New passwords do not match' }));
      return;
    }

    setPasswordLoading(true);
    try {
      await api.put('/user/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      Alert.alert(t('common.success', { defaultValue: 'Success' }), t('settings.passwordChanged', { defaultValue: 'Password changed successfully' }));
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswords({ current: false, new: false, confirm: false });
      setShowPasswordModal(false);
    } catch (error) {
      const message = error.response?.data?.message || t('settings.passwordChangeFailed', { defaultValue: 'Failed to change password' });
      Alert.alert(t('common.error', { defaultValue: 'Error' }), message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLanguageChange = async (languageCode) => {
    await changeLanguage(languageCode);
    setCurrentLanguage(languageCode);
    Alert.alert(t('settings.languageChanged'), t('settings.languageChangedDesc'));
  };

  const handleLogout = () => {
    Alert.alert(
      t('profile.logoutTitle', { defaultValue: 'Logout' }),
      t('profile.confirmLogout', { defaultValue: 'Are you sure you want to logout?' }),
      [
        { text: t('profile.no', { defaultValue: "No" }), style: 'cancel' },
        {
          text: t('profile.yes', { defaultValue: 'Yes' }),
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              if (__DEV__) {
                console.error('Logout error:', error);
              }
            }
          },
        },
      ]
    );
  };

  const navigateToStackScreen = (screenName) => {
    try {
      if (!screenName) {
        if (__DEV__) {
          console.error('[SettingsScreen] Invalid screenName');
        }
        return;
      }
      if (parentNavigation) {
        parentNavigation.navigate(screenName);
      } else {
        if (__DEV__) {
          console.warn(`Cannot navigate to ${screenName}: Parent navigator not found`);
        }
        if (navigation?.navigate) {
          navigation.navigate(screenName);
        }
      }
    } catch (error) {
      if (__DEV__) {
        console.error(`Navigation error to ${screenName}:`, error);
      }
    }
  };

  const settingsSections = [
    {
      title: t('settings.account', { defaultValue: 'Account' }),
      items: [
        {
          icon: 'notifications-outline',
          title: t('settings.notifications', { defaultValue: 'Notifications' }),
          subtitle: t('settings.notificationsDesc', { defaultValue: 'Manage notification preferences' }),
          onPress: () => {},
          color: '#F59E0B',
        },
      ],
    },
    {
      title: t('settings.support', { defaultValue: 'Yordam' }),
      items: [
        {
          icon: 'help-circle-outline',
          title: t('help.title', { defaultValue: 'Yordam va qo\'llab-quvvatlash' }),
          subtitle: t('help.desc', { defaultValue: 'Yordam olish va qo\'llab-quvvatlash bilan bog\'lanish' }),
          onPress: () => navigateToStackScreen('Help'),
          color: '#10B981',
        },
      ],
    },
    {
      title: t('settings.general', { defaultValue: 'General' }),
      items: [
        {
          icon: 'information-circle-outline',
          title: t('settings.about', { defaultValue: 'About' }),
          subtitle: 'Uchqun Platform v1.0.0',
          onPress: () => Alert.alert(t('settings.about', { defaultValue: 'About' }), 'Uchqun Platform v1.0.0\nSpecial Education School Management'),
          color: '#64748B',
        },
        {
          icon: 'log-out-outline',
          title: t('profile.logoutTitle', { defaultValue: 'Logout' }),
          subtitle: t('profile.logoutDesc', { defaultValue: 'Sign out of your account' }),
          onPress: handleLogout,
          color: '#EF4444',
          destructive: true,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title={t('settings.title', { defaultValue: 'Settings' })}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View>
          {/* Language Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings.language', { defaultValue: 'Language' })}</Text>
            <Card padding={tokens.space.sm}>
              {(getAvailableLanguages() || []).map((lang, index) => (
                <Pressable
                  key={lang.code}
                  style={({ pressed }) => [
                    styles.languageItem,
                    currentLanguage === lang.code && styles.languageItemActive,
                    index === getAvailableLanguages().length - 1 && styles.lastItem,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => handleLanguageChange(lang.code)}
                  accessibilityRole="radio"
                  accessibilityLabel={`${lang.nativeName} (${lang.name})`}
                  accessibilityState={{ selected: currentLanguage === lang.code }}
                >
                  <View style={styles.languageInfo}>
                    <Text style={styles.languageName}>{lang.nativeName}</Text>
                    <Text style={styles.languageSubtitle}>{lang.name}</Text>
                  </View>
                  {currentLanguage === lang.code ? (
                    <View style={styles.checkCircle}>
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    </View>
                  ) : (
                    <View style={styles.emptyCircle} />
                  )}
                </Pressable>
              ))}
            </Card>
          </View>

          {/* Settings Sections */}
          {settingsSections.map((section, sectionIndex) => (
            <View key={sectionIndex} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.settingsItems}>
                {section.items.map((item, itemIndex) => (
                  <Card
                    key={itemIndex}
                    onPress={item.onPress}
                    padding={0}
                  >
                    <View
                      style={styles.settingsItem}
                      accessibilityRole={item.hasToggle ? 'switch' : 'button'}
                      accessibilityLabel={item.title}
                      accessibilityHint={item.subtitle}
                      accessibilityState={item.hasToggle ? { checked: false } : undefined}
                    >
                      <View style={[styles.iconCircle, { backgroundColor: `${item.color}20` }]}>
                        <Ionicons name={item.icon} size={20} color={item.color} />
                      </View>
                      <View style={styles.settingsItemContent}>
                        <Text style={[styles.settingsItemTitle, item.destructive && styles.destructiveText]}>
                          {item.title}
                        </Text>
                        {item.subtitle && (
                          <Text style={styles.settingsItemSubtitle}>{item.subtitle}</Text>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={tokens.colors.text.muted} />
                    </View>
                  </Card>
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Password Change Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <Card style={styles.modalCard} padding={tokens.space.xl}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{t('settings.changePassword', { defaultValue: 'Change Password' })}</Text>
                  <TouchableOpacity onPress={() => setShowPasswordModal(false)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('common.close', { defaultValue: 'Close' })}>
                    <Ionicons name="close" size={24} color={tokens.colors.text.primary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  {[
                    { key: 'currentPassword', label: t('settings.currentPassword', { defaultValue: 'Current Password' }), showKey: 'current' },
                    { key: 'newPassword', label: t('settings.newPassword', { defaultValue: 'New Password' }), showKey: 'new' },
                    { key: 'confirmPassword', label: t('settings.confirmPassword', { defaultValue: 'Confirm Password' }), showKey: 'confirm' },
                  ].map((field) => (
                    <View key={field.key} style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>{field.label}</Text>
                      <View style={styles.inputContainer}>
                        <TextInput
                          style={styles.passwordTextInput}
                          value={passwordData[field.key]}
                          onChangeText={(text) => setPasswordData({ ...passwordData, [field.key]: text })}
                          placeholder={field.label}
                          placeholderTextColor={tokens.colors.text.muted}
                          secureTextEntry={!showPasswords[field.showKey]}
                          autoCapitalize="none"
                          accessibilityLabel={field.label}
                        />
                        <TouchableOpacity
                          onPress={() => setShowPasswords({ ...showPasswords, [field.showKey]: !showPasswords[field.showKey] })}
                          hitSlop={8}
                          accessibilityRole="button"
                          accessibilityLabel={showPasswords[field.showKey] ? t('login.hidePassword', { defaultValue: 'Hide password' }) : t('login.showPassword', { defaultValue: 'Show password' })}
                        >
                          <Ionicons
                            name={showPasswords[field.showKey] ? 'eye-off-outline' : 'eye-outline'}
                            size={20}
                            color={tokens.colors.text.muted}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}

                  <Pressable
                    style={({ pressed }) => [
                      styles.saveButton,
                      pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                    ]}
                    onPress={handlePasswordChange}
                    disabled={passwordLoading}
                    accessibilityRole="button"
                    accessibilityLabel={t('settings.updatePassword', { defaultValue: 'Update Password' })}
                    accessibilityState={{ disabled: passwordLoading }}
                  >
                    {passwordLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Ionicons name="lock-closed" size={18} color="#FFFFFF" />
                        <Text style={styles.saveButtonText}>{t('settings.updatePassword', { defaultValue: 'Update Password' })}</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </Card>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Profile Edit Modal */}
      <Modal
        visible={showProfileModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProfileModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <Card style={styles.modalCard} padding={tokens.space.xl}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{t('settings.editProfile', { defaultValue: 'Edit Profile' })}</Text>
                  <TouchableOpacity onPress={() => setShowProfileModal(false)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('common.close', { defaultValue: 'Close' })}>
                    <Ionicons name="close" size={24} color={tokens.colors.text.primary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>{t('settings.firstName', { defaultValue: 'First Name' })}</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.textInput}
                        value={profileData.firstName}
                        onChangeText={(text) => setProfileData({ ...profileData, firstName: text })}
                        placeholder={t('settings.firstName', { defaultValue: 'First Name' })}
                        placeholderTextColor={tokens.colors.text.muted}
                        accessibilityLabel={t('settings.firstName', { defaultValue: 'First Name' })}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>{t('settings.lastName', { defaultValue: 'Last Name' })}</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.textInput}
                        value={profileData.lastName}
                        onChangeText={(text) => setProfileData({ ...profileData, lastName: text })}
                        placeholder={t('settings.lastName', { defaultValue: 'Last Name' })}
                        placeholderTextColor={tokens.colors.text.muted}
                        accessibilityLabel={t('settings.lastName', { defaultValue: 'Last Name' })}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>{t('settings.phone', { defaultValue: 'Phone' })}</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.textInput}
                        value={profileData.phone}
                        onChangeText={(text) => setProfileData({ ...profileData, phone: text })}
                        placeholder="+998 XX XXX XX XX"
                        placeholderTextColor={tokens.colors.text.muted}
                        keyboardType="phone-pad"
                        accessibilityLabel={t('settings.phone', { defaultValue: 'Phone' })}
                      />
                    </View>
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.saveButton,
                      pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                    ]}
                    onPress={handleProfileUpdate}
                    accessibilityRole="button"
                    accessibilityLabel={t('settings.saveProfile', { defaultValue: 'Save Changes' })}
                    accessibilityState={{ disabled: profileLoading }}
                    disabled={profileLoading}
                  >
                    {profileLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                        <Text style={styles.saveButtonText}>{t('settings.saveProfile', { defaultValue: 'Save Changes' })}</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </Card>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: tokens.space.xl,
  },
  section: {
    marginBottom: tokens.space['2xl'],
  },
  sectionTitle: {
    ...tokens.type.h3,
    color: tokens.colors.text.primary,
    marginBottom: tokens.space.lg,
    paddingHorizontal: 2,
  },
  settingsItems: {
    gap: tokens.space.lg,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: tokens.space.md,
    borderRadius: tokens.radius.md,
    marginBottom: tokens.space.xs,
    minHeight: tokens.touchTarget.comfortable,
  },
  languageItemActive: {
    backgroundColor: tokens.colors.joy.lavenderSoft,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    ...tokens.type.body,
    fontWeight: '600',
    color: tokens.colors.text.primary,
    marginBottom: 2,
  },
  languageSubtitle: {
    ...tokens.type.sub,
    color: tokens.colors.text.muted,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colors.accent.blue,
    ...tokens.shadow.sm,
  },
  emptyCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: tokens.colors.background.tertiary,
  },
  lastItem: {
    marginBottom: 0,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.md,
    minHeight: tokens.touchTarget.comfortable,
    gap: tokens.space.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsItemContent: {
    flex: 1,
  },
  settingsItemTitle: {
    ...tokens.type.body,
    fontWeight: '600',
    color: tokens.colors.text.primary,
    marginBottom: 2,
  },
  settingsItemSubtitle: {
    ...tokens.type.sub,
    color: tokens.colors.text.muted,
  },
  destructiveText: {
    color: tokens.colors.semantic.error,
  },
  modalContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: tokens.colors.surface.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '80%',
  },
  modalCard: {
    borderTopLeftRadius: tokens.radius['2xl'],
    borderTopRightRadius: tokens.radius['2xl'],
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.space.xl,
  },
  modalTitle: {
    ...tokens.type.h2,
    color: tokens.colors.text.primary,
  },
  modalBody: {
    gap: tokens.space.lg,
  },
  inputGroup: {
    gap: tokens.space.sm,
  },
  inputLabel: {
    ...tokens.type.sub,
    fontWeight: '600',
    color: tokens.colors.text.primary,
    letterSpacing: 0.3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.background.tertiary,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.md,
  },
  textInput: {
    ...tokens.type.body,
    color: tokens.colors.text.primary,
    flex: 1,
    padding: 0,
  },
  passwordTextInput: {
    flex: 1,
    ...tokens.type.body,
    color: tokens.colors.text.primary,
    padding: 0,
  },
  saveButton: {
    marginTop: tokens.space.md,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.accent.blue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.space.lg,
    gap: tokens.space.sm,
  },
  saveButtonText: {
    ...tokens.type.button,
    color: tokens.colors.text.white,
  },
});
