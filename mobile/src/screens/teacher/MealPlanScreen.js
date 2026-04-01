import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { teacherService } from '../../services/teacherService';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import tokens from '../../styles/tokens';

const MEAL_TYPES = ['breakfast', 'lunch', 'snack', 'dinner'];

const MEAL_EMOJI = {
  breakfast: '🥞',
  lunch: '🍱',
  snack: '🍎',
  dinner: '🍝',
};

const MEAL_COLORS = {
  breakfast: '#E8C27E',
  lunch: '#DFF4EC',
  snack: '#F8D7C4',
  dinner: '#D4C5F9',
};

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function MealPlanScreen() {
  const route = useRoute();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const BOTTOM_NAV_HEIGHT = 75;
  const bottomPadding = BOTTOM_NAV_HEIGHT + insets.bottom + 16;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [children, setChildren] = useState([]);
  const [selectedChildIds, setSelectedChildIds] = useState([]);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [mealData, setMealData] = useState({
    breakfast: { plannedMenu: '', notes: '' },
    lunch: { plannedMenu: '', notes: '' },
    snack: { plannedMenu: '', notes: '' },
    dinner: { plannedMenu: '', notes: '' },
  });

  // Load children assigned to this teacher
  const loadChildren = useCallback(async () => {
    try {
      setLoading(true);
      const response = await teacherService.getAssignedParents();
      const parents = Array.isArray(response) ? response : response?.data || [];
      const allChildren = [];
      for (const parent of parents) {
        const parentChildren = parent.children || [];
        for (const child of parentChildren) {
          allChildren.push({
            id: child.id,
            firstName: child.firstName,
            lastName: child.lastName,
            parentName: `${parent.firstName || ''} ${parent.lastName || ''}`.trim(),
          });
        }
      }
      setChildren(allChildren);
    } catch (error) {
      console.error('Error loading children:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  // Load existing plans when a single child is selected
  useEffect(() => {
    if (selectedChildIds.length === 1) {
      loadExistingPlans(selectedChildIds[0]);
    }
  }, [selectedChildIds, selectedDate]);

  const loadExistingPlans = async (childId) => {
    try {
      const response = await api.get('/meal-plans', {
        params: { childId, startDate: selectedDate, endDate: selectedDate },
      });
      const existingPlans = response.data?.data || [];
      const newMealData = {
        breakfast: { plannedMenu: '', notes: '' },
        lunch: { plannedMenu: '', notes: '' },
        snack: { plannedMenu: '', notes: '' },
        dinner: { plannedMenu: '', notes: '' },
      };
      for (const plan of existingPlans) {
        if (newMealData[plan.mealType]) {
          newMealData[plan.mealType] = {
            plannedMenu: plan.plannedMenu || '',
            notes: plan.notes || '',
          };
        }
      }
      setMealData(newMealData);
    } catch (error) {
      console.error('Error loading existing plans:', error);
    }
  };

  const toggleChildSelection = (childId) => {
    setSelectedChildIds((prev) => {
      if (prev.includes(childId)) {
        return prev.filter((id) => id !== childId);
      }
      return [...prev, childId];
    });
  };

  const selectAllChildren = () => {
    if (selectedChildIds.length === children.length) {
      setSelectedChildIds([]);
    } else {
      setSelectedChildIds(children.map((c) => c.id));
    }
  };

  const updateMealField = (mealType, field, value) => {
    setMealData((prev) => ({
      ...prev,
      [mealType]: { ...prev[mealType], [field]: value },
    }));
  };

  const handleSave = async () => {
    if (selectedChildIds.length === 0) {
      Alert.alert('', t('mealPlan.selectChildren', { defaultValue: 'Select Children' }));
      return;
    }

    // Get meal types with actual content
    const mealsToSave = MEAL_TYPES.filter((mt) => mealData[mt].plannedMenu.trim());

    if (mealsToSave.length === 0) {
      Alert.alert('', t('mealPlan.plannedMenu', { defaultValue: 'Planned Menu' }));
      return;
    }

    try {
      setSaving(true);

      for (const mealType of mealsToSave) {
        const payload = {
          childIds: selectedChildIds,
          date: selectedDate,
          mealType,
          plannedMenu: mealData[mealType].plannedMenu.trim(),
          notes: mealData[mealType].notes.trim() || null,
        };

        if (selectedChildIds.length === 1) {
          // Single child - use regular endpoint
          await api.post('/meal-plans', {
            childId: selectedChildIds[0],
            date: payload.date,
            mealType: payload.mealType,
            plannedMenu: payload.plannedMenu,
            notes: payload.notes,
          });
        } else {
          // Multiple children - use bulk endpoint
          await api.post('/meal-plans/bulk', payload);
        }
      }

      const message = selectedChildIds.length > 1
        ? t('mealPlan.bulkSaved', { count: selectedChildIds.length, defaultValue: `Plan saved for ${selectedChildIds.length} children` })
        : t('mealPlan.saved', { defaultValue: 'Plan saved' });

      Alert.alert('', message);
    } catch (error) {
      console.error('Error saving meal plans:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to save meal plans');
    } finally {
      setSaving(false);
    }
  };

  const onDateChange = (event, date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(formatDate(date));
    }
  };

  const getMealLabel = (type) => {
    return t(`mealPlan.${type}`, { defaultValue: type });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader title={t('mealPlan.title', { defaultValue: 'Meal Plan' })} />
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title={t('mealPlan.title', { defaultValue: 'Meal Plan' })} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: bottomPadding }}
        >
          {/* Date picker */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('mealPlan.date', { defaultValue: 'Date' })}
            </Text>
            <Pressable
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color={tokens.colors.text?.primary || '#2E3A59'} />
              <Text style={styles.dateButtonText}>{selectedDate}</Text>
            </Pressable>
            {showDatePicker && Platform.OS !== 'web' && (
              <View style={styles.datePickerInline}>
                {(() => {
                  const DateTimePicker = require('@react-native-community/datetimepicker').default;
                  return (
                    <DateTimePicker
                      value={new Date(selectedDate + 'T12:00:00')}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'inline' : 'default'}
                      onChange={onDateChange}
                    />
                  );
                })()}
              </View>
            )}
          </View>

          {/* Child selector */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {t('mealPlan.selectChildren', { defaultValue: 'Select Children' })}
              </Text>
              {selectedChildIds.length > 0 && (
                <Text style={styles.selectedCount}>
                  {t('mealPlan.selectedCount', {
                    count: selectedChildIds.length,
                    defaultValue: `${selectedChildIds.length} children selected`,
                  })}
                </Text>
              )}
            </View>

            {children.length > 1 && (
              <Pressable style={styles.selectAllButton} onPress={selectAllChildren}>
                <View style={[styles.checkbox, selectedChildIds.length === children.length && styles.checkboxActive]}>
                  {selectedChildIds.length === children.length && (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  )}
                </View>
                <Text style={styles.selectAllText}>
                  {selectedChildIds.length === children.length ? 'Deselect All' : 'Select All'}
                </Text>
              </Pressable>
            )}

            {children.map((child) => {
              const isSelected = selectedChildIds.includes(child.id);
              return (
                <Pressable
                  key={child.id}
                  style={[styles.childRow, isSelected && styles.childRowActive]}
                  onPress={() => toggleChildSelection(child.id)}
                >
                  <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                    {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <View style={styles.childInfo}>
                    <Text style={styles.childName}>
                      {child.firstName} {child.lastName}
                    </Text>
                    {child.parentName ? (
                      <Text style={styles.parentName}>{child.parentName}</Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Meal type sections */}
          {MEAL_TYPES.map((mealType) => (
            <View
              key={mealType}
              style={[styles.mealSection, { backgroundColor: MEAL_COLORS[mealType] + '30' }]}
            >
              <View style={styles.mealSectionHeader}>
                <Text style={styles.mealEmoji}>{MEAL_EMOJI[mealType]}</Text>
                <Text style={styles.mealTypeLabel}>{getMealLabel(mealType)}</Text>
              </View>

              <Text style={styles.inputLabel}>
                {t('mealPlan.plannedMenu', { defaultValue: 'Planned Menu' })}
              </Text>
              <TextInput
                style={styles.textInput}
                value={mealData[mealType].plannedMenu}
                onChangeText={(text) => updateMealField(mealType, 'plannedMenu', text)}
                placeholder={t('mealPlan.plannedMenu', { defaultValue: 'Planned Menu' })}
                placeholderTextColor={tokens.colors.text?.muted || '#8E8E93'}
                multiline
              />

              <Text style={styles.inputLabel}>
                {t('mealPlan.notes', { defaultValue: 'Notes' })}
              </Text>
              <TextInput
                style={styles.textInput}
                value={mealData[mealType].notes}
                onChangeText={(text) => updateMealField(mealType, 'notes', text)}
                placeholder={t('mealPlan.notes', { defaultValue: 'Notes' })}
                placeholderTextColor={tokens.colors.text?.muted || '#8E8E93'}
                multiline
              />
            </View>
          ))}

          {/* Save button */}
          <Pressable
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>
                  {t('mealPlan.save', { defaultValue: 'Save' })}
                </Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background?.primary || '#F8F9FA',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: tokens.colors.text?.primary || '#2E3A59',
    marginBottom: 8,
  },
  selectedCount: {
    fontSize: 13,
    color: tokens.colors.accent.blue,
    fontWeight: '600',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  dateButtonText: {
    fontSize: 15,
    color: tokens.colors.text?.primary || '#2E3A59',
    fontWeight: '500',
  },
  datePickerInline: {
    marginTop: 8,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    marginBottom: 4,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: tokens.colors.accent.blue,
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  childRowActive: {
    borderColor: tokens.colors.accent.blue,
    backgroundColor: (tokens.colors.accent.blue) + '10',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: tokens.colors.accent.blue,
    borderColor: tokens.colors.accent.blue,
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: 15,
    fontWeight: '600',
    color: tokens.colors.text?.primary || '#2E3A59',
  },
  parentName: {
    fontSize: 12,
    color: tokens.colors.text?.muted || '#8E8E93',
    marginTop: 2,
  },
  mealSection: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  mealSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  mealEmoji: {
    fontSize: 24,
  },
  mealTypeLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: tokens.colors.text?.primary || '#2E3A59',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: tokens.colors.text?.secondary || '#636366',
    marginBottom: 4,
    marginTop: 6,
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: tokens.colors.text?.primary || '#2E3A59',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    minHeight: 44,
    textAlignVertical: 'top',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: tokens.colors.accent.blue,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
