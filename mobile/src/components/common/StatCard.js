import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tokens from '../../styles/tokens';
import { ProgressBar } from './ProgressBar';

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  progress,
  onPress,
  color = tokens.colors.accent.blue,
}) {
  const content = (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <View style={styles.content}>
          <Text style={styles.value}>{value}</Text>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>
      {progress !== undefined && (
        <View style={styles.progressContainer}>
          <ProgressBar
            value={progress}
            max={100}
            color={color}
            showLabel={false}
          />
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${value}`}
        style={({ pressed }) => [
          styles.pressable,
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
    backgroundColor: tokens.colors.background.tertiary,
    borderRadius: tokens.radius.md,
    padding: tokens.space.lg,
    ...tokens.shadow.sm,
  },
  pressable: {
    borderRadius: tokens.radius.md,
  },
  pressed: {
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.space.md,
  },
  content: {
    flex: 1,
  },
  value: {
    fontSize: tokens.typography.fontSize['2xl'],
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.text.primary,
  },
  title: {
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.medium,
    color: tokens.colors.text.secondary,
    marginTop: tokens.space.xs,
  },
  subtitle: {
    fontSize: tokens.typography.fontSize.xs,
    color: tokens.colors.text.muted,
    marginTop: tokens.space.xs,
  },
  progressContainer: {
    marginTop: tokens.space.md,
  },
});
