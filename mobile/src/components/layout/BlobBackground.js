import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Design System Colors
const COLORS = {
  softNavy: '#2E3A59',
  powderBlue: '#BFD7EA',
  warmSand: '#F4EDE2',
  blushPeach: '#FADADD',
  mintMist: '#E8F8F5',
  honeyGold: '#F4D03F',
};

/**
 * BlobBackground - Static blob-based background with glassmorphism
 *
 * Features:
 * - 7 static decorative blobs
 * - Soft gradient base layer
 * - Glassmorphism-ready overlay system
 *
 * Usage:
 * <BlobBackground>
 *   <YourContent />
 * </BlobBackground>
 */
export function BlobBackground({ children }) {
  return (
    <View style={styles.container}>
      {/* Base Gradient Background */}
      <LinearGradient
        colors={[COLORS.warmSand, COLORS.mintMist, COLORS.powderBlue]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Static Blobs Layer */}
      <View style={StyleSheet.absoluteFillObject}>
        {/* Blob 1 - Top Left - Soft Navy */}
        <View
          style={[
            styles.blob,
            {
              width: 280,
              height: 280,
              top: SCREEN_HEIGHT * 0.05,
              left: -80,
              backgroundColor: COLORS.softNavy,
              opacity: 0.08,
            },
          ]}
        />

        {/* Blob 2 - Top Right - Powder Blue */}
        <View
          style={[
            styles.blob,
            {
              width: 240,
              height: 240,
              top: SCREEN_HEIGHT * 0.08,
              right: -60,
              backgroundColor: COLORS.powderBlue,
              opacity: 0.12,
            },
          ]}
        />

        {/* Blob 3 - Middle Left - Blush Peach */}
        <View
          style={[
            styles.blob,
            {
              width: 200,
              height: 200,
              top: SCREEN_HEIGHT * 0.3,
              left: -50,
              backgroundColor: COLORS.blushPeach,
              opacity: 0.15,
            },
          ]}
        />

        {/* Blob 4 - Center - Mint Mist */}
        <View
          style={[
            styles.blob,
            {
              width: 320,
              height: 320,
              top: SCREEN_HEIGHT * 0.35,
              left: SCREEN_WIDTH * 0.3,
              backgroundColor: COLORS.mintMist,
              opacity: 0.1,
            },
          ]}
        />

        {/* Blob 5 - Middle Right - Honey Gold */}
        <View
          style={[
            styles.blob,
            {
              width: 220,
              height: 220,
              top: SCREEN_HEIGHT * 0.5,
              right: -70,
              backgroundColor: COLORS.honeyGold,
              opacity: 0.09,
            },
          ]}
        />

        {/* Blob 6 - Bottom Left - Powder Blue */}
        <View
          style={[
            styles.blob,
            {
              width: 260,
              height: 260,
              bottom: SCREEN_HEIGHT * 0.15,
              left: -90,
              backgroundColor: COLORS.powderBlue,
              opacity: 0.11,
            },
          ]}
        />

        {/* Blob 7 - Bottom Right - Soft Navy */}
        <View
          style={[
            styles.blob,
            {
              width: 300,
              height: 300,
              bottom: -100,
              right: -80,
              backgroundColor: COLORS.softNavy,
              opacity: 0.07,
            },
          ]}
        />
      </View>

      {/* Content Layer */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.warmSand,
  },
  blob: {
    position: 'absolute',
    borderRadius: 9999, // Perfect circle
  },
  content: {
    flex: 1,
    zIndex: 10,
  },
});
