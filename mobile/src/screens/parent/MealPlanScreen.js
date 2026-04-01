import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import tokens from '../../styles/tokens';

const MEAL_TYPES = ['breakfast', 'lunch', 'snack', 'dinner'];

const MEAL_EMOJI = {
  breakfast: '🥞',
  lunch: '🍱',
  snack: '🍎',
  dinner: '🍝',
};

const MEAL_COLORS = {
  breakfast: '#E8C27E',
  lunch: '#DFF4EC',
  snack: '#F8D7C4',
  dinner: '#D4C5F9',
};

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function generateDates() {
  const today = new Date();
  const dates = [];
  for (let i = -7; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d);
  }
  return dates;
}

const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function MealPlanScreen() {
  const route = useRoute();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { childId, childName } = route?.params || {};

  const BOTTOM_NAV_HEIGHT = 75;
  const bottomPadding = BOTTOM_NAV_HEIGHT + insets.bottom + 16;

  const dates = generateDates();
  const todayStr = formatDate(new Date());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [plans, setPlans] = useState([]);

  const loadPlans = useCallback(async () => {
    if (!childId) return;
    try {
      setLoading(true);
      const response = await api.get('/meal-plans', {
        params: { childId, startDate: selectedDate, endDate: selectedDate },
      });
      setPlans(response.data?.data || []);
    } catch (error) {
      if (__DEV__) {
        console.error('Error loading meal plans:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [childId, selectedDate]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPlans();
    setRefreshing(false);
  }, [loadPlans]);

  const getPlanForMealType = (mealType) => {
    return plans.find((p) => p.mealType === mealType);
  };

  const getMealLabel = (type) => {
    return t(`mealPlan.${type}`, { defaultValue: type });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title={childName ? `${t('mealPlan.title')} - ${childName}` : t('mealPlan.title')} />

      {/* Date selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dateRow}
        contentContainerStyle={styles.dateRowContent}
      >
        {dates.map((d) => {
          const ds = formatDate(d);
          const isSelected = ds === selectedDate;
          const isToday = ds === todayStr;
          return (
            <Pressable
              key={ds}
              style={[styles.dateTab, isSelected && styles.dateTabActive]}
              onPress={() => setSelectedDate(ds)}
            >
              <Text style={[styles.dateDayName, isSelected && styles.dateDayNameActive]}>
                {DAY_NAMES_SHORT[d.getDay()]}
              </Text>
              <Text style={[styles.dateDay, isSelected && styles.dateDayActive]}>
                {d.getDate()}
              </Text>
              {isToday && <View style={styles.todayDot} />}
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: bottomPadding }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {MEAL_TYPES.map((mealType) => {
            const plan = getPlanForMealType(mealType);
            return (
              <View
                key={mealType}
                style={[styles.mealCard, { backgroundColor: MEAL_COLORS[mealType] + '40' }]}
              >
                <View style={styles.mealCardHeader}>
                  <Text style={styles.mealEmoji}>{MEAL_EMOJI[mealType]}</Text>
                  <Text style={styles.mealTypeLabel}>{getMealLabel(mealType)}</Text>
                </View>
                {plan ? (
                  <View style={styles.mealCardBody}>
                    <Text style={styles.plannedMenuText}>{plan.plannedMenu}</Text>
                    {plan.notes ? (
                      <Text style={styles.notesText}>{plan.notes}</Text>
                    ) : null}
                  </View>
                ) : (
                  <View style={styles.mealCardBody}>
                    <Text style={styles.emptyText}>
                      {t('mealPlan.noPlans', { defaultValue: 'No plan for this day' })}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background?.primary || '#F8F9FA',
  },
  dateRow: {
    maxHeight: 80,
  },
  dateRowContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  dateTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
    minWidth: 48,
    marginRight: 6,
  },
  dateTabActive: {
    backgroundColor: tokens.colors.accent.blue,
  },
  dateDayName: {
    fontSize: 11,
    color: tokens.colors.text?.muted || '#8E8E93',
    fontWeight: '500',
  },
  dateDayNameActive: {
    color: '#fff',
  },
  dateDay: {
    fontSize: 16,
    fontWeight: '700',
    color: tokens.colors.text?.primary || '#2E3A59',
    marginTop: 2,
  },
  dateDayActive: {
    color: '#fff',
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: tokens.colors.accent.blue,
    marginTop: 3,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  mealCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  mealCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  mealEmoji: {
    fontSize: 24,
  },
  mealTypeLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: tokens.colors.text?.primary || '#2E3A59',
  },
  mealCardBody: {
    paddingLeft: 4,
  },
  plannedMenuText: {
    fontSize: 15,
    color: tokens.colors.text?.primary || '#2E3A59',
    lineHeight: 22,
  },
  notesText: {
    fontSize: 13,
    color: tokens.colors.text?.muted || '#8E8E93',
    marginTop: 6,
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: 14,
    color: tokens.colors.text?.muted || '#8E8E93',
    fontStyle: 'italic',
  },
});
