/**
 * SPR Note — Enterprise Localized Entity Field Utilities
 * =======================================================
 * Pure TypeScript utilities for dynamic multi-language entity data structures.
 * Supports hybrid storage: string fallback and dictionary object { en, bn, ar, ur }.
 */

import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from './constants';
import type { LanguageCode } from './types';

export type LocalizedValue = Partial<Record<LanguageCode, string>> & Record<string, string | undefined>;

export type LocalizedFieldInput = string | LocalizedValue | null | undefined;

/**
 * Normalizes any input value into a canonical LocalizedValue dictionary object.
 */
export function normalizeLocalizedValue(
  value: LocalizedFieldInput,
  currentLanguage: LanguageCode = DEFAULT_LANGUAGE
): LocalizedValue {
  if (value === null || value === undefined) {
    return {};
  }

  if (typeof value === 'string') {
    if (value === '') return {};

    return {
      [currentLanguage]: value,
      [DEFAULT_LANGUAGE]: value,
    };
  }

  if (typeof value === 'object') {
    const result: LocalizedValue = {};
    for (const [key, val] of Object.entries(value)) {
      if (typeof val === 'string') {
        result[key as LanguageCode] = val;
      }
    }
    return result;
  }

  return {};
}

/**
 * Resolves the best human-readable text from a LocalizedFieldInput for a requested language.
 * Follows enterprise fallback cascade:
 * 1. Target Language
 * 2. Default Language (English)
 * 3. First non-empty available translation
 * 4. Empty string
 */
export function getLocalizedValue(
  value: LocalizedFieldInput,
  targetLang: LanguageCode = DEFAULT_LANGUAGE,
  fallbackLang: LanguageCode = DEFAULT_LANGUAGE
): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;

  if (typeof value === 'object') {
    // 1. Target language check
    if (value[targetLang] !== undefined && value[targetLang] !== null && String(value[targetLang]).length > 0) {
      return String(value[targetLang]);
    }

    // 2. Fallback language check
    if (fallbackLang !== targetLang && value[fallbackLang] !== undefined && value[fallbackLang] !== null && String(value[fallbackLang]).length > 0) {
      return String(value[fallbackLang]);
    }

    // 3. Any available non-empty translation
    for (const langConfig of SUPPORTED_LANGUAGES) {
      const code = langConfig.code;
      if (value[code] !== undefined && value[code] !== null && String(value[code]).length > 0) {
        return String(value[code]);
      }
    }

    // 4. Any other custom key
    for (const val of Object.values(value)) {
      if (typeof val === 'string' && val.length > 0) {
        return val;
      }
    }
  }

  return '';
}

/**
 * Returns the count of filled languages for a given localized field.
 */
export function getFilledLanguagesCount(value: LocalizedFieldInput): number {
  if (!value) return 0;
  if (typeof value === 'string') return value.trim().length > 0 ? 1 : 0;
  if (typeof value === 'object') {
    return Object.values(value).filter((v) => typeof v === 'string' && v.trim().length > 0).length;
  }
  return 0;
}

/**
 * Checks if a field has values in multiple languages (2 or more).
 */
export function hasMultiLanguageContent(value: LocalizedFieldInput): boolean {
  return getFilledLanguagesCount(value) > 1;
}

/**
 * Checks if a field has at least one valid language value filled (1 or more).
 */
export function hasAnyLanguageContent(value: LocalizedFieldInput): boolean {
  return getFilledLanguagesCount(value) > 0;
}

/**
 * Returns summary badges or active language codes populated in the value.
 */
export function getPopulatedLanguageCodes(value: LocalizedFieldInput): LanguageCode[] {
  if (!value) return [];
  if (typeof value === 'string') return [DEFAULT_LANGUAGE];
  if (typeof value === 'object') {
    const codes: LanguageCode[] = [];
    for (const langConfig of SUPPORTED_LANGUAGES) {
      if (value[langConfig.code] && String(value[langConfig.code]).trim().length > 0) {
        codes.push(langConfig.code);
      }
    }
    return codes;
  }
  return [];
}

/**
 * Detects the dominant script language of a given text string.
 * Returns 'bn' for Bengali, 'ar' for Arabic/Urdu, 'en' for English/Latin.
 */
export function detectScriptLanguage(text: string, fallback: LanguageCode = DEFAULT_LANGUAGE): LanguageCode {
  if (!text) return fallback;
  if (/[\u0980-\u09FF]/.test(text)) return 'bn';
  if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)) return 'ar';
  if (/[A-Za-z]/.test(text)) return 'en';
  return fallback;
}

/**
 * Strips out script characters that do not belong to the target language script.
 * Enforces strict script isolation:
 * - 'en': Allows Latin letters, numbers, punctuation, spaces. Disallows Bengali, Arabic, Urdu scripts.
 * - 'bn': Allows Bengali characters, Bengali digits, standard digits, punctuation, spaces. Disallows Latin letters and Arabic/Urdu scripts.
 * - 'ar': Allows Arabic characters, Arabic digits, standard digits, punctuation, spaces. Disallows Latin and Bengali scripts.
 * - 'ur': Allows Urdu/Arabic characters, digits, punctuation, spaces. Disallows Latin and Bengali scripts.
 */
export function sanitizeScriptForLanguage(text: string, langCode: string): string {
  if (!text) return '';
  const lang = String(langCode || '').toLowerCase();

  if (lang === 'en') {
    // Disallow Bengali (\u0980-\u09FF) and Arabic/Urdu (\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF)
    return text.replace(/[\u0980-\u09FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g, '');
  }

  if (lang === 'bn') {
    // Disallow English letters ([A-Za-z]) and Arabic/Urdu scripts
    return text.replace(/[A-Za-z\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g, '');
  }

  if (lang === 'ar' || lang === 'ur') {
    // Disallow English letters ([A-Za-z]) and Bengali script ([\u0980-\u09FF])
    return text.replace(/[A-Za-z\u0980-\u09FF]/g, '');
  }

  return text;
}

/**
 * Resolves or generates the appropriate native language placeholder for an input.
 */
export function getLocalizedPlaceholder(
  placeholder: string | Record<string, string> | undefined,
  langCode: string,
  label?: any
): string {
  const code = String(langCode || DEFAULT_LANGUAGE).toLowerCase();
  const langConfig = SUPPORTED_LANGUAGES.find((l) => l.code === code);

  // 1. Explicit object dictionary
  if (placeholder && typeof placeholder === 'object') {
    if (placeholder[code]) return placeholder[code];
    if (placeholder[DEFAULT_LANGUAGE]) return placeholder[DEFAULT_LANGUAGE];
  }

  // 2. Custom string placeholder for English
  if (typeof placeholder === 'string' && placeholder.trim().length > 0) {
    if (code === 'en') return placeholder;

    // Common example names translation
    const lower = placeholder.toLowerCase();
    if (lower.includes('abdullah')) {
      if (code === 'bn') return 'যেমন: আব্দুল্লাহ ইবনে ওমর';
      if (code === 'ar') return 'مثال: عبد الله بن عمر';
      if (code === 'ur') return 'مثال: عبداللہ بن عمر';
    }
  }

  // 3. Built-in native language placeholder from language configuration
  if (langConfig?.defaultPlaceholder) {
    return langConfig.defaultPlaceholder;
  }

  // 4. Default fallback
  if (code === 'bn') return 'বাংলায় লিখুন...';
  if (code === 'ar') return 'اكتب بالعربية...';
  if (code === 'ur') return 'اردو میں درج کریں...';
  return 'Enter in English...';
}


