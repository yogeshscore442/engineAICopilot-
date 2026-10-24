import en from './en';
import ta from './ta';
import hi from './hi';
import type { TranslationKeys } from './en';

export type Language = 'en' | 'ta' | 'hi';

const translations: Record<Language, TranslationKeys> = {
  en,
  ta,
  hi,
};

export function getTranslation(lang: Language, key: string): string {
  const keys = key.split('.');
  let current: unknown = translations[lang] || translations.en;

  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = (current as Record<string, unknown>)[k];
    } else {
      // Fallback to English if key is missing in active language
      let fallbackCurrent: unknown = translations.en;
      for (const fk of keys) {
        if (fallbackCurrent && typeof fallbackCurrent === 'object' && fk in fallbackCurrent) {
          fallbackCurrent = (fallbackCurrent as Record<string, unknown>)[fk];
        } else {
          return key;
        }
      }
      return typeof fallbackCurrent === 'string' ? fallbackCurrent : key;
    }
  }

  return typeof current === 'string' ? current : key;
}

export function useI18n(lang: Language) {
  const t = (key: string) => getTranslation(lang, key);

  return {
    t,
    lang,
    direction: 'ltr',
  };
}