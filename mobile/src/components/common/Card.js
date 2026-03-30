import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import tokens from '../../styles/tokens';

/**
 * Card — Authoritative glass card component.
 *
 * Matches the Figma GlassCard spec:
 *   bg: rgba(255,255,255,0.7)  border: rgba(255,255,255,0.3)
 *   radius: 16  shadow: glass  padding: 20  press: scale(0.98)
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
export function GlassCard(props) {
  return <Card {...props} />;
}

export function ElevatedCard(props) {
  return <Card {...props} />;
}

export function GradientCard({ gradientColors, ...props }) {
  return <Card gradient={gradientColors} {...props} />;
}

export function FlatCard(props) {
  return <Card {...props} />;
}

export function HighlightCard({ gradientColors, ...props }) {
  return <Card gradient={gradientColors} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.glass.bg,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.glass.border,
    ...tokens.shadow.glass,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
});
