import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Image,
  View,
  Pressable,
  Text,
  Dimensions,
  RefreshControl,
  ScrollView,
  Modal,
  Linking,
  Alert,
} from 'react-native';
// expo-av removed (deprecated in SDK 55) — video playback uses WebView fallback
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
// Conditionally import WebView to avoid errors if native module is not available
let WebView;
try {
  WebView = require('react-native-webview').WebView;
} catch (error) {
  console.warn('react-native-webview not available:', error);
  WebView = null;
}
import { parentService } from '../../services/parentService';
import { mediaService } from '../../services/mediaService';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import tokens from '../../styles/tokens';
import Card from '../../components/common/Card';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import Skeleton from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import { ImageViewer } from '../../components/common/ImageViewer';
import { API_URL } from '../../config';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');
const GRID_GAP = tokens.space.sm;
const GRID_PADDING = tokens.space.lg;
const COLUMNS = 2;
const categoryItemSize = (width - GRID_PADDING * 2 - GRID_GAP) / COLUMNS;

// Category configuration matching Figma MediaSection.tsx
const CATEGORIES = [
  { name: 'Photos', icon: 'image', color: '#BFD7EA', type: 'photo' },
  { name: 'Videos', icon: 'videocam', color: '#DFF4EC', type: 'video' },
  { name: 'Audio', icon: 'musical-notes', color: '#E8C27E', type: 'audio' },
  { name: 'Documents', icon: 'document-text', color: '#F8D7C4', type: 'document' },
];

// Map media type to icon and color
const MEDIA_TYPE_MAP = {
  photo: { icon: 'image', color: '#BFD7EA' },
  image: { icon: 'image', color: '#BFD7EA' },
  video: { icon: 'videocam', color: '#DFF4EC' },
  audio: { icon: 'musical-notes', color: '#E8C27E' },
  document: { icon: 'document-text', color: '#F8D7C4' },
};

