import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, AppState, Animated, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useNotification } from '../../context/NotificationContext';
import { parentService } from '../../services/parentService';
import { api } from '../../services/api';
import { GlassCard } from '../../components/teacher/GlassCard';
import { StatCard } from '../../components/teacher/StatCard';
import { DashboardHeader } from '../../components/parent/DashboardHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import tokens from '../../styles/tokens';

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
        const [activitiesRes, mealsRes, mediaRes, therapiesRes] = await Promise.all([
          parentService.getActivities({ childId: activeChildId }).catch(() => []),
          parentService.getMeals({ childId: activeChildId }).catch(() => []),
          parentService.getMedia({ childId: activeChildId }).catch(() => []),
          api.get('/therapy', { params: { isActive: true } }).catch(() => ({ data: { data: { therapies: [] } } })),
        ]);

        const activities = Array.isArray(activitiesRes) ? activitiesRes : (activitiesRes?.activities || []);
        const meals = Array.isArray(mealsRes) ? mealsRes : (mealsRes?.meals || []);
        const media = Array.isArray(mediaRes) ? mediaRes : (mediaRes?.media || []);
        const therapiesData = therapiesRes?.data?.data?.therapies || therapiesRes?.data?.data || therapiesRes?.data?.therapies || [];
        const therapies = Array.isArray(therapiesData) ? therapiesData : [];

        setStats({
          activities: activities.length,
          meals: meals.length,
          media: media.length,
          therapies: therapies.length,
        });
      } else {
        setStats({ activities: 0, meals: 0, media: 0, therapies: 0 });
      }
    } catch (error) {
      console.error('[ParentDashboard] Error loading dashboard:', error);
      setChildren([]);
      setStats({ activities: 0, meals: 0, media: 0, therapies: 0 });
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

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DashboardHeader />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Grid - 2x2 grid */}
        <View style={styles.statsGrid}>
          <View style={{ width: cardWidth }}>
            <StatCard
              icon="checkmark-circle"
              iconColor={tokens.colors.semantic.success}
              iconBg={tokens.colors.semantic.successSoft}
              count={stats.activities}
              label={t('dashboard.individualPlan', { defaultValue: 'Individual Plan' }) || t('dashboard.activities', { defaultValue: 'Activities' })}
              onPress={() => navigation.navigate('Activities')}
            />
          </View>
          <View style={{ width: cardWidth }}>
            <StatCard
              icon="restaurant"
              iconColor={tokens.colors.semantic.warning}
              iconBg={tokens.colors.semantic.warningSoft}
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
              icon="musical-notes"
              iconColor={tokens.colors.joy.coral}
              iconBg={tokens.colors.joy.coralSoft}
              count={stats.therapies}
              label={t('therapy.title', { defaultValue: 'Therapy' })}
              onPress={() => navigation.navigate('Therapy')}
            />
          </View>
        </View>

        {/* Children Section */}
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
                >
                  <GlassCard style={styles.childCard}>
                    <View style={styles.childCardContent}>
                      <View style={[styles.childAvatar, { backgroundColor: tokens.colors.accent.blue + '20' }]}>
                        <Text style={styles.childAvatarText}>
                          {child.firstName?.charAt(0) || ''}{child.lastName?.charAt(0) || ''}
                        </Text>
                      </View>
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
                  </GlassCard>
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
  // Children List
  childrenList: {
    gap: tokens.space.md,
  },
  childCard: {
    marginBottom: tokens.space.sm,
  },
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
});
