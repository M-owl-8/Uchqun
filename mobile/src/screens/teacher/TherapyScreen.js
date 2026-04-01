import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View, Text, Modal, TextInput, TouchableOpacity, Pressable, Alert, SafeAreaView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { teacherService } from '../../services/teacherService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import Card from '../../components/common/Card';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import tokens from '../../styles/tokens';

const THERAPY_TYPES = ['speech', 'occupational', 'physical', 'behavioral', 'other'];

export function TherapyScreen() {
  const route = useRoute();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { childId, childName } = route.params || {};

  // Bottom nav height + safe area + padding
  const BOTTOM_NAV_HEIGHT = 75;
  const bottomPadding = BOTTOM_NAV_HEIGHT + insets.bottom + 16;
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [formData, setFormData] = useState({ type: 'speech', date: '', duration: '', notes: '' });

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await teacherService.getTherapySessions(childId);
      setSessions(data);
    } catch (error) {
      if (__DEV__) console.error('Error loading therapy sessions:', error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({ type: 'speech', date: new Date().toISOString().split('T')[0], duration: '', notes: '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.date || !formData.duration) {
      Alert.alert(t('common.error', { defaultValue: 'Error' }), t('therapy.dateDurationRequired', { defaultValue: 'Date and duration are required.' }));
      return;
    }
    setSaving(true);
    try {
      await teacherService.createTherapySession(childId, {
        ...formData,
        duration: parseInt(formData.duration, 10),
      });
      setShowModal(false);
      loadSessions();
    } catch (error) {
      if (__DEV__) console.error('Error creating therapy session:', error);
      Alert.alert(t('common.error', { defaultValue: 'Error' }), t('therapy.createFailed', { defaultValue: 'Failed to create session.' }));
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (d) => {
    try { return new Date(d).toLocaleDateString(); } catch { return d; }
  };

  const renderSession = ({ item }) => (
    <Card>
      <View style={styles.sessionHeader}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{(item.type || '').charAt(0).toUpperCase() + (item.type || '').slice(1)}</Text>
        </View>
        <Text style={styles.sessionDate}>{formatDate(item.date || item.createdAt)}</Text>
      </View>
      {item.duration != null && (
        <Text style={styles.sessionDuration}>{item.duration} {t('therapy.minutes', { defaultValue: 'minutes' })}</Text>
      )}
      {item.notes ? <Text style={styles.sessionNotes}>{item.notes}</Text> : null}
    </Card>
  );

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title={t('therapy.title', { defaultValue: 'Therapy' })} />
      {sessions.length === 0 ? (
        <EmptyState icon="bulb-outline" message={t('therapy.noSessions', { defaultValue: 'No recommendations found' })} />
      ) : (
        <FlatList
          data={sessions}
          renderItem={renderSession}
          keyExtractor={(item) => (item.id || item._id || Math.random()).toString()}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPadding }]}
          refreshing={loading}
          onRefresh={loadSessions}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={handleCreate}>
        <Ionicons name="add" size={28} color={tokens.colors.text.white} />
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('therapy.newSession', { defaultValue: 'New Session' })}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={tokens.colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>{t('therapy.type', { defaultValue: 'Type' })}</Text>
            <View style={styles.typeSelector}>
              {THERAPY_TYPES.map((t) => (
                <Pressable
                  key={t}
                  style={[styles.typeOption, formData.type === t && styles.typeOptionActive]}
                  onPress={() => setFormData({ ...formData, type: t })}
                >
                  <Text style={[styles.typeOptionText, formData.type === t && styles.typeOptionTextActive]}>
                    {t(`therapy.types.${t}`, { defaultValue: t.charAt(0).toUpperCase() + t.slice(1) })}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.inputLabel}>{t('therapy.date', { defaultValue: 'Date' })}</Text>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              accessibilityRole="button"
              accessibilityLabel={t('common.selectDate', { defaultValue: 'Select date' })}
              style={{ borderWidth: 1, borderColor: tokens.colors.border.medium, borderRadius: tokens.radius.sm, padding: tokens.space.md }}
            >
              <Text style={{ fontSize: tokens.type.body.fontSize, color: formData.date ? tokens.colors.text.primary : tokens.colors.text.muted }}>
                {formData.date || t('common.selectDate', { defaultValue: 'Select date' })}
              </Text>
            </Pressable>
            {showDatePicker && (
              <DateTimePicker
                value={formData.date ? new Date(formData.date) : new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    const formatted = selectedDate.toISOString().split('T')[0];
                    setFormData({ ...formData, date: formatted });
                  }
                }}
              />
            )}

            <Text style={styles.inputLabel}>{t('therapy.duration', { defaultValue: 'Duration (minutes)' })}</Text>
            <TextInput
              style={styles.input}
              value={formData.duration}
              onChangeText={(v) => setFormData({ ...formData, duration: v })}
              placeholder="e.g. 30"
              placeholderTextColor={tokens.colors.text.tertiary}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>{t('therapy.notes', { defaultValue: 'Notes' })}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.notes}
              onChangeText={(v) => setFormData({ ...formData, notes: v })}
              placeholder={t('therapy.notesPlaceholder', { defaultValue: 'Optional notes...' })}
              placeholderTextColor={tokens.colors.text.tertiary}
              multiline
            />

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelButton} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelButtonText}>{t('common.cancel', { defaultValue: 'Cancel' })}</Text>
              </Pressable>
              <Pressable style={[styles.saveButton, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                <Text style={styles.saveButtonText}>{saving ? t('common.saving', { defaultValue: 'Saving...' }) : t('common.save', { defaultValue: 'Save' })}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.colors.background.primary },
  list: { padding: tokens.space.md, paddingBottom: 100 },
  fab: {
    position: 'absolute', bottom: 90, right: tokens.space.md,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: tokens.colors.accent.blue,
    alignItems: 'center', justifyContent: 'center',
    ...tokens.shadow.elevated,
  },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.space.xs },
  typeBadge: {
    backgroundColor: tokens.colors.accent[50], borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.space.sm, paddingVertical: 2,
  },
  typeBadgeText: { fontSize: tokens.type.caption.fontSize, color: tokens.colors.accent.blue, fontWeight: tokens.typography.fontWeight.semibold },
  sessionDate: { fontSize: tokens.type.sub.fontSize, color: tokens.colors.text.secondary },
  sessionDuration: { fontSize: tokens.type.sub.fontSize, color: tokens.colors.text.secondary, marginBottom: tokens.space.xs },
  sessionNotes: { fontSize: tokens.type.sub.fontSize, color: tokens.colors.text.secondary, marginTop: tokens.space.xs },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: {
    backgroundColor: tokens.colors.card.base, borderRadius: tokens.radius.lg,
    padding: tokens.space.lg, width: '90%', maxHeight: '85%',
    ...tokens.shadow.elevated,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.space.md },
  modalTitle: { fontSize: tokens.type.h3.fontSize, fontWeight: tokens.typography.fontWeight.bold, color: tokens.colors.text.primary },
  inputLabel: { fontSize: tokens.type.sub.fontSize, fontWeight: tokens.typography.fontWeight.medium, color: tokens.colors.text.secondary, marginBottom: tokens.space.xs, marginTop: tokens.space.sm },
  input: {
    borderWidth: 1, borderColor: tokens.colors.border.medium, borderRadius: tokens.radius.sm,
    padding: tokens.space.md, fontSize: tokens.type.body.fontSize, color: tokens.colors.text.primary,
    backgroundColor: tokens.colors.card.base,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  typeSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  typeOption: {
    borderWidth: 1, borderColor: tokens.colors.border.medium, borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.space.sm, paddingVertical: 6,
  },
  typeOptionActive: { backgroundColor: tokens.colors.accent.blue, borderColor: tokens.colors.accent.blue },
  typeOptionText: { fontSize: tokens.type.sub.fontSize, color: tokens.colors.text.secondary },
  typeOptionTextActive: { color: tokens.colors.text.white, fontWeight: tokens.typography.fontWeight.semibold },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: tokens.space.md },
  cancelButton: { paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.sm, marginRight: tokens.space.md },
  cancelButtonText: { color: tokens.colors.text.secondary, fontSize: tokens.type.body.fontSize, fontWeight: tokens.typography.fontWeight.medium },
  saveButton: {
    backgroundColor: tokens.colors.accent.blue, paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.sm, borderRadius: tokens.radius.sm,
  },
  saveButtonText: { color: tokens.colors.text.white, fontSize: tokens.type.body.fontSize, fontWeight: tokens.typography.fontWeight.semibold },
});
