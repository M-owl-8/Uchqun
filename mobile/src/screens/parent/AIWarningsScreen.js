import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../services/api';
import tokens from '../../styles/tokens';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import Card from '../../components/common/Card';
import Skeleton from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export function AIWarningsScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('unresolved');

  const BOTTOM_NAV_HEIGHT = 75;
  const bottomPadding = BOTTOM_NAV_HEIGHT + insets.bottom + 16;

  useEffect(() => {
    loadWarnings();
  }, [filter]);

  const loadWarnings = async () => {
    setError(null);
    try {
      setLoading(true);
      const params = {};
      if (filter === 'unresolved') {
        params.isResolved = false;
      } else if (filter === 'resolved') {
        params.isResolved = true;
      }
      const response = await api.get('/ai-warnings', { params });
      const warningsData = response.data?.data?.warnings || [];
      setWarnings(Array.isArray(warningsData) ? warningsData : []);
    } catch (err) {
      if (__DEV__) {
        console.error('Error loading warnings:', err);
      }
      setWarnings([]);
      setError(t('common.loadError', { defaultValue: 'Failed to load data' }));
    } finally {
      setLoading(false);
    }
  };

  const resolveWarning = async (warningId) => {
    try {
      await api.put(`/ai-warnings/${warningId}/resolve`);
      Alert.alert(t('common.success', { defaultValue: 'Success' }), t('warnings.resolved', { defaultValue: 'Warning resolved' }));
      loadWarnings();
    } catch (error) {
      if (__DEV__) {
        console.error('Error resolving warning:', error);
      }
      Alert.alert(t('common.error', { defaultValue: 'Error' }), error.response?.data?.error || t('warnings.resolveError', { defaultValue: 'Failed to resolve warning' }));
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return tokens.colors.semantic.error;
      case 'high':
        return tokens.colors.semantic.warning;
      case 'medium':
        return tokens.colors.semantic.warning;
      default:
        return tokens.colors.accent.blue;
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return 'close-circle';
      case 'high':
        return 'alert';
      case 'medium':
        return 'alert';
      default:
        return 'information-circle';
    }
  };

  const getWarningTypeLabel = (type) => {
    const labels = {
      low_rating: t('warnings.lowRating', { defaultValue: 'Past reyting' }),
      declining_rating: t('warnings.decliningRating', { defaultValue: 'Reyting pasayishi' }),
      negative_feedback: t('warnings.negativeFeedback', { defaultValue: 'Salbiy fikr' }),
      complaint: t('warnings.complaint', { defaultValue: 'Shikoyat' }),
      safety_concern: t('warnings.safetyConcern', { defaultValue: 'Xavfsizlik muammosi' }),
      quality_issue: t('warnings.qualityIssue', { defaultValue: 'Sifat muammosi' }),
      other: t('warnings.other', { defaultValue: 'Boshqa' }),
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader title={t('warnings.title', { defaultValue: 'AI Ogohlantirishlar' })} showBack={true} />
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title={t('warnings.title', { defaultValue: 'AI Ogohlantirishlar' })} showBack={true} />
      {error && (
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Ionicons name="alert-circle-outline" size={48} color={tokens.colors.semantic.error} />
          <Text style={{ color: tokens.colors.text.secondary, marginTop: 12, textAlign: 'center' }}>{error}</Text>
          <Pressable onPress={() => loadWarnings()} accessibilityRole="button" accessibilityLabel="Retry"
            style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: tokens.colors.accent.blue, borderRadius: tokens.radius.md }}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>{t('common.retry', { defaultValue: 'Retry' })}</Text>
          </Pressable>
        </View>
      )}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
      <Text style={styles.subtitle} allowFontScaling={true}>
        {t('warnings.subtitle', { defaultValue: 'Reytinglar asosida yaratilgan ogohlantirishlar' })}
      </Text>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        <View style={styles.filterRow}>
          {['all', 'unresolved', 'resolved'].map((f) => (
            <Pressable
              key={f}
              style={({ pressed }) => [
                styles.filterPill,
                filter === f && styles.filterPillActive,
                pressed && styles.filterPillPressed,
              ]}
              onPress={() => setFilter(f)}
            >
              <Text style={[
                styles.filterPillText,
                filter === f && styles.filterPillTextActive,
              ]} allowFontScaling={true}>
                {f === 'all' ? t('warnings.all', { defaultValue: 'Barchasi' }) :
                 f === 'unresolved' ? t('warnings.unresolved', { defaultValue: 'Yechilmagan' }) :
                 t('warnings.resolved', { defaultValue: 'Yechilgan' })}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Warnings List */}
      {warnings.length > 0 ? (
        <View style={styles.warningsList}>
          {warnings.map((warning) => {
            const iconName = getSeverityIcon(warning.severity);
            const iconColor = getSeverityColor(warning.severity);
            return (
              <Card key={warning.id} style={styles.warningCard}>
                <View style={styles.warningHeader}>
                  <LinearGradient
                    colors={[iconColor + '30', iconColor + '15']}
                    style={styles.warningIconContainer}
                  >
                    <Ionicons name={iconName} size={24} color={iconColor} />
                  </LinearGradient>
                  <View style={styles.warningContent}>
                    <View style={styles.warningTitleRow}>
                      <Text style={styles.warningTitle} allowFontScaling={true}>
                        {warning.title}
                      </Text>
                      <View style={[styles.severityBadge, { backgroundColor: iconColor + '20' }]}>
                        <Text style={[styles.severityBadgeText, { color: iconColor }]} allowFontScaling={true}>
                          {warning.severity}
                        </Text>
                      </View>
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeBadgeText} allowFontScaling={true}>
                          {getWarningTypeLabel(warning.warningType)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.warningMessage} allowFontScaling={true}>
                      {warning.message}
                    </Text>
                    {warning.aiAnalysis && (
                      <View style={styles.aiAnalysisContainer}>
                        <Text style={styles.aiAnalysisLabel} allowFontScaling={true}>
                          {t('warnings.aiAnalysis', { defaultValue: 'AI Tahlil' })}:
                        </Text>
                        <Text style={styles.aiAnalysisText} allowFontScaling={true}>
                          {warning.aiAnalysis}
                        </Text>
                      </View>
                    )}
                    <View style={styles.warningFooter}>
                      <Text style={styles.warningDate} allowFontScaling={true}>
                        {new Date(warning.createdAt).toLocaleString()}
                      </Text>
                      {!warning.isResolved && (
                        <Pressable
                          style={styles.resolveButton}
                          onPress={() => resolveWarning(warning.id)}
                        >
                          <Ionicons name="checkmark-circle" size={16} color="#fff" />
                          <Text style={styles.resolveButtonText} allowFontScaling={true}>
                            {t('warnings.resolve', { defaultValue: 'Yechildi deb belgilash' })}
                          </Text>
                        </Pressable>
                      )}
                      {warning.isResolved && (
                        <View style={styles.resolvedBadge}>
                          <Ionicons name="checkmark-circle" size={16} color={tokens.colors.semantic.success} />
                          <Text style={styles.resolvedBadgeText} allowFontScaling={true}>
                            {t('warnings.resolved', { defaultValue: 'Yechilgan' })}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
      ) : (
        <Card style={styles.emptyCard}>
          <EmptyState
            icon="checkmark-circle-outline"
            title={t('warnings.noWarnings', { defaultValue: 'Ogohlantirishlar yo\'q' })}
            description={t('warnings.noWarningsDesc', { defaultValue: 'Hozircha ogohlantirishlar mavjud emas' })}
          />
        </Card>
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
  subtitle: {
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.secondary,
    marginBottom: tokens.space.lg,
    textAlign: 'center',
  },
  filterScroll: {
    marginBottom: tokens.space.lg,
  },
  filterRow: {
    flexDirection: 'row',
    gap: tokens.space.sm,
  },
  filterPill: {
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.sm,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.background.secondary,
  },
  filterPillActive: {
    backgroundColor: tokens.colors.accent.blue,
    borderColor: tokens.colors.accent.blue,
  },
  filterPillPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  filterPillText: {
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.text.secondary,
  },
  filterPillTextActive: {
    color: '#fff',
  },
  warningsList: {
    gap: tokens.space.md,
  },
  warningCard: {
    marginBottom: tokens.space.sm,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.space.md,
  },
  warningIconContainer: {
    width: 56,
    height: 56,
    borderRadius: tokens.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadow.sm,
  },
  warningContent: {
    flex: 1,
  },
  warningTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: tokens.space.sm,
    marginBottom: tokens.space.sm,
  },
  warningTitle: {
    flex: 1,
    fontSize: tokens.type.h3.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.text.primary,
  },
  severityBadge: {
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.xs / 2,
    borderRadius: tokens.radius.sm,
  },
  severityBadgeText: {
    fontSize: tokens.type.caption.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    textTransform: 'uppercase',
  },
  typeBadge: {
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.xs / 2,
    backgroundColor: tokens.colors.background.tertiary,
    borderRadius: tokens.radius.sm,
  },
  typeBadgeText: {
    fontSize: tokens.type.caption.fontSize,
    color: tokens.colors.text.secondary,
  },
  warningMessage: {
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.primary,
    marginBottom: tokens.space.md,
    lineHeight: 20,
  },
  aiAnalysisContainer: {
    backgroundColor: tokens.colors.accent[50],
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    marginBottom: tokens.space.md,
  },
  aiAnalysisLabel: {
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.accent.blue,
    marginBottom: tokens.space.xs,
  },
  aiAnalysisText: {
    fontSize: tokens.type.sub.fontSize,
    color: tokens.colors.text.primary,
    lineHeight: 18,
  },
  warningFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: tokens.space.sm,
    paddingTop: tokens.space.sm,
  },
  warningDate: {
    fontSize: tokens.type.sub.fontSize,
    color: tokens.colors.text.secondary,
  },
  resolveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.xs,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    backgroundColor: tokens.colors.semantic.success,
    borderRadius: tokens.radius.md,
  },
  resolveButtonText: {
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: '#fff',
  },
  resolvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.xs,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    backgroundColor: tokens.colors.semantic.successSoft,
    borderRadius: tokens.radius.md,
  },
  resolvedBadgeText: {
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.semantic.success,
  },
  emptyCard: {
    marginTop: tokens.space.xl,
  },
});
