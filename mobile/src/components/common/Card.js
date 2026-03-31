import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import tokens from '../../styles/tokens';

/**
 * Card — primary card component for the design system.
 *
 * Solid white background with warm navy-tinted shadow.
 * No border (borders look gray on Android against warm sand bg).
 *
 * Props:
 *   children, style, onPress, gradient (color[]), padding (number override)
 */
export default function Card({ children, style, onPress, gradient, padding }) {
  const paddingValue = padding !== undefined ? padding : tokens.space.xl;

  const cardContent = gradient ? (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, { padding: paddingValue }, style]}
    >
      {children}
    </LinearGradient>
  ) : (
    <View style={[styles.card, { padding: paddingValue }, style]}>
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        {cardContent}
      </Pressable>
    );
  }

  return cardContent;
}

// Named re-exports for backward compatibility
export function GlassCard(props) { return <Card {...props} />; }
export function ElevatedCard(props) { return <Card {...props} />; }
export function GradientCard({ gradientColors, ...props }) { return <Card gradient={gradientColors} {...props} />; }
export function FlatCard(props) { return <Card {...props} />; }
export function HighlightCard({ gradientColors, ...props }) { return <Card gradient={gradientColors} {...props} />; }

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: tokens.radius.lg,
    shadowColor: '#2E3A59',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
});
