import React from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import Card from '../../components/common/Card';
import tokens from '../../styles/tokens';

export function RatingScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Bottom nav height + safe area + padding
  const BOTTOM_NAV_HEIGHT = 75;
  const bottomPadding = BOTTOM_NAV_HEIGHT + insets.bottom + 16;

  const ratingOptions = [
    {
      id: 'daily',
      title: t('monitoringHub.daily', { defaultValue: 'Kunlik baholash' }),
      subtitle: t('monitoringHub.dailyDesc', { defaultValue: "Gigienik va sog'liq holatini kuzatish" }),
      icon: 'sunny',
      iconBg: '#FFF2D6',
      iconColor: '#E8B04E',
      screen: 'DailyEvaluation',
    },
    {
      id: 'weekly',
      title: t('monitoringHub.weekly', { defaultValue: 'Haftalik baholash' }),
      subtitle: t('monitoringHub.weeklyDesc', { defaultValue: 'Emotsional holat monitoringi' }),
      icon: 'calendar',
      iconBg: '#DFF4EC',
      iconColor: '#34C759',
      screen: 'WeeklyEvaluation',
    },
    {
      id: 'monthly',
      title: t('monitoringHub.monthly', { defaultValue: 'Oylik baholash' }),
      subtitle: t('monitoringHub.monthlyDesc', { defaultValue: "Umumiy xizmat va ota-ona bilan ishlash" }),
      icon: 'calendar-number',
      iconBg: '#E3DFFB',
      iconColor: '#7C6EDB',
      screen: 'MonthlyEvaluation',
    },
    {
      id: 'school',
      title: t('schoolRatingPage.title', { defaultValue: 'Muassasani baholash' }),
      subtitle: t('schoolRatingPage.desc', { defaultValue: 'Muassasa xizmatlari va sharoitlarini baholang' }),
      icon: 'business',
      iconBg: tokens.colors.joy.lavenderSoft,
      iconColor: tokens.colors.joy.lavender,
      screen: 'SchoolRating',
    },
    {
      id: 'teacher',
      title: t('teacherRatingPage.title', { defaultValue: "O'qituvchini baholash" }),
      subtitle: t('teacherRatingPage.desc', { defaultValue: "O'qituvchingizni baholang va fikr bildiring" }),
      icon: 'person',
      iconBg: tokens.colors.joy.mintSoft || '#DFF4EC',
      iconColor: tokens.colors.joy.mint || '#34C759',
      screen: 'TeacherRating',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title={t('nav.rating', { defaultValue: 'Rating' })}
        showBack={false}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headerSubtitle}>
          {t('monitoringHub.headerSubtitle', {
            defaultValue: 'Kunduzgi parvarish xizmatini monitoring qilish',
          })}
        </Text>
        <View>
          {ratingOptions.map((option) => (
            <Card
              key={option.id}
              style={styles.optionCard}
              onPress={() => navigation.navigate(option.screen)}
              padding={tokens.space.xl}
            >
              <View style={styles.optionContent}>
                <View style={[styles.optionIconCircle, { backgroundColor: option.iconBg }]}>
                  <Ionicons name={option.icon} size={32} color={option.iconColor} />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                </View>
                <View style={styles.optionArrow}>
                  <Ionicons name="chevron-forward" size={24} color={tokens.colors.text.tertiary} />
                </View>
              </View>
            </Card>
          ))}

          {/* Info Card */}
          <Card style={styles.infoCard} padding={tokens.space.md}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconCircle}>
                <Ionicons name="information-circle" size={20} color={tokens.colors.accent.blue} />
              </View>
              <Text style={styles.infoText}>
                {t('rating.infoText', { defaultValue: 'Your feedback helps us improve our service' })}
              </Text>
            </View>
          </Card>
        </View>
      </ScrollView>
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
    paddingTop: tokens.space.md,
  },
  headerSubtitle: {
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.secondary,
    marginBottom: tokens.space.lg,
    textAlign: 'center',
  },
  optionCard: {
    marginBottom: tokens.space.lg,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 100,
  },
  optionIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.space.md,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: tokens.type.h3.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.text.primary,
    marginBottom: tokens.space.xs,
  },
  optionSubtitle: {
    fontSize: tokens.type.sub.fontSize,
    color: tokens.colors.text.secondary,
    lineHeight: 18,
  },
  optionArrow: {
    marginLeft: tokens.space.sm,
  },
  infoCard: {
    marginTop: tokens.space.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.space.sm,
  },
  infoIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: tokens.colors.accent.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: tokens.type.sub.fontSize,
    lineHeight: 18,
    color: tokens.colors.text.secondary,
  },
});
