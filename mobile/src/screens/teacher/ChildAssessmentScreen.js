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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import Card from '../../components/common/Card';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import tokens from '../../styles/tokens';

const CATEGORIES = [
  { key: 'cognitive', icon: 'bulb-outline', translationKey: 'cognitive' },
  { key: 'motor', icon: 'body-outline', translationKey: 'motor' },
  { key: 'speech', icon: 'mic-outline', translationKey: 'speech' },
  { key: 'behavior', icon: 'happy-outline', translationKey: 'behavior' },
  { key: 'social', icon: 'people-outline', translationKey: 'social' },
  { key: 'self_care', icon: 'hand-left-outline', translationKey: 'selfCare' },
];

const SCORE_COLORS = {
  1: '#EF4444',
  2: '#F97316',
  3: '#EAB308',
  4: '#84CC16',
  5: '#22C55E',
};

export function ChildAssessmentScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { childId, childName } = route?.params || {};

  const BOTTOM_NAV_HEIGHT = 75;
  const bottomPadding = BOTTOM_NAV_HEIGHT + insets.bottom + 16;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assessments, setAssessments] = useState({});
  const [formData, setFormData] = useState({});
  const [changed, setChanged] = useState({});

  const loadAssessments = useCallback(async () => {
    if (!childId) return;
    try {
      setLoading(true);
      const response = await api.get(`/assessments/latest?childId=${childId}`);
      const data = response.data?.data || [];

      const assessmentMap = {};
      const formMap = {};
      data.forEach((a) => {
        assessmentMap[a.category] = a;
        formMap[a.category] = { score: a.score, notes: a.notes || '' };
      });

      // Initialize empty categories
      CATEGORIES.forEach((cat) => {
        if (!formMap[cat.key]) {
          formMap[cat.key] = { score: 0, notes: '' };
        }
      });

      setAssessments(assessmentMap);
      setFormData(formMap);
      setChanged({});
    } catch (error) {
      console.error('Error loading assessments:', error);
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    loadAssessments();
  }, [loadAssessments]);

  const updateScore = (category, score) => {
    setFormData((prev) => ({
      ...prev,
      [category]: { ...prev[category], score },
    }));
    setChanged((prev) => ({ ...prev, [category]: true }));
  };

  const updateNotes = (category, notes) => {
    setFormData((prev) => ({
      ...prev,
      [category]: { ...prev[category], notes },
    }));
    setChanged((prev) => ({ ...prev, [category]: true }));
  };

  const handleSave = async () => {
    const changedCategories = Object.keys(changed).filter((k) => changed[k]);
    if (changedCategories.length === 0) {
      Alert.alert(t('common.info', { defaultValue: 'Info' }), t('assessment.noChanges', { defaultValue: 'No changes to save' }));
      return;
    }

    // Validate all changed categories have a score
    for (const cat of changedCategories) {
      if (!formData[cat]?.score || formData[cat].score < 1) {
        const catInfo = CATEGORIES.find((c) => c.key === cat);
        const catName = t(`assessment.${catInfo?.translationKey || cat}`, { defaultValue: cat });
        Alert.alert(t('common.error', { defaultValue: 'Error' }), `${catName}: ${t('assessment.score', { defaultValue: 'Score' })} >= 1`);
        return;
      }
    }

    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      for (const category of changedCategories) {
        const { score, notes } = formData[category];
        if (score < 1) continue;

        await api.post('/assessments', {
          childId,
          category,
          score,
          notes: notes || null,
          date: today,
        });
      }

      Alert.alert(
        t('common.success', { defaultValue: 'Success' }),
        t('assessment.saved', { defaultValue: 'Assessment saved' })
      );
      setChanged({});
      await loadAssessments();
    } catch (error) {
      console.error('Error saving assessments:', error);
      Alert.alert(
        t('common.error', { defaultValue: 'Error' }),
        error.response?.data?.error || t('common.genericError', { defaultValue: 'Something went wrong' })
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const hasChanges = Object.values(changed).some(Boolean);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title={t('assessment.title', { defaultValue: 'Assessment' })}
        subtitle={childName || ''}
        showBack
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {CATEGORIES.map((cat) => {
          const current = formData[cat.key] || { score: 0, notes: '' };
          const existing = assessments[cat.key];
          const isChanged = changed[cat.key];

          return (
            <Card key={cat.key} style={[styles.card, isChanged && styles.cardChanged]}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryTitleRow}>
                  <Ionicons name={cat.icon} size={24} color={tokens.colors.accent.blue} />
                  <Text style={styles.categoryTitle} allowFontScaling={true}>
                    {t(`assessment.${cat.translationKey}`, { defaultValue: cat.key })}
                  </Text>
                </View>
                {existing && !isChanged && (
                  <Text style={styles.lastUpdated}>
                    {existing.date}
                  </Text>
                )}
              </View>

              {/* Score selector */}
              <View style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>
                  {t('assessment.score', { defaultValue: 'Score' })}:
                </Text>
                <View style={styles.scoreButtons}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Pressable
                      key={s}
                      style={[
                        styles.scoreButton,
                        current.score === s && {
                          backgroundColor: SCORE_COLORS[s],
                          borderColor: SCORE_COLORS[s],
                        },
                      ]}
                      onPress={() => updateScore(cat.key, s)}
                    >
                      <Text
                        style={[
                          styles.scoreButtonText,
                          current.score === s && styles.scoreButtonTextActive,
                        ]}
                      >
                        {s}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Notes input */}
              <TextInput
                style={styles.notesInput}
                value={current.notes}
                onChangeText={(text) => updateNotes(cat.key, text)}
                placeholder={t('assessment.notes', { defaultValue: 'Notes' })}
                placeholderTextColor={tokens.colors.text.muted}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </Card>
          );
        })}

        {/* Save Button */}
        <Pressable
          style={[styles.saveButton, (!hasChanges || saving) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!hasChanges || saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>
                {t('assessment.save', { defaultValue: 'Save' })}
              </Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background.primary,
  },
  content: {
    padding: tokens.space.lg,
  },
  card: {
    marginBottom: tokens.space.md,
  },
  cardChanged: {
    borderWidth: 2,
    borderColor: tokens.colors.accent.blue + '40',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.space.md,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
  },
  categoryTitle: {
    fontSize: tokens.type.h3.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.text.primary,
  },
  lastUpdated: {
    fontSize: tokens.type.caption.fontSize,
    color: tokens.colors.text.muted,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
    marginBottom: tokens.space.md,
  },
  scoreLabel: {
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.secondary,
    fontWeight: '600',
  },
  scoreButtons: {
    flexDirection: 'row',
    gap: tokens.space.sm,
    flex: 1,
  },
  scoreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: tokens.colors.border.light,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: tokens.colors.surface.secondary,
  },
  scoreButtonText: {
    fontSize: tokens.type.body.fontSize,
    fontWeight: '700',
    color: tokens.colors.text.secondary,
  },
  scoreButtonTextActive: {
    color: '#fff',
  },
  notesInput: {
    backgroundColor: tokens.colors.surface.secondary,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.primary,
    borderWidth: 1,
    borderColor: tokens.colors.border.light,
    minHeight: 60,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space.sm,
    padding: tokens.space.lg,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.accent.blue,
    marginTop: tokens.space.md,
    marginBottom: tokens.space.xl,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: tokens.type.body.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: '#fff',
  },
});
