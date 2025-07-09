'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button'; // Assuming Button component is available

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  // For development, 'dev' will also resolve to 'en' as 'dev' translations are not provided.
  // This is just to test the language change mechanism.
  // In a real scenario, you would have actual translation files for 'dev' or other languages.

  return (
    <div className='language-switcher fixed bottom-4 right-4 z-50 flex space-x-2 bg-background p-2 rounded-md border shadow-lg'>
      <Button
        variant={i18n.language === 'en' ? 'default' : 'outline'}
        size='sm'
        onClick={() => changeLanguage('en')}
        aria-label='Switch to English'
      >
        EN
      </Button>
      <Button
        variant={i18n.language === 'dev' ? 'default' : 'outline'}
        size='sm'
        onClick={() => changeLanguage('dev')}
        aria-label='Switch to Dev Language'
      >
        DEV (Test)
      </Button>
      {/* Add more languages here as needed */}
      {/* Example:
      <Button
        variant={i18n.language === 'it' ? 'default' : 'outline'}
        size="sm"
        onClick={() => changeLanguage('it')}
      >
        IT
      </Button>
      */}
    </div>
  );
};

export default LanguageSwitcher;
