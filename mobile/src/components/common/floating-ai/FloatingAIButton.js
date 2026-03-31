import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tokens from '../../../styles/tokens';

export default function FloatingAIButton({ onPress }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.View style={[styles.fabContainer, { transform: [{ scale: pulseAnim }] }]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        accessibilityRole="button"
        accessibilityLabel="AI Assistant"
        accessibilityHint="Open AI chat assistant"
      >
        <Ionicons name="sparkles" size={24} color="#FFFFFF" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 1000,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colors.accent.blue,
    ...tokens.shadow.elevated,
  },
  fabPressed: {
    transform: [{ scale: 0.93 }],
    opacity: 0.9,
  },
});
