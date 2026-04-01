import { Platform } from 'react-native';
import { api } from './api';

let Notifications = null;
let Device = null;
let Constants = null;

try {
  Notifications = require('expo-notifications');
  Device = require('expo-device');
  Constants = require('expo-constants');
} catch (e) {
  if (__DEV__) console.warn('[PushNotification] expo-notifications or expo-device not installed');
}

export async function registerForPushNotifications() {
  if (!Notifications || !Device) return null;
  if (!Device.isDevice) {
    if (__DEV__) console.warn('[PushNotification] Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    if (__DEV__) console.warn('[PushNotification] Permission not granted');
    return null;
  }

  const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.manifest?.extra?.eas?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );
  const token = tokenData?.data;
  if (!token) {
    if (__DEV__) console.warn('[PushNotification] No push token received');
    return null;
  }

  // Register with backend
  try {
    await api.post('/push-notifications/register', {
      deviceToken: token,
      platform: Platform.OS,
    });
  } catch (error) {
    if (__DEV__) console.error('[PushNotification] Failed to register token:', error);
  }

  // Configure notification behavior
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  return token;
}

export async function unregisterPushNotifications() {
  if (!Notifications) return;
  try {
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.manifest?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    const token = tokenData?.data;
    if (token) {
      await api.delete(`/push-notifications/device/${encodeURIComponent(token)}`);
    }
  } catch (error) {
    if (__DEV__) console.error('[PushNotification] Failed to unregister:', error);
  }
}
