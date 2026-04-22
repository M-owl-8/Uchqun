import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import Card from '../../components/common/Card';
import tokens from '../../styles/tokens';

// Question sets derived from the institution's PDF monitoring journals.
// Each question is a short label shown as a checkbox.
const QUESTIONS = {
  daily: {
    title: "Kunlik baholash",
    sections: [
      {
        title: "Gigienik holat",
        items: [
          'Bola toza keldi',
          "Kiyimlar ozoda, hidsiz",
          "Soch toza, taralgan",
          "Tirnoqlar olingan va toza",
          "Yuz va qo'llar yuvilgan",
          "Poyabzal toza va o'lchamiga mos",
          "Tanadan ёqimsiz hid kelmaydi",
          "Fasliga mos kiyim kiygan",
          "Gigienik vositalar olib kelingan",
        ],
      },
      {
        title: "Sog'liqning umumiy holati",
        items: [
          "Tana harorati meyorida (36,0-37,0°C)",
          "Shikoyatlar yo'q",
          "Teri toza, toshmalarsiz",
          "Burundan nafas olish erkin",
          "Ko'zga ko'rinadigan jarohatlar yo'q",
          "Yo'tal mavjud emas",
          "Kayfiyati va faollik meyorida",
        ],
      },
      {
        title: "Oshqozon funksiyasi",
        items: [
          "Ich kelishi normal",
          "Qorin og'rig'iga shikoyat yo'q",
          "Siydik chiqarish muntazam, shikoyatlarsiz",
        ],
      },
    ],
  },
  weekly: {
    title: "Haftalik baholash",
    sections: [
      {
        title: "Bolalarning emotsional holati",
        items: [
          "Hissiy holati barqaror",
          "Ijobiy his-tuyg'ularni namoyon etadi",
          "Xavotirlanish belgilari yo'q",
          "Kattalarga dushmanlik munosabati kuzatilmaydi",
          "Tanbeh va iltimoslarga xotirjam munosabat bildiradi",
          "Boshqa bolalarga hamdardlik ko'rsatadi",
          "Stressli vaziyatdan keyin tezda o'zini o'nglab oladi",
          "Kayfiyati kun davomida barqaror turadi",
          "Tarbiyachi bilan munosabati ishonchli va mustahkam",
        ],
      },
    ],
  },
  monthly: {
    title: "Oylik baholash",
    sections: [
      {
        title: "Axborot tizimidan foydalanish",
        items: [
          "Barcha tarbiyalanuvchilar tizimga kiritildi",
          "Face ID orqali davomat muntazam qayd etib boriladi",
        ],
      },
      {
        title: "Ota-onalar bilan ishlash",
        items: [
          "Ota-onalar bola haqida muntazam ma'lumot oladilar",
          "Maslahatlar va yakka tartibdagi suhbatlar o'tkaziladi",
          "Barcha murojaatlar maxsus jurnalda qayd etiladi",
          "Shikoyat va takliflar belgilangan muddatda ko'rib chiqiladi",
          "Ota-onalarning murojaatlariga yozma javoblar berilgan",
          "Ota-onalar tadbirlar va yig'ilishlarda ishtirok etadilar",
          "Xodimlar hurmatli va xotirjam muloqot ohangini saqlab qoladilar",
          "Ota-onalarning takliflari ish rejalariga inobatga olinadi",
          "Ota-onalar farzandlari bilan ishlaydigan mutaxassislarni taniydilar",
          "Nizoli vaziyatlar samarali tarzda hal qilinadi",
          "Hamkorlik o'zaro hurmat va ochiqlikka asoslanadi",
          "Har bir ota-ona bilan doimiy aloqa o'rnatilgan",
        ],
      },
    ],
  },
};

export function EvaluationScreen() {
  const route = useRoute();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const period = route.params?.period || 'daily';
  const BOTTOM_NAV_HEIGHT = 75;
  const bottomPadding = BOTTOM_NAV_HEIGHT + insets.bottom + 16;

  const config = useMemo(() => QUESTIONS[period] || QUESTIONS.daily, [period]);
  const allItems = useMemo(
    () => config.sections.flatMap((s) => s.items.map((label) => ({ section: s.title, label }))),
    [config],
  );

  const [answers, setAnswers] = useState(() => {
    const init = {};
    allItems.forEach((q) => {
      init[q.label] = false;
    });
    return init;
  });
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const toggle = (label) => setAnswers((prev) => ({ ...prev, [label]: !prev[label] }));

  const submit = async () => {
    try {
      setSaving(true);
      await api.post('/parent/evaluations', {
        period,
        answers,
        notes,
        submittedAt: new Date().toISOString(),
      });
      Alert.alert(
        t('common.success', { defaultValue: 'Muvaffaqiyatli' }),
        t('evaluation.saved', { defaultValue: "Baho yuborildi" }),
      );
      const reset = {};
      allItems.forEach((q) => { reset[q.label] = false; });
      setAnswers(reset);
      setNotes('');
    } catch (error) {
      const msg = error?.response?.data?.error || error?.response?.data?.message;
      Alert.alert(
        t('common.error', { defaultValue: 'Xatolik' }),
        msg || t('evaluation.saveError', { defaultValue: "Saqlashda xatolik" }),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title={config.title} showBack />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}>
        {config.sections.map((section) => (
          <Card key={section.title} style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item) => (
              <Pressable key={item} style={styles.row} onPress={() => toggle(item)}>
                <Ionicons
                  name={answers[item] ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={answers[item] ? tokens.colors.semantic.success : tokens.colors.border.medium}
                />
                <Text style={[styles.itemText, answers[item] && styles.itemActive]}>{item}</Text>
              </Pressable>
            ))}
          </Card>
        ))}

        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Izoh</Text>
          <TextInput
            style={styles.notes}
            placeholder="Qo'shimcha izoh yozing (ixtiyoriy)"
            placeholderTextColor={tokens.colors.text.muted}
            multiline
            value={notes}
            onChangeText={setNotes}
          />
        </Card>

        <Pressable
          onPress={submit}
          disabled={saving}
          style={({ pressed }) => [styles.saveBtn, (pressed || saving) && { opacity: 0.75 }]}
        >
          <Text style={styles.saveBtnText}>
            {saving ? 'Yuborilmoqda...' : 'Bahoni yuborish'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.colors.background.primary },
  content: { padding: tokens.space.lg, gap: tokens.space.md },
  sectionCard: { padding: tokens.space.lg, marginBottom: tokens.space.sm },
  sectionTitle: {
    fontSize: tokens.type.bodyLarge.fontSize,
    fontWeight: '700',
    color: tokens.colors.text.primary,
    marginBottom: tokens.space.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.space.sm,
    gap: tokens.space.sm,
  },
  itemText: { flex: 1, fontSize: 14, color: tokens.colors.text.secondary },
  itemActive: { color: tokens.colors.text.primary, fontWeight: '500' },
  notes: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: tokens.colors.border.light,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    color: tokens.colors.text.primary,
    textAlignVertical: 'top',
  },
  saveBtn: {
    backgroundColor: tokens.colors.text.primary,
    borderRadius: tokens.radius.pill,
    paddingVertical: tokens.space.md,
    alignItems: 'center',
    marginTop: tokens.space.md,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
