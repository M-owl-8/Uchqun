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

export function WorkHistoryScreen() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [workHistory, setWorkHistory] = useState([]);

  useEffect(() => {
    loadWorkHistory();
  }, []);

  const loadWorkHistory = async () => {
    try {
      setLoading(true);
      const data = await teacherService.getWorkHistory();
      setWorkHistory(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading work history:', error);
      setWorkHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await teacherService.updateWorkHistoryStatus(id, status);
      loadWorkHistory();
    } catch (error) {
      console.error('Error updating work history status:', error);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (workHistory.length === 0) {
    return (
      <>
        <ScreenHeader title={t('workHistory.title', { defaultValue: 'Work History' })} />
        <EmptyState icon="time-outline" message={t('workHistory.noHistory', { defaultValue: 'No work history' })} />
      </>
    );
  }

  const renderWorkItem = ({ item }) => {
    const isCompleted = item.status === 'completed';
    return (
      <Card>
        <View style={styles.workHeader}>
          <View style={[styles.workIconContainer, isCompleted && styles.workIconCompleted]}>
            <Ionicons
              name={isCompleted ? 'checkmark-circle' : 'time-outline'}
              size={24}
              color={isCompleted ? tokens.colors.semantic.success : tokens.colors.semantic.warning}
            />
          </View>
          <View style={styles.workContent}>
            <Text style={[styles.title, isCompleted && styles.titleCompleted]}>
              {item.title || item.description || t('workHistory.workItem', { defaultValue: 'Work Item' })}
            </Text>
            {item.date && (
              <View style={styles.dateContainer}>
                <Ionicons name="calendar-outline" size={14} color={tokens.colors.text.secondary} />
                <Text style={styles.date}>{new Date(item.date).toLocaleDateString()}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, isCompleted && styles.statusBadgeCompleted]}>
            <Text style={[styles.status, isCompleted && styles.statusCompleted]}>
              {isCompleted ? t('workHistory.completed', { defaultValue: 'Completed' }) : (item.status || t('workHistory.pending', { defaultValue: 'Pending' }))}
            </Text>
          </View>
        </View>
        {!isCompleted && (
          <Pressable
            style={styles.completeButton}
            onPress={() => updateStatus(item.id, 'completed')}
          >
            <Ionicons name="checkmark-circle" size={18} color={tokens.colors.text.white} />
            <Text style={styles.completeButtonText}>{t('workHistory.markCompleted', { defaultValue: 'Mark as Completed' })}</Text>
          </Pressable>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('workHistory.title', { defaultValue: 'Work History' })} />
      {workHistory.length === 0 ? (
        <EmptyState icon="time-outline" message={t('workHistory.noHistory', { defaultValue: 'No work history' })} />
      ) : (
        <FlatList
          data={workHistory}
          renderItem={renderWorkItem}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={loadWorkHistory}
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
  workHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: tokens.space.sm,
  },
  workIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tokens.colors.semantic.warning + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.space.md,
  },
  workIconCompleted: {
    backgroundColor: tokens.colors.semantic.success + '20',
  },
  workContent: {
    flex: 1,
  },
  title: {
    fontSize: tokens.type.bodyLarge.fontSize,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.text.primary,
    marginBottom: tokens.space.xs,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: tokens.colors.text.secondary,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: tokens.space.xs / 2,
  },
  date: {
    fontSize: tokens.type.sub.fontSize,
    color: tokens.colors.text.secondary,
    marginLeft: tokens.space.xs / 2,
  },
  statusContainer: {
    marginTop: tokens.space.md,
    paddingTop: tokens.space.md,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border.light,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: tokens.colors.semantic.warning + '20',
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.xs,
    borderRadius: tokens.radius.sm,
  },
  statusBadgeCompleted: {
    backgroundColor: tokens.colors.semantic.success + '20',
  },
  status: {
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.semantic.warning,
    textTransform: 'capitalize',
  },
  statusCompleted: {
    color: tokens.colors.semantic.success,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.accent.blue,
    paddingVertical: tokens.space.sm,
    paddingHorizontal: tokens.space.md,
    borderRadius: tokens.radius.sm,
    alignSelf: 'flex-start',
    marginTop: tokens.space.md,
    ...tokens.shadow.sm,
  },
  completeButtonText: {
    color: tokens.colors.text.white,
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.typography.fontWeight.semibold,
    marginLeft: tokens.space.xs,
  },
});
