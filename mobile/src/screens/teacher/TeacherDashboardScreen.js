import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, RefreshControl, Dimensions, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { GlassCard } from '../../components/teacher/GlassCard';
import { StatCard } from '../../components/teacher/StatCard';
import { QuickActionCard } from '../../components/teacher/QuickActionCard';
import { DashboardHeader } from '../../components/teacher/DashboardHeader';
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
    monitoring: 'вЂ”',
  });

  // Bottom nav height + safe area + padding
  const BOTTOM_NAV_HEIGHT = 75;
  const bottomPadding = BOTTOM_NAV_HEIGHT + insets.bottom + 16;

  // Calculate card width for 2-column grid
  const screenWidth = Dimensions.get('window').width;
  const padding = tokens.space.lg * 2; // Left + right padding
  const gap = tokens.space.md;
  const cardWidth = (screenWidth - padding - gap) / 2;

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

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DashboardHeader />
      {error && (
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Ionicons name="alert-circle-outline" size={48} color={tokens.colors.semantic.error} />
          <Text style={{ color: tokens.colors.text.secondary, marginTop: 12, textAlign: 'center' }}>{error}</Text>
          <Pressable onPress={() => loadData()} accessibilityRole="button" accessibilityLabel="Retry"
            style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: tokens.colors.accent.blue, borderRadius: tokens.radius.md }}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>{t('common.retry', { defaultValue: 'Retry' })}</Text>
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
        {/* Stats Grid - 2x2 grid: Individual Plan, Meals, Media, Monitoring */}
        <View style={styles.statsGrid}>
          <View style={{ width: cardWidth }}>
            <StatCard
              icon="checkmark-circle"
              iconColor={tokens.colors.semantic.success}
              iconBg={tokens.colors.semantic.successSoft}
              count={stats.activities}
              label={t('dashboard.individualPlan', { defaultValue: 'Individual Plan' })}
              onPress={() => navigation.navigate('Activities')}
            />
          </View>
          <View style={{ width: cardWidth }}>
            <StatCard
              icon="close-circle"
              iconColor={tokens.colors.joy.sunflower}
              iconBg={tokens.colors.joy.sunflowerSoft}
              count={stats.meals}
              label={t('dashboard.meals', { defaultValue: 'Meals' })}
              onPress={() => navigation.navigate('Meals')}
            />
          </View>
          <View style={{ width: cardWidth }}>
            <StatCard
              icon="images"
              iconColor={tokens.colors.joy.lavender}
              iconBg={tokens.colors.joy.lavenderSoft}
              count={stats.media}
              label={t('dashboard.media', { defaultValue: 'Media' })}
              onPress={() => navigation.navigate('Media')}
            />
          </View>
          <View style={{ width: cardWidth }}>
            <StatCard
              icon="heart"
              iconColor={tokens.colors.joy.coral}
              iconBg={tokens.colors.joy.coralSoft}
              count={stats.monitoring}
              label={t('dashboard.monitoring', { defaultValue: 'Monitoring' })}
              onPress={() => navigation.navigate('MonitoringJournal')}
            />
          </View>
        </View>

        {/* Quick Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('dashboard.quickActions', { defaultValue: 'Quick Actions' })}
          </Text>

          <QuickActionCard
            icon="checkmark-circle"
            iconColor={tokens.colors.semantic.success}
            iconBg={tokens.colors.semantic.successSoft}
            title={t('dashboard.updatePlan', { defaultValue: 'Update Individual Plan' })}
            subtitle={t('dashboard.updatePlanDesc', { defaultValue: 'Manage student goals and progress' })}
            onPress={() => navigation.navigate('Activities')}
          />

          <QuickActionCard
            icon="people"
            iconColor={tokens.colors.joy.lavender}
            iconBg={tokens.colors.joy.lavenderSoft}
            title={t('dashboard.contactParents', { defaultValue: 'Contact Parents' })}
            subtitle={t('dashboard.contactParentsDesc', { defaultValue: 'Send updates and messages' })}
            onPress={() => navigation.navigate('TeacherTabs', { screen: 'Parents' })}
          />

          <QuickActionCard
            icon="heart"
            iconColor={tokens.colors.joy.coral}
            iconBg={tokens.colors.joy.coralSoft}
            title={t('dashboard.healthMonitoring', { defaultValue: 'Health Monitoring' })}
            subtitle={t('dashboard.healthMonitoringDesc', { defaultValue: 'Track vitals and wellness' })}
            onPress={() => navigation.navigate('EmotionalMonitoring')}
          />
        </View>

        {/* Recent Updates Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('dashboard.recentUpdates', { defaultValue: 'Recent Updates' })}
          </Text>

          <GlassCard style={styles.updateCard}>
            <View style={styles.updateRow}>
              <View style={[styles.updateIcon, { backgroundColor: tokens.colors.semantic.successSoft }]}>
                <Ionicons name="checkmark-circle" size={20} color={tokens.colors.semantic.success} />
              </View>
              <View style={styles.updateContent}>
                <Text style={styles.updateTitle}>
                  {t('dashboard.planUpdated', { defaultValue: 'Individual Plan Updated' })}
                </Text>
                <Text style={styles.updateDesc}>
                  {t('dashboard.planUpdatedDesc', {
                    defaultValue: 'Emma\'s speech therapy goals have been updated for this week.',
                  })}
                </Text>
                <Text style={styles.updateTime}>
                  {t('dashboard.timeAgo', { defaultValue: '1 hour ago' })}
                </Text>
              </View>
            </View>
          </GlassCard>

          <GlassCard style={styles.updateCard}>
            <View style={styles.updateRow}>
              <View style={[styles.updateIcon, { backgroundColor: tokens.colors.joy.lavenderSoft }]}>
                <Ionicons name="chatbubble-ellipses" size={20} color={tokens.colors.joy.lavender} />
              </View>
              <View style={styles.updateContent}>
                <Text style={styles.updateTitle}>
                  {t('dashboard.parentMessage', { defaultValue: 'Parent Message' })}
                </Text>
                <Text style={styles.updateDesc}>
                  {t('dashboard.parentMessageDesc', {
                    defaultValue: 'Sarah Johnson asked about tomorrow\'s activities.',
                  })}
                </Text>
                <Text style={styles.updateTime}>
                  {t('dashboard.timeAgo3h', { defaultValue: '3 hours ago' })}
                </Text>
              </View>
            </View>
          </GlassCard>
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
    padding: tokens.space.lg,
  },

  // Stats Grid - 2x2 grid layout
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space.md,
    marginBottom: tokens.space.xl,
    marginTop: tokens.space.md,
  },

  // Section
  section: {
    marginBottom: tokens.space.xl,
  },
  sectionTitle: {
    fontSize: tokens.type.h3.fontSize,
    fontWeight: '600',
    color: tokens.colors.text.primary,
    marginBottom: tokens.space.md,
    paddingHorizontal: 2,
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
});


