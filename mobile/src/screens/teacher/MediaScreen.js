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
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mediaService } from '../../services/mediaService';
import { teacherService } from '../../services/teacherService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { ImageViewer } from '../../components/common/ImageViewer';
import { GlassCard } from '../../components/teacher/GlassCard';
import { ScreenHeader } from '../../components/teacher/ScreenHeader';
import { API_URL } from '../../config';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import tokens from '../../styles/tokens';

const { width } = Dimensions.get('window');
const itemSize = (width - 48) / 3;

const MEDIA_TYPES = ['photo', 'video'];

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
      console.error('Error loading children:', error);
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
      console.error('Error loading media:', err);
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
      console.error('Error picking image:', error);
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
      console.error('Error taking photo:', error);
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
      console.error('Error saving media:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.details?.join(', ') || error.message || t('mediaPage.toastError', { defaultValue: 'Xatolik yuz berdi' });
      Alert.alert(t('common.error', { defaultValue: 'Error' }), errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    Alert.alert(
      t('mediaPage.confirmDelete', { defaultValue: 'O\'chirishni tasdiqlash' }),
      t('mediaPage.confirmDeleteMessage', { defaultValue: 'Bu mediani o\'chirishni xohlaysizmi?' }),
      [
        { text: t('common.cancel', { defaultValue: 'Bekor qilish' }), style: 'cancel' },
        {
          text: t('common.delete', { defaultValue: 'O\'chirish' }),
          style: 'destructive',
          onPress: async () => {
            try {
              await mediaService.deleteMedia(id);
              Alert.alert(t('common.success', { defaultValue: 'Success' }), t('mediaPage.toastDelete', { defaultValue: 'Media o\'chirildi' }));
              loadMedia();
            } catch (error) {
              console.error('Error deleting media:', error);
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

  const openImageViewer = (item) => {
    const imageUrl = getImageUrl(item);
    if (imageUrl) {
      setSelectedImage(imageUrl);
      setViewerVisible(true);
    }
  };

  const filteredMedia = filter === 'all' ? media : media.filter((item) => item.type === filter);

  if (loading) {
    return <LoadingSpinner />;
  }

  const renderMediaItem = ({ item }) => {
    const imageUrl = getImageUrl(item);
    if (!imageUrl) return null;

    return (
      <View style={styles.mediaItemContainer}>
        <Pressable onPress={() => item.type === 'photo' ? openImageViewer(item) : null}>
          {item.type === 'photo' ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              onError={(e) => {
                console.warn('[MediaScreen] Image load error:', imageUrl, e.nativeEvent.error);
              }}
            />
          ) : (
            <View style={styles.videoContainer}>
              <Ionicons name="play-circle" size={40} color={tokens.colors.text.white} />
              <Text style={styles.videoLabel}>{t('mediaPage.videoLabel', { defaultValue: 'Video' })}</Text>
            </View>
          )}
        </Pressable>
        <Pressable
          style={styles.editButton}
          onPress={() => handleEdit(item)}
        >
          <Ionicons name="pencil-outline" size={18} color={tokens.colors.text.white} />
        </Pressable>
        <Pressable
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id)}
        >
          <Ionicons name="trash-outline" size={18} color={tokens.colors.text.white} />
        </Pressable>
        {item.type === 'video' && (
          <View style={styles.videoBadge}>
            <Ionicons name="videocam" size={12} color={tokens.colors.text.white} />
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title={t('mediaPage.title', { defaultValue: 'Media' })}
        rightActionIcon="add"
        onRightActionPress={handleCreate}
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

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {[
            { id: 'all', label: t('mediaPage.filters.all', { defaultValue: 'All' }), icon: 'grid-outline' },
            { id: 'photo', label: t('mediaPage.photoLabel', { defaultValue: 'Photos' }), icon: 'image-outline' },
            { id: 'video', label: t('mediaPage.videoLabel', { defaultValue: 'Videos' }), icon: 'videocam-outline' },
          ].map((filterOption) => (
            <Pressable
              key={filterOption.id}
              style={[
                styles.filterButton,
                filter === filterOption.id && styles.filterButtonActive
              ]}
              onPress={() => setFilter(filterOption.id)}
            >
              <Ionicons
                name={filterOption.icon}
                size={18}
                color={filter === filterOption.id ? tokens.colors.text.white : tokens.colors.text.secondary}
              />
              <Text style={[
                styles.filterText,
                filter === filterOption.id && styles.filterTextActive
              ]}>
                {filterOption.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {filteredMedia.length === 0 ? (
        <EmptyState icon="images-outline" message={t('mediaPage.empty', { defaultValue: 'No media found' })} />
      ) : (
        <FlatList
          data={filteredMedia}
          renderItem={renderMediaItem}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          numColumns={3}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPadding }]}
          refreshing={loading}
          onRefresh={loadMedia}
          showsVerticalScrollIndicator={false}
        />
      )}

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
                              setSelectedFile(null); // Reset file when type changes
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
                      style={styles.input}
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
  filtersContainer: {
    paddingVertical: tokens.space.md,
    backgroundColor: tokens.colors.card.base,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border.light,
  },
  filters: {
    paddingHorizontal: tokens.space.md,
    gap: tokens.space.sm,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.xs,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.surface.secondary,
    borderWidth: 1,
    borderColor: tokens.colors.border.medium,
  },
  filterButtonActive: {
    backgroundColor: tokens.colors.joy.lavender, // Purple
    borderColor: tokens.colors.joy.lavender,
  },
  filterText: {
    fontSize: tokens.type.sub.fontSize,
    color: tokens.colors.text.secondary,
    fontWeight: tokens.typography.fontWeight.medium,
  },
  filterTextActive: {
    color: tokens.colors.text.white,
  },
  fab: {
    position: 'absolute',
    right: tokens.space.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: tokens.colors.joy.lavender,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadow.elevated,
  },
  list: {
    padding: tokens.space.lg,
  },
  mediaItemContainer: {
    width: itemSize,
    height: itemSize,
    margin: 4,
    borderRadius: tokens.radius.sm,
    overflow: 'hidden',
    position: 'relative',
    ...tokens.shadow.sm,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  videoContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: tokens.colors.surface.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoLabel: {
    fontSize: tokens.type.caption.fontSize,
    color: tokens.colors.text.white,
    marginTop: tokens.space.xs,
    fontWeight: tokens.typography.fontWeight.medium,
  },
  editButton: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: tokens.colors.accent.blue,
    borderRadius: tokens.radius.sm,
    padding: 6,
    ...tokens.shadow.sm,
  },
  deleteButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: tokens.colors.semantic.error,
    borderRadius: tokens.radius.sm,
    padding: 6,
    ...tokens.shadow.sm,
  },
  videoBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: tokens.radius.sm,
    padding: 4,
  },
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
  input: {
    borderWidth: 1,
    borderColor: tokens.colors.border.medium,
    borderRadius: tokens.radius.sm,
    padding: tokens.space.md,
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.primary,
    backgroundColor: tokens.colors.card.base,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
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
    backgroundColor: tokens.colors.joy.lavender, // Purple
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
