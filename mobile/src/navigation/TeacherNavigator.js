import React from 'react';
import { View, StyleSheet } from 'react-native';
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
import { TeacherChildProfileScreen } from '../screens/teacher/ChildProfileScreen';
import { ChildAssessmentScreen } from '../screens/teacher/ChildAssessmentScreen';
import { ServicePlanScreen } from '../screens/teacher/ServicePlanScreen';
import { MealPlanScreen } from '../screens/teacher/MealPlanScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

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

// Icon mapping per Mobile-icons.md design system
const TAB_ICONS = {
  Dashboard: 'home',
  Parents: 'people',
  Chat: 'chatbubble-ellipses',
  Profile: 'person',
  Settings: 'settings',
};

function TeacherTabs() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarLabel: TAB_LABELS[route.name] ? t(TAB_LABELS[route.name]) : route.name,
        tabBarAccessibilityLabel: TAB_LABELS[route.name] ? t(TAB_LABELS[route.name]) : route.name,
        tabBarIcon: ({ focused, color }) => {
          const routeName = route?.name;
          if (!routeName) {
            console.warn('[TeacherTabIcon] Missing route.name');
            return <Ionicons name="help-outline" size={ICON_SIZE} color={color} />;
          }

          const baseIcon = TAB_ICONS[routeName] || 'help';

          // Active state: filled icon with gold dot below (matching BottomNav.tsx)
          if (focused) {
            return (
              <View style={styles.activeTabContainer}>
                <Ionicons name={baseIcon} size={ICON_SIZE + 2} color={tokens.colors.text.primary} />
                <View style={styles.activeIndicatorDot} />
              </View>
            );
          }

          // Inactive state: outline icon with muted color
          const iconName = `${baseIcon}-outline`;
          return <Ionicons name={iconName} size={ICON_SIZE} color={tokens.colors.text.muted} />;
        },
        tabBarActiveTintColor: tokens.colors.nav.active,
        tabBarInactiveTintColor: tokens.colors.nav.inactive,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          height: 75 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 10,
          shadowColor: '#2E3A59',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
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
        animation: 'none',
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
      <Stack.Screen name="ChildProfile" component={TeacherChildProfileScreen} />
      <Stack.Screen name="ChildAssessment" component={ChildAssessmentScreen} />
      <Stack.Screen name="ServicePlan" component={ServicePlanScreen} />
      <Stack.Screen name="MealPlan" component={MealPlanScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  // Active tab: icon with gold dot below (BottomNav.tsx design)
  activeTabContainer: {
    alignItems: 'center',
  },
  activeIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: tokens.colors.nav.indicator,
    marginTop: 4,
  },
});
