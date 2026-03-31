import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, TextInput, ScrollView, Animated, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import tokens from '../../styles/tokens';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import Card from '../../components/common/Card';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

// Animated Star Component
function AnimatedStar({ value, currentRating, onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isActive = currentRating >= value;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1.3,
        useNativeDriver: true,
        tension: 100,
        friction: 3,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 5,
      }),
    ]).start();
    onPress(value);
  };

  return (
    <Pressable onPress={handlePress} hitSlop={8}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Ionicons
          name={isActive ? "star" : "star-outline"}
          size={36}
          color={isActive ? tokens.colors.nav.indicator : tokens.colors.border.light}
        />
      </Animated.View>
    </Pressable>
  );
}

export function TeacherRatingScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { childId = null } = route?.params || {};

  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState(null);
  const [rating, setRating] = useState(null);
  const [summary, setSummary] = useState({ average: 0, count: 0 });
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  const BOTTOM_NAV_HEIGHT = 75;
  const bottomPadding = BOTTOM_NAV_HEIGHT + insets.bottom + 16;

  useEffect(() => {
    loadData();

    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [childId]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [profileRes, ratingRes] = await Promise.all([
        api.get('/parent/profile').catch(() => ({ data: { data: { user: { assignedTeacher: null } } } })),
        api.get('/parent/ratings').catch((err) => {
          if (err.response?.status === 400 || err.response?.status === 404) {
            return { data: { data: { rating: null, summary: { average: 0, count: 0 } } } };
          }
          throw err;
        }),
      ]);

      const teacherData = profileRes.data?.data?.user?.assignedTeacher || null;
      setTeacher(teacherData);

      const ratingData = ratingRes?.data?.data || { rating: null, summary: { average: 0, count: 0 } };
      setRating(ratingData.rating);
      setStars(ratingData.rating?.stars || 0);
      setComment(ratingData.rating?.comment || '');
      setSummary(ratingData.summary || { average: 0, count: 0 });
    } catch (err) {
      console.error('Error loading rating data:', err);
      setError(t('ratingPage.errorLoad', { defaultValue: 'Failed to load data' }));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError('');
    setShowSuccess(false);

    if (!teacher) {
      setError(t('ratingPage.noTeacher', { defaultValue: 'No teacher assigned' }));
      return;
    }

    if (!stars) {
      setError(t('ratingPage.errorRequired', { defaultValue: 'Please select a rating' }));
      return;
    }

    setSaving(true);
    try {
      await api.post('/parent/ratings', { stars, comment });
      setRating({
        stars,
        comment,
        updatedAt: new Date().toISOString(),
      });

      // Show success animation
      setShowSuccess(true);
      Animated.sequence([
        Animated.spring(successAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 60,
          friction: 7,
        }),
        Animated.delay(2000),
        Animated.timing(successAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => setShowSuccess(false));

      // Refresh summary
      const refreshRes = await api.get('/parent/ratings').catch(() => ({ data: { data: { summary: { average: 0, count: 0 } } } }));
      const ratingData = refreshRes?.data?.data || {};
      setSummary(ratingData.summary || { average: 0, count: 0 });
    } catch (err) {
      console.error('Error saving rating:', err);
      setError(err.response?.data?.error || t('ratingPage.errorSave', { defaultValue: 'Failed to save rating' }));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title={t('ratingPage.title', { defaultValue: 'Rate Teacher' })} showBack={true} />

      {!teacher ? (
        <View style={styles.emptyContainer}>
          <Card style={styles.emptyCard}>
            <EmptyState
              icon="person-outline"
              title={t('ratingPage.noTeacher', { defaultValue: 'No Teacher Assigned' })}
              description={t('ratingPage.noTeacherDesc', { defaultValue: 'You will be able to rate your teacher once assigned' })}
            />
          </Card>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            {/* Teacher Card */}
            <Card style={styles.teacherCard} padding={tokens.space.xl}>
              <View style={styles.teacherInfo}>
                <View style={styles.teacherAvatar}>
                  <Text style={styles.teacherAvatarText}>
                    {teacher.firstName?.[0]}{teacher.lastName?.[0]}
                  </Text>
                </View>
                <View style={styles.teacherDetails}>
                  <Text style={styles.teacherLabel}>{t('ratingPage.yourTeacher', { defaultValue: 'Your Teacher' })}</Text>
                  <Text style={styles.teacherName}>{teacher.firstName} {teacher.lastName}</Text>
                  <View style={styles.teacherMeta}>
                    <Ionicons name="mail-outline" size={12} color={tokens.colors.text.secondary} />
                    <Text style={styles.teacherEmail}>{teacher.email}</Text>
                  </View>
                </View>
              </View>

              {/* Average Rating Badge */}
              <View style={styles.averageBadge}>
                <View style={styles.averageBadgeContent}>
                  <Ionicons name="star" size={18} color={tokens.colors.nav.indicator} />
                  <Text style={styles.averageValue}>{summary.average?.toFixed(1) || '0.0'}</Text>
                  <Text style={styles.averageCount}>({summary.count || 0})</Text>
                </View>
              </View>
            </Card>

            {/* Rating Section */}
            <Card style={styles.ratingCard} padding={tokens.space.xl}>
              <View style={styles.ratingHeader}>
                <View style={styles.ratingHeaderIcon}>
                  <Ionicons name="star-outline" size={20} color={tokens.colors.nav.indicator} />
                </View>
                <Text style={styles.ratingTitle}>{t('ratingPage.starsLabel', { defaultValue: 'Rate Your Teacher' })}</Text>
              </View>

              {/* Star Rating */}
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <AnimatedStar
                    key={value}
                    value={value}
                    currentRating={stars}
                    onPress={setStars}
                  />
                ))}
              </View>

              {/* Rating Description */}
              <View style={styles.ratingDescription}>
                <Text style={styles.ratingDescText}>
                  {stars === 0 && t('ratingPage.tapStars', { defaultValue: 'Tap stars to rate' })}
                  {stars === 1 && t('ratingPage.poor', { defaultValue: 'Poor' })}
                  {stars === 2 && t('ratingPage.fair', { defaultValue: 'Fair' })}
                  {stars === 3 && t('ratingPage.good', { defaultValue: 'Good' })}
                  {stars === 4 && t('ratingPage.veryGood', { defaultValue: 'Very Good' })}
                  {stars === 5 && t('ratingPage.excellent', { defaultValue: 'Excellent!' })}
                </Text>
              </View>

              {/* Comment Input */}
              <View style={styles.commentSection}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentLabel}>{t('ratingPage.commentLabel', { defaultValue: 'Comments' })}</Text>
                  <Text style={styles.optionalLabel}>{t('ratingPage.optional', { defaultValue: 'Optional' })}</Text>
                </View>
                <TextInput
                  style={styles.commentInput}
                  value={comment}
                  onChangeText={setComment}
                  placeholder={t('ratingPage.commentPlaceholder', { defaultValue: 'Share your thoughts...' })}
                  placeholderTextColor={tokens.colors.text.tertiary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* Error Message */}
              {error ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color={tokens.colors.semantic.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Submit Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.submitButton,
                  pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                  saving && styles.submitButtonSaving,
                ]}
                onPress={handleSubmit}
                disabled={saving}
              >
                {saving ? (
                  <View style={styles.submitButtonInner}>
                    <ActivityIndicator color={tokens.colors.text.white} size="small" />
                    <Text style={styles.submitButtonText}>{t('ratingPage.saving', { defaultValue: 'Saving...' })}</Text>
                  </View>
                ) : (
                  <View style={styles.submitButtonInner}>
                    <Ionicons name="checkmark-circle" size={18} color={tokens.colors.text.white} />
                    <Text style={styles.submitButtonText}>
                      {rating ? t('ratingPage.update', { defaultValue: 'Update Rating' }) : t('ratingPage.submit', { defaultValue: 'Submit Rating' })}
                    </Text>
                  </View>
                )}
              </Pressable>

              {/* Last Updated */}
              {rating?.updatedAt && (
                <Text style={styles.lastUpdated}>
                  {t('ratingPage.lastUpdated', {
                    date: new Date(rating.updatedAt).toLocaleDateString(),
                    defaultValue: `Last updated: ${new Date(rating.updatedAt).toLocaleDateString()}`
                  })}
                </Text>
              )}
            </Card>
          </Animated.View>
        </ScrollView>
      )}

      {/* Success Animation Overlay */}
      {showSuccess && (
        <Animated.View
          style={[
            styles.successOverlay,
            {
              opacity: successAnim,
              transform: [{
                scale: successAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              }],
            },
          ]}
        >
          <Card style={styles.successContent}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-circle" size={64} color={tokens.colors.semantic.success} />
            </View>
            <Text style={styles.successTitle}>{t('ratingPage.success', { defaultValue: 'Rating Submitted!' })}</Text>
            <Text style={styles.successMessage}>{t('ratingPage.successDesc', { defaultValue: 'Thank you for your feedback' })}</Text>
          </Card>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: tokens.space.lg,
  },
  emptyContainer: {
    flex: 1,
    padding: tokens.space.lg,
  },
  emptyCard: {
    marginTop: tokens.space.xl,
  },
  teacherCard: {
    marginBottom: tokens.space.xl,
  },
  teacherInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokens.space.lg,
  },
  teacherAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.space.md,
    backgroundColor: tokens.colors.accent.blue,
    ...tokens.shadow.soft,
  },
  teacherAvatarText: {
    fontSize: 24,
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.text.white,
  },
  teacherDetails: {
    flex: 1,
  },
  teacherLabel: {
    fontSize: tokens.type.caption.fontSize,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.accent.blue,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  teacherName: {
    fontSize: tokens.type.h3.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.text.primary,
    marginBottom: 4,
  },
  teacherMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.xs,
  },
  teacherEmail: {
    fontSize: tokens.type.sub.fontSize,
    color: tokens.colors.text.secondary,
  },
  averageBadge: {
    borderRadius: tokens.radius.pill,
    alignSelf: 'flex-start',
    backgroundColor: tokens.colors.joy.sunflowerSoft,
  },
  averageBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    gap: tokens.space.xs,
  },
  averageValue: {
    fontSize: tokens.type.h3.fontSize,
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.nav.indicator,
  },
  averageCount: {
    fontSize: tokens.type.sub.fontSize,
    color: tokens.colors.text.secondary,
  },
  ratingCard: {
    marginBottom: tokens.space.xl,
  },
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
    marginBottom: tokens.space.xl,
  },
  ratingHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tokens.colors.joy.sunflowerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingTitle: {
    fontSize: tokens.type.h3.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.text.primary,
    letterSpacing: -0.1,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: tokens.space.md,
    marginBottom: tokens.space.lg,
  },
  ratingDescription: {
    alignItems: 'center',
    marginBottom: tokens.space.xl,
  },
  ratingDescText: {
    fontSize: tokens.type.body.fontSize,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.nav.indicator,
    letterSpacing: 0.3,
  },
  commentSection: {
    marginBottom: tokens.space.xl,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.space.sm,
  },
  commentLabel: {
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.text.primary,
    letterSpacing: 0.2,
  },
  optionalLabel: {
    fontSize: tokens.type.caption.fontSize,
    color: tokens.colors.text.secondary,
  },
  commentInput: {
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.background.tertiary,
    padding: tokens.space.md,
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.primary,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: tokens.colors.border.light,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
    backgroundColor: tokens.colors.semantic.errorSoft,
    padding: tokens.space.md,
    borderRadius: tokens.radius.md,
    marginBottom: tokens.space.xl,
  },
  errorText: {
    flex: 1,
    fontSize: tokens.type.sub.fontSize,
    color: tokens.colors.semantic.error,
  },
  submitButton: {
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.accent.blue,
    paddingVertical: tokens.space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadow.soft,
  },
  submitButtonSaving: {
    opacity: 0.7,
  },
  submitButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space.sm,
  },
  submitButtonText: {
    fontSize: tokens.type.button.fontSize,
    fontWeight: tokens.type.button.fontWeight,
    color: tokens.colors.text.white,
  },
  lastUpdated: {
    fontSize: tokens.type.caption.fontSize,
    color: tokens.colors.text.secondary,
    textAlign: 'center',
    marginTop: tokens.space.md,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colors.surface.overlay,
  },
  successContent: {
    alignItems: 'center',
    minWidth: '80%',
  },
  successIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: tokens.colors.semantic.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.space.md,
  },
  successTitle: {
    fontSize: tokens.type.h2.fontSize,
    fontWeight: tokens.type.h2.fontWeight,
    color: tokens.colors.text.primary,
    marginBottom: tokens.space.sm,
  },
  successMessage: {
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.secondary,
    textAlign: 'center',
  },
});
