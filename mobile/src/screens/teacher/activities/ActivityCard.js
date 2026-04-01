import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../../../components/teacher/GlassCard';
import { useTranslation } from 'react-i18next';
import tokens from '../../../styles/tokens';

export default function ActivityCard({ activity, onViewDetails, onEdit, onDelete }) {
  const { t } = useTranslation();

  return (
    <GlassCard style={styles.card}>
      <View style={styles.activityHeader}>
        <View style={styles.activityIconContainer}>
          <Ionicons name="clipboard" size={24} color={tokens.colors.semantic.success} />
        </View>
        <View style={styles.activityContent}>
          <Text style={styles.title}>{activity.skill || activity.title || 'Activity'}</Text>
          {activity.startDate && (
            <View style={styles.dateContainer}>
              <Ionicons name="calendar-outline" size={14} color={tokens.colors.text.secondary} />
              <Text style={styles.date}>
                {new Date(activity.startDate).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </View>
      {activity.goal && <Text style={styles.goal} numberOfLines={2}>{activity.goal}</Text>}
      {activity.services && Array.isArray(activity.services) && activity.services.length > 0 && (
        <View style={styles.servicesContainer}>
          {activity.services.slice(0, 3).map((service, idx) => (
            <View key={idx} style={styles.serviceTag}>
              <Text style={styles.serviceText}>{service}</Text>
            </View>
          ))}
          {activity.services.length > 3 && (
            <View style={styles.serviceTag}>
              <Text style={styles.serviceText}>+{activity.services.length - 3}</Text>
            </View>
          )}
        </View>
      )}
      <View style={styles.actions}>
        <Pressable style={styles.detailButton} onPress={() => onViewDetails(activity)}>
          <Ionicons name="eye-outline" size={18} color={tokens.colors.semantic.success} />
          <Text style={styles.detailButtonText}>{t('common.details', { defaultValue: 'Details' })}</Text>
        </Pressable>
        <Pressable style={styles.editButton} onPress={() => onEdit(activity)}>
          <Ionicons name="pencil" size={18} color={tokens.colors.accent.blue} />
          <Text style={styles.editButtonText}>{t('common.edit', { defaultValue: 'Edit' })}</Text>
        </Pressable>
        <Pressable style={styles.deleteButton} onPress={() => onDelete(activity.id)}>
          <Ionicons name="trash-outline" size={18} color={tokens.colors.semantic.error} />
          <Text style={styles.deleteButtonText}>{t('common.delete', { defaultValue: 'Delete' })}</Text>
        </Pressable>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: tokens.space.md,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: tokens.space.sm,
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tokens.colors.semantic.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.space.md,
  },
  activityContent: {
    flex: 1,
  },
  title: {
    fontSize: tokens.type.bodyLarge.fontSize,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.text.primary,
    marginBottom: tokens.space.xs,
  },
  goal: {
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.secondary,
    marginTop: tokens.space.sm,
    lineHeight: 20,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: tokens.space.xs / 2,
  },
  date: {
    fontSize: tokens.type.sub.fontSize,
    color: tokens.colors.text.secondary,
    marginLeft: tokens.space.xs / 2,
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: tokens.space.sm,
    gap: tokens.space.xs,
  },
  serviceTag: {
    backgroundColor: tokens.colors.accent[50],
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.xs / 2,
    borderRadius: tokens.radius.sm,
  },
  serviceText: {
    fontSize: tokens.type.caption.fontSize,
    color: tokens.colors.accent.blue,
    fontWeight: tokens.typography.fontWeight.medium,
  },
  actions: {
    flexDirection: 'row',
    marginTop: tokens.space.md,
    paddingTop: tokens.space.md,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border.light,
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: tokens.space.md,
    paddingVertical: tokens.space.xs,
    paddingHorizontal: tokens.space.sm,
  },
  detailButtonText: {
    color: tokens.colors.semantic.success,
    marginLeft: tokens.space.xs,
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.typography.fontWeight.medium,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: tokens.space.md,
    paddingVertical: tokens.space.xs,
    paddingHorizontal: tokens.space.sm,
  },
  editButtonText: {
    color: tokens.colors.accent.blue,
    marginLeft: tokens.space.xs,
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.typography.fontWeight.medium,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.space.xs,
    paddingHorizontal: tokens.space.sm,
  },
  deleteButtonText: {
    color: tokens.colors.semantic.error,
    marginLeft: tokens.space.xs,
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.typography.fontWeight.medium,
  },
});
