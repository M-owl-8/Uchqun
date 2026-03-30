import React, { useState, useEffect } from 'react';
import {
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { teacherService } from '../../../services/teacherService';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../context/AuthContext';
import tokens from '../../../styles/tokens';
import { buildServicesList } from './constants';

const INITIAL_FORM_DATA = (user, t) => ({
  parentId: '',
  childId: '',
  teacher: user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : t('activitiesPage.teacher', { defaultValue: 'Teacher' }),
  skill: '',
  goal: '',
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
  tasks: [''],
  methods: '',
  progress: '',
  observation: '',
  services: [],
});

export default function ActivityForm({ visible, editingActivity, onSubmit, onClose }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const SERVICES_LIST = buildServicesList(t);

  const [parents, setParents] = useState([]);
  const [children, setChildren] = useState([]);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA(user, t));

  // Load parents on mount
  useEffect(() => {
    if (visible) {
      loadParents();
    }
  }, [visible]);

  // Populate form when editing or creating
  useEffect(() => {
    if (!visible) return;

    if (editingActivity) {
      populateEditForm(editingActivity);
    } else {
      populateCreateForm();
    }
  }, [visible, editingActivity]);

  const loadParents = async () => {
    try {
      const parentsList = await teacherService.getParents();
      setParents(Array.isArray(parentsList) ? parentsList : []);
      return Array.isArray(parentsList) ? parentsList : [];
    } catch (error) {
      console.error('Error loading parents:', error);
      setParents([]);
      return [];
    }
  };

  const loadChildrenForParent = async (parentId) => {
    try {
      const parentsList = await teacherService.getParents();
      const selectedParent = parentsList.find(p => p.id === parentId);
      if (selectedParent && selectedParent.children && Array.isArray(selectedParent.children)) {
        setChildren(selectedParent.children);
        return selectedParent.children;
      } else {
        setChildren([]);
        return [];
      }
    } catch (error) {
      console.error('Error loading children for parent:', error);
      setChildren([]);
      return [];
    }
  };

  const populateCreateForm = async () => {
    const parentsList = await loadParents();
    const firstParent = parentsList.length > 0 ? parentsList[0] : null;
    const firstChild = firstParent && firstParent.children && firstParent.children.length > 0
      ? firstParent.children[0].id : '';

    const today = new Date().toISOString().split('T')[0];
    const threeMonthsLater = new Date();
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
    const endDateDefault = threeMonthsLater.toISOString().split('T')[0];

    setFormData({
      parentId: firstParent ? firstParent.id : '',
      childId: firstChild,
      teacher: user?.firstName && user?.lastName
        ? `${user.firstName} ${user.lastName}`
        : t('activitiesPage.teacher', { defaultValue: 'Teacher' }),
      skill: '',
      goal: '',
      startDate: today,
      endDate: endDateDefault,
      tasks: [''],
      methods: '',
      progress: '',
      observation: '',
      services: [],
    });

    if (firstParent) {
      await loadChildrenForParent(firstParent.id);
    }
  };

  const populateEditForm = async (activity) => {
    const parentsList = await loadParents();
    let parentId = '';

    if (activity.child && activity.child.id) {
      const parent = parentsList.find(p =>
        p.children && p.children.some(c => c.id === activity.child.id)
      );
      if (parent) {
        parentId = parent.id;
        await loadChildrenForParent(parent.id);
      }
    }

    setFormData({
      parentId,
      childId: activity.childId || '',
      teacher: activity.teacher || (user?.firstName && user?.lastName
        ? `${user.firstName} ${user.lastName}`
        : t('activitiesPage.teacher', { defaultValue: 'Teacher' })),
      skill: activity.skill || '',
      goal: activity.goal || '',
      startDate: activity.startDate ? activity.startDate.split('T')[0] : new Date().toISOString().split('T')[0],
      endDate: activity.endDate ? activity.endDate.split('T')[0] : '',
      tasks: Array.isArray(activity.tasks) && activity.tasks.length > 0 ? activity.tasks : [''],
      methods: activity.methods || '',
      progress: activity.progress || '',
      observation: activity.observation || '',
      services: Array.isArray(activity.services) ? activity.services : [],
    });
  };

  const handleSave = () => {
    // Validation
    if (!formData.childId) {
      Alert.alert(
        t('common.error', { defaultValue: 'Error' }),
        t('activitiesPage.selectChildError', { defaultValue: 'Bolani tanlang' })
      );
      return;
    }
    if (!formData.skill || !formData.goal || !formData.startDate || !formData.endDate) {
      Alert.alert(
        t('common.error', { defaultValue: 'Error' }),
        t('activitiesPage.requiredFieldsError', {
          defaultValue: 'Ko\'nikma, maqsad, boshlanish va tugash sanalari to\'ldirilishi shart',
        })
      );
      return;
    }

    // Build payload
    const payload = {
      childId: formData.childId,
      teacher: formData.teacher,
      skill: formData.skill,
      goal: formData.goal,
      startDate: formData.startDate,
      endDate: formData.endDate,
      tasks: formData.tasks.filter(task => task && task.trim()),
      methods: formData.methods || undefined,
      progress: formData.progress || undefined,
      observation: formData.observation || undefined,
      services: formData.services,
      // Backward compatibility with older backend versions
      title: formData.skill,
      description: formData.goal,
      type: 'Learning',
      date: formData.startDate,
      duration: 30,
    };

    onSubmit(payload);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingActivity
                  ? t('activitiesPage.editTitle', { defaultValue: 'Edit Activity' })
                  : t('activitiesPage.createTitle', { defaultValue: 'Create Activity' })
                }
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={tokens.colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {/* Parent Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {t('activitiesPage.parent', { defaultValue: 'Ota-ona' })}
                </Text>
                <View style={styles.pickerContainer}>
                  <ScrollView style={styles.pickerScrollView} nestedScrollEnabled>
                    {parents.map((parent) => (
                      <Pressable
                        key={parent.id}
                        style={[
                          styles.pickerOption,
                          formData.parentId === parent.id && styles.pickerOptionSelected,
                        ]}
                        onPress={() => {
                          setFormData(prev => ({ ...prev, parentId: parent.id, childId: '' }));
                          loadChildrenForParent(parent.id);
                        }}
                      >
                        <Text style={[
                          styles.pickerOptionText,
                          formData.parentId === parent.id && styles.pickerOptionTextSelected,
                        ]}>
                          {parent.firstName} {parent.lastName}
                        </Text>
                        {formData.parentId === parent.id && (
                          <Ionicons name="checkmark" size={20} color={tokens.colors.accent.blue} />
                        )}
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </View>

              {/* Child Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {t('activitiesPage.child', { defaultValue: 'Bola' })}
                </Text>
                {formData.parentId && children.length > 0 ? (
                  <View style={styles.pickerContainer}>
                    <ScrollView style={styles.pickerScrollView} nestedScrollEnabled>
                      {children.map((child) => (
                        <Pressable
                          key={child.id}
                          style={[
                            styles.pickerOption,
                            formData.childId === child.id && styles.pickerOptionSelected,
                          ]}
                          onPress={() => setFormData(prev => ({ ...prev, childId: child.id }))}
                        >
                          <Text style={[
                            styles.pickerOptionText,
                            formData.childId === child.id && styles.pickerOptionTextSelected,
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
                ) : formData.parentId ? (
                  <Text style={styles.helperText}>
                    {t('activitiesPage.noChildren', { defaultValue: 'Bu ota-onada bolalar yo\'q' })}
                  </Text>
                ) : (
                  <Text style={styles.helperText}>
                    {t('activitiesPage.selectParentFirst', { defaultValue: 'Avval ota-onani tanlang' })}
                  </Text>
                )}
              </View>

              {/* Skill */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {t('activitiesPage.formSkill', { defaultValue: 'Ko\'nikma' })}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('activitiesPage.formSkillPlaceholder', { defaultValue: 'Masalan: O\'z-o\'ziga xizmat ko\'rsatish ko\'nikmalari' })}
                  placeholderTextColor={tokens.colors.text.tertiary}
                  value={formData.skill}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, skill: text }))}
                />
              </View>

              {/* Goal */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {t('activitiesPage.formGoal', { defaultValue: 'Maqsad' })}
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={t('activitiesPage.formGoalPlaceholder', { defaultValue: 'Maqsadni batafsil yozing' })}
                  placeholderTextColor={tokens.colors.text.tertiary}
                  value={formData.goal}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, goal: text }))}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Dates */}
              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>
                    {t('activitiesPage.formStartDate', { defaultValue: 'Boshlanish' })}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={tokens.colors.text.tertiary}
                    value={formData.startDate}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, startDate: text }))}
                  />
                </View>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>
                    {t('activitiesPage.formEndDate', { defaultValue: 'Tugash' })}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={tokens.colors.text.tertiary}
                    value={formData.endDate}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, endDate: text }))}
                  />
                </View>
              </View>

              {/* Tasks */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {t('activitiesPage.formTasks', { defaultValue: 'Vazifalar' })}
                </Text>
                {formData.tasks.map((task, index) => (
                  <View key={index} style={styles.taskRow}>
                    <TextInput
                      style={[styles.input, styles.taskInput]}
                      placeholder={`${t('activitiesPage.formTask', { defaultValue: 'Vazifa' })} ${index + 1}`}
                      placeholderTextColor={tokens.colors.text.tertiary}
                      value={task}
                      onChangeText={(text) => {
                        const newTasks = [...formData.tasks];
                        newTasks[index] = text;
                        setFormData(prev => ({ ...prev, tasks: newTasks }));
                      }}
                    />
                    {formData.tasks.length > 1 && (
                      <TouchableOpacity
                        onPress={() => {
                          const newTasks = formData.tasks.filter((_, i) => i !== index);
                          setFormData(prev => ({ ...prev, tasks: newTasks }));
                        }}
                        style={styles.removeTaskButton}
                      >
                        <Ionicons name="close-circle" size={24} color={tokens.colors.semantic.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                <TouchableOpacity
                  onPress={() => setFormData(prev => ({ ...prev, tasks: [...prev.tasks, ''] }))}
                  style={styles.addTaskButton}
                >
                  <Ionicons name="add-circle-outline" size={20} color={tokens.colors.accent.blue} />
                  <Text style={styles.addTaskText}>
                    {t('activitiesPage.addTask', { defaultValue: 'Vazifa qo\'shish' })}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Methods */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {t('activitiesPage.formMethods', { defaultValue: 'Usullar' })}
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={t('activitiesPage.formMethodsPlaceholder', { defaultValue: 'Qo\'llaniladigan usullarni yozing' })}
                  placeholderTextColor={tokens.colors.text.tertiary}
                  value={formData.methods}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, methods: text }))}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Progress */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {t('activitiesPage.formProgress', { defaultValue: 'Jarayon/Taraqqiyot' })}
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={t('activitiesPage.formProgressPlaceholder', { defaultValue: 'Jarayon va taraqqiyotni yozing' })}
                  placeholderTextColor={tokens.colors.text.tertiary}
                  value={formData.progress}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, progress: text }))}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Observation */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {t('activitiesPage.formObservation', { defaultValue: 'Kuzatish' })}
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={t('activitiesPage.formObservationPlaceholder', { defaultValue: 'Kuzatuvlarni yozing' })}
                  placeholderTextColor={tokens.colors.text.tertiary}
                  value={formData.observation}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, observation: text }))}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Services */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {t('activitiesPage.formServices', { defaultValue: 'Xizmatlar' })}
                </Text>
                <View style={styles.servicesGrid}>
                  {SERVICES_LIST.map((service) => (
                    <Pressable
                      key={service.key}
                      style={[
                        styles.serviceCheckbox,
                        formData.services.includes(service.key) && styles.serviceCheckboxSelected,
                      ]}
                      onPress={() => {
                        if (formData.services.includes(service.key)) {
                          setFormData(prev => ({
                            ...prev,
                            services: prev.services.filter((s) => s !== service.key),
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            services: [...prev.services, service.key],
                          }));
                        }
                      }}
                    >
                      <Ionicons
                        name={formData.services.includes(service.key) ? 'checkbox' : 'checkbox-outline'}
                        size={20}
                        color={formData.services.includes(service.key) ? tokens.colors.accent.blue : tokens.colors.text.secondary}
                      />
                      <Text style={[
                        styles.serviceCheckboxText,
                        formData.services.includes(service.key) && styles.serviceCheckboxTextSelected,
                      ]}>
                        {service.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>
                  {t('activitiesPage.cancel', { defaultValue: 'Bekor qilish' })}
                </Text>
              </Pressable>
              <Pressable style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>
                  {editingActivity
                    ? t('activitiesPage.update', { defaultValue: 'Yangilash' })
                    : t('activitiesPage.create', { defaultValue: 'Yaratish' })
                  }
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  helperText: {
    fontSize: tokens.type.sub.fontSize,
    color: tokens.colors.text.secondary,
    fontStyle: 'italic',
    padding: tokens.space.sm,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokens.space.xs,
    gap: tokens.space.xs,
  },
  taskInput: {
    flex: 1,
  },
  removeTaskButton: {
    padding: tokens.space.xs,
  },
  addTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: tokens.space.xs,
    padding: tokens.space.sm,
  },
  addTaskText: {
    fontSize: tokens.type.sub.fontSize,
    color: tokens.colors.accent.blue,
    marginLeft: tokens.space.xs,
    fontWeight: tokens.typography.fontWeight.medium,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space.sm,
  },
  serviceCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: tokens.space.sm,
    borderWidth: 1,
    borderColor: tokens.colors.border.medium,
    borderRadius: tokens.radius.sm,
    minWidth: '45%',
  },
  serviceCheckboxSelected: {
    backgroundColor: tokens.colors.accent[50],
    borderColor: tokens.colors.accent.blue,
  },
  serviceCheckboxText: {
    fontSize: tokens.type.sub.fontSize,
    color: tokens.colors.text.primary,
    marginLeft: tokens.space.xs,
  },
  serviceCheckboxTextSelected: {
    color: tokens.colors.accent.blue,
    fontWeight: tokens.typography.fontWeight.medium,
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
    backgroundColor: tokens.colors.semantic.success,
  },
  saveButtonText: {
    color: tokens.colors.text.white,
    fontSize: tokens.type.body.fontSize,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
});
