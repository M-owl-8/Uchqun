import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { teacherService } from '../../services/teacherService';
import { api } from '../../services/api';
import { extractResponseData } from '../../utils/responseHandler';
import Card from '../../components/common/Card';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import tokens from '../../styles/tokens';

export function TeacherChildProfileScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { childId = null, childData = null } = route?.params || {};

  const BOTTOM_NAV_HEIGHT = 75;
  const bottomPadding = BOTTOM_NAV_HEIGHT + insets.bottom + 16;

  const locale = {
    uz: 'uz-UZ',
    ru: 'ru-RU',
    en: 'en-US',
  }[i18n.language] || 'en-US';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [child, setChild] = useState(childData || null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeDateField, setActiveDateField] = useState(null);

  // Editable form fields
  const [form, setForm] = useState({
    medicalDiagnosis: '',
    institutionStartDate: '',
    fatherFullName: '',
    fatherDOB: '',
    fatherOccupation: '',
    motherFullName: '',
    motherDOB: '',
    motherOccupation: '',
    address: '',
    contactPhone: '',
    childDescription: '',
    expectedOutcomes: '',
  });

  const loadChild = useCallback(async () => {
    if (!childId) return;
    try {
      setLoading(true);
      const response = await api.get(`/child/${childId}`);
      const data = extractResponseData(response);
      if (data) {
        setChild(data);
        populateForm(data);
      }
    } catch (error) {
      if (__DEV__) console.error('Error loading child:', error);
    } finally {
      setLoading(false);
    }
  }, [childId]);

  const populateForm = (data) => {
    setForm({
      medicalDiagnosis: data.medicalDiagnosis || '',
      institutionStartDate: data.institutionStartDate ? data.institutionStartDate.split('T')[0] : '',
      fatherFullName: data.fatherFullName || '',
      fatherDOB: data.fatherDOB ? data.fatherDOB.split('T')[0] : '',
      fatherOccupation: data.fatherOccupation || '',
      motherFullName: data.motherFullName || '',
      motherDOB: data.motherDOB ? data.motherDOB.split('T')[0] : '',
      motherOccupation: data.motherOccupation || '',
      address: data.address || '',
      contactPhone: data.contactPhone || '',
      childDescription: data.childDescription || '',
      expectedOutcomes: data.expectedOutcomes || '',
    });
  };

  useEffect(() => {
    if (childData) {
      populateForm(childData);
      setLoading(false);
    } else if (childId) {
      loadChild();
    } else {
      setLoading(false);
    }
  }, [childId, childData, loadChild]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const calculateDuration = (dateString) => {
    if (!dateString) return '';
    const start = new Date(dateString);
    if (isNaN(start.getTime())) return '';
    const now = new Date();
    let years = now.getFullYear() - start.getFullYear();
    const monthDiff = now.getMonth() - start.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < start.getDate())) {
      years--;
    }
    return `${years} ${t('childProfile.years', { defaultValue: 'years' })}`;
  };

  const updateFormField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = { ...form };
      // Convert empty strings to null for date fields
      if (!payload.institutionStartDate) payload.institutionStartDate = null;
      if (!payload.fatherDOB) payload.fatherDOB = null;
      if (!payload.motherDOB) payload.motherDOB = null;

      await teacherService.updateChild(childId, payload);
      Alert.alert(
        t('common.success', { defaultValue: 'Success' }),
        t('childProfile.profileUpdated', { defaultValue: 'Profile updated' })
      );
      setIsEditing(false);
      await loadChild();
    } catch (error) {
      if (__DEV__) console.error('Error updating child:', error);
      Alert.alert(
        t('common.error', { defaultValue: 'Error' }),
        t('childProfile.profileUpdateError', { defaultValue: 'Failed to update profile' })
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (child) {
      populateForm(child);
    }
    setIsEditing(false);
  };

  if (!childId && !childData) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader title={t('childProfile.title', { defaultValue: 'Child Profile' })} showBack />
        <View style={styles.centerContent}>
          <EmptyState
            icon="person-outline"
            title={t('child.errorNotFound', { defaultValue: 'Child not found' })}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!child) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader title={t('childProfile.title', { defaultValue: 'Child Profile' })} showBack />
        <View style={styles.centerContent}>
          <EmptyState
            icon="person-outline"
            title={t('child.errorNotFound', { defaultValue: 'Child not found' })}
          />
        </View>
      </SafeAreaView>
    );
  }

  const childName = `${child.firstName || ''} ${child.lastName || ''}`.trim();

  // Read-only view
  if (!isEditing) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader
          title={childName || t('childProfile.title', { defaultValue: 'Child Profile' })}
          showBack
          rightAction={
            <Pressable onPress={() => setIsEditing(true)} style={styles.editButton}>
              <Ionicons name="create-outline" size={22} color={tokens.colors.accent.blue} />
              <Text style={styles.editButtonText}>
                {t('childProfile.editProfile', { defaultValue: 'Edit' })}
              </Text>
            </Pressable>
          }
        />
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Basic Info */}
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person" size={24} color={tokens.colors.accent.blue} />
              <Text style={styles.sectionTitle} allowFontScaling={true}>
                {t('child.basicInfo', { defaultValue: 'Basic Information' })}
              </Text>
            </View>
            <View style={styles.infoGrid}>
              <ReadOnlyRow
                label={t('childProfile.dateOfBirth', { defaultValue: 'Date of Birth' })}
                value={child.dateOfBirth ? formatDate(child.dateOfBirth) : null}
                icon="calendar-outline"
                t={t}
              />
              <ReadOnlyRow
                label={t('childProfile.gender', { defaultValue: 'Gender' })}
                value={child.gender}
                icon="male-female-outline"
                t={t}
              />
              <ReadOnlyRow
                label={t('childProfile.school', { defaultValue: 'School' })}
                value={child.school}
                icon="school-outline"
                t={t}
              />
              <ReadOnlyRow
                label={t('childProfile.teacher', { defaultValue: 'Teacher' })}
                value={child.teacher}
                icon="person-outline"
                t={t}
              />
            </View>
          </Card>

          {/* Medical Information */}
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="medkit" size={24} color={tokens.colors.semantic.error} />
              <Text style={styles.sectionTitle} allowFontScaling={true}>
                {t('childProfile.medicalInfo', { defaultValue: 'Medical Information' })}
              </Text>
            </View>
            <View style={styles.infoGrid}>
              <ReadOnlyRow
                label={t('childProfile.medicalDiagnosis', { defaultValue: 'Diagnosis' })}
                value={child.medicalDiagnosis}
                icon="document-text-outline"
                color={tokens.colors.semantic.error}
                t={t}
              />
              <ReadOnlyRow
                label={t('childProfile.disabilityType', { defaultValue: 'Disability Type' })}
                value={child.disabilityType}
                icon="medical-outline"
                color={tokens.colors.semantic.warning}
                t={t}
              />
              <ReadOnlyRow
                label={t('childProfile.specialNeeds', { defaultValue: 'Special Needs' })}
                value={child.specialNeeds}
                icon="heart-outline"
                color={tokens.colors.semantic.error}
                t={t}
              />
            </View>
          </Card>

          {/* Institution Info */}
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="business" size={24} color={tokens.colors.accent.blue} />
              <Text style={styles.sectionTitle} allowFontScaling={true}>
                {t('childProfile.institutionDuration', { defaultValue: 'Institution Duration' })}
              </Text>
            </View>
            <View style={styles.infoGrid}>
              <ReadOnlyRow
                label={t('childProfile.institutionStartDate', { defaultValue: 'Admission Date' })}
                value={child.institutionStartDate ? formatDate(child.institutionStartDate) : null}
                icon="calendar-outline"
                t={t}
              />
              {child.institutionStartDate && (
                <ReadOnlyRow
                  label={t('childProfile.institutionDuration', { defaultValue: 'Duration' })}
                  value={calculateDuration(child.institutionStartDate)}
                  icon="time-outline"
                  t={t}
                />
              )}
            </View>
          </Card>

          {/* Father Info */}
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="man" size={24} color={tokens.colors.accent.blue} />
              <Text style={styles.sectionTitle} allowFontScaling={true}>
                {t('childProfile.fatherInfo', { defaultValue: 'Father' })}
              </Text>
            </View>
            <View style={styles.infoGrid}>
              <ReadOnlyRow
                label={t('childProfile.fatherFullName', { defaultValue: 'Full Name' })}
                value={child.fatherFullName}
                icon="person-outline"
                t={t}
              />
              <ReadOnlyRow
                label={t('childProfile.fatherDOB', { defaultValue: 'Date of Birth' })}
                value={child.fatherDOB ? formatDate(child.fatherDOB) : null}
                icon="calendar-outline"
                t={t}
              />
              <ReadOnlyRow
                label={t('childProfile.fatherOccupation', { defaultValue: 'Occupation' })}
                value={child.fatherOccupation}
                icon="briefcase-outline"
                t={t}
              />
            </View>
          </Card>

          {/* Mother Info */}
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="woman" size={24} color={tokens.colors.joy.coral} />
              <Text style={styles.sectionTitle} allowFontScaling={true}>
                {t('childProfile.motherInfo', { defaultValue: 'Mother' })}
              </Text>
            </View>
            <View style={styles.infoGrid}>
              <ReadOnlyRow
                label={t('childProfile.motherFullName', { defaultValue: 'Full Name' })}
                value={child.motherFullName}
                icon="person-outline"
                color={tokens.colors.joy.coral}
                t={t}
              />
              <ReadOnlyRow
                label={t('childProfile.motherDOB', { defaultValue: 'Date of Birth' })}
                value={child.motherDOB ? formatDate(child.motherDOB) : null}
                icon="calendar-outline"
                color={tokens.colors.joy.coral}
                t={t}
              />
              <ReadOnlyRow
                label={t('childProfile.motherOccupation', { defaultValue: 'Occupation' })}
                value={child.motherOccupation}
                icon="briefcase-outline"
                color={tokens.colors.joy.coral}
                t={t}
              />
            </View>
          </Card>

          {/* Contact Info */}
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="call" size={24} color={tokens.colors.semantic.success} />
              <Text style={styles.sectionTitle} allowFontScaling={true}>
                {t('childProfile.contactPhone', { defaultValue: 'Contact' })}
              </Text>
            </View>
            <View style={styles.infoGrid}>
              <ReadOnlyRow
                label={t('childProfile.contactPhone', { defaultValue: 'Phone Number' })}
                value={child.contactPhone}
                icon="call-outline"
                color={tokens.colors.semantic.success}
                t={t}
              />
              <ReadOnlyRow
                label={t('childProfile.address', { defaultValue: 'Address' })}
                value={child.address}
                icon="location-outline"
                color={tokens.colors.semantic.info}
                t={t}
              />
            </View>
          </Card>

          {/* Child Description */}
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle" size={24} color={tokens.colors.semantic.info} />
              <Text style={styles.sectionTitle} allowFontScaling={true}>
                {t('childProfile.childDescription', { defaultValue: 'Child Description' })}
              </Text>
            </View>
            <View style={styles.textBlock}>
              <Text style={[styles.textBlockContent, !child.childDescription && styles.mutedText]} allowFontScaling={true}>
                {child.childDescription || t('childProfile.notProvided', { defaultValue: 'Not provided' })}
              </Text>
            </View>
          </Card>

          {/* Expected Outcomes */}
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="flag" size={24} color={tokens.colors.semantic.success} />
              <Text style={styles.sectionTitle} allowFontScaling={true}>
                {t('childProfile.expectedOutcomes', { defaultValue: 'Expected Outcomes' })}
              </Text>
            </View>
            <View style={[styles.textBlock, { backgroundColor: tokens.colors.semantic.successSoft }]}>
              <Text style={[styles.textBlockContent, !child.expectedOutcomes && styles.mutedText]} allowFontScaling={true}>
                {child.expectedOutcomes || t('childProfile.notProvided', { defaultValue: 'Not provided' })}
              </Text>
            </View>
          </Card>

          {/* Assessment Button */}
          <Pressable
            style={styles.assessmentButton}
            onPress={() => navigation.navigate('ChildAssessment', {
              childId,
              childName: childName,
            })}
          >
            <Ionicons name="clipboard-outline" size={22} color="#fff" />
            <Text style={styles.assessmentButtonText}>
              {t('assessment.title', { defaultValue: 'Assessment' })}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </Pressable>

          {/* Service Plan Button */}
          <Pressable
            style={[styles.assessmentButton, { backgroundColor: '#059669' }]}
            onPress={() => navigation.navigate('ServicePlan', {
              childId,
              childName: childName,
            })}
          >
            <Ionicons name="calendar-outline" size={22} color="#fff" />
            <Text style={styles.assessmentButtonText}>
              {t('servicePlan.title', { defaultValue: 'Annual Plan' })}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Edit view
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title={t('childProfile.editProfile', { defaultValue: 'Edit Profile' })}
        showBack
        onBackPress={handleCancelEdit}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Medical Information */}
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="medkit" size={24} color={tokens.colors.semantic.error} />
              <Text style={styles.sectionTitle} allowFontScaling={true}>
                {t('childProfile.medicalInfo', { defaultValue: 'Medical Information' })}
              </Text>
            </View>
            <FormField
              label={t('childProfile.medicalDiagnosis', { defaultValue: 'Diagnosis' })}
              value={form.medicalDiagnosis}
              onChangeText={(v) => updateFormField('medicalDiagnosis', v)}
              placeholder="F-71..."
            />
          </Card>

          {/* Institution Info */}
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="business" size={24} color={tokens.colors.accent.blue} />
              <Text style={styles.sectionTitle} allowFontScaling={true}>
                {t('childProfile.institutionStartDate', { defaultValue: 'Admission Date' })}
              </Text>
            </View>
            <FormField
              label={t('childProfile.institutionStartDate', { defaultValue: 'Admission Date' })}
              value={form.institutionStartDate}
              onChangeText={(v) => updateFormField('institutionStartDate', v)}
              placeholder="YYYY-MM-DD"
              keyboardType="default"
            />
          </Card>

          {/* Father Info */}
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="man" size={24} color={tokens.colors.accent.blue} />
              <Text style={styles.sectionTitle} allowFontScaling={true}>
                {t('childProfile.fatherInfo', { defaultValue: 'Father' })}
              </Text>
            </View>
            <FormField
              label={t('childProfile.fatherFullName', { defaultValue: 'Full Name' })}
              value={form.fatherFullName}
              onChangeText={(v) => updateFormField('fatherFullName', v)}
            />
            <FormField
              label={t('childProfile.fatherDOB', { defaultValue: 'Date of Birth' })}
              value={form.fatherDOB}
              onChangeText={(v) => updateFormField('fatherDOB', v)}
              placeholder="YYYY-MM-DD"
            />
            <FormField
              label={t('childProfile.fatherOccupation', { defaultValue: 'Occupation' })}
              value={form.fatherOccupation}
              onChangeText={(v) => updateFormField('fatherOccupation', v)}
            />
          </Card>

          {/* Mother Info */}
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="woman" size={24} color={tokens.colors.joy.coral} />
              <Text style={styles.sectionTitle} allowFontScaling={true}>
                {t('childProfile.motherInfo', { defaultValue: 'Mother' })}
              </Text>
            </View>
            <FormField
              label={t('childProfile.motherFullName', { defaultValue: 'Full Name' })}
              value={form.motherFullName}
              onChangeText={(v) => updateFormField('motherFullName', v)}
            />
            <FormField
              label={t('childProfile.motherDOB', { defaultValue: 'Date of Birth' })}
              value={form.motherDOB}
              onChangeText={(v) => updateFormField('motherDOB', v)}
              placeholder="YYYY-MM-DD"
            />
            <FormField
              label={t('childProfile.motherOccupation', { defaultValue: 'Occupation' })}
              value={form.motherOccupation}
              onChangeText={(v) => updateFormField('motherOccupation', v)}
            />
          </Card>

          {/* Contact Info */}
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="call" size={24} color={tokens.colors.semantic.success} />
              <Text style={styles.sectionTitle} allowFontScaling={true}>
                {t('childProfile.contactPhone', { defaultValue: 'Contact' })}
              </Text>
            </View>
            <FormField
              label={t('childProfile.contactPhone', { defaultValue: 'Phone Number' })}
              value={form.contactPhone}
              onChangeText={(v) => updateFormField('contactPhone', v)}
              keyboardType="phone-pad"
              placeholder="+998..."
            />
            <FormField
              label={t('childProfile.address', { defaultValue: 'Address' })}
              value={form.address}
              onChangeText={(v) => updateFormField('address', v)}
              multiline
            />
          </Card>

          {/* Child Description */}
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle" size={24} color={tokens.colors.semantic.info} />
              <Text style={styles.sectionTitle} allowFontScaling={true}>
                {t('childProfile.childDescription', { defaultValue: 'Child Description' })}
              </Text>
            </View>
            <FormField
              label={t('childProfile.childDescription', { defaultValue: 'Description' })}
              value={form.childDescription}
              onChangeText={(v) => updateFormField('childDescription', v)}
              multiline
              numberOfLines={4}
            />
          </Card>

          {/* Expected Outcomes */}
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="flag" size={24} color={tokens.colors.semantic.success} />
              <Text style={styles.sectionTitle} allowFontScaling={true}>
                {t('childProfile.expectedOutcomes', { defaultValue: 'Expected Outcomes' })}
              </Text>
            </View>
            <FormField
              label={t('childProfile.expectedOutcomes', { defaultValue: 'Expected Outcomes' })}
              value={form.expectedOutcomes}
              onChangeText={(v) => updateFormField('expectedOutcomes', v)}
              multiline
              numberOfLines={4}
            />
          </Card>

          {/* Save / Cancel Buttons */}
          <View style={styles.actionButtons}>
            <Pressable
              style={styles.cancelButton}
              onPress={handleCancelEdit}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>
                {t('common.cancel', { defaultValue: 'Cancel' })}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>
                    {t('childProfile.saveProfile', { defaultValue: 'Save Profile' })}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Helper: Read-only row
