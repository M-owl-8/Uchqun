import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import tokens from '../../styles/tokens';

const TYPE_ICONS = {
  activity: 'checkmark-circle',
  meal: 'restaurant',
  media: 'images',
  notification: 'notifications',
};

const TYPE_COLORS = {
  activity: tokens.colors.semantic.success,
  meal: tokens.colors.semantic.warning,
  media: tokens.colors.accent.blue,
  notification: tokens.colors.semantic.info,
};

export function ActivityFeedItem({
  type = 'activity',
  title,
  timestamp,
  onPress,
}) {
  const { t } = useTranslation();
  const icon = TYPE_ICONS[type] || 'ellipse';
  const color = TYPE_COLORS[type] || tokens.colors.text.muted;

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('time.justNow', { defaultValue: 'Just now' });
    if (diffMins < 60) return t('time.minutesAgo', { count: diffMins, defaultValue: `${diffMins} minutes ago` });
    if (diffHours < 24) return t('time.hoursAgo', { count: diffHours, defaultValue: `${diffHours} hours ago` });
    if (diffDays < 7) return t('time.daysAgo', { count: diffDays, defaultValue: `${diffDays} days ago` });
    return date.toLocaleDateString();
  };

  const content = (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {timestamp && (
          <Text style={styles.timestamp}>{formatTimestamp(timestamp)}</Text>
        )}
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={tokens.colors.text.muted}
      />
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${type}: ${title}`}
        style={({ pressed }) => [
          pressed && styles.pressed
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.space.md,
    paddingHorizontal: tokens.space.lg,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border.light,
  },
  pressed: {
    backgroundColor: tokens.colors.background.tertiary,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.space.md,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: tokens.typography.fontSize.base,
    fontWeight: tokens.typography.fontWeight.medium,
    color: tokens.colors.text.primary,
    marginBottom: 2,
  },
  timestamp: {
    fontSize: tokens.typography.fontSize.xs,
    color: tokens.colors.text.secondary,
  },
});
