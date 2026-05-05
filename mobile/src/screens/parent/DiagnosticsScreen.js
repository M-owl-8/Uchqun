/**
 * Diagnostics Screen - Dev-only route testing
 * Tests all navigation routes to ensure no crashes
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { safeNavigate, safeNavigateToTab } from '../../utils/safeNavigation';
import tokens from '../../styles/tokens';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import Card from '../../components/common/Card';
import logger from '../../utils/logger';

export function DiagnosticsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [results, setResults] = useState([]);
  const [testing, setTesting] = useState(false);

  const BOTTOM_NAV_HEIGHT = 75;
  const bottomPadding = BOTTOM_NAV_HEIGHT + insets.bottom + 16;

  const logResult = (route, success, error = null) => {
    const result = {
      route,
      success,
      error: error?.message || String(error),
      timestamp: new Date().toISOString(),
    };
    setResults((prev) => [...prev, result]);
  };

  const testRoute = async (routeName, params = {}) => {
    return new Promise((resolve) => {
      try {
        const success = safeNavigate(navigation, routeName, params);
        logResult(routeName, success, success ? null : new Error('Navigation failed'));
        setTimeout(resolve, 500); // Wait 500ms between navigations
      } catch (error) {
        logResult(routeName, false, error);
        resolve();
      }
    });
  };

  const testTab = async (tabName) => {
    return new Promise((resolve) => {
      try {
        const success = safeNavigateToTab(navigation, tabName);
        logResult(`Tab:${tabName}`, success, success ? null : new Error('Tab navigation failed'));
        setTimeout(resolve, 500);
      } catch (error) {
        logResult(`Tab:${tabName}`, false, error);
        resolve();
      }
    });
  };

  const runAllTests = async () => {
    setTesting(true);
    setResults([]);

    // Test tab navigations
    await testTab('Dashboard');
    await testTab('Children');
    await testTab('AIChat');
    await testTab('Settings');

    // Test stack navigations (with dummy params where needed)
    await testRoute('ChildProfile', { childId: 'test-id' });
    await testRoute('Activities');
    await testRoute('Meals');
    await testRoute('Media');
    await testRoute('Chat');
    await testRoute('Notifications');
    await testRoute('TeacherRating');
    await testRoute('SchoolRating');

    setTesting(false);
  };

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Route Diagnostics" showBack={true} />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Navigation Tests</Text>
        <Text style={styles.description}>
          Tests all navigation routes to ensure no crashes occur.
        </Text>

        <Pressable
          style={[styles.button, testing && styles.buttonDisabled]}
          onPress={runAllTests}
          disabled={testing}
        >
          <Text style={styles.buttonText}>
            {testing ? 'Testing...' : 'Run All Tests'}
          </Text>
        </Pressable>

        {results.length > 0 && (
          <View style={styles.summary}>
            <Text style={styles.summaryText}>
              Results: {successCount} passed, {failCount} failed
            </Text>
          </View>
        )}
      </Card>

      {results.length > 0 && (
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          <ScrollView style={styles.resultsList}>
            {results.map((result, index) => (
              <View
                key={index}
                style={[
                  styles.resultItem,
                  result.success ? styles.resultSuccess : styles.resultFail,
                ]}
              >
                <Text style={styles.resultRoute}>
                  {result.success ? '✓' : '✗'} {result.route}
                </Text>
                {result.error && (
                  <Text style={styles.resultError}>{result.error}</Text>
                )}
              </View>
            ))}
          </ScrollView>
        </Card>
      )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: tokens.space.lg,
  },
  card: {
    marginBottom: tokens.space.lg,
  },
  sectionTitle: {
    fontSize: tokens.type.h3.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.text.primary,
    marginBottom: tokens.space.sm,
  },
  description: {
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.secondary,
    marginBottom: tokens.space.md,
  },
  button: {
    backgroundColor: tokens.colors.accent.blue,
    padding: tokens.space.md,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: tokens.colors.text.white,
    fontSize: tokens.type.button.fontSize,
    fontWeight: tokens.type.button.fontWeight,
  },
  summary: {
    marginTop: tokens.space.md,
    padding: tokens.space.sm,
    backgroundColor: tokens.colors.background.secondary,
    borderRadius: tokens.radius.sm,
  },
  summaryText: {
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.primary,
    fontWeight: '600',
  },
  resultsList: {
    maxHeight: 400,
  },
  resultItem: {
    padding: tokens.space.sm,
    marginBottom: tokens.space.xs,
    borderRadius: tokens.radius.sm,
  },
  resultSuccess: {
    backgroundColor: `${tokens.colors.semantic.success}20`,
  },
  resultFail: {
    backgroundColor: `${tokens.colors.semantic.error}20`,
  },
  resultRoute: {
    fontSize: tokens.type.body.fontSize,
    fontWeight: '600',
    color: tokens.colors.text.primary,
  },
  resultError: {
    fontSize: tokens.type.sub.fontSize,
    color: tokens.colors.semantic.error,
    marginTop: tokens.space.xs,
    fontFamily: 'monospace',
  },
});
