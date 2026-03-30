import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  FlatList,
  Animated,
  Easing,
  RefreshControl,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { parentService } from '../../services/parentService';
import { activityService } from '../../services/activityService';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import tokens from '../../styles/tokens';
import { GlassCard } from '../../components/teacher/GlassCard';
import { ScreenHeader } from '../../components/teacher/ScreenHeader';
import Skeleton from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';

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

// Get emoji based on activity type or title
const getActivityEmoji = (activity) => {
  const type = (activity.type || activity.category || '').toLowerCase();
  const title = (activity.title || activity.skill || '').toLowerCase();

  for (const [key, emoji] of Object.entries(ACTIVITY_EMOJIS)) {
    if (type.includes(key) || title.includes(key)) {
      return emoji;
    }
  }
  return ACTIVITY_EMOJIS.default;
};

// Get color based on activity type or title
const getActivityColor = (activity) => {
  const type = (activity.type || activity.category || '').toLowerCase();
  const title = (activity.title || activity.skill || '').toLowerCase();

  for (const [key, color] of Object.entries(ACTIVITY_COLORS)) {
    if (type.includes(key) || title.includes(key)) {
      return color;
    }
  }
  return ACTIVITY_COLORS.default;
};

// Animated progress bar component (Figma: mint-to-gold gradient)
function AnimatedProgress({ progress, delay = 0 }) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: Math.min(progress || 0, 100),
      duration: 800,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <View style={styles.progressBarContainer}>
      <Animated.View
        style={[
          styles.progressBar,
          {
            width: widthAnim.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      >
        <LinearGradient
          colors={['#DFF4EC', '#E8C27E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

export function ActivitiesScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
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
      loadActivities();
    } else {
      setActivities([]);
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

  const loadActivities = async () => {
    if (!selectedChildId) {
      setActivities([]);
      return;
    }
    setError(null);
    try {
      setLoading(true);
      const data = await activityService.getActivities({ childId: selectedChildId });
      setActivities(Array.isArray(data) ? data : []);
    } catch (err) {
      setActivities([]);
      setError(t('common.loadError', { defaultValue: 'Failed to load data' }));
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadActivities();
    setRefreshing(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Bugun';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Kecha';
    }
    return date.toLocaleDateString('uz-UZ', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('uz-UZ', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isToday = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isThisWeek = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return date >= weekAgo && date <= today;
  };

  const filteredActivities = activities.filter((a) => {
    if (filter === 'all') return true;
    if (filter === 'today') return isToday(a.date || a.createdAt);
    if (filter === 'week') return isThisWeek(a.date || a.createdAt);
    return true;
  });

  // Compute progress stats
  const completedCount = filteredActivities.filter(
    (a) => a.status === 'completed'
  ).length;
  const totalCount = filteredActivities.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const filters = [
    { key: 'all', label: 'Hammasi', emoji: '📋' },
    { key: 'today', label: 'Bugun', emoji: '📆' },
    { key: 'week', label: 'Hafta', emoji: '🗓️' },
  ];

  const renderActivityItem = ({ item, index }) => {
    const emoji = getActivityEmoji(item);
    const activityColor = getActivityColor(item);
    const isCompleted = item.status === 'completed';
    const hasProgress = item.progress !== undefined;
    const progress = item.progress || 0;

    return (
      <Pressable
        onPress={() => {
          setSelectedActivity(item);
          setShowDetailsModal(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={item.title || item.skill || item.description || 'Faoliyat'}
        accessibilityHint={t('activities.viewDetails', { defaultValue: 'View activity details' })}
        style={({ pressed }) => [pressed && { transform: [{ scale: 0.98 }] }]}
      >
        <GlassCard style={styles.activityCard}>
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
                  {item.title || item.skill || item.description || 'Faoliyat'}
                </Text>
                {isCompleted && (
                  <View style={styles.doneBadge}>
                    <Text style={styles.doneBadgeText}>✓ Done</Text>
                  </View>
                )}
              </View>
              {item.description && item.title && (
                <Text style={styles.activityDescription} numberOfLines={2}>
                  {item.description}
                </Text>
              )}
              <Text style={styles.activityDuration}>
                {formatDate(item.date || item.createdAt)}
                {item.createdAt ? ` · ${formatTime(item.createdAt)}` : ''}
              </Text>

              {/* Progress section inside card */}
              {hasProgress && (
                <View style={styles.progressSection}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>Rivojlanish</Text>
                    <View style={styles.progressBadge}>
                      <Text style={styles.progressValue}>{progress}%</Text>
                    </View>
                  </View>
                  <AnimatedProgress progress={progress} delay={index * 100} />
                </View>
              )}
            </View>

            {/* Right circle indicator */}
            <View
              style={[
                styles.statusCircle,
                isCompleted
                  ? styles.statusCircleCompleted
                  : styles.statusCirclePending,
              ]}
            >
              {isCompleted && (
                <Text style={styles.statusCircleCheck}>✓</Text>
              )}
            </View>
          </View>
        </GlassCard>
      </Pressable>
    );
  };

  const listHeaderComponent = () => {
    if (loading) {
      return (
        <>
          <Skeleton
            width="100%"
            height={120}
            style={{ borderRadius: tokens.radius.lg, marginBottom: tokens.space['2xl'] }}
          />
          <View style={styles.filterRow}>
            {[1, 2, 3].map((i) => (
              <Skeleton
                key={i}
                width={80}
                height={40}
                style={{ borderRadius: tokens.radius.pill }}
              />
            ))}
          </View>
          {[1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              width="100%"
              height={90}
              style={{ borderRadius: tokens.radius.lg, marginBottom: tokens.space.md }}
            />
          ))}
        </>
      );
    }

    return (
      <Animated.View style={{ opacity: fadeAnim }}>
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
                  accessibilityRole="button"
                  accessibilityLabel={`${c.firstName} ${c.lastName}`}
                  accessibilityState={{ selected: selectedChildId === c.id }}
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
          <GlassCard style={styles.emptyCard}>
            <EmptyState
              emoji="👶"
              title={t('child.selectPrompt', { defaultValue: 'Select Child' })}
              description={t('activities.selectChildDesc', { defaultValue: 'After adding a child, activities will appear' })}
            />
          </GlassCard>
        )}
        {children.length > 0 && (
          <>
            {/* Progress Card — Figma: glass card with mint→blue gradient */}
            <GlassCard style={styles.progressCard}>
              <LinearGradient
                colors={['rgba(223,244,236,0.4)', 'rgba(191,215,234,0.3)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.progressCardGradient}
              >
                <View style={styles.progressCardHeader}>
                  <Text style={styles.progressCardTitle}>Today's Progress</Text>
                  <View style={styles.progressCardIcon}>
                    <Text style={{ fontSize: 24 }}>✨</Text>
                  </View>
                </View>
                <View style={styles.progressCardBody}>
                  <View>
                    <Text style={styles.progressCardCount}>
                      {completedCount}/{totalCount}
                    </Text>
                    <Text style={styles.progressCardLabel}>Activities completed</Text>
                  </View>
                  <View style={styles.progressCardBarWrap}>
                    <AnimatedProgress progress={progressPercent} />
                  </View>
                </View>
              </LinearGradient>
            </GlassCard>

            {/* Filter Pills */}
            <View style={styles.filterRow}>
              {filters.map((f) => (
                <Pressable
                  key={f.key}
                  style={({ pressed }) => [
                    styles.filterPill,
                    filter === f.key && styles.filterPillActive,
                    pressed && styles.filterPillPressed,
                  ]}
                  onPress={() => setFilter(f.key)}
                  accessibilityRole="button"
                  accessibilityLabel={f.label}
                  accessibilityState={{ selected: filter === f.key }}
                >
                  <Text style={styles.filterEmoji}>{f.emoji}</Text>
                  <Text
                    style={[
                      styles.filterLabel,
                      filter === f.key && styles.filterLabelActive,
                    ]}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Section title */}
            {filteredActivities.length > 0 && (
              <Text style={styles.sectionTitle}>Scheduled Activities</Text>
            )}

            {/* Empty state for activities */}
            {filteredActivities.length === 0 && (
              <GlassCard style={styles.emptyCard}>
                <EmptyState
                  emoji="📭"
                  title={t('activities.noActivities', { defaultValue: 'No Activities Found' })}
                  description={
                    filter !== 'all'
                      ? t('activities.changeFilter', { defaultValue: 'Try changing the filter' })
                      : t('activities.noActivitiesDesc', { defaultValue: 'New activities will be added soon' })
                  }
                />
              </GlassCard>
            )}
          </>
        )}
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title="Activities"
        showBack
        showNotificationBell={false}
      />
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={tokens.colors.semantic.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => loadActivities()} accessibilityRole="button" accessibilityLabel="Retry" style={styles.retryButton}>
            <Text style={styles.retryButtonText}>{t('common.retry', { defaultValue: 'Retry' })}</Text>
          </Pressable>
        </View>
      )}
      <FlatList
        data={loading ? [] : filteredActivities}
        renderItem={renderActivityItem}
        keyExtractor={(item, index) => item.id?.toString() || String(index)}
        ListHeaderComponent={listHeaderComponent}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        initialNumToRender={15}
        maxToRenderPerBatch={10}
      />

      {/* Details Modal */}
      <Modal visible={showDetailsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={2}>
                {selectedActivity?.skill || selectedActivity?.title || 'Faoliyat'}
              </Text>
              <TouchableOpacity onPress={() => setShowDetailsModal(false)} accessibilityRole="button" accessibilityLabel={t('common.close', { defaultValue: 'Close' })}>
                <Ionicons name="close" size={24} color={tokens.colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.detailsScrollView} showsVerticalScrollIndicator={true}>
              {/* Goal */}
              {selectedActivity?.goal ? (
                <View style={styles.detailSection}>
                  <View style={styles.detailGoalCard}>
                    <View style={styles.detailSectionHeader}>
                      <Ionicons name="flag" size={18} color={tokens.colors.accent.blue} />
                      <Text style={styles.detailSectionTitle}>Maqsad</Text>
                    </View>
                    <Text style={styles.detailGoalText}>{selectedActivity.goal}</Text>
                  </View>
                </View>
              ) : null}

              {/* Dates */}
              {(selectedActivity?.startDate || selectedActivity?.endDate) ? (
                <View style={styles.detailSection}>
                  <View style={styles.detailSectionHeader}>
                    <Ionicons name="calendar" size={18} color={tokens.colors.semantic.success} />
                    <Text style={styles.detailSectionTitle}>Sanalar</Text>
                  </View>
                  <View style={styles.detailDatesRow}>
                    {selectedActivity?.startDate ? (
                      <View style={styles.detailDateCard}>
                        <Ionicons name="calendar-outline" size={16} color={tokens.colors.accent.blue} />
                        <View>
                          <Text style={styles.detailDateLabel}>Boshlanish</Text>
                          <Text style={styles.detailDateValue}>{new Date(selectedActivity.startDate).toLocaleDateString()}</Text>
                        </View>
                      </View>
                    ) : null}
                    {selectedActivity?.endDate ? (
                      <View style={styles.detailDateCard}>
                        <Ionicons name="calendar-outline" size={16} color={tokens.colors.semantic.error} />
                        <View>
                          <Text style={styles.detailDateLabel}>Tugash</Text>
                          <Text style={styles.detailDateValue}>{new Date(selectedActivity.endDate).toLocaleDateString()}</Text>
                        </View>
                      </View>
                    ) : null}
                  </View>
                </View>
              ) : null}

              {/* Teacher */}
              {selectedActivity?.teacher ? (
                <View style={styles.detailSection}>
                  <View style={styles.detailSectionHeader}>
                    <Ionicons name="person" size={18} color={tokens.colors.semantic.success} />
                    <Text style={styles.detailSectionTitle}>O'qituvchi</Text>
                  </View>
                  <Text style={styles.detailText}>{selectedActivity.teacher}</Text>
                </View>
              ) : null}

              {/* Tasks */}
              {selectedActivity?.tasks && Array.isArray(selectedActivity.tasks) && selectedActivity.tasks.filter(t => t).length > 0 ? (
                <View style={styles.detailSection}>
                  <View style={styles.detailSectionHeader}>
                    <Ionicons name="checkmark-circle" size={18} color={tokens.colors.semantic.success} />
                    <Text style={styles.detailSectionTitle}>Vazifalar</Text>
                  </View>
                  {selectedActivity.tasks.filter(t => t).map((task, idx) => (
                    <View key={idx} style={styles.detailTaskItem}>
                      <View style={styles.detailTaskBullet} />
                      <Text style={styles.detailText}>{task}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {/* Methods */}
              {selectedActivity?.methods ? (
                <View style={styles.detailSection}>
                  <View style={styles.detailSectionHeader}>
                    <Ionicons name="bulb" size={18} color={tokens.colors.semantic.success} />
                    <Text style={styles.detailSectionTitle}>Usullar</Text>
                  </View>
                  <Text style={styles.detailText}>{selectedActivity.methods}</Text>
                </View>
              ) : null}

              {/* Progress */}
              {selectedActivity?.progress ? (
                <View style={styles.detailSection}>
                  <View style={styles.detailSectionHeader}>
                    <Ionicons name="trending-up" size={18} color={tokens.colors.semantic.success} />
                    <Text style={styles.detailSectionTitle}>Jarayon/Taraqqiyot</Text>
                  </View>
                  <Text style={styles.detailText}>{selectedActivity.progress}</Text>
                </View>
              ) : null}

              {/* Observation */}
              {selectedActivity?.observation ? (
                <View style={styles.detailSection}>
                  <View style={styles.detailSectionHeader}>
                    <Ionicons name="eye" size={18} color={tokens.colors.semantic.success} />
                    <Text style={styles.detailSectionTitle}>Kuzatish</Text>
                  </View>
                  <Text style={styles.detailText}>{selectedActivity.observation}</Text>
                </View>
              ) : null}

              {/* Services */}
              {selectedActivity?.services && Array.isArray(selectedActivity.services) && selectedActivity.services.length > 0 ? (
                <View style={styles.detailSection}>
                  <View style={styles.detailSectionHeader}>
                    <Ionicons name="medkit" size={18} color={tokens.colors.semantic.success} />
                    <Text style={styles.detailSectionTitle}>Xizmatlar</Text>
                  </View>
                  <View style={styles.detailServicesWrap}>
                    {selectedActivity.services.map((service, idx) => (
                      <View key={idx} style={styles.detailServiceBadge}>
                        <Text style={styles.detailServiceText}>{service}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.detailsFooter}>
              <Pressable style={styles.detailsCloseButton} onPress={() => setShowDetailsModal(false)} accessibilityRole="button" accessibilityLabel={t('common.close', { defaultValue: 'Close' })}>
                <Text style={styles.detailsCloseButtonText}>Yopish</Text>
              </Pressable>
            </View>
          </View>
        </View>
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
    padding: tokens.space.xl,
  },

  // ── Error ────────────────────────────────────────────────────
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
  retryButton: {
    marginTop: tokens.space.lg,
    paddingHorizontal: tokens.space['2xl'],
    paddingVertical: tokens.space.md,
    backgroundColor: tokens.colors.accent.blue,
    borderRadius: tokens.radius.md,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: tokens.type.body.fontSize,
  },

  // ── Child selector ───────────────────────────────────────────
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
    backgroundColor: tokens.colors.semantic.success,
  },
  childPillText: {
    fontSize: tokens.type.sub.fontSize,
    fontWeight: '600',
    color: tokens.colors.text.secondary,
  },
  childPillTextActive: {
    color: '#fff',
  },

  // ── Progress Card (Figma: mint→blue gradient) ────────────────
  progressCard: {
    marginBottom: tokens.space['2xl'],
    padding: 0,
    overflow: 'hidden',
  },
  progressCardGradient: {
    padding: tokens.space.xl,
    borderRadius: tokens.radius.lg,
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
  progressCardBody: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: tokens.space.lg,
  },
  progressCardCount: {
    fontSize: 30,
    fontWeight: '600',
    color: '#2E3A59',
  },
  progressCardLabel: {
    fontSize: tokens.type.body.fontSize,
    color: '#5A6B8C',
  },
  progressCardBarWrap: {
    flex: 1,
    marginBottom: tokens.space.sm,
  },

  // ── Filters ──────────────────────────────────────────────────
  filterRow: {
    flexDirection: 'row',
    gap: tokens.space.sm,
    marginBottom: tokens.space.lg,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.md,
    backgroundColor: tokens.colors.background.secondary,
    borderRadius: tokens.radius.pill,
    gap: tokens.space.sm,
    ...tokens.shadow.sm,
  },
  filterPillActive: {
    backgroundColor: tokens.colors.semantic.success,
    ...tokens.shadow.soft,
  },
  filterPillPressed: {
    transform: [{ scale: 0.96 }],
  },
  filterEmoji: {
    fontSize: 14,
  },
  filterLabel: {
    fontSize: tokens.type.sub.fontSize,
    fontWeight: '600',
    color: tokens.colors.text.secondary,
  },
  filterLabelActive: {
    color: '#fff',
  },

  // ── Section title ────────────────────────────────────────────
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E3A59',
    marginBottom: tokens.space.lg,
    paddingHorizontal: 1,
  },

  // ── Activity card (Figma template) ───────────────────────────
  activityCard: {
    marginBottom: tokens.space.md,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  activityTitle: {
    fontSize: tokens.type.body.fontSize,
    fontWeight: '600',
    color: '#2E3A59',
    flexShrink: 1,
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
    marginBottom: 2,
    lineHeight: 18,
  },
  activityDuration: {
    fontSize: tokens.type.caption.fontSize,
    color: '#8C9BB5',
  },

  // ── Status circle (right side) ──────────────────────────────
  statusCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
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

  // ── Progress inside card ────────────────────────────────────
  progressSection: {
    marginTop: tokens.space.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.space.xs,
  },
  progressLabel: {
    fontSize: tokens.type.sub.fontSize,
    color: tokens.colors.text.secondary,
  },
  progressBadge: {
    backgroundColor: tokens.colors.semantic.successSoft,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: 2,
    borderRadius: tokens.radius.pill,
  },
  progressValue: {
    fontSize: tokens.type.caption.fontSize,
    fontWeight: '700',
    color: tokens.colors.semantic.success,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: tokens.radius.pill,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: tokens.radius.pill,
    overflow: 'hidden',
  },

  // ── Empty ───────────────────────────────────────────────────
  emptyCard: {
    marginTop: tokens.space.xl,
  },

  // ── Modal ───────────────────────────────────────────────────
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
    flex: 1,
    fontSize: tokens.type.h2.fontSize,
    fontWeight: tokens.type.h2.fontWeight,
    color: tokens.colors.text.primary,
    marginRight: tokens.space.md,
  },
  detailsScrollView: {
    maxHeight: 500,
    paddingHorizontal: tokens.space.lg,
    paddingTop: tokens.space.md,
  },
  detailSection: {
    marginBottom: tokens.space.lg,
  },
  detailSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokens.space.sm,
    gap: tokens.space.xs,
  },
  detailSectionTitle: {
    fontSize: tokens.type.sub.fontSize,
    fontWeight: '700',
    color: tokens.colors.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailGoalCard: {
    backgroundColor: tokens.colors.semantic.successSoft,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    borderLeftWidth: 3,
    borderLeftColor: tokens.colors.semantic.success,
  },
  detailGoalText: {
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.primary,
    lineHeight: 22,
  },
  detailDatesRow: {
    flexDirection: 'row',
    gap: tokens.space.md,
  },
  detailDateCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.background.secondary,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    gap: tokens.space.sm,
  },
  detailDateLabel: {
    fontSize: tokens.type.caption.fontSize,
    color: tokens.colors.text.secondary,
  },
  detailDateValue: {
    fontSize: tokens.type.sub.fontSize,
    fontWeight: '600',
    color: tokens.colors.text.primary,
  },
  detailText: {
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.secondary,
    lineHeight: 22,
  },
  detailTaskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: tokens.space.xs,
    gap: tokens.space.sm,
  },
  detailTaskBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: tokens.colors.semantic.success,
    marginTop: 8,
  },
  detailServicesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space.xs,
  },
  detailServiceBadge: {
    backgroundColor: tokens.colors.semantic.successSoft,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.xs / 2,
    borderRadius: tokens.radius.sm,
  },
  detailServiceText: {
    fontSize: tokens.type.caption.fontSize,
    color: tokens.colors.semantic.success,
    fontWeight: '600',
  },
  detailsFooter: {
    padding: tokens.space.lg,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border.light,
  },
  detailsCloseButton: {
    paddingVertical: tokens.space.md,
    alignItems: 'center',
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.semantic.success,
  },
  detailsCloseButtonText: {
    color: '#fff',
    fontSize: tokens.type.body.fontSize,
    fontWeight: '700',
  },
});
