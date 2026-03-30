import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, RefreshControl, Dimensions, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import Card from '../../components/common/Card';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import QuickActionCard from '../../components/common/QuickActionCard';
import tokens from '../../styles/tokens';

export function TeacherDashboardScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    activities: 0,
    meals: 0,
    media: 0,
    monitoring: '\u2014',
  });

  // Bottom nav height + safe area + padding
  const BOTTOM_NAV_HEIGHT = 75;
  const bottomPadding = BOTTOM_NAV_HEIGHT + insets.bottom + 16;

  // Calculate card width for 2-column grid
  const screenWidth = Dimensions.get('window').width;
  const pagePadding = tokens.space.xl * 2; // Left + right padding
  const gap = tokens.space.lg;
  const cardWidth = (screenWidth - pagePadding - gap) / 2;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setError(null);
    try {
      setLoading(true);

      // Single request each for activities, meals, media (backend filters by teacher's children)
      const [activitiesRes, mealsRes, mediaRes] = await Promise.all([
        api.get('/activities').catch(() => ({ data: [] })),
        api.get('/meals').catch(() => ({ data: [] })),
        api.get('/media').catch(() => ({ data: [] })),
      ]);

      const countFromResponse = (res) => {
        const data = res.data;
        if (Array.isArray(data)) return data.length;
        if (Array.isArray(data?.activities)) return data.activities.length;
        if (Array.isArray(data?.meals)) return data.meals.length;
        if (Array.isArray(data?.media)) return data.media.length;
        if (Array.isArray(data?.data)) return data.data.length;
        if (data?.total != null) return data.total;
        return 0;
      };

      setStats({
        activities: countFromResponse(activitiesRes),
        meals: countFromResponse(mealsRes),
        media: countFromResponse(mediaRes),
        monitoring: '\u2014',
      });
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError(t('common.loadError', { defaultValue: 'Failed to load data' }));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Determine greeting based on time of day
  const hour = new Date().getHours();
  const greetingDefault = hour < 12 ? 'Good morning,' : hour < 18 ? 'Good afternoon,' : 'Good evening,';
  const greetingKey = hour < 12 ? 'goodMorning' : hour < 18 ? 'goodAfternoon' : 'goodEvening';
  const greeting = t(`dashboard.${greetingKey}`, { defaultValue: greetingDefault });

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title={t('nav.dashboard', { defaultValue: 'Dashboard' })}
        showNotificationBell
      />

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={tokens.colors.semantic.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            onPress={() => loadData()}
            accessibilityRole="button"
            accessibilityLabel={t('common.retry', { defaultValue: 'Retry' })}
            style={styles.retryButton}
          >
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.retryButtonText}>{t('common.retry', { defaultValue: 'Retry' })}</Text>
          </Pressable>
        </View>
      )}

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
            <View style={styles.welcomeTextContainer}>
              <Text style={styles.welcomeGreeting}>{greeting}</Text>
              <Text style={styles.welcomeName} numberOfLines={1}>
                {t('dashboard.teacherDashboard', { defaultValue: 'Teacher Dashboard' })}
              </Text>
            </View>
            <View style={styles.welcomeIconContainer}>
              <Ionicons name="heart" size={24} color="#E8C27E" />
            </View>
          </View>
          <Text style={styles.welcomeMessage}>
            {t('dashboard.teacherWelcomeMessage', {
              defaultValue: `You have ${stats.activities} activities tracked today. Keep up the great work!`,
              count: stats.activities,
            })}
          </Text>
        </Card>

        {/* Quick Stats - 2 column grid */}
        <View style={styles.statsGrid}>
          <View style={{ width: cardWidth }}>
            <Card style={styles.statCard} onPress={() => navigation.navigate('TeacherTabs', { screen: 'Parents' })}>
              <View style={[styles.statIconContainer, { backgroundColor: '#F8D7C4' }]}>
                <Ionicons name="people" size={24} color={tokens.colors.text.primary} />
              </View>
              <Text style={styles.statCount}>{stats.meals}</Text>
              <Text style={styles.statLabel}>
                {t('dashboard.parents', { defaultValue: 'Parents' })}
              </Text>
            </Card>
          </View>
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
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('dashboard.quickActions', { defaultValue: 'Quick Actions' })}
          </Text>
          <View style={styles.quickActionsList}>
            <QuickActionCard
              icon="checkmark-circle-outline"
              title={t('dashboard.addActivity', { defaultValue: 'Add Activity' })}
              subtitle={t('dashboard.addActivitySub', { defaultValue: 'Create a new activity plan' })}
              color="#DFF4EC"
              onPress={() => navigation.navigate('Activities')}
            />
            <QuickActionCard
              icon="restaurant-outline"
              title={t('dashboard.logMeal', { defaultValue: 'Log Meal' })}
              subtitle={t('dashboard.logMealSub', { defaultValue: "Track today's nutrition" })}
              color="#E8C27E"
              onPress={() => navigation.navigate('Meals')}
            />
            <QuickActionCard
              icon="camera-outline"
              title={t('dashboard.uploadMedia', { defaultValue: 'Upload Media' })}
              subtitle={t('dashboard.uploadMediaSub', { defaultValue: 'Photos, videos, and documents' })}
              color="#BFD7EA"
              onPress={() => navigation.navigate('Media')}
            />
          </View>
        </View>

        {/* Recent Updates Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('dashboard.recentUpdates', { defaultValue: 'Recent Updates' })}
          </Text>

          <Card style={styles.updateCard}>
            <View style={styles.updateRow}>
              <View style={[styles.updateIcon, { backgroundColor: '#DFF4EC' }]}>
                <Ionicons name="checkmark-circle" size={20} color={tokens.colors.text.primary} />
              </View>
              <View style={styles.updateContent}>
                <Text style={styles.updateTitle}>
                  {t('dashboard.planUpdated', { defaultValue: 'Individual Plan Updated' })}
                </Text>
                <Text style={styles.updateDesc}>
                  {t('dashboard.planUpdatedDesc', {
                    defaultValue: "Emma's speech therapy goals have been updated for this week.",
                  })}
                </Text>
                <Text style={styles.updateTime}>
                  {t('dashboard.timeAgo', { defaultValue: '1 hour ago' })}
                </Text>
              </View>
            </View>
          </Card>

          <Card style={styles.updateCard}>
            <View style={styles.updateRow}>
              <View style={[styles.updateIcon, { backgroundColor: '#F8D7C4' }]}>
                <Ionicons name="chatbubble-ellipses" size={20} color={tokens.colors.text.primary} />
              </View>
              <View style={styles.updateContent}>
                <Text style={styles.updateTitle}>
                  {t('dashboard.parentMessage', { defaultValue: 'Parent Message' })}
                </Text>
                <Text style={styles.updateDesc}>
                  {t('dashboard.parentMessageDesc', {
                    defaultValue: "Sarah Johnson asked about tomorrow's activities.",
                  })}
                </Text>
                <Text style={styles.updateTime}>
                  {t('dashboard.timeAgo3h', { defaultValue: '3 hours ago' })}
                </Text>
              </View>
            </View>
          </Card>
        </View>
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: tokens.space.lg,
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

  // Update Cards
  updateCard: {
    marginBottom: tokens.space.sm,
  },
  updateRow: {
    flexDirection: 'row',
    gap: tokens.space.sm,
  },
  updateIcon: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateContent: {
    flex: 1,
  },
  updateTitle: {
    fontSize: tokens.type.body.fontSize,
    fontWeight: '600',
    color: tokens.colors.text.primary,
    marginBottom: 4,
  },
  updateDesc: {
    fontSize: tokens.type.sub.fontSize,
    color: tokens.colors.text.secondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  updateTime: {
    fontSize: tokens.type.caption.fontSize,
    color: tokens.colors.text.muted,
  },

  // Error state
  errorContainer: {
    padding: tokens.space.xl,
    alignItems: 'center',
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
