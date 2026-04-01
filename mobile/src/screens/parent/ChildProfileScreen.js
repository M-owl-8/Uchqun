import React, { useEffect, useState } from 'react';
import { 
  ScrollView, 
  StyleSheet, 
  Text, 
  View, 
  Pressable, 
  Image,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
// Note: ImagePicker requires expo-image-picker package
// For now, using a simpler approach - can be enhanced later
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { changeLanguage, getCurrentLanguage, getAvailableLanguages } from '../../i18n/config';
import { parentService } from '../../services/parentService';
import { activityService } from '../../services/activityService';
import { mealService } from '../../services/mealService';
import { mediaService } from '../../services/mediaService';
import { api } from '../../services/api';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import tokens from '../../styles/tokens';
import Card from '../../components/common/Card';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import ListRow from '../../components/common/ListRow';
import Skeleton from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { API_URL } from '../../config';

// Helper function to get avatar/photo URL
function getPhotoUrl(photo) {
  if (!photo) return null;
  // If already a full URL, return as is
  if (photo.startsWith('http://') || photo.startsWith('https://')) {
    return photo;
  }
  // Get base URL without /api
  const base = (API_URL || '').replace(/\/api\/?$/, '') || 'https://uchqun-production.up.railway.app';
  // Handle /avatars/ paths (Appwrite storage)
  if (photo.startsWith('/avatars/')) {
    return `${base}${photo}`;
  }
  // Handle other relative paths
  return `${base}${photo.startsWith('/') ? '' : '/'}${photo}`;
}

export function ChildProfileScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const { on, off, connected } = useSocket();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { childId = null } = route?.params || {};
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Bottom nav height + safe area + padding
  const BOTTOM_NAV_HEIGHT = 75;
  const bottomPadding = BOTTOM_NAV_HEIGHT + insets.bottom + 16;
  const [child, setChild] = useState(null);
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(childId);
  const [teacherName, setTeacherName] = useState('');
  const [parentGroupName, setParentGroupName] = useState('');
  const [weeklyStats, setWeeklyStats] = useState({
    activities: 0,
    meals: 0,
    media: 0,
  });
  const [monitoringRecords, setMonitoringRecords] = useState([]);
  const [photoTimestamp, setPhotoTimestamp] = useState(Date.now());
  const [imageLoading, setImageLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [messageSubject, setMessageSubject] = useState('');
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [myMessages, setMyMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('en');

  const locale = {
    uz: 'uz-UZ',
    ru: 'ru-RU',
    en: 'en-US',
  }[i18n.language] || 'en-US';

  useEffect(() => {
    setCurrentLanguage(getCurrentLanguage());
  }, []);

  useEffect(() => {
    if (selectedChildId) {
      loadChild();
    } else {
      loadChildren();
    }
  }, [selectedChildId]);

  useEffect(() => {
    // Load messages only if user is authenticated
    // Messages endpoint might not be available, so we handle errors gracefully
    loadMessages();
  }, []);

  // Real-time WebSocket listeners
  useEffect(() => {
    if (!connected || !selectedChildId) return;

    const handleChildUpdate = (data) => {
      if (__DEV__) console.log('[ChildProfile] Child updated:', data);
      if (data.child?.id === selectedChildId) {
        // Update photo timestamp to force image refresh
        setPhotoTimestamp(Date.now());
        loadChild(); // Reload child data
      }
    };

    const handleActivityChange = (data) => {
      if (__DEV__) console.log('[ChildProfile] Activity change:', data);
      if (data.activity?.childId === selectedChildId || data.childId === selectedChildId) {
        loadChild(); // Reload to update stats
      }
    };

    const handleMealChange = (data) => {
      if (__DEV__) console.log('[ChildProfile] Meal change:', data);
      if (data.meal?.childId === selectedChildId || data.childId === selectedChildId) {
        loadChild(); // Reload to update stats
      }
    };

    const handleMediaChange = (data) => {
      if (__DEV__) console.log('[ChildProfile] Media change:', data);
      if (data.media?.childId === selectedChildId || data.childId === selectedChildId) {
        loadChild(); // Reload to update stats
      }
    };

    // Subscribe to events
    on('child:updated', handleChildUpdate);
    on('activity:created', handleActivityChange);
    on('activity:updated', handleActivityChange);
    on('activity:deleted', handleActivityChange);
    on('meal:created', handleMealChange);
    on('meal:updated', handleMealChange);
    on('meal:deleted', handleMealChange);
    on('media:created', handleMediaChange);
    on('media:updated', handleMediaChange);
    on('media:deleted', handleMediaChange);

    // Cleanup
    return () => {
      off('child:updated', handleChildUpdate);
      off('activity:created', handleActivityChange);
      off('activity:updated', handleActivityChange);
      off('activity:deleted', handleActivityChange);
      off('meal:created', handleMealChange);
      off('meal:updated', handleMealChange);
      off('meal:deleted', handleMealChange);
      off('media:created', handleMediaChange);
      off('media:updated', handleMediaChange);
      off('media:deleted', handleMediaChange);
    };
  }, [connected, selectedChildId, on, off]);

  const loadChildren = async () => {
    try {
      setLoading(true);
      setError(null);
      const childrenData = await parentService.getChildren();
      const childrenList = Array.isArray(childrenData) ? childrenData : [];
      setChildren(childrenList);
      
      if (childrenList.length > 0 && !selectedChildId) {
        setSelectedChildId(childrenList[0].id);
      }
    } catch (err) {
      if (__DEV__) console.error('Error loading children:', err);
      setError(t('common.loadError', { defaultValue: 'Failed to load data' }));
      setChildren([]);
    } finally {
      setLoading(false);
    }
  };

  const loadChild = async () => {
    if (!selectedChildId) return;
    
    try {
      setLoading(true);
      const [childResponse, activitiesResponse, mealsResponse, mediaResponse, profileResponse, monitoringResponse] = await Promise.all([
        parentService.getChildById(selectedChildId).catch(() => null),
        activityService.getActivities({ childId: selectedChildId }).catch(() => []),
        mealService.getMeals({ childId: selectedChildId }).catch(() => []),
        mediaService.getMedia({ childId: selectedChildId }).catch(() => []),
        parentService.getProfile().catch(() => null),
        api.get(`/parent/emotional-monitoring/child/${selectedChildId}`).catch(() => ({ data: { data: [] } })),
      ]);

      if (childResponse) {
        setChild(childResponse);
        
        // In React Native, Image component handles loading automatically
        // The Image component's onLoad/onError handlers will set imageLoading to false
        // Just initialize imageLoading state
        if (childResponse.photo) {
          // Image will load via Image component's onLoad handler
          // Keep imageLoading true until Image component loads
        } else {
          setImageLoading(false);
        }
      }

      // Get teacher name from profile (assignedTeacher) or child data - exactly like web
      const assignedTeacher = profileResponse?.user?.assignedTeacher;
      const parentGroup = profileResponse?.user?.group;
      setParentGroupName(parentGroup?.name || '');
      
      // Combine teacher name - prefer assignedTeacher, fallback to child.teacher (web logic)
      // Web: assignedTeacher ? [firstName, lastName].join(' ') : childResponse.data?.teacher || '—'
      const combinedTeacherName = assignedTeacher
        ? [assignedTeacher.firstName, assignedTeacher.lastName].filter(Boolean).join(' ')
        : (childResponse?.teacher || '');
      // Always set teacherName, even if empty (will show '—' in UI)
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
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      setLoadingMessages(true);
      // parentService.getMessages() already handles errors and returns empty array
      const messages = await parentService.getMessages();
      setMyMessages(Array.isArray(messages) ? messages : []);
    } catch (error) {
      // This catch is for any unexpected errors
      if (__DEV__) console.error('[ChildProfile] Error loading messages:', error);
      setMyMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleFileUpload = async () => {
    try {
      const ImagePicker = require('expo-image-picker');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('common.error', { defaultValue: 'Error' }),
          t('child.photoPermissionRequired', { defaultValue: 'Photo library permission is required' })
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled) return;

      setUploading(true);
      setShowAvatarSelector(false);

      const asset = result.assets[0];
      const base64 = asset.base64;
      const uri = asset.uri;
      const mimeType = asset.mimeType || 'image/jpeg';
      
      // Try FormData first (more reliable for large files)
      // If that fails, fallback to base64
      let uploadSuccess = false;
      let lastError = null;
      
      // Method 1: Try FormData (preferred for large files)
      try {
        const filename = uri.split('/').pop() || `photo-${Date.now()}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : mimeType;
        
        const formData = new FormData();
        formData.append('photo', {
          uri: uri,
          name: filename,
          type: type,
        });
        
        if (__DEV__) console.log('[Upload] Attempting FormData upload:', { filename, type, uri: uri.substring(0, 50) });
        
        await api.put(`/child/${selectedChildId}`, formData, {
          timeout: 90000, // 90 seconds
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        uploadSuccess = true;
        if (__DEV__) console.log('[Upload] FormData upload successful');
      } catch (formDataError) {
        if (__DEV__) console.warn('[Upload] FormData upload failed:', formDataError.message);
        lastError = formDataError;
        
        // Method 2: Fallback to base64 if FormData fails
        if (base64 && typeof base64 === 'string') {
          try {
            const photoBase64 = `data:${mimeType};base64,${base64}`;
            
            // Check if base64 is too large
            if (base64.length > 3 * 1024 * 1024) { // > 3MB
              if (__DEV__) console.warn('[Upload] Base64 image is large:', Math.round(base64.length / 1024 / 1024), 'MB');
            }
            
            if (__DEV__) console.log('[Upload] Attempting base64 upload:', {
              size: Math.round(base64.length / 1024),
              'KB': true,
              mimeType,
              photoBase64Length: photoBase64.length,
              photoBase64Prefix: photoBase64.substring(0, 50)
            });
            
            const response = await api.put(`/child/${selectedChildId}`, { photoBase64 }, {
              timeout: 90000, // 90 seconds
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            if (__DEV__) console.log('[Upload] Base64 upload response:', {
              status: response.status,
              hasData: !!response.data
            });
            
            uploadSuccess = true;
            if (__DEV__) console.log('[Upload] Base64 upload successful');
          } catch (base64Error) {
            if (__DEV__) console.error('[Upload] Base64 upload also failed:', base64Error.message);
            lastError = base64Error;
          }
        }
      }
      
      if (!uploadSuccess) {
        throw lastError || new Error('Upload failed: Both FormData and base64 methods failed');
      }

      setPhotoTimestamp(Date.now());
      await loadChild();
    } catch (error) {
      if (__DEV__) console.error('Error uploading photo:', error);
      
      let errorMessage = t('child.photoUploadFailed', { defaultValue: 'Failed to upload photo' });
      
      if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
        errorMessage = 'Internet aloqasi yo\'q yoki serverga ulanib bo\'lmadi. Internet aloqasini tekshiring.';
      } else if (error.response) {
        // Server responded with error
        errorMessage = error.response.data?.error || error.response.data?.message || errorMessage;
      } else if (error.message) {
        // Other error
        errorMessage = error.message;
      }
      
      Alert.alert(
        t('common.error', { defaultValue: 'Error' }),
        errorMessage
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageSubject.trim() || !messageText.trim()) {
      Alert.alert(t('common.error', { defaultValue: 'Error' }), t('profile.messageRequired', { defaultValue: 'Subject and message are required' }));
      return;
    }

    setSendingMessage(true);
    try {
      await parentService.sendMessage({
        subject: messageSubject.trim(),
        message: messageText.trim(),
      });
      Alert.alert(t('common.success', { defaultValue: 'Success' }), t('profile.messageSent', { defaultValue: 'Message sent successfully' }));
      setMessageSubject('');
      setMessageText('');
      setShowMessageModal(false);
      await loadMessages();
    } catch (error) {
      if (__DEV__) console.error('Error sending message:', error);
      Alert.alert(t('common.error', { defaultValue: 'Error' }), error.response?.data?.error || t('profile.messageError', { defaultValue: 'Error sending message' }));
    } finally {
      setSendingMessage(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    try {
      await logout();
    } catch (error) {
      if (__DEV__) console.error('Logout error:', error);
    }
  };

  const handleLanguageChange = async (languageCode) => {
    await changeLanguage(languageCode);
    setCurrentLanguage(languageCode);
    Alert.alert(t('settings.languageChanged', { defaultValue: 'Language Changed' }), t('settings.languageChangedDesc', { defaultValue: 'Language has been changed successfully' }));
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
      return date.toLocaleDateString(locale, { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  if (loading && !child) {
    return <LoadingSpinner />;
  }

  // Show child selector if multiple children and no child selected
  if (Array.isArray(children) && children.length > 1 && !selectedChildId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader 
          title={t('child.selectPrompt', { defaultValue: 'Select your child' })}
          showBack={navigation.canGoBack()}
        />
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}>
          <Card style={styles.card}>
            <Text style={styles.sectionTitle} allowFontScaling={true}>{t('child.selectPrompt', { defaultValue: 'Select your child' })}</Text>
            <View style={styles.childrenGrid}>
              {children.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => setSelectedChildId(c.id)}
                  style={styles.childSelectorCard}
                >
                  <Card>
                    <View style={styles.childSelectorContent}>
                      <View style={[styles.childSelectorAvatar, { backgroundColor: tokens.colors.accent.blue + '30' }]}>
                        <Text style={styles.childSelectorAvatarText}>
                          {c.firstName?.charAt(0) || ''}{c.lastName?.charAt(0) || ''}
                        </Text>
                      </View>
                      <View style={styles.childSelectorInfo}>
                        <Text style={styles.childSelectorName} allowFontScaling={true}>
                          {c.firstName} {c.lastName}
                        </Text>
                        {c.school && (
                          <Text style={styles.childSelectorSchool} allowFontScaling={true}>
                            {c.school}
                          </Text>
                        )}
                      </View>
                    </View>
                  </Card>
                </Pressable>
              ))}
            </View>
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!child) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader 
          title={t('child.profile', { defaultValue: 'Child Profile' })}
          showBack={navigation.canGoBack()}
        />
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}>
          <Card style={styles.emptyCard}>
            <EmptyState
              icon="person-outline"
              title={t('child.notFoundTitle', { defaultValue: 'Child not found' })}
              description={t('child.notFoundDesc', { defaultValue: 'No information found about your child' })}
            />
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader 
        title={`${child.firstName} ${child.lastName}`}
        showBack={navigation.canGoBack()}
      />
      {error && !loading && (
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Ionicons name="alert-circle-outline" size={48} color={tokens.colors.semantic.error} />
          <Text style={{ color: tokens.colors.text.secondary, marginTop: 12, textAlign: 'center' }}>{error}</Text>
          <Pressable onPress={() => loadChildren()} accessibilityRole="button"
            style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: tokens.colors.accent.blue, borderRadius: tokens.radius.md }}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>{t('common.retry', { defaultValue: 'Retry' })}</Text>
          </Pressable>
        </View>
      )}
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}>
      {/* Child Selector (if multiple children) */}
      {Array.isArray(children) && children.length > 1 && (
        <Card style={styles.selectorCard}>
          <View style={styles.selectorHeader}>
            <Ionicons name="people" size={20} color={tokens.colors.accent.blue} />
            <Text style={styles.selectorLabel} allowFontScaling={true}>
              {t('child.selectLabel', { defaultValue: 'Choose child' })}
            </Text>
          </View>
          <View style={styles.selectorDropdown}>
            {children.map((c) => (
              <Pressable
                key={c.id}
                style={[
                  styles.selectorOption,
                  selectedChildId === c.id && styles.selectorOptionActive,
                ]}
                onPress={() => {
                  setSelectedChildId(c.id);
                  setChild(null);
                  setLoading(true);
                  setImageLoading(true);
                  setPhotoTimestamp(Date.now());
                }}
              >
                <Text style={[
                  styles.selectorOptionText,
                  selectedChildId === c.id && styles.selectorOptionTextActive,
                ]} allowFontScaling={true}>
                  {c.firstName} {c.lastName} {c.school ? ` - ${c.school}` : ''}
                </Text>
                {selectedChildId === c.id && (
                  <Ionicons name="checkmark-circle" size={20} color={tokens.colors.accent.blue} />
                )}
              </Pressable>
            ))}
          </View>
        </Card>
      )}

      {/* Top Profile Hero - Like Web */}
      <Card style={styles.heroCard}>
        <View style={styles.heroContent}>
          <Pressable
            style={styles.avatarContainer}
            onPress={() => setShowAvatarSelector(true)}
            disabled={uploading}
          >
            {imageLoading && (
              <View style={styles.avatarLoading}>
                <ActivityIndicator size="small" color={tokens.colors.accent.blue} />
              </View>
            )}
            {child.photo ? (
              <Image
                key={`${child.photo}-${photoTimestamp}`}
                source={{
                  uri: (() => {
                    const photoUrl = getPhotoUrl(child.photo);
                    // Add timestamp for cache busting (except for Appwrite URLs which have query params)
                    if (photoUrl && (photoUrl.startsWith('http://') || photoUrl.startsWith('https://'))) {
                      // Check if URL already has query params
                      if (photoUrl.includes('?')) {
                        return `${photoUrl}&t=${photoTimestamp}`;
                      }
                      return `${photoUrl}?t=${photoTimestamp}`;
                    }
                    return photoUrl;
                  })(),
                }}
                style={[
                  styles.avatarImage,
                  imageLoading && styles.avatarImageLoading,
                ]}
                onLoad={() => setImageLoading(false)}
                onError={(error) => {
                  if (__DEV__) console.error('Image load error:', error);
                  setImageLoading(false);
                }}
                resizeMode="cover"
              />
            ) : (
              <LinearGradient
                colors={[tokens.colors.accent.blue + '30', tokens.colors.accent.blue + '15']}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>
                  {child.firstName?.charAt(0) || ''}{child.lastName?.charAt(0) || ''}
                </Text>
              </LinearGradient>
            )}
            {uploading && (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            )}
            <View style={styles.activeIndicator} />
          </Pressable>

          <View style={styles.heroInfo}>
            <View style={styles.heroNameRow}>
              <Text style={styles.heroName} allowFontScaling={true}>
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
                <Text style={styles.ageText} allowFontScaling={true}>
                  {t('child.ageYears', { count: calculateAge(child.dateOfBirth) })}
                </Text>
              </View>
            )}
            <View style={styles.infoBadges}>
              {child.school && (
                <View style={styles.infoBadge}>
                  <Ionicons name="school" size={14} color={tokens.colors.accent.blue} />
                  <Text style={styles.infoBadgeText} allowFontScaling={true}>{child.school}</Text>
                </View>
              )}
              {parentGroupName && (
                <View style={styles.infoBadge}>
                  <Ionicons name="people" size={14} color={tokens.colors.accent.blue} />
                  <Text style={styles.infoBadgeText} allowFontScaling={true}>{parentGroupName}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Card>

      <View style={styles.contentContainer}>
        {/* Basic Info */}
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person" size={24} color={tokens.colors.accent.blue} />
            <Text style={styles.sectionTitle} allowFontScaling={true}>{t('child.basicInfo', { defaultValue: 'Basic Information' })}</Text>
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
              value={(teacherName && teacherName.trim()) || child.teacher || '—'} 
              icon="school-outline"
              color={tokens.colors.accent.blue}
            />
          </View>
        </Card>

        {/* Special Needs */}
        {child.specialNeeds && (
          <Card style={styles.card}>
            <View style={styles.specialNeedsHeader}>
              <Ionicons name="heart" size={24} color={tokens.colors.semantic.error} />
              <Text style={styles.specialNeedsTitle} allowFontScaling={true}>
                {t('child.specialNeeds', { defaultValue: 'Special Needs' })}
              </Text>
            </View>
            <View style={styles.specialNeedsContent}>
              <Text style={styles.specialNeedsText} allowFontScaling={true}>
                {child.specialNeeds}
              </Text>
            </View>
          </Card>
        )}

        {/* Medical Information */}
        {(child.medicalDiagnosis || child.disabilityType) && (
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="medkit" size={24} color={tokens.colors.semantic.error} />
              <Text style={styles.sectionTitle} allowFontScaling={true}>
                {t('childProfile.medicalInfo', { defaultValue: 'Medical Information' })}
              </Text>
            </View>
            <View style={styles.infoGrid}>
              <ProfileInfoRow
                label={t('childProfile.medicalDiagnosis', { defaultValue: 'Diagnosis' })}
                value={child.medicalDiagnosis}
                icon="document-text-outline"
                color={tokens.colors.semantic.error}
                t={t}
              />
              {child.disabilityType && (
                <ProfileInfoRow
                  label={t('childProfile.disabilityType', { defaultValue: 'Disability Type' })}
                  value={child.disabilityType}
                  icon="medical-outline"
                  color={tokens.colors.semantic.warning}
                  t={t}
                />
              )}
            </View>
          </Card>
        )}

        {/* Institution Info */}
        {child.institutionStartDate && (
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="business" size={24} color={tokens.colors.accent.blue} />
              <Text style={styles.sectionTitle} allowFontScaling={true}>
                {t('childProfile.institutionDuration', { defaultValue: 'Institution Duration' })}
              </Text>
            </View>
            <View style={styles.infoGrid}>
              <ProfileInfoRow
                label={t('childProfile.institutionStartDate', { defaultValue: 'Admission Date' })}
                value={formatDate(child.institutionStartDate)}
                icon="calendar-outline"
                color={tokens.colors.accent.blue}
                t={t}
              />
              <ProfileInfoRow
                label={t('childProfile.institutionDuration', { defaultValue: 'Institution Duration' })}
                value={`${calculateAge(child.institutionStartDate)} ${t('childProfile.years', { defaultValue: 'years' })}`}
                icon="time-outline"
                color={tokens.colors.accent.blue}
                t={t}
              />
            </View>
          </Card>
        )}

        {/* Father Info */}
        {(child.fatherFullName || child.fatherDOB || child.fatherOccupation) && (
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="man" size={24} color={tokens.colors.accent.blue} />
              <Text style={styles.sectionTitle} allowFontScaling={true}>
                {t('childProfile.fatherInfo', { defaultValue: 'Father' })}
              </Text>
            </View>
            <View style={styles.infoGrid}>
              <ProfileInfoRow
                label={t('childProfile.fatherFullName', { defaultValue: 'Full Name' })}
                value={child.fatherFullName}
                icon="person-outline"
                color={tokens.colors.accent.blue}
                t={t}
              />
              <ProfileInfoRow
                label={t('childProfile.fatherDOB', { defaultValue: 'Date of Birth' })}
                value={child.fatherDOB ? formatDate(child.fatherDOB) : null}
                icon="calendar-outline"
                color={tokens.colors.accent.blue}
                t={t}
              />
              <ProfileInfoRow
                label={t('childProfile.fatherOccupation', { defaultValue: 'Occupation' })}
                value={child.fatherOccupation}
                icon="briefcase-outline"
                color={tokens.colors.accent.blue}
                t={t}
              />
            </View>
          </Card>
        )}

        {/* Mother Info */}
        {(child.motherFullName || child.motherDOB || child.motherOccupation) && (
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="woman" size={24} color={tokens.colors.joy.coral} />
              <Text style={styles.sectionTitle} allowFontScaling={true}>
                {t('childProfile.motherInfo', { defaultValue: 'Mother' })}
              </Text>
            </View>
            <View style={styles.infoGrid}>
              <ProfileInfoRow
                label={t('childProfile.motherFullName', { defaultValue: 'Full Name' })}
                value={child.motherFullName}
                icon="person-outline"
                color={tokens.colors.joy.coral}
                t={t}
              />
              <ProfileInfoRow
                label={t('childProfile.motherDOB', { defaultValue: 'Date of Birth' })}
                value={child.motherDOB ? formatDate(child.motherDOB) : null}
                icon="calendar-outline"
                color={tokens.colors.joy.coral}
                t={t}
              />
              <ProfileInfoRow
                label={t('childProfile.motherOccupation', { defaultValue: 'Occupation' })}
                value={child.motherOccupation}
                icon="briefcase-outline"
                color={tokens.colors.joy.coral}
                t={t}
              />
            </View>
          </Card>
        )}

        {/* Contact Info */}
        {(child.contactPhone || child.address) && (
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="call" size={24} color={tokens.colors.semantic.success} />
              <Text style={styles.sectionTitle} allowFontScaling={true}>
                {t('childProfile.contactPhone', { defaultValue: 'Contact' })}
              </Text>
            </View>
            <View style={styles.infoGrid}>
              <ProfileInfoRow
                label={t('childProfile.contactPhone', { defaultValue: 'Phone Number' })}
                value={child.contactPhone}
                icon="call-outline"
                color={tokens.colors.semantic.success}
                t={t}
              />
              <ProfileInfoRow
                label={t('childProfile.address', { defaultValue: 'Address' })}
                value={child.address}
                icon="location-outline"
                color={tokens.colors.semantic.info}
                t={t}
              />
            </View>
          </Card>
        )}

        {/* Child Description */}
        {child.childDescription && (
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle" size={24} color={tokens.colors.semantic.info} />
              <Text style={styles.sectionTitle} allowFontScaling={true}>
                {t('childProfile.childDescription', { defaultValue: 'Child Description' })}
              </Text>
            </View>
            <View style={styles.profileTextBlock}>
              <Text style={styles.profileTextContent} allowFontScaling={true}>
                {child.childDescription}
              </Text>
            </View>
          </Card>
        )}

        {/* Expected Outcomes */}
        {child.expectedOutcomes && (
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="flag" size={24} color={tokens.colors.semantic.success} />
              <Text style={styles.sectionTitle} allowFontScaling={true}>
                {t('childProfile.expectedOutcomes', { defaultValue: 'Expected Outcomes' })}
              </Text>
            </View>
            <View style={[styles.profileTextBlock, { backgroundColor: tokens.colors.semantic.successSoft }]}>
              <Text style={[styles.profileTextContent, { color: tokens.colors.text.primary }]} allowFontScaling={true}>
                {child.expectedOutcomes}
              </Text>
            </View>
          </Card>
        )}

        {/* Weekly Stats */}
        <Card style={styles.statsCard}>
          <Text style={styles.statsTitle} allowFontScaling={true}>
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

        {/* Teacher Assessments */}
        <TeacherAssessmentsSection childId={selectedChildId} t={t} />

        {/* Annual Service Plan */}
        <Pressable
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#059669',
            marginHorizontal: 16,
            marginTop: 12,
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderRadius: 12,
            gap: 8,
          }}
          onPress={() => navigation.navigate('ServicePlan', {
            childId: selectedChildId,
            childName: child?.firstName,
          })}
        >
          <Ionicons name="calendar-outline" size={22} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', flex: 1 }}>
            {t('servicePlan.title', { defaultValue: 'Annual Plan' })}
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </Pressable>

        {/* Emotional Monitoring */}
        {monitoringRecords.length > 0 && (
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="heart" size={24} color={tokens.colors.joy.rose} />
              <Text style={styles.sectionTitle} allowFontScaling={true}>
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
                        <Text style={styles.monitoringDate} allowFontScaling={true}>
                          {formatDate(record.date)}
                        </Text>
                        {record.teacher && (
                          <Text style={styles.monitoringTeacher} allowFontScaling={true}>
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
                      <Text style={styles.monitoringNotes} allowFontScaling={true}>
                        {record.notes}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
            {monitoringRecords.length > 5 && (
              <Text style={styles.moreRecords} allowFontScaling={true}>
                +{monitoringRecords.length - 5} {t('common.more', { defaultValue: 'more' })}
              </Text>
            )}
          </Card>
        )}
      </View>

      {/* Avatar Upload Modal */}
      <Modal
        visible={showAvatarSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAvatarSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('child.changePhoto', { defaultValue: 'Change Photo' })}</Text>
              <TouchableOpacity onPress={() => setShowAvatarSelector(false)}>
                <Ionicons name="close" size={24} color={tokens.colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <Pressable
              style={styles.uploadButton}
              onPress={handleFileUpload}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color={tokens.colors.accent.blue} />
              ) : (
                <>
                  <Ionicons name="image-outline" size={32} color={tokens.colors.accent.blue} />
                  <Text style={styles.uploadButtonText} allowFontScaling={true}>
                    {t('child.selectPhoto', { defaultValue: 'Select Photo from Gallery' })}
                  </Text>
                  <Text style={styles.uploadHint} allowFontScaling={true}>
                    {t('child.photoFormat', { defaultValue: 'JPG, PNG (max. 5MB)' })}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Logout Modal */}
      <Modal
        visible={showLogoutModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="alert-circle" size={32} color={tokens.colors.semantic.error} />
              <Text style={styles.modalTitle}>{t('profile.logoutTitle', { defaultValue: 'Logout' })}</Text>
            </View>
            <Text style={styles.modalText} allowFontScaling={true}>
              {t('profile.confirmLogout', { defaultValue: 'Do you want to logout?' })}
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.modalCancelText} allowFontScaling={true}>
                  {t('profile.no', { defaultValue: 'No' })}
                </Text>
              </Pressable>
              <Pressable
                style={styles.modalConfirmButton}
                onPress={confirmLogout}
              >
                <Text style={styles.modalConfirmText} allowFontScaling={true}>
                  {t('profile.yes', { defaultValue: 'Yes' })}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Message Modal */}
      <Modal
        visible={showMessageModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMessageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="mail-outline" size={24} color={tokens.colors.accent.blue} />
              <Text style={styles.modalTitle} allowFontScaling={true}>
                {t('profile.contactSuperAdmin', { defaultValue: 'Contact Super-Admin' })}
              </Text>
              <TouchableOpacity onPress={() => setShowMessageModal(false)}>
                <Ionicons name="close" size={24} color={tokens.colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel} allowFontScaling={true}>
                {t('profile.subject', { defaultValue: 'Subject' })}
              </Text>
              <TextInput
                style={styles.textInput}
                value={messageSubject}
                onChangeText={setMessageSubject}
                placeholder={t('profile.subjectPlaceholder', { defaultValue: 'Message subject...' })}
                placeholderTextColor={tokens.colors.text.tertiary}
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel} allowFontScaling={true}>
                {t('profile.message', { defaultValue: 'Message' })}
              </Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={messageText}
                onChangeText={setMessageText}
                placeholder={t('profile.messagePlaceholder', { defaultValue: 'Write your message...' })}
                placeholderTextColor={tokens.colors.text.tertiary}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setShowMessageModal(false)}
                disabled={sendingMessage}
              >
                <Text style={styles.modalCancelText} allowFontScaling={true}>
                  {t('common.cancel', { defaultValue: 'Cancel' })}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirmButton, sendingMessage && styles.modalConfirmButtonDisabled]}
                onPress={handleSendMessage}
                disabled={sendingMessage || !messageSubject.trim() || !messageText.trim()}
              >
                {sendingMessage ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="send-outline" size={20} color="#fff" />
                    <Text style={styles.modalConfirmText} allowFontScaling={true}>
                      {t('profile.send', { defaultValue: 'Send' })}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* My Messages Modal */}
      <Modal
        visible={showMessagesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMessagesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.messagesModalContent]}>
            <View style={styles.modalHeader}>
              <Ionicons name="chatbubbles-outline" size={24} color={tokens.colors.semantic.success} />
              <Text style={styles.modalTitle} allowFontScaling={true}>
                {t('profile.myMessages', { defaultValue: 'My Messages' })}
              </Text>
              <TouchableOpacity onPress={() => setShowMessagesModal(false)}>
                <Ionicons name="close" size={24} color={tokens.colors.text.secondary} />
              </TouchableOpacity>
            </View>
            {loadingMessages ? (
              <View style={styles.messagesLoading}>
                <ActivityIndicator size="large" color={tokens.colors.accent.blue} />
              </View>
            ) : myMessages.length === 0 ? (
              <View style={styles.messagesEmpty}>
                <Ionicons name="chatbubbles-outline" size={48} color={tokens.colors.text.tertiary} />
                <Text style={styles.messagesEmptyText} allowFontScaling={true}>
                  {t('profile.noMessages', { defaultValue: 'No messages yet' })}
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.messagesList}>
                {myMessages.map((msg) => (
                  <View key={msg.id} style={styles.messageItem}>
                    <View style={styles.messageItemHeader}>
                      <Text style={styles.messageItemSubject} allowFontScaling={true}>
                        {msg.subject}
                      </Text>
                      {msg.reply && (
                        <View style={styles.repliedBadge}>
                          <Text style={styles.repliedBadgeText} allowFontScaling={true}>
                            {t('profile.replied', { defaultValue: 'Replied' })}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.messageItemDate} allowFontScaling={true}>
                      {formatDate(msg.createdAt)}
                    </Text>
                    <View style={styles.messageItemContent}>
                      <Text style={styles.messageItemLabel} allowFontScaling={true}>
                        {t('profile.yourMessage', { defaultValue: 'Your message' })}:
                      </Text>
                      <Text style={styles.messageItemText} allowFontScaling={true}>
                        {msg.message}
                      </Text>
                    </View>
                    {msg.reply && (
                      <View style={styles.messageItemReply}>
                        <View style={styles.messageItemReplyHeader}>
                          <Ionicons name="chatbubble" size={16} color={tokens.colors.accent.blue} />
                          <Text style={styles.messageItemReplyLabel} allowFontScaling={true}>
                            {t('profile.superAdminReply', { defaultValue: 'Super-admin reply' })}
                          </Text>
                          <Text style={styles.messageItemReplyDate} allowFontScaling={true}>
                            {formatDate(msg.repliedAt)}
                          </Text>
                        </View>
                        <Text style={styles.messageItemReplyText} allowFontScaling={true}>
                          {msg.reply}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
        <Text style={styles.infoItemLabel} allowFontScaling={true}>{label}</Text>
      </View>
      <Text style={styles.infoItemValue} allowFontScaling={true}>{value}</Text>
    </View>
  );
}

function ProfileInfoRow({ label, value, icon, color = tokens.colors.accent.blue, t }) {
  const displayValue = value || t('childProfile.notProvided', { defaultValue: 'Not provided' });
  const isMuted = !value;
  return (
    <View style={styles.infoItem}>
      <View style={styles.infoItemLabelRow}>
        <Ionicons name={icon} size={16} color={color} />
        <Text style={styles.infoItemLabel} allowFontScaling={true}>{label}</Text>
      </View>
      <Text style={[styles.infoItemValue, isMuted && styles.mutedText]} allowFontScaling={true}>
        {displayValue}
      </Text>
    </View>
  );
}

function StatRow({ label, value }) {
  return (
    <View style={styles.statRow}>
      <View style={styles.statRowLeft}>
        <View style={styles.statDot} />
        <Text style={styles.statLabel} allowFontScaling={true}>{label}</Text>
      </View>
      <Text style={styles.statValue} allowFontScaling={true}>{value}</Text>
    </View>
  );
}

const ASSESSMENT_CATEGORIES = [
  { key: 'cognitive', icon: 'bulb-outline', translationKey: 'cognitive' },
  { key: 'motor', icon: 'body-outline', translationKey: 'motor' },
  { key: 'speech', icon: 'mic-outline', translationKey: 'speech' },
  { key: 'behavior', icon: 'happy-outline', translationKey: 'behavior' },
  { key: 'social', icon: 'people-outline', translationKey: 'social' },
  { key: 'self_care', icon: 'hand-left-outline', translationKey: 'selfCare' },
];

const ASSESSMENT_SCORE_COLORS = {
  1: '#EF4444',
  2: '#F97316',
  3: '#EAB308',
  4: '#84CC16',
  5: '#22C55E',
};

function TeacherAssessmentsSection({ childId, t }) {
  const [assessments, setAssessments] = useState([]);
  const [loadingAssessments, setLoadingAssessments] = useState(true);

  useEffect(() => {
    if (!childId) return;
    let mounted = true;
    (async () => {
      try {
        const response = await api.get(`/assessments/latest?childId=${childId}`);
        if (mounted) {
          setAssessments(response.data?.data || []);
        }
      } catch (error) {
        if (__DEV__) console.error('Error loading assessments:', error);
      } finally {
        if (mounted) setLoadingAssessments(false);
      }
    })();
    return () => { mounted = false; };
  }, [childId]);

  if (loadingAssessments) {
    return (
      <Card style={styles.card}>
        <View style={styles.sectionHeader}>
          <Ionicons name="clipboard" size={24} color={tokens.colors.accent.blue} />
          <Text style={styles.sectionTitle} allowFontScaling={true}>
            {t('assessment.title', { defaultValue: 'Assessment' })}
          </Text>
        </View>
        <ActivityIndicator size="small" color={tokens.colors.accent.blue} />
      </Card>
    );
  }

  const assessmentMap = {};
  assessments.forEach((a) => { assessmentMap[a.category] = a; });

  return (
    <Card style={styles.card}>
      <View style={styles.sectionHeader}>
        <Ionicons name="clipboard" size={24} color={tokens.colors.accent.blue} />
        <Text style={styles.sectionTitle} allowFontScaling={true}>
          {t('assessment.title', { defaultValue: 'Assessment' })}
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.assessmentRow}>
        {ASSESSMENT_CATEGORIES.map((cat) => {
          const assessment = assessmentMap[cat.key];
          const score = assessment?.score;
          const bgColor = score ? ASSESSMENT_SCORE_COLORS[score] : tokens.colors.surface.secondary;
          const textColor = score ? '#fff' : tokens.colors.text.muted;

          return (
            <View key={cat.key} style={styles.assessmentBadge}>
              <View style={[styles.assessmentScoreCircle, { backgroundColor: bgColor }]}>
                {score ? (
                  <Text style={[styles.assessmentScoreText, { color: textColor }]}>{score}</Text>
                ) : (
                  <Ionicons name={cat.icon} size={18} color={textColor} />
                )}
              </View>
              <Text style={styles.assessmentCategoryText} numberOfLines={2} allowFontScaling={true}>
                {t(`assessment.${cat.translationKey}`, { defaultValue: cat.key })}
              </Text>
            </View>
          );
        })}
      </ScrollView>
      {assessments.length === 0 && (
        <Text style={styles.assessmentEmptyText} allowFontScaling={true}>
          {t('assessment.noAssessments', { defaultValue: 'Not assessed yet' })}
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background.primary,
  },
  scrollContent: {
    padding: tokens.space.lg,
  },
  headerContainer: {
    overflow: 'hidden',
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.md,
    paddingTop: tokens.space.xl,
    paddingBottom: tokens.space.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadow.sm,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: tokens.type.h2.fontSize,
    fontWeight: tokens.type.h2.fontWeight,
    color: '#fff',
  },
  placeholder: {
    width: 44,
  },
  selectorCard: {
    marginHorizontal: tokens.space.md,
    marginTop: tokens.space.md,
    marginBottom: tokens.space.lg,
  },
  selectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
    marginBottom: tokens.space.md,
  },
  selectorLabel: {
    fontSize: tokens.type.h3.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.text.primary,
  },
  selectorDropdown: {
    gap: tokens.space.xs,
  },
  selectorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: tokens.space.md,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.background.secondary,
  },
  selectorOptionActive: {
    backgroundColor: tokens.colors.accent[50],
  },
  selectorOptionText: {
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.primary,
  },
  selectorOptionTextActive: {
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.accent.blue,
  },
  heroCard: {
    marginHorizontal: tokens.space.md,
    marginTop: tokens.space.md,
    marginBottom: tokens.space.lg,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.lg,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadow.soft,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarImageLoading: {
    opacity: 0,
  },
  avatarLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colors.surface.secondary,
    borderRadius: 50,
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: tokens.type.h1.fontSize,
    fontWeight: tokens.type.h1.fontWeight,
    color: tokens.colors.accent.blue,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: tokens.colors.semantic.success,
    ...tokens.shadow.sm,
  },
  heroInfo: {
    flex: 1,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: tokens.space.sm,
    marginBottom: tokens.space.sm,
  },
  heroName: {
    fontSize: tokens.type.h1.fontSize,
    fontWeight: tokens.type.h1.fontWeight,
    color: tokens.colors.text.primary,
  },
  genderBadge: {
    backgroundColor: tokens.colors.accent[50],
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.xs,
    borderRadius: tokens.radius.pill,
  },
  genderBadgeText: {
    fontSize: tokens.type.caption.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
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
    fontSize: tokens.type.body.fontSize,
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
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.text.primary,
  },
  contentContainer: {
    paddingHorizontal: tokens.space.md,
    gap: tokens.space.md,
  },
  card: {
    marginBottom: tokens.space.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
    marginBottom: tokens.space.lg,
  },
  sectionTitle: {
    fontSize: tokens.type.h3.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.text.primary,
  },
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
    marginBottom: tokens.space.xs / 2,
  },
  infoItemLabel: {
    fontSize: tokens.type.caption.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoItemValue: {
    fontSize: tokens.type.bodyLarge.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.text.primary,
  },
  specialNeedsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
    marginBottom: tokens.space.md,
  },
  specialNeedsTitle: {
    fontSize: tokens.type.h3.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.semantic.error,
  },
  specialNeedsContent: {
    backgroundColor: tokens.colors.semantic.errorSoft,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.lg,
  },
  specialNeedsText: {
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.semantic.error,
    lineHeight: 22,
  },
  mutedText: {
    color: tokens.colors.text.muted,
    fontStyle: 'italic',
    fontWeight: tokens.typography.fontWeight.regular,
  },
  profileTextBlock: {
    backgroundColor: tokens.colors.surface.secondary,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.lg,
  },
  profileTextContent: {
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.primary,
    lineHeight: 22,
  },
  monitoringList: {
    gap: tokens.space.md,
  },
  monitoringCard: {
    borderWidth: 1,
    borderColor: tokens.colors.border.light,
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
    fontSize: tokens.type.body.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.text.primary,
  },
  monitoringTeacher: {
    fontSize: tokens.type.sub.fontSize,
    color: tokens.colors.text.secondary,
    marginTop: tokens.space.xs / 2,
  },
  monitoringPercentage: {
    alignItems: 'flex-end',
  },
  monitoringPercentageText: {
    fontSize: tokens.type.h2.fontSize,
    fontWeight: tokens.type.h1.fontWeight,
    color: tokens.colors.accent.blue,
  },
  monitoringCount: {
    fontSize: tokens.type.caption.fontSize,
    color: tokens.colors.text.secondary,
    marginTop: tokens.space.xs / 2,
  },
  monitoringNotes: {
    fontSize: tokens.type.sub.fontSize,
    color: tokens.colors.text.secondary,
    marginTop: tokens.space.sm,
    paddingTop: tokens.space.sm,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border.light,
  },
  moreRecords: {
    fontSize: tokens.type.sub.fontSize,
    color: tokens.colors.text.secondary,
    textAlign: 'center',
    marginTop: tokens.space.sm,
  },
  accountItem: {
    marginBottom: tokens.space.lg,
  },
  accountLabel: {
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.text.secondary,
    marginBottom: tokens.space.sm,
  },
  languageButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space.sm,
  },
  languageButton: {
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.background.secondary,
  },
  languageButtonActive: {
    backgroundColor: tokens.colors.accent.blue,
  },
  languageButtonText: {
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.text.primary,
  },
  languageButtonTextActive: {
    color: '#fff',
  },
  accountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
    padding: tokens.space.md,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.accent[50],
    marginBottom: tokens.space.sm,
    position: 'relative',
  },
  accountButtonText: {
    fontSize: tokens.type.body.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.accent.blue,
    flex: 1,
  },
  logoutButton: {
    backgroundColor: tokens.colors.semantic.errorSoft,
    borderColor: tokens.colors.semantic.error + '30',
  },
  logoutButtonText: {
    color: tokens.colors.semantic.error,
  },
  messageBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: tokens.colors.semantic.success,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  messageBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  statsCard: {
    backgroundColor: tokens.colors.text.primary,
    marginBottom: tokens.space.md,
  },
  statsTitle: {
    fontSize: tokens.type.h3.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
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
    fontSize: tokens.type.sub.fontSize,
    color: tokens.colors.text.secondary,
  },
  statValue: {
    fontSize: tokens.type.h2.fontSize,
    fontWeight: tokens.type.h1.fontWeight,
    color: tokens.colors.text.primary,
  },
  childrenGrid: {
    gap: tokens.space.md,
    marginTop: tokens.space.md,
  },
  childSelectorCard: {
    marginBottom: tokens.space.sm,
  },
  childSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
  },
  childSelectorAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadow.sm,
  },
  childSelectorAvatarText: {
    fontSize: tokens.type.h2.fontSize,
    fontWeight: tokens.type.h1.fontWeight,
    color: tokens.colors.accent.blue,
  },
  childSelectorInfo: {
    flex: 1,
  },
  childSelectorName: {
    fontSize: tokens.type.h3.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.text.primary,
    marginBottom: tokens.space.xs / 2,
  },
  childSelectorSchool: {
    fontSize: tokens.type.sub.fontSize,
    color: tokens.colors.text.secondary,
  },
  emptyCard: {
    marginTop: tokens.space.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: tokens.colors.surface.card,
    borderTopLeftRadius: tokens.radius.xl,
    borderTopRightRadius: tokens.radius.xl,
    padding: tokens.space.xl,
    maxHeight: '80%',
  },
  messagesModalContent: {
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
    marginBottom: tokens.space.xl,
  },
  modalTitle: {
    flex: 1,
    fontSize: tokens.type.h2.fontSize,
    fontWeight: tokens.type.h2.fontWeight,
    color: tokens.colors.text.primary,
  },
  modalText: {
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.secondary,
    marginBottom: tokens.space.xl,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: tokens.space.md,
  },
  inputLabel: {
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.text.secondary,
    marginBottom: tokens.space.xs,
  },
  textInput: {
    backgroundColor: tokens.colors.surface.secondary,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.primary,
    borderWidth: 1,
    borderColor: tokens.colors.border.light,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: tokens.space.md,
    marginTop: tokens.space.lg,
  },
  modalCancelButton: {
    flex: 1,
    padding: tokens.space.md,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.surface.secondary,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: tokens.type.body.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.text.secondary,
  },
  modalConfirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space.sm,
    padding: tokens.space.md,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.accent.blue,
  },
  modalConfirmButtonDisabled: {
    opacity: 0.5,
  },
  modalConfirmText: {
    fontSize: tokens.type.body.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: '#fff',
  },
  uploadButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.space.xl,
    borderRadius: tokens.radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: tokens.colors.border.medium,
    backgroundColor: tokens.colors.surface.secondary,
    gap: tokens.space.md,
  },
  uploadButtonText: {
    fontSize: tokens.type.body.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.accent.blue,
  },
  uploadHint: {
    fontSize: tokens.type.sub.fontSize,
    color: tokens.colors.text.secondary,
  },
  messagesLoading: {
    padding: tokens.space.xl,
    alignItems: 'center',
  },
  messagesEmpty: {
    padding: tokens.space.xl,
    alignItems: 'center',
  },
  messagesEmptyText: {
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.secondary,
    marginTop: tokens.space.md,
  },
  messagesList: {
    maxHeight: 500,
  },
  messageItem: {
    borderWidth: 1,
    borderColor: tokens.colors.border.light,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.md,
    marginBottom: tokens.space.md,
  },
  messageItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: tokens.space.xs,
  },
  messageItemSubject: {
    flex: 1,
    fontSize: tokens.type.h3.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.text.primary,
  },
  repliedBadge: {
    backgroundColor: tokens.colors.semantic.successSoft,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.xs / 2,
    borderRadius: tokens.radius.pill,
  },
  repliedBadgeText: {
    fontSize: tokens.type.caption.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.semantic.success,
  },
  messageItemDate: {
    fontSize: tokens.type.sub.fontSize,
    color: tokens.colors.text.secondary,
    marginBottom: tokens.space.sm,
  },
  messageItemContent: {
    marginBottom: tokens.space.sm,
  },
  messageItemLabel: {
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.text.secondary,
    marginBottom: tokens.space.xs,
  },
  messageItemText: {
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.primary,
    backgroundColor: tokens.colors.surface.secondary,
    padding: tokens.space.md,
    borderRadius: tokens.radius.md,
  },
  messageItemReply: {
    marginTop: tokens.space.md,
    paddingTop: tokens.space.md,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border.light,
  },
  messageItemReplyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.xs,
    marginBottom: tokens.space.xs,
  },
  messageItemReplyLabel: {
    flex: 1,
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.accent.blue,
  },
  messageItemReplyDate: {
    fontSize: tokens.type.caption.fontSize,
    color: tokens.colors.text.secondary,
  },
  messageItemReplyText: {
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.primary,
    backgroundColor: tokens.colors.accent[50],
    padding: tokens.space.md,
    borderRadius: tokens.radius.md,
  },
  assessmentRow: {
    flexDirection: 'row',
    gap: tokens.space.md,
    paddingVertical: tokens.space.sm,
  },
  assessmentBadge: {
    alignItems: 'center',
    width: 64,
  },
  assessmentScoreCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: tokens.space.xs,
  },
  assessmentScoreText: {
    fontSize: 18,
    fontWeight: '700',
  },
  assessmentCategoryText: {
    fontSize: 10,
    fontWeight: '600',
    color: tokens.colors.text.secondary,
    textAlign: 'center',
  },
  assessmentEmptyText: {
    fontSize: tokens.type.caption.fontSize,
    color: tokens.colors.text.muted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: tokens.space.sm,
  },
});
