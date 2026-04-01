import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Modal,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tokens from '../../../styles/tokens';
import { buildServicesList } from './constants';
import { useTranslation } from 'react-i18next';

export default function ActivityDetailModal({ visible, activity, onClose }) {
  const { t } = useTranslation();
  const SERVICES_LIST = buildServicesList(t);

  if (!activity) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={2}>
              {activity.skill || activity.title || t('activityDetail.activity')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={tokens.colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.detailsScrollView} showsVerticalScrollIndicator={true}>
            {/* Goal */}
            {activity.goal ? (
              <View style={styles.detailSection}>
                <View style={styles.detailGoalCard}>
                  <View style={styles.detailSectionHeader}>
                    <Ionicons name="flag" size={18} color={tokens.colors.accent.blue} />
                    <Text style={styles.detailSectionTitle}>{t('activityDetail.goal')}</Text>
                  </View>
                  <Text style={styles.detailGoalText}>{activity.goal}</Text>
                </View>
              </View>
            ) : null}

            {/* Dates */}
            {(activity.startDate || activity.endDate) ? (
              <View style={styles.detailSection}>
                <View style={styles.detailSectionHeader}>
                  <Ionicons name="calendar" size={18} color={tokens.colors.semantic.success} />
                  <Text style={styles.detailSectionTitle}>{t('activityDetail.dates')}</Text>
                </View>
                <View style={styles.detailDatesRow}>
                  {activity.startDate ? (
                    <View style={styles.detailDateCard}>
                      <Ionicons name="calendar-outline" size={16} color={tokens.colors.accent.blue} />
                      <View>
                        <Text style={styles.detailDateLabel}>{t('activityDetail.startDate')}</Text>
                        <Text style={styles.detailDateValue}>{new Date(activity.startDate).toLocaleDateString()}</Text>
                      </View>
                    </View>
                  ) : null}
                  {activity.endDate ? (
                    <View style={styles.detailDateCard}>
                      <Ionicons name="calendar-outline" size={16} color={tokens.colors.semantic.error} />
                      <View>
                        <Text style={styles.detailDateLabel}>{t('activityDetail.endDate')}</Text>
                        <Text style={styles.detailDateValue}>{new Date(activity.endDate).toLocaleDateString()}</Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}

            {/* Teacher */}
            {activity.teacher ? (
              <View style={styles.detailSection}>
                <View style={styles.detailSectionHeader}>
                  <Ionicons name="person" size={18} color={tokens.colors.semantic.success} />
                  <Text style={styles.detailSectionTitle}>{t('activityDetail.teacher')}</Text>
                </View>
                <Text style={styles.detailText}>{activity.teacher}</Text>
              </View>
            ) : null}

            {/* Tasks */}
            {activity.tasks && Array.isArray(activity.tasks) && activity.tasks.filter(v => v).length > 0 ? (
              <View style={styles.detailSection}>
                <View style={styles.detailSectionHeader}>
                  <Ionicons name="checkmark-circle" size={18} color={tokens.colors.semantic.success} />
                  <Text style={styles.detailSectionTitle}>{t('activityDetail.tasks')}</Text>
                </View>
                {activity.tasks.filter(v => v).map((task, idx) => (
                  <View key={idx} style={styles.detailTaskItem}>
                    <View style={styles.detailTaskBullet} />
                    <Text style={styles.detailText}>{task}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Methods */}
            {activity.methods ? (
              <View style={styles.detailSection}>
                <View style={styles.detailSectionHeader}>
                  <Ionicons name="bulb" size={18} color={tokens.colors.semantic.success} />
                  <Text style={styles.detailSectionTitle}>{t('activityDetail.methods')}</Text>
                </View>
                <Text style={styles.detailText}>{activity.methods}</Text>
              </View>
            ) : null}

            {/* Progress */}
            {activity.progress ? (
              <View style={styles.detailSection}>
                <View style={styles.detailSectionHeader}>
                  <Ionicons name="trending-up" size={18} color={tokens.colors.semantic.success} />
                  <Text style={styles.detailSectionTitle}>{t('activityDetail.progress')}</Text>
                </View>
                <Text style={styles.detailText}>{activity.progress}</Text>
              </View>
            ) : null}

            {/* Observation */}
            {activity.observation ? (
              <View style={styles.detailSection}>
                <View style={styles.detailSectionHeader}>
                  <Ionicons name="eye" size={18} color={tokens.colors.semantic.success} />
                  <Text style={styles.detailSectionTitle}>{t('activityDetail.observation')}</Text>
                </View>
                <Text style={styles.detailText}>{activity.observation}</Text>
              </View>
            ) : null}

            {/* Services */}
            {activity.services && Array.isArray(activity.services) && activity.services.length > 0 ? (
              <View style={styles.detailSection}>
                <View style={styles.detailSectionHeader}>
                  <Ionicons name="medkit" size={18} color={tokens.colors.semantic.success} />
                  <Text style={styles.detailSectionTitle}>{t('activityDetail.services')}</Text>
                </View>
                <View style={styles.detailServicesWrap}>
                  {activity.services.map((serviceKey, idx) => {
                    const service = SERVICES_LIST.find(s => s.key === serviceKey);
                    return (
                      <View key={idx} style={styles.detailServiceBadge}>
                        <Text style={styles.detailServiceText}>{service?.label || serviceKey}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.detailsFooter}>
            <Pressable style={styles.detailsCloseButton} onPress={onClose}>
              <Text style={styles.detailsCloseButtonText}>{t('activityDetail.close')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    fontSize: tokens.type.h3.fontSize,
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.text.primary,
  },
  detailsScrollView: {
    maxHeight: 500,
    paddingHorizontal: tokens.space.lg,
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
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailGoalCard: {
    backgroundColor: tokens.colors.accent[50],
    borderRadius: tokens.radius.sm,
    padding: tokens.space.md,
    borderLeftWidth: 3,
    borderLeftColor: tokens.colors.accent.blue,
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
    backgroundColor: tokens.colors.surface.secondary,
    borderRadius: tokens.radius.sm,
    padding: tokens.space.md,
    gap: tokens.space.sm,
  },
  detailDateLabel: {
    fontSize: tokens.type.caption.fontSize,
    color: tokens.colors.text.secondary,
  },
  detailDateValue: {
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.typography.fontWeight.semibold,
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
    backgroundColor: tokens.colors.accent[50],
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.xs / 2,
    borderRadius: tokens.radius.sm,
  },
  detailServiceText: {
    fontSize: tokens.type.caption.fontSize,
    color: tokens.colors.accent.blue,
    fontWeight: tokens.typography.fontWeight.medium,
  },
  detailsFooter: {
    padding: tokens.space.lg,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border.light,
  },
  detailsCloseButton: {
    paddingVertical: tokens.space.md,
    alignItems: 'center',
    borderRadius: tokens.radius.sm,
    backgroundColor: tokens.colors.semantic.success,
  },
  detailsCloseButtonText: {
    color: tokens.colors.text.white,
    fontSize: tokens.type.body.fontSize,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
});
