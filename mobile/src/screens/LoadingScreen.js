import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';

export function LoadingScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#667EEA', '#764BA2', '#F093FB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Static sparkles */}
      <View style={styles.sparkleContainer}>
        <Text style={[styles.sparkle, styles.sparkle1]}>✨</Text>
        <Text style={[styles.sparkle, styles.sparkle2]}>⭐</Text>
        <Text style={[styles.sparkle, styles.sparkle3]}>💫</Text>
        <Text style={[styles.sparkle, styles.sparkle4]}>🌟</Text>
      </View>

      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🌟</Text>
          </View>
        </View>

        {/* App name */}
        <Text style={styles.appName}>Uchqun</Text>
        <Text style={styles.tagline}>{t('loading.tagline', { defaultValue: 'O\'qishni qiziqarli qilamiz ✨' })}</Text>

        {/* Static dots */}
        <View style={styles.dotsContainer}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        <Text style={styles.loadingText}>{t('loading.message', { defaultValue: 'Yuklanmoqda...' })}</Text>
      </View>

      {/* Bottom decoration */}
      <View style={styles.bottomDecoration}>
        <Svg width="100%" height="120" viewBox="0 0 400 120" preserveAspectRatio="none">
          <Path
            d="M0 60 Q100 0 200 60 Q300 120 400 60 L400 120 L0 120 Z"
            fill="rgba(255, 255, 255, 0.1)"
          />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkleContainer: {
    position: 'absolute',
    width: 300,
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkle: {
    position: 'absolute',
    fontSize: 24,
  },
  sparkle1: { top: 0, left: '50%', marginLeft: -12 },
  sparkle2: { bottom: 0, left: '50%', marginLeft: -12 },
  sparkle3: { left: 0, top: '50%', marginTop: -12 },
  sparkle4: { right: 0, top: '50%', marginTop: -12 },
  content: {
    alignItems: 'center',
    zIndex: 1,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  logoEmoji: {
    fontSize: 56,
  },
  appName: {
    fontSize: 42,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -1,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    fontSize: 18,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 40,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    opacity: 0.7,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  bottomDecoration: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});
