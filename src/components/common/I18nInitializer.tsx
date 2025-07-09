'use client';

// This component's sole purpose is to ensure the i18n configuration is imported
// and initialized on the client side when the application loads.
// It does not render any UI itself.
import '@/i18n'; // Import the i18n configuration

const I18nInitializer = () => {
  // console.log('i18n Initializer component mounted, i18n config should be loaded.');
  return null; // This component does not render anything
};

export default I18nInitializer;
