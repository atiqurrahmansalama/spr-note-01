/**
 * SPR Note — i18n Configuration & Language Matrix Constants
 * ========================================================
 */

import type { LanguageCode, LanguageConfig } from './types';

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

export const LANGUAGE_STORAGE_KEY = 'spr_app_language';

export const LANGUAGE_COOKIE_NAME = 'spr_locale';

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  {
    code: 'en',
    name: 'English (US)',
    nativeName: 'English',
    dir: 'ltr',
    isRTL: false,
    script: 'Latin',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    badgeLabel: 'EN',
    numericScript: 'latn',
    defaultPlaceholder: 'Enter in English...',
  },
  {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    dir: 'ltr',
    isRTL: false,
    script: 'Bengali',
    fontFamily: '"Hind Siliguri", "Tiro Bangla", system-ui, sans-serif',
    badgeLabel: 'BN',
    numericScript: 'beng',
    defaultPlaceholder: 'বাংলায় লিখুন...',
  },
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    dir: 'rtl',
    isRTL: true,
    script: 'Arabic',
    fontFamily: '"Tajawal", "Noto Sans Arabic", "Amiri", "Noto Naskh Arabic", system-ui, sans-serif',
    badgeLabel: 'AR',
    numericScript: 'arab',
    defaultPlaceholder: 'اكتب بالعربية...',
  },
  {
    code: 'ur',
    name: 'Urdu',
    nativeName: 'اردو',
    dir: 'rtl',
    isRTL: true,
    script: 'Arabic (Nastaliq / Naskh)',
    fontFamily: '"Noto Sans Arabic", "Tajawal", "Noto Naskh Arabic", "Segoe UI", system-ui, sans-serif',
    badgeLabel: 'UR',
    numericScript: 'arab',
    defaultPlaceholder: 'اردو میں درج کریں...',
  },
];

export const LANGUAGE_MAP: Record<LanguageCode, LanguageConfig> = SUPPORTED_LANGUAGES.reduce(
  (acc, lang) => {
    acc[lang.code] = lang;
    return acc;
  },
  {} as Record<LanguageCode, LanguageConfig>
);

export const RTL_LANGUAGES: LanguageCode[] = ['ar', 'ur'];
