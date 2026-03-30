import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, FlatList, Animated, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { notificationService } from '../../services/notificationService';
import tokens from '../../styles/tokens';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/teacher/ScreenHeader';
import { GlassCard } from '../../components/teacher/GlassCard';
import Skeleton from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import ListRow from '../../components/common/ListRow';

// Animated notification card component
function AnimatedNotificationCard({ item, index, markAsRead, onDelete }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80, // Stagger by 80ms
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <GlassCard
        style={[
          styles.card,
          !item.isRead && styles.unreadCard
        ]}
      >
        <Pressable onPress={() => markAsRead(item.id)} accessibilityRole="button" accessibilityLabel={`${item.title || 'Notification'}: ${item.message || ''}`} accessibilityState={{ selected: item.isRead }} accessibilityHint={item.isRead ? undefined : 'Mark as read'}>
          <ListRow
            icon={item.isRead ? 'notifications-outline' : 'notifications'}
            iconColor={!item.isRead ? tokens.colors.accent.blue : tokens.colors.text.muted}
            title={item.title || 'Notification'}
            subtitle={item.message}
            time={formatTimestamp(item.createdAt)}
            chevron={false}
          />
          {!item.isRead && (
            <View style={styles.unreadBadge}>
              <View style={styles.unreadDot} />
            </View>
          )}
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
      </GlassCard>
    </Animated.View>
  );
}

export function NotificationsScreen() {
  const navigation = useNavigation();
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
      console.error('Error loading notifications:', error);
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
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      loadNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await notificationService.deleteNotification(id);
              loadNotifications();
            } catch (error) {
              console.error('Error deleting notification:', error);
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
    { key: 'all', label: 'All', count: notifications.length },
    { key: 'unread', label: 'Unread', count: unreadCount },
    { key: 'read', label: 'Read', count: readCount },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader 
        title="Notifications"
        showBack={true}
        rightComponent={unreadCount > 0 ? (
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
          <GlassCard style={styles.card}>
            <Skeleton width="100%" height={80} />
          </GlassCard>
          <GlassCard style={styles.card}>
            <Skeleton width="100%" height={80} />
          </GlassCard>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          renderItem={({ item, index }) => (
            <AnimatedNotificationCard
              item={item}
              index={index}
              markAsRead={markAsRead}
              onDelete={handleDelete}
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
            <GlassCard style={styles.emptyCard}>
              <EmptyState
                icon="notifications-outline"
                title={filter !== 'all' ? `No ${filter} notifications` : 'No notifications'}
                description={filter !== 'all' ? 'Try a different filter' : "You're all caught up!"}
              />
            </GlassCard>
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
    backgroundColor: tokens.colors.background.secondary,
    borderRadius: tokens.radius.pill,
    gap: tokens.space.xs,
  },
  filterPillActive: {
    backgroundColor: tokens.colors.accent.blue,
    borderColor: tokens.colors.accent.blue,
  },
  filterLabel: {
    fontSize: tokens.type.sub.fontSize,
    fontWeight: '600',
    color: tokens.colors.text.secondary,
  },
  filterLabelActive: {
    color: '#fff',
  },
  filterCount: {
    backgroundColor: 'rgba(0,0,0,0.08)',
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
    fontSize: 11,
    fontWeight: '700',
    color: tokens.colors.text.secondary,
  },
  filterCountTextActive: {
    color: '#fff',
  },
  card: {
    marginBottom: tokens.space.sm,
    position: 'relative',
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: tokens.colors.accent.blue,
    backgroundColor: tokens.colors.accent[50],
  },
  emptyCard: {
    marginTop: tokens.space.xl,
  },
  unreadBadge: {
    position: 'absolute',
    top: tokens.space.md,
    right: tokens.space.md,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tokens.colors.accent.blue,
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