function ReadOnlyRow({ label, value, icon, color = tokens.colors.accent.blue, t }) {
  const displayValue = value || t('childProfile.notProvided', { defaultValue: 'Not provided' });
  const isMuted = !value;
  return (
    <View style={styles.infoItem}>
      <View style={styles.infoItemLabelRow}>
        <Ionicons name={icon} size={16} color={color} />
        <Text style={styles.infoItemLabel} allowFontScaling={true}>{label}</Text>
      </View>
      <Text style={[styles.infoItemValue, isMuted && styles.mutedText]} allowFontScaling={true}>
        {displayValue}
      </Text>
    </View>
  );
}

// Helper: Form field
function FormField({ label, value, onChangeText, placeholder, keyboardType, multiline, numberOfLines }) {
  return (
    <View style={styles.formField}>
      <Text style={styles.formLabel} allowFontScaling={true}>{label}</Text>
      <TextInput
        style={[styles.formInput, multiline && styles.formTextArea]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || label}
        placeholderTextColor={tokens.colors.text.muted}
        keyboardType={keyboardType || 'default'}
        multiline={multiline}
        numberOfLines={numberOfLines || 1}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background.primary,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: tokens.space.lg,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.space.xl,
  },
  card: {
    marginBottom: tokens.space.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
    marginBottom: tokens.space.lg,
  },
  sectionTitle: {
    fontSize: tokens.type.h3.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.text.primary,
  },
  infoGrid: {
    gap: tokens.space.lg,
  },
  infoItem: {
    gap: tokens.space.xs,
  },
  infoItemLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.xs,
    marginBottom: tokens.space.xs / 2,
  },
  infoItemLabel: {
    fontSize: tokens.type.caption.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoItemValue: {
    fontSize: tokens.type.bodyLarge.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.text.primary,
  },
  mutedText: {
    color: tokens.colors.text.muted,
    fontStyle: 'italic',
    fontWeight: tokens.typography.fontWeight.regular,
  },
  textBlock: {
    backgroundColor: tokens.colors.surface.secondary,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.lg,
  },
  textBlockContent: {
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.primary,
    lineHeight: 22,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.xs,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.accent.blueSoft,
  },
  editButtonText: {
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.accent.blue,
  },
  // Form styles
  formField: {
    marginBottom: tokens.space.lg,
  },
  formLabel: {
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.text.secondary,
    marginBottom: tokens.space.xs,
  },
  formInput: {
    backgroundColor: tokens.colors.surface.secondary,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.primary,
    borderWidth: 1,
    borderColor: tokens.colors.border.light,
  },
  formTextArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: tokens.space.md,
    marginTop: tokens.space.md,
    marginBottom: tokens.space.xl,
  },
  cancelButton: {
    flex: 1,
    padding: tokens.space.md,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.surface.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: tokens.type.body.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.text.secondary,
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space.sm,
    padding: tokens.space.md,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.accent.blue,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: tokens.type.body.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: '#fff',
  },
  assessmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space.sm,
    padding: tokens.space.lg,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.accent.blue,
    marginBottom: tokens.space.md,
  },
  assessmentButtonText: {
    flex: 1,
    fontSize: tokens.type.body.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: '#fff',
  },
});
