import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { teacherService } from '../../services/teacherService';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Card from '../../components/common/Card';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import tokens from '../../styles/tokens';
import logger from '../../utils/logger';

const EMOTIONAL_STATE_KEYS = [
  'stable',
  'positiveEmotions',
  'noAnxiety',
  'noHostility',
  'calmResponse',
  'showsEmpathy',
  'quickRecovery',
  'stableMood',
  'trustingRelationship',
];

const defaultEmotionalState = () =>
  EMOTIONAL_STATE_KEYS.reduce((acc, key) => ({ ...acc, [key]: false }), {});

export function MonitoringJournalScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Bottom nav height + safe area + padding
  const BOTTOM_NAV_HEIGHT = 75;
  const bottomPadding = BOTTOM_NAV_HEIGHT + insets.bottom + 16;
  const [monitoringRecords, setMonitoringRecords] = useState([]);
  const [children, setChildren] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [selectedChild, setSelectedChild] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showDatePicker_date, setShowDatePicker_date] = useState(false);
  const [formData, setFormData] = useState({
    childId: '',
    date: new Date().toISOString().split('T')[0],
    emotionalState: defaultEmotionalState(),
    notes: '',
    teacherSignature: '',
  });

  useEffect(() => {
    loadParents();
    loadMonitoringRecords();
  }, []);

  const loadParents = async () => {
    try {
      const parentsList = await teacherService.getParents();
      const allChildren = [];
      (Array.isArray(parentsList) ? parentsList : []).forEach((parent) => {
        if (parent.children && Array.isArray(parent.children)) {
          parent.children.forEach((child) => {
            allChildren.push({
              ...child,
              parentName: `${parent.firstName || ''} ${parent.lastName || ''}`.trim(),
            });
          });
        }
      });
      setChildren(allChildren);
    } catch (error) {
      logger.error('Error loading parents:', error);
    }
  };

  const loadMonitoringRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      const records = await teacherService.getAllMonitoringRecords();
      setMonitoringRecords(Array.isArray(records) ? records : []);
    } catch (err) {
      logger.error('Error loading monitoring records:', err);
      setError(t('common.loadError', { defaultValue: 'Failed to load data' }));
      setMonitoringRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const getRecordForChild = (childId, date) => {
    return monitoringRecords.find((r) => r.childId === childId && r.date === date);
  };

  const todayStr = () => new Date().toISOString().split('T')[0];

  const handleOpenModal = (child, record = null) => {
    if (record) {
      setEditingRecord(record);
      setSelectedChild(child);
      setFormData({
        childId: record.childId,
        date: record.date,
        emotionalState: record.emotionalState || defaultEmotionalState(),
        notes: record.notes || '',
        teacherSignature: record.teacherSignature || `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
      });
    } else {
      setEditingRecord(null);
      setSelectedChild(child);
      setFormData({
        childId: child?.id || '',
        date: todayStr(),
        emotionalState: defaultEmotionalState(),
        notes: '',
        teacherSignature: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRecord(null);
    setSelectedChild(null);
  };

  const toggleEmotionalState = (key) => {
    setFormData((prev) => ({
      ...prev,
      emotionalState: {
        ...prev.emotionalState,
        [key]: !prev.emotionalState[key],
      },
    }));
  };

  const handleSubmit = async () => {
    if (!formData.childId || !formData.date) {
      Alert.alert('', t('monitoring.selectChildError'));
      return;
    }
    setSaving(true);
    try {
      if (editingRecord) {
        await teacherService.updateEmotionalRecord(editingRecord.id, {
          date: formData.date,
          emotionalState: formData.emotionalState,
          notes: formData.notes,
          teacherSignature: formData.teacherSignature,
        });
      } else {
        await teacherService.createMonitoringRecord({
          childId: formData.childId,
          date: formData.date,
          emotionalState: formData.emotionalState,
          notes: formData.notes,
          teacherSignature: formData.teacherSignature,
        });
      }
      handleCloseModal();
      loadMonitoringRecords();
    } catch (error) {
      logger.error('Error saving monitoring record:', error);
      Alert.alert('', error.response?.data?.error || t('monitoring.toastError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t('monitoring.confirmDelete'),
      '',
      [
        { text: t('monitoring.cancel'), style: 'cancel' },
        {
          text: t('monitoring.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await teacherService.deleteEmotionalRecord(editingRecord.id);
              handleCloseModal();
              loadMonitoringRecords();
            } catch (error) {
              logger.error('Error deleting record:', error);
              Alert.alert('', t('monitoring.toastError'));
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title={t('monitoring.title', { defaultValue: 'Weekly Monitoring Journal' })} />
      {error && (
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Ionicons name="alert-circle-outline" size={48} color={tokens.colors.semantic.error} />
          <Text style={{ color: tokens.colors.text.secondary, marginTop: 12, textAlign: 'center' }}>{error}</Text>
          <Pressable onPress={() => loadMonitoringRecords()} accessibilityRole="button" accessibilityLabel={t('common.retry', { defaultValue: 'Retry' })}
            style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: tokens.colors.accent.blue, borderRadius: tokens.radius.md }}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>{t('common.retry', { defaultValue: 'Retry' })}</Text>
          </Pressable>
        </View>
      )}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>{t('monitoring.subtitle')}</Text>

        {children.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="people-outline" size={48} color={tokens.colors.text.tertiary} />
            <Text style={styles.emptyText}>{t('parentsPage.noParentsFound')}</Text>
          </Card>
        ) : (
          children.map((child) => {
            const todayRecord = getRecordForChild(child.id, todayStr());
            return (
              <Card key={child.id} style={styles.childCard}>
                <View style={styles.childHeader}>
                  <View style={styles.childIconWrap}>
                    <Ionicons name="person" size={24} color={tokens.colors.accent.blue} />
                  </View>
                  <View style={styles.childInfo}>
                    <Text style={styles.childName}>
                      {child.firstName} {child.lastName}
                    </Text>
                    <Text style={styles.childParent}>{child.parentName}</Text>
                    {child.school || child.class ? (
                      <Text style={styles.childMeta}>
                        {[child.school, child.class].filter(Boolean).join(', ')}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.statusRow}>
                  {todayRecord ? (
                    <View style={styles.statusBadge}>
                      <Ionicons name="checkmark-circle" size={18} color={tokens.colors.semantic.success} />
                      <Text style={styles.statusTextOk}>{t('monitoring.assessedToday')}</Text>
                    </View>
                  ) : (
                    <View style={styles.statusBadge}>
                      <Ionicons name="ellipse-outline" size={18} color={tokens.colors.text.tertiary} />
                      <Text style={styles.statusText}>{t('monitoring.notAssessedToday')}</Text>
                    </View>
                  )}
                </View>
                <Pressable
                  style={({ pressed }) => [styles.assessButton, pressed && styles.assessButtonPressed]}
                  onPress={() => handleOpenModal(child, todayRecord || undefined)}
                >
                  <Ionicons
                    name={todayRecord ? 'pencil' : 'add'}
                    size={18}
                    color={tokens.colors.text.white}
                  />
                  <Text style={styles.assessButtonText}>
                    {todayRecord ? t('monitoring.edit') : t('monitoring.assess')}
                  </Text>
                </Pressable>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingRecord ? t('monitoring.editModal') : t('monitoring.createModal')}
              </Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Ionicons name="close" size={24} color={tokens.colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              {selectedChild && (
                <View style={styles.selectedChildBox}>
                  <Ionicons name="person" size={20} color={tokens.colors.accent.blue} />
                  <View>
                    <Text style={styles.selectedChildName}>
                      {selectedChild.firstName} {selectedChild.lastName}
                    </Text>
                    <Text style={styles.selectedChildParent}>{selectedChild.parentName}</Text>
                  </View>
                </View>
              )}

              <Text style={styles.label}>{t('monitoring.date')}</Text>
              <Pressable onPress={() => setShowDatePicker_date(true)} accessibilityRole="button"
                style={{ borderWidth: 0, backgroundColor: tokens.colors.background.tertiary, borderRadius: tokens.radius.md, padding: tokens.space.md }}>
                <Text style={{ color: formData.date ? tokens.colors.text.primary : tokens.colors.text.muted }}>
                  {formData.date || t('common.selectDate', { defaultValue: 'Select date' })}
                </Text>
              </Pressable>
              {showDatePicker_date && (
                <DateTimePicker
                  value={formData.date ? new Date(formData.date) : new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker_date(false);
                    if (selectedDate) {
                      const formatted = selectedDate.toISOString().split('T')[0];
                      setFormData((prev) => ({ ...prev, date: formatted }));
                    }
                  }}
                />
              )}

              <Text style={styles.label}>{t('monitoring.emotionalState')}</Text>
              {EMOTIONAL_STATE_KEYS.map((key) => (
                <Pressable
                  key={key}
                  style={styles.checkRow}
                  onPress={() => toggleEmotionalState(key)}
                >
                  <Ionicons
                    name={formData.emotionalState[key] ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={formData.emotionalState[key] ? tokens.colors.accent.blue : tokens.colors.text.tertiary}
                  />
                  <Text style={styles.checkLabel}>{t(`monitoring.emotionalStates.${key}`)}</Text>
                </Pressable>
              ))}

              <Text style={styles.label}>{t('monitoring.notes')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.notes}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, notes: text }))}
                placeholder={t('monitoring.notesPlaceholder')}
                placeholderTextColor={tokens.colors.text.tertiary}
                multiline
              />

              <Text style={styles.label}>{t('monitoring.teacherSignature')}</Text>
              <TextInput
                style={styles.input}
                value={formData.teacherSignature}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, teacherSignature: text }))}
                placeholder={t('monitoring.teacherSignaturePlaceholder')}
                placeholderTextColor={tokens.colors.text.tertiary}
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={handleCloseModal}>
                <Text style={styles.cancelBtnText}>{t('monitoring.cancel')}</Text>
              </Pressable>
              <Pressable
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSubmit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={tokens.colors.text.white} />
                ) : (
                  <Text style={styles.saveBtnText}>{t('monitoring.save')}</Text>
                )}
              </Pressable>
              {editingRecord && (
                <Pressable style={styles.deleteBtn} onPress={handleDelete}>
                  <Ionicons name="trash-outline" size={18} color={tokens.colors.semantic.error} />
                  <Text style={styles.deleteBtnText}>{t('monitoring.delete')}</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.colors.background.primary }, // Warm Sand - beige background
  scroll: { flex: 1 },
  content: { padding: tokens.space.md, paddingBottom: tokens.space.xl * 2 },
  subtitle: {
    fontSize: tokens.type.sub.fontSize,
    color: tokens.colors.text.secondary,
    marginBottom: tokens.space.lg,
  },
  emptyCard: {
    alignItems: 'center',
    padding: tokens.space.xl,
  },
  emptyText: { marginTop: tokens.space.sm, color: tokens.colors.text.secondary },
  childCard: { marginBottom: tokens.space.md },
  childHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: tokens.space.sm },
  childIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: tokens.colors.accent[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.space.sm,
  },
  childInfo: { flex: 1 },
  childName: {
    fontSize: tokens.type.bodyLarge.fontSize,
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.text.primary,
  },
  childParent: { fontSize: tokens.type.sub.fontSize, color: tokens.colors.text.secondary },
  childMeta: { fontSize: tokens.type.caption.fontSize, color: tokens.colors.text.tertiary },
  statusRow: { marginBottom: tokens.space.sm },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { fontSize: tokens.type.sub.fontSize, color: tokens.colors.text.tertiary },
  statusTextOk: { fontSize: tokens.type.sub.fontSize, color: tokens.colors.semantic.success, fontWeight: '600' },
  assessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: tokens.colors.accent.blue,
    paddingVertical: tokens.space.sm,
    paddingHorizontal: tokens.space.md,
    borderRadius: tokens.radius.sm,
  },
  assessButtonPressed: { opacity: 0.8 },
  assessButtonText: { color: tokens.colors.text.white, fontWeight: '600', fontSize: tokens.type.sub.fontSize },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.space.md,
  },
  modalBox: {
    backgroundColor: tokens.colors.card.base,
    borderRadius: tokens.radius.lg,
    width: '100%',
    maxHeight: '90%',
    ...tokens.shadow.elevated,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: tokens.space.md,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border.light,
  },
  modalTitle: {
    fontSize: tokens.type.h3.fontSize,
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.text.primary,
  },
  modalScroll: { maxHeight: 400, padding: tokens.space.md },
  selectedChildBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.accent[50],
    padding: tokens.space.sm,
    borderRadius: tokens.radius.sm,
    marginBottom: tokens.space.md,
    gap: tokens.space.sm,
  },
  selectedChildName: { fontWeight: '600', color: tokens.colors.text.primary },
  selectedChildParent: { fontSize: tokens.type.sub.fontSize, color: tokens.colors.text.secondary },
  label: {
    fontSize: tokens.type.sub.fontSize,
    fontWeight: '600',
    color: tokens.colors.text.secondary,
    marginBottom: tokens.space.xs,
    marginTop: tokens.space.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: tokens.colors.border.medium,
    borderRadius: tokens.radius.sm,
    padding: tokens.space.sm,
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.primary,
    backgroundColor: tokens.colors.surface.card,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  checkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  checkLabel: { flex: 1, fontSize: tokens.type.sub.fontSize, color: tokens.colors.text.primary },
  modalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space.sm,
    padding: tokens.space.md,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border.light,
  },
  cancelBtn: { paddingVertical: tokens.space.sm, paddingHorizontal: tokens.space.md },
  cancelBtnText: { color: tokens.colors.text.secondary, fontWeight: '600' },
  saveBtn: {
    backgroundColor: tokens.colors.accent.blue,
    paddingVertical: tokens.space.sm,
    paddingHorizontal: tokens.space.lg,
    borderRadius: tokens.radius.sm,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: tokens.colors.text.white, fontWeight: '600' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: tokens.space.sm,
    paddingHorizontal: tokens.space.md,
    backgroundColor: tokens.colors.semantic.error + '20',
    borderRadius: tokens.radius.sm,
  },
  deleteBtnText: { color: tokens.colors.semantic.error, fontWeight: '600' },
});
