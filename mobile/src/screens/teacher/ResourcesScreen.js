import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import tokens from '../../styles/tokens';

const CATEGORIES = [
  {
    key: 'music',
    screen: 'ResourceMusic',
    icon: 'musical-notes',
    color: '#BFD7EA',
    iconBg: '#BFD7EA44',
    titleKey: 'resources.music',
    titleDefault: 'Musiqa',
    subtitleKey: 'resources.musicSub',
    subtitleDefault: "O'quvchilar uchun musiqa qo'shish",
  },
  {
    key: 'video',
    screen: 'ResourceVideo',
    icon: 'play-circle',
    color: '#DFF4EC',
    iconBg: '#DFF4EC66',
    titleKey: 'resources.video',
    titleDefault: 'Video',
    subtitleKey: 'resources.videoSub',
    subtitleDefault: "Ta'lim videolari qo'shish",
  },
  {
    key: 'recommendation',
    screen: 'ResourceRecommendation',
    icon: 'bulb',
    color: '#E8C27E',
    iconBg: '#E8C27E33',
    titleKey: 'resources.recommendation',
    titleDefault: 'Tavsiya',
    subtitleKey: 'resources.recommendationSub',
    subtitleDefault: "Ota-onalarga maslahat va tavsiyalar",
  },
];

export function ResourcesScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title={t('resources.screenTitle', { defaultValue: 'Foydali materiallar' })}
        showBack
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          {t('resources.subtitle', { defaultValue: "O'quvchilar uchun musiqa, video va tavsiyalar qo'shing" })}
        </Text>
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat.key}
            onPress={() => navigation.navigate(cat.screen)}
            accessibilityRole="button"
            accessibilityLabel={t(cat.titleKey, { defaultValue: cat.titleDefault })}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
          >
            <View style={[styles.iconWrap, { backgroundColor: cat.iconBg }]}>
              <Ionicons name={cat.icon} size={32} color="#2E3A59" />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{t(cat.titleKey, { defaultValue: cat.titleDefault })}</Text>
              <Text style={styles.cardSub} numberOfLines={1}>
                {t(cat.subtitleKey, { defaultValue: cat.subtitleDefault })}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8A97B0" />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.colors.background.primary },
  scroll: { flex: 1 },
  content: { padding: tokens.space.xl, gap: tokens.space.md },
  subtitle: {
    fontSize: 14,
    color: tokens.colors.text.secondary,
    marginBottom: tokens.space.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: tokens.radius.xl,
    padding: tokens.space.lg,
    gap: tokens.space.md,
    ...tokens.shadow.sm,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: tokens.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#2E3A59', marginBottom: 4 },
  cardSub: { fontSize: 13, color: '#8A97B0' },
});
