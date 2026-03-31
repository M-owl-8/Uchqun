import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import tokens from '../../styles/tokens';

/**
 * ScreenHeader — clean header for all screens.
 *
 * Tab screens: just centered title + optional right action. NO burger menu.
 * Stack screens (showBack=true): back chevron + centered title + optional right action.
 */
export function ScreenHeader({
  title,
  showBack = false,
  onBackPress,
  showNotificationBell = false,
  notificationCount = 0,
  rightAction,
  rightActionIcon,
  onRightActionPress,
}) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const handleBack = () => {
    if (onBackPress) onBackPress();
    else if (navigation.canGoBack()) navigation.goBack();
  };

  const renderRight = () => {
    if (rightAction) return rightAction;

    if (rightActionIcon) {
      return (
        <Pressable
          onPress={onRightActionPress}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel={rightActionIcon}
        >
          <Ionicons name={rightActionIcon} size={24} color={tokens.colors.text.primary} />
        </Pressable>
      );
    }

    if (showNotificationBell) {
      return (
        <Pressable
          onPress={() => navigation.navigate('Notifications')}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel={`Notifications${notificationCount > 0 ? `, ${notificationCount} unread` : ''}`}
        >
          <Ionicons name="notifications-outline" size={24} color={tokens.colors.text.primary} />
          {notificationCount > 0 && (
            <View style={styles.badge}>
              <View style={styles.badgeDot} />
            </View>
          )}
        </Pressable>
      );
    }

    return <View style={styles.iconButton} />;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + tokens.space.sm }]}>
      <View style={styles.row}>
        {/* Left: back button on stack screens, empty spacer on tab screens */}
        {showBack ? (
          <Pressable
            onPress={handleBack}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={24} color={tokens.colors.text.primary} />
          </Pressable>
        ) : (
          <View style={styles.iconButton} />
        )}

        <Text style={styles.title} numberOfLines={1}>{title}</Text>

        {renderRight()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: tokens.colors.background.primary,
    paddingHorizontal: tokens.space.xl,
    paddingBottom: tokens.space.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: tokens.touchTarget.min,
    height: tokens.touchTarget.min,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: tokens.type.h3.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.text.primary,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tokens.colors.nav.indicator,
  },
});
