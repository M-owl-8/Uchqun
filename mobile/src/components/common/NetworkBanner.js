import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

let NetInfo = null;
try {
  NetInfo = require('@react-native-community/netinfo').default;
} catch {}

export function NetworkBanner() {
  const { t } = useTranslation();
  const [isConnected, setIsConnected] = useState(true);
  const [wasDisconnected, setWasDisconnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [showBanner, setShowBanner] = useState(false);
  const insets = useSafeAreaInsets();

  // Periodically check pending offline actions count while offline
  useEffect(() => {
    const checkPendingCount = async () => {
      try {
        const { offlineQueue } = await import('../../services/offlineQueue');
        const queue = await offlineQueue.getAll();
        setPendingCount(queue.length);
      } catch {
        setPendingCount(0);
      }
    };

    if (!isConnected) {
      checkPendingCount();
      const interval = setInterval(checkPendingCount, 5000);
      return () => clearInterval(interval);
    }
  }, [isConnected]);

  useEffect(() => {
    if (!NetInfo) return;
    const unsubscribe = NetInfo.addEventListener(state => {
      const connected = state.isConnected !== false;
      if (!connected) {
        setIsConnected(false);
        setWasDisconnected(true);
        setShowBanner(true);
      } else if (wasDisconnected) {
        setIsConnected(true);
        setSyncing(true);
        setShowBanner(true);
        // Replay offline queue
        (async () => {
          try {
            const { api } = await import('../../services/api');
            const { offlineQueue } = await import('../../services/offlineQueue');
            await offlineQueue.replay(api);
            setPendingCount(0);
          } catch {}
          setTimeout(() => {
            setSyncing(false);
            setWasDisconnected(false);
            setShowBanner(false);
          }, 2500);
        })();
      }
    });
    return () => unsubscribe();
  }, [wasDisconnected]);

  if (!showBanner) return null;

  const bgColor = isConnected ? '#4CAF50' : '#F44336';
  const icon = isConnected ? 'wifi' : 'cloud-offline';

  let message;
  if (isConnected) {
    message = syncing
      ? t('network.backOnlineSyncing', { defaultValue: 'Back online. Syncing...' })
      : t('network.backOnline', { defaultValue: 'Back online' });
  } else {
    message = t('network.offline', { defaultValue: "You're offline. Changes will sync when reconnected." });
  }

  return (
    <View style={[styles.container, { top: insets.top, backgroundColor: bgColor }]} accessibilityRole="alert" accessibilityLiveRegion="polite" accessibilityLabel={message}>
      <View style={styles.row}>
        <Ionicons name={icon} size={18} color="#fff" />
        <Text style={styles.text}>{message}</Text>
      </View>
      {!isConnected && pendingCount > 0 && (
        <View style={styles.pendingRow}>
          <Ionicons name="hourglass-outline" size={14} color="#fff" />
          <Text style={styles.pendingText}>
            {t('network.pendingActions', { count: pendingCount, defaultValue: '{{count}} pending action(s)' })}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', left: 0, right: 0, zIndex: 9998,
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  text: { color: '#fff', fontSize: 13, fontWeight: '600' },
  pendingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    marginTop: 2,
  },
  pendingText: { color: '#fff', fontSize: 11, fontWeight: '500', opacity: 0.9 },
});
