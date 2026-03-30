import React, { useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  Animated,
  Image,
} from 'react-native';
import { useThemeTokens } from '../../../hooks/useThemeTokens';

export default function FloatingAIButton({ onPress }) {
  const tokens = useThemeTokens();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const styles = getStyles(tokens);

  return (
    <Animated.View style={[styles.fabContainer, { transform: [{ scale: pulseAnim }] }]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.fabPressable,
          pressed && { transform: [{ scale: 0.95 }] },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Uchi AI Assistant"
        accessibilityHint="Open AI chat assistant"
      >
        <View style={styles.fab}>
          <Image
            source={require('../../../../assets/Uchqun logo.png')}
            style={styles.fabIcon}
            resizeMode="contain"
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const getStyles = (tokens) => StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: 90,
    right: 18,
    zIndex: 1000,
  },
  fabPressable: {
    position: 'relative',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colors.background.secondary,
    ...tokens.shadow.card,
  },
  fabIcon: {
    width: 28,
    height: 28,
    tintColor: tokens.colors.accent.blue,
  },
});
