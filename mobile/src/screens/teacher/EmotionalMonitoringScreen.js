import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View, Text, Modal, TextInput, TouchableOpacity, Pressable, ScrollView, Alert, SafeAreaView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { teacherService } from '../../services/teacherService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import Card from '../../components/common/Card';
import { ScreenHeader } from '../../components/teacher/ScreenHeader';
import tokens from '../../styles/tokens';

const EMOTIONAL_STATES = ['happy', 'sad', 'angry', 'anxious', 'calm', 'excited', 'tired', 'focused'];

export function EmotionalMonitoringScreen() {
  const route = useRoute();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { childId, childName } = route.params || {};

  // Bottom nav height + safe area + padding
  const BOTTOM_NAV_HEIGHT = 75;
  const bottomPadding = BOTTOM_NAV_HEIGHT + insets.bottom + 16;
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedStates, setSelectedStates] = useState([]);
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const data = await teacherService.getEmotionalRecords(childId);
      setRecords(data);
    } catch (error) {
      console.error('Error loading emotional records:', error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleState = (state) => {
    setSelectedStates((prev) =>
      prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state]
    );
  };

  const handleCreate = () => {
    setSelectedStates([]);
    setNotes('');
    setDate(new Date().toISOString().split('T')[0]);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (selectedStates.length === 0) {
      Alert.alert(t('common.error', { defaultValue: 'Error' }), t('emotional.selectState', { defaultValue: 'Please select at least one emotional state.' }));
      return;
    }
    setSaving(true);
    try {
      await teacherService.createEmotionalRecord(childId, {
        emotionalStates: selectedStates,
        notes,
        date,
      });
      setShowModal(false);
      loadRecords();
    } catch (error) {
      console.error('Error creating emotional record:', error);
      Alert.alert(t('common.error', { defaultValue: 'Error' }), t('emotional.createFailed', { defaultValue: 'Failed to create record.' }));
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (d) => {
    try {
      return new Date(d).toLocaleDateString();
    } catch {
      return d;
    }
  };

  const renderRecord = ({ item }) => {
    const states = item.emotionalStates || item.emotional_states || [];
    return (
      <Card>
        <Text style={styles.recordDate}>{formatDate(item.date || item.createdAt)}</Text>
        <View style={styles.statesRow}>
          {(Array.isArray(states) ? states : []).map((s) => (
            <View key={s} style={styles.stateBadge}>
              <Text style={styles.stateBadgeText}>{s}</Text>
            </View>
          ))}
        </View>
        {item.notes ? <Text style={styles.recordNotes}>{item.notes}</Text> : null}
      </Card>
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title={t('emotional.title', { defaultValue: 'Emotional Monitoring' })} />
      {records.length === 0 ? (
        <EmptyState icon="heart-outline" message={t('emotional.noRecords', { defaultValue: 'No emotional records found' })} />
      ) : (
        <FlatList
          data={records}
          renderItem={renderRecord}
          keyExtractor={(item) => (item.id || item._id || Math.random()).toString()}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPadding }]}
          refreshing={loading}
          onRefresh={loadRecords}
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
              <Text style={styles.modalTitle}>{t('emotional.newRecord', { defaultValue: 'New Record' })}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={tokens.colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>{t('emotional.date', { defaultValue: 'Date' })}</Text>
              <Pressable
                onPress={() => setShowDatePicker(true)}
                accessibilityRole="button"
                accessibilityLabel={t('common.selectDate', { defaultValue: 'Select date' })}
                style={{ borderWidth: 1, borderColor: tokens.colors.border.medium, borderRadius: tokens.radius.sm, padding: tokens.space.md }}
              >
                <Text style={{ fontSize: tokens.type.body.fontSize, color: date ? tokens.colors.text.primary : tokens.colors.text.muted }}>
                  {date || t('common.selectDate', { defaultValue: 'Select date' })}
                </Text>
              </Pressable>
              {showDatePicker && (
                <DateTimePicker
                  value={date ? new Date(date) : new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      setDate(selectedDate.toISOString().split('T')[0]);
                    }
                  }}
                />
              )}

              <Text style={styles.inputLabel}>{t('emotional.states', { defaultValue: 'Emotional States' })}</Text>
              <View style={styles.checkboxGrid}>
                {EMOTIONAL_STATES.map((state) => (
                  <Pressable key={state} style={styles.checkboxRow} onPress={() => toggleState(state)}>
                    <Ionicons
                      name={selectedStates.includes(state) ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={selectedStates.includes(state) ? tokens.colors.accent.blue : tokens.colors.text.tertiary}
                    />
                    <Text style={styles.checkboxLabel}>{t(`emotional.states.${state}`, { defaultValue: state.charAt(0).toUpperCase() + state.slice(1) })}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.inputLabel}>{t('emotional.notes', { defaultValue: 'Notes' })}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder={t('emotional.notesPlaceholder', { defaultValue: 'Optional notes...' })}
                placeholderTextColor={tokens.colors.text.tertiary}
                multiline
              />
            </ScrollView>

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
  recordDate: {
    fontSize: tokens.type.sub.fontSize, fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.text.secondary, marginBottom: tokens.space.xs,
  },
  statesRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: tokens.space.xs },
  stateBadge: {
    backgroundColor: tokens.colors.accent[50], borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.space.sm, paddingVertical: 2, marginRight: 6, marginBottom: 4,
  },
  stateBadgeText: { fontSize: tokens.type.caption.fontSize, color: tokens.colors.accent.blue, fontWeight: tokens.typography.fontWeight.medium },
  recordNotes: { fontSize: tokens.type.sub.fontSize, color: tokens.colors.text.secondary, marginTop: tokens.space.xs },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: {
    backgroundColor: tokens.colors.card.base, borderRadius: tokens.radius.lg,
    padding: tokens.space.lg, width: '90%', maxHeight: '80%',
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
  checkboxGrid: { marginBottom: tokens.space.sm },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  checkboxLabel: { fontSize: tokens.type.body.fontSize, color: tokens.colors.text.primary, marginLeft: tokens.space.sm },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: tokens.space.md },
  cancelButton: { paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.sm, marginRight: tokens.space.md },
  cancelButtonText: { color: tokens.colors.text.secondary, fontSize: tokens.type.body.fontSize, fontWeight: tokens.typography.fontWeight.medium },
  saveButton: {
    backgroundColor: tokens.colors.accent.blue, paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.sm, borderRadius: tokens.radius.sm,
  },
  saveButtonText: { color: tokens.colors.text.white, fontSize: tokens.type.body.fontSize, fontWeight: tokens.typography.fontWeight.semibold },
});
