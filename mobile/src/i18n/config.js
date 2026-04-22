import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import translation files
import en from '../locales/en/common.json';
import ru from '../locales/ru/common.json';
import uz from '../locales/uz/common.json';

const LANGUAGE_KEY = '@app_language';

// Get the device's locale, but only honor it if the device speaks one of our
// supported languages — otherwise default to Uzbek (the primary app language).
const SUPPORTED = ['uz', 'ru', 'en'];
const rawDeviceLanguage = Localization.getLocales()[0]?.languageCode || '';
const deviceLanguage = SUPPORTED.includes(rawDeviceLanguage) ? rawDeviceLanguage : 'uz';

// Initialize i18n
const initI18n = async () => {
  // Try to get saved language
  const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
  const initialLanguage = savedLanguage || deviceLanguage || 'uz';

  i18n
    .use(initReactI18next)
    .init({
      compatibilityJSON: 'v3',
      resources: {
        en: { translation: en },
        ru: { translation: ru },
        uz: { translation: uz },
      },
      lng: initialLanguage,
      fallbackLng: 'uz',
      interpolation: {
        escapeValue: false,
      },
    });
};

// Change language function
export const changeLanguage = async (language) => {
  await AsyncStorage.setItem(LANGUAGE_KEY, language);
  i18n.changeLanguage(language);
};

// Get current language
export const getCurrentLanguage = () => i18n.language;

// Get available languages
export const getAvailableLanguages = () => [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'uz', name: 'Uzbek', nativeName: "O'zbek" },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
];

export const i18nReady = initI18n();

export default i18n;
