/**
 * Multi-Language Number & Date Formatters
 */

import { LanguageCode } from './types';

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function formatLocalizedNumber(num: number | string, lang: LanguageCode = 'en'): string {
  const str = String(num);
  if (lang === 'bn') {
    return str.replace(/\d/g, (d) => BENGALI_DIGITS[parseInt(d, 10)] || d);
  }
  if (lang === 'ar' || lang === 'ur') {
    return str.replace(/\d/g, (d) => ARABIC_DIGITS[parseInt(d, 10)] || d);
  }
  return str;
}

export function formatLocalizedDate(date: Date | string, _lang: LanguageCode = 'en'): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString();
}
