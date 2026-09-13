/**
 * SPR Note — Localized Number & Date/Time Formatters
 * ==================================================
 * High-performance Intl formatting utilities for multi-language display.
 */

import type { LanguageCode } from './types';

const LOCALE_TAG_MAP: Record<LanguageCode, string> = {
  en: 'en-US',
  bn: 'bn-BD',
  ar: 'ar-SA',
  ur: 'ur-PK',
};

/**
 * Formats a numeric value using locale-specific digits and conventions.
 */
export function formatLocalizedNumber(
  value: number | string,
  lang: LanguageCode = 'en',
  options?: Intl.NumberFormatOptions
): string {
  const num = typeof value === 'string' ? Number(value) : value;
  if (isNaN(num)) return String(value);

  const localeTag = LOCALE_TAG_MAP[lang] || 'en-US';
  try {
    return new Intl.NumberFormat(localeTag, options).format(num);
  } catch {
    return String(num);
  }
}

/**
 * Formats a date using locale-specific calendar and language conventions.
 */
export function formatLocalizedDate(
  date: Date | string | number,
  lang: LanguageCode = 'en',
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }
): string {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';

  const localeTag = LOCALE_TAG_MAP[lang] || 'en-US';
  try {
    return new Intl.DateTimeFormat(localeTag, options).format(d);
  } catch {
    return d.toLocaleDateString();
  }
}
