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

// Animated progress bar component
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
          colors={['#10B981', '#34D399']}
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
    try {
      setLoading(true);
      const data = await activityService.getActivities({ childId: selectedChildId });
      setActivities(Array.isArray(data) ? data : []);
    } catch (error) {
      setActivities([]);
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

  const filters = [
    { key: 'all', label: 'Hammasi', emoji: '📋' },
    { key: 'today', label: 'Bugun', emoji: '📆' },
    { key: 'week', label: 'Hafta', emoji: '🗓️' },
  ];

  const renderActivityItem = ({ item, index }) => {
    const emoji = getActivityEmoji(item);
    const hasProgress = item.progress !== undefined;
    const progress = item.progress || 0;

    return (
      <Pressable onPress={() => { setSelectedActivity(item); setShowDetailsModal(true); }} accessibilityRole="button" accessibilityLabel={item.title || item.skill || item.description || 'Faoliyat'} accessibilityHint={t('activities.viewDetails', { defaultValue: 'View activity details' })}>
      <GlassCard style={styles.activityCard}>
        <View style={styles.activityHeader}>
          <LinearGradient
            colors={[tokens.colors.joy.lavenderSoft, tokens.colors.joy.skySoft]}
            style={styles.activityIconContainer}
          >
            <Text style={styles.activityEmoji}>{emoji}</Text>
          </LinearGradient>
          <View style={styles.activityInfo}>
            <Text style={styles.activityTitle} numberOfLines={2}>
              {item.title || item.skill || item.description || "Faoliyat"}
            </Text>
            {item.description && item.title && (
              <Text style={styles.activityDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}
          </View>
          <View style={styles.activityMeta}>
            <View style={styles.dateTimeContainer}>
              <Ionicons name="calendar-outline" size={12} color={tokens.colors.accent.blue} />
              <Text style={styles.activityDate}>
                {formatDate(item.date || item.createdAt)}
              </Text>
            </View>
            {item.createdAt && (
              <View style={styles.dateTimeContainer}>
                <Ionicons name="time-outline" size={12} color={tokens.colors.text.muted} />
                <Text style={styles.activityTime}>
                  {formatTime(item.createdAt)}
                </Text>
              </View>
            )}
          </View>
        </View>

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

        {item.status && (
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusBadge,
                item.status === 'completed' && styles.statusCompleted,
                item.status === 'in_progress' && styles.statusInProgress,
              ]}
            >
              <Text style={styles.statusText}>
                {item.status === 'completed'
                  ? '✅ Tugallandi'
                  : item.status === 'in_progress'
                  ? "🔄 Davom etmoqda"
                  : item.status}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.detailHint}>
          <Text style={styles.detailHintText}>Batafsil</Text>
          <Ionicons name="chevron-forward" size={14} color={tokens.colors.accent.blue} />
        </View>
      </GlassCard>
      </Pressable>
    );
  };

  const listHeaderComponent = () => {
    if (loading) {
      return (
        <>
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
              height={120}
              style={{ borderRadius: tokens.radius.lg, marginBottom: tokens.space.md }}
            />
          ))}
        </>
      );
    }

    return (
      <Animated.View style={{ opacity: fadeAnim }}>
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
            {/* Filter Pills - Enhanced Design */}
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
        title={t('activities.title', { defaultValue: 'Individual Plan' }) || t('activitiesPage.title', { defaultValue: 'Activities' })}
        showBack={navigation.canGoBack()}
      />
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
    padding: tokens.space.lg,
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
    width: 44,
  },
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
  list: {
    gap: tokens.space.md,
    paddingBottom: tokens.space.xl,
  },
  activityCard: {
    marginBottom: tokens.space.md,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.space.md,
  },
  activityIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadow.sm,
  },
  activityEmoji: {
    fontSize: 28,
  },
  activityInfo: {
    flex: 1,
    minWidth: 0,
  },
  activityTitle: {
    fontSize: tokens.type.h3.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.text.primary,
    marginBottom: tokens.space.xs,
    lineHeight: 22,
  },
  activityDescription: {
    fontSize: tokens.type.sub.fontSize,
    color: tokens.colors.text.secondary,
    lineHeight: 18,
  },
  activityMeta: {
    alignItems: 'flex-end',
    gap: tokens.space.xs / 2,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.xs / 2,
  },
  activityDate: {
    fontSize: tokens.type.caption.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.accent.blue,
  },
  activityTime: {
    fontSize: tokens.type.caption.fontSize,
    color: tokens.colors.text.muted,
  },
  progressSection: {
    marginTop: tokens.space.md,
    paddingTop: tokens.space.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.space.sm,
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
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: tokens.radius.pill,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: tokens.radius.pill,
    overflow: 'hidden',
  },
  statusContainer: {
    marginTop: tokens.space.md,
    paddingTop: tokens.space.sm,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.xs,
    borderRadius: tokens.radius.sm,
    backgroundColor: tokens.colors.text.muted + '20',
  },
  statusCompleted: {
    backgroundColor: tokens.colors.semantic.successSoft,
  },
  statusInProgress: {
    backgroundColor: tokens.colors.semantic.warningSoft,
  },
  statusText: {
    fontSize: tokens.type.caption.fontSize,
    fontWeight: '600',
    color: tokens.colors.text.secondary,
  },
  emptyCard: {
    marginTop: tokens.space.xl,
  },
  detailHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: tokens.space.md,
    paddingTop: tokens.space.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    gap: tokens.space.xs / 2,
  },
  detailHintText: {
    fontSize: tokens.type.caption.fontSize,
    fontWeight: '600',
    color: tokens.colors.accent.blue,
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
