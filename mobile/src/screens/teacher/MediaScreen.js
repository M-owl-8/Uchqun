import React, { useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Image,
  View,
  Pressable,
  Modal,
  TextInput,
  Text,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mediaService } from '../../services/mediaService';
import { teacherService } from '../../services/teacherService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { ImageViewer } from '../../components/common/ImageViewer';
import Card from '../../components/common/Card';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { API_URL } from '../../config';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import tokens from '../../styles/tokens';

const { width } = Dimensions.get('window');
const GRID_GAP = tokens.space.sm;
const GRID_PADDING = tokens.space.xl;
const COLUMNS = 2;
const categoryItemSize = (width - GRID_PADDING * 2 - GRID_GAP) / COLUMNS;

const MEDIA_TYPES = ['photo', 'video'];

// Category configuration matching Figma MediaSection.tsx
const CATEGORIES = [
  { name: 'Photos', icon: 'image', color: '#BFD7EA', type: 'photo' },
  { name: 'Videos', icon: 'videocam', color: '#DFF4EC', type: 'video' },
];

// Map media type to icon and color
const MEDIA_TYPE_MAP = {
  photo: { icon: 'image', color: '#BFD7EA' },
  image: { icon: 'image', color: '#BFD7EA' },
  video: { icon: 'videocam', color: '#DFF4EC' },
};

