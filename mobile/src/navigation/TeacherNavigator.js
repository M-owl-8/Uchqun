import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { TeacherDashboardScreen } from '../screens/teacher/TeacherDashboardScreen';
import { ProfileScreen } from '../screens/teacher/ProfileScreen';
import { ResponsibilitiesScreen } from '../screens/teacher/ResponsibilitiesScreen';
import { TasksScreen } from '../screens/teacher/TasksScreen';
import { WorkHistoryScreen } from '../screens/teacher/WorkHistoryScreen';
import { ParentsListScreen } from '../screens/teacher/ParentsListScreen';
import { ParentDetailScreen } from '../screens/teacher/ParentDetailScreen';
import { ActivitiesScreen } from '../screens/teacher/ActivitiesScreen';
import { MealsScreen } from '../screens/teacher/MealsScreen';
import { MediaScreen } from '../screens/teacher/MediaScreen';
import { ChatScreen } from '../screens/teacher/ChatScreen';
import { SettingsScreen } from '../screens/teacher/SettingsScreen';
import { NotificationsScreen } from '../screens/teacher/NotificationsScreen';
import { EmotionalMonitoringScreen } from '../screens/teacher/EmotionalMonitoringScreen';
import { MonitoringJournalScreen } from '../screens/teacher/MonitoringJournalScreen';
import { TherapyScreen } from '../screens/teacher/TherapyScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

import theme from '../styles/theme';
import tokens from '../styles/tokens';

// Icon size - optimized for touch targets
const ICON_SIZE = 24;

const TAB_LABELS = {
  Dashboard: 'nav.dashboard',
  Parents: 'nav.parents',
  Chat: 'nav.chat',
  Profile: 'nav.profile',
  Settings: 'nav.settings',
};

function TeacherTabs() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarLabel: TAB_LABELS[route.name] ? t(TAB_LABELS[route.name]) : route.name,
        tabBarAccessibilityLabel: TAB_LABELS[route.name] ? t(TAB_LABELS[route.name]) : route.name,
        tabBarIcon: ({ focused, color, size }) => {
          // CRITICAL: Safe route name access
          const routeName = route?.name;
          if (!routeName) {
            console.warn('[TeacherTabIcon] Missing route.name');
            return <Ionicons name="help-outline" size={ICON_SIZE} color={color} />;
          }

          // Icon mapping per Mobile-icons.md design system
          const iconMap = {
            Dashboard: 'home',      // Home icon
            Parents: 'people',      // Users icon
            Chat: 'chatbubble-ellipses', // Chat icon
            Profile: 'person',      // Profile icon
            Settings: 'settings',   // Settings icon
          };

          const baseIcon = iconMap[routeName] || 'help';
          const iconName = focused ? baseIcon : `${baseIcon}-outline`;
          const activeColor = tokens.colors.joy.lavender; // Purple accent from design
          const inactiveColor = tokens.colors.text.muted;

          // New glassmorphism design: Purple accent with rounded container
          if (focused) {
            return (
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                backgroundColor: activeColor,
                alignItems: 'center',
                justifyContent: 'center',
                ...tokens.shadow.glow,
              }}>
                <Ionicons name={baseIcon} size={ICON_SIZE} color={tokens.colors.text.white} />
              </View>
            );
          }

          return <Ionicons name={iconName} size={ICON_SIZE} color={inactiveColor} />;
        },
        tabBarActiveTintColor: tokens.colors.joy.lavender, // Purple accent
        tabBarInactiveTintColor: tokens.colors.text.muted,
        tabBarStyle: {
          backgroundColor: tokens.colors.background.secondary,
          borderTopWidth: 1,
          borderTopColor: tokens.colors.border.light,
          height: 75 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 10,
          ...tokens.shadow.card,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
          letterSpacing: 0.3,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={TeacherDashboardScreen} />
      <Tab.Screen name="Parents" component={ParentsListScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export function TeacherNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 250,
      }}
    >
      <Stack.Screen name="TeacherTabs" component={TeacherTabs} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Responsibilities" component={ResponsibilitiesScreen} />
      <Stack.Screen name="Tasks" component={TasksScreen} />
      <Stack.Screen name="WorkHistory" component={WorkHistoryScreen} />
      <Stack.Screen name="ParentDetail" component={ParentDetailScreen} />
      <Stack.Screen name="Activities" component={ActivitiesScreen} />
      <Stack.Screen name="Meals" component={MealsScreen} />
      <Stack.Screen name="Media" component={MediaScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="EmotionalMonitoring" component={EmotionalMonitoringScreen} />
      <Stack.Screen name="MonitoringJournal" component={MonitoringJournalScreen} />
      <Stack.Screen name="Therapy" component={TherapyScreen} />
    </Stack.Navigator>
  );
}
