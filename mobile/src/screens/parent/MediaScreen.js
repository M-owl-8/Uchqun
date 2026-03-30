import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  Image,
  View,
  Pressable,
  Text,
  Dimensions,
  Animated,
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
import { GlassCard } from '../../components/teacher/GlassCard';
import { ScreenHeader } from '../../components/teacher/ScreenHeader';
import Skeleton from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import { ImageViewer } from '../../components/common/ImageViewer';
import { API_URL } from '../../config';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');
const GRID_GAP = tokens.space.sm;
const GRID_PADDING = tokens.space.lg;
const COLUMNS = 3;
const itemSize = (width - GRID_PADDING * 2 - GRID_GAP * (COLUMNS - 1)) / COLUMNS;

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
    // If URL is already absolute, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // If URL starts with /, it's a relative path - prepend API base URL
    if (url.startsWith('/')) {
      const API_BASE = API_URL.replace('/api', '');
      return `${API_BASE}${url}`;
    }
    // Otherwise, assume it's a relative path
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
    return date.toLocaleDateString('uz-UZ', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Group media by date
  const groupedMedia = media.reduce((groups, item) => {
    const dateKey = formatDate(item.createdAt || item.date);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(item);
    return groups;
  }, {});

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader 
        title={t('media.title', { defaultValue: 'Media' })}
        showBack={navigation.canGoBack()}
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
        {/* Child selector (same API as web: filter by childId) */}
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
            <GlassCard style={styles.emptyCard}>
              <EmptyState
                emoji="👶"
                title={t('media.selectChild', { defaultValue: 'Select Child' })}
                description={t('media.selectChildDesc', { defaultValue: 'After adding a child, media will appear' })}
              />
            </GlassCard>
          </View>
        )}
        {children.length > 0 && (
        <>
        {loading ? (
          <View style={styles.loadingGrid}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
              <View key={i} style={styles.skeletonWrapper}>
                <Skeleton
                  width={itemSize}
                  height={itemSize}
                  style={styles.skeletonItem}
                />
              </View>
            ))}
          </View>
        ) : media.length === 0 ? (
          <View style={styles.emptyContainer}>
            <GlassCard style={styles.emptyCard}>
              <EmptyState
                emoji="📷"
                title={t('media.noMedia', { defaultValue: 'No Media Found' })}
                description={t('media.noMediaDesc', { defaultValue: 'New photos and videos will be added soon' })}
              />
            </GlassCard>
          </View>
        ) : (
          <Animated.View style={{ opacity: fadeAnim }}>
            {Object.entries(groupedMedia).map(([date, dateMedia]) => (
              <View key={date} style={styles.dateSection}>
                <View style={styles.dateHeader}>
                  <View style={styles.dateIcon}>
                    <Text style={styles.dateEmoji}>📅</Text>
                  </View>
                  <Text style={styles.dateLabel}>{date}</Text>
                  <Text style={styles.dateCount}>{dateMedia.length} ta</Text>
                </View>
                <View style={styles.grid}>
                  {dateMedia.map((item, index) => {
                    const imageUrl = getImageUrl(item);
                    if (!imageUrl) return null;

                    const globalIndex = media.findIndex((m) => m.id === item.id);
                    const isVideo = item.type === 'video' || item.mediaType === 'video';

                    return (
                      <Pressable
                        key={item.id || index}
                        style={({ pressed }) => [
                          styles.mediaItem,
                          pressed && styles.mediaItemPressed,
                        ]}
                        onPress={() => {
                          if (isVideo) {
                            // Open video in modal
                            setVideoUri(imageUrl);
                            setVideoVisible(true);
                          } else {
                            openImageViewer(item, globalIndex);
                          }
                        }}
                      >
                        <>
                          <Image
                            source={{ uri: imageUrl }}
                            style={styles.image}
                            resizeMode="cover"
                            onError={(e) => {
                              console.warn('[MediaScreen] Image load error:', imageUrl, e.nativeEvent.error);
                            }}
                          />
                          {isVideo && (
                            <View style={styles.videoOverlay}>
                              <View style={styles.playButton}>
                                <Ionicons name="play" size={20} color="#fff" />
                              </View>
                            </View>
                          )}
                          <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.3)']}
                            style={styles.imageGradient}
                          />
                        </>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
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
              // Fallback: open in external player if neither Video nor WebView is available
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
    padding: tokens.space.lg,
  },
  childRow: {
    marginBottom: tokens.space.lg,
    paddingHorizontal: GRID_PADDING,
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
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: tokens.space.md,
    gap: tokens.space.md,
  },
  headerEmojiContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEmoji: {
    fontSize: 24,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: tokens.type.h2.fontSize,
    fontWeight: tokens.type.h2.fontWeight,
    color: '#fff',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: tokens.type.caption.fontSize,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: tokens.type.sub.fontWeight,
  },
  headerRight: {
    width: 40,
  },
  loadingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: GRID_PADDING,
    gap: GRID_GAP,
  },
  skeletonWrapper: {
    borderRadius: tokens.radius.md,
    overflow: 'hidden',
  },
  skeletonItem: {
    borderRadius: tokens.radius.md,
  },
  emptyContainer: {
    padding: GRID_PADDING,
    paddingTop: tokens.space.xl,
  },
  emptyCard: {
    marginTop: tokens.space.xl,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  dateSection: {
    marginBottom: tokens.space.lg,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GRID_PADDING,
    paddingVertical: tokens.space.lg,
    gap: tokens.space.md,
    marginBottom: tokens.space.sm,
  },
  dateIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tokens.colors.joy.roseSoft,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadow.sm,
  },
  dateEmoji: {
    fontSize: 18,
  },
  dateLabel: {
    flex: 1,
    fontSize: tokens.type.h3.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.text.primary,
  },
  dateCount: {
    fontSize: tokens.type.caption.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.text.secondary,
    backgroundColor: tokens.colors.surface.secondary,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.xs,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.border.light,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: GRID_PADDING,
    gap: GRID_GAP,
  },
  mediaItem: {
    width: itemSize,
    height: itemSize,
    borderRadius: tokens.radius.lg,
    overflow: 'hidden',
    backgroundColor: tokens.colors.joy.skySoft,
    ...tokens.shadow.sm,
  },
  mediaItemPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
  },
  videoContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  videoPreview: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
