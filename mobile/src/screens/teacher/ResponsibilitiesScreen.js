import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { teacherService } from '../../services/teacherService';
import Card from '../../components/common/Card';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import tokens from '../../styles/tokens';

export function ResponsibilitiesScreen() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [responsibilities, setResponsibilities] = useState([]);

  useEffect(() => {
    loadResponsibilities();
  }, []);

  const loadResponsibilities = async () => {
    try {
      setLoading(true);
      const data = await teacherService.getResponsibilities();
      setResponsibilities(Array.isArray(data) ? data : []);
    } catch (error) {
      if (__DEV__) console.error('Error loading responsibilities:', error);
      setResponsibilities([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
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