export function MediaScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [media, setMedia] = useState([]);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [videoUri, setVideoUri] = useState(null);
  const [videoVisible, setVideoVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Bottom nav height + safe area + padding
  const BOTTOM_NAV_HEIGHT = 75;
  const bottomPadding = BOTTOM_NAV_HEIGHT + insets.bottom + 16;

  useEffect(() => {
    const loadChildren = async () => {
      try {
        const list = await parentService.getChildren();
        const arr = Array.isArray(list) ? list : [];
        setChildren(arr);
        if (arr.length > 0 && !selectedChildId) {
          setSelectedChildId(arr[0].id);
        }
      } catch (error) {
        setChildren([]);
      }
    };
    loadChildren();
  }, []);

  useEffect(() => {
    if (selectedChildId) {
      loadMedia();
    } else {
      setMedia([]);
      setLoading(false);
    }
  }, [selectedChildId]);

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [loading]);

  const loadMedia = async () => {
    if (!selectedChildId) {
      setMedia([]);
      return;
    }
    setError(null);
    try {
      setLoading(true);
      const data = await mediaService.getMedia({ childId: selectedChildId });
      setMedia(Array.isArray(data) ? data : []);
    } catch (err) {
      setMedia([]);
      setError(t('common.loadError', { defaultValue: 'Failed to load data' }));
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMedia();
    setRefreshing(false);
  };

  const getImageUrl = (item) => {
    const url = item.url || item.photoUrl || item.thumbnailUrl;
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    if (url.startsWith('/')) {
      const API_BASE = API_URL.replace('/api', '');
      return `${API_BASE}${url}`;
    }
    const API_BASE = API_URL.replace('/api', '');
    return `${API_BASE}/${url}`;
  };

  const openImageViewer = (item, index) => {
    const imageUrl = getImageUrl(item);
    if (imageUrl) {
      setSelectedImage(imageUrl);
      setSelectedIndex(index);
      setViewerVisible(true);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 14) return '1 week ago';
    return date.toLocaleDateString('uz-UZ', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getMediaTypeInfo = (item) => {
    const type = item.type || item.mediaType || 'photo';
    return MEDIA_TYPE_MAP[type] || MEDIA_TYPE_MAP.photo;
  };

  // Count media by type for categories
  const getCategoryCount = (type) => {
    return media.filter((item) => {
      const itemType = item.type || item.mediaType || 'photo';
      return itemType === type;
    }).length;
  };

  // Get selected child name
  const selectedChild = children.find((c) => c.id === selectedChildId);
  const childName = selectedChild
    ? `${selectedChild.firstName}'s`
    : "Child's";

  // Recent media (latest 6)
  const recentMedia = [...media]
    .sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0))
    .slice(0, 6);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title={t('media.title', { defaultValue: 'Media' })}
        showBack={navigation.canGoBack()}
        showNotificationBell={false}
      />
      {error && (
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Ionicons name="alert-circle-outline" size={48} color={tokens.colors.semantic.error} />
          <Text style={{ color: tokens.colors.text.secondary, marginTop: 12, textAlign: 'center' }}>{error}</Text>
          <Pressable onPress={() => loadMedia()} accessibilityRole="button" accessibilityLabel="Retry"
            style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: tokens.colors.accent.blue, borderRadius: tokens.radius.md }}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>{t('common.retry', { defaultValue: 'Retry' })}</Text>
          </Pressable>
        </View>
      )}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Child selector */}
        {children.length > 1 && (
          <View style={styles.childRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.childRowContent}>
              {children.map((c) => (
                <Pressable
                  key={c.id}
                  style={[
                    styles.childPill,
                    selectedChildId === c.id && styles.childPillActive,
                  ]}
                  onPress={() => setSelectedChildId(c.id)}
                >
                  <Text
                    style={[
                      styles.childPillText,
                      selectedChildId === c.id && styles.childPillTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {c.firstName} {c.lastName}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {children.length === 0 && !loading && (
          <View style={styles.emptyContainer}>
            <Card style={styles.emptyCard}>
              <EmptyState
                emoji="👶"
                title={t('media.selectChild', { defaultValue: 'Select Child' })}
                description={t('media.selectChildDesc', { defaultValue: 'After adding a child, media will appear' })}
              />
            </Card>
          </View>
        )}

        {children.length > 0 && (
          <>
            {loading ? (
              <View style={styles.loadingContainer}>
                <Skeleton width={width - GRID_PADDING * 2} height={100} style={{ borderRadius: tokens.radius.lg, marginBottom: tokens.space.lg }} />
                <Skeleton width={120} height={24} style={{ borderRadius: tokens.radius.sm, marginBottom: tokens.space.md }} />
                <View style={styles.categoryGrid}>
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} width={categoryItemSize - GRID_GAP / 2} height={120} style={{ borderRadius: tokens.radius.lg }} />
                  ))}
                </View>
                <Skeleton width={150} height={24} style={{ borderRadius: tokens.radius.sm, marginTop: tokens.space.lg, marginBottom: tokens.space.md }} />
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} width={width - GRID_PADDING * 2} height={80} style={{ borderRadius: tokens.radius.lg, marginBottom: tokens.space.sm }} />
                ))}
              </View>
            ) : media.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Card style={styles.emptyCard}>
                  <EmptyState
                    emoji="📷"
                    title={t('media.noMedia', { defaultValue: 'No Media Found' })}
                    description={t('media.noMediaDesc', { defaultValue: 'New photos and videos will be added soon' })}
                  />
                </Card>
              </View>
            ) : (
              <Animated.View style={{ opacity: fadeAnim }}>
                {/* Gallery Header Card */}
                <LinearGradient
                  colors={['rgba(191,215,234,0.3)', 'rgba(223,244,236,0.3)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.galleryHeader}
                >
                  <View style={styles.galleryHeaderTop}>
                    <Text style={styles.galleryHeaderTitle}>{childName} Gallery</Text>
                    <View style={styles.galleryHeaderIcons}>
                      <Ionicons name="heart" size={20} color="#E8C27E" />
                      <Ionicons name="happy-outline" size={20} color="#2E3A59" style={{ marginLeft: 4 }} />
                    </View>
                  </View>
                  <Text style={styles.galleryHeaderText}>
                    Cherished moments, progress tracking, and memories to treasure forever.
                  </Text>
                </LinearGradient>

                {/* Categories Grid */}
                <Text style={styles.sectionTitle}>Categories</Text>
                <View style={styles.categoryGrid}>
                  {CATEGORIES.map((category) => (
                    <Pressable
                      key={category.name}
                      style={({ pressed }) => [
                        styles.categoryCard,
                        pressed && styles.categoryCardPressed,
                      ]}
                      onPress={() => {
                        // Could navigate to filtered view in the future
                      }}
                    >
                      <View style={[styles.categoryIconContainer, { backgroundColor: `${category.color}40` }]}>
                        <Ionicons name={category.icon} size={28} color="#2E3A59" />
                      </View>
                      <Text style={styles.categoryName}>{category.name}</Text>
                      <Text style={styles.categoryCount}>{getCategoryCount(category.type)} items</Text>
                    </Pressable>
                  ))}
                </View>

                {/* Recent Media List */}
                <View style={styles.recentHeader}>
                  <Text style={styles.sectionTitle}>Recent Media</Text>
                  <Pressable>
                    <Text style={styles.viewAllText}>View All</Text>
                  </Pressable>
                </View>

                <View style={styles.recentList}>
                  {recentMedia.map((item, index) => {
                    const typeInfo = getMediaTypeInfo(item);
                    const itemType = item.type || item.mediaType || 'photo';
                    const isVideo = itemType === 'video';
                    const globalIndex = media.findIndex((m) => m.id === item.id);

                    return (
                      <Pressable
                        key={item.id || index}
                        style={({ pressed }) => [
                          styles.recentItem,
                          pressed && styles.recentItemPressed,
                        ]}
                        onPress={() => {
                          if (isVideo) {
                            const videoUrl = getImageUrl(item);
                            if (videoUrl) {
                              setVideoUri(videoUrl);
                              setVideoVisible(true);
                            }
                          } else {
                            openImageViewer(item, globalIndex);
                          }
                        }}
                      >
                        <View style={[styles.recentItemIcon, { backgroundColor: `${typeInfo.color}40` }]}>
                          <Ionicons name={typeInfo.icon} size={24} color="#2E3A59" />
                        </View>
                        <View style={styles.recentItemContent}>
                          <Text style={styles.recentItemTitle} numberOfLines={1}>
                            {item.title || item.name || `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} file`}
                          </Text>
                          <View style={styles.recentItemMeta}>
                            <View style={styles.typeBadge}>
                              <Text style={styles.typeBadgeText}>{itemType}</Text>
                            </View>
                            <Text style={styles.recentItemDate}>{formatDate(item.createdAt || item.date)}</Text>
                          </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#8C9BB5" />
                      </Pressable>
                    );
                  })}
                </View>

                {/* Upload Button */}
                <Pressable
                  style={({ pressed }) => [
                    styles.uploadButton,
                    pressed && styles.uploadButtonPressed,
                  ]}
                  onPress={() => {
                    // Upload action — could trigger image picker
                  }}
                >
                  <View style={styles.uploadIconContainer}>
                    <Ionicons name="image-outline" size={24} color="#2E3A59" />
                  </View>
                  <View style={styles.uploadTextContainer}>
                    <Text style={styles.uploadTitle}>Add New Media</Text>
                    <Text style={styles.uploadSubtitle}>Photos, videos, or documents</Text>
                  </View>
                </Pressable>
              </Animated.View>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={videoVisible} animationType="fade" transparent onRequestClose={() => setVideoVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
          <Pressable style={{ position: 'absolute', top: 60, right: 20, zIndex: 10 }} onPress={() => setVideoVisible(false)}>
            <Ionicons name="close-circle" size={36} color="#fff" />
          </Pressable>
          {videoUri && (
            WebView ? (
              <View style={{ width: width, height: width * 9 / 16 }}>
                <WebView
                  source={{
                    html: `
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <meta name="viewport" content="width=device-width, initial-scale=1.0">
                          <style>
                            body {
                              margin: 0;
                              padding: 0;
                              background: #000;
                              display: flex;
                              justify-content: center;
                              align-items: center;
                              height: 100vh;
                            }
                            video {
                              width: 100%;
                              height: 100%;
                              object-fit: contain;
                            }
                          </style>
                        </head>
                        <body>
                          <video controls autoplay>
                            <source src="${videoUri}" type="video/mp4">
                            Your browser does not support the video tag.
                          </video>
                        </body>
                      </html>
                    `
                  }}
                  style={{ flex: 1, backgroundColor: '#000' }}
                  allowsFullscreen
                  mediaPlaybackRequiresUserAction={false}
                />
              </View>
            ) : (
              <View style={{ width: width, height: width * 9 / 16, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#fff', marginBottom: 20 }}>Video ko'rsatish uchun tashqi player ochiladi</Text>
                <Pressable
                  onPress={async () => {
                    try {
                      const canOpen = await Linking.canOpenURL(videoUri);
                      if (canOpen) {
                        await Linking.openURL(videoUri);
                        setVideoVisible(false);
                      } else {
                        Alert.alert('Xatolik', 'Video ochib bo\'lmadi');
                      }
                    } catch (error) {
                      console.warn('Failed to open video:', error);
                      Alert.alert('Xatolik', 'Video ochib bo\'lmadi');
                    }
                  }}
                  style={{ backgroundColor: '#fff', padding: 12, borderRadius: 8 }}
                >
                  <Text style={{ color: '#000', fontWeight: 'bold' }}>Tashqi playerda ochish</Text>
                </Pressable>
              </View>
            )
          )}
        </View>
      </Modal>

      {viewerVisible && selectedImage && (
        <ImageViewer
          imageUri={selectedImage}
          visible={viewerVisible}
          onClose={() => {
            setViewerVisible(false);
            setSelectedImage(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background.primary,
  },
  scrollContent: {
    padding: GRID_PADDING,
  },
  childRow: {
    marginBottom: tokens.space.lg,
  },
  childRowContent: {
    gap: tokens.space.sm,
    paddingVertical: tokens.space.xs,
  },
  childPill: {
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.background.secondary,
  },
  childPillActive: {
    backgroundColor: tokens.colors.joy.rose,
  },
  childPillText: {
    fontSize: tokens.type.sub.fontSize,
    fontWeight: '600',
    color: tokens.colors.text.secondary,
  },
  childPillTextActive: {
    color: '#fff',
  },

  // Loading
  loadingContainer: {
    paddingTop: tokens.space.sm,
  },

  // Gallery Header Card
  galleryHeader: {
    borderRadius: tokens.radius.lg,
    padding: tokens.space.xl,
    borderWidth: 1,
    borderColor: tokens.glass.border,
    marginBottom: tokens.space.lg,
    ...tokens.shadow.glass,
  },
  galleryHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.space.sm,
  },
  galleryHeaderTitle: {
    fontSize: tokens.type.h3.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: '#2E3A59',
  },
  galleryHeaderIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  galleryHeaderText: {
    fontSize: tokens.type.body.fontSize,
    color: '#5A6B8C',
    lineHeight: 22,
  },

  // Section title
  sectionTitle: {
    fontSize: tokens.type.h3.fontSize - 2,
    fontWeight: tokens.type.h3.fontWeight,
    color: '#2E3A59',
    marginBottom: tokens.space.md,
    paddingHorizontal: 2,
  },

  // Category Grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    marginBottom: tokens.space.lg,
  },
  categoryCard: {
    width: categoryItemSize - GRID_GAP / 2,
    minHeight: 120,
    backgroundColor: tokens.glass.bg,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.glass.border,
    padding: tokens.space.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadow.glass,
  },
  categoryCardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  categoryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.space.sm,
  },
  categoryName: {
    fontSize: tokens.type.body.fontSize,
    fontWeight: '600',
    color: '#2E3A59',
    marginBottom: 2,
  },
  categoryCount: {
    fontSize: tokens.type.body.fontSize,
    color: '#5A6B8C',
  },

  // Recent Media
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.space.md,
    paddingHorizontal: 2,
  },
  viewAllText: {
    fontSize: tokens.type.body.fontSize,
    fontWeight: '500',
    color: '#2E3A59',
  },
  recentList: {
    gap: tokens.space.sm,
    marginBottom: tokens.space.lg,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.glass.bg,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.glass.border,
    padding: tokens.space.md,
    minHeight: 80,
    gap: tokens.space.md,
    ...tokens.shadow.glass,
  },
  recentItemPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  recentItemIcon: {
    width: 56,
    height: 56,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentItemContent: {
    flex: 1,
    minWidth: 0,
  },
  recentItemTitle: {
    fontSize: tokens.type.body.fontSize,
    fontWeight: '600',
    color: '#2E3A59',
    marginBottom: 4,
  },
  recentItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
  },
  typeBadge: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    paddingHorizontal: tokens.space.sm,
    paddingVertical: 2,
    borderRadius: tokens.radius.pill,
  },
  typeBadgeText: {
    fontSize: tokens.type.caption.fontSize,
    color: '#5A6B8C',
    textTransform: 'capitalize',
  },
  recentItemDate: {
    fontSize: tokens.type.caption.fontSize,
    color: '#8C9BB5',
  },

  // Upload Button
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.glass.bg,
    borderRadius: tokens.radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(232,194,126,0.3)',
    padding: tokens.space.xl,
    gap: tokens.space.sm,
  },
  uploadButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  uploadIconContainer: {
    width: 48,
    height: 48,
    borderRadius: tokens.radius.md,
    backgroundColor: 'rgba(232,194,126,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadTextContainer: {
    alignItems: 'flex-start',
  },
  uploadTitle: {
    fontSize: tokens.type.body.fontSize,
    fontWeight: '600',
    color: '#2E3A59',
  },
  uploadSubtitle: {
    fontSize: tokens.type.body.fontSize,
    color: '#5A6B8C',
  },

  // Empty state
  emptyContainer: {
    paddingTop: tokens.space.xl,
  },
  emptyCard: {
    marginTop: tokens.space.xl,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
});
