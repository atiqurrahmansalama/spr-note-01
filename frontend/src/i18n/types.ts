/**
 * SPR Note — Enterprise Internationalization & RTL Type Definitions
 * ================================================================
 * Strict TypeScript interfaces for multi-language dictionary tokens,
 * bidirectional layout direction, routing, and localization formatters.
 */

export type LanguageCode = 'en' | 'bn' | 'ar' | 'ur';

export type TextDirection = 'ltr' | 'rtl';

export interface LanguageConfig {
  code: LanguageCode;
  name: string;
  nativeName: string;
  dir: TextDirection;
  isRTL: boolean;
  script: string;
  fontFamily: string;
  badgeLabel: string;
  numericScript: 'latn' | 'beng' | 'arab';
}

export type TranslationNamespace =
  | 'common'
  | 'navigation'
  | 'settings'
  | 'dashboard'
  | 'academy'
  | 'students'
  | 'staff'
  | 'attendance'
  | 'studies'
  | 'examinations'
  | 'notifications';

export type TranslationDictionary = Record<string, any>;

export interface TranslationParams {
  [key: string]: string | number | boolean | undefined | null;
}

export interface I18nContextType {
  language: LanguageCode;
  direction: TextDirection;
  isRTL: boolean;
  config: LanguageConfig;
  supportedLanguages: LanguageConfig[];
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string, defaultTextOrParams?: string | TranslationParams, params?: TranslationParams) => string;
  formatNumber: (num: number | string, options?: Intl.NumberFormatOptions) => string;
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  getLocalizedPath: (path: string, targetLang?: LanguageCode) => string;
}
