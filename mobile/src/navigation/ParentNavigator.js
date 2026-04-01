import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ParentDashboardScreen } from '../screens/parent/ParentDashboardScreen';
import { RatingScreen } from '../screens/parent/RatingScreen';
import { ChildProfileScreen } from '../screens/parent/ChildProfileScreen';
import { ActivitiesScreen } from '../screens/parent/ActivitiesScreen';
import { MealsScreen } from '../screens/parent/MealsScreen';
import { MediaScreen } from '../screens/parent/MediaScreen';
import { ChatScreen } from '../screens/parent/ChatScreen';

import { SchoolRatingScreen } from '../screens/parent/SchoolRatingScreen';
import { SettingsScreen } from '../screens/parent/SettingsScreen';
import { ParentProfileScreen } from '../screens/parent/ParentProfileScreen';
import { NotificationsScreen } from '../screens/parent/NotificationsScreen';
import { TherapyScreen } from '../screens/parent/TherapyScreen';
import { PaymentsScreen } from '../screens/parent/PaymentsScreen';
import { HelpScreen } from '../screens/parent/HelpScreen';
import { AIWarningsScreen } from '../screens/parent/AIWarningsScreen';
import { DiagnosticsScreen } from '../screens/parent/DiagnosticsScreen';
import { ServicePlanScreen } from '../screens/parent/ServicePlanScreen';
import { MealPlanScreen } from '../screens/parent/MealPlanScreen';
import FloatingAI from '../components/common/FloatingAI';
import tokens from '../styles/tokens';
import { useTranslation } from 'react-i18next';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Icon size - optimized for touch targets
const ICON_SIZE = 24;

// Tab configuration per BottomNav.tsx design
const TAB_CONFIG = {
  Dashboard: {
    icon: 'home',
    label: 'Dashboard',
  },
  Rating: {
    icon: 'star',
    label: 'Rating',
  },
  Chat: {
    icon: 'chatbubble-ellipses',
    label: 'Chat',
  },
  Profile: {
    icon: 'person',
    label: 'Profile',
  },
  Settings: {
    icon: 'settings',
    label: 'Settings',
  },
};

// Custom tab bar icon matching BottomNav.tsx Figma design
function TabIcon({ route, focused, color }) {
  const routeName = route?.name;
  if (!routeName) {
    if (__DEV__) console.warn('[TabIcon] Missing route.name');
    return <Ionicons name="help-outline" size={ICON_SIZE} color={color} />;
  }

  const config = TAB_CONFIG?.[routeName];

  if (!config) {
    if (__DEV__) console.warn(`[TabIcon] Unknown route: ${routeName}`);
    return <Ionicons name="help-outline" size={ICON_SIZE} color={color} />;
  }

  const baseIcon = config.icon || 'help';

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
}

function ParentTabs() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const getTabLabel = (routeName) => {
    const labelMap = {
      Dashboard: t('nav.dashboard'),
      Rating: t('nav.rating'),
      Chat: t('nav.chat'),
      Profile: t('nav.profile'),
      Settings: t('nav.menu'),
    };
    return labelMap[routeName] || routeName;
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: (props) => <TabIcon route={route} {...props} />,
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
        tabBarActiveTabLabelStyle: {
          fontWeight: '600',
        },
        tabBarLabel: getTabLabel(route.name),
        tabBarAccessibilityLabel: getTabLabel(route.name),
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={ParentDashboardScreen} />
      <Tab.Screen name="Rating" component={RatingScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Profile" component={ParentProfileScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export function ParentNavigator() {
  return (
    <>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'none',
        }}
      >
        <Stack.Screen name="ParentTabs" component={ParentTabs} />
        <Stack.Screen name="ChildProfile" component={ChildProfileScreen} />
        <Stack.Screen name="Activities" component={ActivitiesScreen} />
        <Stack.Screen name="Meals" component={MealsScreen} />
        <Stack.Screen name="Media" component={MediaScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />

        <Stack.Screen name="SchoolRating" component={SchoolRatingScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Therapy" component={TherapyScreen} />
        <Stack.Screen name="Payments" component={PaymentsScreen} />
        <Stack.Screen name="Help" component={HelpScreen} />
        <Stack.Screen name="AIWarnings" component={AIWarningsScreen} />
        <Stack.Screen name="ServicePlan" component={ServicePlanScreen} />
        <Stack.Screen name="MealPlan" component={MealPlanScreen} />
        {__DEV__ && (
          <Stack.Screen name="Diagnostics" component={DiagnosticsScreen} />
        )}
      </Stack.Navigator>

      {/* Floating AI Chat Button - Appears on all parent screens */}
      <FloatingAI />
    </>
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
