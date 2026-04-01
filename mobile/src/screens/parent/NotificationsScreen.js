import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Pressable, FlatList, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { notificationService } from '../../services/notificationService';
import tokens from '../../styles/tokens';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import Card from '../../components/common/Card';
import Skeleton from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import ListRow from '../../components/common/ListRow';
import { useTranslation } from 'react-i18next';

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

// Static notification card component
function NotificationCard({ item, index, markAsRead, onDelete, t }) {
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('notifications.justNow');
    if (diffMins < 60) return t('notifications.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('notifications.hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('notifications.daysAgo', { count: diffDays });
    return date.toLocaleDateString();
  };

  const accentColor = getAccentColor(item);

  return (
    <View>
      <Card
        style={[
          styles.card,
          { borderLeftWidth: 4, borderLeftColor: accentColor },
          !item.isRead && styles.unreadCard,
        ]}
        padding={tokens.space.lg}
      >
        <Pressable
          onPress={() => markAsRead(item.id)}
          accessibilityRole="button"
          accessibilityLabel={`${item.title || 'Notification'}: ${item.message || ''}`}
          accessibilityState={{ selected: item.isRead }}
          accessibilityHint={item.isRead ? undefined : 'Mark as read'}
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
                  {item.title || 'Notification'}
                </Text>
                {!item.isRead && <View style={styles.unreadDot} />}
              </View>
              {item.message ? (
                <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
              ) : null}
              <Text style={styles.time}>{formatTimestamp(item.createdAt)}</Text>
            </View>
          </View>
        </Pressable>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Delete notification"
        >
          <Ionicons name="trash-outline" size={16} color={tokens.colors.text.secondary} />
        </TouchableOpacity>
      </Card>
    </View>
  );
}

export function NotificationsScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');

  const BOTTOM_NAV_HEIGHT = 75;
  const bottomPadding = BOTTOM_NAV_HEIGHT + insets.bottom + 16;

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const result = await notificationService.getNotifications();
      setNotifications(Array.isArray(result?.data) ? result.data : (Array.isArray(result) ? result : []));
    } catch (error) {
      if (__DEV__) console.error('Error loading notifications:', error);
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
      if (__DEV__) console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      loadNotifications();
    } catch (error) {
      if (__DEV__) console.error('Error marking all as read:', error);
    }
  };

  const handleDelete = (id) => {
    Alert.alert(
      t('notifications.deleteTitle'),
      t('notifications.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await notificationService.deleteNotification(id);
              loadNotifications();
            } catch (error) {
              if (__DEV__) console.error('Error deleting notification:', error);
            }
          },
        },
      ]
    );
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'read') return n.isRead;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const readCount = notifications.filter((n) => n.isRead).length;

  const filters = [
    { key: 'all', label: t('notifications.filterAll'), count: notifications.length },
    { key: 'unread', label: t('notifications.filterUnread'), count: unreadCount },
    { key: 'read', label: t('notifications.filterRead'), count: readCount },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title={t('notifications.title')}
        showBack={true}
        rightAction={unreadCount > 0 ? (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={handleMarkAllAsRead}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Mark all as read"
          >
            <Ionicons name="checkmark-done-outline" size={22} color={tokens.colors.accent.blue} />
          </TouchableOpacity>
        ) : null}
      />

      {loading ? (
        <View style={styles.scrollContent}>
          <Card style={styles.card}>
            <Skeleton width="100%" height={80} />
          </Card>
          <Card style={styles.card}>
            <Skeleton width="100%" height={80} />
          </Card>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          renderItem={({ item, index }) => (
            <NotificationCard
              item={item}
              index={index}
              markAsRead={markAsRead}
              onDelete={handleDelete}
              t={t}
            />
          )}
          keyExtractor={(item) => item.id?.toString() || String(Math.random())}
          initialNumToRender={15}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            notifications.length > 0 ? (
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
            ) : null
          }
          ListEmptyComponent={
            <Card style={styles.emptyCard}>
              <EmptyState
                icon="notifications-outline"
                title={filter !== 'all' ? t('notifications.noFiltered', { filter }) : t('notifications.noNotifications')}
                description={filter !== 'all' ? t('notifications.tryDifferentFilter') : t('notifications.allCaughtUp')}
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
  scrollContent: {
    padding: tokens.space.lg,
  },
  markAllButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: tokens.space.sm,
    position: 'relative',
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
  deleteButton: {
    position: 'absolute',
    bottom: tokens.space.md,
    right: tokens.space.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: tokens.colors.semantic.errorSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
