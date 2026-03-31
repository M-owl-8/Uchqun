import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { LoadingScreen } from '../screens/LoadingScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { ParentNavigator } from './ParentNavigator';
import { TeacherNavigator } from './TeacherNavigator';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const { bootstrapping, isAuthenticated, user, isTeacher, isParent, isAdmin, isReception } = useAuth();
  const navigationRef = useRef(null);
  const prevAuthRef = useRef(undefined);
  const prevRoleRef = useRef(undefined);
  const navTimerRef = useRef(null);

  // Stable role identifier to prevent re-renders
  const userRole = user?.role;

  // Handle navigation when auth state changes
  useEffect(() => {
    if (bootstrapping) {
      prevAuthRef.current = undefined;
      prevRoleRef.current = undefined;
      return;
    }

    // Initialize on first render
    if (prevAuthRef.current === undefined) {
      prevAuthRef.current = isAuthenticated;
      prevRoleRef.current = userRole;
      return;
    }

    // Skip if neither auth state nor role has changed
    if (prevAuthRef.current === isAuthenticated && prevRoleRef.current === userRole) {
      return;
    }

    prevAuthRef.current = isAuthenticated;
    prevRoleRef.current = userRole;

    // Clear any previous pending navigation timer to prevent race conditions
    if (navTimerRef.current) {
      clearTimeout(navTimerRef.current);
    }

    // Navigate after a short delay to ensure state is ready
    navTimerRef.current = setTimeout(() => {
      if (navigationRef.current) {
        try {
          let targetRoute = 'Login';
          if (isAuthenticated) {
            // CRITICAL FIX: Handle all roles properly
            if (isParent) {
              targetRoute = 'Parent';
            } else if (isTeacher) {
              targetRoute = 'Teacher';
            } else if (isAdmin || isReception) {
              // Admin and Reception should use Teacher navigator as fallback
              // But log a warning
              console.warn('[RootNavigator] Admin/Reception user using Teacher navigator as fallback');
              targetRoute = 'Teacher';
            } else {
              // Unknown role - log error and stay on login
              console.error('[RootNavigator] Unknown user role:', user?.role);
              targetRoute = 'Login';
            }
          }
          console.log('[RootNavigator] Navigating to:', targetRoute, 'Role:', user?.role);
          navigationRef.current.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: targetRoute }],
            })
          );
        } catch (error) {
          console.error('[RootNavigator] Navigation error:', error);
        }
      }
    }, 200);

    return () => {
      if (navTimerRef.current) {
        clearTimeout(navTimerRef.current);
        navTimerRef.current = null;
      }
    };
  }, [isAuthenticated, bootstrapping, userRole, isTeacher, isParent, isAdmin, isReception]);

  if (bootstrapping) {
    return <LoadingScreen />;
  }

  // Determine initial route
  let initialRoute = 'Login';
  if (isAuthenticated) {
    // CRITICAL FIX: Handle all roles properly
    if (isParent) {
      initialRoute = 'Parent';
    } else if (isTeacher) {
      initialRoute = 'Teacher';
    } else if (isAdmin || isReception) {
      // Admin and Reception use Teacher navigator as fallback
      console.warn('[RootNavigator] Admin/Reception user using Teacher navigator as fallback');
      initialRoute = 'Teacher';
    } else {
      // Unknown role - log error
      console.error('[RootNavigator] Unknown user role for initial route:', user?.role);
      initialRoute = 'Login';
    }
  }
  console.log('[RootNavigator] Initial route:', initialRoute, 'User:', user?.email, 'Role:', user?.role);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'none',
        }}
        initialRouteName={initialRoute}
      >
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{
            animationTypeForReplace: isAuthenticated ? 'pop' : 'push',
          }}
        />
        <Stack.Screen 
          name="Parent" 
          component={ParentNavigator}
          options={{
            gestureEnabled: false,
          }}
        />
        <Stack.Screen 
          name="Teacher" 
          component={TeacherNavigator}
          options={{
            gestureEnabled: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
