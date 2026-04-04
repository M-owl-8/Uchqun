import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, Pressable, Linking, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import tokens from '../../styles/tokens';

export function MusiqaScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get('/resources', { params: { type: 'music' } });
      setItems(res?.data?.data || []);
    } catch {
      setError("Ma'lumotlarni yuklashda xatolik");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const openUrl = (url) => {
    if (url) Linking.openURL(url).catch(() => {});
  };

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Musiqa" showBack />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          error ? (
            <View style={styles.center}>
              <Ionicons name="alert-circle-outline" size={40} color={tokens.colors.semantic.error} />
              <Text style={styles.errorText}>{error}</Text>
              <Pressable onPress={() => { setLoading(true); load(); }} style={styles.retryBtn}>
                <Text style={styles.retryText}>Qayta urinish</Text>
              </Pressable>
            </View>
          ) : (
            <EmptyState emoji="🎵" title="Musiqalar yo'q" description="O'qituvchi hali musiqa qo'shmagan" />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => openUrl(item.url)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.iconWrap}>
              <Ionicons name="musical-notes" size={26} color="#2E3A59" />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              {item.description ? (
                <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
              ) : null}
              {item.teacher && (
                <Text style={styles.cardTeacher}>
                  {item.teacher.firstName} {item.teacher.lastName}
                </Text>
              )}
            </View>
            {item.url ? (
              <Ionicons name="open-outline" size={18} color="#8A97B0" />
            ) : null}
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.colors.background.primary },
  list: { padding: tokens.space.xl, gap: tokens.space.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: tokens.radius.xl,
    padding: tokens.space.md,
    gap: tokens.space.md,
    ...tokens.shadow.sm,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: tokens.radius.md,
    backgroundColor: '#BFD7EA44',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#2E3A59', marginBottom: 2 },
  cardDesc: { fontSize: 13, color: '#5A6B8C', lineHeight: 18 },
  cardTeacher: { fontSize: 12, color: '#8A97B0', marginTop: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: tokens.space.xl },
  errorText: { fontSize: 14, color: tokens.colors.text.secondary, textAlign: 'center', marginTop: tokens.space.md },
  retryBtn: {
    marginTop: tokens.space.lg,
    backgroundColor: tokens.colors.accent.blue,
    paddingHorizontal: tokens.space.xl,
    paddingVertical: tokens.space.md,
    borderRadius: tokens.radius.pill,
  },
  retryText: { color: '#fff', fontWeight: '600' },
});
