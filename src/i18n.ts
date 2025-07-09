import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

// Import your translation files (or setup backend loading)
// For now, we'll assume resources are imported directly or handled by a loader later
// import enTranslation from './locales/en/translation.json';
// import itTranslation from './locales/it/translation.json';

i18n
  // Detect user language
  // Learn more: https://github.com/i18next/i18next-browser-languageDetector
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // Init i18next
  // For all options read: https://www.i18next.com/overview/configuration-options
  .init({
    debug: process.env.NODE_ENV === 'development', // Enable debug output in development
    fallbackLng: 'en', // Fallback language if detected language is not available
    interpolation: {
      escapeValue: false, // Not needed for React as it escapes by default
    },
    // resources: { // Define resources directly (alternative to backend loading)
    //   en: {
    //     translation: enTranslation,
    //   },
    //   it: {
    //     translation: itTranslation,
    //   },
    // },
    // Default namespace (optional, but good practice if you have multiple translation files)
    // defaultNS: 'translation',
    // ns: ['translation'], // namespaces used
  });

export default i18n;
