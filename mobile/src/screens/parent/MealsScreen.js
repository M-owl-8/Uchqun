import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  FlatList,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { parentService } from '../../services/parentService';
import { mealService } from '../../services/mealService';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import tokens from '../../styles/tokens';
import Card from '../../components/common/Card';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import Skeleton from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import { useTranslation } from 'react-i18next';

// Meal type to emoji and color mapping
const MEAL_CONFIG_BASE = {
  breakfast: { emoji: '🥞', color: '#E8C27E', bgColor: '#E8C27E' },
  lunch: { emoji: '🍱', color: '#DFF4EC', bgColor: '#DFF4EC' },
  dinner: { emoji: '🍝', color: '#E8C27E', bgColor: '#E8C27E' },
  snack: { emoji: '🍎', color: '#F8D7C4', bgColor: '#F8D7C4' },
  drink: { emoji: '🥤', color: '#BFD7EA', bgColor: '#BFD7EA' },
  default: { emoji: '🍽️', color: '#BFD7EA', bgColor: '#BFD7EA' },
};

const getMealConfig = (mealType, t) => {
  const labels = {
    breakfast: t('parentMeals.breakfast'),
    lunch: t('parentMeals.lunch'),
    dinner: t('parentMeals.dinner'),
    snack: t('parentMeals.snack'),
    drink: t('parentMeals.drink'),
    default: t('parentMeals.meal'),
  };
  const type = (mealType || '').toLowerCase();
  for (const [key, config] of Object.entries(MEAL_CONFIG_BASE)) {
    if (type.includes(key)) {
      return { ...config, label: labels[key] || key };
    }
  }
  return { ...MEAL_CONFIG_BASE.default, label: labels.default };
};

