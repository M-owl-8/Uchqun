import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notificationService } from '../../services/notificationService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import Card from '../../components/common/Card';
import tokens from '../../styles/tokens';
import logger from '../../utils/logger';

const NOTIFICATION_TYPE_COLORS = {
  info: tokens.colors.semantic.info,
  success: tokens.colors.semantic.success,
  warning: tokens.colors.semantic.warning,
  error: tokens.colors.semantic.error,
  default: tokens.colors.accent.blue,
};

function getAccentColor(item) {
  return NOTIFICATION_TYPE_COLORS[item.type] || NOTIFICATION_TYPE_COLORS.default;
}

export function NotificationsScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');

  // Bottom nav height + safe area + padding
  const BOTTOM_NAV_HEIGHT = 75;
  const bottomPadding = BOTTOM_NAV_HEIGHT + insets.bottom + 16;

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await notificationService.getNotifications();
      setNotifications(Array.isArray(result?.data) ? result.data : (Array.isArray(result) ? result : []));
    } catch (err) {
      logger.error('Error loading notifications:', err);
      setError(t('common.loadError', { defaultValue: 'Failed to load data' }));
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      loadNotifications();
    } catch (error) {
      logger.error('Error marking notification as read:', error);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('notifications.justNow', { defaultValue: 'Just now' });
    if (diffMins < 60) return t('notifications.minutesAgo', { defaultValue: '{{count}}m ago', count: diffMins });
    if (diffHours < 24) return t('notifications.hoursAgo', { defaultValue: '{{count}}h ago', count: diffHours });
    if (diffDays < 7) return t('notifications.daysAgo', { defaultValue: '{{count}}d ago', count: diffDays });
    return date.toLocaleDateString();
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'read') return n.isRead;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const readCount = notifications.filter((n) => n.isRead).length;

  const filters = [
    { key: 'all', label: t('notifications.all', { defaultValue: 'All' }), count: notifications.length },
    { key: 'unread', label: t('notifications.unread', { defaultValue: 'Unread' }), count: unreadCount },
    { key: 'read', label: t('notifications.read', { defaultValue: 'Read' }), count: readCount },
  ];

  const renderNotification = ({ item }) => {
    const accentColor = getAccentColor(item);

    return (
      <Pressable onPress={() => markAsRead(item.id)}>
        <Card
          style={[
            styles.card,
            { borderLeftWidth: 4, borderLeftColor: accentColor },
            !item.isRead && styles.unreadCard,
          ]}
          padding={tokens.space.lg}
        >
          <View style={styles.cardRow}>
            <View style={[styles.iconCircle, { backgroundColor: accentColor + '15' }]}>
              <Ionicons
                name={item.isRead ? 'notifications-outline' : 'notifications'}
                size={20}
                color={accentColor}
              />
            </View>
            <View style={styles.contentContainer}>
              <View style={styles.titleRow}>
                <Text style={[styles.title, !item.isRead && styles.unreadTitle]} numberOfLines={1}>
                  {item.title || t('notifications.notification', { defaultValue: 'Notification' })}
                </Text>
                {!item.isRead && <View style={styles.unreadDot} />}
              </View>
              {item.message ? (
                <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
              ) : null}
              <Text style={styles.time}>{formatTimestamp(item.createdAt)}</Text>
            </View>
          </View>
        </Card>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader title={t('notifications.title', { defaultValue: 'Notifications' })} showBack />
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title={t('notifications.title', { defaultValue: 'Notifications' })} showBack />

      {error && !loading ? (
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Ionicons name="alert-circle-outline" size={48} color={tokens.colors.semantic.error} />
          <Text style={{ color: tokens.colors.text.secondary, marginTop: 12, textAlign: 'center' }}>{error}</Text>
          <Pressable onPress={() => loadNotifications()} accessibilityRole="button"
            style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: tokens.colors.accent.blue, borderRadius: tokens.radius.md }}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>{t('common.retry', { defaultValue: 'Retry' })}</Text>
          </Pressable>
        </View>
      ) : notifications.length === 0 ? (
        <EmptyState icon="notifications-outline" message={t('notifications.noNotifications', { defaultValue: 'No notifications' })} />
      ) : (
        <FlatList
          data={filteredNotifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPadding }]}
          refreshing={loading}
          onRefresh={loadNotifications}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.filterRow}>
              {filters.map((f) => (
                <Pressable
                  key={f.key}
                  style={[
                    styles.filterPill,
                    filter === f.key && styles.filterPillActive,
                  ]}
                  onPress={() => setFilter(f.key)}
                  accessibilityRole="button"
                  accessibilityLabel={`${f.label} (${f.count})`}
                  accessibilityState={{ selected: filter === f.key }}
                >
                  <Text style={[styles.filterLabel, filter === f.key && styles.filterLabelActive]}>
                    {f.label}
                  </Text>
                  <View style={[styles.filterCount, filter === f.key && styles.filterCountActive]}>
                    <Text style={[styles.filterCountText, filter === f.key && styles.filterCountTextActive]}>
                      {f.count}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          }
          ListEmptyComponent={
            <Card style={styles.emptyCard}>
              <EmptyState
                icon="notifications-outline"
                title={filter !== 'all'
                  ? t('notifications.noFiltered', { defaultValue: `No ${filter} notifications` })
                  : t('notifications.noNotifications', { defaultValue: 'No notifications' })}
                description={filter !== 'all'
                  ? t('notifications.tryDifferentFilter', { defaultValue: 'Try a different filter' })
                  : t('notifications.allCaughtUp', { defaultValue: "You're all caught up!" })}
              />
            </Card>
          }
          ItemSeparatorComponent={() => <View style={{ height: tokens.space.md }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background.primary,
  },
  list: {
    padding: tokens.space.lg,
  },
  filterRow: {
    flexDirection: 'row',
    gap: tokens.space.sm,
    marginBottom: tokens.space.lg,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
    borderRadius: tokens.radius.pill,
    gap: tokens.space.xs,
    ...tokens.shadow.soft,
  },
  filterPillActive: {
    backgroundColor: tokens.colors.accent.blue,
    borderColor: tokens.colors.accent.blue,
  },
  filterLabel: {
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.accent.blue,
  },
  filterLabelActive: {
    color: tokens.colors.text.white,
  },
  filterCount: {
    backgroundColor: 'rgba(46,58,89,0.08)',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  filterCountActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  filterCountText: {
    fontSize: tokens.type.caption.fontSize,
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.accent.blue,
  },
  filterCountTextActive: {
    color: tokens.colors.text.white,
  },
  card: {
    marginBottom: 0,
  },
  unreadCard: {
    backgroundColor: tokens.colors.accent[50],
  },
  emptyCard: {
    marginTop: tokens.space.xl,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.space.md,
  },
  contentContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: tokens.type.body.fontSize,
    fontWeight: tokens.typography.fontWeight.medium,
    color: tokens.colors.text.primary,
    flex: 1,
  },
  unreadTitle: {
    fontWeight: tokens.typography.fontWeight.bold,
  },
  message: {
    fontSize: tokens.type.sub.fontSize,
    color: tokens.colors.text.secondary,
    marginTop: 4,
  },
  time: {
    fontSize: tokens.type.caption.fontSize,
    color: tokens.colors.text.tertiary,
    marginTop: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tokens.colors.nav.indicator,
    marginLeft: tokens.space.sm,
  },
});
