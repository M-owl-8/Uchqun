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

export function TasksScreen() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await teacherService.getTasks();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      if (__DEV__) console.error('Error loading tasks:', err);
      setError(t('common.loadError', { defaultValue: 'Failed to load data' }));
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (id, status) => {
    try {
      await teacherService.updateTaskStatus(id, status);
      loadTasks();
    } catch (error) {
      if (__DEV__) console.error('Error updating task status:', error);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t('tasks.title', { defaultValue: 'Tasks' })} />
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Ionicons name="alert-circle-outline" size={48} color={tokens.colors.semantic.error} />
          <Text style={{ color: tokens.colors.text.secondary, marginTop: 12, textAlign: 'center' }}>{error}</Text>
          <Pressable onPress={() => loadTasks()} accessibilityRole="button" accessibilityLabel={t('common.retry', { defaultValue: 'Retry' })}
            style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: tokens.colors.accent.blue, borderRadius: tokens.radius.md }}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>{t('common.retry', { defaultValue: 'Retry' })}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (tasks.length === 0) {
    return (
      <>
        <ScreenHeader title={t('tasks.title', { defaultValue: 'Tasks' })} />
        <EmptyState icon="checkmark-circle-outline" message={t('tasks.noTasks', { defaultValue: 'No tasks assigned' })} />
      </>
    );
  }

  const renderTask = ({ item }) => {
    const isCompleted = item.status === 'completed' || item.isCompleted;
    return (
      <Card>
        <View style={styles.taskHeader}>
          <View style={[styles.taskIconContainer, isCompleted && styles.taskIconCompleted]}>
            <Ionicons
              name={isCompleted ? 'checkmark-circle' : 'time-outline'}
              size={24}
              color={isCompleted ? tokens.colors.semantic.success : tokens.colors.semantic.warning}
            />
          </View>
          <View style={styles.taskContent}>
            <Text style={[styles.title, isCompleted && styles.titleCompleted]}>
              {item.title || item.name || t('tasks.task', { defaultValue: 'Task' })}
            </Text>
            {item.dueDate && (
              <View style={styles.dateContainer}>
                <Ionicons name="calendar-outline" size={14} color={tokens.colors.text.secondary} />
                <Text style={styles.date}>{item.dueDate}</Text>
              </View>
            )}
          </View>
        </View>
        {item.description && <Text style={styles.description}>{item.description}</Text>}
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, isCompleted && styles.statusBadgeCompleted]}>
            <Text style={[styles.status, isCompleted && styles.statusCompleted]}>
              {isCompleted ? t('tasks.completed', { defaultValue: 'Completed' }) : (item.status || t('tasks.pending', { defaultValue: 'Pending' }))}
            </Text>
          </View>
        </View>
        {!isCompleted && (
          <Pressable
            style={styles.completeButton}
            onPress={() => updateTaskStatus(item.id, 'completed')}
          >
            <Ionicons name="checkmark-circle" size={18} color={tokens.colors.text.white} />
            <Text style={styles.completeButtonText}>{t('tasks.markCompleted', { defaultValue: 'Mark as Completed' })}</Text>
          </Pressable>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('tasks.title', { defaultValue: 'Tasks' })} />
      {tasks.length === 0 ? (
        <EmptyState icon="checkmark-circle-outline" message={t('tasks.noTasks', { defaultValue: 'No tasks assigned' })} />
      ) : (
        <FlatList
          data={tasks}
          renderItem={renderTask}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={loadTasks}
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
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: tokens.space.sm,
  },
  taskIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tokens.colors.semantic.warning + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.space.md,
  },
  taskIconCompleted: {
    backgroundColor: tokens.colors.semantic.success + '20',
  },
  taskContent: {
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
  description: {
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.secondary,
    marginTop: tokens.space.sm,
    lineHeight: 20,
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
    backgroundColor: tokens.colors.semantic.success,
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
