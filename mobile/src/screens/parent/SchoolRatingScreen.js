import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Pressable, TextInput, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { parentService } from '../../services/parentService';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import tokens from '../../styles/tokens';
import Card from '../../components/common/Card';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import Skeleton from '../../components/common/Skeleton';

const CRITERIA_KEYS = [
  'officiallyRegistered',
  'qualifiedSpecialists',
  'individualPlan',
  'safeEnvironment',
  'medicalRequirements',
  'developmentalActivities',
  'foodQuality',
  'regularInformation',
  'clearPayments',
  'kindAttitude',
];

const DEFAULT_EVALUATION = Object.fromEntries(CRITERIA_KEYS.map((k) => [k, false]));

export function SchoolRatingScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(null);
  const [evaluation, setEvaluation] = useState({ ...DEFAULT_EVALUATION });
  const [selectedRating, setSelectedRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Bottom nav height + safe area + padding
  const BOTTOM_NAV_HEIGHT = 75;
  const bottomPadding = BOTTOM_NAV_HEIGHT + insets.bottom + 16;

  useEffect(() => {
    loadRating();
  }, []);

  const loadRating = async () => {
    try {
      setLoading(true);
      const data = await parentService.getSchoolRating();
      setRating(data);
      if (data?.evaluation) {
        setEvaluation({ ...DEFAULT_EVALUATION, ...data.evaluation });
      }
      if (data?.rating) {
        setSelectedRating(data.rating);
      }
      if (data?.comment) {
        setComment(data.comment);
      }
    } catch (error) {
      if (__DEV__) console.error('Error loading rating:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCriterion = (key) => {
    setEvaluation((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const hasAnyCriteria = CRITERIA_KEYS.some((k) => evaluation[k]);

  const submitRating = async () => {
    if (!hasAnyCriteria && selectedRating === 0) {
      Alert.alert(t('common.error'), t('schoolRatingPage.errorRequired'));
      return;
    }

    try {
      setSubmitting(true);
      await parentService.rateSchool({
        evaluation,
        rating: selectedRating || null,
        comment,
      });
      Alert.alert(t('common.success'), t('schoolRatingPage.success'));
      await loadRating();
    } catch (error) {
      if (__DEV__) console.error('Error submitting rating:', error);
      Alert.alert(t('common.error'), t('schoolRatingPage.errorSave'));
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = hasAnyCriteria || selectedRating > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title={t('schoolRatingPage.title', { defaultValue: 'School Rating' })}
        showBack={true}
      />
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}>
        {loading ? (
          <Card style={styles.loadingCard}>
            <Skeleton width={80} height={80} variant="circle" style={{ alignSelf: 'center', marginBottom: tokens.space.lg }} />
            <Skeleton width="60%" height={24} variant="text" style={{ alignSelf: 'center', marginBottom: tokens.space.md }} />
            <Skeleton width="80%" height={60} variant="text" style={{ alignSelf: 'center' }} />
          </Card>
        ) : (
          <>
            {/* School Info Card */}
            {rating?.school && (
              <Card style={styles.infoCard} padding={tokens.space.lg}>
                <View style={styles.schoolInfo}>
                  <View style={styles.schoolIconCircle}>
                    <Ionicons name="school" size={28} color={tokens.colors.accent.blue} />
                  </View>
                  <View style={styles.schoolDetails}>
                    <Text style={styles.schoolName} allowFontScaling={true}>
                      {rating.school.name}
                    </Text>
                    <Text style={styles.schoolLabel} allowFontScaling={true}>
                      {t('schoolRatingPage.yourSchool')}
                    </Text>
                  </View>
                  {rating?.averageRating > 0 && (
                    <View style={styles.averageContainer}>
                      <View style={styles.averageBadge}>
                        <Ionicons name="star" size={16} color={tokens.colors.nav.indicator} />
                        <Text style={styles.averageText}>{rating.averageRating.toFixed(1)}</Text>
                      </View>
                      <Text style={styles.ratingsCount}>
                        {t('schoolRatingPage.ratingsCount', { count: rating.ratingsCount || 0 })}
                      </Text>
                    </View>
                  )}
                </View>
              </Card>
            )}

            {/* Evaluation Checklist Card */}
            <Card style={styles.ratingCard}>
              <View style={styles.iconContainer}>
                <Ionicons name="clipboard-outline" size={48} color={tokens.colors.accent.blue} />
              </View>
              <Text style={styles.title} allowFontScaling={true}>
                {t('schoolRatingPage.evaluationLabel')}
              </Text>
              <Text style={styles.description} allowFontScaling={true}>
                {t('schoolRatingPage.evaluationSubtitle')}
              </Text>

              {/* Criteria Checklist */}
              <View style={styles.checklistContainer}>
                {CRITERIA_KEYS.map((key) => (
                  <Pressable
                    key={key}
                    style={styles.checkRow}
                    onPress={() => toggleCriterion(key)}
                    hitSlop={{ top: 2, bottom: 2 }}
                  >
                    <Ionicons
                      name={evaluation[key] ? 'checkbox' : 'square-outline'}
                      size={24}
                      color={evaluation[key] ? tokens.colors.semantic.success : tokens.colors.border.medium}
                    />
                    <Text style={[styles.checkLabel, evaluation[key] && styles.checkLabelActive]} allowFontScaling={true}>
                      {t(`schoolRatingPage.criteria.${key}`)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Star Rating (Optional) */}
              <View style={styles.starSection}>
                <View style={styles.separatorLine} />
                <Text style={styles.optionalStarsLabel} allowFontScaling={true}>
                  {t('schoolRatingPage.starsLabel')}
                </Text>
                <View style={styles.ratingContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Pressable
                      key={star}
                      onPress={() => setSelectedRating(star === selectedRating ? 0 : star)}
                      style={styles.starButton}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name={star <= selectedRating ? 'star' : 'star-outline'}
                        size={36}
                        color={star <= selectedRating ? tokens.colors.nav.indicator : tokens.colors.border.light}
                      />
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Comment Input */}
              <View style={styles.commentContainer}>
                <Text style={styles.commentLabel} allowFontScaling={true}>
                  {t('schoolRatingPage.commentLabel')}
                </Text>
                <TextInput
                  style={styles.commentInput}
                  value={comment}
                  onChangeText={setComment}
                  placeholder={t('schoolRatingPage.commentPlaceholder')}
                  placeholderTextColor={tokens.colors.text.muted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <Pressable
                style={[
                  styles.submitButton,
                  !canSubmit && styles.submitButtonDisabled,
                  submitting && styles.submitButtonDisabled,
                ]}
                onPress={submitRating}
                disabled={!canSubmit || submitting}
              >
                <Text
                  style={[
                    styles.submitButtonText,
                    (!canSubmit || submitting) && styles.submitButtonTextDisabled,
                  ]}
                  allowFontScaling={true}
                >
                  {submitting ? t('common.loading', { defaultValue: 'Loading...' }) : t('schoolRatingPage.submit', { defaultValue: 'Submit' })}
                </Text>
              </Pressable>
            </Card>

            {/* Previous Rating */}
            {rating?.yourRating != null && (
              <Card style={styles.previousCard}>
                <Text style={styles.previousTitle} allowFontScaling={true}>
                  {t('schoolRatingPage.yourRating')}
                </Text>

                {/* Previous Evaluation Criteria */}
                {rating.yourEvaluation && (
                  <View style={styles.previousCriteriaList}>
                    {CRITERIA_KEYS.map((key) => (
                      <View key={key} style={styles.previousCriteriaRow}>
                        <Ionicons
                          name={rating.yourEvaluation[key] ? 'checkmark-circle' : 'ellipse-outline'}
                          size={18}
                          color={rating.yourEvaluation[key] ? tokens.colors.semantic.success : tokens.colors.border.medium}
                        />
                        <Text
                          style={[
                            styles.previousCriteriaLabel,
                            rating.yourEvaluation[key] && styles.previousCriteriaLabelActive,
                          ]}
                          allowFontScaling={true}
                        >
                          {t(`schoolRatingPage.criteria.${key}`)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Previous Star Rating */}
                {rating.yourRating > 0 && (
                  <View style={styles.previousStars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name={star <= rating.yourRating ? 'star' : 'star-outline'}
                        size={20}
                        color={star <= rating.yourRating ? tokens.colors.nav.indicator : tokens.colors.border.light}
                      />
                    ))}
                  </View>
                )}

                {rating.yourComment && (
                  <Text style={styles.previousComment} allowFontScaling={true}>
                    &ldquo;{rating.yourComment}&rdquo;
                  </Text>
                )}
                {rating.lastUpdated && (
                  <Text style={styles.lastUpdated} allowFontScaling={true}>
                    {t('schoolRatingPage.lastUpdated', { date: new Date(rating.lastUpdated).toLocaleDateString() })}
                  </Text>
                )}
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background.primary,
  },
  scrollContent: {
    padding: tokens.space.lg,
  },
  loadingCard: {
    alignItems: 'center',
  },
  // School Info Card
  infoCard: {
    marginBottom: tokens.space.lg,
  },
  schoolInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  schoolIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: tokens.colors.accent.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.space.md,
  },
  schoolDetails: {
    flex: 1,
  },
  schoolName: {
    fontSize: tokens.type.h3.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.text.primary,
    marginBottom: 2,
  },
  schoolLabel: {
    fontSize: tokens.type.sub.fontSize,
    color: tokens.colors.text.secondary,
  },
  averageContainer: {
    alignItems: 'flex-end',
  },
  averageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.joy.sunflowerSoft,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: 4,
    borderRadius: tokens.radius.md,
    gap: 4,
  },
  averageText: {
    fontSize: tokens.type.body.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.nav.indicator,
  },
  ratingsCount: {
    fontSize: tokens.type.caption.fontSize,
    color: tokens.colors.text.muted,
    marginTop: 4,
  },
  // Rating Card
  ratingCard: {
    alignItems: 'center',
    marginBottom: tokens.space.lg,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: tokens.colors.accent.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.space.lg,
    alignSelf: 'center',
  },
  title: {
    fontSize: tokens.type.h2.fontSize,
    fontWeight: tokens.type.h2.fontWeight,
    color: tokens.colors.text.primary,
    marginBottom: tokens.space.sm,
    textAlign: 'center',
  },
  description: {
    fontSize: tokens.type.body.fontSize,
    fontWeight: tokens.type.body.fontWeight,
    color: tokens.colors.text.secondary,
    textAlign: 'center',
    marginBottom: tokens.space.xl,
    paddingHorizontal: tokens.space.md,
  },
  // Checklist
  checklistContainer: {
    width: '100%',
    marginBottom: tokens.space.lg,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.space.md,
    paddingHorizontal: tokens.space.sm,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border.light,
    gap: tokens.space.md,
  },
  checkLabel: {
    flex: 1,
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.secondary,
    lineHeight: tokens.type.body.lineHeight,
  },
  checkLabelActive: {
    color: tokens.colors.text.primary,
    fontWeight: tokens.typography.fontWeight.medium,
  },
  // Star section
  starSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: tokens.space.lg,
  },
  separatorLine: {
    width: '100%',
    height: 1,
    backgroundColor: tokens.colors.border.light,
    marginBottom: tokens.space.lg,
  },
  optionalStarsLabel: {
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.text.secondary,
    marginBottom: tokens.space.md,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: tokens.space.sm,
  },
  starButton: {
    padding: tokens.space.xs,
  },
  // Comment Input
  commentContainer: {
    width: '100%',
    marginBottom: tokens.space.lg,
  },
  commentLabel: {
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.text.secondary,
    marginBottom: tokens.space.sm,
  },
  commentInput: {
    width: '100%',
    minHeight: 100,
    backgroundColor: tokens.colors.background.tertiary,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.primary,
    borderWidth: 1,
    borderColor: tokens.colors.border.light,
  },
  submitButton: {
    width: '100%',
    paddingVertical: tokens.space.lg,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.accent.blue,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadow.soft,
  },
  submitButtonDisabled: {
    backgroundColor: tokens.colors.border.medium,
  },
  submitButtonText: {
    fontSize: tokens.type.body.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.text.white,
  },
  submitButtonTextDisabled: {
    color: tokens.colors.text.muted,
  },
  // Previous Rating Card
  previousCard: {
    alignItems: 'center',
  },
  previousTitle: {
    fontSize: tokens.type.h3.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.text.primary,
    marginBottom: tokens.space.md,
  },
  previousCriteriaList: {
    width: '100%',
    marginBottom: tokens.space.md,
  },
  previousCriteriaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.space.sm,
    gap: tokens.space.sm,
  },
  previousCriteriaLabel: {
    flex: 1,
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.muted,
  },
  previousCriteriaLabelActive: {
    color: tokens.colors.text.primary,
  },
  previousStars: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: tokens.space.sm,
  },
  previousComment: {
    fontSize: tokens.type.body.fontSize,
    fontStyle: 'italic',
    color: tokens.colors.text.secondary,
    textAlign: 'center',
    marginBottom: tokens.space.sm,
  },
  lastUpdated: {
    fontSize: tokens.type.caption.fontSize,
    color: tokens.colors.text.muted,
  },
});
