import React, { useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  View,
  Text,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { activityService } from '../../services/activityService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { ScreenHeader } from '../../components/teacher/ScreenHeader';
import { useTranslation } from 'react-i18next';
import tokens from '../../styles/tokens';
import ActivityCard from './activities/ActivityCard';
import ActivityDetailModal from './activities/ActivityDetailModal';
import ActivityForm from './activities/ActivityForm';

export function ActivitiesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activities, setActivities] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Bottom nav height + safe area + padding
  const BOTTOM_NAV_HEIGHT = 75;
  const bottomPadding = BOTTOM_NAV_HEIGHT + insets.bottom + 16;

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    setError(null);
    try {
      setLoading(true);
      const data = await activityService.getActivities();
      setActivities(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading activities:', err);
      setActivities([]);
      setError(t('common.loadError', { defaultValue: 'Failed to load data' }));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingActivity(null);
    setShowModal(true);
  };

  const handleEdit = (activity) => {
    setEditingActivity(activity);
    setShowModal(true);
  };

  const handleFormSubmit = async (payload) => {
    try {
      if (editingActivity) {
        await activityService.updateActivity(editingActivity.id, payload);
        Alert.alert(
          t('common.success', { defaultValue: 'Success' }),
          t('activitiesPage.toastUpdate', { defaultValue: 'Individual reja yangilandi' })
        );
      } else {
        await activityService.createActivity(payload);
        Alert.alert(
          t('common.success', { defaultValue: 'Success' }),
          t('activitiesPage.toastCreate', { defaultValue: 'Individual reja yaratildi' })
        );
      }
      setShowModal(false);
      loadActivities();
    } catch (error) {
      console.error('Error saving activity:', error);
      console.error('Error response:', error.response?.data);
      Alert.alert(
        t('common.error', { defaultValue: 'Error' }),
        error.response?.data?.error || t('activitiesPage.toastError', { defaultValue: 'Xatolik yuz berdi' })
      );
    }
  };

  const handleDelete = (id) => {
    Alert.alert(
      t('activitiesPage.confirmDelete', { defaultValue: 'O\'chirishni tasdiqlash' }),
      t('activitiesPage.confirmDeleteMessage', { defaultValue: 'Bu individual rejani o\'chirishni xohlaysizmi?' }),
      [
        { text: t('common.cancel', { defaultValue: 'Bekor qilish' }), style: 'cancel' },
        {
          text: t('common.delete', { defaultValue: 'O\'chirish' }),
          style: 'destructive',
          onPress: async () => {
            try {
              await activityService.deleteActivity(id);
              Alert.alert(
                t('common.success', { defaultValue: 'Success' }),
                t('activitiesPage.toastDelete', { defaultValue: 'Individual reja o\'chirildi' })
              );
              loadActivities();
            } catch (error) {
              console.error('Error deleting activity:', error);
              Alert.alert(
                t('common.error', { defaultValue: 'Error' }),
                t('activitiesPage.toastError', { defaultValue: 'Xatolik yuz berdi' })
              );
            }
          },
        },
      ]
    );
  };

  const handleViewDetails = (activity) => {
    setSelectedActivity(activity);
    setShowDetailsModal(true);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title={t('activitiesPage.title', { defaultValue: 'Individual Plan' })}
        rightActionIcon="add"
        onRightActionPress={handleCreate}
      />
      {error && (
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Ionicons name="alert-circle-outline" size={48} color={tokens.colors.semantic.error} />
          <Text style={{ color: tokens.colors.text.secondary, marginTop: 12, textAlign: 'center' }}>{error}</Text>
          <Pressable onPress={() => loadActivities()} accessibilityRole="button" accessibilityLabel="Retry"
            style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: tokens.colors.accent.blue, borderRadius: tokens.radius.md }}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>{t('common.retry', { defaultValue: 'Retry' })}</Text>
          </Pressable>
        </View>
      )}

      {activities.length === 0 ? (
        <EmptyState icon="clipboard-outline" message={t('activitiesPage.empty', { defaultValue: 'No activities found' })} />
      ) : (
        <FlatList
          data={activities}
          renderItem={({ item }) => (
            <ActivityCard
              activity={item}
              onViewDetails={handleViewDetails}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPadding }]}
          refreshing={loading}
          onRefresh={loadActivities}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity style={[styles.fab, { bottom: bottomPadding - 20 }]} onPress={handleCreate}>
        <Ionicons name="add" size={28} color={tokens.colors.text.white} />
      </TouchableOpacity>

      {/* Details Modal */}
      <ActivityDetailModal
        visible={showDetailsModal}
        activity={selectedActivity}
        onClose={() => setShowDetailsModal(false)}
      />

      {/* Create/Edit Modal */}
      <ActivityForm
        visible={showModal}
        editingActivity={editingActivity}
        onSubmit={handleFormSubmit}
        onClose={() => setShowModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background.primary,
  },
  fab: {
    position: 'absolute',
    right: tokens.space.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: tokens.colors.semantic.success,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadow.elevated,
  },
  list: {
    padding: tokens.space.lg,
  },
});
