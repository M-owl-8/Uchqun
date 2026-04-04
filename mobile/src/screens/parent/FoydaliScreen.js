import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import tokens from '../../styles/tokens';

const CATEGORIES = [
  {
    key: 'music',
    screen: 'Musiqa',
    title: 'Musiqa',
    subtitle: "O'qituvchi tavsiya etgan musiqalar",
    icon: 'musical-notes',
    color: '#BFD7EA',
    iconBg: '#BFD7EA44',
  },
  {
    key: 'video',
    screen: 'Video',
    title: 'Video',
    subtitle: "O'qituvchi yuklagan videolar",
    icon: 'play-circle',
    color: '#DFF4EC',
    iconBg: '#DFF4EC66',
  },
  {
    key: 'recommendation',
    screen: 'Tavsiya',
    title: 'Tavsiya',
    subtitle: "O'qituvchi maslahatlari",
    icon: 'bulb',
    color: '#E8C27E',
    iconBg: '#E8C27E33',
  },
];

export function FoydaliScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Foydali" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          O'qituvchi tomonidan tavsiya etilgan materiallar
        </Text>
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat.key}
            onPress={() => navigation.navigate(cat.screen)}
            accessibilityRole="button"
            accessibilityLabel={cat.title}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
          >
            <View style={[styles.iconWrap, { backgroundColor: cat.iconBg }]}>
              <Ionicons name={cat.icon} size={32} color="#2E3A59" />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{cat.title}</Text>
              <Text style={styles.cardSub} numberOfLines={1}>{cat.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8A97B0" />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background.primary,
  },
  scroll: { flex: 1 },
  content: {
    padding: tokens.space.xl,
    gap: tokens.space.md,
  },
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
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2E3A59',
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    color: '#8A97B0',
  },
});
