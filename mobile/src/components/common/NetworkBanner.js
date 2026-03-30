import React, { useEffect, useState, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

let NetInfo = null;
try {
  NetInfo = require('@react-native-community/netinfo').default;
} catch {}

export function NetworkBanner() {
  const [isConnected, setIsConnected] = useState(true);
  const [wasDisconnected, setWasDisconnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const slideAnim = useRef(new Animated.Value(-60)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!NetInfo) return;
    const unsubscribe = NetInfo.addEventListener(state => {
      const connected = state.isConnected !== false;
      if (!connected) {
        setIsConnected(false);
        setWasDisconnected(true);
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      } else if (wasDisconnected) {
        setIsConnected(true);
        setSyncing(true);
        // Replay offline queue
        (async () => {
          try {
            const { api } = await import('../../services/api');
            const { offlineQueue } = await import('../../services/offlineQueue');
            await offlineQueue.replay(api);
          } catch {}
          setTimeout(() => {
            setSyncing(false);
            setWasDisconnected(false);
            Animated.timing(slideAnim, { toValue: -60, duration: 300, useNativeDriver: true }).start();
          }, 2000);
        })();
      }
    });
    return () => unsubscribe();
  }, [wasDisconnected]);

  if (isConnected && !wasDisconnected) return null;

  const bgColor = isConnected ? '#4CAF50' : '#F44336';
  const message = isConnected
    ? (syncing ? 'Back online — syncing...' : 'Back online')
    : 'No internet connection';
  const icon = isConnected ? 'wifi' : 'cloud-offline';

  return (
    <Animated.View style={[styles.container, { top: insets.top, backgroundColor: bgColor, transform: [{ translateY: slideAnim }] }]} accessibilityRole="alert" accessibilityLiveRegion="polite" accessibilityLabel={message}>
      <Ionicons name={icon} size={18} color="#fff" />
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', left: 0, right: 0, zIndex: 9998,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, paddingHorizontal: 16, gap: 8,
  },
  text: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
