import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { mergeLocales } from '../../shared/utils/mergeLocales.js';
import sharedEn from '../../shared/locales/en.json';
import sharedUz from '../../shared/locales/uz.json';
import sharedRu from '../../shared/locales/ru.json';
import portalEn from './locales/en/common.json';
import portalUz from './locales/uz/common.json';
import portalRu from './locales/ru/common.json';

const resources = {
  en: { translation: mergeLocales(sharedEn, portalEn) },
  uz: { translation: mergeLocales(sharedUz, portalUz) },
  ru: { translation: mergeLocales(sharedRu, portalRu) },
};

const savedLang = localStorage.getItem('lang') || 'uz';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLang,
    fallbackLng: 'uz',
    supportedLngs: ['uz', 'ru', 'en'],
    interpolation: {
      escapeValue: false,
    },
  });

export const changeLanguage = (lng) => {
  i18n.changeLanguage(lng);
  localStorage.setItem('lang', lng);
};

export default i18n;