export function MediaScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Bottom nav height + safe area + padding
  const BOTTOM_NAV_HEIGHT = 75;
  const bottomPadding = BOTTOM_NAV_HEIGHT + insets.bottom + 16;
  const [media, setMedia] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selectedImage, setSelectedImage] = useState(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingMedia, setEditingMedia] = useState(null);
  const [children, setChildren] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [formData, setFormData] = useState({
    childId: '',
    type: 'photo',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadMedia();
    loadChildren();
  }, []);

  useEffect(() => {
    loadMedia();
  }, [filter]);

  const loadChildren = async () => {
    try {
      const parentsList = await teacherService.getParents();
      const allChildren = [];
      parentsList.forEach(parent => {
        if (parent.children && Array.isArray(parent.children)) {
          allChildren.push(...parent.children);
        }
      });
      setChildren(allChildren);
      if (allChildren.length > 0 && !formData.childId) {
        setFormData(prev => ({ ...prev, childId: allChildren[0].id }));
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Error loading children:', error);
      }
      setChildren([]);
    }
  };

  const loadMedia = async () => {
    setError(null);
    try {
      setLoading(true);
      const params = filter !== 'all' ? { type: filter } : {};
      const data = await mediaService.getMedia(params);
      setMedia(Array.isArray(data) ? data : []);
    } catch (err) {
      if (__DEV__) {
        console.error('Error loading media:', err);
      }
      setMedia([]);
      setError(t('common.loadError', { defaultValue: 'Failed to load data' }));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingMedia(null);
    setSelectedFile(null);
    setFormData({
      childId: children.length > 0 ? children[0].id : '',
      type: 'photo',
      date: new Date().toISOString().split('T')[0],
    });
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditingMedia(item);
    setSelectedFile(null);
    setFormData({
      childId: item.childId || '',
      type: item.type || 'photo',
      date: item.date ? item.date.split('T')[0] : new Date().toISOString().split('T')[0],
    });
    setShowModal(true);
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('common.error', { defaultValue: 'Error' }),
          t('mediaPage.permissionRequired', { defaultValue: 'Photo library permission is required' })
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: formData.type === 'video' ? ['videos'] : ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          type: asset.type || (formData.type === 'video' ? 'video' : 'image'),
          name: asset.fileName || `media.${asset.type === 'video' ? 'mp4' : 'jpg'}`,
        });
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Error picking image:', error);
      }
      Alert.alert(
        t('common.error', { defaultValue: 'Error' }),
        t('mediaPage.pickError', { defaultValue: 'Failed to pick media' })
      );
    }
  };

  const pickFromCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('common.error', { defaultValue: 'Error' }),
          t('mediaPage.cameraPermissionRequired', { defaultValue: 'Camera permission is required' })
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: formData.type === 'video' ? ['videos'] : ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          type: asset.type || (formData.type === 'video' ? 'video' : 'image'),
          name: asset.fileName || `media.${asset.type === 'video' ? 'mp4' : 'jpg'}`,
        });
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Error taking photo:', error);
      }
      Alert.alert(
        t('common.error', { defaultValue: 'Error' }),
        t('mediaPage.cameraError', { defaultValue: 'Failed to take photo' })
      );
    }
  };

  const handleSave = async () => {
    try {
      // Validation
      if (!formData.childId) {
        Alert.alert(t('common.error', { defaultValue: 'Error' }), t('mediaPage.modal.selectChild', { defaultValue: 'Please select a child' }));
        return;
      }

      if (editingMedia) {
        // Only metadata update in edit flow
        await mediaService.updateMedia(editingMedia.id, {
          childId: formData.childId,
          type: formData.type,
          date: formData.date,
        });
        Alert.alert(t('common.success', { defaultValue: 'Success' }), t('mediaPage.toastUpdate', { defaultValue: 'Media updated' }));
      } else {
        if (!selectedFile) {
          Alert.alert(t('common.error', { defaultValue: 'Error' }), t('mediaPage.modal.fileRequired', { defaultValue: 'Please select a file to upload' }));
          return;
        }

        // Upload file
        setUploading(true);
        const uploadFormData = new FormData();
        uploadFormData.append('childId', formData.childId);
        if (formData.date) uploadFormData.append('date', formData.date);

        // Append file
        const fileUri = selectedFile.uri;
        const filename = selectedFile.name || `media.${selectedFile.type === 'video' ? 'mp4' : 'jpg'}`;
        const match = /\.(\w+)$/.exec(filename);
        const mimeType = selectedFile.type === 'video'
          ? `video/${match ? match[1] : 'mp4'}`
          : `image/${match ? match[1] : 'jpeg'}`;

        uploadFormData.append('file', {
          uri: fileUri,
          name: filename,
          type: mimeType,
        });

        await mediaService.uploadMedia(uploadFormData);
        Alert.alert(t('common.success', { defaultValue: 'Success' }), t('mediaPage.toastCreate', { defaultValue: 'Media created' }));
      }

      setShowModal(false);
      setSelectedFile(null);
      loadMedia();
    } catch (error) {
      if (__DEV__) {
        console.error('Error saving media:', error);
      }
      const errorMessage = error.response?.data?.error || error.response?.data?.details?.join(', ') || error.message || t('mediaPage.toastError', { defaultValue: 'Xatolik yuz berdi' });
      Alert.alert(t('common.error', { defaultValue: 'Error' }), errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    Alert.alert(
      t('mediaPage.confirmDelete', { defaultValue: "O'chirishni tasdiqlash" }),
      t('mediaPage.confirmDeleteMessage', { defaultValue: "Bu mediani o'chirishni xohlaysizmi?" }),
      [
        { text: t('common.cancel', { defaultValue: 'Bekor qilish' }), style: 'cancel' },
        {
          text: t('common.delete', { defaultValue: "O'chirish" }),
          style: 'destructive',
          onPress: async () => {
            try {
              await mediaService.deleteMedia(id);
              Alert.alert(t('common.success', { defaultValue: 'Success' }), t('mediaPage.toastDelete', { defaultValue: "Media o'chirildi" }));
              loadMedia();
            } catch (error) {
              if (__DEV__) {
                console.error('Error deleting media:', error);
              }
              Alert.alert(t('common.error', { defaultValue: 'Error' }), t('mediaPage.toastError', { defaultValue: 'Xatolik yuz berdi' }));
            }
          },
        },
      ]
    );
  };

  const getImageUrl = (item) => {
    const url = item.url || item.photoUrl || item.thumbnailUrl;
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/')) {
      const API_BASE = API_URL.replace('/api', '');
      return `${API_BASE}${url}`;
    }
    const API_BASE = API_URL.replace('/api', '');
    return `${API_BASE}/${url}`;
  };

  const openImageViewer = (item) => {
    const imageUrl = getImageUrl(item);
    if (imageUrl) {
      setSelectedImage(imageUrl);
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
    return date.toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getMediaTypeInfo = (item) => {
    const type = item.type || item.mediaType || 'photo';
    return MEDIA_TYPE_MAP[type] || MEDIA_TYPE_MAP.photo;
  };

  const getCategoryCount = (type) => {
    return media.filter((item) => {
      const itemType = item.type || item.mediaType || 'photo';
      return itemType === type;
    }).length;
  };

  const filteredMedia = filter === 'all' ? media : media.filter((item) => item.type === filter);

  // Recent media (latest 6)
  const recentMedia = [...filteredMedia]
    .sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0))
    .slice(0, 6);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title={t('mediaPage.title', { defaultValue: 'Media' })}
        showBack
        rightActionIcon="add"
        onRightActionPress={handleCreate}
      />

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={tokens.colors.semantic.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            onPress={() => loadMedia()}
            accessibilityRole="button"
            accessibilityLabel="Retry"
            style={styles.retryBtn}
          >
            <Text style={styles.retryBtnText}>{t('common.retry', { defaultValue: 'Retry' })}</Text>
          </Pressable>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        refreshing={loading}
      >
        {/* Gallery Header Card */}
        <Card
          gradient={tokens.colors.gradients.welcome}
          style={styles.galleryHeader}
        >
          <View style={styles.galleryHeaderTop}>
            <Text style={styles.galleryHeaderTitle}>
              {t('mediaPage.gallery', { defaultValue: 'Media Gallery' })}
            </Text>
            <View style={styles.galleryHeaderIcons}>
              <Ionicons name="heart" size={20} color="#E8C27E" />
              <Ionicons name="happy-outline" size={20} color="#2E3A59" style={{ marginLeft: 4 }} />
            </View>
          </View>
          <Text style={styles.galleryHeaderText}>
            {t('mediaPage.galleryDescription', { defaultValue: 'Cherished moments, progress tracking, and memories to treasure forever.' })}
          </Text>
        </Card>

        {/* Categories Grid */}
        <Text style={styles.sectionTitle}>
          {t('mediaPage.categories', { defaultValue: 'Categories' })}
        </Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((category) => (
            <Pressable
              key={category.name}
              style={({ pressed }) => [
                styles.categoryCard,
                pressed && styles.categoryCardPressed,
              ]}
              onPress={() => setFilter(filter === category.type ? 'all' : category.type)}
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
          <Text style={styles.sectionTitle}>
            {t('mediaPage.recentMedia', { defaultValue: 'Recent Media' })}
          </Text>
        </View>

        {recentMedia.length === 0 ? (
          <EmptyState icon="images-outline" message={t('mediaPage.empty', { defaultValue: 'No media found' })} />
        ) : (
          <View style={styles.recentList}>
            {recentMedia.map((item, index) => {
              const typeInfo = getMediaTypeInfo(item);
              const itemType = item.type || item.mediaType || 'photo';

              return (
                <Pressable
                  key={item.id || index}
                  style={({ pressed }) => [
                    styles.recentItem,
                    pressed && styles.recentItemPressed,
                  ]}
                  onPress={() => {
                    if (itemType === 'photo') openImageViewer(item);
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
                  <View style={styles.recentItemActions}>
                    <Pressable
                      style={styles.iconBtn}
                      onPress={() => handleEdit(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="pencil-outline" size={16} color={tokens.colors.accent.blue} />
                    </Pressable>
                    <Pressable
                      style={styles.iconBtn}
                      onPress={() => handleDelete(item.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={16} color={tokens.colors.semantic.error} />
                    </Pressable>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Upload Button */}
        <Pressable
          style={({ pressed }) => [
            styles.uploadButton,
            pressed && styles.uploadButtonPressed,
          ]}
          onPress={handleCreate}
        >
          <View style={styles.uploadIconContainer}>
            <Ionicons name="image-outline" size={24} color="#2E3A59" />
          </View>
          <View style={styles.uploadTextContainer}>
            <Text style={styles.uploadTitle}>
              {t('mediaPage.addNewMedia', { defaultValue: 'Add New Media' })}
            </Text>
            <Text style={styles.uploadSubtitle}>
              {t('mediaPage.addNewMediaSub', { defaultValue: 'Photos, videos, or documents' })}
            </Text>
          </View>
        </Pressable>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={[styles.fab, { bottom: bottomPadding - 20 }]} onPress={handleCreate}>
        <Ionicons name="add" size={28} color={tokens.colors.text.white} />
      </TouchableOpacity>

      <ImageViewer
        visible={viewerVisible}
        imageUri={selectedImage}
        onClose={() => setViewerVisible(false)}
      />

      {/* Create/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingMedia
                    ? t('mediaPage.modal.editTitle', { defaultValue: 'Edit Media' })
                    : t('mediaPage.modal.addTitle', { defaultValue: 'Create Media' })
                  }
                </Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Ionicons name="close" size={24} color={tokens.colors.text.secondary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalScrollView}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
              >
                {/* Child Selection */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    {t('mediaPage.modal.child', { defaultValue: 'Bola' })}
                  </Text>
                  {children.length === 0 ? (
                    <View style={styles.helperContainer}>
                      <Text style={styles.helperText}>
                        {t('mediaPage.modal.childHelp', { defaultValue: 'Bolalar mavjud emas' })}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.pickerContainer}>
                      <ScrollView style={styles.pickerScrollView} nestedScrollEnabled>
                        {children.map((child) => (
                          <Pressable
                            key={child.id}
                            style={[
                              styles.pickerOption,
                              formData.childId === child.id && styles.pickerOptionSelected
                            ]}
                            onPress={() => setFormData(prev => ({ ...prev, childId: child.id }))}
                          >
                            <Text style={[
                              styles.pickerOptionText,
                              formData.childId === child.id && styles.pickerOptionTextSelected
                            ]}>
                              {child.firstName} {child.lastName}
                            </Text>
                            {formData.childId === child.id && (
                              <Ionicons name="checkmark" size={20} color={tokens.colors.accent.blue} />
                            )}
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* Type and Date */}
                <View style={styles.row}>
                  <View style={[styles.inputGroup, styles.halfWidth]}>
                    <Text style={styles.label}>
                      {t('mediaPage.modal.type', { defaultValue: 'Turi' })}
                    </Text>
                    <View style={styles.pickerContainer}>
                      <ScrollView style={styles.pickerScrollView} nestedScrollEnabled>
                        {MEDIA_TYPES.map((type) => (
                          <Pressable
                            key={type}
                            style={[
                              styles.pickerOption,
                              formData.type === type && styles.pickerOptionSelected
                            ]}
                            onPress={() => {
                              setFormData(prev => ({ ...prev, type }));
                              setSelectedFile(null);
                            }}
                          >
                            <Text style={[
                              styles.pickerOptionText,
                              formData.type === type && styles.pickerOptionTextSelected
                            ]}>
                              {type === 'photo'
                                ? t('mediaPage.photoLabel', { defaultValue: 'Photo' })
                                : t('mediaPage.videoLabel', { defaultValue: 'Video' })
                              }
                            </Text>
                            {formData.type === type && (
                              <Ionicons name="checkmark" size={20} color={tokens.colors.accent.blue} />
                            )}
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                  <View style={[styles.inputGroup, styles.halfWidth]}>
                    <Text style={styles.label}>
                      {t('mediaPage.modal.date', { defaultValue: 'Sana' })}
                    </Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={tokens.colors.text.tertiary}
                      value={formData.date}
                      onChangeText={(text) => setFormData({ ...formData, date: text })}
                    />
                  </View>
                </View>

                {/* File Upload (only for create) */}
                {!editingMedia && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      {t('mediaPage.modal.file', { defaultValue: 'Fayl' })}
                    </Text>
                    {selectedFile ? (
                      <View style={styles.filePreview}>
                        <Ionicons
                          name={formData.type === 'video' ? 'videocam' : 'image'}
                          size={24}
                          color={tokens.colors.accent.blue}
                        />
                        <Text style={styles.fileName} numberOfLines={1}>
                          {selectedFile.name || t('mediaPage.selectedFile', { defaultValue: 'Selected file' })}
                        </Text>
                        <TouchableOpacity onPress={() => setSelectedFile(null)}>
                          <Ionicons name="close-circle" size={24} color={tokens.colors.semantic.error} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.fileUploadButtons}>
                        <TouchableOpacity
                          style={styles.fileUploadButton}
                          onPress={pickImage}
                        >
                          <Ionicons name="images-outline" size={20} color={tokens.colors.accent.blue} />
                          <Text style={styles.fileUploadButtonText}>
                            {t('mediaPage.modal.pickFromLibrary', { defaultValue: 'Kutubxonadan tanlash' })}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.fileUploadButton}
                          onPress={pickFromCamera}
                        >
                          <Ionicons name="camera-outline" size={20} color={tokens.colors.accent.blue} />
                          <Text style={styles.fileUploadButtonText}>
                            {t('mediaPage.modal.takePhoto', { defaultValue: 'Kameradan olish' })}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    <Text style={styles.helperText}>
                      {t('mediaPage.modal.fileHelp', { defaultValue: 'Rasm yoki video yuklang' })}
                    </Text>
                  </View>
                )}
              </ScrollView>

              <View style={styles.modalActions}>
                <Pressable style={styles.cancelButton} onPress={() => {
                  setShowModal(false);
                  setSelectedFile(null);
                }}>
                  <Text style={styles.cancelButtonText}>
                    {t('mediaPage.modal.cancel', { defaultValue: 'Bekor qilish' })}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.saveButton, uploading && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {editingMedia
                        ? t('mediaPage.modal.update', { defaultValue: 'Yangilash' })
                        : t('mediaPage.modal.create', { defaultValue: 'Yaratish' })
                      }
                    </Text>
                  )}
                </Pressable>
              </View>
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
  scrollContent: {
    padding: GRID_PADDING,
  },
  fab: {
    position: 'absolute',
    right: tokens.space.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: tokens.colors.joy.lavender,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadow.elevated,
  },

  // Gallery Header Card
  galleryHeader: {
    marginBottom: tokens.space.lg,
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
  recentItemActions: {
    flexDirection: 'row',
    gap: tokens.space.sm,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: tokens.colors.surface.secondary,
    alignItems: 'center',
    justifyContent: 'center',
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

  // Error
  errorContainer: {
    padding: tokens.space['2xl'],
    alignItems: 'center',
  },
  errorText: {
    color: tokens.colors.text.secondary,
    marginTop: tokens.space.md,
    textAlign: 'center',
    fontSize: tokens.type.body.fontSize,
  },
  retryBtn: {
    marginTop: tokens.space.lg,
    paddingHorizontal: tokens.space['2xl'],
    paddingVertical: tokens.space.md,
    backgroundColor: tokens.colors.accent.blue,
    borderRadius: tokens.radius.md,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: tokens.type.body.fontSize,
  },

  // Modal
  modalContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: tokens.colors.card.base,
    borderTopLeftRadius: tokens.radius.xl,
    borderTopRightRadius: tokens.radius.xl,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 40 : tokens.space.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: tokens.space.lg,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border.light,
  },
  modalTitle: {
    fontSize: tokens.type.h3.fontSize,
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.text.primary,
  },
  modalScrollView: {
    maxHeight: 500,
    paddingHorizontal: tokens.space.lg,
  },
  inputGroup: {
    marginBottom: tokens.space.md,
  },
  label: {
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.text.primary,
    marginBottom: tokens.space.xs,
  },
  textInput: {
    borderWidth: 1,
    borderColor: tokens.colors.border.medium,
    borderRadius: tokens.radius.sm,
    padding: tokens.space.md,
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.primary,
    backgroundColor: tokens.colors.card.base,
  },
  row: {
    flexDirection: 'row',
    gap: tokens.space.md,
  },
  halfWidth: {
    flex: 1,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: tokens.colors.border.medium,
    borderRadius: tokens.radius.sm,
    maxHeight: 150,
    backgroundColor: tokens.colors.card.base,
  },
  pickerScrollView: {
    maxHeight: 150,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: tokens.space.md,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border.light,
  },
  pickerOptionSelected: {
    backgroundColor: tokens.colors.accent[50],
  },
  pickerOptionText: {
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.primary,
  },
  pickerOptionTextSelected: {
    color: tokens.colors.accent.blue,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
  helperContainer: {
    padding: tokens.space.md,
    backgroundColor: tokens.colors.semantic.warning + '20',
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    borderColor: tokens.colors.semantic.warning,
  },
  helperText: {
    fontSize: tokens.type.caption.fontSize,
    color: tokens.colors.text.secondary,
    marginTop: tokens.space.xs / 2,
  },
  fileUploadButtons: {
    gap: tokens.space.sm,
  },
  fileUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space.sm,
    padding: tokens.space.md,
    borderWidth: 2,
    borderColor: tokens.colors.accent.blue,
    borderRadius: tokens.radius.sm,
    borderStyle: 'dashed',
  },
  fileUploadButtonText: {
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.accent.blue,
    fontWeight: tokens.typography.fontWeight.medium,
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
    padding: tokens.space.md,
    backgroundColor: tokens.colors.accent[50],
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    borderColor: tokens.colors.accent.blue,
  },
  fileName: {
    flex: 1,
    fontSize: tokens.type.sub.fontSize,
    color: tokens.colors.text.primary,
    fontWeight: tokens.typography.fontWeight.medium,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: tokens.space.lg,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border.light,
    gap: tokens.space.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: tokens.space.md,
    alignItems: 'center',
    borderRadius: tokens.radius.sm,
    backgroundColor: tokens.colors.surface.secondary,
  },
  cancelButtonText: {
    color: tokens.colors.text.secondary,
    fontSize: tokens.type.body.fontSize,
    fontWeight: tokens.typography.fontWeight.medium,
  },
  saveButton: {
    flex: 1,
    paddingVertical: tokens.space.md,
    alignItems: 'center',
    borderRadius: tokens.radius.sm,
    backgroundColor: tokens.colors.joy.lavender,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: tokens.colors.text.white,
    fontSize: tokens.type.body.fontSize,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
});
