/**
 * SPR Note — Localized Entity Field Utilities
 */

import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from './constants';
import type { LanguageCode, LocalizedFieldInput, LocalizedValue } from './types';

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

export function getLocalizedValue(
  value: LocalizedFieldInput,
  targetLang: LanguageCode = DEFAULT_LANGUAGE,
  fallbackLang: LanguageCode = DEFAULT_LANGUAGE
): string {
  if (!value) return '';

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object') {
    if (value[targetLang]?.trim()) {
      return value[targetLang]!.trim();
    }
    if (value[fallbackLang]?.trim()) {
      return value[fallbackLang]!.trim();
    }
    for (const lang of SUPPORTED_LANGUAGES) {
      const candidate = value[lang.code];
      if (candidate?.trim()) {
        return candidate.trim();
      }
    }
    for (const val of Object.values(value)) {
      if (typeof val === 'string' && val.trim()) {
        return val.trim();
      }
    }
  }

  return '';
}

export function hasMultiLanguageContent(value: LocalizedFieldInput): boolean {
  if (!value || typeof value !== 'object') return false;
  const filled = Object.values(value).filter((v) => typeof v === 'string' && v.trim().length > 0);
  return filled.length > 1;
}

export function hasAnyLanguageContent(value: LocalizedFieldInput): boolean {
  if (!value) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'object') {
    return Object.values(value).some((v) => typeof v === 'string' && v.trim().length > 0);
  }
  return false;
}

export function getFilledLanguagesCount(value: LocalizedFieldInput): number {
  if (!value || typeof value !== 'object') return typeof value === 'string' && value.trim() ? 1 : 0;
  return Object.values(value).filter((v) => typeof v === 'string' && v.trim().length > 0).length;
}

export function sanitizeScriptForLanguage(text: string, _lang: LanguageCode): string {
  return text;
}

export function detectScriptLanguage(text: string): LanguageCode | null {
  if (!text) return null;
  if (/[\u0600-\u06FF\u0750-\u077F]/.test(text)) {
    return /[\u0679\u0686\u0698\u0691\u06BA\u06BE\u06C1\u06D2]/.test(text) ? 'ur' : 'ar';
  }
  if (/[\u0980-\u09FF]/.test(text)) return 'bn';
  if (/[a-zA-Z]/.test(text)) return 'en';
  return null;
}

export function getLocalizedPlaceholder(lang: LanguageCode): string {
  const matched = SUPPORTED_LANGUAGES.find((l) => l.code === lang);
  return matched?.defaultPlaceholder || 'Enter text...';
}
