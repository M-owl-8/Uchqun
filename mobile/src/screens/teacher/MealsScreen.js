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
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mealService } from '../../services/mealService';
import { teacherService } from '../../services/teacherService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import Card from '../../components/common/Card';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import tokens from '../../styles/tokens';

// Meal type config matching Figma design
const MEAL_CONFIG = {
  breakfast: { emoji: '🥞', color: '#E8C27E' },
  lunch: { emoji: '🍱', color: '#DFF4EC' },
  dinner: { emoji: '🍝', color: '#E8C27E' },
  snack: { emoji: '🍎', color: '#F8D7C4' },
  default: { emoji: '🍽️', color: '#BFD7EA' },
};

const getMealConfig = (mealType) => {
  const type = (mealType || '').toLowerCase();
  for (const [key, config] of Object.entries(MEAL_CONFIG)) {
    if (type.includes(key)) return config;
  }
  return MEAL_CONFIG.default;
};

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
          t('mealsPage.form.requiredFields', { defaultValue: "Barcha majburiy maydonlarni to'ldiring" })
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
      t('mealsPage.form.confirmDelete', { defaultValue: "O'chirishni tasdiqlash" }),
      t('mealsPage.form.confirmDeleteMessage', { defaultValue: "Bu taomni o'chirishni xohlaysizmi?" }),
      [
        { text: t('common.cancel', { defaultValue: 'Bekor qilish' }), style: 'cancel' },
        {
          text: t('common.delete', { defaultValue: "O'chirish" }),
          style: 'destructive',
          onPress: async () => {
            try {
              await mealService.deleteMeal(id);
              Alert.alert(t('common.success', { defaultValue: 'Success' }), t('mealsPage.form.toastDelete', { defaultValue: "Taom o'chirildi" }));
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
  const filteredMeals = meals.filter((meal) => meal.date === selectedDate);

  // Compute nutrition summary stats
  const eatenCount = filteredMeals.filter((m) => m.eaten).length;
  const totalMealCount = filteredMeals.length;

  if (loading) {
    return <LoadingSpinner />;
  }

  const renderMeal = ({ item }) => {
    const config = getMealConfig(item.mealType);
    const isCompleted = item.eaten;

    return (
      <Card style={styles.card}>
        <View style={styles.mealRow}>
          {/* 48x48 icon container with tinted bg */}
          <View
            style={[
              styles.mealIconContainer,
              { backgroundColor: config.color + '66' },
            ]}
          >
            <Text style={styles.mealEmoji}>{config.emoji}</Text>
          </View>

          {/* Content */}
          <View style={styles.mealInfo}>
            <View style={styles.mealTitleRow}>
              <Text style={styles.mealName}>{item.mealName}</Text>
              {isCompleted && (
                <View style={styles.completedBadge}>
                  <Text style={styles.completedBadgeText}>✓ {t('mealsPage.eaten', { defaultValue: 'Yeyilgan' })}</Text>
                </View>
              )}
            </View>

            <View style={styles.mealTypeBadgeRow}>
              <View style={[styles.mealTypeBadge, { backgroundColor: config.color + '33' }]}>
                <Text style={[styles.mealTypeText, { color: '#2E3A59' }]}>
                  {MEAL_TYPES.find(mt => mt.key === item.mealType)?.label || item.mealType}
                </Text>
              </View>
              {item.time && (
                <Text style={styles.mealTime}>{item.time}</Text>
              )}
            </View>

            {item.description && (
              <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
            )}

            {/* Quantity */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                {t('mealsPage.quantity', { defaultValue: 'Miqdori' })}:
              </Text>
              <Text style={styles.detailValue}>{QUANTITY_OPTIONS.find(q => q.key === item.quantity)?.label || item.quantity}</Text>
            </View>

            {item.specialNotes && (
              <View style={styles.notesContainer}>
                <Ionicons name="information-circle-outline" size={14} color={tokens.colors.accent.blue} />
                <Text style={styles.notesText} numberOfLines={2}>{item.specialNotes}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Edit/Delete actions */}
        <View style={styles.actions}>
          <Pressable style={styles.editButton} onPress={() => handleEdit(item)}>
            <Ionicons name="pencil" size={16} color={tokens.colors.accent.blue} />
            <Text style={styles.editButtonText}>{t('common.edit', { defaultValue: 'Edit' })}</Text>
          </Pressable>
          <Pressable style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
            <Ionicons name="trash-outline" size={16} color={tokens.colors.semantic.error} />
            <Text style={styles.deleteBtnText}>{t('common.delete', { defaultValue: 'Delete' })}</Text>
          </Pressable>
        </View>
      </Card>
    );
  };

  const listHeaderComponent = () => (
    <View>
      {/* Nutrition Summary Card */}
      <Card
        gradient={tokens.colors.gradients.nutrition}
        style={styles.nutritionCard}
      >
        <View style={styles.nutritionHeader}>
          <Text style={styles.nutritionTitle}>
            {t('mealsPage.todayNutrition', { defaultValue: "Today's Nutrition" })}
          </Text>
          <View style={styles.nutritionIcon}>
            <Text style={{ fontSize: 24 }}>🍴</Text>
          </View>
        </View>
        <View style={styles.nutritionStats}>
          <View style={styles.nutritionStatItem}>
            <Text style={styles.nutritionStatValue}>
              {eatenCount}/{totalMealCount}
            </Text>
            <Text style={styles.nutritionStatLabel}>
              {t('mealsPage.mealsLabel', { defaultValue: 'Meals' })}
            </Text>
          </View>
          <View style={styles.nutritionStatDivider} />
          <View style={styles.nutritionStatItem}>
            <Text style={styles.nutritionStatValue}>{selectedDate}</Text>
            <Text style={styles.nutritionStatLabel}>
              {t('mealsPage.dateLabel', { defaultValue: 'Date' })}
            </Text>
          </View>
        </View>
      </Card>

      {/* Date Picker */}
      <Card style={styles.datePickerCard}>
        <View style={styles.datePickerInner}>
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
            <Text style={styles.dateInput}>{selectedDate}</Text>
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
      </Card>

      {/* Section title */}
      {filteredMeals.length > 0 && (
        <Text style={styles.sectionTitle}>
          {t('mealsPage.mealSchedule', { defaultValue: 'Meal Schedule' })}
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title={t('mealsPage.title', { defaultValue: 'Meals' })}
        showBack
        rightActionIcon="add"
        onRightActionPress={handleCreate}
      />

      <Pressable
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 16, marginBottom: 8, backgroundColor: '#E8C27E20', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 }}
        onPress={() => navigation.navigate('MealPlan')}
      >
        <Ionicons name="calendar-outline" size={18} color="#E8A030" />
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#E8A030' }}>
          {t('mealPlan.title', { defaultValue: 'Meal Plan' })}
        </Text>
        <Ionicons name="chevron-forward" size={16} color="#E8A030" style={{ marginLeft: 'auto' }} />
      </Pressable>

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={tokens.colors.semantic.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            onPress={() => loadMeals()}
            accessibilityRole="button"
            accessibilityLabel="Retry"
            style={styles.retryBtn}
          >
            <Text style={styles.retryBtnText}>{t('common.retry', { defaultValue: 'Retry' })}</Text>
          </Pressable>
        </View>
      )}

      {filteredMeals.length === 0 && !error ? (
        <View style={{ flex: 1 }}>
          {listHeaderComponent()}
          <EmptyState icon="restaurant-outline" message={t('mealsPage.empty', { defaultValue: 'No meals found' })} />
        </View>
      ) : (
        <FlatList
          data={filteredMeals}
          renderItem={renderMeal}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          ListHeaderComponent={listHeaderComponent}
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
                      style={styles.input}
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
                    style={styles.textInput}
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
                    style={[styles.textInput, styles.textArea]}
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
                      style={styles.textInput}
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
                    style={[styles.textInput, styles.textArea]}
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
  list: {
    padding: tokens.space.xl,
  },
  fab: {
    position: 'absolute',
    right: tokens.space.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8C27E',
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadow.elevated,
  },

  // Nutrition Summary Card
  nutritionCard: {
    marginBottom: tokens.space.lg,
  },
  nutritionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.space.lg,
  },
  nutritionTitle: {
    fontSize: tokens.type.h3.fontSize,
    fontWeight: '600',
    color: '#2E3A59',
  },
  nutritionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8C27E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutritionStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  nutritionStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  nutritionStatValue: {
    fontSize: tokens.type.h2.fontSize,
    fontWeight: '600',
    color: '#2E3A59',
  },
  nutritionStatLabel: {
    fontSize: tokens.type.caption.fontSize,
    color: '#5A6B8C',
    marginTop: tokens.space.xs,
  },
  nutritionStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(191,215,234,0.3)',
  },

  // Date Picker
  datePickerCard: {
    marginBottom: tokens.space['2xl'],
  },
  datePickerInner: {},
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

  // Section title
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E3A59',
    marginBottom: tokens.space.lg,
    paddingHorizontal: 1,
  },

  // Meal Card
  card: {
    marginBottom: tokens.space.md,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.space.lg,
  },
  mealIconContainer: {
    width: 48,
    height: 48,
    borderRadius: tokens.radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  mealEmoji: {
    fontSize: 24,
  },
  mealInfo: {
    flex: 1,
    minWidth: 0,
  },
  mealTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  mealName: {
    fontSize: tokens.type.body.fontSize,
    fontWeight: '600',
    color: '#2E3A59',
  },
  completedBadge: {
    paddingHorizontal: tokens.space.sm,
    paddingVertical: 2,
    borderRadius: tokens.radius.pill,
    backgroundColor: '#DFF4EC',
  },
  completedBadgeText: {
    fontSize: tokens.type.caption.fontSize,
    fontWeight: '500',
    color: '#2E3A59',
  },
  mealTypeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
    marginBottom: tokens.space.xs,
  },
  mealTypeBadge: {
    paddingHorizontal: tokens.space.sm,
    paddingVertical: 2,
    borderRadius: tokens.radius.pill,
  },
  mealTypeText: {
    fontSize: tokens.type.caption.fontSize,
    fontWeight: '600',
  },
  mealTime: {
    fontSize: tokens.type.caption.fontSize,
    color: '#8C9BB5',
  },
  description: {
    fontSize: tokens.type.body.fontSize,
    color: '#5A6B8C',
    lineHeight: 18,
    marginBottom: tokens.space.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.xs,
    marginBottom: tokens.space.xs,
  },
  detailLabel: {
    fontSize: tokens.type.caption.fontSize,
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.text.secondary,
  },
  detailValue: {
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.text.primary,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.space.xs,
    padding: tokens.space.sm,
    backgroundColor: tokens.colors.surface.secondary,
    borderRadius: tokens.radius.md,
  },
  notesText: {
    flex: 1,
    fontSize: tokens.type.sub.fontSize,
    color: tokens.colors.text.secondary,
    lineHeight: 16,
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
    gap: tokens.space.xs,
  },
  editButtonText: {
    color: tokens.colors.accent.blue,
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.typography.fontWeight.medium,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.space.xs,
    paddingHorizontal: tokens.space.sm,
    gap: tokens.space.xs,
  },
  deleteBtnText: {
    color: tokens.colors.semantic.error,
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.typography.fontWeight.medium,
  },

  // Error
  errorContainer: {
    padding: tokens.space['2xl'],
    alignItems: 'center',
  },
  errorText: {
    color: tokens.colors.text.secondary,
    marginTop: tokens.space.md,
    textAlign: 'center',
    fontSize: tokens.type.body.fontSize,
  },
  retryBtn: {
    marginTop: tokens.space.lg,
    paddingHorizontal: tokens.space['2xl'],
    paddingVertical: tokens.space.md,
    backgroundColor: tokens.colors.accent.blue,
    borderRadius: tokens.radius.md,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: tokens.type.body.fontSize,
  },

  // Modal
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
    backgroundColor: tokens.colors.card.base,
  },
  textInput: {
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
    backgroundColor: '#E8C27E',
  },
  saveButtonText: {
    color: tokens.colors.text.white,
    fontSize: tokens.type.body.fontSize,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
});
