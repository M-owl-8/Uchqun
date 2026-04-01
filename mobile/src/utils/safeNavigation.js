/**
 * Safe Navigation Utilities
 * Prevents crashes from navigation errors
 */

/**
 * Safely navigate to a screen with error handling
 * @param {Object} navigation - Navigation object from useNavigation()
 * @param {string} screenName - Name of screen to navigate to
 * @param {Object} params - Optional params to pass
 * @returns {boolean} - true if navigation succeeded, false otherwise
 */
export function safeNavigate(navigation, screenName, params = {}) {
  if (!navigation) {
    if (__DEV__) {
      console.error('[safeNavigate] Navigation object is null/undefined');
    }
    return false;
  }

  if (!screenName || typeof screenName !== 'string') {
    if (__DEV__) {
      console.error('[safeNavigate] Invalid screenName:', screenName);
    }
    return false;
  }

  try {
    // Try parent navigator first (for stack screens from tab navigator)
    const parentNav = navigation.getParent?.();
    if (parentNav) {
      parentNav.navigate(screenName, params);
      return true;
    }

    // Fallback to direct navigation
    navigation.navigate(screenName, params);
    return true;
  } catch (error) {
    if (__DEV__) {
      console.error(`[safeNavigate] Failed to navigate to ${screenName}:`, error);
    }
    return false;
  }
}

/**
 * Safely navigate to a tab screen
 * @param {Object} navigation - Navigation object
 * @param {string} tabName - Name of tab
 * @param {Object} params - Optional params
 */
export function safeNavigateToTab(navigation, tabName, params = {}) {
  if (!navigation) {
    if (__DEV__) {
      console.error('[safeNavigateToTab] Navigation object is null/undefined');
    }
    return false;
  }

  try {
    navigation.navigate('ParentTabs', { screen: tabName, params });
    return true;
  } catch (error) {
    if (__DEV__) {
      console.error(`[safeNavigateToTab] Failed to navigate to tab ${tabName}:`, error);
    }
    return false;
  }
}
