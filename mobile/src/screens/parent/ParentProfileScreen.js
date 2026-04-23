import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View, Image, TouchableOpacity, Alert, ActivityIndicator, TextInput, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { parentService } from '../../services/parentService';
import { activityService } from '../../services/activityService';
import { mealService } from '../../services/mealService';
import { mediaService } from '../../services/mediaService';
import Card from '../../components/common/Card';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import tokens from '../../styles/tokens';
import { API_URL } from '../../config';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

function getAvatarUrl(avatar, bustCache = false) {
  if (!avatar) return null;
  // base64 data URIs render directly — no cache-busting needed
  if (avatar.startsWith('data:')) return avatar;
  let url;
  if (avatar.startsWith('http')) {
    url = avatar;
  } else {
    const base = (API_URL || '').replace(/\/api\/?$/, '');
    url = `${base}${avatar.startsWith('/') ? '' : '/'}${avatar}`;
  }
  if (bustCache) {
    const sep = url.includes('?') ? '&' : '?';
    url += `${sep}t=${Date.now()}`;
  }
  return url;
}

export function ParentProfileScreen() {
  const { user, refreshUser } = useAuth();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState([]);
  const [child, setChild] = useState(null);
  const [teacherName, setTeacherName] = useState('');
  const [parentGroupName, setParentGroupName] = useState('');
  const [weeklyStats, setWeeklyStats] = useState({
    activities: 0,
    meals: 0,
    media: 0,
  });
  const [monitoringRecords, setMonitoringRecords] = useState([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });

  // Bottom nav height + safe area + padding
  const BOTTOM_NAV_HEIGHT = 75;
  const bottomPadding = BOTTOM_NAV_HEIGHT + insets.bottom + 16;

  // Refresh profile data when screen gains focus (picks up web changes)
  useFocusEffect(
    useCallback(() => {
      loadProfile();
      refreshUser();
    }, [])
  );

  const loadProfile = async () => {
    try {
      setLoading(true);
      const childrenData = await parentService.getChildren();
      const childrenList = Array.isArray(childrenData) ? childrenData : [];
      setChildren(childrenList);
      setEditForm({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
      });

      // Load full child information if there's a child
      if (childrenList.length > 0) {
        const childId = childrenList[0].id;
        await loadChildData(childId);
      }
    } catch (error) {
      if (__DEV__) console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChildData = async (childId) => {
    if (!childId) return;

    try {
      const [childResponse, activitiesResponse, mealsResponse, mediaResponse, profileResponse, monitoringResponse] = await Promise.all([
        parentService.getChildById(childId).catch(() => null),
        activityService.getActivities({ childId }).catch(() => []),
        mealService.getMeals({ childId }).catch(() => []),
        mediaService.getMedia({ childId }).catch(() => []),
        parentService.getProfile().catch(() => null),
        api.get(`/parent/emotional-monitoring/child/${childId}`).catch(() => ({ data: { data: [] } })),
      ]);

      if (childResponse) {
        setChild(childResponse);
      }

      // Get teacher name from profile
      const assignedTeacher = profileResponse?.user?.assignedTeacher;
      const parentGroup = profileResponse?.user?.group;
      setParentGroupName(parentGroup?.name || '');

      const combinedTeacherName = assignedTeacher
        ? [assignedTeacher.firstName, assignedTeacher.lastName].filter(Boolean).join(' ')
        : (childResponse?.teacher || '');
      setTeacherName(combinedTeacherName);

      // Calculate weekly stats (last 7 days)
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const activities = Array.isArray(activitiesResponse) ? activitiesResponse : [];
      const meals = Array.isArray(mealsResponse) ? mealsResponse : [];
      const media = Array.isArray(mediaResponse) ? mediaResponse : [];

      const activitiesThisWeek = activities.filter(a => {
        const activityDate = new Date(a.date || a.createdAt);
        return activityDate >= weekAgo;
      }).length;

      const mealsThisWeek = meals.filter(m => {
        const mealDate = new Date(m.date || m.createdAt);
        return mealDate >= weekAgo;
      }).length;

      const mediaThisWeek = media.filter(m => {
        const mediaDate = new Date(m.date || m.createdAt);
        return mediaDate >= weekAgo;
      }).length;

      setWeeklyStats({
        activities: activitiesThisWeek,
        meals: mealsThisWeek,
        media: mediaThisWeek,
      });

      // Load monitoring records
      const monitoring = Array.isArray(monitoringResponse.data?.data) ? monitoringResponse.data.data : [];
      setMonitoringRecords(monitoring);
    } catch (error) {
      if (__DEV__) console.error('Error loading child data:', error);
    }
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 0;
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const getPhotoUrl = (photo) => {
    if (!photo) return null;
    if (photo.startsWith('data:')) return photo;
    if (photo.startsWith('http')) return photo;
    const base = (API_URL || '').replace(/\/api\/?$/, '');
    return `${base}${photo.startsWith('/') ? '' : '/'}${photo}`;
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

      // Generate safe filename and detect MIME type
      let filename = `avatar-${Date.now()}.jpg`;
      let mimeType = 'image/jpeg';

      const uriParts = uri.split('/');
      const uriFilename = uriParts[uriParts.length - 1];
      if (uriFilename && uriFilename.includes('.')) {
        filename = uriFilename;
        const ext = filename.split('.').pop().toLowerCase();
        if (ext === 'png') mimeType = 'image/png';
        else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
        else if (ext === 'gif') mimeType = 'image/gif';
        else if (ext === 'webp') mimeType = 'image/webp';
      }

      const formData = new FormData();
      formData.append('avatar', {
        uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
        name: filename,
        type: mimeType,
      });

      // Do NOT set Content-Type manually
      await api.put('/user/avatar', formData, {
        timeout: 60000,
      });

      await refreshUser();
      setAvatarVersion(v => v + 1);
      Alert.alert(
        t('common.success', { defaultValue: 'Success' }),
        t('profile.photoUploaded', { defaultValue: 'Profile photo updated successfully' })
      );
    } catch (error) {
      if (__DEV__) console.error('Avatar upload error:', error);
      const errorMessage = error?.response?.data?.error || error?.message || t('profile.photoUploadFailed', { defaultValue: 'Failed to upload photo' });
      Alert.alert(
        t('common.error', { defaultValue: 'Error' }),
        errorMessage
      );
    } finally {
      setUploadingAvatar(false);
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

  if (loading) {
    return <LoadingSpinner />;
  }

  const u = user || {};

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
          {/* Profile Card */}
          <Card style={styles.profileCard}>
            <TouchableOpacity onPress={handleAvatarUpload} disabled={uploadingAvatar}>
              <View style={styles.avatarContainer}>
                {u.avatar ? (
                  <Image source={{ uri: getAvatarUrl(u.avatar, avatarVersion > 0) }} style={styles.avatarImage} resizeMode="cover" />
                ) : (
                  <LinearGradient colors={tokens.colors.gradients.ocean} style={styles.avatarGradient}>
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
                  <Ionicons name="heart" size={14} color={tokens.colors.accent.blue} />
                  <Text style={styles.roleText}>{t('dashboard.roleParent', { defaultValue: 'Parent' })}</Text>
                </View>
                <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
                  <Ionicons name="create-outline" size={16} color={tokens.colors.text.white} />
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

          {/* Child Information Section - Full Details */}
          {child ? (
            <>
              {/* Child Profile Hero */}
              <Card style={styles.childHeroCard}>
                <View style={styles.childHeroContent}>
                  <View style={styles.childAvatarContainer}>
                    {child.photo ? (
                      <Image
                        source={{ uri: getPhotoUrl(child.photo) }}
                        style={styles.childAvatarImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.childAvatar}>
                        <Text style={styles.childAvatarText}>
                          {child.firstName?.charAt(0) || ''}{child.lastName?.charAt(0) || ''}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.childHeroInfo}>
                    <View style={styles.childHeroNameRow}>
                      <Text style={styles.childHeroName}>
                        {child.firstName} {child.lastName}
                      </Text>
                      {child.gender && (
                        <View style={styles.genderBadge}>
                          <Text style={styles.genderBadgeText}>
                            {t(`child.gender.${child.gender?.toLowerCase()}`, { defaultValue: child.gender })}
                          </Text>
                        </View>
                      )}
                    </View>
                    {child.dateOfBirth && (
                      <View style={styles.ageRow}>
                        <Ionicons name="calendar-outline" size={16} color={tokens.colors.accent.blue} />
                        <Text style={styles.ageText}>
                          {t('child.ageYears', { count: calculateAge(child.dateOfBirth) })}
                        </Text>
                      </View>
                    )}
                    <View style={styles.infoBadges}>
                      {child.school && (
                        <View style={styles.infoBadge}>
                          <Ionicons name="school" size={14} color={tokens.colors.accent.blue} />
                          <Text style={styles.infoBadgeText}>{child.school}</Text>
                        </View>
                      )}
                      {parentGroupName && (
                        <View style={styles.infoBadge}>
                          <Ionicons name="people" size={14} color={tokens.colors.accent.blue} />
                          <Text style={styles.infoBadgeText}>{parentGroupName}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </Card>

              {/* Basic Information */}
              <Card style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIconContainer, { backgroundColor: tokens.colors.accent.blueSoft }]}>
                    <Ionicons name="person" size={20} color={tokens.colors.accent.blue} />
                  </View>
                  <Text style={styles.sectionTitle}>{t('child.basicInfo', { defaultValue: 'Basic Information' })}</Text>
                </View>
                <View style={styles.infoGrid}>
                  <InfoItem
                    label={t('child.fullName', { defaultValue: 'Full name' })}
                    value={`${child.firstName} ${child.lastName}`}
                    icon="person-outline"
                  />
                  {child.dateOfBirth && (
                    <InfoItem
                      label={t('child.birthDate', { defaultValue: 'Date of birth' })}
                      value={formatDate(child.dateOfBirth)}
                      icon="calendar-outline"
                    />
                  )}
                  {child.disabilityType && (
                    <InfoItem
                      label={t('child.diagnosis', { defaultValue: 'Diagnosis' })}
                      value={child.disabilityType}
                      icon="medical-outline"
                      color={tokens.colors.semantic.error}
                    />
                  )}
                  <InfoItem
                    label={t('child.teacher', { defaultValue: 'Teacher' })}
                    value={(teacherName && teacherName.trim()) || child.teacher || '\u2014'}
                    icon="school-outline"
                    color={tokens.colors.accent.blue}
                  />
                </View>
              </Card>

              {/* Special Needs */}
              {child.specialNeeds && (
                <Card style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <View style={[styles.sectionIconContainer, { backgroundColor: tokens.colors.semantic.errorSoft }]}>
                      <Ionicons name="heart" size={20} color={tokens.colors.semantic.error} />
                    </View>
                    <Text style={[styles.sectionTitle, { color: tokens.colors.semantic.error }]}>
                      {t('child.specialNeeds', { defaultValue: 'Special Needs' })}
                    </Text>
                  </View>
                  <View style={styles.specialNeedsContent}>
                    <Text style={styles.specialNeedsText}>
                      {child.specialNeeds}
                    </Text>
                  </View>
                </Card>
              )}

              {/* Weekly Stats */}
              <Card style={styles.sectionCard}>
                <Text style={styles.statsTitle}>
                  {t('child.weeklyResults', { defaultValue: 'Weekly Results' })}
                </Text>
                <View style={styles.statsList}>
                  <StatRow
                    label={t('child.activities', { defaultValue: 'Activities' })}
                    value={weeklyStats.activities}
                  />
                  <StatRow
                    label={t('child.meals', { defaultValue: 'Meals' })}
                    value={weeklyStats.meals}
                  />
                  <StatRow
                    label={t('child.media', { defaultValue: 'Media' })}
                    value={weeklyStats.media}
                  />
                </View>
              </Card>

              {/* Emotional Monitoring */}
              {monitoringRecords.length > 0 && (
                <Card style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <View style={[styles.sectionIconContainer, { backgroundColor: tokens.colors.joy.roseSoft }]}>
                      <Ionicons name="heart" size={20} color={tokens.colors.joy.rose} />
                    </View>
                    <Text style={styles.sectionTitle}>
                      {t('profile.monitoringJournal', { defaultValue: 'Monitoring Journal' })}
                    </Text>
                  </View>
                  <View style={styles.monitoringList}>
                    {monitoringRecords.slice(0, 5).map((record) => {
                      const emotionalState = record.emotionalState || {};
                      const checkedCount = Object.values(emotionalState).filter(Boolean).length;
                      const totalCount = Object.keys(emotionalState).length;
                      const percentage = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

                      return (
                        <View key={record.id} style={styles.monitoringCard}>
                          <View style={styles.monitoringHeader}>
                            <View>
                              <Text style={styles.monitoringDate}>
                                {formatDate(record.date)}
                              </Text>
                              {record.teacher && (
                                <Text style={styles.monitoringTeacher}>
                                  {t('child.teacher', { defaultValue: 'Teacher' })}: {record.teacher.firstName} {record.teacher.lastName}
                                </Text>
                              )}
                            </View>
                            <View style={styles.monitoringPercentage}>
                              <Text style={styles.monitoringPercentageText}>{percentage}%</Text>
                              <Text style={styles.monitoringCount}>
                                {checkedCount} / {totalCount}
                              </Text>
                            </View>
                          </View>
                          {record.notes && (
                            <Text style={styles.monitoringNotes}>
                              {record.notes}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                  {monitoringRecords.length > 5 && (
                    <Text style={styles.moreRecords}>
                      +{monitoringRecords.length - 5} {t('common.more', { defaultValue: 'more' })}
                    </Text>
                  )}
                </Card>
              )}
            </>
          ) : children.length === 0 ? (
            <Card style={styles.sectionCard}>
              <EmptyState
                icon="people-outline"
                message={t('profile.noChildren', { defaultValue: 'No children attached' })}
              />
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper Components
function InfoItem({ label, value, icon, color = tokens.colors.accent.blue }) {
  return (
    <View style={styles.infoItem}>
      <View style={styles.infoItemLabelRow}>
        <Ionicons name={icon} size={16} color={color} />
        <Text style={styles.infoItemLabel}>{label}</Text>
      </View>
      <Text style={styles.infoItemValue}>{value}</Text>
    </View>
  );
}

function StatRow({ label, value }) {
  return (
    <View style={styles.statRow}>
      <View style={styles.statRowLeft}>
        <View style={styles.statDot} />
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
    </View>
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
    position: 'relative',
    marginBottom: tokens.space.lg,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: tokens.colors.text.white,
    textTransform: 'uppercase',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: tokens.colors.accent.blue,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadow.sm,
  },
  profileInfo: {
    alignItems: 'center',
    width: '100%',
  },
  profileName: {
    ...tokens.type.h2,
    color: tokens.colors.text.primary,
    marginBottom: tokens.space.sm,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokens.space.md,
    gap: tokens.space.xs,
  },
  profileEmail: {
    ...tokens.type.body,
    color: tokens.colors.text.secondary,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.accent.blueSoft,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    borderRadius: tokens.radius.pill,
    gap: tokens.space.xs,
    marginBottom: tokens.space.lg,
  },
  roleText: {
    ...tokens.type.sub,
    fontWeight: '600',
    color: tokens.colors.accent.blue,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.accent.blue,
    paddingHorizontal: tokens.space.xl,
    paddingVertical: tokens.space.md,
    borderRadius: tokens.radius.pill,
    gap: tokens.space.sm,
  },
  editButtonText: {
    ...tokens.type.button,
    color: tokens.colors.text.white,
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
    gap: tokens.space.lg,
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

  // Child Hero
  childHeroCard: {},
  childHeroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.lg,
  },
  childAvatarContainer: {
    position: 'relative',
  },
  childAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colors.accent.blue + '20',
    ...tokens.shadow.soft,
  },
  childAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  childAvatarText: {
    ...tokens.type.h1,
    color: tokens.colors.accent.blue,
  },
  childHeroInfo: {
    flex: 1,
  },
  childHeroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: tokens.space.sm,
    marginBottom: tokens.space.sm,
  },
  childHeroName: {
    ...tokens.type.h2,
    color: tokens.colors.text.primary,
  },
  genderBadge: {
    backgroundColor: tokens.colors.accent[50],
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.xs,
    borderRadius: tokens.radius.pill,
  },
  genderBadgeText: {
    ...tokens.type.caption,
    color: tokens.colors.accent.blue,
    textTransform: 'uppercase',
  },
  ageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.xs,
    marginBottom: tokens.space.md,
  },
  ageText: {
    ...tokens.type.body,
    color: tokens.colors.text.secondary,
  },
  infoBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space.sm,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.xs,
    backgroundColor: tokens.colors.background.secondary,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    borderRadius: tokens.radius.lg,
    ...tokens.shadow.sm,
  },
  infoBadgeText: {
    ...tokens.type.sub,
    fontWeight: '600',
    color: tokens.colors.text.primary,
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

  // Info Grid
  infoGrid: {
    gap: tokens.space.lg,
  },
  infoItem: {
    gap: tokens.space.xs,
  },
  infoItemLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.xs,
    marginBottom: 2,
  },
  infoItemLabel: {
    ...tokens.type.caption,
    color: tokens.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoItemValue: {
    ...tokens.type.bodyLarge,
    color: tokens.colors.text.primary,
  },

  // Special Needs
  specialNeedsContent: {
    backgroundColor: tokens.colors.semantic.errorSoft,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.lg,
  },
  specialNeedsText: {
    ...tokens.type.body,
    color: tokens.colors.semantic.error,
    lineHeight: 22,
  },

  // Stats
  statsTitle: {
    ...tokens.type.h3,
    color: tokens.colors.text.primary,
    marginBottom: tokens.space.lg,
  },
  statsList: {
    gap: tokens.space.lg,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tokens.colors.accent.blue,
  },
  statLabel: {
    ...tokens.type.sub,
    color: tokens.colors.text.secondary,
  },
  statValue: {
    ...tokens.type.h2,
    color: tokens.colors.text.primary,
  },

  // Monitoring
  monitoringList: {
    gap: tokens.space.md,
  },
  monitoringCard: {
    backgroundColor: tokens.colors.background.tertiary,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.md,
  },
  monitoringHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: tokens.space.sm,
  },
  monitoringDate: {
    ...tokens.type.body,
    fontWeight: '600',
    color: tokens.colors.text.primary,
  },
  monitoringTeacher: {
    ...tokens.type.sub,
    color: tokens.colors.text.secondary,
    marginTop: 2,
  },
  monitoringPercentage: {
    alignItems: 'flex-end',
  },
  monitoringPercentageText: {
    ...tokens.type.h2,
    color: tokens.colors.accent.blue,
  },
  monitoringCount: {
    ...tokens.type.caption,
    color: tokens.colors.text.secondary,
    marginTop: 2,
  },
  monitoringNotes: {
    ...tokens.type.sub,
    color: tokens.colors.text.secondary,
    marginTop: tokens.space.sm,
    paddingTop: tokens.space.sm,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border.light,
  },
  moreRecords: {
    ...tokens.type.sub,
    color: tokens.colors.accent.blue,
    textAlign: 'center',
    marginTop: tokens.space.md,
    fontWeight: '600',
  },
});
