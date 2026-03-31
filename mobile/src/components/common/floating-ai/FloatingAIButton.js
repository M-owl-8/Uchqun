import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tokens from '../../../styles/tokens';

export default function FloatingAIButton({ onPress }) {
  return (
    <View style={styles.fabContainer}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        accessibilityRole="button"
        accessibilityLabel="AI Assistant"
        accessibilityHint="Open AI chat assistant"
      >
        <Ionicons name="sparkles" size={24} color="#FFFFFF" />
      </Pressable>
    </View>
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
