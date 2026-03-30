import React, { useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  Pressable,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
  SafeAreaView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mealService } from '../../services/mealService';
import { teacherService } from '../../services/teacherService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { GlassCard } from '../../components/teacher/GlassCard';
import { ScreenHeader } from '../../components/teacher/ScreenHeader';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import tokens from '../../styles/tokens';

export function MealsScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  
  // Meal types with translations
  const MEAL_TYPES = [
    { key: 'breakfast', label: t('mealsPage.types.breakfast', { defaultValue: 'Breakfast' }) },
    { key: 'lunch', label: t('mealsPage.types.lunch', { defaultValue: 'Lunch' }) },
    { key: 'snack', label: t('mealsPage.types.snack', { defaultValue: 'Snack' }) },
    { key: 'dinner', label: t('mealsPage.types.dinner', { defaultValue: 'Dinner' }) },
  ];
  
  // Quantity options with translations
  const QUANTITY_OPTIONS = [
    { key: 'full', label: t('mealsPage.quantity.full', { defaultValue: 'Full portion' }) },
    { key: 'half', label: t('mealsPage.quantity.half', { defaultValue: 'Half portion' }) },
    { key: 'small', label: t('mealsPage.quantity.small', { defaultValue: 'Small portion' }) },
  ];
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Bottom nav height + safe area + padding
  const BOTTOM_NAV_HEIGHT = 75;
  const bottomPadding = BOTTOM_NAV_HEIGHT + insets.bottom + 16;
  const [meals, setMeals] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showModal, setShowModal] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);
  const [children, setChildren] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showFormDatePicker, setShowFormDatePicker] = useState(false);
  const [formData, setFormData] = useState({
    childId: '',
    mealName: '',
    description: '',
    mealType: 'breakfast',
    quantity: 'full',
    specialNotes: '',
    time: '08:30',
    eaten: true,
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadMeals();
    loadChildren();
  }, []);

  useEffect(() => {
    loadMeals();
  }, [selectedDate]);

  const loadChildren = async () => {
    try {
      const parentsList = await teacherService.getParents();
      const allChildren = [];
      parentsList.forEach(parent => {
        if (parent.children && Array.isArray(parent.children)) {
          allChildren.push(...parent.children);
        }
      });
      setChildren(allChildren);
      if (allChildren.length > 0 && !formData.childId) {
        setFormData(prev => ({ ...prev, childId: allChildren[0].id }));
      }
    } catch (error) {
      console.error('Error loading children:', error);
      setChildren([]);
    }
  };

  const loadMeals = async () => {
    setError(null);
    try {
      setLoading(true);
      const data = await mealService.getMeals({ date: selectedDate });
      setMeals(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading meals:', err);
      setMeals([]);
      setError(t('common.loadError', { defaultValue: 'Failed to load data' }));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingMeal(null);
    setFormData({
      childId: children.length > 0 ? children[0].id : '',
      mealName: '',
      description: '',
      mealType: 'Breakfast',
      quantity: 'full',
      specialNotes: '',
      time: '08:30',
      eaten: true,
      date: selectedDate,
    });
    setShowModal(true);
  };

  const handleEdit = (meal) => {
    setEditingMeal(meal);
    setFormData({
      childId: meal.childId || '',
      mealName: meal.mealName || '',
      description: meal.description || '',
      mealType: meal.mealType || 'breakfast',
      quantity: meal.quantity || 'full',
      specialNotes: meal.specialNotes || '',
      time: meal.time || '08:30',
      eaten: meal.eaten !== undefined ? meal.eaten : true,
      date: meal.date ? meal.date.split('T')[0] : selectedDate,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      // Validation
      if (!formData.childId) {
        Alert.alert(t('common.error', { defaultValue: 'Error' }), t('mealsPage.form.selectChild', { defaultValue: 'Bolani tanlang' }));
        return;
      }
      if (!formData.mealName || !formData.description || !formData.date) {
        Alert.alert(
          t('common.error', { defaultValue: 'Error' }),
          t('mealsPage.form.requiredFields', { defaultValue: 'Barcha majburiy maydonlarni to\'ldiring' })
        );
        return;
      }

      if (editingMeal) {
        await mealService.updateMeal(editingMeal.id, formData);
        Alert.alert(t('common.success', { defaultValue: 'Success' }), t('mealsPage.form.toastUpdate', { defaultValue: 'Taom yangilandi' }));
      } else {
        await mealService.createMeal(formData);
        Alert.alert(t('common.success', { defaultValue: 'Success' }), t('mealsPage.form.toastCreate', { defaultValue: 'Taom yaratildi' }));
      }
      setShowModal(false);
      loadMeals();
    } catch (error) {
      console.error('Error saving meal:', error);
      Alert.alert(
        t('common.error', { defaultValue: 'Error' }),
        error.response?.data?.error || t('mealsPage.form.toastError', { defaultValue: 'Xatolik yuz berdi' })
      );
    }
  };

  const handleDelete = async (id) => {
    Alert.alert(
      t('mealsPage.form.confirmDelete', { defaultValue: 'O\'chirishni tasdiqlash' }),
      t('mealsPage.form.confirmDeleteMessage', { defaultValue: 'Bu taomni o\'chirishni xohlaysizmi?' }),
      [
        { text: t('common.cancel', { defaultValue: 'Bekor qilish' }), style: 'cancel' },
        {
          text: t('common.delete', { defaultValue: 'O\'chirish' }),
          style: 'destructive',
          onPress: async () => {
            try {
              await mealService.deleteMeal(id);
              Alert.alert(t('common.success', { defaultValue: 'Success' }), t('mealsPage.form.toastDelete', { defaultValue: 'Taom o\'chirildi' }));
              loadMeals();
            } catch (error) {
              console.error('Error deleting meal:', error);
              Alert.alert(t('common.error', { defaultValue: 'Error' }), t('mealsPage.form.toastError', { defaultValue: 'Xatolik yuz berdi' }));
            }
          },
        },
      ]
    );
  };

  // Get unique dates from meals
  const dates = [...new Set(meals.map((meal) => meal.date))].sort().reverse();
  const filteredMeals = meals.filter((meal) => meal.date === selectedDate);

  if (loading) {
    return <LoadingSpinner />;
  }

  const renderMeal = ({ item }) => {
    const mealTypeIcons = {
      breakfast: 'sunny-outline',
      lunch: 'restaurant-outline',
      snack: 'cafe-outline',
      dinner: 'moon-outline',
    };
    const mealTypeColors = {
      breakfast: tokens.colors.semantic.warning,
      lunch: tokens.colors.semantic.success,
      snack: tokens.colors.joy.sunflower,
      dinner: tokens.colors.joy.lavender,
    };

    return (
      <GlassCard style={styles.card}>
        <View style={styles.mealHeader}>
          <View style={[styles.mealIconContainer, { backgroundColor: mealTypeColors[item.mealType] + '20' }]}>
            <Ionicons name={mealTypeIcons[item.mealType] || 'restaurant'} size={24} color={mealTypeColors[item.mealType]} />
          </View>
          <View style={styles.mealContent}>
            <View style={styles.mealTitleRow}>
              <Text style={styles.mealName}>{item.mealName}</Text>
              <View style={[styles.mealTypeBadge, { backgroundColor: mealTypeColors[item.mealType] + '20' }]}>
                <Text style={[styles.mealTypeText, { color: mealTypeColors[item.mealType] }]}>
                  {MEAL_TYPES.find(t => t.key === item.mealType)?.label || item.mealType}
                </Text>
              </View>
            </View>
            <View style={styles.timeContainer}>
              <Ionicons name="time-outline" size={14} color={tokens.colors.text.secondary} />
              <Text style={styles.time}>{item.time}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.description}>{item.description}</Text>

        <View style={styles.mealDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              {t('mealsPage.quantity', { defaultValue: 'Miqdori' })}:
            </Text>
            <Text style={styles.detailValue}>{QUANTITY_OPTIONS.find(q => q.key === item.quantity)?.label || item.quantity}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons
              name={item.eaten ? 'checkmark-circle' : 'close-circle'}
              size={18}
              color={item.eaten ? tokens.colors.semantic.success : tokens.colors.semantic.error}
            />
            <Text style={[styles.eatenStatus, { color: item.eaten ? tokens.colors.semantic.success : tokens.colors.semantic.error }]}>
              {item.eaten
                ? t('mealsPage.eaten', { defaultValue: 'Yeyilgan' })
                : t('mealsPage.notEaten', { defaultValue: 'Yeyilmagan' })
              }
            </Text>
          </View>
        </View>

        {item.specialNotes && (
          <View style={styles.notesContainer}>
            <Ionicons name="information-circle-outline" size={16} color={tokens.colors.accent.blue} />
            <Text style={styles.notesText}>
              <Text style={styles.notesLabel}>
                {t('mealsPage.form.specialNotes', { defaultValue: 'Eslatma' })}:
              </Text>
              {' '}{item.specialNotes}
            </Text>
          </View>
        )}

        <View style={styles.actions}>
          <Pressable style={styles.editButton} onPress={() => handleEdit(item)}>
            <Ionicons name="pencil" size={18} color={tokens.colors.accent.blue} />
            <Text style={styles.editButtonText}>{t('common.edit', { defaultValue: 'Edit' })}</Text>
          </Pressable>
          <Pressable style={styles.deleteButton} onPress={() => handleDelete(item.id)}>
            <Ionicons name="trash-outline" size={18} color={tokens.colors.semantic.error} />
            <Text style={styles.deleteButtonText}>{t('common.delete', { defaultValue: 'Delete' })}</Text>
          </Pressable>
        </View>
      </GlassCard>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title={t('mealsPage.title', { defaultValue: 'Meals' })}
        rightActionIcon="add"
        onRightActionPress={handleCreate}
      />
      {error && (
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Ionicons name="alert-circle-outline" size={48} color={tokens.colors.semantic.error} />
          <Text style={{ color: tokens.colors.text.secondary, marginTop: 12, textAlign: 'center' }}>{error}</Text>
          <Pressable onPress={() => loadMeals()} accessibilityRole="button" accessibilityLabel="Retry"
            style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: tokens.colors.accent.blue, borderRadius: tokens.radius.md }}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>{t('common.retry', { defaultValue: 'Retry' })}</Text>
          </Pressable>
        </View>
      )}

      {/* Date Picker */}
      <View style={styles.datePickerContainer}>
        <Text style={styles.datePickerLabel}>
          {t('mealsPage.selectDay', { defaultValue: 'Kunni tanlang' })}
        </Text>
        <Pressable
          onPress={() => setShowDatePicker(true)}
          accessibilityRole="button"
          accessibilityLabel={t('common.selectDate', { defaultValue: 'Select date' })}
          style={styles.datePickerRow}
        >
          <Ionicons name="calendar-outline" size={20} color={tokens.colors.accent.blue} />
          <Text style={[styles.dateInput, { color: tokens.colors.text.primary }]}>
            {selectedDate}
          </Text>
        </Pressable>
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate ? new Date(selectedDate) : new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDateValue) => {
              setShowDatePicker(false);
              if (selectedDateValue) {
                setSelectedDate(selectedDateValue.toISOString().split('T')[0]);
              }
            }}
          />
        )}
      </View>

      {filteredMeals.length === 0 ? (
        <EmptyState icon="restaurant-outline" message={t('mealsPage.empty', { defaultValue: 'No meals found' })} />
      ) : (
        <FlatList
          data={filteredMeals}
          renderItem={renderMeal}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPadding }]}
          refreshing={loading}
          onRefresh={loadMeals}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity style={[styles.fab, { bottom: bottomPadding - 20 }]} onPress={handleCreate}>
        <Ionicons name="add" size={28} color={tokens.colors.text.white} />
      </TouchableOpacity>

      {/* Create/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingMeal
                    ? t('mealsPage.form.editTitle', { defaultValue: 'Edit Meal' })
                    : t('mealsPage.form.addTitle', { defaultValue: 'Create Meal' })
                  }
                </Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Ionicons name="close" size={24} color={tokens.colors.text.secondary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalScrollView}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
              >
                {/* Child Selection */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    {t('mealsPage.form.child', { defaultValue: 'Bola' })}
                  </Text>
                  <View style={styles.pickerContainer}>
                    <ScrollView style={styles.pickerScrollView} nestedScrollEnabled>
                      {children.map((child) => (
                        <Pressable
                          key={child.id}
                          style={[
                            styles.pickerOption,
                            formData.childId === child.id && styles.pickerOptionSelected
                          ]}
                          onPress={() => setFormData(prev => ({ ...prev, childId: child.id }))}
                        >
                          <Text style={[
                            styles.pickerOptionText,
                            formData.childId === child.id && styles.pickerOptionTextSelected
                          ]}>
                            {child.firstName} {child.lastName}
                          </Text>
                          {formData.childId === child.id && (
                            <Ionicons name="checkmark" size={20} color={tokens.colors.accent.blue} />
                          )}
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                </View>

                {/* Meal Type and Date */}
                <View style={styles.row}>
                  <View style={[styles.inputGroup, styles.halfWidth]}>
                    <Text style={styles.label}>
                      {t('mealsPage.form.mealType', { defaultValue: 'Taom turi' })}
                    </Text>
                    <View style={styles.pickerContainer}>
                      <ScrollView style={styles.pickerScrollView} nestedScrollEnabled>
                        {MEAL_TYPES.map((type) => (
                          <Pressable
                            key={type.key}
                            style={[
                              styles.pickerOption,
                              formData.mealType === type.key && styles.pickerOptionSelected
                            ]}
                            onPress={() => setFormData(prev => ({ ...prev, mealType: type.key }))}
                          >
                            <Text style={[
                              styles.pickerOptionText,
                              formData.mealType === type.key && styles.pickerOptionTextSelected
                            ]}>
                              {type.label}
                            </Text>
                            {formData.mealType === type.key && (
                              <Ionicons name="checkmark" size={20} color={tokens.colors.accent.blue} />
                            )}
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                  <View style={[styles.inputGroup, styles.halfWidth]}>
                    <Text style={styles.label}>
                      {t('mealsPage.form.date', { defaultValue: 'Sana' })}
                    </Text>
                    <Pressable
                      onPress={() => setShowFormDatePicker(true)}
                      accessibilityRole="button"
                      accessibilityLabel={t('common.selectDate', { defaultValue: 'Select date' })}
                      style={{ borderWidth: 1, borderColor: tokens.colors.border.medium, borderRadius: tokens.radius.sm, padding: tokens.space.md }}
                    >
                      <Text style={{ fontSize: tokens.type.body.fontSize, color: formData.date ? tokens.colors.text.primary : tokens.colors.text.muted }}>
                        {formData.date || t('common.selectDate', { defaultValue: 'Select date' })}
                      </Text>
                    </Pressable>
                    {showFormDatePicker && (
                      <DateTimePicker
                        value={formData.date ? new Date(formData.date) : new Date()}
                        mode="date"
                        display="default"
                        onChange={(event, selectedDateValue) => {
                          setShowFormDatePicker(false);
                          if (selectedDateValue) {
                            const formatted = selectedDateValue.toISOString().split('T')[0];
                            setFormData({ ...formData, date: formatted });
                          }
                        }}
                      />
                    )}
                  </View>
                </View>

                {/* Meal Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    {t('mealsPage.form.mealName', { defaultValue: 'Taom nomi' })}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t('mealsPage.form.mealNamePlaceholder', { defaultValue: 'Taom nomini kiriting' })}
                    placeholderTextColor={tokens.colors.text.tertiary}
                    value={formData.mealName}
                    onChangeText={(text) => setFormData({ ...formData, mealName: text })}
                  />
                </View>

                {/* Description */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    {t('mealsPage.form.description', { defaultValue: 'Tavsif' })}
                  </Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder={t('mealsPage.form.descriptionPlaceholder', { defaultValue: 'Taom tavsifini kiriting' })}
                    placeholderTextColor={tokens.colors.text.tertiary}
                    value={formData.description}
                    onChangeText={(text) => setFormData({ ...formData, description: text })}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                {/* Time and Quantity */}
                <View style={styles.row}>
                  <View style={[styles.inputGroup, styles.halfWidth]}>
                    <Text style={styles.label}>
                      {t('mealsPage.form.time', { defaultValue: 'Vaqt' })}
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="HH:MM"
                      placeholderTextColor={tokens.colors.text.tertiary}
                      value={formData.time}
                      onChangeText={(text) => setFormData({ ...formData, time: text })}
                    />
                  </View>
                  <View style={[styles.inputGroup, styles.halfWidth]}>
                    <Text style={styles.label}>
                      {t('mealsPage.form.quantity', { defaultValue: 'Miqdor' })}
                    </Text>
                    <View style={styles.pickerContainer}>
                      <ScrollView style={styles.pickerScrollView} nestedScrollEnabled>
                        {QUANTITY_OPTIONS.map((qty) => (
                          <Pressable
                            key={qty.key}
                            style={[
                              styles.pickerOption,
                              formData.quantity === qty.key && styles.pickerOptionSelected
                            ]}
                            onPress={() => setFormData(prev => ({ ...prev, quantity: qty.key }))}
                          >
                            <Text style={[
                              styles.pickerOptionText,
                              formData.quantity === qty.key && styles.pickerOptionTextSelected
                            ]}>
                              {qty.label}
                            </Text>
                            {formData.quantity === qty.key && (
                              <Ionicons name="checkmark" size={20} color={tokens.colors.accent.blue} />
                            )}
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                </View>

                {/* Special Notes */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    {t('mealsPage.form.specialNotes', { defaultValue: 'Maxsus eslatmalar' })}
                  </Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder={t('mealsPage.form.specialNotesPlaceholder', { defaultValue: 'Maxsus eslatmalarni kiriting' })}
                    placeholderTextColor={tokens.colors.text.tertiary}
                    value={formData.specialNotes}
                    onChangeText={(text) => setFormData({ ...formData, specialNotes: text })}
                    multiline
                    numberOfLines={2}
                  />
                </View>

                {/* Eaten Toggle */}
                <View style={styles.inputGroup}>
                  <View style={styles.switchRow}>
                    <Text style={styles.label}>
                      {t('mealsPage.form.eatenLabel', { defaultValue: 'Yeyilgan' })}
                    </Text>
                    <Switch
                      value={formData.eaten}
                      onValueChange={(value) => setFormData({ ...formData, eaten: value })}
                      trackColor={{ false: tokens.colors.border.medium, true: tokens.colors.accent.blue }}
                      thumbColor={formData.eaten ? '#fff' : '#f4f3f4'}
                    />
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <Pressable style={styles.cancelButton} onPress={() => setShowModal(false)}>
                  <Text style={styles.cancelButtonText}>
                    {t('mealsPage.form.cancel', { defaultValue: 'Bekor qilish' })}
                  </Text>
                </Pressable>
                <Pressable style={styles.saveButton} onPress={handleSave}>
                  <Text style={styles.saveButtonText}>
                    {editingMeal
                      ? t('mealsPage.form.update', { defaultValue: 'Yangilash' })
                      : t('mealsPage.form.create', { defaultValue: 'Yaratish' })
                    }
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background.primary,
  },
  datePickerContainer: {
    padding: tokens.space.md,
    backgroundColor: tokens.colors.card.base,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border.light,
  },
  datePickerLabel: {
    fontSize: tokens.type.caption.fontSize,
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.text.secondary,
    marginBottom: tokens.space.xs,
    textTransform: 'uppercase',
  },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
    backgroundColor: tokens.colors.surface.secondary,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
  },
  dateInput: {
    flex: 1,
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.primary,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
  fab: {
    position: 'absolute',
    right: tokens.space.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F59E0B', // Orange/Amber
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadow.elevated,
  },
  list: {
    padding: tokens.space.lg,
  },
  card: {
    marginBottom: tokens.space.md,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: tokens.space.sm,
  },
  mealIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.space.md,
  },
  mealContent: {
    flex: 1,
  },
  mealTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: tokens.space.xs,
    marginBottom: tokens.space.xs,
  },
  mealName: {
    fontSize: tokens.type.bodyLarge.fontSize,
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.text.primary,
  },
  mealTypeBadge: {
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.xs / 2,
    borderRadius: tokens.radius.sm,
  },
  mealTypeText: {
    fontSize: tokens.type.caption.fontSize,
    fontWeight: tokens.typography.fontWeight.bold,
    textTransform: 'uppercase',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: tokens.space.xs / 2,
    gap: tokens.space.xs / 2,
  },
  time: {
    fontSize: tokens.type.sub.fontSize,
    color: tokens.colors.text.secondary,
  },
  description: {
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.secondary,
    marginTop: tokens.space.sm,
    lineHeight: 20,
  },
  mealDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: tokens.space.md,
    paddingTop: tokens.space.md,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border.light,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.xs,
  },
  detailLabel: {
    fontSize: tokens.type.caption.fontSize,
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.text.secondary,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.text.primary,
  },
  eatenStatus: {
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.space.xs,
    marginTop: tokens.space.sm,
    padding: tokens.space.sm,
    backgroundColor: tokens.colors.surface.secondary,
    borderRadius: tokens.radius.md,
  },
  notesText: {
    flex: 1,
    fontSize: tokens.type.sub.fontSize,
    color: tokens.colors.text.secondary,
    lineHeight: 18,
  },
  notesLabel: {
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.text.primary,
  },
  actions: {
    flexDirection: 'row',
    marginTop: tokens.space.md,
    paddingTop: tokens.space.md,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border.light,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: tokens.space.md,
    paddingVertical: tokens.space.xs,
    paddingHorizontal: tokens.space.sm,
  },
  editButtonText: {
    color: tokens.colors.accent.blue,
    marginLeft: tokens.space.xs,
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.typography.fontWeight.medium,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.space.xs,
    paddingHorizontal: tokens.space.sm,
  },
  deleteButtonText: {
    color: tokens.colors.semantic.error,
    marginLeft: tokens.space.xs,
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.typography.fontWeight.medium,
  },
  modalContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: tokens.colors.card.base,
    borderTopLeftRadius: tokens.radius.xl,
    borderTopRightRadius: tokens.radius.xl,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 40 : tokens.space.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: tokens.space.lg,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border.light,
  },
  modalTitle: {
    fontSize: tokens.type.h3.fontSize,
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.text.primary,
  },
  modalScrollView: {
    maxHeight: 500,
    paddingHorizontal: tokens.space.lg,
  },
  inputGroup: {
    marginBottom: tokens.space.md,
  },
  label: {
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.text.primary,
    marginBottom: tokens.space.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: tokens.colors.border.medium,
    borderRadius: tokens.radius.sm,
    padding: tokens.space.md,
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.primary,
    backgroundColor: tokens.colors.card.base,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: tokens.space.md,
  },
  halfWidth: {
    flex: 1,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: tokens.colors.border.medium,
    borderRadius: tokens.radius.sm,
    maxHeight: 150,
    backgroundColor: tokens.colors.card.base,
  },
  pickerScrollView: {
    maxHeight: 150,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: tokens.space.md,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border.light,
  },
  pickerOptionSelected: {
    backgroundColor: tokens.colors.accent[50],
  },
  pickerOptionText: {
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.primary,
  },
  pickerOptionTextSelected: {
    color: tokens.colors.accent.blue,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: tokens.space.lg,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border.light,
    gap: tokens.space.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: tokens.space.md,
    alignItems: 'center',
    borderRadius: tokens.radius.sm,
    backgroundColor: tokens.colors.surface.secondary,
  },
  cancelButtonText: {
    color: tokens.colors.text.secondary,
    fontSize: tokens.type.body.fontSize,
    fontWeight: tokens.typography.fontWeight.medium,
  },
  saveButton: {
    flex: 1,
    paddingVertical: tokens.space.md,
    alignItems: 'center',
    borderRadius: tokens.radius.sm,
    backgroundColor: '#F59E0B', // Orange/Amber
  },
  saveButtonText: {
    color: tokens.colors.text.white,
    fontSize: tokens.type.body.fontSize,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
});
