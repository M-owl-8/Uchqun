import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, AppState, RefreshControl, Dimensions, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useNotification } from '../../context/NotificationContext';
import { parentService } from '../../services/parentService';
import { api } from '../../services/api';
import { API_URL } from '../../config';
import Card from '../../components/common/Card';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import QuickActionCard from '../../components/common/QuickActionCard';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import tokens from '../../styles/tokens';
import logger from '../../utils/logger';

const CATEGORY_LABELS = {
  cognitive: 'Kognitiv',
  motor: 'Motor',
  speech: 'Nutq',
  behavior: 'Xulq-atvor',
  social: 'Ijtimoiy',
  self_care: "O'ziga g'amxo'rlik",
};

export function ParentDashboardScreen() {
  const { user } = useAuth();
  const { on, off, connected } = useSocket();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { count = 0, refreshNotifications } = useNotification();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    activities: 0,
    meals: 0,
    media: 0,
    therapies: 0,
  });
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [brokenChildPhotoIds, setBrokenChildPhotoIds] = useState(new Set());

  // Bottom nav height + safe area + padding
  const BOTTOM_NAV_HEIGHT = 75;
  const bottomPadding = BOTTOM_NAV_HEIGHT + insets.bottom + 16;

  // Calculate card width for 2-column grid
  const screenWidth = Dimensions.get('window').width;
  const pagePadding = tokens.space.xl * 2; // Left + right padding
  const gap = tokens.space.lg;
  const cardWidth = (screenWidth - pagePadding - gap) / 2;

  const initialLoadDone = useRef(false);

  // Real-time WebSocket listeners for instant updates
  useEffect(() => {
    if (!connected) return;

    const handleChange = () => loadData(false);

    on('activity:created', handleChange);
    on('activity:updated', handleChange);
    on('activity:deleted', handleChange);
    on('meal:created', handleChange);
    on('meal:updated', handleChange);
    on('meal:deleted', handleChange);
    on('media:created', handleChange);
    on('media:updated', handleChange);
    on('media:deleted', handleChange);
    on('child:updated', handleChange);

    return () => {
      off('activity:created', handleChange);
      off('activity:updated', handleChange);
      off('activity:deleted', handleChange);
      off('meal:created', handleChange);
      off('meal:updated', handleChange);
      off('meal:deleted', handleChange);
      off('media:created', handleChange);
      off('media:updated', handleChange);
      off('media:deleted', handleChange);
      off('child:updated', handleChange);
    };
  }, [connected, on, off, loadData]);

  const loadData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      setError(null);

      const childrenData = await parentService.getChildren().catch(() => []);
      const childrenList = Array.isArray(childrenData) ? childrenData : [];
      setChildren(childrenList);

      // Select first child if none selected
      let activeChildId = selectedChildId;
      if (childrenList.length > 0 && !activeChildId) {
        activeChildId = childrenList[0].id;
        setSelectedChildId(activeChildId);
      }

      if (activeChildId) {
        const [activitiesRes, mealsRes, mediaRes, therapiesRes, assessmentsRes] = await Promise.all([
          parentService.getActivities({ childId: activeChildId }).catch(() => []),
          parentService.getMeals({ childId: activeChildId }).catch(() => []),
          parentService.getMedia({ childId: activeChildId }).catch(() => []),
          api.get('/therapy', { params: { isActive: true } }).catch(() => ({ data: { data: { therapies: [] } } })),
          api.get('/assessments/latest', { params: { childId: activeChildId } }).catch(() => ({ data: { data: [] } })),
        ]);

        const activities = Array.isArray(activitiesRes) ? activitiesRes : (activitiesRes?.activities || []);
        const meals = Array.isArray(mealsRes) ? mealsRes : (mealsRes?.meals || []);
        const media = Array.isArray(mediaRes) ? mediaRes : (mediaRes?.media || []);
        const therapiesData = therapiesRes?.data?.data?.therapies || therapiesRes?.data?.data || therapiesRes?.data?.therapies || [];
        const therapies = Array.isArray(therapiesData) ? therapiesData : [];
        const assessmentsData = assessmentsRes?.data?.data || [];

        setStats({
          activities: activities.length,
          meals: meals.length,
          media: media.length,
          therapies: therapies.length,
        });
        setAssessments(Array.isArray(assessmentsData) ? assessmentsData : []);
      } else {
        setStats({ activities: 0, meals: 0, media: 0, therapies: 0 });
        setAssessments([]);
      }
    } catch (error) {
      logger.error('[ParentDashboard] Error loading dashboard:', error);
      setError('Failed to load dashboard data');
      setChildren([]);
      setStats({ activities: 0, meals: 0, media: 0, therapies: 0 });
      setAssessments([]);
    } finally {
      if (isInitial) setLoading(false);
      setRefreshing(false);
    }
  }, [selectedChildId]);

  // Load data on focus, auto-refresh every 30s, and refresh on foreground — single consolidated effect
  useFocusEffect(
    useCallback(() => {
      const isInitial = !initialLoadDone.current;
      loadData(isInitial);
      initialLoadDone.current = true;

      const interval = setInterval(() => loadData(false), 30000);

      const subscription = AppState.addEventListener('change', (nextAppState) => {
        if (nextAppState === 'active') loadData(false);
      });

      return () => {
        clearInterval(interval);
        subscription?.remove();
      };
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Derive the selected child and welcome name
  const selectedChild = children.find((c) => c.id === selectedChildId) || children[0];
  const welcomeName = selectedChild
    ? `${selectedChild.firstName}'s ${t('dashboard.journey', { defaultValue: 'Journey' })}`
    : user?.firstName || t('dashboard.welcome', { defaultValue: 'Welcome' });

  const BASE_URL = API_URL.replace(/\/api$/, '');
  const resolveImageUri = (raw) => {
    if (!raw) return null;
    if (raw.startsWith('data:') || raw.startsWith('http')) return raw;
    return `${BASE_URL}${raw.startsWith('/') ? '' : '/'}${raw}`;
  };
  const avatarUri = resolveImageUri(user?.avatar);

  // Determine greeting based on time of day
  const hour = new Date().getHours();
  const greetingKey = hour < 12 ? 'goodMorning' : hour < 18 ? 'goodAfternoon' : 'goodEvening';
  const greetingDefault = hour < 12 ? 'Good morning,' : hour < 18 ? 'Good afternoon,' : 'Good evening,';
  const greeting = t(`dashboard.${greetingKey}`, { defaultValue: greetingDefault });

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader
          title={t('nav.dashboard', { defaultValue: 'Dashboard' })}
          showNotificationBell
          notificationCount={count}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={tokens.colors.semantic.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => loadData(true)}
            accessibilityRole="button"
            accessibilityLabel={t('common.retry', { defaultValue: 'Retry' })}
          >
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.retryButtonText}>{t('common.retry', { defaultValue: 'Retry' })}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title={t('nav.dashboard', { defaultValue: 'Dashboard' })}
        showNotificationBell
        notificationCount={count}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Welcome Card */}
        <Card
          gradient={tokens.colors.gradients.welcome}
          style={styles.welcomeCard}
          accessibilityLabel={t('dashboard.welcomeCard', { defaultValue: 'Welcome card' })}
        >
          <View style={styles.welcomeTop}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.welcomeAvatar} />
            ) : (
              <View style={[styles.welcomeAvatar, styles.welcomeAvatarFallback]}>
                <Text style={styles.welcomeAvatarText}>
                  {(user?.firstName?.charAt(0) || '') + (user?.lastName?.charAt(0) || '')}
                </Text>
              </View>
            )}

            <View style={styles.welcomeTextContainer}>
              <Text style={styles.welcomeGreeting}>{greeting}</Text>
              <Text style={styles.welcomeName} numberOfLines={1}>{welcomeName}</Text>
            </View>
            <View style={styles.welcomeIconContainer}>
              <Ionicons name="heart" size={24} color="#E8C27E" />
            </View>
          </View>
          <Text style={styles.welcomeMessage}>
            {selectedChild
              ? t('dashboard.progressMessage', {
                  defaultValue: '{{name}} has completed {{count}} activities today. Great progress!',
                  name: selectedChild.firstName,
                  count: stats.activities,
                })
              : t('dashboard.noChildMessage', { defaultValue: 'Add a child to start tracking progress.' })}
          </Text>
        </Card>

        {/* Quick Stats - 2 column grid */}
        <View style={styles.statsGrid}>
          <View style={{ width: cardWidth }}>
            <Card style={styles.statCard} onPress={() => navigation.navigate('Activities')}>
              <View style={[styles.statIconContainer, { backgroundColor: '#DFF4EC' }]}>
                <Ionicons name="sparkles" size={24} color={tokens.colors.text.primary} />
              </View>
              <Text style={styles.statCount}>{stats.activities}</Text>
              <Text style={styles.statLabel}>
                {t('dashboard.activities', { defaultValue: 'Activities' })}
              </Text>
            </Card>
          </View>
          <View style={{ width: cardWidth }}>
            <Card style={styles.statCard} onPress={() => navigation.navigate('Meals')}>
              <View style={[styles.statIconContainer, { backgroundColor: '#F8D7C4' }]}>
                <Ionicons name="heart" size={24} color={tokens.colors.text.primary} />
              </View>
              <Text style={styles.statCount}>{stats.meals}</Text>
              <Text style={styles.statLabel}>
                {t('dashboard.meals', { defaultValue: 'Meals' })}
              </Text>
            </Card>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('dashboard.quickActions', { defaultValue: 'Quick Actions' })}
          </Text>
          <View style={styles.quickActionsList}>
            <QuickActionCard
              icon="chatbubbles-outline"
              title={t('dashboard.chatWithTeacher', { defaultValue: "O'qituvchi bilan chat" })}
              subtitle={t('dashboard.chatWithTeacherSub', { defaultValue: 'Xabar yuborish' })}
              color="#F8D7C4"
              onPress={() => {
                const teacherId = selectedChild?.teacherId || selectedChild?.teacher?.id;
                navigation.navigate('Chat', {
                  conversationId: `parent:${user?.id}`,
                  childId: selectedChild?.id,
                  teacherId,
                });
              }}
            />
            <QuickActionCard
              icon="images-outline"
              title={t('dashboard.mediaQuick', { defaultValue: 'Media' })}
              subtitle={t('dashboard.mediaQuickSub', { defaultValue: 'Rasm, video va hujjatlar' })}
              color="#DFF4EC"
              onPress={() => navigation.navigate('Media')}
            />
            <QuickActionCard
              icon="star-outline"
              title={t('nav.foydali', { defaultValue: 'Foydali' })}
              subtitle={t('dashboard.foydaliSub', { defaultValue: 'Musiqa, video va tavsiyalar' })}
              color="#BFD7EA"
              onPress={() => navigation.navigate('Foydali')}
            />
          </View>
        </View>

        {/* Assessments Section — only shown when teacher has submitted ratings */}
        {selectedChild && assessments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('dashboard.assessments', { defaultValue: "Tarbiyachi Baholari" })}
            </Text>
            <View style={styles.assessmentGrid}>
              {assessments.map((item) => (
                <Card key={item.id} style={styles.assessmentCard}>
                  <Text style={styles.assessmentCategory}>
                    {CATEGORY_LABELS[item.category] || item.category}
                  </Text>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name={star <= item.score ? 'star' : 'star-outline'}
                        size={16}
                        color={star <= item.score ? '#E8C27E' : '#C8D0DC'}
                      />
                    ))}
                  </View>
                  {item.teacher && (
                    <Text style={styles.assessmentTeacher} numberOfLines={1}>
                      {item.teacher.firstName} {item.teacher.lastName}
                    </Text>
                  )}
                </Card>
              ))}
            </View>
          </View>
        )}

        {/* My Children Section */}
        {children.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('dashboard.myChildren', { defaultValue: 'My Children' })}
            </Text>
            <View style={styles.childrenList}>
              {children.map((child) => (
                <Pressable
                  key={child.id}
                  onPress={() => {
                    setSelectedChildId(child.id);
                    navigation.navigate('ChildProfile', { childId: child.id });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${child.firstName} ${child.lastName}`}
                  accessibilityHint={t('dashboard.viewChildProfile', { defaultValue: 'View child profile' })}
                >
                  <Card style={styles.childCard}>
                    <View style={styles.childCardContent}>
                      {(child.photo || child.photoUrl) && !brokenChildPhotoIds.has(child.id) ? (
                        <Image
                          source={{ uri: resolveImageUri(child.photo || child.photoUrl) }}
                          style={styles.childAvatar}
                          onError={() => {
                            setBrokenChildPhotoIds((prev) => {
                              const next = new Set(prev);
                              next.add(child.id);
                              return next;
                            });
                          }}
                        />
                      ) : (
                        <View style={[styles.childAvatar, { backgroundColor: tokens.colors.text.primary + '20' }]}>
                          <Text style={styles.childAvatarText}>
                            {child.firstName?.charAt(0) || ''}{child.lastName?.charAt(0) || ''}
                          </Text>
                        </View>
                      )}
                      <View style={styles.childInfo}>
                        <Text style={styles.childName} numberOfLines={1}>
                          {child.firstName} {child.lastName}
                        </Text>
                        {child.dateOfBirth && (
                          <View style={styles.childAgeContainer}>
                            <Ionicons name="calendar-outline" size={12} color={tokens.colors.text.secondary} />
                            <Text style={styles.childAge}>
                              {new Date().getFullYear() - new Date(child.dateOfBirth).getFullYear()} {t('dashboard.yearsOld', { defaultValue: 'years old' })}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={tokens.colors.text.tertiary}
                      />
                    </View>
                  </Card>
                </Pressable>
              ))}
            </View>
          </View>
        )}
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
  scrollContent: {
    padding: tokens.space.xl,
    gap: tokens.space['2xl'],
  },

  // Welcome Card
  welcomeCard: {
    marginTop: tokens.space.sm,
  },
  welcomeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.space.lg,
    gap: tokens.space.md,
  },
  welcomeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  welcomeAvatarFallback: {
    backgroundColor: 'rgba(46, 58, 89, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E3A59',
  },
  welcomeTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  welcomeGreeting: {
    fontSize: 14,
    color: '#5A6B8C',
    marginBottom: tokens.space.xs,
  },
  welcomeName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2E3A59',
  },
  welcomeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(232, 194, 126, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: tokens.space.md,
  },
  welcomeMessage: {
    fontSize: 14,
    color: '#5A6B8C',
    lineHeight: 22,
  },

  // Quick Stats - 2 column grid
  statsGrid: {
    flexDirection: 'row',
    gap: tokens.space.lg,
  },
  statCard: {
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: tokens.radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.space.md,
  },
  statCount: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2E3A59',
    marginBottom: tokens.space.xs,
  },
  statLabel: {
    fontSize: 14,
    color: '#5A6B8C',
  },

  // Section
  section: {},
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2E3A59',
    marginBottom: tokens.space.md,
    paddingHorizontal: 1,
  },

  // Quick Actions
  quickActionsList: {
    gap: tokens.space.md,
  },

  // Assessments
  assessmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space.md,
  },
  assessmentCard: {
    width: '47%',
    alignItems: 'center',
    paddingVertical: tokens.space.md,
  },
  assessmentCategory: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E3A59',
    marginBottom: tokens.space.sm,
    textAlign: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: tokens.space.xs,
  },
  assessmentTeacher: {
    fontSize: 11,
    color: tokens.colors.text.secondary,
    textAlign: 'center',
    marginTop: tokens.space.xs,
  },
  emptyAssessmentCard: {
    alignItems: 'center',
    paddingVertical: tokens.space.lg,
  },
  emptyAssessmentText: {
    fontSize: 14,
    color: tokens.colors.text.secondary,
    textAlign: 'center',
  },

  // Children List
  childrenList: {
    gap: tokens.space.md,
  },
  childCard: {},
  childCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
  },
  childAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadow.sm,
  },
  childAvatarText: {
    fontSize: tokens.type.h2.fontSize,
    fontWeight: tokens.type.h1.fontWeight,
    color: tokens.colors.accent.blue,
  },
  childInfo: {
    flex: 1,
    minWidth: 0,
  },
  childName: {
    fontSize: tokens.type.bodyLarge.fontSize,
    fontWeight: '600',
    color: tokens.colors.text.primary,
    marginBottom: tokens.space.xs * 0.5,
  },
  childAgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.xs * 0.5,
  },
  childAge: {
    fontSize: tokens.type.sub.fontSize,
    color: tokens.colors.text.secondary,
  },

  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.space.xl,
    gap: tokens.space.md,
  },
  errorText: {
    fontSize: tokens.type.bodyLarge.fontSize,
    color: tokens.colors.text.secondary,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
    backgroundColor: tokens.colors.accent.blue,
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.md,
    borderRadius: tokens.radius.pill,
    marginTop: tokens.space.sm,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: tokens.type.body.fontSize,
    fontWeight: '600',
  },
});
