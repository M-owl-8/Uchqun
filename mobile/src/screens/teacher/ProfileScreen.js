import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Image, TouchableOpacity, Alert, ActivityIndicator, TextInput, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { teacherService } from '../../services/teacherService';
import Card from '../../components/common/Card';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import tokens from '../../styles/tokens';
import { API_URL } from '../../config';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

function getAvatarUrl(avatar) {
  if (!avatar) return null;
  // base64 data URIs render directly
  if (avatar.startsWith('data:')) return avatar;
  if (avatar.startsWith('http')) return avatar;
  const base = (API_URL || '').replace(/\/api\/?$/, '');
  return `${base}${avatar.startsWith('/') ? '' : '/'}${avatar}`;
}

export function ProfileScreen() {
  const { user, refreshUser } = useAuth();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);

  // Bottom nav height + safe area + padding
  const BOTTOM_NAV_HEIGHT = 75;
  const bottomPadding = BOTTOM_NAV_HEIGHT + insets.bottom + 16;
  const [profile, setProfile] = useState(null);
  const [groups, setGroups] = useState([]);
  const [parents, setParents] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const [profileData, groupsData, parentsData, ratingsData] = await Promise.all([
        teacherService.getProfile(),
        teacherService.getGroups(),
        teacherService.getParents(),
        teacherService.getTeacherRatings(),
      ]);
      setProfile(profileData);
      setGroups(groupsData);
      setParents(parentsData);
      setRatings(ratingsData);
      setEditForm({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
      });
    } catch (error) {
      if (__DEV__) console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      if (!editForm.firstName.trim() || !editForm.lastName.trim()) {
        Alert.alert(t('common.error'), t('profile.nameRequired', { defaultValue: 'Name is required' }));
        return;
      }

      const response = await api.put('/user/profile', {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
      });

      if (response.data?.success) {
        await refreshUser();
        setEditing(false);
        Alert.alert(
          t('common.success', { defaultValue: 'Success' }),
          t('profile.updated', { defaultValue: 'Profile updated successfully' })
        );
      }
    } catch (error) {
      if (__DEV__) console.error('Profile update error:', error);
      Alert.alert(
        t('common.error', { defaultValue: 'Error' }),
        t('profile.updateFailed', { defaultValue: 'Failed to update profile' })
      );
    }
  };

  const handleAvatarUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('common.error', { defaultValue: 'Error' }),
          t('profile.photoPermissionRequired', { defaultValue: 'Photo library permission is required' })
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      setUploadingAvatar(true);

      const asset = result.assets[0];
      const uri = asset.uri;

      // Extract filename and type properly
      let filename = `avatar-${Date.now()}.jpg`;
      let mimeType = 'image/jpeg';

      // Try to get filename from URI
      const uriParts = uri.split('/');
      const uriFilename = uriParts[uriParts.length - 1];
      if (uriFilename && uriFilename.includes('.')) {
        filename = uriFilename;
        const ext = filename.split('.').pop().toLowerCase();
        if (ext === 'png') {
          mimeType = 'image/png';
        } else if (ext === 'jpg' || ext === 'jpeg') {
          mimeType = 'image/jpeg';
        } else if (ext === 'gif') {
          mimeType = 'image/gif';
        } else if (ext === 'webp') {
          mimeType = 'image/webp';
        }
      }

      // Create FormData - React Native FormData format
      const formData = new FormData();
      formData.append('avatar', {
        uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
        name: filename,
        type: mimeType,
      });

      // Don't set Content-Type header - let the API interceptor handle it
      await api.put('/user/avatar', formData, {
        timeout: 60000, // 60 seconds for file upload
      });

      if (refreshUser) {
        await refreshUser();
      }

      await loadProfile();

      Alert.alert(
        t('common.success', { defaultValue: 'Success' }),
        t('profile.avatarUpdated', { defaultValue: 'Avatar updated successfully' })
      );
    } catch (error) {
      if (__DEV__) console.error('Avatar upload error:', error);
      const errorMessage = error.response?.data?.error ||
                          error.response?.data?.message ||
                          error.message ||
                          t('profile.uploadError', { defaultValue: 'Failed to upload avatar' });
      Alert.alert(
        t('common.error', { defaultValue: 'Error' }),
        errorMessage
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader title={t('nav.profile', { defaultValue: 'Profile' })} />
        <EmptyState message={t('profile.notFound', { defaultValue: 'Profile not found' })} />
      </SafeAreaView>
    );
  }

  const u = user || profile.teacher || profile;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title={t('nav.profile', { defaultValue: 'Profile' })}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View>
          {/* Profile Information Card */}
          <Card style={styles.profileCard}>
            <TouchableOpacity onPress={handleAvatarUpload} disabled={uploadingAvatar}>
              <View style={styles.avatarContainer}>
                {u.avatar ? (
                  <Image source={{ uri: getAvatarUrl(u.avatar) }} style={styles.avatarImage} resizeMode="cover" />
                ) : (
                  <LinearGradient
                    colors={tokens.colors.gradients.forest}
                    style={styles.avatarGradient}
                  >
                    <Text style={styles.avatarText}>
                      {u.firstName?.charAt(0) || ''}{u.lastName?.charAt(0) || ''}
                    </Text>
                  </LinearGradient>
                )}
                {uploadingAvatar && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  </View>
                )}
                <View style={styles.cameraButton}>
                  <Ionicons name="camera" size={12} color="#FFFFFF" />
                </View>
              </View>
            </TouchableOpacity>

            {!editing ? (
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {u.firstName ?? '\u2014'} {u.lastName ?? ''}
                </Text>
                <View style={styles.emailRow}>
                  <Ionicons name="mail-outline" size={14} color={tokens.colors.text.secondary} />
                  <Text style={styles.profileEmail}>{u.email ?? '\u2014'}</Text>
                </View>
                <View style={styles.roleBadge}>
                  <Ionicons name="people" size={14} color={tokens.colors.semantic.success} />
                  <Text style={styles.roleText}>{t('dashboard.roleTeacher', { defaultValue: 'My Role: Teacher' })}</Text>
                </View>
                <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
                  <Ionicons name="create-outline" size={16} color={tokens.colors.text.primary} />
                  <Text style={styles.editButtonText}>{t('profile.editProfile', { defaultValue: 'Edit Profile' })}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.editForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('profile.firstName', { defaultValue: 'First Name' })}</Text>
                  <TextInput
                    style={styles.input}
                    value={editForm.firstName}
                    onChangeText={(text) => setEditForm({ ...editForm, firstName: text })}
                    placeholderTextColor={tokens.colors.text.muted}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('profile.lastName', { defaultValue: 'Last Name' })}</Text>
                  <TextInput
                    style={styles.input}
                    value={editForm.lastName}
                    onChangeText={(text) => setEditForm({ ...editForm, lastName: text })}
                    placeholderTextColor={tokens.colors.text.muted}
                  />
                </View>
                <View style={styles.buttonRow}>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => setEditing(false)}>
                    <Text style={styles.cancelButtonText}>{t('common.cancel', { defaultValue: 'Cancel' })}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
                    <Text style={styles.saveButtonText}>{t('common.save', { defaultValue: 'Save' })}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Card>

          {/* Groups Section */}
          {groups.length > 0 && (
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconContainer, { backgroundColor: tokens.colors.semantic.successSoft }]}>
                  <Ionicons name="people" size={20} color={tokens.colors.semantic.success} />
                </View>
                <Text style={styles.sectionTitle}>{t('profile.myGroups', { defaultValue: 'My Groups' })}</Text>
              </View>
              {groups.map((group, index) => (
                <View
                  key={group.id}
                  style={[
                    styles.listItem,
                    index === groups.length - 1 && styles.lastListItem,
                  ]}
                >
                  <View style={[styles.listIconContainer, { backgroundColor: tokens.colors.semantic.successSoft }]}>
                    <Ionicons name="people" size={20} color={tokens.colors.semantic.success} />
                  </View>
                  <View style={styles.listContent}>
                    <Text style={styles.listTitle}>{group.name}</Text>
                    {group.description && (
                      <Text style={styles.listSubtitle}>{group.description}</Text>
                    )}
                    <Text style={styles.listMeta}>
                      {group.parentCount || 0} {t('profile.parents', { defaultValue: 'parents' })} {'\u2022'} {t('profile.capacity', { defaultValue: 'Capacity' })}: {group.capacity}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          )}

          {/* Parents Section */}
          {parents.length > 0 && (
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconContainer, { backgroundColor: tokens.colors.accent.blueSoft }]}>
                  <Ionicons name="person" size={20} color={tokens.colors.accent.blue} />
                </View>
                <Text style={styles.sectionTitle}>{t('profile.myParents', { defaultValue: 'My Parents' })} ({parents.length})</Text>
              </View>
              {parents.slice(0, 5).map((parent, index) => (
                <View
                  key={parent.id}
                  style={[
                    styles.listItem,
                    index === Math.min(4, parents.length - 1) && styles.lastListItem,
                  ]}
                >
                  <View style={[styles.listIconContainer, { backgroundColor: tokens.colors.accent.blueSoft }]}>
                    <Ionicons name="person" size={20} color={tokens.colors.accent.blue} />
                  </View>
                  <View style={styles.listContent}>
                    <Text style={styles.listTitle}>
                      {parent.firstName} {parent.lastName}
                    </Text>
                    {parent.email && (
                      <Text style={styles.listSubtitle}>{parent.email}</Text>
                    )}
                    {parent.children && parent.children.length > 0 && (
                      <Text style={styles.listMeta}>
                        {parent.children.length} {parent.children.length === 1 ? t('profile.child', { defaultValue: 'child' }) : t('profile.children', { defaultValue: 'children' })}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
              {parents.length > 5 && (
                <Text style={styles.moreText}>
                  +{parents.length - 5} {t('profile.moreParents', { defaultValue: 'more parents' })}
                </Text>
              )}
            </Card>
          )}

          {/* Teacher Ratings Section */}
          {ratings.length > 0 && (
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconContainer, { backgroundColor: tokens.colors.accent.goldSoft }]}>
                  <Ionicons name="star" size={20} color={tokens.colors.accent.gold} />
                </View>
                <Text style={styles.sectionTitle}>{t('profile.teacherRatings', { defaultValue: 'Teacher Ratings' })}</Text>
              </View>
              {ratings.slice(0, 10).map((teacher, index) => {
                const isCurrentTeacher = teacher.id === user?.id;
                return (
                  <View
                    key={teacher.id}
                    style={[
                      styles.ratingItem,
                      isCurrentTeacher && styles.currentTeacherItem,
                      index === Math.min(9, ratings.length - 1) && styles.lastListItem,
                    ]}
                  >
                    <View style={styles.rankContainer}>
                      <Text style={[styles.rankText, isCurrentTeacher && styles.currentTeacherRank]}>
                        #{teacher.rank}
                      </Text>
                    </View>
                    <View style={styles.ratingContent}>
                      <Text style={[styles.listTitle, isCurrentTeacher && styles.currentTeacherName]}>
                        {teacher.firstName} {teacher.lastName}
                        {isCurrentTeacher && ` (${t('profile.you', { defaultValue: 'You' })})`}
                      </Text>
                      <View style={styles.ratingRow}>
                        <Ionicons name="star" size={14} color={tokens.colors.accent.gold} />
                        <Text style={styles.ratingText}>
                          {teacher.rating?.toFixed(1) || '0.0'}
                        </Text>
                        <Text style={styles.ratingCount}>
                          ({teacher.totalRatings || 0} {t('profile.ratings', { defaultValue: 'ratings' })})
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
              {ratings.length > 10 && (
                <Text style={styles.moreText}>
                  +{ratings.length - 10} {t('profile.moreTeachers', { defaultValue: 'more teachers' })}
                </Text>
              )}
            </Card>
          )}
        </View>
      </ScrollView>
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
  content: {
    padding: tokens.space.xl,
    gap: tokens.space['2xl'],
  },

  // Profile Card
  profileCard: {
    alignItems: 'center',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: tokens.space.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: tokens.colors.text.white,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: tokens.colors.accent.blue,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadow.sm,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    ...tokens.type.h2,
    color: tokens.colors.text.primary,
    marginBottom: tokens.space.sm,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.xs,
    marginBottom: tokens.space.md,
  },
  profileEmail: {
    ...tokens.type.body,
    color: tokens.colors.text.secondary,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.semantic.successSoft,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    borderRadius: tokens.radius.pill,
    gap: tokens.space.xs,
    marginBottom: tokens.space.lg,
  },
  roleText: {
    ...tokens.type.sub,
    fontWeight: '600',
    color: tokens.colors.semantic.success,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.background.tertiary,
    paddingHorizontal: tokens.space.xl,
    paddingVertical: tokens.space.md,
    borderRadius: tokens.radius.pill,
    gap: tokens.space.sm,
  },
  editButtonText: {
    ...tokens.type.button,
    color: tokens.colors.text.primary,
  },
  editForm: {
    width: '100%',
    marginTop: tokens.space.lg,
  },
  inputGroup: {
    marginBottom: tokens.space.lg,
  },
  inputLabel: {
    ...tokens.type.sub,
    fontWeight: '600',
    color: tokens.colors.text.primary,
    marginBottom: tokens.space.sm,
  },
  input: {
    backgroundColor: tokens.colors.background.tertiary,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.md,
    ...tokens.type.body,
    color: tokens.colors.text.primary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: tokens.space.md,
    marginTop: tokens.space.sm,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: tokens.colors.background.tertiary,
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.space.lg,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...tokens.type.button,
    color: tokens.colors.text.primary,
  },
  saveButton: {
    flex: 1,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.accent.blue,
    paddingVertical: tokens.space.lg,
    alignItems: 'center',
  },
  saveButtonText: {
    ...tokens.type.button,
    color: '#FFFFFF',
  },

  // Section Cards
  sectionCard: {},
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
    marginBottom: tokens.space.lg,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    ...tokens.type.h3,
    color: tokens.colors.text.primary,
  },

  // List Items
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: tokens.space.md,
    paddingBottom: tokens.space.md,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border.light,
  },
  lastListItem: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },
  listIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.space.md,
  },
  listContent: {
    flex: 1,
  },
  listTitle: {
    ...tokens.type.body,
    fontWeight: '600',
    color: tokens.colors.text.primary,
    marginBottom: 2,
  },
  listSubtitle: {
    ...tokens.type.sub,
    color: tokens.colors.text.secondary,
    marginBottom: 2,
  },
  listMeta: {
    ...tokens.type.sub,
    color: tokens.colors.text.muted,
  },
  moreText: {
    ...tokens.type.sub,
    color: tokens.colors.accent.blue,
    textAlign: 'center',
    marginTop: tokens.space.md,
    fontWeight: '600',
  },

  // Ratings
  ratingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokens.space.md,
    paddingBottom: tokens.space.md,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border.light,
  },
  currentTeacherItem: {
    backgroundColor: tokens.colors.semantic.successSoft,
    marginHorizontal: -tokens.space.md,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    borderRadius: tokens.radius.md,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
    marginRight: tokens.space.sm,
  },
  rankText: {
    fontSize: 17,
    fontWeight: '700',
    color: tokens.colors.text.muted,
  },
  currentTeacherRank: {
    color: tokens.colors.semantic.success,
  },
  ratingContent: {
    flex: 1,
  },
  currentTeacherName: {
    color: tokens.colors.semantic.success,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  ratingText: {
    ...tokens.type.sub,
    fontWeight: '600',
    color: tokens.colors.text.primary,
    marginLeft: 4,
  },
  ratingCount: {
    ...tokens.type.sub,
    color: tokens.colors.text.muted,
    marginLeft: 4,
  },
});
