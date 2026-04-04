import React, { useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  View,
  Text,
  Pressable,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { activityService } from '../../services/activityService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import Card from '../../components/common/Card';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { useTranslation } from 'react-i18next';
import tokens from '../../styles/tokens';
import ActivityDetailModal from './activities/ActivityDetailModal';
import ActivityForm from './activities/ActivityForm';

// Activity type to emoji mapping
const ACTIVITY_EMOJIS = {
  art: '🎨',
  music: '🎵',
  sports: '⚽',
  reading: '📚',
  writing: '✏️',
  math: '🔢',
  science: '🔬',
  language: '🗣️',
  social: '🤝',
  motor: '🏃',
  cognitive: '🧠',
  therapy: '💆',
  sensory: '👐',
  default: '🎯',
};

// Activity type to color mapping (from Figma template)
const ACTIVITY_COLORS = {
  art: '#E8C27E',
  music: '#BFD7EA',
  sports: '#DFF4EC',
  reading: '#F8D7C4',
  writing: '#BFD7EA',
  math: '#E8C27E',
  science: '#DFF4EC',
  language: '#F8D7C4',
  social: '#BFD7EA',
  motor: '#DFF4EC',
  cognitive: '#E8C27E',
  therapy: '#DFF4EC',
  sensory: '#F8D7C4',
  default: '#BFD7EA',
};

const getActivityEmoji = (activity) => {
  const type = (activity.type || activity.category || '').toLowerCase();
  const title = (activity.title || activity.skill || '').toLowerCase();
  for (const [key, emoji] of Object.entries(ACTIVITY_EMOJIS)) {
    if (type.includes(key) || title.includes(key)) return emoji;
  }
  return ACTIVITY_EMOJIS.default;
};

const getActivityColor = (activity) => {
  const type = (activity.type || activity.category || '').toLowerCase();
  const title = (activity.title || activity.skill || '').toLowerCase();
  for (const [key, color] of Object.entries(ACTIVITY_COLORS)) {
    if (type.includes(key) || title.includes(key)) return color;
  }
  return ACTIVITY_COLORS.default;
};

// Static progress bar component
function ProgressBar({ progress }) {
  const clampedProgress = Math.min(progress || 0, 100);

  return (
    <View style={styles.progressBarContainer}>
      <View
        style={[
          styles.progressBar,
          { width: `${clampedProgress}%` },
        ]}
      >
        <LinearGradient
          colors={['#DFF4EC', '#E8C27E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
    </View>
  );
}

export function ActivitiesScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activities, setActivities] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  // Bottom nav height + safe area + padding
  const BOTTOM_NAV_HEIGHT = 75;
  const bottomPadding = BOTTOM_NAV_HEIGHT + insets.bottom + 16;

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    setError(null);
    try {
      setLoading(true);
      const data = await activityService.getActivities();
      setActivities(Array.isArray(data) ? data : []);
    } catch (err) {
      if (__DEV__) console.error('Error loading activities:', err);
      setActivities([]);
      setError(t('common.loadError', { defaultValue: 'Failed to load data' }));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadActivities();
  };

  const handleCreate = () => {
    setEditingActivity(null);
    setShowModal(true);
  };

  const handleEdit = (activity) => {
    setEditingActivity(activity);
    setShowModal(true);
  };

  const handleFormSubmit = async (payload) => {
    try {
      if (editingActivity) {
        await activityService.updateActivity(editingActivity.id, payload);
        Alert.alert(
          t('common.success', { defaultValue: 'Success' }),
          t('activitiesPage.toastUpdate', { defaultValue: 'Individual reja yangilandi' })
        );
      } else {
        await activityService.createActivity(payload);
        Alert.alert(
          t('common.success', { defaultValue: 'Success' }),
          t('activitiesPage.toastCreate', { defaultValue: 'Individual reja yaratildi' })
        );
      }
      setShowModal(false);
      loadActivities();
    } catch (error) {
      if (__DEV__) console.error('Error saving activity:', error);
      if (__DEV__) console.error('Error response:', error.response?.data);
      Alert.alert(
        t('common.error', { defaultValue: 'Error' }),
        error.response?.data?.error || t('activitiesPage.toastError', { defaultValue: 'Xatolik yuz berdi' })
      );
    }
  };

  const handleDelete = (id) => {
    Alert.alert(
      t('activitiesPage.confirmDelete', { defaultValue: "O'chirishni tasdiqlash" }),
      t('activitiesPage.confirmDeleteMessage', { defaultValue: "Bu individual rejani o'chirishni xohlaysizmi?" }),
      [
        { text: t('common.cancel', { defaultValue: 'Bekor qilish' }), style: 'cancel' },
        {
          text: t('common.delete', { defaultValue: "O'chirish" }),
          style: 'destructive',
          onPress: async () => {
            try {
              await activityService.deleteActivity(id);
              Alert.alert(
                t('common.success', { defaultValue: 'Success' }),
                t('activitiesPage.toastDelete', { defaultValue: "Individual reja o'chirildi" })
              );
              loadActivities();
            } catch (error) {
              if (__DEV__) console.error('Error deleting activity:', error);
              Alert.alert(
                t('common.error', { defaultValue: 'Error' }),
                t('activitiesPage.toastError', { defaultValue: 'Xatolik yuz berdi' })
              );
            }
          },
        },
      ]
    );
  };

  const handleViewDetails = (activity) => {
    setSelectedActivity(activity);
    setShowDetailsModal(true);
  };

  // Compute progress stats
  const completedCount = activities.filter((a) => a.status === 'completed').length;
  const totalCount = activities.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (loading) {
    return <LoadingSpinner />;
  }

  const renderActivityItem = ({ item, index }) => {
    const emoji = getActivityEmoji(item);
    const activityColor = getActivityColor(item);
    const isCompleted = item.status === 'completed';
    const hasProgress = item.progress !== undefined;
    const progress = item.progress || 0;

    return (
      <Pressable
        onPress={() => handleViewDetails(item)}
        accessibilityRole="button"
        accessibilityLabel={item.title || item.skill || item.description || 'Activity'}
        style={({ pressed }) => [pressed && { transform: [{ scale: 0.98 }] }]}
      >
        <Card style={styles.activityCard}>
          <View style={styles.activityRow}>
            {/* 56x56 icon container with tinted bg */}
            <View
              style={[
                styles.activityIconContainer,
                { backgroundColor: activityColor + '66' },
              ]}
            >
              <Text style={styles.activityEmoji}>{emoji}</Text>
            </View>

            {/* Content */}
            <View style={styles.activityInfo}>
              <View style={styles.activityTitleRow}>
                <Text style={styles.activityTitle} numberOfLines={2}>
                  {item.title || item.skill || item.description || t('activityDetail.activity')}
                </Text>
                {isCompleted && (
                  <View style={styles.doneBadge}>
                    <Text style={styles.doneBadgeText}>✓ {t('activities.done')}</Text>
                  </View>
                )}
              </View>
              {item.description && item.title && (
                <Text style={styles.activityDescription} numberOfLines={2}>
                  {item.description}
                </Text>
              )}
              <Text style={styles.activityDuration}>
                {item.date || item.createdAt
                  ? new Date(item.date || item.createdAt).toLocaleDateString('uz-UZ', {
                      month: 'short',
                      day: 'numeric',
                    })
                  : ''}
              </Text>

              {/* Progress section inside card */}
              {hasProgress && (
                <View style={styles.progressSection}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>{t('activityDetail.progress')}</Text>
                    <View style={styles.progressBadge}>
                      <Text style={styles.progressValue}>{progress}%</Text>
                    </View>
                  </View>
                  <ProgressBar progress={progress} />
                </View>
              )}
            </View>

            {/* Right circle indicator */}
            <View
              style={[
                styles.statusCircle,
                isCompleted ? styles.statusCircleCompleted : styles.statusCirclePending,
              ]}
            >
              {isCompleted && <Text style={styles.statusCircleCheck}>✓</Text>}
            </View>
          </View>

          {/* Edit/Delete actions */}
          <View style={styles.actions}>
            <Pressable style={styles.editButton} onPress={() => handleEdit(item)}>
              <Ionicons name="pencil" size={16} color={tokens.colors.accent.blue} />
              <Text style={styles.editButtonText}>{t('common.edit', { defaultValue: 'Edit' })}</Text>
            </Pressable>
            <Pressable style={styles.deleteButton} onPress={() => handleDelete(item.id)}>
              <Ionicons name="trash-outline" size={16} color={tokens.colors.semantic.error} />
              <Text style={styles.deleteButtonText}>{t('common.delete', { defaultValue: 'Delete' })}</Text>
            </Pressable>
          </View>
        </Card>
      </Pressable>
    );
  };

  const listHeaderComponent = () => (
    <View>
      {/* Progress Card */}
      <Card
        gradient={['rgba(223,244,236,0.4)', 'rgba(191,215,234,0.3)']}
        style={styles.progressCard}
      >
        <View style={styles.progressCardHeader}>
          <Text style={styles.progressCardTitle}>
            {t('activities.todayProgress', { defaultValue: "Today's Progress" })}
          </Text>
          <View style={styles.progressCardIcon}>
            <Ionicons name="sparkles" size={24} color={tokens.colors.text.primary} />
          </View>
        </View>
        <View style={styles.progressCardStats}>
          <View>
            <Text style={styles.progressCardCount}>
              {completedCount}/{totalCount}
            </Text>
            <Text style={styles.progressCardLabel}>
              {t('activities.activitiesCompleted', { defaultValue: 'Activities completed' })}
            </Text>
          </View>
          <View style={styles.progressCardBarContainer}>
            <View style={styles.progressCardBarBg}>
              <LinearGradient
                colors={['#DFF4EC', '#E8C27E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.progressCardBarFill,
                  { width: `${progressPercent}%` },
                ]}
              />
            </View>
          </View>
        </View>
      </Card>

      {/* Meal shortcut */}
      <Pressable
        onPress={() => navigation.navigate('Meals')}
        accessibilityRole="button"
        style={({ pressed }) => [styles.mealShortcut, pressed && { opacity: 0.8 }]}
      >
        <View style={styles.mealShortcutIcon}>
          <Ionicons name="restaurant-outline" size={22} color="#2E3A59" />
        </View>
        <View style={styles.mealShortcutText}>
          <Text style={styles.mealShortcutTitle}>
            {t('dashboard.logMeal', { defaultValue: "Ovqat kiritish" })}
          </Text>
          <Text style={styles.mealShortcutSub}>
            {t('dashboard.logMealSub', { defaultValue: "Bugungi ovqatlanishni kuzating" })}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#8A97B0" />
      </Pressable>

      {/* Section title */}
      {activities.length > 0 && (
        <Text style={styles.sectionTitle}>
          {t('activities.scheduledActivities', { defaultValue: 'Scheduled Activities' })}
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title={t('activitiesPage.title', { defaultValue: 'Individual Plan' })}
        showBack
        rightActionIcon="add"
        onRightActionPress={handleCreate}
      />

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={tokens.colors.semantic.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            onPress={() => loadActivities()}
            accessibilityRole="button"
            accessibilityLabel="Retry"
            style={styles.retryBtn}
          >
            <Text style={styles.retryBtnText}>{t('common.retry', { defaultValue: 'Retry' })}</Text>
          </Pressable>
        </View>
      )}

      {activities.length === 0 && !error ? (
        <EmptyState icon="clipboard-outline" message={t('activitiesPage.empty', { defaultValue: 'No activities found' })} />
      ) : (
        <FlatList
          data={activities}
          renderItem={renderActivityItem}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          ListHeaderComponent={listHeaderComponent}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPadding }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity style={[styles.fab, { bottom: bottomPadding - 20 }]} onPress={handleCreate}>
        <Ionicons name="add" size={28} color={tokens.colors.text.white} />
      </TouchableOpacity>

      {/* Details Modal */}
      <ActivityDetailModal
        visible={showDetailsModal}
        activity={selectedActivity}
        onClose={() => setShowDetailsModal(false)}
      />

      {/* Create/Edit Modal */}
      <ActivityForm
        visible={showModal}
        editingActivity={editingActivity}
        onSubmit={handleFormSubmit}
        onClose={() => setShowModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background.primary,
  },
  list: {
    padding: tokens.space.xl,
  },
  fab: {
    position: 'absolute',
    right: tokens.space.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: tokens.colors.semantic.success,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadow.elevated,
  },

  // Meal shortcut
  mealShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: tokens.radius.xl,
    padding: tokens.space.md,
    marginBottom: tokens.space.lg,
    gap: tokens.space.md,
    ...tokens.shadow.sm,
  },
  mealShortcutIcon: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.md,
    backgroundColor: '#E8C27E33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealShortcutText: { flex: 1 },
  mealShortcutTitle: { fontSize: 15, fontWeight: '600', color: '#2E3A59' },
  mealShortcutSub: { fontSize: 12, color: '#8A97B0', marginTop: 2 },

  // Progress Card
  progressCard: {
    marginBottom: tokens.space['2xl'],
  },
  progressCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.space.md,
  },
  progressCardTitle: {
    fontSize: tokens.type.h3.fontSize,
    fontWeight: '600',
    color: '#2E3A59',
  },
  progressCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DFF4EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCardStats: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: tokens.space.lg,
  },
  progressCardCount: {
    fontSize: 28,
    fontWeight: '600',
    color: '#2E3A59',
  },
  progressCardLabel: {
    fontSize: 14,
    color: '#5A6B8C',
  },
  progressCardBarContainer: {
    flex: 1,
    marginBottom: tokens.space.sm,
  },
  progressCardBarBg: {
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressCardBarFill: {
    height: '100%',
    borderRadius: 6,
  },

  // Section title
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E3A59',
    marginBottom: tokens.space.lg,
    paddingHorizontal: 1,
  },

  // Activity Card
  activityCard: {
    marginBottom: tokens.space.md,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.space.lg,
  },
  activityIconContainer: {
    width: 56,
    height: 56,
    borderRadius: tokens.radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  activityEmoji: {
    fontSize: 28,
  },
  activityInfo: {
    flex: 1,
    minWidth: 0,
  },
  activityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  activityTitle: {
    fontSize: tokens.type.body.fontSize,
    fontWeight: '600',
    color: '#2E3A59',
  },
  doneBadge: {
    paddingHorizontal: tokens.space.sm,
    paddingVertical: 2,
    borderRadius: tokens.radius.pill,
    backgroundColor: '#DFF4EC',
  },
  doneBadgeText: {
    fontSize: tokens.type.caption.fontSize,
    fontWeight: '500',
    color: '#2E3A59',
  },
  activityDescription: {
    fontSize: tokens.type.body.fontSize,
    color: '#5A6B8C',
    marginBottom: tokens.space.xs,
    lineHeight: 18,
  },
  activityDuration: {
    fontSize: tokens.type.caption.fontSize,
    color: '#8C9BB5',
  },

  // Status circle
  statusCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCircleCompleted: {
    backgroundColor: '#DFF4EC',
  },
  statusCirclePending: {
    borderWidth: 2,
    borderColor: '#BFD7EA',
  },
  statusCircleCheck: {
    color: '#2E3A59',
    fontWeight: '600',
    fontSize: 14,
  },

  // Progress
  progressSection: {
    marginTop: tokens.space.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.space.xs,
  },
  progressLabel: {
    fontSize: tokens.type.caption.fontSize,
    color: '#5A6B8C',
    fontWeight: '500',
  },
  progressBadge: {
    paddingHorizontal: tokens.space.sm,
    paddingVertical: 1,
    borderRadius: tokens.radius.pill,
    backgroundColor: '#DFF4EC',
  },
  progressValue: {
    fontSize: tokens.type.caption.fontSize,
    fontWeight: '600',
    color: '#2E3A59',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },

  // Actions
  actions: {
    flexDirection: 'row',
    marginTop: tokens.space.md,
    paddingTop: tokens.space.md,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border.light,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: tokens.space.md,
    paddingVertical: tokens.space.xs,
    paddingHorizontal: tokens.space.sm,
    gap: tokens.space.xs,
  },
  editButtonText: {
    color: tokens.colors.accent.blue,
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.typography.fontWeight.medium,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.space.xs,
    paddingHorizontal: tokens.space.sm,
    gap: tokens.space.xs,
  },
  deleteButtonText: {
    color: tokens.colors.semantic.error,
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.typography.fontWeight.medium,
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
});
