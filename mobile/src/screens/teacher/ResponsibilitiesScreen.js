import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { teacherService } from '../../services/teacherService';
import Card from '../../components/common/Card';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import tokens from '../../styles/tokens';
import logger from '../../utils/logger';

export function ResponsibilitiesScreen() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [responsibilities, setResponsibilities] = useState([]);

  useEffect(() => {
    loadResponsibilities();
  }, []);

  const loadResponsibilities = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await teacherService.getResponsibilities();
      setResponsibilities(Array.isArray(data) ? data : []);
    } catch (err) {
      logger.error('Error loading responsibilities:', err);
      setError(t('common.loadError', { defaultValue: 'Failed to load data' }));
      setResponsibilities([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t('responsibilities.title', { defaultValue: 'Responsibilities' })} />
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Ionicons name="alert-circle-outline" size={48} color={tokens.colors.semantic.error} />
          <Text style={{ color: tokens.colors.text.secondary, marginTop: 12, textAlign: 'center' }}>{error}</Text>
          <Pressable onPress={() => loadResponsibilities()} accessibilityRole="button" accessibilityLabel={t('common.retry', { defaultValue: 'Retry' })}
            style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: tokens.colors.accent.blue, borderRadius: tokens.radius.md }}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>{t('common.retry', { defaultValue: 'Retry' })}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (responsibilities.length === 0) {
    return (
      <>
        <ScreenHeader title={t('responsibilities.title', { defaultValue: 'Responsibilities' })} />
        <EmptyState icon="list-outline" message={t('responsibilities.noResponsibilities', { defaultValue: 'No responsibilities assigned' })} />
      </>
    );
  }

  const renderResponsibility = ({ item }) => (
    <Card>
      <View style={styles.responsibilityHeader}>
        <View style={styles.responsibilityIconContainer}>
          <Ionicons name="list" size={24} color={tokens.colors.accent.blue} />
        </View>
        <View style={styles.responsibilityContent}>
          <Text style={styles.title}>{item.title || item.name || t('responsibilities.responsibility', { defaultValue: 'Responsibility' })}</Text>
          {item.deadline && (
            <View style={styles.deadlineContainer}>
              <Ionicons name="calendar-outline" size={14} color={tokens.colors.text.secondary} />
              <Text style={styles.deadline}>
                {t('responsibilities.deadline', { defaultValue: 'Deadline' })}: {new Date(item.deadline).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </View>
      {item.description && <Text style={styles.description}>{item.description}</Text>}
    </Card>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('responsibilities.title', { defaultValue: 'Responsibilities' })} />
      {responsibilities.length === 0 ? (
        <EmptyState icon="list-outline" message={t('responsibilities.noResponsibilities', { defaultValue: 'No responsibilities assigned' })} />
      ) : (
        <FlatList
          data={responsibilities}
          renderItem={renderResponsibility}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={loadResponsibilities}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.surface.secondary,
  },
  list: {
    padding: tokens.space.md,
  },
  responsibilityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: tokens.space.sm,
  },
  responsibilityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tokens.colors.accent[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.space.md,
  },
  responsibilityContent: {
    flex: 1,
  },
  title: {
    fontSize: tokens.type.bodyLarge.fontSize,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.text.primary,
    marginBottom: tokens.space.xs,
  },
  deadlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: tokens.space.xs / 2,
  },
  deadline: {
    fontSize: tokens.type.sub.fontSize,
    color: tokens.colors.text.secondary,
    marginLeft: tokens.space.xs / 2,
  },
  description: {
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.secondary,
    marginTop: tokens.space.sm,
    lineHeight: 20,
  },
});
