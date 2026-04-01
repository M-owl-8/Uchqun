import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import tokens from '../../styles/tokens';

const SERVICE_TYPES = [
  'logoped',
  'defektolog',
  'self_care',
  'ipotherapy',
  'music',
  'labor',
  'tmc',
  'physiotherapy',
];

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

export function ServicePlanScreen() {
  const route = useRoute();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { childId, childName } = route?.params || {};

  const BOTTOM_NAV_HEIGHT = 75;
  const bottomPadding = BOTTOM_NAV_HEIGHT + insets.bottom + 16;

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [plans, setPlans] = useState([]);

  const years = [currentYear - 1, currentYear, currentYear + 1];

  const loadPlans = useCallback(async () => {
    if (!childId) return;
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/service-plans?childId=${childId}&year=${selectedYear}`);
      setPlans(response.data?.data || []);
    } catch (err) {
      if (__DEV__) console.error('Error loading service plans:', err);
      setError(t('common.loadError', { defaultValue: 'Failed to load data' }));
    } finally {
      setLoading(false);
    }
  }, [childId, selectedYear]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const getServiceLabel = (type) => {
    const keyMap = {
      logoped: 'logoped',
      defektolog: 'defektolog',
      self_care: 'selfCare',
      ipotherapy: 'ipotherapy',
      music: 'music',
      labor: 'labor',
      tmc: 'tmc',
      physiotherapy: 'physiotherapy',
    };
    return t(`servicePlan.services.${keyMap[type]}`, { defaultValue: type });
  };

  const getMonthLabel = (month) => {
    return t(`servicePlan.months.${month}`, { defaultValue: month });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title={t('servicePlan.title', { defaultValue: 'Annual Plan' })}
        showBack
      />

      {/* Year Selector */}
      <View style={styles.yearSelector}>
        {years.map((year) => (
          <Pressable
            key={year}
            style={[styles.yearTab, selectedYear === year && styles.yearTabActive]}
            onPress={() => setSelectedYear(year)}
          >
            <Text style={[styles.yearTabText, selectedYear === year && styles.yearTabTextActive]}>
              {year}
            </Text>
          </Pressable>
        ))}
      </View>

      {error && !loading && (
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Ionicons name="alert-circle-outline" size={48} color={tokens.colors.semantic.error} />
          <Text style={{ color: tokens.colors.text.secondary, marginTop: 12, textAlign: 'center' }}>{error}</Text>
          <Pressable onPress={() => loadPlans()} accessibilityRole="button"
            style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: tokens.colors.accent.blue, borderRadius: tokens.radius.md }}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>{t('common.retry', { defaultValue: 'Retry' })}</Text>
          </Pressable>
        </View>
      )}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <ScrollView
          horizontal
          style={styles.scrollContainer}
          contentContainerStyle={{ paddingBottom: bottomPadding }}
          showsHorizontalScrollIndicator={false}
        >
          <View>
            {/* Header Row */}
            <View style={styles.headerRow}>
              <View style={styles.serviceCell}>
                <Text style={styles.headerText}>
                  {t('servicePlan.title', { defaultValue: 'Service' })}
                </Text>
              </View>
              {MONTHS.map((month) => (
                <View key={month} style={styles.monthCell}>
                  <Text style={styles.monthHeaderText}>{getMonthLabel(month)}</Text>
                </View>
              ))}
            </View>

            {/* Data Rows */}
            {plans.map((plan, index) => (
              <View key={plan.serviceType || index} style={[styles.dataRow, index % 2 === 0 && styles.dataRowEven]}>
                <View style={styles.serviceCell}>
                  <Text style={styles.serviceText} numberOfLines={2}>
                    {getServiceLabel(plan.serviceType)}
                  </Text>
                </View>
                {MONTHS.map((month) => (
                  <View key={month} style={styles.monthCell}>
                    <View
                      style={[
                        styles.cellIndicator,
                        plan.months?.[month] ? styles.cellActive : styles.cellInactive,
                      ]}
                    />
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background.primary,
  },
  yearSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  yearTab: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: tokens.colors.background.secondary,
  },
  yearTabActive: {
    backgroundColor: tokens.colors.accent.blue,
  },
  yearTabText: {
    fontSize: 15,
    fontWeight: '600',
    color: tokens.colors.text.secondary,
  },
  yearTabTextActive: {
    color: '#FFFFFF',
  },
  scrollContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: tokens.colors.border.light,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  serviceCell: {
    width: 120,
    justifyContent: 'center',
    paddingRight: 8,
  },
  monthCell: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 13,
    fontWeight: '700',
    color: tokens.colors.text.primary,
  },
  monthHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: tokens.colors.text.secondary,
  },
  dataRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border.light,
  },
  dataRowEven: {
    backgroundColor: tokens.colors.background.secondary,
  },
  serviceText: {
    fontSize: 13,
    fontWeight: '500',
    color: tokens.colors.text.primary,
  },
  cellIndicator: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  cellActive: {
    backgroundColor: '#34D399',
  },
  cellInactive: {
    backgroundColor: tokens.colors.background.secondary,
    borderWidth: 1,
    borderColor: tokens.colors.border.light,
  },
});
