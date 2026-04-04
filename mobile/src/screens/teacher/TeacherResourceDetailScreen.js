import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, Pressable, Modal, TextInput,
  ScrollView, RefreshControl, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import tokens from '../../styles/tokens';

const TYPE_META = {
  music: { icon: 'musical-notes', color: '#BFD7EA44', emoji: '🎵', titleKey: 'resources.music', titleDefault: 'Musiqa' },
  video: { icon: 'play-circle', color: '#DFF4EC66', emoji: '🎬', titleKey: 'resources.video', titleDefault: 'Video' },
  recommendation: { icon: 'bulb', color: '#E8C27E33', emoji: '💡', titleKey: 'resources.recommendation', titleDefault: 'Tavsiya' },
};

export function TeacherResourceDetailScreen() {
  const { t } = useTranslation();
  const route = useRoute();
  const { type } = route.params || { type: 'music' };
  const meta = TYPE_META[type] || TYPE_META.music;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', url: '' });
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/resources', { params: { type } });
      setItems(res?.data?.data || []);
    } catch {
      // silent — error shown via EmptyState
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [type]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const openAdd = () => {
    setForm({ title: '', description: '', url: '' });
    setFormError('');
    setShowModal(true);
  };

  const save = async () => {
    if (!form.title.trim()) {
      setFormError(t('resources.titleRequired', { defaultValue: 'Sarlavha kiritish shart' }));
      return;
    }
    setSaving(true);
    try {
      await api.post('/resources', {
        type,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        url: form.url.trim() || undefined,
      });
      setShowModal(false);
      load();
    } catch {
      setFormError(t('resources.saveError', { defaultValue: 'Saqlashda xatolik yuz berdi' }));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/resources/${id}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      // silent
    }
  };

  if (loading) return <LoadingSpinner />;

  const screenTitle = t(meta.titleKey, { defaultValue: meta.titleDefault });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title={screenTitle}
        showBack
        rightActionIcon="add"
        onRightActionPress={openAdd}
      />

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState
            emoji={meta.emoji}
            title={t('resources.emptyTitle', { defaultValue: "Material yo'q" })}
            description={t('resources.emptyDesc', { defaultValue: "Yangi material qo'shish uchun + tugmasini bosing" })}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={[styles.iconWrap, { backgroundColor: meta.color }]}>
              <Ionicons name={meta.icon} size={24} color="#2E3A59" />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              {item.description ? (
                <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
              ) : null}
              {item.teacher && (
                <Text style={styles.cardTeacher}>
                  {item.teacher.firstName} {item.teacher.lastName}
                </Text>
              )}
            </View>
            <Pressable
              onPress={() => remove(item.id)}
              accessibilityRole="button"
              accessibilityLabel={t('common.delete', { defaultValue: "O'chirish" })}
              style={styles.deleteBtn}
            >
              <Ionicons name="trash-outline" size={20} color={tokens.colors.semantic.error} />
            </Pressable>
          </View>
        )}
      />

      {/* Add modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalWrap}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {t('resources.addNew', { defaultValue: 'Yangi material' })} — {screenTitle}
                </Text>
                <Pressable onPress={() => setShowModal(false)} accessibilityRole="button">
                  <Ionicons name="close" size={24} color={tokens.colors.text.secondary} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.label}>
                  {t('resources.titleLabel', { defaultValue: 'Sarlavha *' })}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('resources.titlePlaceholder', { defaultValue: 'Sarlavha kiriting...' })}
                  placeholderTextColor="#B0BAC9"
                  value={form.title}
                  onChangeText={(v) => setForm((p) => ({ ...p, title: v }))}
                />

                <Text style={styles.label}>
                  {t('resources.descLabel', { defaultValue: 'Tavsif' })}
                </Text>
                <TextInput
                  style={[styles.input, styles.inputMulti]}
                  placeholder={t('resources.descPlaceholder', { defaultValue: 'Qisqacha tavsif (ixtiyoriy)' })}
                  placeholderTextColor="#B0BAC9"
                  value={form.description}
                  onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                <Text style={styles.label}>
                  {t('resources.urlLabel', { defaultValue: 'Havola (URL)' })}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://..."
                  placeholderTextColor="#B0BAC9"
                  value={form.url}
                  onChangeText={(v) => setForm((p) => ({ ...p, url: v }))}
                  autoCapitalize="none"
                  keyboardType="url"
                />

                {formError ? <Text style={styles.formError}>{formError}</Text> : null}

                <Pressable
                  onPress={save}
                  disabled={saving}
                  style={({ pressed }) => [styles.saveBtn, (pressed || saving) && { opacity: 0.75 }]}
                >
                  <Text style={styles.saveBtnText}>
                    {saving
                      ? t('common.saving', { defaultValue: 'Saqlanmoqda...' })
                      : t('common.save', { defaultValue: 'Saqlash' })}
                  </Text>
                </Pressable>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.colors.background.primary },
  list: { padding: tokens.space.xl, gap: tokens.space.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: tokens.radius.xl,
    padding: tokens.space.md,
    gap: tokens.space.md,
    ...tokens.shadow.sm,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#2E3A59' },
  cardDesc: { fontSize: 13, color: '#5A6B8C', marginTop: 2 },
  cardTeacher: { fontSize: 12, color: '#8A97B0', marginTop: 4 },
  deleteBtn: { padding: tokens.space.sm },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalWrap: { justifyContent: 'flex-end' },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: tokens.space.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.space.lg,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#2E3A59', flex: 1, marginRight: tokens.space.sm },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5A6B8C',
    marginBottom: tokens.space.sm,
    marginTop: tokens.space.md,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E7EF',
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.md,
    fontSize: 15,
    color: '#2E3A59',
    backgroundColor: '#FAFBFD',
  },
  inputMulti: { height: 80 },
  formError: { fontSize: 13, color: tokens.colors.semantic.error, marginTop: tokens.space.sm },
  saveBtn: {
    backgroundColor: '#2E3A59',
    borderRadius: tokens.radius.pill,
    paddingVertical: tokens.space.md,
    alignItems: 'center',
    marginTop: tokens.space.xl,
    marginBottom: tokens.space.lg,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