export function MealsScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [meals, setMeals] = useState([]);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
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
      loadMeals();
    } else {
      setMeals([]);
      setLoading(false);
    }
  }, [selectedChildId]);

  const loadMeals = async () => {
    if (!selectedChildId) {
      setMeals([]);
      return;
    }
    setError(null);
    try {
      setLoading(true);
      const data = await mealService.getMeals({ childId: selectedChildId });
      setMeals(Array.isArray(data) ? data : []);
    } catch (err) {
      setMeals([]);
      setError(t('common.loadError', { defaultValue: 'Failed to load data' }));
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMeals();
    setRefreshing(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return t('parentMeals.today');
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return t('parentMeals.yesterday');
    }
    return date.toLocaleDateString('uz-UZ', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    if (timeString.includes(':')) {
      return timeString;
    }
    const date = new Date(timeString);
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

  const filteredMeals =
    filter === 'all'
      ? meals
      : meals.filter((m) => isToday(m.date || m.createdAt));

  // Compute nutrition summary stats
  const eatenCount = filteredMeals.filter((m) => m.eaten).length;
  const totalMealCount = filteredMeals.length;
  // Estimate calories (placeholder since the API may not return calorie data)
  const totalCalories = filteredMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
  const waterCups = filteredMeals.filter(
    (m) => (m.mealType || '').toLowerCase().includes('drink')
  ).length;

  // Group meals by date
  const groupedMeals = filteredMeals.reduce((groups, meal) => {
    const dateKey = formatDate(meal.date || meal.createdAt);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(meal);
    return groups;
  }, {});

  // Flatten grouped meals into a list with date headers for FlatList
  const flatListData = [];
  Object.entries(groupedMeals).forEach(([date, dateMeals]) => {
    flatListData.push({ type: 'header', date, id: `header-${date}` });
    dateMeals.forEach((meal, index) => {
      flatListData.push({ type: 'meal', ...meal, id: meal.id || `meal-${date}-${index}` });
    });
  });

  const filters = [
    { key: 'all', label: t('parentMeals.filterAll'), emoji: '📋' },
    { key: 'today', label: t('parentMeals.filterToday'), emoji: '📆' },
  ];

  const renderMealItem = ({ item }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.dateGroup}>
          <View style={styles.dateHeader}>
            <Text style={styles.dateLabel}>{item.date}</Text>
            <View style={styles.dateLine} />
          </View>
        </View>
      );
    }

    const config = getMealConfig(item.mealType, t);
    const isCompleted = item.eaten !== undefined ? item.eaten : true;

    return (
      <Card style={styles.mealCard}>
        <View style={styles.mealRow}>
          {/* 48x48 icon container with tinted bg */}
          <View
            style={[
              styles.mealIconContainer,
              { backgroundColor: config.bgColor + '66' },
            ]}
          >
            <Text style={styles.mealEmoji}>{config.emoji}</Text>
          </View>

          {/* Content */}
          <View style={styles.mealInfo}>
            <View style={styles.mealTitleRow}>
              <Text style={styles.mealType}>
                {item.mealType || config.label}
              </Text>
              {isCompleted && (
                <View style={styles.completedBadge}>
                  <Text style={styles.completedBadgeText}>✓ {t('parentMeals.completed')}</Text>
                </View>
              )}
            </View>

            {/* Time */}
            {item.time && (
              <Text style={styles.mealTime}>{formatTime(item.time)}</Text>
            )}

            {/* Notes as description */}
            {item.notes && (
              <Text style={styles.mealNotes} numberOfLines={2}>
                {item.notes}
              </Text>
            )}

            {/* Food items as bullet list */}
            {item.items && Array.isArray(item.items) && item.items.length > 0 && (
              <View style={styles.foodItemsList}>
                {item.items.map((food, i) => (
                  <View key={i} style={styles.foodItemRow}>
                    <View style={styles.foodBullet} />
                    <Text style={styles.foodItemText}>{food}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Log button if not completed */}
          {!isCompleted && (
            <Pressable
              style={({ pressed }) => [
                styles.logButton,
                pressed && { opacity: 0.9, transform: [{ scale: 0.95 }] },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Log meal"
            >
              <Text style={styles.logButtonText}>Log</Text>
            </Pressable>
          )}
        </View>
      </Card>
    );
  };

  const listHeaderComponent = () => {
    if (loading) {
      return (
        <>
          <Skeleton
            width="100%"
            height={140}
            style={{ borderRadius: tokens.radius.lg, marginBottom: tokens.space['2xl'] }}
          />
          <View style={styles.filterRow}>
            {[1, 2].map((i) => (
              <Skeleton
                key={i}
                width={90}
                height={40}
                style={{ borderRadius: tokens.radius.pill }}
              />
            ))}
          </View>
          {[1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              width="100%"
              height={100}
              style={{ borderRadius: tokens.radius.lg, marginBottom: tokens.space.md }}
            />
          ))}
        </>
      );
    }

    return (
      <View>
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
          <Card style={styles.emptyCard}>
            <EmptyState
              emoji="👶"
              title={t('meals.selectChild', { defaultValue: 'Select Child' })}
              description={t('meals.selectChildDesc', { defaultValue: 'After adding a child, meal records will appear' })}
            />
          </Card>
        )}
        {children.length > 0 && (
          <>
            {/* Nutrition Summary Card — Figma: gold→peach gradient */}
            <Card style={styles.nutritionCard}>
              <LinearGradient
                colors={['rgba(232,194,126,0.3)', 'rgba(248,215,196,0.3)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.nutritionGradient}
              >
                <View style={styles.nutritionHeader}>
                  <Text style={styles.nutritionTitle}>{t('parentMeals.todayNutrition')}</Text>
                  <View style={styles.nutritionIcon}>
                    <Text style={{ fontSize: 24 }}>🍴</Text>
                  </View>
                </View>

                {/* 3-column stats */}
                <View style={styles.nutritionStats}>
                  <View style={styles.nutritionStatItem}>
                    <Text style={styles.nutritionStatValue}>
                      {eatenCount}/{totalMealCount}
                    </Text>
                    <Text style={styles.nutritionStatLabel}>{t('parentMeals.mealsLabel')}</Text>
                  </View>
                  <View style={styles.nutritionStatDivider} />
                  <View style={styles.nutritionStatItem}>
                    <Text style={styles.nutritionStatValue}>
                      {totalCalories || '—'}
                    </Text>
                    <Text style={styles.nutritionStatLabel}>{t('parentMeals.calories')}</Text>
                  </View>
                  <View style={styles.nutritionStatDivider} />
                  <View style={styles.nutritionStatItem}>
                    <Text style={styles.nutritionStatValue}>{waterCups}</Text>
                    <Text style={styles.nutritionStatLabel}>{t('parentMeals.cupsWater')}</Text>
                  </View>
                </View>
              </LinearGradient>
            </Card>

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
            {filteredMeals.length > 0 && (
              <Text style={styles.sectionTitle}>{t('parentMeals.mealSchedule')}</Text>
            )}

            {/* Empty state for meals */}
            {filteredMeals.length === 0 && (
              <Card style={styles.emptyCard}>
                <EmptyState
                  emoji="🍽️"
                  title={t('meals.noMeals', { defaultValue: 'No Meal Records Found' })}
                  description={
                    filter !== 'all'
                      ? t('meals.changeFilter', { defaultValue: 'Try changing the filter' })
                      : t('meals.noMealsDesc', { defaultValue: 'Meal records will be added soon' })
                  }
                />
              </Card>
            )}
          </>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title={t('parentMeals.title')}
        showBack
        showNotificationBell={false}
      />
      {selectedChildId && (
        <Pressable
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 16, marginBottom: 8, backgroundColor: '#E8C27E20', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 }}
          onPress={() => {
            const child = children.find(c => c.id === selectedChildId);
            navigation.navigate('MealPlan', { childId: selectedChildId, childName: child?.firstName });
          }}
        >
          <Ionicons name="calendar-outline" size={18} color="#E8A030" />
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#E8A030' }}>
            {t('mealPlan.title', { defaultValue: 'Meal Plan' })}
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#E8A030" style={{ marginLeft: 'auto' }} />
        </Pressable>
      )}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={tokens.colors.semantic.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => loadMeals()} accessibilityRole="button" accessibilityLabel="Retry" style={styles.retryButton}>
            <Text style={styles.retryButtonText}>{t('common.retry', { defaultValue: 'Retry' })}</Text>
          </Pressable>
        </View>
      )}
      <FlatList
        data={loading ? [] : flatListData}
        renderItem={renderMealItem}
        keyExtractor={(item) => item.id?.toString() || String(Math.random())}
        ListHeaderComponent={listHeaderComponent}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        initialNumToRender={15}
        maxToRenderPerBatch={10}
      />
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
    backgroundColor: tokens.colors.semantic.warning,
  },
  childPillText: {
    fontSize: tokens.type.sub.fontSize,
    fontWeight: '600',
    color: tokens.colors.text.secondary,
  },
  childPillTextActive: {
    color: '#fff',
  },

  // ── Nutrition Summary Card (Figma: gold→peach gradient) ──────
  nutritionCard: {
    marginBottom: tokens.space['2xl'],
    padding: 0,
    overflow: 'hidden',
  },
  nutritionGradient: {
    padding: tokens.space.xl,
    borderRadius: tokens.radius.lg,
  },
  nutritionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.space.lg,
  },
  nutritionTitle: {
    fontSize: tokens.type.h3.fontSize,
    fontWeight: '600',
    color: '#2E3A59',
  },
  nutritionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8C27E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutritionStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  nutritionStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  nutritionStatValue: {
    fontSize: tokens.type.h2.fontSize,
    fontWeight: '600',
    color: '#2E3A59',
  },
  nutritionStatLabel: {
    fontSize: tokens.type.caption.fontSize,
    color: '#5A6B8C',
    marginTop: tokens.space.xs,
  },
  nutritionStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(191,215,234,0.3)',
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
    backgroundColor: tokens.colors.semantic.warning,
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

  // ── Date group headers ───────────────────────────────────────
  dateGroup: {
    marginBottom: tokens.space.lg,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokens.space.md,
    gap: tokens.space.sm,
  },
  dateLabel: {
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.type.h1.fontWeight,
    color: tokens.colors.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  dateLine: {
    flex: 1,
    height: 2,
    backgroundColor: tokens.colors.border.light,
    borderRadius: 1,
  },

  // ── Meal card (Figma template) ───────────────────────────────
  mealCard: {
    marginBottom: tokens.space.md,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.space.lg,
  },
  mealIconContainer: {
    width: 48,
    height: 48,
    borderRadius: tokens.radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  mealEmoji: {
    fontSize: 24,
  },
  mealInfo: {
    flex: 1,
    minWidth: 0,
  },
  mealTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
    marginBottom: 2,
  },
  mealType: {
    fontSize: tokens.type.body.fontSize,
    fontWeight: '600',
    color: '#2E3A59',
    textTransform: 'capitalize',
  },
  completedBadge: {
    paddingHorizontal: tokens.space.sm,
    paddingVertical: 2,
    borderRadius: tokens.radius.pill,
    backgroundColor: '#DFF4EC',
  },
  completedBadgeText: {
    fontSize: tokens.type.caption.fontSize,
    fontWeight: '500',
    color: '#2E3A59',
  },
  mealTime: {
    fontSize: tokens.type.caption.fontSize,
    color: '#8C9BB5',
    marginBottom: tokens.space.sm,
  },
  mealNotes: {
    fontSize: tokens.type.body.fontSize,
    color: '#5A6B8C',
    lineHeight: 18,
    marginBottom: tokens.space.xs,
  },

  // ── Food items bullet list ───────────────────────────────────
  foodItemsList: {
    marginTop: tokens.space.xs,
    gap: tokens.space.xs,
  },
  foodItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
  },
  foodBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#BFD7EA',
  },
  foodItemText: {
    fontSize: tokens.type.body.fontSize,
    color: '#5A6B8C',
  },

  // ── Log button ───────────────────────────────────────────────
  logButton: {
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.sm,
    borderRadius: tokens.radius.xl,
    backgroundColor: '#2E3A59',
    alignSelf: 'flex-start',
  },
  logButtonText: {
    color: '#FFFFFF',
    fontSize: tokens.type.body.fontSize,
    fontWeight: '500',
  },

  // ── Empty ───────────────────────────────────────────────────
  emptyCard: {
    marginTop: tokens.space.xl,
  },
});
